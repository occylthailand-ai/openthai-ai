/**
 * Openthai.ai — Waitlist Google Apps Script
 * 
 * วิธีใช้งาน:
 * 1. ไปที่ Google Sheets → Extensions → Apps Script
 * 2. Copy โค้ดนี้ไปวาง
 * 3. Deploy → New deployment → Web app
 * 4. Execute as: Me, Who has access: Anyone
 * 5. Copy URL ไปใส่ใน landing page (แทน YOUR_GOOGLE_APPS_SCRIPT_URL)
 */

// Configuration
const SHEET_NAME = 'Waitlist';
const NOTIFICATION_EMAIL = 'your-email@gmail.com'; // เปลี่ยนเป็นอีเมลของคุณ

/**
 * Handle POST requests from landing page
 */
function doPost(e) {
  try {
    // Parse incoming data
    const data = JSON.parse(e.postData.contents);
    
    // Get or create sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      // Add headers
      sheet.appendRow([
        'Timestamp',
        'Name',
        'Email',
        'Phone',
        'Role',
        'PDPA Consent',
        'Source',
        'Status'
      ]);
      // Format header row
      sheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#FF6B35').setFontColor('white');
    }
    
    // Add new row
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.name || '',
      data.email || '',
      data.phone || '',
      data.role || '',
      data.pdpa ? 'Yes' : 'No',
      data.source || 'landing_page',
      'New'
    ]);
    
    // Send notification email
    sendNotificationEmail(data);
    
    // Return success
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Registered successfully' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Return error
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET requests (for testing)
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ 
      status: 'Openthai.ai Waitlist API is running',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Send notification email for new signup
 */
function sendNotificationEmail(data) {
  const subject = `🎉 New Waitlist Signup: ${data.name}`;
  const body = `
    New signup for Openthai.ai!
    
    Name: ${data.name}
    Email: ${data.email}
    Phone: ${data.phone}
    Role: ${data.role}
    PDPA Consent: ${data.pdpa ? 'Yes' : 'No'}
    Timestamp: ${data.timestamp}
    Source: ${data.source}
    
    ---
    Openthai.ai Waitlist System
  `;
  
  try {
    MailApp.sendEmail(NOTIFICATION_EMAIL, subject, body);
  } catch (e) {
    console.log('Email notification failed:', e);
  }
}

/**
 * Get waitlist statistics
 */
function getWaitlistStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) return { total: 0, byRole: {} };
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const stats = {
    total: rows.length,
    byRole: {},
    byDate: {}
  };
  
  rows.forEach(row => {
    const role = row[4] || 'unknown';
    const date = new Date(row[0]).toISOString().split('T')[0];
    
    stats.byRole[role] = (stats.byRole[role] || 0) + 1;
    stats.byDate[date] = (stats.byDate[date] || 0) + 1;
  });
  
  return stats;
}

/**
 * Daily report trigger
 */
function sendDailyReport() {
  const stats = getWaitlistStats();
  const subject = `📊 Openthai.ai Daily Report - ${new Date().toLocaleDateString('th-TH')}`;
  const body = `
    Openthai.ai Waitlist Daily Report
    
    Total Signups: ${stats.total}
    
    By Role:
    ${Object.entries(stats.byRole).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
    
    ---
    Openthai.ai Automated Report
  `;
  
  MailApp.sendEmail(NOTIFICATION_EMAIL, subject, body);
}
