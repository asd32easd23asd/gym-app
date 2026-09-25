import Foundation
import ImageIO

enum GymError: LocalizedError {
    case invalid(String)
    var errorDescription: String? {
        switch self { case .invalid(let message): return message }
    }
}

/// Call on the shared serial storage queue. This store never uploads data.
final class LocalStore {
    static let maximumPhotoBytes = 12 * 1024 * 1024
    private let files = FileManager.default

    private func directory(_ child: String? = nil) throws -> URL {
        var url = try files.url(for: .applicationSupportDirectory, in: .userDomainMask,
                                appropriateFor: nil, create: true).appendingPathComponent("GymData", isDirectory: true)
        if let child = child { url.appendPathComponent(child, isDirectory: true) }
        try files.createDirectory(at: url, withIntermediateDirectories: true,
                                  attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication])
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        var parent = url.deletingLastPathComponent()
        if child != nil { try parent.setResourceValues(values) }
        try url.setResourceValues(values)
        return url
    }

    private func write(_ data: Data, to url: URL) throws {
        try data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        var destination = url
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try destination.setResourceValues(values)
    }

    func loadState() throws -> Any {
        let url = try directory().appendingPathComponent("state.json")
        guard files.fileExists(atPath: url.path) else { return NSNull() }
        let data = try Data(contentsOf: url)
        guard let state = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw GymError.invalid("De opgeslagen gegevens zijn geen geldig object. Importeer je reservekopie.")
        }
        return state
    }

    func saveState(_ state: Any?) throws {
        guard let state = state as? [String: Any], JSONSerialization.isValidJSONObject(state) else {
            throw GymError.invalid("Ongeldige gegevens: opslaan is niet uitgevoerd.")
        }
        let data = try JSONSerialization.data(withJSONObject: state, options: [.sortedKeys])
        guard data.count <= 25 * 1024 * 1024 else {
            throw GymError.invalid("De gegevens zijn te groot. Sla foto's apart op.")
        }
        try write(data, to: directory().appendingPathComponent("state.json"))
    }

    static func validPhotoID(_ id: String) -> Bool {
        !id.isEmpty && id.utf8.count <= 100 && id.unicodeScalars.allSatisfy {
            (65...90).contains($0.value) || (97...122).contains($0.value) ||
            (48...57).contains($0.value) || $0.value == 45 || $0.value == 95
        }
    }

    private func photoURL(_ id: String) throws -> URL {
        guard Self.validPhotoID(id) else { throw GymError.invalid("Ongeldige foto-identificatie.") }
        return try directory("Photos").appendingPathComponent(id + ".jpg")
    }

    func savePhoto(id: String, dataURL: String) throws -> [String: Any] {
        let prefix = "data:image/jpeg;base64,"
        guard dataURL.hasPrefix(prefix), dataURL.utf8.count < Self.maximumPhotoBytes * 4 / 3 + 128,
              let data = Data(base64Encoded: String(dataURL.dropFirst(prefix.count))),
              !data.isEmpty, data.count < Self.maximumPhotoBytes,
              let source = CGImageSourceCreateWithData(data as CFData, nil),
              CGImageSourceGetCount(source) == 1,
              let imageType = CGImageSourceGetType(source), imageType as String == "public.jpeg",
              let info = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
              let width = info[kCGImagePropertyPixelWidth] as? NSNumber,
              let height = info[kCGImagePropertyPixelHeight] as? NSNumber,
              width.doubleValue > 0, height.doubleValue > 0,
              width.doubleValue * height.doubleValue <= 50_000_000 else {
            throw GymError.invalid("Kies een geldige JPEG kleiner dan 12 MB (maximaal 50 megapixels).")
        }
        try write(data, to: photoURL(id))
        return ["id": id, "url": "gym-photo://local/" + id]
    }

    func photoData(_ id: String) throws -> Data {
        let data = try Data(contentsOf: photoURL(id))
        guard data.count < Self.maximumPhotoBytes else { throw GymError.invalid("De foto is te groot.") }
        return data
    }

    func loadPhoto(_ id: String) throws -> [String: Any] {
        ["id": id, "url": "gym-photo://local/" + id,
         "dataUrl": "data:image/jpeg;base64," + (try photoData(id)).base64EncodedString()]
    }

    func deletePhoto(_ id: String) throws {
        let url = try photoURL(id)
        if files.fileExists(atPath: url.path) { try files.removeItem(at: url) }
    }

    func listPhotos() throws -> [[String: String]] {
        try files.contentsOfDirectory(at: directory("Photos"), includingPropertiesForKeys: nil)
            .filter { $0.pathExtension == "jpg" && Self.validPhotoID($0.deletingPathExtension().lastPathComponent) }
            .map { ["id": $0.deletingPathExtension().lastPathComponent,
                    "url": "gym-photo://local/" + $0.deletingPathExtension().lastPathComponent] }
            .sorted { ($0["id"] ?? "") < ($1["id"] ?? "") }
    }

    func exportFile(_ json: Any?) throws -> URL {
        let data: Data
        if let string = json as? String, let bytes = string.data(using: .utf8) {
            _ = try JSONSerialization.jsonObject(with: bytes)
            data = bytes
        } else if let object = json, JSONSerialization.isValidJSONObject(object) {
            data = try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
        } else { throw GymError.invalid("De reservekopie bevat geen geldige JSON.") }
        let folder = files.temporaryDirectory.appendingPathComponent("GymExport-" + UUID().uuidString, isDirectory: true)
        try files.createDirectory(at: folder, withIntermediateDirectories: true)
        let url = folder.appendingPathComponent("GymPlanner-backup.json")
        try write(data, to: url)
        return url
    }
}
