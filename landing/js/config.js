// ========================================================
// OpenThai AI — App Config
// ตั้งค่า Supabase ตรงนี้ก่อน deploy
// ========================================================

const OPENTHAI_CONFIG = {

  // --- Supabase (สร้างฟรีได้ที่ supabase.com) ---
  supabase: {
    url:     'YOUR_SUPABASE_URL',       // เช่น https://xxxx.supabase.co
    anonKey: 'YOUR_SUPABASE_ANON_KEY'  // จาก Settings → API
  },

  // --- PromptPay ---
  promptpay: {
    number: '0812345678',   // เบอร์โทร หรือ เลขบัตรประชาชน 13 หลัก
    name:   'OpenThai AI'
  },

  // --- Plans ---
  plans: {
    pro: {
      price: 149,
      label: 'Pro',
      features: ['ไม่จำกัดคอนเทนต์', 'สินค้าทุกประเภท', 'AI Critic Score', 'เลือก Hook เอง']
    },
    business: {
      price: 299,
      label: 'Business',
      features: ['ทุกอย่างใน Pro', 'API Access', 'Team 5 คน', 'Priority Support']
    }
  },

  // --- Free tier ---
  freeLimit: 3
};
