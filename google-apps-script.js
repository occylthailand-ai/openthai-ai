/**
 * Openthai.ai — Google Sheets Automation
 * วางไว้ใน Google Sheets → Extensions → Apps Script
 * 
 * ทำหน้าที่:
 * 1. สร้าง Lead database structure
 * 2. Lead scoring อัตโนมัติ
 * 3. ส่ง LINE Notify เมื่อมี conversion
 * 4. MRR tracking dashboard
 * 5. Trigger n8n workflows
 */

const CONFIG = {
  LINE_TOKEN: 'YOUR_LINE_NOTIFY_TOKEN',
  N8N_WEBHOOK_BASE: 'https://your-n8n.railway.app/webhook',
  SHEET_LEADS: 'Leads',
  SHEET_MRR: 'MRR_Tracker',
  SHEET_FUNNEL: 'Funnel_Stats'
};

// ============================================================
// SETUP: สร้าง Sheets structure
// ============================================================
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Sheet 1: Leads
  let leads = ss.getSheetByName(CONFIG.SHEET_LEADS);
  if (!leads) leads = ss.insertSheet(CONFIG.SHEET_LEADS);
  
  const leadHeaders = [
    'email', 'name', 'source', 'product',
    'signup_date', 'lead_score', 'stage',
    'trial_used', 'converted', 'plan', 'mrr',
    'conversion_date', 'last_email_date', 'notes'
  ];
  leads.getRange(1, 1, 1, leadHeaders.length).setValues([leadHeaders]);
  leads.getRange(1, 1, 1, leadHeaders.length)
    .setBackground('#D4AF37')
    .setFontColor('#0a0a0f')
    .setFontWeight('bold');
  
  // Sheet 2: MRR Tracker
  let mrr = ss.getSheetByName(CONFIG.SHEET_MRR);
  if (!mrr) mrr = ss.insertSheet(CONFIG.SHEET_MRR);
  
  const mrrHeaders = ['month', 'new_mrr', 'churned', 'total_mrr', 'total_customers'];
  mrr.getRange(1, 1, 1, mrrHeaders.length).setValues([mrrHeaders]);
  
  // Sheet 3: Funnel Stats
  let funnel = ss.getSheetByName(CONFIG.SHEET_FUNNEL);
  if (!funnel) funnel = ss.insertSheet(CONFIG.SHEET_FUNNEL);
  
  const funnelHeaders = [
    'date', 'signups', 'email1_opens', 'email2_opens',
    'trial_starts', 'conversions', 'conversion_rate', 'revenue'
  ];
  funnel.getRange(1, 1, 1, funnelHeaders.length).setValues([funnelHeaders]);
  
  SpreadsheetApp.getUi().alert('✅ Setup เสร็จแล้ว! Sheets ทั้งหมดพร้อมใช้งาน');
}

// ============================================================
// LEAD SCORING: คำนวณ score เมื่อมีการอัปเดต
// ============================================================
function calculateLeadScore(row) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_LEADS);
  const data = sheet.getRange(row, 1, 1, 14).getValues()[0];
  
  const [email, name, source, product, signup_date, ,stage, trial_used, converted] = data;
  
  let score = 10; // base score สำหรับ signup
  
  // Source scoring
  if (source === 'tiktok') score += 20;
  else if (source === 'facebook') score += 15;
  else if (source === 'organic') score += 10;
  
  // Stage scoring
  const stageScores = {
    'new_signup': 10,
    'email1_opened': 20,
    'email2_opened': 30,
    'trial_started': 50,
    'nurturing_complete': 40,
    'paying_customer': 100
  };
  score += stageScores[stage] || 0;
  
  // Trial usage
  score += Number(trial_used) * 5;
  
  // Converted bonus
  if (converted === true || converted === 'TRUE') score += 50;
  
  // Update score in sheet
  sheet.getRange(row, 6).setValue(score);
  
  // Color code by score
  const scoreCell = sheet.getRange(row, 6);
  if (score >= 80) scoreCell.setBackground('#1a4d1a'); // dark green
  else if (score >= 50) scoreCell.setBackground('#4d3d00'); // dark gold
  else scoreCell.setBackground('#4d1a1a'); // dark red
  
  return score;
}

// ============================================================
// AUTO-TRIGGER: รันเมื่อมีการแก้ไข Sheet
// ============================================================
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== CONFIG.SHEET_LEADS) return;
  
  const row = e.range.getRow();
  const col = e.range.getColumn();
  if (row === 1) return; // Skip header
  
  // Recalculate score เมื่อมีการแก้ไข
  calculateLeadScore(row);
  
  // ถ้าเพิ่งเปลี่ยนเป็น converted = TRUE
  if (col === 9 && (e.value === 'TRUE' || e.value === true)) {
    handleConversion(row);
  }
}

// ============================================================
// CONVERSION HANDLER: เมื่อมี lead convert
// ============================================================
function handleConversion(row) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_LEADS);
  const data = sheet.getRange(row, 1, 1, 14).getValues()[0];
  const [email, name, , , , , , , , plan, mrr] = data;
  
  // Update conversion date
  sheet.getRange(row, 12).setValue(new Date().toLocaleString('th-TH'));
  
  // LINE Notify
  sendLineNotify(
    `💰 CONVERSION!\n👤 ${name}\n📧 ${email}\n📦 Plan: ${plan}\n💵 MRR +฿${mrr}/เดือน`
  );
  
  // Update MRR tracker
  updateMRRTracker(Number(mrr));
  
  // Trigger n8n upsell sequence
  triggerN8N('openthai-payment', { email, name, plan, mrr });
}

// ============================================================
// MRR TRACKER
// ============================================================
function updateMRRTracker(newMRR) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mrrSheet = ss.getSheetByName(CONFIG.SHEET_MRR);
  const currentMonth = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM');
  
  const data = mrrSheet.getDataRange().getValues();
  let monthRow = -1;
  
  // หา row ของเดือนนี้
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === currentMonth) {
      monthRow = i + 1;
      break;
    }
  }
  
  if (monthRow === -1) {
    // สร้าง row ใหม่สำหรับเดือนนี้
    const lastRow = mrrSheet.getLastRow() + 1;
    mrrSheet.getRange(lastRow, 1).setValue(currentMonth);
    mrrSheet.getRange(lastRow, 2).setValue(newMRR);
    mrrSheet.getRange(lastRow, 5).setValue(1);
    
    // คำนวณ total MRR
    const prevTotal = lastRow > 2 ? Number(mrrSheet.getRange(lastRow-1, 4).getValue()) : 0;
    mrrSheet.getRange(lastRow, 4).setValue(prevTotal + newMRR);
  } else {
    // อัปเดต row ที่มีอยู่
    const currentNew = Number(mrrSheet.getRange(monthRow, 2).getValue());
    const currentTotal = Number(mrrSheet.getRange(monthRow, 4).getValue());
    const currentCustomers = Number(mrrSheet.getRange(monthRow, 5).getValue());
    
    mrrSheet.getRange(monthRow, 2).setValue(currentNew + newMRR);
    mrrSheet.getRange(monthRow, 4).setValue(currentTotal + newMRR);
    mrrSheet.getRange(monthRow, 5).setValue(currentCustomers + 1);
  }
}

// ============================================================
// FUNNEL STATS: อัปเดตสถิติ funnel รายวัน
// ============================================================
function updateDailyFunnelStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const leadsSheet = ss.getSheetByName(CONFIG.SHEET_LEADS);
  const funnelSheet = ss.getSheetByName(CONFIG.SHEET_FUNNEL);
  
  const today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  const allLeads = leadsSheet.getDataRange().getValues();
  
  let todaySignups = 0, todayConversions = 0, todayRevenue = 0;
  
  for (let i = 1; i < allLeads.length; i++) {
    const signupDate = allLeads[i][4] ? 
      Utilities.formatDate(new Date(allLeads[i][4]), 'Asia/Bangkok', 'yyyy-MM-dd') : '';
    
    if (signupDate === today) todaySignups++;
    
    const convDate = allLeads[i][11] ?
      Utilities.formatDate(new Date(allLeads[i][11]), 'Asia/Bangkok', 'yyyy-MM-dd') : '';
    
    if (convDate === today) {
      todayConversions++;
      todayRevenue += Number(allLeads[i][10]) || 0;
    }
  }
  
  const convRate = todaySignups > 0 ? 
    ((todayConversions / todaySignups) * 100).toFixed(1) + '%' : '0%';
  
  const newRow = funnelSheet.getLastRow() + 1;
  funnelSheet.getRange(newRow, 1, 1, 8).setValues([[
    today, todaySignups, '-', '-',
    '-', todayConversions, convRate, todayRevenue
  ]]);
}

// ============================================================
// SUMMARY REPORT: ส่งรายงานรายวันทาง LINE
// ============================================================
function sendDailyReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const leadsSheet = ss.getSheetByName(CONFIG.SHEET_LEADS);
  const allLeads = leadsSheet.getDataRange().getValues();
  
  let totalLeads = 0, totalConverted = 0, totalMRR = 0;
  let todaySignups = 0;
  const today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  
  for (let i = 1; i < allLeads.length; i++) {
    if (!allLeads[i][0]) continue;
    totalLeads++;
    
    const signupDate = allLeads[i][4] ?
      Utilities.formatDate(new Date(allLeads[i][4]), 'Asia/Bangkok', 'yyyy-MM-dd') : '';
    if (signupDate === today) todaySignups++;
    
    if (allLeads[i][8] === 'TRUE' || allLeads[i][8] === true) {
      totalConverted++;
      totalMRR += Number(allLeads[i][10]) || 0;
    }
  }
  
  const convRate = totalLeads > 0 ? ((totalConverted/totalLeads)*100).toFixed(1) : 0;
  
  // Validation targets check
  const w1Target = todaySignups >= 7 ? '✅' : '⚠️'; // 50 signups/7 days
  const mrrStatus = totalMRR >= 1500 ? '✅' : `🎯 ${totalMRR}/฿1,500`;
  
  const report = `
📊 Openthai.ai Daily Report
📅 ${today}

👥 Leads วันนี้: ${todaySignups} ${w1Target}
📈 Total Leads: ${totalLeads}
💰 Total Converted: ${totalConverted}
📊 Conversion Rate: ${convRate}%
💵 Total MRR: ฿${totalMRR.toLocaleString()} ${mrrStatus}

🎯 W1 Targets:
- Signups: ${todaySignups * 7}/50 (projected)
- MRR: ${mrrStatus}`;

  sendLineNotify(report);
}

// ============================================================
// UTILITIES
// ============================================================
function sendLineNotify(message) {
  if (!CONFIG.LINE_TOKEN || CONFIG.LINE_TOKEN === 'YOUR_LINE_NOTIFY_TOKEN') return;
  
  UrlFetchApp.fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + CONFIG.LINE_TOKEN },
    payload: { message: message }
  });
}

function triggerN8N(endpoint, data) {
  try {
    UrlFetchApp.fetch(`${CONFIG.N8N_WEBHOOK_BASE}/${endpoint}`, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(data)
    });
  } catch(e) {
    Logger.log('n8n trigger failed: ' + e.message);
  }
}

// ============================================================
// SETUP TRIGGERS: รันใน Apps Script → Triggers
// ============================================================
function setupTriggers() {
  // ลบ triggers เก่าก่อน
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  
  // Daily report ทุกวัน 12:00
  ScriptApp.newTrigger('sendDailyReport')
    .timeBased()
    .everyDays(1)
    .atHour(12)
    .create();
  
  // Update funnel stats ทุกวัน 23:00
  ScriptApp.newTrigger('updateDailyFunnelStats')
    .timeBased()
    .everyDays(1)
    .atHour(23)
    .create();
    
  SpreadsheetApp.getUi().alert('✅ Triggers ตั้งค่าเรียบร้อย!\n- Daily Report: 12:00\n- Funnel Stats: 23:00');
}

// ============================================================
// MENU: เพิ่ม custom menu ใน Sheets
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🤖 Openthai.ai')
    .addItem('⚙️ Setup Sheets', 'setupSheets')
    .addItem('⏰ Setup Triggers', 'setupTriggers')
    .addSeparator()
    .addItem('📊 Send Daily Report Now', 'sendDailyReport')
    .addItem('📈 Update Funnel Stats', 'updateDailyFunnelStats')
    .addToUi();
}
