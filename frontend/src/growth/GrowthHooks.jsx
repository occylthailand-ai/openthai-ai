import React from 'react';
import LiveSocialProof from './LiveSocialProof';
import StreakToast from './StreakToast';
import ExitIntentModal from './ExitIntentModal';
import WelcomeSpinWheel from './WelcomeSpinWheel';

// รวม growth hooks ทั้งหมดไว้ที่เดียว — mount ในหน้าที่ traffic สูง
//   • WelcomeSpinWheel : ผู้ใช้ใหม่ (1 ครั้ง/เครื่อง) — โชว์ก่อน
//   • ExitIntentModal  : ตอนกำลังจะออก (1 ครั้ง/เซสชัน) — ไม่ทับ spin wheel (เช็ค __otaiModalOpen)
//   • StreakToast      : นับวันกลับมาใช้ + เครดิตโบนัส
//   • LiveSocialProof  : FOMO ป๊อปอัปสด
export default function GrowthHooks() {
  return (
    <>
      <WelcomeSpinWheel />
      <ExitIntentModal />
      <StreakToast />
      <LiveSocialProof />
    </>
  );
}
