(function () {
 'use strict';
 let active = null;
 const valid = value => typeof value === 'string' && /^[\x20-\x7e]{1,64}$/.test(value.trim());
 function normalize(value) { if (!valid(value)) throw Error('Deze barcode wordt niet ondersteund.'); return value.trim(); }
 function key(value) { const code = normalize(value); return /^\d{12}$/.test(code) ? '0' + code : code; }
 const stopStream = stream => stream?.getTracks().forEach(track => track.stop());
 function stopCamera(frame) {
  frame.generation++;
  frame.controls?.stop(); frame.controls = null;
  stopStream(frame.stream); frame.stream = null;
  if (frame.video) { frame.video.pause(); frame.video.srcObject = null; }
 }
 function finish(frame, result) {
  if (frame.done) return;
  frame.done = true; stopCamera(frame);
  if (frame.url) URL.revokeObjectURL(frame.url);
  frame.dialog.close(); frame.dialog.remove();
  if (active === frame) active = null;
  if (frame.launcher?.isConnected) frame.launcher.focus({ preventScroll: true });
  frame.resolve(result);
 }
 function message(frame, text, failed = false) {
  if (frame.done) return;
  frame.status.textContent = text;
  frame.status.classList.toggle('scanner-error', failed);
 }
 function readResult(frame, result) {
  if (!result || frame.done) return;
  try { finish(frame, { barcode: normalize(result.getText()), format: String(result.getBarcodeFormat()) }); }
  catch { message(frame, 'Deze barcode wordt niet ondersteund. Probeer een productbarcode.', true); }
 }
 async function camera(frame) {
  stopCamera(frame); const generation = frame.generation;
  const video = document.createElement('video'); video.autoplay = true; video.muted = true; video.setAttribute('playsinline', ''); video.setAttribute('aria-label', 'Camerabeeld voor barcode');
  frame.video.replaceWith(video); frame.video = video;
  message(frame, 'Camera openen…');
  try {
   if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(Error(), { name: 'NotSupportedError' });
   const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
   if (frame.done || generation !== frame.generation) { stopStream(stream); return; }
   frame.stream = stream;
   const reader = new ZXingBrowser.BrowserMultiFormatOneDReader(undefined, { delayBetweenScanAttempts: 180, delayBetweenScanSuccess: 350 });
   const controls = await reader.decodeFromStream(stream, video, (result, error, controls) => {
    if (frame.done || generation !== frame.generation) { controls?.stop(); return; }
    if (result) { readResult(frame, result); if (frame.done) controls?.stop(); }
   });
   if (frame.done || generation !== frame.generation) { controls.stop(); return; }
   frame.controls = controls;
   message(frame, 'Houd de streepjescode recht in beeld.');
  } catch (error) {
   if (frame.done || generation !== frame.generation) return;
   stopCamera(frame);
   const descriptions = { NotAllowedError: 'Geen cameratoegang. Sta de camera toe of kies een foto.', NotFoundError: 'Geen camera gevonden. Kies een foto van de barcode.', NotReadableError: 'De camera is in gebruik. Sluit de andere camera-app en probeer opnieuw.', NotSupportedError: 'Camera niet beschikbaar in deze browser. Kies een foto of gebruik de iPhone-app.' };
   message(frame, descriptions[error.name] || 'Camera openen lukt niet. Probeer opnieuw of kies een foto.', true);
  }
 }
 async function photo(frame, file) {
  if (!file || frame.done) return;
  stopCamera(frame); const generation = frame.generation;
  if (!file.type.startsWith('image/') || file.size > 15 * 1024 * 1024) { message(frame, 'Kies een afbeelding van maximaal 15 MB.', true); return; }
  message(frame, 'Barcode lezen…');
  const url = URL.createObjectURL(file); frame.url = url;
  try {
   const result = await new ZXingBrowser.BrowserMultiFormatOneDReader().decodeFromImageUrl(url);
   if (!frame.done && generation === frame.generation) readResult(frame, result);
  } catch { if (!frame.done && generation === frame.generation) message(frame, 'Geen barcode gevonden. Kies een scherpe foto met de hele streepjescode.', true); }
  finally { URL.revokeObjectURL(url); if (frame.url === url) frame.url = null; }
 }
 async function scan() {
  if (active) throw Error('De scanner is al geopend.');
  if (window.GymNative?.available) {
   active = { native: true };
   try { const result = await GymNative.request('scanBarcode'); return result?.cancelled ? { cancelled: true } : { barcode: normalize(result?.barcode), format: String(result.format || '') }; }
   finally { active = null; }
  }
  if (!window.ZXingBrowser) throw Error('De scannerbestanden ontbreken. Open de app opnieuw.');
  return new Promise(resolve => {
   const dialog = document.createElement('dialog'); dialog.id = 'barcode-dialog'; dialog.setAttribute('aria-labelledby', 'barcode-title');
   dialog.innerHTML = '<header class="scanner-header"><h2 id="barcode-title">Barcode scannen</h2><button type="button" class="scanner-close" aria-label="Scanner sluiten">×</button></header><div class="scanner-view"><video autoplay muted playsinline aria-label="Camerabeeld voor barcode"></video><span class="scanner-guide" aria-hidden="true"></span></div><p class="scanner-status" role="status" aria-live="polite"></p><div class="scanner-actions"><button class="secondary scanner-retry" type="button">Camera opnieuw openen</button><label class="secondary file-button">Foto van barcode kiezen<input type="file" accept="image/*" capture="environment" aria-label="Foto van barcode kiezen"></label></div><p class="scanner-privacy">Beelden worden niet bewaard of verstuurd.</p>';
   const frame = { dialog, resolve, done: false, generation: 0, launcher: document.activeElement, video: dialog.querySelector('video'), status: dialog.querySelector('.scanner-status') };
   active = frame;
   document.body.append(dialog);
   dialog.querySelector('.scanner-close').addEventListener('click', () => finish(frame, { cancelled: true }));
   dialog.addEventListener('cancel', event => { event.preventDefault(); finish(frame, { cancelled: true }); });
   dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) finish(frame, { cancelled: true }); });
   dialog.querySelector('.scanner-retry').addEventListener('click', () => camera(frame));
   dialog.querySelector('input').addEventListener('change', event => { const file = event.target.files?.[0]; event.target.value = ''; photo(frame, file); });
   dialog.showModal(); camera(frame);
  });
 }
 document.addEventListener('visibilitychange', () => { if (document.hidden && active && !active.native) finish(active, { cancelled: true }); });
 window.addEventListener('pagehide', () => { if (active && !active.native) finish(active, { cancelled: true }); });
 window.GymBarcode = { scan, normalize, key };
})();
