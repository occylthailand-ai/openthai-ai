#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OpenThai AI — 4-Way Memory Sync
Memory → OneDrive → Google Drive → GitHub

วิธีใช้:
  python memory-sync.py           # ซิงค์ครั้งเดียวแล้วออก
  python memory-sync.py --watch   # ซิงค์ทุก 5 นาที (watch mode)

ติดตั้ง dependencies:
  pip install google-auth google-auth-oauthlib google-api-python-client watchdog
"""

import os
import sys
import json
import time
import shutil
import socket
import logging
import argparse
import traceback
from datetime import datetime
from pathlib import Path

# ────────────────────────────────────────────────────────────
# CONFIG — แก้ค่าเหล่านี้ให้ตรงกับเครื่องของคุณ
# ────────────────────────────────────────────────────────────

MEMORY_DIR    = r"C:\Users\occyl\.claude\projects\C--OPENTHAI-AI\memory"
ONEDRIVE_DIR  = r"C:\Users\occyl\OneDrive - Personal\OPENTHAI AI\memory"
GDRIVE_FOLDER = "17CLEUEwXX-fwu-mDMjwcDp-Ks03kaN-C"   # folder ID จาก log
CREDENTIALS   = r"C:\Users\occyl\.claude\projects\C--OPENTHAI-AI\credentials.json"
TOKEN_FILE    = r"C:\Users\occyl\.claude\projects\C--OPENTHAI-AI\token.json"

SYNC_INTERVAL = 300   # วินาที (5 นาที)
MAX_RETRIES   = 5     # จำนวนครั้งที่ retry สูงสุด
CHUNK_SIZE    = 256 * 1024   # 256 KB per chunk (ลด chunk เพื่อป้องกัน timeout)

SCOPES = ["https://www.googleapis.com/auth/drive.file"]

# ────────────────────────────────────────────────────────────
# LOGGING — รองรับภาษาไทย (UTF-8)
# ────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
# Force UTF-8 stdout (แก้ปัญหา □□□ ในภาษาไทย)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

log = logging.getLogger("memory-sync")


def banner():
    print("=" * 54)
    print("  OpenThai AI — 4-Way Memory Sync")
    print("  Memory → OneDrive → Google Drive → (watch)")
    print("=" * 54)


# ────────────────────────────────────────────────────────────
# GOOGLE DRIVE AUTH
# ────────────────────────────────────────────────────────────

def get_drive_service():
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build

        creds = None
        token_path = Path(TOKEN_FILE)

        if token_path.exists():
            creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                log.info("Google Drive: กำลัง refresh token...")
                for attempt in range(MAX_RETRIES):
                    try:
                        creds.refresh(Request())
                        break
                    except Exception as e:
                        wait = 2 ** attempt
                        log.warning(f"Google Drive: refresh ล้มเหลว ({e}) — รอ {wait}s")
                        time.sleep(wait)
                else:
                    log.error("Google Drive: refresh token ล้มเหลวทุกครั้ง — ต้อง login ใหม่")
                    creds = None

            if not creds:
                if not Path(CREDENTIALS).exists():
                    log.error(f"ไม่พบ credentials.json ที่ {CREDENTIALS}")
                    return None
                flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS), SCOPES)
                creds = flow.run_local_server(port=0)

            token_path.write_text(creds.to_json(), encoding="utf-8")

        service = build("drive", "v3", credentials=creds)
        log.info("[OK] Google Drive: authenticated")
        return service

    except ImportError:
        log.error("ยังไม่ได้ติดตั้ง: pip install google-auth google-auth-oauthlib google-api-python-client")
        return None
    except Exception as e:
        log.error(f"Google Drive auth ล้มเหลว: {e}")
        return None


# ────────────────────────────────────────────────────────────
# RETRY WRAPPER — แก้ WinError 10054
# ────────────────────────────────────────────────────────────

def with_retry(fn, description="operation"):
    """รัน fn พร้อม exponential backoff retry สำหรับ network errors"""
    for attempt in range(MAX_RETRIES):
        try:
            return fn()
        except (ConnectionResetError, ConnectionAbortedError,
                BrokenPipeError, socket.error, OSError) as e:
            # WinError 10054 = connection forcibly closed by remote
            if attempt < MAX_RETRIES - 1:
                wait = 2 ** attempt  # 1, 2, 4, 8, 16 วินาที
                log.warning(f"[{description}] Network error (attempt {attempt+1}/{MAX_RETRIES}): {e} — retry ใน {wait}s")
                time.sleep(wait)
            else:
                log.error(f"[{description}] ล้มเหลวทุก {MAX_RETRIES} ครั้ง: {e}")
                raise
        except Exception as e:
            log.error(f"[{description}] Error: {e}")
            raise


# ────────────────────────────────────────────────────────────
# SYNC: MEMORY → ONEDRIVE
# ────────────────────────────────────────────────────────────

def sync_to_onedrive():
    src = Path(MEMORY_DIR)
    dst = Path(ONEDRIVE_DIR)

    if not src.exists():
        log.warning(f"OneDrive: ไม่พบ source directory: {src}")
        return 0

    if not dst.exists():
        dst.mkdir(parents=True, exist_ok=True)
        log.info(f"OneDrive: สร้างโฟลเดอร์ {dst}")

    count = 0
    for src_file in src.rglob("*"):
        if src_file.is_file():
            rel = src_file.relative_to(src)
            dst_file = dst / rel
            dst_file.parent.mkdir(parents=True, exist_ok=True)

            src_mtime = src_file.stat().st_mtime
            dst_mtime = dst_file.stat().st_mtime if dst_file.exists() else 0

            if src_mtime > dst_mtime:
                shutil.copy2(src_file, dst_file)
                count += 1
                log.info(f"  OneDrive: copied {rel}")

    log.info(f"  OneDrive: {count} ไฟล์ sync เสร็จ (OneDrive app จะ upload อัตโนมัติ)")
    return count


# ────────────────────────────────────────────────────────────
# SYNC: MEMORY → GOOGLE DRIVE
# ────────────────────────────────────────────────────────────

def get_drive_files(service, folder_id):
    """ดึงรายการไฟล์ใน Google Drive folder"""
    files = {}
    page_token = None
    while True:
        def _list():
            return service.files().list(
                q=f"'{folder_id}' in parents and trashed=false",
                fields="nextPageToken, files(id, name, modifiedTime)",
                pageToken=page_token,
            ).execute()

        result = with_retry(_list, "drive.list")
        for f in result.get("files", []):
            files[f["name"]] = f
        page_token = result.get("nextPageToken")
        if not page_token:
            break
    return files


def upload_file(service, local_path: Path, folder_id: str, existing_id=None):
    """Upload หรือ update ไฟล์ใน Google Drive พร้อม retry"""
    from googleapiclient.http import MediaFileUpload

    mime = "application/octet-stream"
    if local_path.suffix == ".json":
        mime = "application/json"
    elif local_path.suffix in (".txt", ".md"):
        mime = "text/plain"

    media = MediaFileUpload(
        str(local_path),
        mimetype=mime,
        chunksize=CHUNK_SIZE,
        resumable=True,   # resumable upload — ทน network drop ได้ดีกว่า
    )

    if existing_id:
        def _update():
            return service.files().update(
                fileId=existing_id,
                media_body=media,
            ).execute()
        return with_retry(_update, f"drive.update:{local_path.name}")
    else:
        meta = {"name": local_path.name, "parents": [folder_id]}
        def _create():
            return service.files().create(
                body=meta,
                media_body=media,
                fields="id",
            ).execute()
        return with_retry(_create, f"drive.create:{local_path.name}")


def sync_to_gdrive(service):
    if not service:
        log.warning("Google Drive: ข้าม (ไม่มี service)")
        return 0

    src = Path(MEMORY_DIR)
    if not src.exists():
        log.warning(f"Google Drive: ไม่พบ source directory: {src}")
        return 0

    log.info(f"  Google Drive folder ID: {GDRIVE_FOLDER}")

    existing = get_drive_files(service, GDRIVE_FOLDER)
    count = 0

    for local_file in src.rglob("*"):
        if not local_file.is_file():
            continue

        name = local_file.name
        existing_file = existing.get(name)

        should_upload = True
        if existing_file:
            # เปรียบเทียบ modified time
            from datetime import timezone
            drive_mtime_str = existing_file.get("modifiedTime", "")
            if drive_mtime_str:
                from datetime import datetime as dt
                drive_mtime = dt.fromisoformat(
                    drive_mtime_str.replace("Z", "+00:00")
                ).timestamp()
                local_mtime = local_file.stat().st_mtime
                should_upload = local_mtime > drive_mtime

        if should_upload:
            try:
                upload_file(
                    service,
                    local_file,
                    GDRIVE_FOLDER,
                    existing_id=existing_file["id"] if existing_file else None,
                )
                count += 1
                log.info(f"  Google Drive: uploaded {name}")
            except Exception as e:
                log.error(f"  Google Drive: ล้มเหลว {name}: {e}")

    log.info(f"  Google Drive: {count} ไฟล์ sync เสร็จ")
    return count


# ────────────────────────────────────────────────────────────
# MAIN SYNC CYCLE
# ────────────────────────────────────────────────────────────

def run_sync(service):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print()
    log.info("=" * 50)
    log.info(f"  Sync รอบใหม่ — {now}")

    log.info("  Memory → OneDrive...")
    sync_to_onedrive()

    log.info("  Memory → Google Drive...")
    sync_to_gdrive(service)

    log.info("  ระบบยังคง up-to-date อยู่")


def main():
    parser = argparse.ArgumentParser(description="OpenThai AI 4-Way Memory Sync")
    parser.add_argument("--watch", action="store_true", help="รันแบบ continuous (ทุก 5 นาที)")
    parser.add_argument("--interval", type=int, default=SYNC_INTERVAL, help="ช่วงเวลา sync (วินาที)")
    args = parser.parse_args()

    banner()
    service = get_drive_service()

    if args.watch:
        log.info(f"  Watching: {MEMORY_DIR}")
        log.info(f"  กำลัง watch อยู่... (Ctrl+C เพื่อหยุด)")
        while True:
            try:
                run_sync(service)
            except KeyboardInterrupt:
                log.info("หยุดการทำงาน")
                break
            except Exception as e:
                log.error(f"Sync error: {e}")
                log.debug(traceback.format_exc())
            time.sleep(args.interval)
    else:
        run_sync(service)
        log.info("เสร็จสิ้น")


if __name__ == "__main__":
    main()
