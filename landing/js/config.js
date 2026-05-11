// ========================================================
// OpenThai AI — App Config
// ตั้งค่า Supabase ตรงนี้ก่อน deploy
// ========================================================

const OPENTHAI_CONFIG = {

  // --- Supabase (สร้างฟรีได้ที่ supabase.com) ---
  supabase: {
    url:     'https://tpeskbbhuuqztwyllnli.supabase.co',
    anonKey: 'sb_publishable_w1csh8WAomyLN_nVzTiAOA_yZXWmoys'
  },

  // --- PromptPay ---
  promptpay: {
    number: '0972560801',
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
