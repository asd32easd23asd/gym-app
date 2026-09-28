import UIKit
import WebKit
import UserNotifications

class ViewController: UIViewController, WKScriptMessageHandler, UIScrollViewDelegate {
    var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.04, green: 0.04, blue: 0.04, alpha: 1)

        let content = WKUserContentController()
        content.add(self, name: "notify")
        let config = WKWebViewConfiguration()
        config.userContentController = content
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.isOpaque = false
        webView.backgroundColor = view.backgroundColor
        webView.scrollView.backgroundColor = view.backgroundColor
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        // no zooming: the web side refuses the gestures, this refuses them again
        webView.scrollView.minimumZoomScale = 1
        webView.scrollView.maximumZoomScale = 1
        webView.scrollView.bouncesZoom = false
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false
        webView.scrollView.delegate = self

        view.addSubview(webView)

        if let url = Bundle.main.url(forResource: "index", withExtension: "html") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
    }

    // the scroll view has nothing to zoom, so a pinch that slips through does nothing
    func viewForZooming(in scrollView: UIScrollView) -> UIView? { return nil }

    // receives the upcoming list from the web app and (re)schedules local notifications
    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard message.name == "notify",
              let json = message.body as? String,
              let data = json.data(using: .utf8),
              let items = try? JSONDecoder().decode([DoseItem].self, from: data) else { return }

        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            guard granted else { return }
            center.removeAllPendingNotificationRequests()
            let df = DateFormatter()
            df.dateFormat = "yyyy-MM-dd HH:mm"
            df.timeZone = .current
            for item in items {
                guard let when = df.date(from: "\(item.date) \(item.time)"), when > Date() else { continue }
                let contentN = UNMutableNotificationContent()
                contentN.title = item.title
                contentN.body = item.body
                contentN.sound = .default
                let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: when)
                let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
                let req = UNNotificationRequest(identifier: "\(item.date)-\(item.time)-\(item.body.hashValue)",
                                               content: contentN, trigger: trigger)
                center.add(req)
            }
        }
    }
}

struct DoseItem: Decodable {
    let date: String
    let time: String
    let title: String
    let body: String
}
