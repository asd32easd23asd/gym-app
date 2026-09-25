'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../app/product-model.js');

function fixture(overrides = {}) {
  const data = { products: [], usages: [] };
  M.createProduct(data, { name: 'Pre-workout', detail: '', barcode: '0123456789012', base: 'g', entryUnit: 'scoop', stock: 100, total: 300, ratios: { scoop: 10 }, customLabel: '', defaultAmount: 1, ...overrides }, 'product-1');
  return data;
}
function usage(data, overrides = {}, id = 'usage-1') {
  return M.addUsage(data, { productId: 'product-1', enteredAmount: 1, enteredUnit: data.products[0].entryUnit, date: '2026-09-25', time: '17:30', note: '', ...overrides }, id);
}

test('accepts Dutch decimal notation and rejects malformed, negative and infinite input', () => {
  assert.equal(M.parseAmount(' 0,25 '), 0.25);
  assert.equal(M.parseAmount('.5'), 0.5);
  assert.equal(M.parseAmount('0', 'Voorraad', true), 0);
  for (const invalid of ['', '1,2.3', '-1', '1e3', 'Infinity', null, NaN, Infinity, -Infinity, 0]) assert.throws(() => M.parseAmount(invalid));
});
test('mass and volume convert only within their dimensions by default', () => {
  assert.equal(M.fixedRate('mg', 'g'), 0.001);
  assert.equal(M.fixedRate('l', 'ml'), 1000);
  assert.equal(M.fixedRate('ml', 'mg'), null);
  assert.equal(M.fixedRate('capsule', 'stuk'), null);
  const p = fixture().products[0];
  assert.equal(M.convert(p, 2500, 'mg'), 2.5);
  assert.equal(M.convert(p, '0,5', 'scoop'), 5);
  assert.throws(() => M.convert(p, 1, 'ml'), /omrekening/);
});
test('an explicit product ratio bridges dimensions and inherits scale without guessing', () => {
  const p = fixture({ base: 'mg', entryUnit: 'ml', ratios: { ml: 50 } }).products[0];
  assert.equal(M.convert(p, '0,5', 'ml'), 25);
  assert.equal(M.convert(p, 1, 'l'), 50000);
  assert.equal(M.convert(p, 50, 'mg', 'ml'), 1);
  assert.equal(M.rate(p, 'scoop'), null);
  assert.throws(() => fixture({ ratios: { ml: 20, l: 1000 }, entryUnit: 'ml' }), /tegenspreken|tegen/);
});
test('custom unit requires a label and has no universal conversion', () => {
  assert.throws(() => fixture({ base: 'custom', entryUnit: 'custom', ratios: {}, customLabel: '' }), /naam/);
  const p = fixture({ base: 'ml', entryUnit: 'custom', ratios: { custom: 12.5 }, customLabel: 'pompje' }).products[0];
  assert.equal(M.unitLabel('custom', p), 'pompje');
  assert.equal(M.convert(p, 2, 'custom'), 25);
});
test('validation never overwrites fixed ratios and checks stock against capacity', () => {
  assert.throws(() => fixture({ ratios: { mg: 2 }, entryUnit: 'g' }), /staat vast/);
  assert.throws(() => fixture({ stock: 301 }), /groter/);
  assert.throws(() => fixture({ entryUnit: 'ml', ratios: {} }), /omrekening/);
  assert.throws(() => fixture({ ratios: { scoop: -1 } }), /groter/);
  assert.throws(() => fixture({ name: '  ' }), /productnaam/);
});
test('usage subtracts base units and preserves entered units and local timestamp', () => {
  const data = fixture(), record = usage(data, { enteredAmount: '1,5', note: 'Na training' });
  assert.equal(data.products[0].stock, 85);
  assert.equal(record.amount, 15);
  assert.equal(record.enteredAmount, 1.5);
  assert.equal(record.enteredUnit, 'scoop');
  assert.equal(record.date, '2026-09-25');
  assert.equal(record.time, '17:30');
  assert.equal(M.validateData(data), data);
});
test('invalid usage is atomic and never makes stock negative', () => {
  const data = fixture(), before = JSON.stringify(data);
  for (const invalid of [{ enteredAmount: 1000 }, { enteredAmount: 'NaN' }, { date: '2026-02-30' }, { time: '25:00' }, { enteredUnit: 'ml' }, { note: 'x'.repeat(1001) }]) {
    assert.throws(() => usage(data, invalid));
    assert.equal(JSON.stringify(data), before);
  }
});
test('decimal usage can consume exactly all inventory without rounding artifacts', () => {
  const data = fixture({ base: 'g', entryUnit: 'g', stock: 0.3, total: 0.3, ratios: {} });
  usage(data, { enteredAmount: 0.1 }, 'a');
  usage(data, { enteredAmount: 0.1 }, 'b');
  usage(data, { enteredAmount: 0.1 }, 'c');
  assert.equal(data.products[0].stock, 0);
  assert.throws(() => usage(data, { enteredAmount: 0.00001 }, 'd'), /minder/);
  M.deleteUsage(data, 'b');
  assert.equal(data.products[0].stock, 0.1);
});
test('unrepresentably tiny changes are rejected instead of creating phantom inventory changes', () => {
  const data = fixture({ entryUnit: 'g' });
  const before = JSON.stringify(data);
  assert.throws(() => usage(data, { enteredAmount: 0.000000000000000001 }), /te klein/);
  assert.equal(JSON.stringify(data), before);
  assert.throws(() => M.refill(data, 'product-1', 0.000000000000000001, 'g'), /te klein/);
  assert.equal(JSON.stringify(data), before);
});
test('undo after a refill restores only the deleted use, preserving the new stock', () => {
  const data = fixture();
  usage(data);
  M.refill(data, 'product-1', 2, 'scoop');
  assert.equal(data.products[0].stock, 110);
  assert.equal(data.products[0].total, 320);
  M.deleteUsage(data, 'usage-1');
  assert.equal(data.products[0].stock, 120);
  assert.equal(data.usages.length, 0);
  assert.throws(() => M.deleteUsage(data, 'usage-1'), /al verwijderd/);
  assert.equal(data.products[0].stock, 120);
});
test('changing a scoop ratio cannot retroactively change the undo amount', () => {
  const data = fixture(); usage(data);
  M.updateProduct(data, 'product-1', { ratios: { scoop: 20 } });
  M.deleteUsage(data, 'usage-1');
  assert.equal(data.products[0].stock, 100);
});
test('base is locked after history exists but entry unit remains configurable', () => {
  const data = fixture(); usage(data);
  assert.throws(() => M.updateProduct(data, 'product-1', { base: 'mg', entryUnit: 'mg', ratios: {} }), /staat vast/);
  assert.equal(data.products[0].base, 'g');
  M.updateProduct(data, 'product-1', { entryUnit: 'mg' });
  assert.equal(data.products[0].entryUnit, 'mg');
});
test('stock corrections followed by undo stay coherent with capacity', () => {
  const data = fixture(); usage(data);
  M.updateProduct(data, 'product-1', { stock: 300 });
  M.deleteUsage(data, 'usage-1');
  assert.equal(data.products[0].stock, 310);
  assert.equal(data.products[0].total, 310);
  M.validateData(data);
});
test('failed refill remains atomic on overflow or missing units', () => {
  const data = fixture({ stock: 1, total: 1e12 });
  const before = JSON.stringify(data);
  assert.throws(() => M.refill(data, 'product-1', 1, 'g'));
  assert.equal(JSON.stringify(data), before);
  assert.throws(() => M.refill(data, 'product-1', 1, 'ml'));
  assert.equal(JSON.stringify(data), before);
});
test('statistics filter dates inclusively, group by day, and preserve history order', () => {
  const data = fixture();
  usage(data, { date: '2026-08-30', enteredAmount: 1 }, 'a');
  usage(data, { date: '2026-09-24', enteredAmount: 2 }, 'b');
  usage(data, { date: '2026-09-24', time: '18:00', enteredAmount: 0.5 }, 'c');
  usage(data, { date: '2026-09-25', enteredAmount: 1 }, 'd');
  const stats = M.stats(data, 'product-1', '2026-09-01', '2026-09-25');
  assert.equal(stats.total, 35); assert.equal(stats.count, 3); assert.equal(stats.days, 2);
  assert.equal(stats.byDay['2026-09-24'], 25);
  assert.deepEqual(stats.history.map(x => x.id), ['d', 'c', 'b']);
});
test('product deletion removes only its dependent usage and rejects duplicate IDs', () => {
  const data = fixture(); usage(data);
  assert.throws(() => M.createProduct(data, data.products[0], 'product-1'), /bestaat/);
  M.createProduct(data, { ...data.products[0], name: 'Second' }, 'product-2');
  assert.equal(M.deleteProduct(data, 'product-1'), 1);
  assert.equal(data.products.length, 1); assert.equal(data.products[0].id, 'product-2'); assert.equal(data.usages.length, 0);
});
test('backup validation rejects duplicates, orphans, incompatible history, and numeric strings', () => {
  const data = fixture(); usage(data);
  const mutate = fn => { const d = JSON.parse(JSON.stringify(data)); fn(d); assert.throws(() => M.validateData(d)); };
  mutate(d => d.products.push(d.products[0]));
  mutate(d => d.usages.push(d.usages[0]));
  mutate(d => d.usages[0].productId = 'missing');
  mutate(d => d.usages[0].base = 'ml');
  mutate(d => d.products[0].stock = '90');
  mutate(d => d.products[0].ratios.scoop = '10');
  mutate(d => d.usages[0].amount = Infinity);
});
test('product pages render real empty and populated data without seeding or unescaped user text', () => {
  const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const G = {
    data: { products: [], usages: [] }, ui: {}, pages: {}, actions: {}, forms: {}, afterRender: [], e: escape,
    fmt: value => String(value), dateLabel: value => value, today: () => '2026-09-25', uid: () => 'new-id', icon: () => '',
    header: (eyebrow, title) => '<h1>' + escape(title) + '</h1>',
    empty: (title, text, cta) => '<p>' + escape(title) + escape(text) + '</p>' + (cta || ''),
    button: label => '<button>' + escape(label) + '</button>'
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../app/products.js'), 'utf8'), { window: { Gym: G, GymProducts: M } });
  for (const key of ['inventory', 'product', 'usage', 'usageHistory', 'productStats', 'productEdit']) assert.equal(typeof G.pages[key](), 'string');
  assert.equal(G.data.products.length, 0);
  G.data = fixture({ name: '<img src=x onerror=alert(1)>', detail: '<script>bad()</script>', barcode: '<barcode>' });
  usage(G.data, { note: '<script>note()</script>' });
  G.ui = { productId: 'product-1', productDraft: null };
  for (const key of ['inventory', 'product', 'usage', 'usageHistory', 'productStats', 'productEdit']) {
    const html = G.pages[key]();
    assert.equal(typeof html, 'string');
    assert.ok(!html.includes('<img src=x'), key + ' escapes product names');
    assert.ok(!html.includes('<script>'), key + ' escapes notes and descriptions');
  }
  G.ui.productId = null;
  assert.ok(G.pages.productStats().includes('10 g gebruikt'), 'aggregate statistics do not depend on a selected product');
  G.ui.productStatsMonth = '2026-08';
  assert.ok(G.pages.productStats().includes('0 g gebruikt'), 'month selector filters aggregate statistics');
});
