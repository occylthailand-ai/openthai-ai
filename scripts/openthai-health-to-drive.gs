/**
 * OpenThaiAi — Health/Test Report → Google Drive (Web App)
 * ───────────────────────────────────────────────────────────
 * รับผลการเทส/health จาก GitHub Actions แล้วเขียนเข้า Google Drive ของคุณเอง
 * (ไฟล์เป็นของบัญชีคุณ ไม่ติดปัญหา quota ของ service account)
 *
 * วิธีติดตั้ง (ทำครั้งเดียว ~2 นาที):
 *   1. เปิด https://script.google.com → New project → วางโค้ดนี้ทั้งหมด
 *   2. Deploy → New deployment → เลือก type = Web app
 *        - Execute as: Me (occylthailand@gmail.com)
 *        - Who has access: Anyone
 *   3. คัดลอก "Web app URL" ที่ได้
 *   4. ไปที่ GitHub repo → Settings → Secrets and variables → Actions → New secret
 *        - Name : DRIVE_WEBHOOK_URL   Value: <Web app URL>
 *        - (ถ้าต้องการความปลอดภัยเพิ่ม) Name: DRIVE_WEBHOOK_SECRET  Value: <ข้อความลับ>
 *          แล้วตั้งค่า SHARED_SECRET ด้านล่างให้ตรงกัน
 *
 * เสร็จแล้ว workflow `drive-report.yml` จะเขียนผลเข้า Drive อัตโนมัติทุก 6 ชม.
 */

const FOLDER_NAME   = 'OpenThaiAi Reports'; // โฟลเดอร์ปลายทางใน Drive
const LOG_SHEET_NAME = 'Health_Log';         // สเปรดชีตบันทึกผลต่อเนื่อง
const SHARED_SECRET  = '';                    // เว้นว่าง = ไม่ตรวจ; ถ้าตั้ง ต้องตรงกับ DRIVE_WEBHOOK_SECRET

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (SHARED_SECRET && body.secret !== SHARED_SECRET) {
      return json_({ ok: false, error: 'unauthorized' });
    }

    const folder = getOrCreateFolder_(FOLDER_NAME);
    const ts   = body.timestamp || new Date().toISOString();
    const safe = String(ts).replace(/[:]/g, '-');
    const overall = body.overall || 'UNKNOWN';

    // 1) เขียนไฟล์รายงาน (Markdown) ลงโฟลเดอร์
    const fileName = 'report-' + safe + ' — ' + overall + '.md';
    folder.createFile(fileName, body.markdown || JSON.stringify(body, null, 2), 'text/plain');

    // 2) บันทึกแถวลง Health_Log สเปรดชีต
    appendLog_(folder, body);

    return json_({ ok: true, file: fileName });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json_({ ok: true, service: 'openthai-health-to-drive', time: new Date().toISOString() });
}

function getOrCreateFolder_(name) {
  const it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

function appendLog_(folder, body) {
  let ss;
  const files = folder.getFilesByName(LOG_SHEET_NAME);
  if (files.hasNext()) {
    ss = SpreadsheetApp.open(files.next());
  } else {
    ss = SpreadsheetApp.create(LOG_SHEET_NAME);
    DriveApp.getFileById(ss.getId()).moveTo(folder);
    ss.getSheets()[0].appendRow(
      ['timestamp_utc', 'overall', 'frontend', 'backend', 'prod_health', 'commit', 'run_url']);
  }
  ss.getSheets()[0].appendRow([
    body.timestamp || '', body.overall || '', body.frontend || '',
    body.backend || '', body.prod_health || '', body.commit || '', body.run_url || ''
  ]);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
