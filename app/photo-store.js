/* Photo bytes stay on this device. Native builds use the private app directory;
   the browser fallback uses an independent IndexedDB database, never localStorage. */
(function () {
  'use strict';
  let connection;
  const native = () => !!window.GymNative?.available;
  const checkedId = id => {
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw new Error('Ongeldige foto-ID.');
    return id;
  };
  function database() {
    if (connection) return connection;
    connection = new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('Lokale foto-opslag is niet beschikbaar.')); return; }
      const request = indexedDB.open('gym-photos', 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('photos')) request.result.createObjectStore('photos', { keyPath: 'id' });
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); connection = null; };
        resolve(db);
      };
      request.onerror = () => reject(request.error || new Error('Foto-opslag openen is mislukt.'));
      request.onblocked = () => reject(new Error('Sluit andere tabbladen van de app en probeer opnieuw.'));
    }).catch(error => { connection = null; throw error; });
    return connection;
  }
  async function transaction(mode, operation) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('photos', mode);
      const request = operation(tx.objectStore('photos'));
      let result;
      request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || request.error || new Error('Foto opslaan is mislukt.'));
      tx.onabort = () => reject(tx.error || new Error('Foto-opslag is afgebroken.'));
    });
  }
  function dataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Foto lezen is mislukt.'));
      reader.readAsDataURL(blob);
    });
  }
  window.GymPhotos = {
    async put(id, blob) {
      checkedId(id);
      if (!(blob instanceof Blob) || blob.type !== 'image/jpeg' || !blob.size) throw new Error('Kies een geldige foto.');
      if (native()) return window.GymNative.request('savePhoto', { id, dataUrl: await dataURL(blob) });
      await transaction('readwrite', store => store.put({ id, blob }));
      return { id };
    },
    async url(id) {
      checkedId(id);
      if (native()) return 'gym-photo://local/' + encodeURIComponent(id);
      const item = await transaction('readonly', store => store.get(id));
      if (!item?.blob) throw new Error('Deze foto is niet meer op dit toestel beschikbaar.');
      return URL.createObjectURL(item.blob);
    },
    async remove(id) {
      checkedId(id);
      if (native()) return window.GymNative.request('deletePhoto', { id });
      await transaction('readwrite', store => store.delete(id));
    },
    revoke(url) {
      if (typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url);
    }
  };
})();
