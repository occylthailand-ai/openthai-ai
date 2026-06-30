// ─── Cloud Drive Backup — สำรองข้อมูลผู้ใช้ขึ้น Google Drive + OneDrive ──────────
//  ต่อยอดจาก Cloud Sync (มือถือ+คอม+memory+cloud) ให้ครบ "กูเกิ้ลไดรฟ์ + วันไดรฟ์"
//  เก็บไฟล์ JSON ก้อนเดียวต่อผู้ใช้ใน "app folder" เฉพาะของแอป (แยกจากไฟล์ส่วนตัว):
//    · Google Drive → appDataFolder (scope drive.appdata) — ผู้ใช้มองไม่เห็น/ลบเองยาก
//    · OneDrive     → special/approot (scope Files.ReadWrite.AppFolder)
//  flow: connect (OAuth) → เก็บ refresh_token ฝั่ง server → backup/restore โดยขอ
//        access_token สดทุกครั้งจาก refresh_token (ไม่ต้องเก็บ access_token)
//
//  ENV ที่ต้องตั้ง:
//    Google : GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_DRIVE_REDIRECT_URI
//    OneDrive: MS_CLIENT_ID, MS_CLIENT_SECRET, MS_REDIRECT_URI (+ MS_TENANT ถ้าไม่ใช่ common)

const BACKUP_NAME = 'openthai-ai-sync.json';

export const DRIVE_PROVIDERS = ['google', 'onedrive'];

const G_SCOPE  = 'openid email https://www.googleapis.com/auth/drive.appdata';
const MS_SCOPE = 'offline_access User.Read Files.ReadWrite.AppFolder';

export function driveConfigured(provider) {
  if (provider === 'google')   return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  if (provider === 'onedrive') return !!(process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET);
  return false;
}

// ── redirect URIs (ต้องตรงกับที่ลงทะเบียนใน Google/Azure console) ──────────────
function googleRedirect() {
  return process.env.GOOGLE_DRIVE_REDIRECT_URI
    || (process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/sync/drive/google/callback`
                                : 'http://localhost:8000/api/sync/drive/google/callback');
}
function msRedirect() {
  return process.env.MS_REDIRECT_URI
    || (process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/sync/drive/onedrive/callback`
                                : 'http://localhost:8000/api/sync/drive/onedrive/callback');
}
const msAuthority = () => `https://login.microsoftonline.com/${process.env.MS_TENANT || 'common'}`;

// ── สร้าง OAuth consent URL ────────────────────────────────────────────────────
export function driveAuthUrl(provider, state) {
  if (!driveConfigured(provider)) return null;
  if (provider === 'google') {
    const p = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: googleRedirect(),
      response_type: 'code',
      scope: G_SCOPE,
      access_type: 'offline',
      prompt: 'consent',            // บังคับ consent เพื่อให้ได้ refresh_token เสมอ
      include_granted_scopes: 'true',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
  }
  if (provider === 'onedrive') {
    const p = new URLSearchParams({
      client_id: process.env.MS_CLIENT_ID,
      redirect_uri: msRedirect(),
      response_type: 'code',
      scope: MS_SCOPE,
      response_mode: 'query',
      state,
    });
    return `${msAuthority()}/oauth2/v2.0/authorize?${p}`;
  }
  return null;
}

// ── แลก code → tokens ({ access_token, refresh_token, expires_in }) ────────────
export async function driveExchange(provider, code) {
  if (provider === 'google') {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: googleRedirect(), grant_type: 'authorization_code',
      }),
    });
    const t = await r.json();
    if (t.error) throw new Error(t.error_description || t.error);
    return t;
  }
  if (provider === 'onedrive') {
    const r = await fetch(`${msAuthority()}/oauth2/v2.0/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: process.env.MS_CLIENT_ID, client_secret: process.env.MS_CLIENT_SECRET,
        redirect_uri: msRedirect(), grant_type: 'authorization_code', scope: MS_SCOPE,
      }),
    });
    const t = await r.json();
    if (t.error) throw new Error(t.error_description || t.error);
    return t;
  }
  throw new Error('unknown provider');
}

// ── ใช้ refresh_token ขอ access_token สด → { access_token, refresh_token? } ────
export async function driveRefresh(provider, refreshToken) {
  if (provider === 'google') {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken, client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET, grant_type: 'refresh_token',
      }),
    });
    const t = await r.json();
    if (t.error) throw new Error(t.error_description || t.error);
    return t; // google ไม่หมุน refresh_token — ใช้ของเดิมต่อได้
  }
  if (provider === 'onedrive') {
    const r = await fetch(`${msAuthority()}/oauth2/v2.0/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken, client_id: process.env.MS_CLIENT_ID,
        client_secret: process.env.MS_CLIENT_SECRET, grant_type: 'refresh_token', scope: MS_SCOPE,
      }),
    });
    const t = await r.json();
    if (t.error) throw new Error(t.error_description || t.error);
    return t; // MS อาจหมุน refresh_token — caller ควรเก็บอันใหม่ถ้ามี
  }
  throw new Error('unknown provider');
}

// ── อีเมลบัญชีที่เชื่อม (ไว้โชว์ในหน้า UI ว่าเชื่อมบัญชีไหน) ─────────────────────
export async function driveAccountEmail(provider, access) {
  try {
    if (provider === 'google') {
      const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${access}` } });
      const d = await r.json();
      return d.email || null;
    }
    if (provider === 'onedrive') {
      const r = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${access}` } });
      const d = await r.json();
      return d.userPrincipalName || d.mail || null;
    }
  } catch { /* ignore */ }
  return null;
}

// ── Google Drive (appDataFolder) ───────────────────────────────────────────────
async function googleFindFile(access) {
  const q = encodeURIComponent(`name='${BACKUP_NAME}'`);
  const r = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)&pageSize=1`,
    { headers: { Authorization: `Bearer ${access}` } });
  if (!r.ok) throw new Error(`google list ${r.status}: ${await r.text()}`);
  const d = await r.json();
  return d.files?.[0]?.id || null;
}
async function googleUpload(access, content) {
  const existing = await googleFindFile(access);
  const boundary = `otai${Date.now()}`;
  const metadata = existing ? {} : { name: BACKUP_NAME, parents: ['appDataFolder'] };
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
  const url = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing}?uploadType=multipart&fields=id`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id`;
  const r = await fetch(url, {
    method: existing ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!r.ok) throw new Error(`google upload ${r.status}: ${await r.text()}`);
  return r.json();
}
async function googleDownload(access) {
  const id = await googleFindFile(access);
  if (!id) return null;
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, { headers: { Authorization: `Bearer ${access}` } });
  if (!r.ok) throw new Error(`google download ${r.status}: ${await r.text()}`);
  return r.text();
}

// ── OneDrive (special/approot) ─────────────────────────────────────────────────
const ONEDRIVE_PATH = `https://graph.microsoft.com/v1.0/me/drive/special/approot:/${BACKUP_NAME}:/content`;
async function onedriveUpload(access, content) {
  const r = await fetch(ONEDRIVE_PATH, {
    method: 'PUT', headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' }, body: content,
  });
  if (!r.ok) throw new Error(`onedrive upload ${r.status}: ${await r.text()}`);
  return r.json();
}
async function onedriveDownload(access) {
  const r = await fetch(ONEDRIVE_PATH, { headers: { Authorization: `Bearer ${access}` } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`onedrive download ${r.status}: ${await r.text()}`);
  return r.text();
}

// ── unified upload/download ────────────────────────────────────────────────────
export async function driveUpload(provider, access, content) {
  if (provider === 'google')   return googleUpload(access, content);
  if (provider === 'onedrive') return onedriveUpload(access, content);
  throw new Error('unknown provider');
}
export async function driveDownload(provider, access) {
  if (provider === 'google')   return googleDownload(access);
  if (provider === 'onedrive') return onedriveDownload(access);
  throw new Error('unknown provider');
}
