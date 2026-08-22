"""
Batch OCR Extraction Agent — OpenThai AI
ดึงข้อความภาษาไทย+อังกฤษจากรูปภาพทั้งหมดในโฟลเดอร์

ใช้งาน:
  python extract_images_text.py
  python extract_images_text.py --recursive --preset invoice
  python extract_images_text.py --assets E:\path\to\images --out result.md
  python extract_images_text.py --psm 6 --oem 1 --dpi 400

Presets (--preset):
  auto      ค่าเริ่มต้น — PSM 3, OEM 1 (LSTM), DPI 300
  invoice   ใบกำกับภาษี / e-Tax — PSM 6, DPI 400, Otsu + denoise
  label     ฉลากสินค้า / OTOP — PSM 11 (sparse), DPI 300
  dense     เอกสารข้อความแน่น — PSM 4, DPI 300
  oneline   บรรทัดเดียว (เช่น ชื่อสินค้า) — PSM 7

เสิร์ฟ: กลุ่ม 1 (ผู้ผลิต/OTOP) + กลุ่ม 2 (คนกลาง ใบกำกับ) + กลุ่ม 5 (นักพัฒนา)
"""

from __future__ import annotations

import argparse
import shutil
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

# ── ค่าเริ่มต้น ────────────────────────────────────────────────────────────────

DEFAULT_ASSETS = Path(r"E:\OPENTHAI AI\docs\assets")
DEFAULT_OUTPUT = Path(r"E:\OPENTHAI AI\docs\extracted_image_texts.md")
IMAGE_EXTS = ("*.png", "*.jpg", "*.jpeg", "*.webp", "*.bmp", "*.tif", "*.tiff")


# ── Document presets ──────────────────────────────────────────────────────────
#
# PSM (Page Segmentation Mode):
#   3  = Fully automatic (default) — ดีสำหรับเอกสารทั่วไป
#   4  = Single column — หน้าที่มีหลายบรรทัดแต่ 1 คอลัมน์
#   6  = Single uniform block — กล่องข้อความเดียว เช่น ใบกำกับ
#   7  = Single text line — บรรทัดเดียว
#   11 = Sparse text — ข้อความกระจัดกระจาย เช่น ฉลาก
#   13 = Raw line — บรรทัดเดียว ไม่ segmentation
#
# OEM (OCR Engine Mode):
#   0 = Legacy engine
#   1 = LSTM only — แนะนำสำหรับภาษาไทย (แม่นยำกว่า)
#   3 = Default / best available (usually LSTM)

@dataclass
class OCRPreset:
    psm: int
    oem: int
    target_dpi: int
    denoise: bool
    extra_config: str = ""
    description: str = ""


PRESETS: dict[str, OCRPreset] = {
    "auto": OCRPreset(
        psm=3, oem=1, target_dpi=300, denoise=False,
        description="ค่าเริ่มต้น — ใช้กับเอกสารทั่วไป",
    ),
    "invoice": OCRPreset(
        psm=6, oem=1, target_dpi=400, denoise=True,
        extra_config="-c preserve_interword_spaces=1 -c tessedit_char_blacklist=|",
        description="ใบกำกับภาษี / e-Tax Invoice — PSM 6, 400 DPI, Otsu+denoise",
    ),
    "label": OCRPreset(
        psm=11, oem=1, target_dpi=300, denoise=False,
        extra_config="-c preserve_interword_spaces=1",
        description="ฉลากสินค้า / OTOP — PSM 11 sparse text",
    ),
    "dense": OCRPreset(
        psm=6, oem=1, target_dpi=300, denoise=True,
        extra_config="-c preserve_interword_spaces=1",
        description="เอกสารข้อความแน่น — PSM 6 + Otsu (สัญญา รายงาน)",
    ),
    "oneline": OCRPreset(
        psm=7, oem=1, target_dpi=300, denoise=False,
        description="บรรทัดเดียว เช่น ชื่อสินค้า ป้าย",
    ),
}


# ── ตรวจสอบ dependencies ──────────────────────────────────────────────────────

def _check_deps() -> None:
    missing = []
    if not shutil.which("tesseract"):
        missing.append(
            "Tesseract binary ไม่พบ\n"
            "  ติดตั้ง: winget install UB-Mannheim.TesseractOCR\n"
            "  (เลือก 'Thai' และ 'English' language data ตอนติดตั้ง)\n"
            "  ตรวจ:    tesseract --list-langs  (ต้องมี 'tha' และ 'eng')"
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
        print("[ERROR] ขาด dependencies:\n")
        for m in missing:
            print(" •", m)
        sys.exit(1)


# ── ตรวจ language pack ────────────────────────────────────────────────────────

def _check_lang(lang: str) -> str:
    import subprocess
    result = subprocess.run(["tesseract", "--list-langs"], capture_output=True, text=True)
    available = result.stdout + result.stderr
    parts = lang.split("+")
    missing = [p for p in parts if p not in available]
    if missing:
        print(f"[WARN] Tesseract ไม่มี language pack: {missing}")
        print("  ดาวน์โหลด tessdata: https://github.com/tesseract-ocr/tessdata_best")
        print("  วางไว้ใน: C:\\Program Files\\Tesseract-OCR\\tessdata\\")
        fallback = "+".join(p for p in parts if p in available) or "eng"
        print(f"  ใช้ fallback: {fallback}")
        return fallback
    return lang


# ── Preprocessing ─────────────────────────────────────────────────────────────

def _upscale_to_dpi(image, target_dpi: int):
    """
    ขยายภาพให้ได้ DPI เป้าหมาย
    Tesseract ทำงานดีที่สุดที่ 300-400 DPI
    ภาพ DPI ต่ำ (<150) จะอ่านภาษาไทยผิดพลาดสูง
    """
    from PIL import Image
    current_dpi = image.info.get("dpi", (72, 72))
    current_dpi_x = current_dpi[0] if isinstance(current_dpi, tuple) else current_dpi
    if current_dpi_x < target_dpi:
        scale = target_dpi / max(current_dpi_x, 72)
        new_w = int(image.width * scale)
        new_h = int(image.height * scale)
        image = image.resize((new_w, new_h), Image.LANCZOS)
    return image


def _binarize_otsu(image):
    """
    Otsu's binarization — แยกข้อความดำออกจากพื้นหลังขาว
    ดีกว่า grayscale ธรรมดาสำหรับเอกสารที่มีพื้นหลังไม่สม่ำเสมอ
    """
    import numpy as np
    from PIL import Image
    gray = image.convert("L")
    arr = np.array(gray)
    # Otsu threshold
    hist, bins = np.histogram(arr.flatten(), 256, [0, 256])
    total = arr.size
    sum_total = np.dot(np.arange(256), hist)
    sum_bg = 0.0
    w_bg = 0.0
    best_thresh = 0
    best_var = 0.0
    for t in range(256):
        w_bg += hist[t]
        if w_bg == 0:
            continue
        w_fg = total - w_bg
        if w_fg == 0:
            break
        sum_bg += t * hist[t]
        mean_bg = sum_bg / w_bg
        mean_fg = (sum_total - sum_bg) / w_fg
        var = w_bg * w_fg * (mean_bg - mean_fg) ** 2
        if var > best_var:
            best_var = var
            best_thresh = t
    binary = arr > best_thresh
    result = np.where(binary, 255, 0).astype(np.uint8)
    return Image.fromarray(result)


def _denoise(image):
    """ลด noise เล็ก ๆ ด้วย median filter"""
    from PIL import ImageFilter
    return image.filter(ImageFilter.MedianFilter(size=3))


def _preprocess(image, preset: OCRPreset):
    """Pipeline การปรับภาพก่อน OCR ตาม preset"""
    from PIL import ImageEnhance, ImageFilter, ImageOps
    # 1. แปลงเป็น RGB ก่อน (กรณีภาพ CMYK หรือ P mode)
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    # 2. ขยาย DPI
    image = _upscale_to_dpi(image, preset.target_dpi)
    # 3. Grayscale
    image = ImageOps.grayscale(image)
    # 4. Otsu binarization (สำหรับ invoice/เอกสารพิมพ์)
    if preset.denoise:
        image = _binarize_otsu(image)
        image = _denoise(image)
    else:
        # เพิ่ม contrast + sharpen สำหรับ preset ทั่วไป
        image = ImageEnhance.Contrast(image).enhance(1.5)
        image = image.filter(ImageFilter.SHARPEN)
    return image


# ── รวบรวมไฟล์ภาพ ─────────────────────────────────────────────────────────────

def _collect_images(assets_dir: Path, recursive: bool) -> list[Path]:
    images: list[Path] = []
    for ext in IMAGE_EXTS:
        if recursive:
            images.extend(assets_dir.rglob(ext))
        else:
            images.extend(assets_dir.glob(ext))
    return sorted(set(images))


# ── OCR หลัก ──────────────────────────────────────────────────────────────────

def _build_tess_config(preset: OCRPreset) -> str:
    """สร้าง config string ส่งให้ pytesseract"""
    parts = [f"--psm {preset.psm}", f"--oem {preset.oem}"]
    if preset.extra_config:
        parts.append(preset.extra_config)
    return " ".join(parts)


def process_all_images(
    assets_dir: Path,
    output_file: Path,
    lang: str = "tha+eng",
    recursive: bool = False,
    do_preprocess: bool = True,
    preset: OCRPreset = PRESETS["auto"],
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
        print("       รูปแบบที่รองรับ:", " ".join(e.lstrip("*") for e in IMAGE_EXTS))
        return

    tess_config = _build_tess_config(preset)
    print(f"[START] พบ {len(image_files)} ไฟล์")
    print(f"        lang={lang} | config='{tess_config}' | preprocess={do_preprocess}")
    print(f"        preset: {preset.description}")

    results: list[str] = []
    success = 0
    failed = 0
    empty = 0
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    for idx, img_path in enumerate(image_files, start=1):
        rel = img_path.relative_to(assets_dir) if recursive else Path(img_path.name)
        print(f"  [{idx:3}/{len(image_files)}] {rel}", end=" ", flush=True)
        try:
            img = Image.open(img_path)
            orig_size = img.size
            if do_preprocess:
                img = _preprocess(img, preset)
            text = pytesseract.image_to_string(img, lang=lang, config=tess_config).strip()
            char_count = len(text)
            status = "ok" if char_count > 0 else "empty"
            if status == "empty":
                empty += 1
            else:
                success += 1
            print(f"→ {char_count:,} ตัวอักษร [{status}]")
            results.append(
                f"## ไฟล์ที่ {idx}: `{rel}`\n\n"
                f"> ขนาดภาพ: {orig_size[0]}×{orig_size[1]}px"
                f" | ตัวอักษร: {char_count:,}"
                f" | สถานะ: `{status}`"
                f" | config: `{tess_config}`\n\n"
                f"```text\n{text if text else '(ว่าง — ไม่พบข้อความ)'}\n```\n\n---\n"
            )
        except Exception as exc:
            print(f"→ ❌ {exc}")
            failed += 1
            results.append(
                f"## ไฟล์ที่ {idx}: `{rel}`\n\n"
                f"> ❌ ข้อผิดพลาด: `{exc}`\n\n---\n"
            )

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(
            f"# ผลการสกัดข้อความจากรูปภาพ — OpenThai AI OCR Log\n\n"
            f"| รายการ | ค่า |\n|--------|-----|\n"
            f"| สร้างเมื่อ | {timestamp} |\n"
            f"| โฟลเดอร์ต้นทาง | `{assets_dir}` |\n"
            f"| ภาษา OCR | `{lang}` |\n"
            f"| Tesseract config | `{tess_config}` |\n"
            f"| Preset | {preset.description} |\n"
            f"| สำเร็จ (มีข้อความ) | {success} |\n"
            f"| ว่าง (ไม่พบข้อความ) | {empty} |\n"
            f"| ล้มเหลว | {failed} |\n"
            f"| รวมทั้งหมด | {len(image_files)} |\n\n"
            "---\n\n"
        )
        f.writelines(results)

    print(f"\n[DONE] สำเร็จ {success} | ว่าง {empty} | ล้มเหลว {failed} | รวม {len(image_files)}")
    print(f"       ผลลัพธ์: {output_file}")

    # แนะนำ preset อื่นถ้ามีภาพว่างมาก
    if empty > len(image_files) // 2:
        print("\n[TIP] มีภาพว่างมาก ลองเปลี่ยน preset:")
        for name, p in PRESETS.items():
            print(f"  --preset {name:<10} {p.description}")


# ── CLI ───────────────────────────────────────────────────────────────────────

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Batch OCR สำหรับ OpenThai AI — ดึงข้อความ TH+EN จากรูปภาพ",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="\n".join(
            f"  --preset {name:<10} {pr.description}"
            for name, pr in PRESETS.items()
        ),
    )
    p.add_argument("--assets", type=Path, default=DEFAULT_ASSETS,
                   help=f"โฟลเดอร์รูปภาพ (default: {DEFAULT_ASSETS})")
    p.add_argument("--out", type=Path, default=DEFAULT_OUTPUT,
                   help=f"ไฟล์ Markdown ผลลัพธ์ (default: {DEFAULT_OUTPUT})")
    p.add_argument("--lang", default="tha+eng",
                   help="Tesseract language string (default: tha+eng)")
    p.add_argument("--recursive", action="store_true",
                   help="ค้นหารูปในโฟลเดอร์ย่อยด้วย")
    p.add_argument("--no-preprocess", action="store_true",
                   help="ข้ามการปรับภาพก่อน OCR")
    p.add_argument("--preset", choices=list(PRESETS.keys()), default="invoice",
                   help="เลือก preset ตามประเภทเอกสาร (default: invoice)")
    # Override แต่ละค่า (ใช้แทน preset ถ้าระบุ)
    p.add_argument("--psm", type=int,
                   help="Tesseract PSM mode 0-13 (ข้าม preset)")
    p.add_argument("--oem", type=int, choices=[0, 1, 2, 3],
                   help="Tesseract OEM mode (0=legacy, 1=LSTM, 3=auto)")
    p.add_argument("--dpi", type=int,
                   help="Target DPI สำหรับขยายภาพ (ข้าม preset)")
    return p.parse_args()


if __name__ == "__main__":
    _check_deps()
    args = _parse_args()

    preset = PRESETS[args.preset]
    # Override ด้วย flag ที่ระบุมาตรง ๆ (ถ้ามี)
    if args.psm is not None:
        preset = OCRPreset(
            psm=args.psm,
            oem=args.oem if args.oem is not None else preset.oem,
            target_dpi=args.dpi if args.dpi else preset.target_dpi,
            denoise=preset.denoise,
            extra_config=preset.extra_config,
            description=f"custom (PSM {args.psm})",
        )
    elif args.dpi:
        preset = OCRPreset(
            psm=preset.psm, oem=preset.oem,
            target_dpi=args.dpi, denoise=preset.denoise,
            extra_config=preset.extra_config,
            description=preset.description + f" + DPI {args.dpi}",
        )

    process_all_images(
        assets_dir=args.assets,
        output_file=args.out,
        lang=args.lang,
        recursive=args.recursive,
        do_preprocess=not args.no_preprocess,
        preset=preset,
    )
