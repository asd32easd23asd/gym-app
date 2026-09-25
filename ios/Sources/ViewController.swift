import UIKit
import WebKit
import UserNotifications

private final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var delegate: WKScriptMessageHandler?
    init(_ delegate: WKScriptMessageHandler) { self.delegate = delegate }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        delegate?.userContentController(userContentController, didReceive: message)
    }
}

final class ViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
    private var webView: WKWebView!
    private let store = LocalStore()
    private let storageQueue = DispatchQueue(label: "GymPlanner.private-storage", qos: .userInitiated)
    private let notifications = GymNotifications()
    private var bundleRoot: URL?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.04, green: 0.04, blue: 0.04, alpha: 1)
        let messages = WKUserContentController()
        let handler = WeakMessageHandler(self)
        messages.add(handler, name: "gym")
        messages.add(handler, name: "notify")
        let config = WKWebViewConfiguration()
        config.userContentController = messages
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.setURLSchemeHandler(PhotoSchemeHandler(store: store, queue: storageQueue), forURLScheme: "gym-photo")
        config.allowsInlineMediaPlayback = true
        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = view.backgroundColor
        webView.scrollView.backgroundColor = view.backgroundColor
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        view.addSubview(webView)

        guard let index = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "WebApp") else {
            showFailure("De appbestanden ontbreken. Installeer de app opnieuw.")
            return
        }
        bundleRoot = index.deletingLastPathComponent().standardizedFileURL
        // Block all network resources, not only main-frame navigation.
        let rules = """
        [{"trigger":{"url-filter":"^https?://"},"action":{"type":"block"}},
         {"trigger":{"url-filter":"^wss?://"},"action":{"type":"block"}},
         {"trigger":{"url-filter":"^ftp://"},"action":{"type":"block"}}]
        """
        WKContentRuleListStore.default().compileContentRuleList(forIdentifier: "GymPlannerOffline", encodedContentRuleList: rules) { [weak self] list, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                guard let list = list, error == nil else {
                    self.showFailure("Offline-beveiliging kon niet starten. Sluit de app en probeer opnieuw.")
                    return
                }
                self.webView.configuration.userContentController.add(list)
                self.webView.loadFileURL(index, allowingReadAccessTo: index.deletingLastPathComponent())
            }
        }
    }

    private func trusted(_ url: URL?) -> Bool {
        guard let url = url, url.isFileURL, let root = bundleRoot else { return false }
        let path = url.resolvingSymlinksInPath().standardizedFileURL.path
        return path.hasPrefix(root.resolvingSymlinksInPath().path + "/")
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        // Images use the scheme handler; they never need to become the application page.
        decisionHandler(trusted(navigationAction.request.url) ? .allow : .cancel)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        return nil
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code != NSURLErrorCancelled { showFailure(error.localizedDescription) }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { webView.reload() }

    // Image file inputs use WebKit's native camera/library chooser on iOS 15+.
    // Keep the default chooser: runOpenPanel customization requires iOS 18.4.
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, trusted(message.frameInfo.request.url) else { return }
        if message.name == "notify" {
            // Legacy messages never request permission implicitly.
            guard let json = message.body as? String, let data = json.data(using: .utf8),
                  let items = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return }
            notifications.schedule(items, requestPermission: false) { _ in }
            return
        }
        guard message.name == "gym", let body = message.body as? [String: Any],
              let id = body["id"], id is String || id is NSNumber,
              let action = body["action"] as? String else { return }
        let payload = body["payload"] as? [String: Any] ?? [:]
        if action == "copyText" {
            guard let text = payload["text"] as? String, !text.isEmpty, text.utf8.count <= 100_000 else {
                reply(id, result: .failure(GymError.invalid("De tekst is leeg of te groot om te kopiëren."))); return
            }
            // User-initiated copy only; localOnly prevents Universal Clipboard sync.
            UIPasteboard.general.setItems([["public.utf8-plain-text": text]], options: [.localOnly: true])
            reply(id, result: .success(["copied": true]))
            return
        }
        if action == "notifications" {
            guard let items = payload["items"] as? [[String: Any]] else {
                reply(id, result: .failure(GymError.invalid("De lijst met herinneringen ontbreekt."))); return
            }
            notifications.schedule(items, requestPermission: payload["requestPermission"] as? Bool == true) { [weak self] result in
                self?.reply(id, result: result)
            }
            return
        }
        storageQueue.async { [weak self] in
            guard let self = self else { return }
            do {
                let result: Any
                switch action {
                case "loadState": result = try self.store.loadState()
                case "saveState": try self.store.saveState(payload["state"]); result = ["saved": true]
                case "savePhoto":
                    guard let photoID = payload["id"] as? String, let dataURL = payload["dataUrl"] as? String else {
                        throw GymError.invalid("De foto of identificatie ontbreekt.")
                    }
                    result = try self.store.savePhoto(id: photoID, dataURL: dataURL)
                case "loadPhoto":
                    guard let photoID = payload["id"] as? String else { throw GymError.invalid("De foto-identificatie ontbreekt.") }
                    result = try self.store.loadPhoto(photoID)
                case "listPhotos": result = try self.store.listPhotos()
                case "deletePhoto":
                    guard let photoID = payload["id"] as? String else { throw GymError.invalid("De foto-identificatie ontbreekt.") }
                    try self.store.deletePhoto(photoID); result = ["deleted": true]
                case "exportBackup":
                    let url = try self.store.exportFile(payload["json"])
                    DispatchQueue.main.async { self.share(url, requestID: id) }
                    return
                default: throw GymError.invalid("Deze appactie wordt niet ondersteund: " + action)
                }
                self.reply(id, result: .success(result))
            } catch { self.reply(id, result: .failure(error)) }
        }
    }

    private func reply(_ id: Any, result: Result<Any, Error>) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            var response: [String: Any] = ["id": id]
            switch result {
            case .success(let value): response.merge(["ok": true, "result": value, "error": NSNull()]) { _, new in new }
            case .failure(let error): response.merge(["ok": false, "result": NSNull(), "error": error.localizedDescription]) { _, new in new }
            }
            // Argument binding avoids interpolating user text or JSON into JavaScript source.
            self.webView.callAsyncJavaScript("if (window.GymNative && typeof window.GymNative.receive === 'function') { window.GymNative.receive(response); }",
                                             arguments: ["response": response], in: nil, in: .page) { _ in }
        }
    }

    private func share(_ url: URL, requestID: Any) {
        guard presentedViewController == nil else {
            try? FileManager.default.removeItem(at: url.deletingLastPathComponent())
            reply(requestID, result: .failure(GymError.invalid("Sluit eerst het geopende venster.")))
            return
        }
        let controller = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        controller.popoverPresentationController?.sourceView = view
        controller.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
        controller.completionWithItemsHandler = { [weak self] _, completed, _, error in
            try? FileManager.default.removeItem(at: url.deletingLastPathComponent())
            if let error = error { self?.reply(requestID, result: .failure(error)) }
            else { self?.reply(requestID, result: .success(["shared": completed])) }
        }
        present(controller, animated: true)
    }

    private func showFailure(_ message: String) {
        let label = UILabel(frame: view.bounds.insetBy(dx: 28, dy: 80))
        label.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        label.numberOfLines = 0
        label.textAlignment = .center
        label.textColor = .white
        label.text = message
        view.addSubview(label)
    }
}
