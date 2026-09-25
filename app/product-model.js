(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GymProducts = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const UNITS = Object.freeze({
    g: Object.freeze({ label: 'Gram', short: 'g', dimension: 'mass', scale: 1 }),
    mg: Object.freeze({ label: 'Milligram', short: 'mg', dimension: 'mass', scale: 0.001 }),
    ml: Object.freeze({ label: 'Milliliter', short: 'ml', dimension: 'volume', scale: 1 }),
    l: Object.freeze({ label: 'Liter', short: 'l', dimension: 'volume', scale: 1000 }),
    scoop: Object.freeze({ label: 'Scoop', short: 'scoop' }),
    stuk: Object.freeze({ label: 'Stuk', short: 'stuk' }),
    capsule: Object.freeze({ label: 'Capsule', short: 'capsule' }),
    druppel: Object.freeze({ label: 'Druppel', short: 'druppel' }),
    custom: Object.freeze({ label: 'Eigen eenheid', short: 'eenheid' })
  });
  const MAX = 1e12;
  const EPS = 1e-9;
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
  const clean = value => Number(Number(value).toPrecision(14));
  function fail(message) { throw new Error(message); }
  function number(value, label = 'Hoeveelheid', zero = false) {
    if (typeof value !== 'number') {
      const text = String(value == null ? '' : value).trim();
      if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)) fail(label + ': gebruik een getal, bijvoorbeeld 0,5.');
      value = Number(text.replace(',', '.'));
    }
    if (!Number.isFinite(value) || value > MAX || (zero ? value < 0 : value <= 0)) {
      fail(label + (zero ? ' moet 0 of groter zijn.' : ' moet groter zijn dan 0.'));
    }
    return clean(value);
  }
  function unit(key) { if (!own(UNITS, key)) fail('Kies een geldige eenheid.'); return UNITS[key]; }
  function sameDimension(a, b) { return !!(unit(a).dimension && unit(a).dimension === unit(b).dimension); }
  function fixedRate(from, to) {
    unit(from); unit(to);
    if (from === to) return 1;
    return sameDimension(from, to) ? clean(UNITS[from].scale / UNITS[to].scale) : null;
  }
  // Ratios always mean: one named input unit contains this many base units.
  // Mass and volume are only linked when this product has an explicit ratio.
  function rate(product, from) {
    unit(from); unit(product.base);
    const fixed = fixedRate(from, product.base);
    if (fixed !== null) return fixed;
    if (own(product.ratios, from)) return number(product.ratios[from], 'Omrekening');
    for (const key of Object.keys(product.ratios || {})) {
      if (!own(UNITS, key) || !sameDimension(from, key)) continue;
      return clean(number(product.ratios[key], 'Omrekening') * UNITS[from].scale / UNITS[key].scale);
    }
    return null;
  }
  function convert(product, value, from, to = product.base) {
    const a = rate(product, from), b = rate(product, to);
    if (a === null || b === null) fail('Stel eerst de omrekening voor dit product in.');
    const result = clean(number(value, 'Hoeveelheid', true) * a / b);
    if (!Number.isFinite(result) || result > MAX) fail('Deze hoeveelheid is te groot.');
    return result;
  }
  function unitLabel(key, product) { unit(key); return key === 'custom' ? ((product && product.customLabel) || 'eenheid') : UNITS[key].short; }
  function availableUnits(product) { return Object.keys(UNITS).filter(key => rate(product, key) !== null); }
  function text(value, limit, label, required) {
    const result = String(value == null ? '' : value).trim();
    if (required && !result) fail('Vul ' + label + ' in.');
    if (result.length > limit) fail(label + ' mag maximaal ' + limit + ' tekens bevatten.');
    return result;
  }
  function validateProduct(input) {
    const base = input.base || 'g', entryUnit = input.entryUnit || base;
    unit(base); unit(entryUnit);
    const ratios = {};
    for (const key of Object.keys(input.ratios || {})) {
      unit(key);
      if (input.ratios[key] === '' || input.ratios[key] == null) continue;
      const value = number(input.ratios[key], 'Omrekening');
      const fixed = fixedRate(key, base);
      if (fixed !== null) {
        if (Math.abs(value - fixed) > Math.max(EPS, fixed * EPS)) fail('De omrekening tussen deze eenheden staat vast.');
      } else ratios[key] = value;
    }
    // Do not allow contradictory alternate definitions such as 1 ml = 10 g, 1 l = 5 g.
    for (const a of Object.keys(ratios)) for (const b of Object.keys(ratios)) {
      if (a >= b || !sameDimension(a, b)) continue;
      const expected = clean(ratios[b] * UNITS[a].scale / UNITS[b].scale);
      if (Math.abs(ratios[a] - expected) > Math.max(EPS, expected * EPS)) fail('De ingevulde omrekeningen spreken elkaar tegen.');
    }
    const product = {
      id: input.id == null ? '' : String(input.id),
      name: text(input.name, 80, 'een productnaam', true),
      detail: text(input.detail, 160, 'Omschrijving', false),
      barcode: text(input.barcode, 64, 'Barcode', false),
      base, entryUnit,
      stock: number(input.stock, 'Huidige voorraad', true),
      total: number(input.total, 'Inhoud', true),
      ratios,
      customLabel: text(input.customLabel, 24, 'een naam voor je eigen eenheid', base === 'custom' || entryUnit === 'custom' || own(ratios, 'custom')),
      defaultAmount: number(input.defaultAmount == null || input.defaultAmount === '' ? 1 : input.defaultAmount, 'Gebruikelijke hoeveelheid')
    };
    if (product.stock > product.total) fail('De huidige voorraad kan niet groter zijn dan de ingevulde inhoud.');
    if (rate(product, entryUnit) === null) fail('Vul de omrekening van je invoereenheid naar je voorraadeenheid in.');
    return product;
  }
  function collections(data) {
    if (!data || !Array.isArray(data.products) || !Array.isArray(data.usages)) fail('De productgegevens zijn niet beschikbaar.');
  }
  function getProduct(data, id) {
    collections(data);
    const p = data.products.find(item => item.id === id);
    if (!p) fail('Dit product is niet meer beschikbaar.');
    return p;
  }
  function newId(data, suggested, collection) {
    const id = String(suggested || ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)));
    if (!id || data[collection].some(item => item.id === id)) fail('Dit item bestaat al. Probeer opnieuw.');
    return id;
  }
  function createProduct(data, input, id) {
    collections(data);
    const product = validateProduct(input);
    product.id = newId(data, id, 'products');
    data.products.push(product);
    return product;
  }
  function updateProduct(data, id, input) {
    const old = getProduct(data, id), next = validateProduct({ ...old, ...input, id });
    if (old.base !== next.base && data.usages.some(item => item.productId === id)) fail('Je voorraadeenheid staat vast zodra je gebruik hebt geregistreerd. Voeg voor een andere voorraadeenheid een nieuw product toe.');
    Object.assign(old, next);
    return old;
  }
  function deleteProduct(data, id) {
    getProduct(data, id);
    const usages = data.usages.filter(item => item.productId === id);
    data.products = data.products.filter(item => item.id !== id);
    data.usages = data.usages.filter(item => item.productId !== id);
    return usages.length;
  }
  function validDate(value) {
    const date = String(value || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail('Kies een geldige datum.');
    const parsed = new Date(date + 'T12:00:00Z');
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) fail('Kies een geldige datum.');
    return date;
  }
  function validTime(value) { const time = String(value || ''); if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) fail('Kies een geldig tijdstip.'); return time; }
  function addUsage(data, input, id) {
    const product = getProduct(data, input.productId);
    const enteredUnit = input.enteredUnit || product.entryUnit;
    const enteredAmount = number(input.enteredAmount, 'Gebruikte hoeveelheid');
    const amount = convert(product, enteredAmount, enteredUnit);
    if (amount <= 0) fail('Vul een hoeveelheid groter dan 0 in.');
    if (amount > product.stock) fail('Je hebt minder op voorraad. Pas je hoeveelheid aan of vul eerst je voorraad bij.');
    const usage = {
      id: newId(data, id, 'usages'), productId: product.id,
      date: validDate(input.date), time: validTime(input.time),
      amount, base: product.base, enteredAmount, enteredUnit,
      note: text(input.note, 1000, 'Notitie', false)
    };
    // Validate all input before changing inventory.
    const remaining = clean(Math.max(0, product.stock - amount));
    if (remaining === product.stock) fail('Deze hoeveelheid is te klein om de voorraad nauwkeurig bij te werken.');
    product.stock = remaining;
    data.usages.push(usage);
    return usage;
  }
  function deleteUsage(data, id) {
    collections(data);
    const usage = data.usages.find(item => item.id === id);
    if (!usage) fail('Deze registratie is al verwijderd.');
    const product = getProduct(data, usage.productId);
    const amount = usage.base === product.base ? number(usage.amount, 'Registratie') : convert(product, usage.amount, usage.base);
    const stock = number(clean(product.stock + amount), 'Nieuwe voorraad', true);
    if (stock === product.stock) fail('Deze hoeveelheid is te klein om de voorraad nauwkeurig te herstellen.');
    product.stock = stock;
    product.total = Math.max(product.total, stock);
    data.usages = data.usages.filter(item => item.id !== id);
    return usage;
  }
  function refill(data, id, value, from) {
    const product = getProduct(data, id);
    const amount = convert(product, number(value, 'Bijvulling'), from || product.base);
    const stock = number(clean(product.stock + amount), 'Nieuwe voorraad', true);
    const total = number(clean(product.total + amount), 'Totale voorraad', true);
    if (stock === product.stock || total === product.total) fail('Deze bijvulling is te klein om de voorraad nauwkeurig bij te werken.');
    product.stock = stock;
    product.total = total;
    return amount;
  }
  function stats(data, id, from, to) {
    const product = getProduct(data, id);
    if (from) validDate(from); if (to) validDate(to);
    const history = data.usages.filter(item => item.productId === id && (!from || item.date >= from) && (!to || item.date <= to))
      .slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time) || String(b.id).localeCompare(String(a.id)));
    const byDay = {};
    for (const entry of history) {
      const amount = entry.base === product.base ? entry.amount : convert(product, entry.amount, entry.base);
      byDay[entry.date] = clean((byDay[entry.date] || 0) + amount);
    }
    return { total: clean(Object.values(byDay).reduce((sum, value) => sum + value, 0)), count: history.length, days: Object.keys(byDay).length, byDay, history, base: product.base };
  }
  function validateData(data) {
    collections(data);
    const ids = new Set(), usageIds = new Set();
    for (const p of data.products) {
      if (!p || typeof p.id !== 'string' || !p.id || p.id.length > 128 || ids.has(p.id)) fail('Ongeldig of dubbel productnummer.');
      if (typeof p.name !== 'string' || typeof p.detail !== 'string' || typeof p.customLabel !== 'string' || (p.barcode !== undefined && typeof p.barcode !== 'string')) fail('Ongeldige productgegevens.');
      if (!p.ratios || typeof p.ratios !== 'object' || Array.isArray(p.ratios)) fail('Ongeldige productomrekeningen.');
      if (['stock', 'total', 'defaultAmount'].some(key => typeof p[key] !== 'number') || Object.values(p.ratios).some(value => typeof value !== 'number')) fail('Producthoeveelheden moeten getallen zijn.');
      validateProduct(p); ids.add(p.id);
    }
    for (const item of data.usages) {
      if (!item || typeof item.id !== 'string' || !item.id || item.id.length > 128 || usageIds.has(item.id)) fail('Ongeldig of dubbel registratienummer.');
      if (!ids.has(item.productId)) fail('Een registratie verwijst naar een ontbrekend product.');
      const p = getProduct(data, item.productId);
      if (item.base !== p.base || typeof item.amount !== 'number' || typeof item.enteredAmount !== 'number' || typeof item.note !== 'string') fail('Ongeldige gebruiksregistratie.');
      unit(item.enteredUnit); number(item.amount, 'Registratie'); number(item.enteredAmount, 'Registratie');
      validDate(item.date); validTime(item.time); text(item.note, 1000, 'Notitie', false);
      usageIds.add(item.id);
    }
    return data;
  }
  return Object.freeze({ UNITS, parseAmount: number, fixedRate, rate, convert, unitLabel, availableUnits, validateProduct, validateData, getProduct, createProduct, updateProduct, deleteProduct, addUsage, deleteUsage, refill, stats, validDate, validTime });
});
