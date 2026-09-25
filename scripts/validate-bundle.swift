#!/usr/bin/env swift
import Foundation

// Run on the Mac builder. Parsing Info.plist alone cannot detect a bundle whose
// layout makes Foundation look for metadata in a different location.
struct ValidationFailure: Error, CustomStringConvertible {
    let description: String
    init(_ description: String) { self.description = description }
}

let fileManager = FileManager.default
let webAssets = [
    "index.html", "app.css", "core.js", "product-model.js", "storage.js",
    "app.js", "photo-store.js", "products.js", "body.js", "bootstrap.js",
    "vendor/lucide.min.js", "vendor/LICENSE-lucide", "preferences.js", "preferences.css",
    "onboarding.js", "onboarding.css", "ai-plan-model.js", "ai-plan.js", "ai-plan.css",
    "social-model.js", "social.js", "social.css"
]

func require(_ condition: Bool, _ message: String) throws {
    if !condition { throw ValidationFailure(message) }
}

func regularFile(_ url: URL) throws {
    let attributes = try fileManager.attributesOfItem(atPath: url.path)
    try require(attributes[.type] as? FileAttributeType == .typeRegular,
                "Expected a regular file: \(url.path)")
    try require(((attributes[.size] as? NSNumber)?.intValue ?? 0) > 0,
                "Empty file: \(url.path)")
}

@discardableResult
func validate(_ input: URL) throws -> String {
    let app = input.standardizedFileURL.resolvingSymlinksInPath()
    var isDirectory: ObjCBool = false
    try require(app.pathExtension == "app" && fileManager.fileExists(atPath: app.path, isDirectory: &isDirectory) && isDirectory.boolValue,
                "Provide an existing .app directory.")
    // Apple reserves this name for other bundle layouts. An iOS app with a
    // root Resources directory can fail installation with 'Missing bundle ID'.
    let children = try fileManager.contentsOfDirectory(atPath: app.path)
    try require(!children.contains(where: { $0.lowercased() == "resources" }),
                "Invalid iOS bundle: root Resources is reserved; put the offline files in WebApp instead.")

    let plistURL = app.appendingPathComponent("Info.plist")
    try regularFile(plistURL)
    let plistData = try Data(contentsOf: plistURL)
    guard let info = try PropertyListSerialization.propertyList(from: plistData, format: nil) as? [String: Any] else {
        throw ValidationFailure("Info.plist is not a dictionary.")
    }
    for key in ["CFBundleIdentifier", "CFBundleExecutable", "CFBundlePackageType", "CFBundleShortVersionString", "CFBundleVersion", "MinimumOSVersion"] {
        guard let value = info[key] as? String, !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw ValidationFailure("Missing or invalid \(key) in Info.plist.")
        }
    }
    let identifier = info["CFBundleIdentifier"] as! String
    let executableName = info["CFBundleExecutable"] as! String
    try require(identifier == "com.s.gymplanner.app", "Unexpected app identity: \(identifier)")
    try require(info["CFBundlePackageType"] as? String == "APPL", "The bundle must have package type APPL.")
    try require(!executableName.contains("/") && executableName != "." && executableName != "..", "Unsafe executable name.")
    guard let platforms = info["CFBundleSupportedPlatforms"] as? [String],
          platforms.contains("iPhoneOS") || platforms.contains("iPhoneSimulator") else {
        throw ValidationFailure("Expected an iPhoneOS or iPhoneSimulator app.")
    }

    guard let bundle = Bundle(url: app) else { throw ValidationFailure("Foundation could not open the app bundle.") }
    try require(bundle.bundleIdentifier == identifier,
                "Foundation cannot resolve the same bundle ID as Info.plist; the bundle layout is invalid.")
    let executable = app.appendingPathComponent(executableName)
    try regularFile(executable)
    try require(fileManager.isExecutableFile(atPath: executable.path), "The app executable has no executable permission.")
    try require(bundle.executableURL?.standardizedFileURL.path == executable.path,
                "Foundation cannot resolve the app executable.")

    let webRoot = app.appendingPathComponent("WebApp", isDirectory: true)
    guard let index = bundle.url(forResource: "index", withExtension: "html", subdirectory: "WebApp") else {
        throw ValidationFailure("Foundation cannot find WebApp/index.html using the app's resource lookup.")
    }
    try require(index.standardizedFileURL.path == webRoot.appendingPathComponent("index.html").path,
                "Foundation resolved the offline entry point outside WebApp.")
    for relative in webAssets { try regularFile(webRoot.appendingPathComponent(relative)) }
    try regularFile(app.appendingPathComponent("Assets.car"))
    guard let icons = info["CFBundleIcons"] as? [String: Any],
          let primary = icons["CFBundlePrimaryIcon"] as? [String: Any],
          let iconName = primary["CFBundleIconName"] as? String, !iconName.isEmpty else {
        throw ValidationFailure("The primary app icon is missing from Info.plist.")
    }

    // Also catch new HTML dependencies that are forgotten by the packaging step.
    let html = try String(contentsOf: index, encoding: .utf8)
    let pattern = #"(?:src|href)\s*=\s*["']([^"']+)["']"#
    let expression = try NSRegularExpression(pattern: pattern, options: .caseInsensitive)
    for match in expression.matches(in: html, range: NSRange(html.startIndex..., in: html)) {
        guard let range = Range(match.range(at: 1), in: html) else { continue }
        let reference = String(html[range])
        try require(!reference.contains(":") && !reference.hasPrefix("/") && !reference.contains("\\"),
                    "Unsupported nonlocal HTML dependency: \(reference)")
        let asset = webRoot.appendingPathComponent(reference).standardizedFileURL.resolvingSymlinksInPath()
        try require(asset.path.hasPrefix(webRoot.path + "/"), "HTML dependency escapes WebApp: \(reference)")
        try regularFile(asset)
    }
    return identifier
}

func selfTest() throws {
    let root = fileManager.temporaryDirectory.appendingPathComponent("gym-bundle-validation-\(UUID().uuidString)")
    try fileManager.createDirectory(at: root, withIntermediateDirectories: true)
    defer { try? fileManager.removeItem(at: root) }
    func fixture(_ name: String) throws -> URL {
        let app = root.appendingPathComponent(name + ".app")
        try fileManager.createDirectory(at: app.appendingPathComponent("WebApp/vendor"), withIntermediateDirectories: true)
        let info: [String: Any] = [
            "CFBundleIdentifier": "com.s.gymplanner.app", "CFBundleExecutable": "GymPlanner",
            "CFBundlePackageType": "APPL", "CFBundleShortVersionString": "2.0", "CFBundleVersion": "3",
            "MinimumOSVersion": "15.4", "CFBundleSupportedPlatforms": ["iPhoneOS"],
            "CFBundleIcons": ["CFBundlePrimaryIcon": ["CFBundleIconName": "AppIcon"]]
        ]
        let plist = try PropertyListSerialization.data(fromPropertyList: info, format: .xml, options: 0)
        try plist.write(to: app.appendingPathComponent("Info.plist"))
        try Data("fixture".utf8).write(to: app.appendingPathComponent("GymPlanner"))
        try fileManager.setAttributes([.posixPermissions: 0o755], ofItemAtPath: app.appendingPathComponent("GymPlanner").path)
        try Data("fixture".utf8).write(to: app.appendingPathComponent("Assets.car"))
        for asset in webAssets { try Data("fixture".utf8).write(to: app.appendingPathComponent("WebApp/" + asset)) }
        try Data("<script src=\"core.js\"></script>".utf8).write(to: app.appendingPathComponent("WebApp/index.html"))
        return app
    }
    func reject(_ app: URL, containing message: String) throws {
        do { try validate(app) }
        catch let error as ValidationFailure {
            try require(error.description.contains(message), "Unexpected rejection: \(error)")
            return
        }
        throw ValidationFailure("Regression fixture was incorrectly accepted: \(app.lastPathComponent)")
    }
    try validate(fixture("valid"))
    let reserved = try fixture("reserved")
    try fileManager.createDirectory(at: reserved.appendingPathComponent("Resources"), withIntermediateDirectories: true)
    try reject(reserved, containing: "root Resources")
    let missingID = try fixture("missing-identifier")
    let missingPlist = missingID.appendingPathComponent("Info.plist")
    var info = try PropertyListSerialization.propertyList(from: Data(contentsOf: missingPlist), format: nil) as! [String: Any]
    info.removeValue(forKey: "CFBundleIdentifier")
    try PropertyListSerialization.data(fromPropertyList: info, format: .xml, options: 0).write(to: missingPlist)
    try reject(missingID, containing: "CFBundleIdentifier")
    let remote = try fixture("remote-asset")
    try Data("<script src=\"https://invalid.example/test.js\"></script>".utf8).write(to: remote.appendingPathComponent("WebApp/index.html"))
    try reject(remote, containing: "nonlocal HTML dependency")
    print("Bundle validator regression checks passed: valid layout, reserved Resources, missing ID, remote asset.")
}

do {
    if CommandLine.arguments.count == 2 && CommandLine.arguments[1] == "--self-test" {
        try selfTest()
    } else {
        try require(CommandLine.arguments.count == 2, "Usage: swift scripts/validate-bundle.swift <path/to/GymPlanner.app> | --self-test")
        let app = URL(fileURLWithPath: CommandLine.arguments[1])
        let identifier = try validate(app)
        print("Bundle validated with Foundation: \(identifier), executable, app icon, and all offline web assets.")
    }
} catch {
    FileHandle.standardError.write(Data("Bundle validation failed: \(error)\n".utf8))
    exit(1)
}
