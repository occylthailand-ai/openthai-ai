"""
Batch OCR Extraction Agent — OpenThai AI
ดึงข้อความภาษาไทย+อังกฤษจากรูปภาพทั้งหมดในโฟลเดอร์

ใช้งาน:
  python extract_images_text.py
  python extract_images_text.py --assets E:\path\to\images --out E:\path\to\output.md
  python extract_images_text.py --recursive

เสิร์ฟ: กลุ่ม 1 (ผู้ผลิต/OTOP) + กลุ่ม 2 (คนกลาง) + กลุ่ม 5 (ชุมชน/นักพัฒนา)
ใช้กับ: เอกสารสแกน, ใบกำกับภาษี, ฉลากสินค้า, รูปภาพ e-Tax
"""

from __future__ import annotations

import argparse
import shutil
import sys
from datetime import datetime
from pathlib import Path

# ── ตรวจสอบ dependencies ──────────────────────────────────────────────────────

def _check_deps() -> None:
    missing = []
    if not shutil.which("tesseract"):
        missing.append(
            "Tesseract binary ไม่พบ\n"
            "  ติดตั้ง: winget install UB-Mannheim.TesseractOCR\n"
            "  จากนั้นตรวจ: tesseract --list-langs  (ต้องมีทั้ง 'tha' และ 'eng')"
        )
    try:
        import pytesseract  # noqa: F401
    except ImportError:
        missing.append("pytesseract ไม่พบ — รัน: pip install pytesseract pillow")
    try:
        from PIL import Image  # noqa: F401
    except ImportError:
        missing.append("Pillow ไม่พบ — รัน: pip install pillow")
    if missing:
        print("[ERROR] ขาด dependencies ต่อไปนี้:\n")
        for m in missing:
            print(" •", m)
        sys.exit(1)


# ── ค่าเริ่มต้น ────────────────────────────────────────────────────────────────

DEFAULT_ASSETS = Path(r"E:\OPENTHAI AI\docs\assets")
DEFAULT_OUTPUT = Path(r"E:\OPENTHAI AI\docs\extracted_image_texts.md")
IMAGE_EXTS = ("*.png", "*.jpg", "*.jpeg", "*.webp", "*.bmp", "*.tif", "*.tiff")


# ── ฟังก์ชันช่วย ──────────────────────────────────────────────────────────────

def _preprocess(image):
    """ปรับภาพเบื้องต้นก่อน OCR เพื่อความแม่นยำสูงขึ้น"""
    from PIL import ImageFilter, ImageOps
    img = ImageOps.grayscale(image)
    img = img.filter(ImageFilter.SHARPEN)
    return img


def _check_lang(lang: str) -> str:
    """ตรวจว่า Tesseract มี language pack ที่ต้องการ"""
    import subprocess
    result = subprocess.run(
        ["tesseract", "--list-langs"],
        capture_output=True, text=True
    )
    available = result.stdout + result.stderr
    parts = lang.split("+")
    missing = [p for p in parts if p not in available]
    if missing:
        print(f"[WARN] Tesseract ไม่มี language pack: {missing}")
        print("  ดาวน์โหลด: https://github.com/tesseract-ocr/tessdata")
        print("  ติดตั้งผ่าน: winget install UB-Mannheim.TesseractOCR (เลือก Thai+English)")
        fallback = "+".join(p for p in parts if p in available) or "eng"
        print(f"  ใช้ fallback: {fallback}")
        return fallback
    return lang


def _collect_images(assets_dir: Path, recursive: bool) -> list[Path]:
    images: list[Path] = []
    for ext in IMAGE_EXTS:
        if recursive:
            images.extend(assets_dir.rglob(ext))
        else:
            images.extend(assets_dir.glob(ext))
    return sorted(set(images))


# ── ฟังก์ชันหลัก ──────────────────────────────────────────────────────────────

def process_all_images(
    assets_dir: Path,
    output_file: Path,
    lang: str = "tha+eng",
    recursive: bool = False,
    preprocess: bool = True,
) -> None:
    from PIL import Image
    import pytesseract

    if not assets_dir.exists():
        assets_dir.mkdir(parents=True, exist_ok=True)
        print(f"[INFO] สร้างโฟลเดอร์ {assets_dir}")
        print("       วางไฟล์รูปภาพลงโฟลเดอร์นี้แล้วรันซ้ำ")
        return

    lang = _check_lang(lang)
    image_files = _collect_images(assets_dir, recursive)

    if not image_files:
        print(f"[WARN] ไม่พบไฟล์รูปภาพใน {assets_dir}")
        print("       รูปแบบที่รองรับ: .png .jpg .jpeg .webp .bmp .tif .tiff")
        return

    print(f"[START] พบรูปภาพ {len(image_files)} ไฟล์ | lang={lang} | preprocess={preprocess}")

    results: list[str] = []
    success = 0
    failed = 0
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    for idx, img_path in enumerate(image_files, start=1):
        rel = img_path.relative_to(assets_dir) if recursive else Path(img_path.name)
        print(f"  [{idx:3}/{len(image_files)}] {rel}", end=" ", flush=True)
        try:
            img = Image.open(img_path)
            if preprocess:
                img = _preprocess(img)
            text = pytesseract.image_to_string(img, lang=lang).strip()
            char_count = len(text)
            print(f"→ {char_count} ตัวอักษร ✓")
            results.append(
                f"## ไฟล์ที่ {idx}: `{rel}`\n\n"
                f"> ขนาดภาพ: {img.size[0]}×{img.size[1]}px | ตัวอักษร: {char_count}\n\n"
                f"```text\n{text}\n```\n\n---\n"
            )
            success += 1
        except Exception as exc:
            print(f"→ ❌ {exc}")
            results.append(
                f"## ไฟล์ที่ {idx}: `{rel}`\n\n"
                f"> ❌ ข้อผิดพลาด: {exc}\n\n---\n"
            )
            failed += 1

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(
            f"# ผลการสกัดข้อความจากรูปภาพ — OpenThai AI OCR Log\n\n"
            f"**สร้างเมื่อ:** {timestamp}  \n"
            f"**โฟลเดอร์ต้นทาง:** `{assets_dir}`  \n"
            f"**ภาษา OCR:** `{lang}`  \n"
            f"**จำนวนไฟล์:** {len(image_files)} (สำเร็จ {success} / ล้มเหลว {failed})\n\n"
            "---\n\n"
        )
        f.writelines(results)

    print(f"\n[DONE] สำเร็จ {success} / ล้มเหลว {failed} / รวม {len(image_files)}")
    print(f"       ผลลัพธ์: {output_file}")


# ── CLI ───────────────────────────────────────────────────────────────────────

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Batch OCR สำหรับ OpenThai AI — ดึงข้อความ TH+EN จากรูปภาพ"
    )
    p.add_argument(
        "--assets", type=Path, default=DEFAULT_ASSETS,
        help=f"โฟลเดอร์รูปภาพ (default: {DEFAULT_ASSETS})"
    )
    p.add_argument(
        "--out", type=Path, default=DEFAULT_OUTPUT,
        help=f"ไฟล์ Markdown ผลลัพธ์ (default: {DEFAULT_OUTPUT})"
    )
    p.add_argument(
        "--lang", default="tha+eng",
        help="Tesseract language string (default: tha+eng)"
    )
    p.add_argument(
        "--recursive", action="store_true",
        help="ค้นหารูปในโฟลเดอร์ย่อยด้วย"
    )
    p.add_argument(
        "--no-preprocess", action="store_true",
        help="ข้ามการปรับภาพก่อน OCR (เร็วขึ้น แต่แม่นยำน้อยกว่า)"
    )
    return p.parse_args()


if __name__ == "__main__":
    _check_deps()
    args = _parse_args()
    process_all_images(
        assets_dir=args.assets,
        output_file=args.out,
        lang=args.lang,
        recursive=args.recursive,
        preprocess=not args.no_preprocess,
    )
