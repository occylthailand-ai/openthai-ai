"""
OpenThai Computer Assistant
ควบคุมเมาส์และคีย์บอร์ดอัตโนมัติบน Windows
รันด้วย: python assistant.py
"""

import sys
import time
import subprocess

# ติดตั้ง dependencies อัตโนมัติ
def install(pkg):
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', pkg, '-q'])

try:
    import pyautogui
    import pyperclip
except ImportError:
    print('กำลังติดตั้ง dependencies...')
    install('pyautogui')
    install('pyperclip')
    install('pillow')
    import pyautogui
    import pyperclip

pyautogui.FAILSAFE = True   # เลื่อนเมาส์ไปมุมซ้ายบนเพื่อหยุดฉุกเฉิน
pyautogui.PAUSE   = 0.15    # หน่วงเล็กน้อยระหว่าง action


# ─── ฟังก์ชันพื้นฐาน ──────────────────────────────────────────────────────────

def click(x, y, delay=0.3):
    """คลิกซ้ายที่ตำแหน่ง x, y"""
    pyautogui.moveTo(x, y, duration=0.4)
    time.sleep(delay)
    pyautogui.click()

def right_click(x, y):
    """คลิกขวาที่ตำแหน่ง x, y"""
    pyautogui.moveTo(x, y, duration=0.4)
    pyautogui.rightClick()

def double_click(x, y):
    """ดับเบิลคลิกที่ตำแหน่ง x, y"""
    pyautogui.moveTo(x, y, duration=0.4)
    pyautogui.doubleClick()

def move(x, y, speed=0.4):
    """เลื่อนเมาส์ไปที่ x, y"""
    pyautogui.moveTo(x, y, duration=speed)

def drag(x1, y1, x2, y2):
    """ลากจาก x1,y1 ไป x2,y2"""
    pyautogui.moveTo(x1, y1, duration=0.3)
    pyautogui.dragTo(x2, y2, duration=0.5, button='left')

def scroll(amount, x=None, y=None):
    """เลื่อน scroll (บวก=ขึ้น, ลบ=ลง)"""
    if x and y:
        pyautogui.moveTo(x, y, duration=0.2)
    pyautogui.scroll(amount)

def where():
    """บอกตำแหน่งเมาส์ปัจจุบัน"""
    pos = pyautogui.position()
    print(f'เมาส์อยู่ที่: x={pos.x}, y={pos.y}')
    return pos.x, pos.y


# ─── พิมพ์ข้อความ ─────────────────────────────────────────────────────────────

def type_text(text, delay=0.05):
    """พิมพ์ข้อความภาษาอังกฤษ"""
    pyautogui.typewrite(text, interval=delay)

def type_thai(text):
    """พิมพ์ข้อความภาษาไทย (ผ่าน clipboard)"""
    pyperclip.copy(text)
    time.sleep(0.2)
    pyautogui.hotkey('ctrl', 'v')

def type_any(text, delay=0.05):
    """พิมพ์ได้ทุกภาษา (auto-detect)"""
    try:
        text.encode('ascii')
        type_text(text, delay)
    except UnicodeEncodeError:
        type_thai(text)

def clear_and_type(text):
    """ลบข้อความเก่า แล้วพิมพ์ใหม่"""
    pyautogui.hotkey('ctrl', 'a')
    time.sleep(0.1)
    type_any(text)


# ─── คีย์ลัด ──────────────────────────────────────────────────────────────────

def press(key):
    """กดปุ่ม เช่น 'enter', 'tab', 'escape', 'f5'"""
    pyautogui.press(key)

def hotkey(*keys):
    """กดปุ่มพร้อมกัน เช่น hotkey('ctrl','c')"""
    pyautogui.hotkey(*keys)

def enter():       pyautogui.press('enter')
def tab():         pyautogui.press('tab')
def escape():      pyautogui.press('escape')
def copy():        pyautogui.hotkey('ctrl', 'c')
def paste():       pyautogui.hotkey('ctrl', 'v')
def select_all():  pyautogui.hotkey('ctrl', 'a')
def undo():        pyautogui.hotkey('ctrl', 'z')


# ─── Screenshot ───────────────────────────────────────────────────────────────

def screenshot(filename='screenshot.png'):
    """ถ่ายภาพหน้าจอ"""
    img = pyautogui.screenshot()
    img.save(filename)
    print(f'บันทึกภาพที่: {filename}')
    return img

def get_color(x, y):
    """ดูสีพิกเซลที่ตำแหน่ง x, y"""
    return pyautogui.pixel(x, y)


# ─── Wait helpers ─────────────────────────────────────────────────────────────

def wait(seconds):
    """รอ N วินาที"""
    time.sleep(seconds)

def countdown(seconds, msg='เริ่มใน'):
    """นับถอยหลังก่อนทำงาน"""
    for i in range(seconds, 0, -1):
        print(f'{msg} {i}...', end='\r')
        time.sleep(1)
    print()


# ─── Main demo ────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print('=' * 50)
    print('  OpenThai Computer Assistant พร้อมใช้งาน')
    print('  เลื่อนเมาส์ไปมุมซ้ายบนเพื่อหยุดฉุกเฉิน')
    print('=' * 50)
    print()
    print('ฟังก์ชันที่ใช้ได้:')
    print('  click(x, y)          — คลิกซ้าย')
    print('  right_click(x, y)    — คลิกขวา')
    print('  double_click(x, y)   — ดับเบิลคลิก')
    print('  move(x, y)           — เลื่อนเมาส์')
    print('  type_any("ข้อความ")  — พิมพ์ทุกภาษา')
    print('  type_thai("ภาษาไทย") — พิมพ์ภาษาไทย')
    print('  scroll(3)            — เลื่อนขึ้น 3')
    print('  press("enter")       — กดปุ่ม')
    print('  hotkey("ctrl","s")   — กดพร้อมกัน')
    print('  where()              — ดูตำแหน่งเมาส์')
    print('  screenshot()         — ถ่ายภาพหน้าจอ')
    print('  wait(2)              — รอ 2 วินาที')
    print()
    print('ตัวอย่าง: เปิด Python แล้วพิมพ์:')
    print('  from assistant import *')
    print('  where()  # ดูตำแหน่ง')
    print('  click(500, 300)')
    print('  type_any("สวัสดีครับ")')
