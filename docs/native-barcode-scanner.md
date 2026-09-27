# Native iPhone barcode scanner

The `scanBarcode` native bridge action opens an AVFoundation camera sheet. It requests camera permission only when this action is invoked. The camera processes product barcode metadata on the device; it does not create a photo, video recording, microphone input, photo-library asset, or network request.

## Bridge contract

- Detection resolves `{ barcode: string, format: string }`.
- Closing the sheet, swiping it away, or putting the app into the background resolves `{ cancelled: true }`.
- Permission, unsupported-device, and capture failures reject with a Dutch message and a manual-entry suggestion.
- A second scan while a scanner or another native sheet is already open is rejected.
- The scanner stops capture and switches off the torch before completing the bridge response.
- A completion latch prevents duplicate replies from repeated detections or concurrent dismissal/session notifications.

Format names are `ean_13`, `ean_8`, `upc_e`, `code_128`, `code_39`, and `itf`. Only metadata types actually supported by the device are enabled. AVFoundation represents UPC-A as EAN-13 with a leading zero; the native scanner preserves that decoded string. This behavior is documented in [Apple's barcode detection FAQ](https://developer.apple.com/library/archive/technotes/tn2325/_index.html).

The scanner only reads a barcode. It does not fetch a product name, serving size, or nutritional information from an online product database.

## Implementation references

- [Request camera authorization at the time of use](https://developer.apple.com/documentation/avfoundation/requesting-authorization-to-capture-and-save-media).
- [Run blocking capture startup on a serial queue](https://developer.apple.com/documentation/avfoundation/avcapturesession).
- [Filter metadata formats against the device's available types](https://developer.apple.com/documentation/avfoundation/avcapturemetadataoutput/metadataobjecttypes).
- [Resizable native sheets](https://developer.apple.com/documentation/uikit/uisheetpresentationcontroller).

Capture configuration, startup, torch changes, and shutdown share a serial background queue. UI updates, metadata delivery, and the completion latch run on the main queue. The sheet has a close button, an optional torch, and a live camera preview. Small iPhones start at the larger sheet size; other iPhones start at medium and allow expansion.

## Verification still requiring an iPhone

The Windows workspace cannot compile UIKit/AVFoundation. A macOS build can verify compilation and simulator startup, but physical barcode recognition and permission/lifecycle behavior must be verified on an iPhone:

1. Open a product editor, enter a name/amount, scan a physical EAN-13 or UPC package, and verify that the form retains its other fields and fills the code.
2. Present the same code continuously: the scanner must close once and the app must receive one result.
3. Close the scanner before detection and swipe it away in a separate run; both must leave the form and existing barcode unchanged.
4. Deny camera access, then retry; both cases must show the Dutch error and allow manual entry without losing the product draft.
5. Open the scanner, switch apps, and return. The scanner must be closed, the camera indicator off, and a fresh scan possible.
6. Enable the torch, then close the scanner; the torch must turn off. Repeat with an incoming-call/camera interruption.
7. Test on the smallest supported phone and with larger text, checking that close/torch controls remain reachable.

These physical-device cases are a test checklist, not a claim that they have already passed.
