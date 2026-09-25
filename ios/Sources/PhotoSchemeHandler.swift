import Foundation
import WebKit

final class PhotoSchemeHandler: NSObject, WKURLSchemeHandler {
    private let store: LocalStore
    private let queue: DispatchQueue
    // WebKit invokes both callbacks on the main thread; only touch this set there.
    private var pending = Set<ObjectIdentifier>()

    init(store: LocalStore, queue: DispatchQueue) { self.store = store; self.queue = queue }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        let token = ObjectIdentifier(urlSchemeTask)
        pending.insert(token)
        guard let url = urlSchemeTask.request.url, url.scheme == "gym-photo", url.host == "local",
              url.pathComponents.count == 2, LocalStore.validPhotoID(url.lastPathComponent) else {
            pending.remove(token)
            urlSchemeTask.didFailWithError(GymError.invalid("Ongeldige lokale foto-URL."))
            return
        }
        queue.async { [weak self] in
            guard let self = self else { return }
            let result = Result { try self.store.photoData(url.lastPathComponent) }
            DispatchQueue.main.async {
                guard self.pending.remove(token) != nil else { return }
                switch result {
                case .success(let data):
                    urlSchemeTask.didReceive(URLResponse(url: url, mimeType: "image/jpeg",
                                                         expectedContentLength: data.count, textEncodingName: nil))
                    urlSchemeTask.didReceive(data)
                    urlSchemeTask.didFinish()
                case .failure(let error): urlSchemeTask.didFailWithError(error)
                }
            }
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        pending.remove(ObjectIdentifier(urlSchemeTask))
    }
}
