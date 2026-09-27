import UIKit
import AVFoundation

/// Reads barcode metadata on the device. No photo, video, audio, or network output is created.
final class BarcodeScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate, UIAdaptivePresentationControllerDelegate {
    private let session = AVCaptureSession()
    private let captureQueue = DispatchQueue(label: "GymPlanner.barcode-camera", qos: .userInitiated)
    private let completion: (Result<Any, Error>) -> Void
    private let preview = BarcodePreviewView()
    private let torchButton = UIButton(type: .system)
    private let statusLabel = UILabel()
    private let closeButton = UIButton(type: .system)
    // Only accessed on the main queue.
    private var started = false
    private var finished = false
    // Only accessed on captureQueue.
    private var camera: AVCaptureDevice?
    private var stopped = false

    init(completion: @escaping (Result<Any, Error>) -> Void) {
        self.completion = completion
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .pageSheet
        if let sheet = sheetPresentationController {
            sheet.detents = [.medium(), .large()]
            sheet.selectedDetentIdentifier = UIScreen.main.bounds.height < 740 ? .large : .medium
            sheet.prefersGrabberVisible = true
            sheet.preferredCornerRadius = 20
        }
    }

    required init?(coder: NSCoder) { fatalError("Use init(completion:)") }

    override func viewDidLoad() {
        super.viewDidLoad()
        overrideUserInterfaceStyle = .dark
        view.backgroundColor = UIColor(white: 0.08, alpha: 1)
        preview.previewLayer.session = session
        preview.previewLayer.videoGravity = .resizeAspectFill
        preview.layer.cornerRadius = 12
        preview.clipsToBounds = true
        preview.backgroundColor = .black
        preview.isAccessibilityElement = true
        preview.accessibilityLabel = "Camerabeeld. Richt de achterkant van je iPhone op de barcode."

        let title = UILabel()
        title.text = "Barcode scannen"
        title.font = .preferredFont(forTextStyle: .headline)
        title.adjustsFontForContentSizeCategory = true
        title.textColor = .white
        title.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        title.accessibilityTraits = .header

        closeButton.setImage(UIImage(systemName: "xmark"), for: .normal)
        closeButton.tintColor = .white
        closeButton.accessibilityLabel = "Scanner sluiten"
        closeButton.addTarget(self, action: #selector(cancelScan), for: .touchUpInside)
        torchButton.setImage(UIImage(systemName: "flashlight.off.fill"), for: .normal)
        torchButton.tintColor = .white
        torchButton.accessibilityLabel = "Zaklamp aanzetten"
        torchButton.isEnabled = false
        torchButton.addTarget(self, action: #selector(toggleTorch), for: .touchUpInside)

        let header = UIStackView(arrangedSubviews: [title, torchButton, closeButton])
        header.alignment = .center
        header.spacing = 8
        [torchButton, closeButton].forEach { button in
            button.widthAnchor.constraint(equalToConstant: 44).isActive = true
            button.heightAnchor.constraint(equalToConstant: 44).isActive = true
        }

        statusLabel.text = "Richt de camera op de barcode."
        statusLabel.font = .preferredFont(forTextStyle: .subheadline)
        statusLabel.adjustsFontForContentSizeCategory = true
        statusLabel.textColor = UIColor(white: 0.8, alpha: 1)
        statusLabel.numberOfLines = 0

        let privacy = UILabel()
        privacy.text = "De camera leest alleen de code. Beelden worden niet opgeslagen of verstuurd."
        privacy.font = .preferredFont(forTextStyle: .footnote)
        privacy.adjustsFontForContentSizeCategory = true
        privacy.textColor = UIColor(white: 0.72, alpha: 1)
        privacy.numberOfLines = 0
        let content = UIStackView(arrangedSubviews: [header, statusLabel, preview, privacy])
        content.axis = .vertical
        content.spacing = 12
        content.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(content)
        let minPreview = preview.heightAnchor.constraint(greaterThanOrEqualToConstant: 100)
        minPreview.priority = .defaultHigh
        NSLayoutConstraint.activate([
            content.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            content.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            content.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            content.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16),
            minPreview
        ])
        preview.setContentHuggingPriority(.defaultLow, for: .vertical)

        let guide = UIView()
        guide.isUserInteractionEnabled = false
        guide.layer.borderColor = UIColor(white: 1, alpha: 0.8).cgColor
        guide.layer.borderWidth = 1.5
        guide.layer.cornerRadius = 8
        guide.translatesAutoresizingMaskIntoConstraints = false
        preview.addSubview(guide)
        NSLayoutConstraint.activate([
            guide.centerXAnchor.constraint(equalTo: preview.centerXAnchor),
            guide.centerYAnchor.constraint(equalTo: preview.centerYAnchor),
            guide.widthAnchor.constraint(equalTo: preview.widthAnchor, multiplier: 0.8),
            guide.heightAnchor.constraint(equalTo: preview.heightAnchor, multiplier: 0.55)
        ])

        NotificationCenter.default.addObserver(self, selector: #selector(enteredBackground), name: UIApplication.didEnterBackgroundNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(captureInterrupted), name: AVCaptureSession.wasInterruptedNotification, object: session)
        NotificationCenter.default.addObserver(self, selector: #selector(captureFailed), name: AVCaptureSession.runtimeErrorNotification, object: session)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        presentationController?.delegate = self
        guard !started, !finished else { return }
        started = true
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: startCapture()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] allowed in
                DispatchQueue.main.async {
                    guard let self = self, !self.finished else { return }
                    if allowed { self.startCapture() }
                    else { self.permissionDenied() }
                }
            }
        case .denied, .restricted: permissionDenied()
        @unknown default: permissionDenied()
        }
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        // Also covers dismissal by a parent or the interactive sheet gesture.
        if !finished { finish(.success(["cancelled": true]), dismiss: false) }
    }

    deinit { NotificationCenter.default.removeObserver(self) }

    private func permissionDenied() {
        finish(.failure(GymError.invalid("Cameratoegang staat uit. Geef Gym Planner toegang tot de camera in de iPhone-instellingen, of voer het nummer handmatig in.")))
    }

    private func startCapture() {
        guard !finished else { return }
        captureQueue.async { [weak self] in
            guard let self = self, !self.stopped else { return }
            do {
                try self.configureCapture()
                self.session.startRunning()
                guard self.session.isRunning else {
                    throw GymError.invalid("De camera kon niet starten. Sluit andere camera-apps en probeer opnieuw, of voer het nummer handmatig in.")
                }
                let hasTorch = self.camera?.hasTorch == true && self.camera?.isTorchAvailable == true
                DispatchQueue.main.async { [weak self] in
                    guard let self = self, !self.finished else { return }
                    self.torchButton.isEnabled = hasTorch
                    if !hasTorch { self.torchButton.isHidden = true }
                    if self.preview.previewLayer.connection?.isVideoOrientationSupported == true {
                        self.preview.previewLayer.connection?.videoOrientation = .portrait
                    }
                }
            } catch {
                DispatchQueue.main.async { [weak self] in
                    self?.finish(.failure(error))
                }
            }
        }
    }

    private func configureCapture() throws {
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
            throw GymError.invalid("Op dit toestel is geen camera beschikbaar. Voer het barcodenummer handmatig in.")
        }
        let input: AVCaptureDeviceInput
        do { input = try AVCaptureDeviceInput(device: device) }
        catch { throw GymError.invalid("De camera is niet beschikbaar. Probeer opnieuw of voer het nummer handmatig in.") }
        session.beginConfiguration()
        defer { session.commitConfiguration() }
        if session.canSetSessionPreset(.high) { session.sessionPreset = .high }
        guard session.canAddInput(input) else {
            throw GymError.invalid("De camera kon niet worden geopend. Probeer opnieuw of voer het nummer handmatig in.")
        }
        session.addInput(input)
        camera = device
        let output = AVCaptureMetadataOutput()
        guard session.canAddOutput(output) else {
            throw GymError.invalid("Barcodes scannen is niet beschikbaar op dit toestel. Voer het nummer handmatig in.")
        }
        session.addOutput(output)
        let supported: [AVMetadataObject.ObjectType] = [.ean13, .ean8, .upce, .code128, .code39, .interleaved2of5, .itf14]
        let available = supported.filter { output.availableMetadataObjectTypes.contains($0) }
        guard !available.isEmpty else {
            throw GymError.invalid("Deze camera kan geen productbarcodes lezen. Voer het nummer handmatig in.")
        }
        output.metadataObjectTypes = available
        output.setMetadataObjectsDelegate(self, queue: .main)
    }

    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
        guard !finished else { return }
        for case let code as AVMetadataMachineReadableCodeObject in metadataObjects {
            guard let barcode = code.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines), !barcode.isEmpty, barcode.count <= 64 else { continue }
            let formats: [AVMetadataObject.ObjectType: String] = [
                .ean13: "ean_13", .ean8: "ean_8", .upce: "upc_e", .code128: "code_128",
                .code39: "code_39", .interleaved2of5: "itf", .itf14: "itf"
            ]
            finish(.success(["barcode": barcode, "format": formats[code.type] ?? code.type.rawValue]))
            return
        }
    }

    @objc private func toggleTorch() {
        guard !finished else { return }
        torchButton.isEnabled = false
        captureQueue.async { [weak self] in
            guard let self = self, !self.stopped, let camera = self.camera else { return }
            do {
                try camera.lockForConfiguration()
                defer { camera.unlockForConfiguration() }
                let nextMode: AVCaptureDevice.TorchMode = camera.torchMode == .on ? .off : .on
                guard camera.isTorchAvailable, camera.isTorchModeSupported(nextMode) else {
                    throw GymError.invalid("De zaklamp is nu niet beschikbaar.")
                }
                camera.torchMode = nextMode
                let enabled = nextMode == .on
                DispatchQueue.main.async { [weak self] in
                    guard let self = self, !self.finished else { return }
                    self.torchButton.isEnabled = true
                    self.torchButton.setImage(UIImage(systemName: enabled ? "flashlight.on.fill" : "flashlight.off.fill"), for: .normal)
                    self.torchButton.accessibilityLabel = enabled ? "Zaklamp uitzetten" : "Zaklamp aanzetten"
                    self.torchButton.accessibilityValue = enabled ? "Aan" : "Uit"
                }
            } catch {
                DispatchQueue.main.async { [weak self] in
                    guard let self = self, !self.finished else { return }
                    self.torchButton.isEnabled = true
                    self.statusLabel.text = "Zaklamp niet beschikbaar. Scan bij voldoende licht."
                }
            }
        }
    }

    @objc private func cancelScan() { finish(.success(["cancelled": true])) }

    @objc private func enteredBackground() {
        DispatchQueue.main.async { [weak self] in self?.finish(.success(["cancelled": true])) }
    }

    @objc private func captureInterrupted(_ notification: Notification) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if UIApplication.shared.applicationState == .background {
                self.finish(.success(["cancelled": true]))
            } else {
                self.finish(.failure(GymError.invalid("Het scannen is onderbroken. Probeer opnieuw of voer het nummer handmatig in.")))
            }
        }
    }

    @objc private func captureFailed(_ notification: Notification) {
        DispatchQueue.main.async { [weak self] in
            self?.finish(.failure(GymError.invalid("De camera is gestopt. Probeer opnieuw of voer het nummer handmatig in.")))
        }
    }

    private func stopCapture() {
        stopped = true
        if let camera = camera, camera.hasTorch {
            do {
                try camera.lockForConfiguration()
                defer { camera.unlockForConfiguration() }
                if camera.isTorchModeSupported(.off) { camera.torchMode = .off }
            } catch {
                // Stopping the capture session below also relinquishes the camera.
            }
        }
        if session.isRunning { session.stopRunning() }
    }

    private func finish(_ result: Result<Any, Error>, dismiss: Bool = true) {
        // All completion paths arrive on the main queue. Set the latch before stopping
        // capture because stopRunning may deliver additional notifications.
        guard !finished else { return }
        finished = true
        closeButton.isEnabled = false
        torchButton.isEnabled = false
        captureQueue.async { [self] in
            stopCapture()
            DispatchQueue.main.async { [self] in
                if dismiss, presentingViewController != nil, !isBeingDismissed {
                    self.dismiss(animated: true) { [self] in completion(result) }
                } else {
                    completion(result)
                }
            }
        }
    }

    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        finish(.success(["cancelled": true]), dismiss: false)
    }
}

private final class BarcodePreviewView: UIView {
    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
    var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
}
