const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const Core = require('../app/core.js');
const storeSource = fs.readFileSync(path.join(__dirname, '../app/photo-store.js'), 'utf8');
const bodySource = fs.readFileSync(path.join(__dirname, '../app/body.js'), 'utf8');

class Reader {
  readAsDataURL(blob) {
    blob.arrayBuffer().then(buffer => { this.result = 'data:' + blob.type + ';base64,' + Buffer.from(buffer).toString('base64'); this.onload(); });
  }
}
function browserDB({ failWrite = false } = {}) {
  const records = new Map(); let created = false; let finishedWrites = 0;
  const db = {
    objectStoreNames: { contains: () => created }, createObjectStore() { created = true; }, close() {},
    transaction(name, mode) {
      assert.equal(name, 'photos');
      const tx = { objectStore() { return {
        put(value) { return request(() => records.set(value.id, value)); },
        get(id) { return request(() => records.get(id)); },
        delete(id) { return request(() => records.delete(id)); }
      }; } };
      function request(operation) {
        const req = {};
        queueMicrotask(() => {
          if (mode === 'readwrite' && failWrite) { tx.error = Object.assign(new Error('Storage full'), { name: 'QuotaExceededError' }); tx.onabort(); return; }
          req.result = operation(); req.onsuccess();
          queueMicrotask(() => { if (mode === 'readwrite') finishedWrites++; tx.oncomplete(); });
        });
        return req;
      }
      return tx;
    }
  };
  return { records, get finishedWrites() { return finishedWrites; }, open(name, version) {
    assert.equal(name, 'gym-photos'); assert.equal(version, 1);
    const req = { result: db };
    queueMicrotask(() => { if (!created) req.onupgradeneeded(); req.onsuccess(); });
    return req;
  } };
}
function storeContext(native, indexedDB = browserDB()) {
  const revoked = [], objectURLs = [];
  const context = { Blob, FileReader: Reader, URL: { createObjectURL(blob) { objectURLs.push(blob); return 'blob:photo-' + objectURLs.length; }, revokeObjectURL(url) { revoked.push(url); } }, indexedDB, GymNative: native };
  context.window = context; vm.createContext(context); vm.runInContext(storeSource, context);
  return { store: context.GymPhotos, revoked, objectURLs, db: indexedDB };
}

test('native photo bytes stay in the bridge; browser storage is never touched', async () => {
  const calls = [];
  const { store } = storeContext({ available: true, async request(action, payload) { calls.push({ action, payload }); return { id: payload.id }; } }, { open() { throw new Error('Should not use IndexedDB'); } });
  await store.put('photo_123', new Blob(['jpeg bytes'], { type: 'image/jpeg' }));
  assert.equal(calls[0].action, 'savePhoto');
  assert.equal(calls[0].payload.id, 'photo_123');
  assert.equal(calls[0].payload.dataUrl, 'data:image/jpeg;base64,' + Buffer.from('jpeg bytes').toString('base64'));
  assert.equal(await store.url('photo_123'), 'gym-photo://local/photo_123');
  await store.remove('photo_123'); assert.equal(calls[1].action, 'deletePhoto');
});
test('unsafe IDs and non-JPEG input fail before reaching native storage', async () => {
  let called = 0;
  const { store } = storeContext({ available: true, request() { called++; } });
  await assert.rejects(store.put('../state', new Blob(['a'], { type: 'image/jpeg' })), /ID/);
  await assert.rejects(store.put('valid', new Blob(['a'], { type: 'text/html' })), /foto/);
  await assert.rejects(store.url('id?request=remote'), /ID/);
  await assert.rejects(store.remove('a'.repeat(101)), /ID/);
  assert.equal(called, 0);
});
test('browser blob writes await transaction completion and can be read and removed', async () => {
  const { store, db, objectURLs } = storeContext({ available: false });
  const blob = new Blob(['local JPEG'], { type: 'image/jpeg' });
  await store.put('local-photo', blob);
  assert.equal(db.finishedWrites, 1);
  assert.equal(await store.url('local-photo'), 'blob:photo-1');
  assert.equal(objectURLs[0], blob);
  await store.remove('local-photo');
  assert.equal(db.records.size, 0);
  await assert.rejects(store.url('local-photo'), /niet meer/);
});
test('storage failures are propagated instead of pretending the photo was saved', async () => {
  const { store } = storeContext({ available: false }, browserDB({ failWrite: true }));
  await assert.rejects(store.put('full', new Blob(['bytes'], { type: 'image/jpeg' })), error => error.name === 'QuotaExceededError');
  const native = storeContext({ available: true, request: async () => { throw new Error('Disk is full'); } });
  await assert.rejects(native.store.put('full', new Blob(['bytes'], { type: 'image/jpeg' })), /Disk is full/);
});
test('only temporary browser URLs are revoked', () => {
  const { store, revoked } = storeContext({ available: false });
  store.revoke('blob:temporary'); store.revoke('gym-photo://local/photo'); store.revoke(undefined);
  assert.deepEqual(revoked, ['blob:temporary']);
});

function bodyContext() {
  const errors = [], messages = [], events = {}, photoBytes = new Map(), deletedPhotos = [];
  const G = { data: Core.initial(), ui: { page: 'measurement' }, pages: {}, actions: {}, forms: {}, afterRender: [], e: s => String(s), fmt: n => String(n), dateLabel: s => s, today: () => '2026-09-25', uid: Core.uid, icon: () => '', header: () => '', empty: () => '', button: () => '', navigate(page, params) { this.ui = { ...this.ui, ...params, page }; }, render() {}, toast: s => messages.push(s), formError: (form, text) => errors.push(text), confirm(title, text, callback) { return callback(); }, async commit(mutator) { const next = structuredClone(this.data); mutator(next); Core.validate(next); this.data = next; return true; } };
  class Form { constructor(form) { this.values = form.values; } get(key) { return this.values[key] ?? ''; } has(key) { return Object.hasOwn(this.values, key); } }
  const context = { Gym: G, GymNative: { available: false }, GymPhotos: { async put(id, blob) { photoBytes.set(id, blob); }, async remove(id) { deletedPhotos.push(id); photoBytes.delete(id); }, revoke() {} }, document: { addEventListener(type, listener) { events[type] = listener; }, createElement(tag) { assert.equal(tag, 'canvas'); return { getContext: () => ({ fillRect() {}, drawImage() {} }), toBlob: callback => callback(new Blob(['compressed'], { type: 'image/jpeg' })) }; }, querySelectorAll: () => [] }, createImageBitmap: async () => ({ width: 4000, height: 3000, close() {} }), FormData: Form, URL, Blob, Date, Number, Math };
  context.window = context; vm.createContext(context); vm.runInContext(bodySource, context);
  return { G, errors, messages, events, photoBytes, deletedPhotos };
}
test('weight records accept Dutch decimals, persist edits, and can be deleted without deleting photos', async () => {
  const { G } = bodyContext();
  await G.forms.saveMeasurement({ values: { weight: '78,4', height: '182', date: '2026-09-25', note: 'Ochtend' } });
  assert.equal(G.data.measurements.length, 1); assert.equal(G.data.measurements[0].weight, 78.4); assert.equal(G.data.profile.heightCm, 182);
  const id = G.data.measurements[0].id;
  await G.forms.saveMeasurement({ values: { id, weight: '78.2', height: '', date: '2026-09-24', note: 'Aangepast' } });
  assert.equal(G.data.measurements.length, 1); assert.equal(G.data.measurements[0].weight, 78.2); assert.equal(G.data.profile.heightCm, 182);
  G.data.photos.push({ id: 'progress', date: '2026-09-24', angle: 'Voorkant', weight: 78.2, note: '' });
  await G.actions.deleteMeasurement({ dataset: { id } });
  // G.actions returns void while the confirmation callback completes asynchronously.
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(G.data.measurements.length, 0); assert.equal(G.data.photos.length, 1);
});
test('invalid dates, future dates and nonnumeric weights do not mutate measurements', async () => {
  const { G, errors } = bodyContext();
  for (const values of [{ weight: '78', date: '2026-02-30' }, { weight: '78', date: '2026-09-26' }, { weight: '-1', date: '2026-09-25' }, { weight: '3kg', date: '2026-09-25' }]) await G.forms.saveMeasurement({ values });
  assert.equal(G.data.measurements.length, 0); assert.equal(errors.length, 4);
});

async function selectPhoto(harness, weight = '78,2') {
  const { G, events } = harness;
  G.ui.page = 'photoAdd'; G.pages.photoAdd();
  const elements = { date: { value: '2026-09-25' }, weight: { value: weight }, angle: { value: 'Voorkant' }, note: { value: 'Eigen foto' }, linkWeight: { checked: true } };
  const submit = { disabled: false, textContent: '' }, form = { elements, querySelector: () => submit };
  await events.change({ target: { id: 'photo-file', dataset: {}, files: [new Blob(['original'], { type: 'image/jpeg' })], closest: () => form } });
  return form;
}
test('photo saves only after local bytes; linking the same date and weight avoids duplicate measurements', async () => {
  const harness = bodyContext(), { G, photoBytes } = harness;
  G.data.measurements.push({ id: 'existing', date: '2026-09-25', weight: 78.2, note: '' });
  const form = await selectPhoto(harness);
  await G.forms.savePhoto(form);
  assert.equal(G.data.photos.length, 1); assert.equal(G.data.measurements.length, 1);
  assert.equal(photoBytes.size, 1); assert.equal(photoBytes.get(G.data.photos[0].id).type, 'image/jpeg');
  assert.equal(G.data.photos[0].weight, 78.2); assert.equal(G.ui.page, 'photoDetail');
});
test('failed metadata save removes newly stored photo bytes and retains no phantom gallery entry', async () => {
  const harness = bodyContext(), { G, photoBytes, deletedPhotos } = harness;
  const form = await selectPhoto(harness);
  G.commit = async () => false;
  await G.forms.savePhoto(form);
  assert.equal(G.data.photos.length, 0); assert.equal(photoBytes.size, 0); assert.equal(deletedPhotos.length, 1);
});
test('a rendering error after successful metadata persistence must not erase the associated photo', async () => {
  const harness = bodyContext(), { G, photoBytes, deletedPhotos } = harness;
  const form = await selectPhoto(harness);
  G.commit = async mutator => { mutator(G.data); return false; };
  await G.forms.savePhoto(form);
  assert.equal(G.data.photos.length, 1); assert.equal(photoBytes.size, 1); assert.equal(deletedPhotos.length, 0);
});
