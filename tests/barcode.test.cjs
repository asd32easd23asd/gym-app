const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = name => fs.readFileSync(path.join(__dirname, '../app', name), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const result = (text = '5901234123457') => ({ getText: () => text, getBarcodeFormat: () => 7 });
const plain = value => JSON.parse(JSON.stringify(value));

function nativeHarness() {
  const sent = [], timers = [];
  const context = {
    document: { addEventListener() {}, createElement() { throw Error('Native scanner must not open the browser camera.'); } },
    addEventListener() {},
    navigator: { mediaDevices: { getUserMedia() { throw Error('Native scanner must not use getUserMedia.'); } } },
    webkit: { messageHandlers: { gym: { postMessage(message) { sent.push(message); } } } },
    setTimeout(fn, delay) { timers.push({ fn, delay }); return timers.length; }, clearTimeout() {}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source('storage.js'), context);
  vm.runInContext(source('barcode.js'), context);
  return { scanner: context.GymBarcode, sent, timers, reply(value, ok = true) {
    context.GymNative.receive({ id: sent.at(-1).id, ok, result: ok ? value : null, error: ok ? null : value });
  } };
}

class Element {
  constructor(tag = 'div') { this.tagName = tag.toUpperCase(); this.listeners = new Map(); this.attrs = {}; this.isConnected = false; this.textContent = ''; this.classList = { toggle() {} }; }
  setAttribute(key, value) { this.attrs[key] = value; }
  addEventListener(type, fn) { this.listeners.set(type, fn); }
  fire(type, values = {}) { const event = { target: this, preventDefault() { this.prevented = true; }, ...values }; this.listeners.get(type)?.(event); return event; }
  focus() { this.focused = true; }
  pause() { this.paused = true; }
  replaceWith(next) { if (this.dialog) { this.dialog.nodes.video = next; next.dialog = this.dialog; } this.isConnected = false; next.isConnected = true; }
}

class Dialog extends Element {
  constructor() {
    super('dialog');
    this.nodes = Object.fromEntries(['video', '.scanner-status', '.scanner-close', '.scanner-retry', 'input'].map(key => [key, new Element(key)]));
    this.nodes.video.dialog = this;
  }
  querySelector(selector) { return this.nodes[selector]; }
  showModal() { this.open = true; }
  close() { this.open = false; this.closed = (this.closed || 0) + 1; }
  remove() { this.removed = true; this.isConnected = false; }
  getBoundingClientRect() { return { left: 10, top: 10, right: 300, bottom: 500 }; }
}

function browserHarness({ pendingDecode = false, mediaError = null } = {}) {
  const dialogs = [], media = [], decodes = [], photos = [], urls = [], revoked = [], launcher = new Element('button');
  const document = new Element('document'); document.activeElement = launcher; launcher.isConnected = true;
  document.body = { append(dialog) { dialogs.push(dialog); dialog.isConnected = true; } };
  document.createElement = tag => tag === 'dialog' ? new Dialog() : new Element(tag);
  const context = new Element('window');
  Object.assign(context, {
    document,
    navigator: { mediaDevices: { getUserMedia(constraints) {
      assert.equal(constraints.audio, false);
      const request = deferred(); media.push(request);
      if (mediaError) request.reject(Object.assign(Error(), { name: mediaError }));
      return request.promise;
    } } },
    URL: { createObjectURL(file) { const url = 'blob:barcode-' + (urls.length + 1); urls.push({ url, file }); return url; }, revokeObjectURL(url) { revoked.push(url); } },
    ZXingBrowser: { BrowserMultiFormatOneDReader: class {
      decodeFromStream(stream, video, callback) {
        video.srcObject = stream;
        const completion = deferred();
        const controls = { stops: 0, stop() { this.stops++; stream.getTracks().forEach(track => track.stop()); video.srcObject = null; } };
        const entry = { stream, video, callback, controls, completion }; decodes.push(entry);
        if (!pendingDecode) completion.resolve(controls);
        return completion.promise;
      }
      decodeFromImageUrl(url) { const read = deferred(); photos.push({ url, read }); return read.promise; }
    } }
  });
  context.window = context;
  vm.createContext(context); vm.runInContext(source('barcode.js'), context);
  return { scanner: context.GymBarcode, context, dialogs, media, decodes, photos, urls, revoked, launcher,
    stream(index = media.length - 1) {
      const track = { stops: 0, stop() { this.stops++; } };
      const stream = { getTracks: () => [track], track };
      media[index].resolve(stream); return stream;
    }
  };
}

test('native scan delegates to the iPhone bridge without a storage timeout or browser camera', async () => {
  const h = nativeHarness(), pending = h.scanner.scan();
  assert.equal(h.sent.length, 1); assert.equal(h.sent[0].action, 'scanBarcode'); assert.equal(h.timers.length, 0);
  await assert.rejects(h.scanner.scan(), /al geopend/);
  h.reply({ barcode: ' 5901234123457 ', format: 'ean_13' });
  assert.deepEqual(plain(await pending), { barcode: '5901234123457', format: 'ean_13' });
});

test('native cancellation and camera failures release the lock and permit a fresh scan', async () => {
  const h = nativeHarness();
  const cancelled = h.scanner.scan(); h.reply({ cancelled: true }); assert.deepEqual(plain(await cancelled), { cancelled: true });
  const denied = h.scanner.scan(); h.reply('Cameratoegang staat uit.', false); await assert.rejects(denied, /Cameratoegang/);
  const again = h.scanner.scan(); h.reply({ barcode: '12345670', format: 'ean_8' }); assert.equal((await again).barcode, '12345670');
});

test('malformed native responses and unsupported barcode text do not become product codes', async () => {
  const h = nativeHarness();
  for (const barcode of [undefined, '', '\u0000', 'x'.repeat(65)]) {
    const pending = h.scanner.scan(); h.reply({ barcode }); await assert.rejects(pending, /niet ondersteund/);
  }
  assert.equal(h.scanner.key('036000291452'), h.scanner.key('0036000291452'));
  assert.equal(h.scanner.normalize('01234567'), '01234567');
  assert.equal(h.scanner.normalize(' ABC-123 '), 'ABC-123');
});

test('camera detection completes once, stops tracks, closes the dialog, and restores launcher focus', async () => {
  const h = browserHarness(), pending = h.scanner.scan(), stream = h.stream();
  await tick(); const decode = h.decodes[0];
  decode.callback(result(), undefined, decode.controls); decode.callback(result('12345670'), undefined, decode.controls);
  assert.equal((await pending).barcode, '5901234123457');
  assert.ok(stream.track.stops >= 1); assert.equal(h.dialogs[0].closed, 1); assert.equal(h.dialogs[0].removed, true); assert.equal(h.launcher.focused, true);
});

test('unsupported detection leaves the camera running until a valid product barcode arrives', async () => {
  const h = browserHarness(), pending = h.scanner.scan(), stream = h.stream();
  await tick(); const decode = h.decodes[0];
  decode.callback(result('x'.repeat(65)), undefined, decode.controls);
  assert.equal(decode.controls.stops, 0); assert.equal(stream.track.stops, 0); assert.equal(h.dialogs[0].open, true);
  assert.match(h.dialogs[0].querySelector('.scanner-status').textContent, /niet ondersteund/);
  decode.callback(result(), undefined, decode.controls); assert.equal((await pending).barcode, '5901234123457');
});

test('cancelling during camera permission stops a late stream instead of starting a hidden scanner', async () => {
  const h = browserHarness(), pending = h.scanner.scan();
  h.dialogs[0].querySelector('.scanner-close').fire('click');
  assert.deepEqual(plain(await pending), { cancelled: true });
  const stream = h.stream(); await tick();
  assert.ok(stream.track.stops >= 1); assert.equal(h.decodes.length, 0);
});

test('Escape and backgrounding stop capture and resolve cancellation without changing any code', async () => {
  for (const event of ['escape', 'background']) {
    const h = browserHarness(), pending = h.scanner.scan(), stream = h.stream(); await tick();
    if (event === 'escape') assert.equal(h.dialogs[0].fire('cancel').prevented, true);
    else { h.context.document.hidden = true; h.context.document.fire('visibilitychange'); }
    assert.deepEqual(plain(await pending), { cancelled: true }); assert.ok(stream.track.stops >= 1);
    assert.equal(h.dialogs[0].closed, 1);
  }
});

test('a restarted camera uses a separate video so an old decoder cannot tear down the new feed', async () => {
  const h = browserHarness({ pendingDecode: true }), pending = h.scanner.scan(), oldStream = h.stream(); await tick();
  const old = h.decodes[0]; h.dialogs[0].querySelector('.scanner-retry').fire('click');
  const newStream = h.stream(); await tick(); const current = h.decodes[1];
  assert.notEqual(old.video, current.video);
  old.completion.resolve(old.controls); current.completion.resolve(current.controls); await tick();
  assert.ok(oldStream.track.stops >= 1); assert.equal(current.video.srcObject, newStream); assert.equal(newStream.track.stops, 0);
  old.callback(result('12345670'), undefined, old.controls);
  assert.equal(h.dialogs[0].open, true); assert.equal(current.video.srcObject, newStream);
  current.callback(result(), undefined, current.controls); assert.equal((await pending).barcode, '5901234123457');
});

test('camera denial keeps manual recovery visible and image fallback decodes only a temporary local blob', async () => {
  const h = browserHarness({ mediaError: 'NotAllowedError' }), pending = h.scanner.scan(); await tick();
  assert.match(h.dialogs[0].querySelector('.scanner-status').textContent, /cameratoegang/);
  const input = h.dialogs[0].querySelector('input'); input.files = [{ type: 'image/png', size: 1024 }]; input.value = 'selected'; input.fire('change');
  assert.equal(input.value, ''); assert.equal(h.photos[0].url, 'blob:barcode-1');
  h.photos[0].read.resolve(result()); assert.equal((await pending).barcode, '5901234123457'); await tick();
  assert.ok(h.revoked.includes('blob:barcode-1'));
});

test('bundled offline decoder reads an EAN-13 image and preserves its full value', () => {
  // A standards-encoded fixture for 5901234123457, independent of the app's
  // decoder. Render bars as RGBA pixels so this exercises luminance conversion
  // and the actual shipped ZXing decoder, without fetching any image or service.
  const left = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
  const even = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
  const parity = 'LGGLLG', digits = '901234';
  let bits = '101';
  for (let i = 0; i < digits.length; i++) bits += (parity[i] === 'L' ? left : even)[Number(digits[i])];
  bits += '01010';
  for (const digit of '123457') bits += [...left[Number(digit)]].map(bit => bit === '0' ? '1' : '0').join('');
  bits += '101'; assert.equal(bits.length, 95);
  const scale = 4, quiet = 12, width = (bits.length + quiet * 2) * scale, height = 120;
  const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 8; y < height - 8; y++) for (let x = 0; x < width; x++) {
    if (bits[Math.floor(x / scale) - quiet] !== '1') continue;
    const offset = (y * width + x) * 4; pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0;
  }
  const context = {}; context.window = context; vm.createContext(context);
  vm.runInContext(source('vendor/zxing-browser.min.js'), context, { filename: 'zxing-browser.min.js' });
  const canvas = { width, height, getContext: () => ({ getImageData: () => ({ data: pixels }) }) };
  const decoded = new context.ZXingBrowser.BrowserMultiFormatOneDReader().decodeFromCanvas(canvas);
  assert.equal(decoded.getText(), '5901234123457');
  assert.equal(decoded.getBarcodeFormat(), context.ZXingBrowser.BarcodeFormat.EAN_13);
});
