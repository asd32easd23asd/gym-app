import Foundation
import UserNotifications

final class GymNotifications {
    private let center = UNUserNotificationCenter.current()
    private let prefix = "gym."
    private var busy = false

    /// Serialized on the main queue so an older schedule cannot replace a newer one.
    func schedule(_ items: [[String: Any]], requestPermission: Bool, completion: @escaping (Result<Any, Error>) -> Void) {
        DispatchQueue.main.async {
            guard !self.busy else { completion(.failure(GymError.invalid("Herinneringen worden al bijgewerkt. Probeer opnieuw."))); return }
            self.busy = true
            let finish: (Result<Any, Error>) -> Void = { result in
                DispatchQueue.main.async { self.busy = false; completion(result) }
            }
            self.center.getNotificationSettings { settings in
                if settings.authorizationStatus == .notDetermined && requestPermission {
                    self.center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
                        if let error = error { finish(.failure(error)) }
                        else if granted { self.replace(items, completion: finish) }
                        else { finish(.failure(GymError.invalid("Herinneringen zijn niet toegestaan. Je kunt dit wijzigen in iPhone-instellingen."))) }
                    }
                } else if settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional || settings.authorizationStatus == .ephemeral {
                    self.replace(items, completion: finish)
                } else if items.isEmpty {
                    self.center.getPendingNotificationRequests { requests in
                        self.center.removePendingNotificationRequests(withIdentifiers: requests.filter { $0.identifier.hasPrefix(self.prefix) }.map(\.identifier))
                        finish(.success(["scheduled": 0, "skipped": 0]))
                    }
                } else { finish(.failure(GymError.invalid("Geef eerst toestemming voor meldingen via Herinneringen inschakelen."))) }
            }
        }
    }

    private func replace(_ items: [[String: Any]], completion: @escaping (Result<Any, Error>) -> Void) {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        formatter.isLenient = false
        var requests: [(Date, UNNotificationRequest)] = []
        var seen = Set<String>()
        var skipped = 0
        for (index, item) in items.enumerated() {
            guard let date = item["date"] as? String, let time = item["time"] as? String,
                  let title = item["title"] as? String, let body = item["body"] as? String,
                  let when = formatter.date(from: date + " " + time),
                  formatter.string(from: when) == date + " " + time else {
                completion(.failure(GymError.invalid("Een herinnering heeft een ongeldige datum of tijd."))); return
            }
            guard when > Date() else { skipped += 1; continue }
            let key = item["id"] as? String ?? "\(date)-\(time)-\(index)"
            guard !key.isEmpty, seen.insert(key).inserted else {
                completion(.failure(GymError.invalid("Herinneringen moeten een unieke identificatie hebben."))); return
            }
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default
            var components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: when)
            components.timeZone = .current
            let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
            requests.append((when, UNNotificationRequest(identifier: prefix + key, content: content, trigger: trigger)))
        }
        requests.sort { $0.0 < $1.0 }
        // Keep headroom in iOS's bounded pending-notification queue and report truncation.
        let scheduled = Array(requests.prefix(60)).map { $0.1 }
        let dropped = skipped + max(0, requests.count - scheduled.count)
        center.getPendingNotificationRequests { old in
            self.center.removePendingNotificationRequests(withIdentifiers: old.filter { $0.identifier.hasPrefix(self.prefix) }.map(\.identifier))
            let group = DispatchGroup()
            let lock = NSLock()
            var firstError: Error?
            for request in scheduled {
                group.enter()
                self.center.add(request) { error in
                    if let error = error { lock.lock(); if firstError == nil { firstError = error }; lock.unlock() }
                    group.leave()
                }
            }
            group.notify(queue: .main) {
                if let error = firstError { completion(.failure(error)) }
                else { completion(.success(["scheduled": scheduled.count, "skipped": dropped])) }
            }
        }
    }
}
