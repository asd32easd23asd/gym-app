(function () {
  'use strict';
  const G = window.Gym;
  const angles = ['Voorkant', 'Zijkant', 'Achterkant', 'Overig'];
  let draft = null;
  let photoBusy = false;
  let renderGeneration = 0;
  let liveURLs = [];
  const e = value => G.e(String(value ?? ''));
  const parse = value => /^\d+(?:[.,]\d+)?$/.test(String(value).trim()) ? Number(String(value).trim().replace(',', '.')) : NaN;
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value + 'T12:00:00Z').getTime()) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value && value <= G.today();
  const weights = () => [...G.data.measurements].sort((a, b) => b.date.localeCompare(a.date));
  const photos = () => [...G.data.photos].sort((a, b) => b.date.localeCompare(a.date));
  const photo = id => G.data.photos.find(p => p.id === id);
  const weightLabel = value => value == null ? 'Geen gewicht gekoppeld' : G.fmt(value) + ' kg';
  const dateLabel = value => G.dateLabel(value);
  const localNote = () => `<aside class="photo-local-note">${G.icon('lock')}<span><strong>Je foto’s blijven privé.</strong><br>${window.GymNative?.available ? 'Alleen op deze iPhone bewaard. Nooit door deze app naar een server geüpload. Geen cloudback-up.' : 'Alleen in deze browser bewaard. Nooit naar een server geüpload. Browsergegevens wissen verwijdert ook je foto’s.'}</span></aside>`;
  const navButton = (text, page, params, className = 'secondary') => G.button(text, page, params || {}, className);
  const action = (text, name, attrs = '', className = 'secondary') => `<button type="button" class="${className}" data-action="${name}" ${attrs}>${text}</button>`;
  const fieldsError = '<p class="form-error" role="alert"></p>';
  const filtered = () => photos().filter(p => !G.ui.photoAngle || G.ui.photoAngle === 'Alle' || p.angle === G.ui.photoAngle);
  const angleChips = () => `<div class="chips" role="group" aria-label="Filter op aanzicht">${['Alle', ...angles].map(a => `<button type="button" class="chip ${(!G.ui.photoAngle ? a === 'Alle' : G.ui.photoAngle === a) ? 'active' : ''}" aria-pressed="${(!G.ui.photoAngle ? a === 'Alle' : G.ui.photoAngle === a)}" data-action="photoFilter" data-angle="${a}">${a}</button>`).join('')}</div>`;
  const image = p => `<div class="photo-frame"><img data-local-photo="${e(p.id)}" alt="Voortgangsfoto: ${e(p.angle)}, ${e(dateLabel(p.date))}" decoding="async"><span class="photo-load-status" role="status">Foto laden…</span></div>`;
  const tile = p => `<button type="button" class="photo-tile" data-action="openPhoto" data-id="${e(p.id)}" aria-label="Bekijk ${e(p.angle)} van ${e(dateLabel(p.date))}">${image(p)}<span class="photo-caption"><strong>${e(dateLabel(p.date))}</strong><span>${p.weight == null ? e(p.angle) : G.fmt(p.weight) + ' kg'}</span></span></button>`;
  function photoEmpty() { return G.empty('Je progressie in beeld', 'Voeg je eerste foto toe. Je foto’s blijven op je eigen toestel.', navButton('Foto toevoegen', 'photoAdd', {}, 'primary')); }
  function chart(items) {
    if (items.length < 2) return '<p class="muted">Na twee metingen zie je hier je gewichtsverloop.</p>';
    const sorted = [...items].reverse();
    const values = sorted.map(m => m.weight);
    const min = Math.min(...values), max = Math.max(...values), spread = Math.max(max - min, 1);
    const start = Date.parse(sorted[0].date), end = Date.parse(sorted.at(-1).date), span = Math.max(end - start, 86400000);
    const coords = sorted.map(m => [18 + (Date.parse(m.date) - start) / span * 284, 102 - (m.weight - min + (spread - (max - min)) / 2) / spread * 78]);
    return `<div class="weight-chart"><svg viewBox="0 0 320 130" role="img" aria-label="Gewichtsverloop van ${e(G.fmt(sorted[0].weight))} naar ${e(G.fmt(sorted.at(-1).weight))} kilogram"><path d="M18 112H302" fill="none" stroke="currentColor" opacity=".18"/><polyline points="${coords.map(c => c.join(',')).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${coords.map(c => `<circle cx="${c[0]}" cy="${c[1]}" r="3.5" fill="var(--accent)"/>`).join('')}</svg><div class="row"><span class="muted grow">${e(dateLabel(sorted[0].date))}</span><span class="muted">${e(dateLabel(sorted.at(-1).date))}</span></div></div>`;
  }
  G.pages.body = () => {
    const list = weights(), latest = list[0], first = list.at(-1), delta = latest && first ? latest.weight - first.weight : 0;
    const recent = photos().slice(0, 2);
    return G.header('YOUR PROGRESS', 'Gewicht', 'stats') + `<div class="panel"><span class="eyebrow">${latest ? 'LAATSTE METING · ' + e(dateLabel(latest.date)) : 'JOUW STARTPUNT'}</span><div class="big">${latest ? G.fmt(latest.weight) : '—'} <small>kg</small></div>${list.length > 1 ? `<p class="muted">${delta > 0 ? '+' : ''}${G.fmt(delta)} kg sinds ${e(dateLabel(first.date))}</p>` : '<p class="muted">Volg je gewicht op je eigen tempo.</p>'}${navButton('Gewicht toevoegen', 'measurement', { measurementId: '' }, 'primary')}</div><div class="section-head"><h2>Gewichtsverloop</h2><span class="muted">${list.length} metingen</span></div>${chart(list)}<div class="section-head"><h2>Voortgangsfoto’s</h2>${navButton('Alle foto’s', 'photos', {}, 'text-button')}</div>${localNote()}${recent.length ? `<div class="photo-grid">${recent.map(tile).join('')}</div>${navButton('Foto toevoegen', 'photoAdd')}` : photoEmpty()}${list.length ? `<div class="section-head"><h2>Metingen</h2></div><div class="panel">${list.map(m => `<div class="row"><div class="grow"><strong>${e(dateLabel(m.date))}</strong>${m.note ? `<p class="muted">${e(m.note)}</p>` : ''}</div><strong>${G.fmt(m.weight)} kg</strong>${navButton('Wijzig', 'measurement', { measurementId: m.id }, 'text-button')}</div>`).join('')}</div>` : ''}${G.data.profile.heightCm ? `<p class="muted">Lengte: ${G.fmt(G.data.profile.heightCm)} cm</p>` : ''}`;
  };
  G.pages.measurement = () => {
    const m = G.data.measurements.find(item => item.id === G.ui.measurementId);
    return G.header('GEWICHT', m ? 'Meting wijzigen' : 'Nieuwe meting', 'body') + `<form data-form="saveMeasurement" class="fields"><input type="hidden" name="id" value="${e(m?.id || '')}"><div class="pair"><label>Gewicht (kg)<input name="weight" inputmode="decimal" autocomplete="off" value="${e(m?.weight == null ? '' : String(m.weight).replace('.', ','))}" placeholder="Bijv. 78,4" required></label><label>Datum<input name="date" type="date" value="${e(m?.date || G.today())}" max="${G.today()}" required></label></div><label>Lengte (cm) · optioneel<input name="height" inputmode="decimal" value="${e(G.data.profile.heightCm ?? '')}" placeholder="Bijv. 182"></label><label>Notitie · optioneel<textarea name="note" maxlength="300" placeholder="Bijv. ochtendmeting">${e(m?.note || '')}</textarea></label><label class="row"><input type="checkbox" name="addPhoto"><span class="grow">Hierna een voortgangsfoto toevoegen</span></label>${fieldsError}<button class="primary" type="submit">Meting bewaren</button></form>${m ? action('Meting verwijderen', 'deleteMeasurement', `data-id="${e(m.id)}"`, 'danger') : ''}`;
  };
  G.pages.photos = () => G.header('ALLEEN VOOR JOU', 'Voortgangsfoto’s', 'body') + localNote() + angleChips() + `<div class="section-head"><span class="muted">${filtered().length} foto’s</span>${filtered().length >= 2 ? navButton('Vergelijken', 'photoCompare', {}, 'text-button') : ''}</div>` + (filtered().length ? `<div class="photo-grid">${filtered().map(tile).join('')}</div>` + navButton('Foto toevoegen', 'photoAdd', {}, 'primary') : photoEmpty());
  function freshDraft(overrides = {}) { return { blob: null, url: '', date: G.today(), weight: '', angle: G.ui.photoAngle && G.ui.photoAngle !== 'Alle' ? G.ui.photoAngle : 'Voorkant', note: '', linkWeight: true, ...overrides }; }
  function discardDraft() { if (draft?.url) URL.revokeObjectURL(draft.url); draft = null; }
  function captureDraft(form) {
    if (!form || !draft) return;
    ['date', 'weight', 'angle', 'note'].forEach(key => { if (form.elements[key]) draft[key] = form.elements[key].value; });
    draft.linkWeight = !!form.elements.linkWeight?.checked;
  }
  G.pages.photoAdd = () => {
    if (!draft) draft = freshDraft();
    return G.header('ALLEEN OP JE TOESTEL', 'Foto toevoegen', 'photos') + localNote() + `<form class="fields" data-form="savePhoto"><div class="photo-picker">${draft.url ? `<div class="photo-focus"><div class="photo-frame"><img src="${e(draft.url)}" alt="Geselecteerde foto"></div></div>` : '<div class="empty"><p>Kies een foto of maak er een met je camera.</p></div>'}<div class="pair">${action(draft.url ? 'Andere foto' : 'Uit foto’s kiezen', 'choosePhoto', 'data-source="gallery"')}${action('Foto maken', 'choosePhoto', 'data-source="camera"')}</div><input id="photo-file" type="file" accept="image/*" hidden><input id="photo-camera" type="file" accept="image/*" capture="environment" hidden></div><div class="pair"><label>Datum<input name="date" type="date" value="${e(draft.date)}" max="${G.today()}" required></label><label>Gewicht (kg) · optioneel<input name="weight" inputmode="decimal" value="${e(draft.weight)}" placeholder="Bijv. 78,4"></label></div><label>Aanzicht<select name="angle">${angles.map(a => `<option ${a === draft.angle ? 'selected' : ''}>${a}</option>`).join('')}</select></label><label>Notitie · optioneel<textarea name="note" maxlength="300" placeholder="Bijv. zelfde houding en licht">${e(draft.note)}</textarea></label><label class="row"><input name="linkWeight" type="checkbox" ${draft.linkWeight ? 'checked' : ''}><span class="grow">Ingevuld gewicht ook als meting bewaren</span></label>${fieldsError}<button class="primary" type="submit" ${draft.blob && !photoBusy ? '' : 'disabled'}>${photoBusy ? 'Foto verwerken…' : 'Foto bewaren'}</button><p class="muted">De foto wordt op dit toestel verkleind om opslagruimte te besparen.</p></form>`;
  };
  G.pages.photoDetail = () => {
    const p = photo(G.ui.photoId);
    if (!p) return G.header('FOTO’S', 'Foto niet gevonden', 'photos') + photoEmpty();
    return G.header('VOORTGANGSFOTO', dateLabel(p.date), 'photos') + localNote() + `<div class="photo-focus">${image(p)}</div><div class="compare-summary"><span>${e(p.angle)}</span><strong>${e(weightLabel(p.weight))}</strong></div>${p.note ? `<p>${e(p.note)}</p>` : ''}${photos().filter(item => item.angle === p.angle).length > 1 ? action('Foto’s vergelijken', 'comparePhoto', `data-id="${e(p.id)}"`) : ''}${action('Foto verwijderen', 'deletePhoto', `data-id="${e(p.id)}"`, 'danger')}`;
  };
  function comparison() {
    const list = filtered();
    let left = list.find(p => p.id === G.ui.photoBefore), right = list.find(p => p.id === G.ui.photoAfter);
    if (!right) right = list[0];
    if (!left || left.id === right?.id) left = [...list].reverse().find(p => p.id !== right?.id);
    G.ui.photoBefore = left?.id || ''; G.ui.photoAfter = right?.id || '';
    return { list, left, right };
  }
  G.pages.photoCompare = () => {
    const { list, left, right } = comparison();
    const select = (label, key, selected) => `<label>${label}<select data-photo-compare="${key}" aria-label="${label}">${list.map(p => `<option value="${e(p.id)}" ${selected.id === p.id ? 'selected' : ''}>${e(dateLabel(p.date))} · ${e(p.angle)}${p.weight == null ? '' : ' · ' + G.fmt(p.weight) + ' kg'}</option>`).join('')}</select></label>`;
    return G.header('JOUW PROGRESSIE', 'Foto’s vergelijken', 'photos') + angleChips() + (!left || !right ? G.empty('Nog twee foto’s nodig', 'Voeg twee foto’s met hetzelfde aanzicht toe om te vergelijken.', navButton('Foto toevoegen', 'photoAdd', {}, 'primary')) : `<div class="pair fields">${select('Foto links', 'photoBefore', left)}${select('Foto rechts', 'photoAfter', right)}</div><div class="photo-grid">${tile(left)}${tile(right)}</div>${left.weight != null && right.weight != null ? `<div class="compare-summary"><span>Verschil rechts − links</span><strong>${right.weight - left.weight > 0 ? '+' : ''}${G.fmt(right.weight - left.weight)} kg</strong></div>` : ''}<p class="muted">Dezelfde houding, afstand en hetzelfde licht maken vergelijken makkelijker.</p>`) + localNote();
  };
  G.forms.saveMeasurement = async form => {
    const input = new FormData(form), weight = parse(input.get('weight')), heightText = String(input.get('height')).trim(), height = heightText ? parse(heightText) : null, date = String(input.get('date')), id = String(input.get('id')) || G.uid();
    if (!Number.isFinite(weight) || weight <= 0 || weight > 1000) return G.formError(form, 'Vul een gewicht tussen 0 en 1.000 kg in.');
    if (!validDate(date)) return G.formError(form, 'Kies een geldige datum, uiterlijk vandaag.');
    if (heightText && (!Number.isFinite(height) || height < 50 || height > 300)) return G.formError(form, 'Vul een lengte tussen 50 en 300 cm in.');
    const addPhoto = input.has('addPhoto');
    if (await G.commit(data => {
      const existing = data.measurements.find(m => m.id === id);
      const values = { id, weight, date, note: String(input.get('note')).trim().slice(0, 300) };
      if (existing) Object.assign(existing, values); else data.measurements.unshift(values);
      if (height != null) data.profile.heightCm = height;
    })) {
      if (addPhoto) { discardDraft(); draft = freshDraft({ date, weight: String(weight).replace('.', ','), linkWeight: false }); G.navigate('photoAdd'); }
      else G.navigate('body');
      G.toast('Meting bewaard op dit toestel.');
    }
  };
  G.actions.deleteMeasurement = element => {
    const m = G.data.measurements.find(item => item.id === element.dataset.id);
    if (!m) return;
    G.confirm('Meting verwijderen?', 'Deze meting verdwijnt uit je gewichtsverloop. Je foto’s blijven bewaard.', async () => { if (await G.commit(data => { data.measurements = data.measurements.filter(item => item.id !== m.id); })) { G.navigate('body'); G.toast('Meting verwijderd.'); } });
  };
  G.actions.photoFilter = element => { G.ui.photoAngle = element.dataset.angle; G.render(); };
  G.actions.openPhoto = element => G.navigate('photoDetail', { photoId: element.dataset.id });
  G.actions.comparePhoto = element => {
    const p = photo(element.dataset.id); if (!p) return;
    G.navigate('photoCompare', { photoAngle: p.angle, photoAfter: p.id, photoBefore: '' });
  };
  G.actions.choosePhoto = element => {
    if (photoBusy) return;
    captureDraft(element.closest('form'));
    document.getElementById(element.dataset.source === 'camera' ? 'photo-camera' : 'photo-file')?.click();
  };
  async function compress(file) {
    if (!file || !file.size) throw new Error('Kies een foto met inhoud.');
    if (file.size > 60 * 1024 * 1024) throw new Error('Deze foto is groter dan 60 MB. Kies een kleiner bestand.');
    let drawable, imageURL;
    try {
      if (typeof createImageBitmap === 'function') {
        try { drawable = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (_) { /* WebKit can decode some formats through an image element instead. */ }
      }
      if (!drawable) {
        imageURL = URL.createObjectURL(file);
        drawable = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('Dit fotoformaat kan niet worden geopend. Kies een JPEG- of PNG-foto.')); img.src = imageURL; });
      }
      const w = drawable.width || drawable.naturalWidth, h = drawable.height || drawable.naturalHeight;
      if (!w || !h) throw new Error('Deze foto kan niet worden gelezen.');
      const scale = Math.min(1, 1600 / Math.max(w, h));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(w * scale)); canvas.height = Math.max(1, Math.round(h * scale));
      const context = canvas.getContext('2d'); if (!context) throw new Error('De foto kan niet worden verwerkt.');
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(drawable, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .85));
      canvas.width = canvas.height = 1;
      if (!blob) throw new Error('De foto kon niet worden verkleind. Probeer een andere foto.');
      return blob;
    } finally { drawable?.close?.(); if (imageURL) URL.revokeObjectURL(imageURL); }
  }
  document.addEventListener('change', async event => {
    const field = event.target;
    if (!field.closest?.('#app')) return;
    if (field.dataset.photoCompare) {
      const key = field.dataset.photoCompare, other = key === 'photoBefore' ? 'photoAfter' : 'photoBefore', old = G.ui[key];
      G.ui[key] = field.value; if (G.ui[other] === field.value) G.ui[other] = old; G.render(); return;
    }
    if (!['photo-file', 'photo-camera'].includes(field.id) || !field.files?.[0] || photoBusy) return;
    captureDraft(field.closest('form'));
    const selectedDraft = draft, file = field.files[0];
    photoBusy = true; G.render();
    try {
      const blob = await compress(file);
      if (draft !== selectedDraft || G.ui.page !== 'photoAdd') return;
      if (draft.url) URL.revokeObjectURL(draft.url);
      draft.blob = blob; draft.url = URL.createObjectURL(blob);
    } catch (error) { G.toast(error.message || 'De foto kan niet worden geopend.'); }
    finally { photoBusy = false; G.render(); }
  });
  G.forms.savePhoto = async form => {
    if (!draft?.blob || photoBusy) return;
    captureDraft(form);
    const d = draft, weight = d.weight.trim() ? parse(d.weight) : null;
    if (!validDate(d.date)) return G.formError(form, 'Kies een geldige datum, uiterlijk vandaag.');
    if (weight != null && (!Number.isFinite(weight) || weight <= 0 || weight > 1000)) return G.formError(form, 'Vul een geldig gewicht in of laat het veld leeg.');
    if (!angles.includes(d.angle)) return G.formError(form, 'Kies een aanzicht.');
    const id = G.uid(); photoBusy = true;
    const submit = form.querySelector('[type="submit"]'); if (submit) { submit.disabled = true; submit.textContent = 'Bewaren…'; }
    let stored = false;
    try {
      await window.GymPhotos.put(id, d.blob); stored = true;
      const saved = await G.commit(data => {
        data.photos.unshift({ id, date: d.date, weight, angle: d.angle, note: d.note.trim().slice(0, 300) });
        if (d.linkWeight && weight != null && !data.measurements.some(m => m.date === d.date && Math.abs(m.weight - weight) < .000001)) data.measurements.unshift({ id: G.uid(), date: d.date, weight, note: 'Toegevoegd bij voortgangsfoto' });
      });
      if (!saved && !G.data.photos.some(p => p.id === id)) { await window.GymPhotos.remove(id); stored = false; return; }
      stored = false; discardDraft(); G.navigate('photoDetail', { photoId: id }); G.toast('Foto bewaard op dit toestel.');
    } catch (error) {
      if (stored && !G.data.photos.some(p => p.id === id)) await window.GymPhotos.remove(id).catch(() => {});
      G.toast(error.name === 'QuotaExceededError' ? 'De lokale opslag is vol. Maak ruimte vrij en probeer opnieuw.' : error.message || 'Foto bewaren is mislukt. Probeer opnieuw.');
    } finally { photoBusy = false; G.render(); }
  };
  G.actions.deletePhoto = element => {
    const p = photo(element.dataset.id); if (!p) return;
    G.confirm('Foto verwijderen?', 'Deze foto wordt definitief van dit toestel verwijderd. Een gekoppelde gewichtsmeting blijft bewaard.', async () => {
      const saved = await G.commit(data => { data.photos = data.photos.filter(item => item.id !== p.id); });
      if (!saved && G.data.photos.some(item => item.id === p.id)) return;
      try { await window.GymPhotos.remove(p.id); G.navigate('photos'); G.toast('Foto verwijderd van dit toestel.'); }
      catch (_) {
        await G.commit(data => { if (!data.photos.some(item => item.id === p.id)) data.photos.unshift(p); });
        G.toast('De foto kon niet worden verwijderd. Probeer opnieuw.');
      }
    });
  };
  G.afterRender.push(() => {
    const generation = ++renderGeneration;
    liveURLs.forEach(url => window.GymPhotos.revoke(url)); liveURLs = [];
    if (G.ui.page !== 'photoAdd' && !photoBusy) discardDraft();
    document.querySelectorAll('#app img[data-local-photo]').forEach(async img => {
      const status = img.parentElement.querySelector('.photo-load-status');
      try {
        const url = await window.GymPhotos.url(img.dataset.localPhoto);
        if (generation !== renderGeneration || !img.isConnected) { window.GymPhotos.revoke(url); return; }
        liveURLs.push(url);
        img.onload = () => { if (status) status.hidden = true; };
        img.onerror = () => { if (status) status.textContent = 'Foto niet beschikbaar op dit toestel.'; img.hidden = true; };
        img.src = url;
      } catch (_) { if (status && img.isConnected) status.textContent = 'Foto niet beschikbaar op dit toestel.'; img.hidden = true; }
    });
  });
})();
