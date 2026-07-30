import { describe, it, expect } from 'vitest';
import { csvCell, toCsv } from '../lib/csv';

// The admin "⬇️ CSV" leads export serializes name/contact/detail fields that come from PUBLIC
// portal-form submitters. The old serializer only quote-wrapped cells, which parses safely but
// does NOT stop Excel/Sheets from EXECUTING a cell that starts with = + - @ (CSV Injection /
// Formula Injection). These tests pin that such cells are prefixed with a single quote (defused)
// while ordinary data is untouched, and that CSV quoting still works.

describe('csvCell — formula-injection neutralization', () => {
  it.each([
    ['=HYPERLINK("http://evil","x")', `"'=HYPERLINK(""http://evil"",""x"")"`],
    ['=cmd|\'/c calc\'!A1', `"'=cmd|'/c calc'!A1"`],
    ['+1+1', `"'+1+1"`],
    ['-2+3', `"'-2+3"`],
    ['@SUM(A1:A9)', `"'@SUM(A1:A9)"`],
  ])('prefixes a leading formula trigger: %s', (input, expected) => {
    expect(csvCell(input)).toBe(expected);
  });

  it('also defuses a leading tab or carriage return (Excel treats them as formula leads too)', () => {
    expect(csvCell('\t=1+1')).toBe(`"'\t=1+1"`);
    expect(csvCell('\r=1+1')).toBe(`"'\r=1+1"`);
  });

  it('leaves ordinary values untouched (only CSV-quoted, no apostrophe added)', () => {
    expect(csvCell('มานี ใจดี')).toBe('"มานี ใจดี"');
    expect(csvCell('support@openthai.ai')).toBe('"support@openthai.ai"');   // @ not leading
    expect(csvCell('0812345678')).toBe('"0812345678"');
    expect(csvCell('category: สมุนไพร · qty: 3')).toBe('"category: สมุนไพร · qty: 3"');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it('still escapes embedded double-quotes', () => {
    expect(csvCell('ร้าน "A"')).toBe('"ร้าน ""A"""');
    // both defused AND quote-escaped when a payload also contains quotes
    expect(csvCell('=x"y')).toBe(`"'=x""y"`);
  });
});

describe('toCsv — full rows', () => {
  it('joins cells with commas and rows with newlines, defusing payload cells', () => {
    const csv = toCsv([
      ['type', 'name', 'contact'],
      ['portal:producer', '=cmd|\'/c calc\'!A1', '+66812345678'],
      ['order', 'มานี', 'a@b.com'],
    ]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('"type","name","contact"');
    expect(lines[1]).toBe(`"portal:producer","'=cmd|'/c calc'!A1","'+66812345678"`);
    expect(lines[2]).toBe('"order","มานี","a@b.com"');
    // no cell in the output begins a formula (every raw cell that did is now quote+apostrophe led)
    expect(csv.includes(',"=')).toBe(false);
    expect(csv.includes(',"+')).toBe(false);
  });
});
