(function () {
  'use strict';
  const G = window.Gym, M = window.GymProducts;
  if (!G || !M) throw new Error('Productmodel moet voor products.js geladen zijn.');
  const e = G.e, fmt = G.fmt;
  const option = (value, label, selected) => '<option value="' + e(value) + '"' + (value === selected ? ' selected' : '') + '>' + e(label) + '</option>';
  const options = (selected, product, allowed) => (allowed || Object.keys(M.UNITS)).map(key => option(key, key === 'custom' ? ((product && product.customLabel) || 'Eigen eenheid') : M.UNITS[key].label + ' (' + M.UNITS[key].short + ')', selected)).join('');
  const shortOptions = (selected, product) => M.availableUnits(product).map(key => option(key, M.unitLabel(key, product), selected)).join('');
  const action = (name, text, id, cls = 'secondary', extra = '') => '<button type="button" class="' + cls + '" data-action="' + name + '" data-id="' + e(id || '') + '" ' + extra + '>' + text + '</button>';
  const field = (label, name, value, extra = '', type = 'text') => '<label>' + e(label) + '<input type="' + type + '" name="' + e(name) + '" value="' + e(value == null ? '' : value) + '" ' + extra + '></label>';
  const errorSlot = '<p class="form-error" role="alert" aria-live="polite"></p>';
  const quantity = (value, unit, product) => fmt(value) + ' ' + M.unitLabel(unit, product);
  const product = () => G.data.products.find(item => item.id === G.ui.productId);
  const productEmpty = () => G.empty('Product niet gevonden', 'Dit product is niet meer beschikbaar.', G.button('Naar je voorraad', 'inventory'));
  const clone = item => JSON.parse(JSON.stringify(item));
  const error = (form, message) => {
    if (G.formError) G.formError(form, message);
    else { const slot = form.querySelector('.form-error'); if (slot) slot.textContent = message; }
  };
  function nowTime() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function draftFor(p) {
    return p ? clone(p) : { id: '', name: '', detail: '', barcode: '', base: 'g', entryUnit: 'g', stock: '', total: '', ratios: {}, customLabel: '', defaultAmount: 1 };
  }
  function readProductForm(form) {
    const draft = G.ui.productDraft;
    for (const name of ['name', 'detail', 'barcode', 'stock', 'total', 'customLabel', 'defaultAmount']) {
      if (form.elements[name]) draft[name] = form.elements[name].value;
    }
    for (const input of form.querySelectorAll('[data-ratio]')) draft.ratios[input.dataset.ratio] = input.value;
    return draft;
  }
  function logDraft(p) {
    if (!G.ui.usageDraft || G.ui.usageDraft.productId !== p.id) G.ui.usageDraft = { productId: p.id, enteredUnit: p.entryUnit, enteredAmount: String(p.defaultAmount || 1), date: G.today(), time: nowTime(), note: '' };
    return G.ui.usageDraft;
  }
  function readUsageForm(form) {
    const draft = G.ui.usageDraft;
    for (const name of ['enteredAmount', 'date', 'time', 'note']) if (form.elements[name]) draft[name] = form.elements[name].value;
    return draft;
  }
  function rows(history, p, allowDelete) {
    return history.map(item => '<div class="row"><div class="grow"><strong>' + e(quantity(item.enteredAmount, item.enteredUnit, p)) + '</strong><p class="muted">' + e(G.dateLabel(item.date)) + ' · ' + e(item.time) + (item.enteredUnit !== item.base ? ' · ' + e(quantity(item.amount, item.base, p)) : '') + '</p>' + (item.note ? '<p>' + e(item.note) + '</p>' : '') + '</div>' + (allowDelete ? action('usage-delete', G.icon('trash-2'), item.id, 'icon-button danger', 'aria-label="Registratie verwijderen"') : '') + '</div>').join('');
  }

  G.pages.inventory = function () {
    const list = G.data.products;
    return G.header('DAILY STACK', 'Voorraad') + (list.length ? '<div class="section-head"><p class="muted">' + list.length + ' ' + (list.length === 1 ? 'product' : 'producten') + '</p>' + action('product-new', G.icon('plus') + ' Toevoegen', '', 'secondary') + '</div><div class="list">' + list.map(p => '<div class="row"><button type="button" class="row-open grow" data-action="product-open" data-id="' + e(p.id) + '"><span><strong>' + e(p.name) + '</strong><span class="muted">' + e(quantity(p.stock, p.base, p)) + ' over' + (p.detail ? ' · ' + e(p.detail) : '') + '</span></span>' + G.icon('chevron-right') + '</button>' + action('usage-new', G.icon('plus'), p.id, 'icon-button', 'aria-label="Gebruik van ' + e(p.name) + ' invoeren"') + '</div>').join('') + '</div><p class="notice">Je voorraad volgt je geregistreerde gebruik. Vergeten invoer kun je later toevoegen.</p>' : G.empty('Je eigen stack.', 'Voeg je eerste product toe. Jij kiest de eenheid: gram, milligram, milliliter, scoop of een eigen maat.', action('product-new', 'Product toevoegen', '', 'primary')));
  };
  G.pages.products = G.pages.inventory;

  G.pages.product = function () {
    const p = product(); if (!p) return productEmpty();
    const month = G.today().slice(0, 7) + '-01', stats = M.stats(G.data, p.id, month, G.today()), history = M.stats(G.data, p.id).history;
    const percentage = p.total > 0 ? Math.max(0, Math.min(100, p.stock / p.total * 100)) : 0;
    const saved = G.data.usages.find(item => item.id === G.ui.lastUsageId && item.productId === p.id);
    return G.header('JOUW PRODUCT', p.name, 'inventory') + (p.detail ? '<p class="muted">' + e(p.detail) + '</p>' : '') + (saved ? '<div class="notice">' + e(quantity(saved.enteredAmount, saved.enteredUnit, p)) + ' geregistreerd. ' + action('usage-undo', 'Ongedaan maken', saved.id, 'text-button') + '</div>' : '') + '<section class="panel"><span class="eyebrow">OP VOORRAAD</span><div class="big">' + e(fmt(p.stock)) + ' <small>' + e(M.unitLabel(p.base, p)) + '</small></div><div class="track"><i style="width:' + percentage + '%"></i></div>' + (p.entryUnit !== p.base ? '<p class="muted">Ongeveer ' + e(quantity(M.convert(p, p.stock, p.base, p.entryUnit), p.entryUnit, p)) + '</p>' : '') + action('usage-new', G.icon('plus') + ' Gebruik invoeren', p.id, 'primary') + '</section><div class="pair"><div class="panel"><span class="eyebrow">DEZE MAAND</span><h2>' + e(quantity(stats.total, p.base, p)) + '</h2><p class="muted">' + stats.count + ' registraties</p></div><div class="panel"><span class="eyebrow">JOUW INVOER</span><h2>' + e(M.unitLabel(p.entryUnit, p)) + '</h2><p class="muted">1 ' + e(M.unitLabel(p.entryUnit, p)) + ' = ' + e(quantity(M.rate(p, p.entryUnit), p.base, p)) + '</p></div></div><details class="panel"><summary>Voorraad bijvullen</summary><form data-form="product-refill" data-id="' + e(p.id) + '"><div class="fields pair">' + field('Hoeveel toevoegen?', 'amount', '', 'inputmode="decimal" required placeholder="0"') + '<label>Eenheid<select name="unit">' + options(p.base, p, M.availableUnits(p)) + '</select></label></div>' + errorSlot + '<button class="primary" type="submit">Voorraad aanvullen</button></form></details><div class="section-head"><h2>Recent gebruik</h2>' + G.button('Alles', 'usageHistory', { productId: p.id }, 'text-button') + '</div><div class="list">' + (history.length ? rows(history.slice(0, 5), p, false) : '<p class="muted">Je hebt nog geen gebruik geregistreerd.</p>') + '</div>' + action('product-edit', 'Product & eenheden aanpassen', p.id, 'secondary') + (p.barcode ? '<p class="notice">Barcode: ' + e(p.barcode) + '</p>' : '');
  };

  G.pages.productEdit = function () {
    if (!G.ui.productDraft) G.ui.productDraft = draftFor(product());
    const d = G.ui.productDraft, existing = G.data.products.find(p => p.id === d.id), hasUsage = !!existing && G.data.usages.some(item => item.productId === d.id);
    const ratioKeys = Object.keys(d.ratios || {}).filter(key => M.fixedRate(key, d.base) === null);
    let r = null; try { r = M.rate(d, d.entryUnit); } catch (_) {}
    if (r === null && !ratioKeys.includes(d.entryUnit)) ratioKeys.push(d.entryUnit);
    const custom = d.base === 'custom' || d.entryUnit === 'custom' || ratioKeys.includes('custom');
    return G.header(existing ? 'JOUW INSTELLINGEN' : 'DAILY STACK', existing ? 'Product aanpassen' : 'Nieuw product', existing ? 'product' : 'inventory') + '<form data-form="product-save" id="product-form" novalidate><div class="fields">' + field('Productnaam', 'name', d.name, 'maxlength="80" required autocomplete="off" placeholder="Bijvoorbeeld: creatine"') + field('Omschrijving · optioneel', 'detail', d.detail, 'maxlength="160" placeholder="Merk of variant"') + '<label>Voorraad bijhouden in<select name="base" id="product-base"' + (hasUsage ? ' disabled' : '') + '>' + options(d.base, d) + '</select></label>' + (hasUsage ? '<p class="notice">De voorraadeenheid staat vast vanwege je bestaande gebruiksgeschiedenis.</p>' : '') + (d.unitNotice ? '<p class="notice">' + e(d.unitNotice) + '</p>' : '') + '<div class="pair">' + field('Inhoud (' + M.unitLabel(d.base, d) + ')', 'total', d.total, 'inputmode="decimal" required placeholder="0"') + field('Nog over (' + M.unitLabel(d.base, d) + ')', 'stock', d.stock, 'inputmode="decimal" required placeholder="0"') + '</div><label>Gebruik invoeren in<select name="entryUnit" id="product-entry-unit">' + options(d.entryUnit, d) + '</select></label>' + (custom ? field('Naam van je eigen eenheid', 'customLabel', d.customLabel, 'maxlength="24" required placeholder="Bijvoorbeeld: portie"') : '') + '</div>' + (ratioKeys.length ? '<section class="panel"><h2>Jouw omrekening</h2><p class="muted">Vul de verhouding van jouw product in. Tussen gewicht en volume bestaat geen vaste omrekening.</p><div class="fields">' + ratioKeys.map(key => '<label>1 ' + e(M.unitLabel(key, d)) + ' = hoeveel ' + e(M.unitLabel(d.base, d)) + '?<input inputmode="decimal" data-ratio="' + e(key) + '" value="' + e(d.ratios[key] == null ? '' : d.ratios[key]) + '" placeholder="Omrekening" aria-label="' + e(M.unitLabel(d.base, d) + ' per ' + M.unitLabel(key, d)) + '"></label>').join('') + '</div></section>' : '<p class="notice">' + (d.base === d.entryUnit ? 'Voorraad en gebruik hebben dezelfde eenheid.' : '1 ' + e(M.unitLabel(d.entryUnit, d)) + ' = ' + e(quantity(r, d.base, d)) + '.') + '</p>') + '<div class="fields">' + field('Gebruikelijke hoeveelheid (' + M.unitLabel(d.entryUnit, d) + ')', 'defaultAmount', d.defaultAmount, 'inputmode="decimal" required') + field('Barcode · handmatig, optioneel', 'barcode', d.barcode, 'maxlength="64" autocomplete="off" placeholder="Nummer onder de barcode"') + '</div><p class="notice">Een barcode wordt hier opgeslagen als herkenning van je product. Productinformatie vul je zelf in.</p>' + errorSlot + '<button type="submit" class="primary">' + (existing ? 'Wijzigingen opslaan' : 'Product toevoegen') + '</button></form>' + (existing ? action('product-delete', 'Product verwijderen', existing.id, 'secondary danger') : '');
  };

  G.pages.usage = function () {
    const p = product(); if (!p) return productEmpty();
    const d = logDraft(p), available = M.availableUnits(p);
    if (!available.includes(d.enteredUnit)) { d.enteredUnit = p.entryUnit; d.enteredAmount = String(p.defaultAmount || 1); }
    let usual = p.defaultAmount || 1; try { usual = M.convert(p, usual, p.entryUnit, d.enteredUnit); } catch (_) {}
    return G.header('JOUW LOGBOEK', 'Gebruik invoeren', 'product') + '<form data-form="usage-save" id="usage-form" novalidate><div class="fields"><label>Product<select id="usage-product" name="productId">' + G.data.products.map(item => option(item.id, item.name, p.id)).join('') + '</select></label></div><section class="panel amount-panel"><div class="split"><label for="usage-amount" class="eyebrow">HOEVEELHEID</label><select name="enteredUnit" id="usage-unit" class="unit-select" aria-label="Eenheid">' + shortOptions(d.enteredUnit, p) + '</select></div><div class="amount-stepper">' + action('usage-step', G.icon('minus'), '-1', 'icon-button', 'aria-label="Hoeveelheid verlagen"') + '<input name="enteredAmount" id="usage-amount" inputmode="decimal" autocomplete="off" value="' + e(d.enteredAmount) + '" aria-describedby="usage-conversion usage-error" aria-label="Hoeveelheid in ' + e(M.unitLabel(d.enteredUnit, p)) + '">' + action('usage-step', G.icon('plus'), '1', 'icon-button', 'aria-label="Hoeveelheid verhogen"') + '</div><p class="notice" id="usage-conversion"></p><div class="chips amount-presets">' + [usual / 2, usual, usual * 1.5].map(n => action('usage-preset', e(quantity(n, d.enteredUnit, p)), n, 'chip')).join('') + '</div></section><div class="panel"><span class="eyebrow">VOORRAAD DAARNA</span><h2 id="usage-remaining">' + e(quantity(p.stock, p.base, p)) + '</h2><p class="muted">Nu: ' + e(quantity(p.stock, p.base, p)) + '</p></div><div class="fields pair">' + field('Datum', 'date', d.date, 'required', 'date') + field('Tijd', 'time', d.time, 'required', 'time') + '</div><details class="panel"><summary>Notitie toevoegen · optioneel</summary><div class="fields"><label>Notitie<textarea name="note" maxlength="1000" placeholder="Jouw notitie">' + e(d.note) + '</textarea></label></div></details><p class="form-error" id="usage-error" role="alert" aria-live="polite"></p><button class="primary" type="submit" id="usage-submit">Gebruik registreren</button></form>' + action('product-edit', 'Eenheden instellen', p.id, 'text-button');
  };

  G.pages.usageHistory = function () {
    const p = product(); if (!p) return productEmpty();
    const stats = M.stats(G.data, p.id);
    return G.header(p.name, 'Gebruiksgeschiedenis', 'product') + (stats.count ? '<div class="pair"><div class="panel"><span class="eyebrow">TOTAAL GEBRUIKT</span><h2>' + e(quantity(stats.total, p.base, p)) + '</h2></div><div class="panel"><span class="eyebrow">REGISTRATIES</span><h2>' + stats.count + '</h2></div></div><div class="list">' + rows(stats.history, p, true) + '</div><p class="notice">Bij het verwijderen van een registratie komt die hoeveelheid terug in je voorraad.</p>' : G.empty('Je logboek begint hier.', 'Registreer je eerste gebruik om je verbruik te zien.', action('usage-new', 'Gebruik invoeren', p.id, 'primary')));
  };

  G.pages.productStats = function () {
    const selected = /^\d{4}-(?:0[1-9]|1[0-2])$/.test(G.ui.productStatsMonth || '') ? G.ui.productStatsMonth : G.today().slice(0, 7);
    const from = selected + '-01', parts = selected.split('-').map(Number), to = new Date(Date.UTC(parts[0], parts[1], 0)).toISOString().slice(0, 10);
    const items = G.data.products.map(p => ({ product: p, stats: M.stats(G.data, p.id, from, to) }));
    const registrations = items.reduce((sum, item) => sum + item.stats.count, 0), used = items.filter(item => item.stats.count > 0).length;
    return G.header('JOUW GEBRUIK', 'Productstatistieken', 'stats') + (items.length ? '<div class="fields"><label>Maand<input type="month" id="product-stats-month" value="' + e(selected) + '" min="1900-01" max="9999-12"></label></div><div class="pair"><div class="panel"><span class="eyebrow">REGISTRATIES</span><h2>' + registrations + '</h2><p class="muted">In de gekozen maand</p></div><div class="panel"><span class="eyebrow">PRODUCTEN GEBRUIKT</span><h2>' + used + '</h2><p class="muted">Van je ' + items.length + ' producten</p></div></div><div class="list">' + items.map(({ product: p, stats }) => '<div class="row"><div class="grow"><strong>' + e(p.name) + '</strong><p>' + e(quantity(stats.total, p.base, p)) + ' gebruikt · ' + stats.count + ' ' + (stats.count === 1 ? 'registratie' : 'registraties') + '</p><p class="muted">' + e(quantity(p.stock, p.base, p)) + ' op voorraad</p>' + G.button('Gebruiksgeschiedenis', 'usageHistory', { productId: p.id }, 'text-button') + '</div></div>').join('') + '</div>' + (registrations ? '' : '<p class="notice">Voor deze maand heb je nog geen gebruik geregistreerd.</p>') + '<p class="notice">Hoeveelheden worden per product getoond in de eigen voorraadeenheid.</p>' : G.empty('Jouw producten, inzichtelijk.', 'Voeg een product toe en registreer gebruik om hier je maandtotalen te zien.', action('product-new', 'Product toevoegen', '', 'primary')));
  };

  G.actions['product-new'] = () => { G.ui.productDraft = draftFor(null); G.navigate('productEdit', { productId: null }); };
  G.actions['product-open'] = el => { G.ui.productDraft = null; G.navigate('product', { productId: el.dataset.id }); };
  G.actions['product-edit'] = el => { const p = G.data.products.find(item => item.id === el.dataset.id); if (!p) return G.toast('Product niet gevonden.'); G.ui.productDraft = draftFor(p); G.navigate('productEdit', { productId: p.id }); };
  G.actions['product-delete'] = el => {
    const p = G.data.products.find(item => item.id === el.dataset.id); if (!p) return;
    G.confirm('Product verwijderen?', 'Je verwijdert ' + p.name + ' en alle bijbehorende gebruiksregistraties.', async () => {
      const ok = await G.commit(data => M.deleteProduct(data, p.id));
      if (ok) { G.ui.productDraft = null; G.ui.usageDraft = null; G.navigate('inventory', { productId: null, lastUsageId: null }); G.toast('Product verwijderd.'); }
    });
  };
  G.actions['usage-new'] = el => { G.ui.usageDraft = null; G.navigate('usage', { productId: el.dataset.id }); };
  G.actions['usage-preset'] = el => { const input = document.getElementById('usage-amount'); if (!input) return; input.value = String(el.dataset.id).replace('.', ','); G.ui.usageDraft.enteredAmount = input.value; updateUsage(); };
  G.actions['usage-step'] = el => {
    const p = product(), d = G.ui.usageDraft, input = document.getElementById('usage-amount'); if (!p || !d || !input) return;
    let value = 0; try { value = M.parseAmount(input.value, 'Hoeveelheid', true); } catch (_) {}
    const step = ['scoop', 'l'].includes(d.enteredUnit) ? 0.25 : 1;
    input.value = String(Number(Math.max(0, value + Number(el.dataset.id) * step).toPrecision(12))).replace('.', ','); d.enteredAmount = input.value; updateUsage();
  };
  async function undo(id) {
    const ok = await G.commit(data => M.deleteUsage(data, id));
    if (ok) { if (G.ui.lastUsageId === id) G.ui.lastUsageId = null; G.render(); G.toast('Registratie verwijderd. Voorraad hersteld.'); }
  }
  G.actions['usage-undo'] = el => undo(el.dataset.id);
  G.actions['usage-delete'] = el => G.confirm('Registratie verwijderen?', 'De geregistreerde hoeveelheid wordt teruggezet in je voorraad.', () => undo(el.dataset.id));

  G.forms['product-save'] = async form => {
    const d = readProductForm(form), id = d.id || G.uid();
    try { M.validateProduct(d); } catch (err) { error(form, err.message); return; }
    const ok = await G.commit(data => { if (d.id) M.updateProduct(data, d.id, d); else M.createProduct(data, d, id); });
    if (ok) { G.ui.productDraft = null; G.ui.usageDraft = null; G.navigate('product', { productId: id }); G.toast('Product opgeslagen.'); }
  };
  G.forms['product-refill'] = async form => {
    const p = G.data.products.find(item => item.id === form.dataset.id); if (!p) return;
    const amount = form.elements.amount.value, unit = form.elements.unit.value;
    try { M.parseAmount(amount, 'Bijvulling'); M.refill(clone(G.data), p.id, amount, unit); } catch (err) { error(form, err.message); return; }
    const ok = await G.commit(data => M.refill(data, p.id, amount, unit));
    if (ok) G.toast('Voorraad aangevuld.');
  };
  G.forms['usage-save'] = async form => {
    const d = { ...readUsageForm(form) }, id = G.uid();
    try { M.addUsage(clone(G.data), d, id); } catch (err) { error(form, err.message); return; }
    const ok = await G.commit(data => M.addUsage(data, d, id));
    if (ok) { G.ui.usageDraft = null; G.navigate('product', { productId: d.productId, lastUsageId: id }); G.toast('Gebruik geregistreerd.'); }
  };

  function updateUsage() {
    const form = document.getElementById('usage-form'), p = product(); if (!form || !p) return;
    const d = readUsageForm(form), conversion = document.getElementById('usage-conversion'), remaining = document.getElementById('usage-remaining'), submit = document.getElementById('usage-submit'), input = document.getElementById('usage-amount');
    try {
      const amount = M.convert(p, M.parseAmount(d.enteredAmount), d.enteredUnit);
      if (amount > p.stock) throw new Error('Meer dan je voorraad. Pas de hoeveelheid aan of vul je voorraad bij.');
      conversion.textContent = d.enteredUnit === p.base ? 'Voorraad bijgehouden in ' + M.unitLabel(p.base, p) : '≈ ' + quantity(amount, p.base, p);
      remaining.textContent = quantity(Math.max(0, p.stock - amount), p.base, p);
      submit.textContent = quantity(M.parseAmount(d.enteredAmount), d.enteredUnit, p) + ' registreren';
      submit.disabled = false; error(form, ''); input.setAttribute('aria-invalid', 'false');
    } catch (err) {
      conversion.textContent = '1 ' + M.unitLabel(d.enteredUnit, p) + ' = ' + quantity(M.rate(p, d.enteredUnit), p.base, p);
      remaining.textContent = quantity(p.stock, p.base, p); submit.textContent = 'Gebruik registreren'; submit.disabled = true; error(form, err.message); input.setAttribute('aria-invalid', 'true');
    }
  }
  G.afterRender.push(function () {
    const month = document.getElementById('product-stats-month');
    if (month) month.addEventListener('change', () => {
      if (/^(?:19\d{2}|[2-9]\d{3})-(?:0[1-9]|1[0-2])$/.test(month.value)) { G.ui.productStatsMonth = month.value; G.render(); }
    });
    const edit = document.getElementById('product-form');
    if (edit) {
      edit.addEventListener('input', () => readProductForm(edit));
      const base = edit.elements.base;
      base.addEventListener('change', () => {
        const d = readProductForm(edit), next = base.value, old = d.base, factor = M.fixedRate(old, next);
        d.base = next;
        if (factor !== null) {
          for (const name of ['stock', 'total']) if (d[name] !== '') { try { d[name] = String(M.parseAmount(d[name], name, true) * factor); } catch (_) { d[name] = ''; } }
          for (const key of Object.keys(d.ratios)) if (d.ratios[key] !== '') { try { d.ratios[key] = String(M.parseAmount(d.ratios[key]) * factor); } catch (_) { delete d.ratios[key]; } }
          d.unitNotice = 'De voorraad is omgerekend naar ' + M.unitLabel(next, d) + '.';
        } else { d.stock = ''; d.total = ''; d.ratios = {}; d.entryUnit = next; d.defaultAmount = 1; d.unitNotice = 'Nieuwe voorraadeenheid: vul de inhoud en huidige voorraad opnieuw in.'; }
        G.render();
      });
      edit.elements.entryUnit.addEventListener('change', () => { const d = readProductForm(edit), previous = d.entryUnit, next = edit.elements.entryUnit.value; try { d.defaultAmount = M.convert(d, d.defaultAmount, previous, next); } catch (_) { d.defaultAmount = 1; } d.entryUnit = next; G.render(); });
    }
    const form = document.getElementById('usage-form');
    if (form) {
      form.addEventListener('input', event => { readUsageForm(form); if (event.target.name === 'enteredAmount') updateUsage(); });
      form.elements.productId.addEventListener('change', () => { G.ui.usageDraft = null; G.navigate('usage', { productId: form.elements.productId.value }); });
      form.elements.enteredUnit.addEventListener('change', () => {
        const p = product(), d = readUsageForm(form), next = form.elements.enteredUnit.value;
        try { d.enteredAmount = String(M.convert(p, d.enteredAmount, d.enteredUnit, next)).replace('.', ','); } catch (_) { d.enteredAmount = ''; }
        d.enteredUnit = next; G.render();
      });
      updateUsage();
    }
  });
})();
