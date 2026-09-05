# ADB Developer Options — ชุดคำสั่งอ้างอิง

อ้างอิงจากภาพหน้าจอ Developer options และไฟล์ bugreport  
รุ่นอุปกรณ์: **V2427T / BP2A.250605.031.A3**

---

## เตรียมเครื่อง

เปิด USB debugging ใน Developer options แล้วเสียบสาย USB

```bash
adb devices
adb get-state
adb shell getprop ro.product.model
adb shell getprop ro.build.fingerprint
```

---

## สร้าง / ดึง Bug Report

```bash
# วิธีมาตรฐาน (ได้ไฟล์ zip)
adb bugreport ./bugreport-$(date +%Y%m%d-%H%M%S).zip

# ถ้าเครื่องสร้างช้า ใช้ wait-for-device ก่อน
adb wait-for-device
adb bugreport ./bugreport-V2427T.zip
```

ดึงของที่เครื่องสร้างค้างไว้แล้ว:

```bash
adb shell ls -l /bugreports /data/user_de/0/com.android.shell/files/bugreports 2>/dev/null
adb pull /bugreports ./
```

---

## เลือกแอปดีบัก / Wait for debugger

```bash
# ดูแพ็กเกจที่ติดตั้ง
adb shell pm list packages -3

# ตั้งแอปที่จะดีบัก
adb shell am set-debug-app -w --persistent com.example.app

# ยกเลิก
adb shell am clear-debug-app

# ดูค่าปัจจุบัน
adb shell settings get global debug_app
adb shell settings get global wait_for_debugger
```

> `-w` = รอ debugger ก่อนรัน (ตรงกับสวิตช์ "รอโปรแกรมแก้ไขข้อบกพร่อง")

---

## Verify apps over USB

```bash
adb shell settings get global verifier_verify_adb_installs
adb shell settings put global verifier_verify_adb_installs 1   # เปิด
adb shell settings put global verifier_verify_adb_installs 0   # ปิด
```

---

## Verify bytecode of debuggable apps

```bash
adb shell getprop dalvik.vm.dexopt-flags
adb shell settings get global art_verifier_verify_debuggable
```

> ค่านี้ควบคุมโดย ART — ไม่แนะนำให้ปิดถ้าไม่ได้ดีบัก bytecode โดยตรง

---

## Logger buffer size

ค่าปัจจุบันในภาพ: **256 K ต่อบัฟเฟอร์**

```bash
# ดูขนาดปัจจุบัน
adb logcat -g

# ตั้งทุกบัฟเฟอร์เป็น 1M (ชั่วคราว จนกว่าจะรีบูต)
adb logcat -G 1M

# ตั้งทีละชนิด
adb logcat -G 256K -b main
adb logcat -G 256K -b system
adb logcat -G 256K -b crash
adb logcat -G 1M  -b events
```

---

## GPU debug layers

```bash
# เปิดชั้น GPU debug สำหรับแพ็กเกจ
adb shell settings put global enable_gpu_debug_layers 1
adb shell settings put global gpu_debug_app com.example.app
adb shell settings put global gpu_debug_layers VK_LAYER_KHRONOS_validation

# ปิด
adb shell settings put global enable_gpu_debug_layers 0
adb shell settings delete global gpu_debug_app
adb shell settings delete global gpu_debug_layers
```

---

## Feature flags

```bash
adb shell device_config list
adb shell pm get-privapp-permissions com.android.settings
```

---

## Log ที่ใช้คู่กับ bugreport

```bash
# log แบบต่อเนื่อง
adb logcat -v threadtime

# เฉพาะ crash / ANR
adb logcat -b crash -b system *:E

# ล้างแล้วจับใหม่
adb logcat -c
adb logcat -v threadtime > device.log

# ANR / traces
adb pull /data/anr ./anr
adb shell ls -l /data/tombstones
adb pull /data/tombstones ./tombstones
```

---

## ติดตั้ง / รันแอปแบบดีบัก

```bash
adb install -r -t -g app-debug.apk
adb shell am start -D -n com.example.app/.MainActivity
adb jdwp
```

> `-D` = รอ debugger ตามสวิตช์ Wait for debugger

---

## ส่งออกข้อมูลระบบ (ย่อจาก bugreport)

```bash
adb shell dumpsys window      > window.txt
adb shell dumpsys activity    > activity.txt
adb shell dumpsys meminfo     > meminfo.txt
adb shell dumpsys batterystats > batterystats.txt
adb shell dumpsys gfxinfo com.example.app > gfxinfo.txt
adb shell top -n 1 -m 20
```

---

## ลำดับใช้งานจริงทีละขั้น

```bash
adb devices
adb bugreport ./bugreport-V2427T.zip
adb logcat -g
```

ส่งชื่อแพ็กเกจแอปที่กำลังดีบักมาได้ เพื่อรับชุดคำสั่งเจาะแอปนั้น  
(`set-debug-app`, `start -D`, logcat กรองแพ็กเกจ)
