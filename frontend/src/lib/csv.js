// CSV export helpers with formula-injection neutralization (OWASP "CSV Injection" /
// "Formula Injection"). The admin leads export serializes fields — name/contact/detail —
// that originate from PUBLIC portal-form submitters, i.e. untrusted input. Wrapping a cell
// in quotes (the previous behaviour) makes it PARSE safely but does NOT stop a spreadsheet
// from EXECUTING it: Excel/LibreOffice/Google Sheets strip the CSV quotes, then evaluate a
// cell whose text starts with = + - @ (or a tab/CR) as a formula. So a submitter who enters
// a name like  =HYPERLINK("http://evil","click")  or a DDE payload  =cmd|'/c calc'!A1
// gets it run on the admin's machine the moment they open the exported file.
//
// Mitigation (OWASP): if a cell's text begins with a formula-trigger character, prefix it
// with a single quote so the spreadsheet treats the whole cell as text. Excel hides that
// leading apostrophe on display (a "+66..." phone still shows as +66...), so legitimate data
// reads normally while payloads are defused. Then apply the usual CSV quoting on top.
const FORMULA_LEAD = /^[=+\-@\t\r]/;

export function csvCell(value) {
  let s = String(value ?? '');
  if (FORMULA_LEAD.test(s)) s = "'" + s;       // defuse formula execution
  return `"${s.replace(/"/g, '""')}"`;          // CSV-quote + escape embedded quotes
}

export function toCsv(rows) {
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}
