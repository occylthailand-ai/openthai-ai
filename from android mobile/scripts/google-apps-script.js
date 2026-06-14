/**
 * Openthai.ai × Claude — Google Apps Script
 * ==========================================
 * วิธีใช้:
 *  1. ไปที่ script.google.com → New Project
 *  2. วาง code นี้ทั้งหมด
 *  3. แก้ SHEET_ID ให้ตรงกับ Google Sheet ของคุณ
 *  4. Deploy → New Deployment → Web App
 *     - Execute as: Me
 *     - Who has access: Anyone
 *  5. Copy Web App URL → ใส่ใน Railway Variables:
 *     GOOGLE_APPS_SCRIPT_URL = <Web App URL>
 */

const SHEET_ID  = "YOUR_GOOGLE_SHEET_ID_HERE"; // ← วางรหัส Sheet ID ของคุณตรงนี้ (จาก URL ของ Google Sheet)
const ADMIN_EMAIL = "occylthailand@gmail.com";   // ✅ ตั้งค่าแล้ว

// ── Sheet names ──────────────────────────────────────────────────────
const SHEETS = {
  waitlist:    "Waitlist",
  generations: "Generations",
  logs:        "Logs",
};

// ══════════════════════════════════════════════════════
// ENTRY POINTS
// ══════════════════════════════════════════════════════

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    switch (data.action) {
      case "addWaitlist":    return respond(addWaitlist(data));
      case "addGeneration":  return respond(addGeneration(data));
      default:               return respond({ ok: false, error: "Unknown action" });
    }
  } catch (err) {
    return respond({ ok: false, error: err.toString() });
  }
}

function doGet(e) {
  const action = e.parameter.action;

  // Admin dashboard reads
  if (action === "getSheet") {
    return respond(getSheet(e.parameter.sheet));
  }

  return respond({ status: "Openthai.ai — Google Apps Script is running ✅", ts: new Date().toISOString() });
}

// ══════════════════════════════════════════════════════
// READ SHEET (for Admin Dashboard)
// ══════════════════════════════════════════════════════

function getSheet(sheetName) {
  try {
    const ss    = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { ok: false, rows: [], error: "Sheet not found" };

    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return { ok: true, rows: [] };

    const headers = values[0].map(String);
    const rows = values.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = String(row[i] ?? ""); });
      return obj;
    });

    return { ok: true, rows };
  } catch (err) {
    return { ok: false, rows: [], error: err.toString() };
  }
}

// ══════════════════════════════════════════════════════
// WAITLIST
// ══════════════════════════════════════════════════════

function addWaitlist(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, SHEETS.waitlist, [
    "Timestamp", "Name", "Email", "Phone", "Role", "Source", "PDPA", "Status"
  ]);

  sheet.appendRow([
    data.timestamp,
    data.name,
    data.email,
    data.phone  || "",
    data.role   || "",
    data.source || "platform",
    data.pdpa   || "No",
    "New",
  ]);

  // Send notification email to admin
  try {
    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      subject: `🎉 Openthai.ai — New Signup: ${data.name}`,
      body: `ลงทะเบียนใหม่!\n\nชื่อ: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || "-"}\nRole: ${data.role || "-"}\nSource: ${data.source || "-"}\nPDPA: ${data.pdpa || "No"}\n\nเวลา: ${data.timestamp}`,
    });
  } catch (_) { /* email optional */ }

  const totalCount = Math.max(0, sheet.getLastRow() - 1); // minus header
  return { ok: true, message: "Waitlist row added", email: data.email, totalCount };
}

// ══════════════════════════════════════════════════════
// GENERATION LOG
// ══════════════════════════════════════════════════════

function addGeneration(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, SHEETS.generations, [
    "Timestamp", "UserID", "Platform", "ContentType", "Product", "Languages", "CharCount"
  ]);

  sheet.appendRow([
    data.timestamp,
    data.userId    || "anonymous",
    data.platform,
    data.contentType,
    data.product,
    data.langs     || "",
    data.charCount || 0,
  ]);

  return { ok: true, message: "Generation logged" };
}

// ══════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground("#1A1A2E")
      .setFontColor("#C9A84C")
      .setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
