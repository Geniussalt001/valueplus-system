import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';

const code = ts.transpileModule(fs.readFileSync('src/services/branchDeliveryTemplate.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 },
}).outputText;
const { renderDeliveryHtml } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const note = {
  number: 'DN-TEST-000001', date: '2026-10-01', vendor: 'TEST',
  branch: { code: 'TEST', name: 'สาขาทดสอบรูปแบบเอกสาร', address: '', route: '1', bdc: 'WB02' },
  preparedBy: 'ผู้จัดทำทดสอบ', remark: '',
  lines: Array.from({ length: 21 }, (_, index) => ({
    code: String(6000000 + index), name: 'สินค้าทดสอบ เค้กรูปอุ้งเท้าแมว ขนาด 50 กรัม',
    orderedQuantity: 30, quantity: 25, unit: 'ชิ้น', packSize: '1 × 1',
  })),
};
const html = renderDeliveryHtml(note);
assert.equal((html.match(/<section class="delivery-sheet">/g) || []).length, 2);
assert.ok(html.includes('600 ชิ้น'));
assert.ok(html.includes('500 ชิ้น'));
assert.ok(html.includes('01/10/2569'));
assert.ok(!/ราคาขายปลีก|ราคาต่อหน่วย|VAT|Unit Price/.test(html));
note.lines = [{ code: 'X', name: '<script>alert(1)</script>', quantity: 1, unit: 'ลัง' }];
const legacy = renderDeliveryHtml(note);
assert.ok(legacy.includes('ไม่ครบ'));
assert.ok(!legacy.includes('<script>alert(1)</script>'));
assert.ok(legacy.includes('1 ลัง'));
note.lines.push({ code: 'Y', name: 'สินค้า', quantity: 2, unit: 'ชิ้น' });
const mixed = renderDeliveryHtml(note);
assert.ok(mixed.includes('1 ลัง<br>2 ชิ้น'));
const output = path.resolve('build/hub-preview');
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'hub-test.html'), html);
console.log('PASS: HUB headers, 20 rows/page, ordered/sent totals, missing legacy order, mixed units, text escaping');
