// Single source of truth for the middleman/distributor business types — shared by the signup portal
// (/portals/middleman) and the middleman dashboard (/middleman/dashboard). The `value` is what gets
// stored on the portal lead (form_data.business_type); th/en/zh are display-only labels.
// businessTypeLabel(value, lang) localizes a stored value for display, falling back to the raw value.
export const BUSINESS_TYPES = [
  { value: 'ตัวแทนจำหน่าย (Distributor)', th: 'ตัวแทนจำหน่าย', en: 'Distributor', zh: '经销商' },
  { value: 'ผู้ค้าส่ง (Wholesaler)',      th: 'ผู้ค้าส่ง',      en: 'Wholesaler',  zh: '批发商' },
  { value: 'นายหน้า (Broker)',            th: 'นายหน้า',        en: 'Broker',      zh: '经纪人' },
  { value: 'ตัวแทนขายต่อ (Reseller)',     th: 'ตัวแทนขายต่อ',   en: 'Reseller',    zh: '代理转售商' },
  { value: 'อื่นๆ',                        th: 'อื่นๆ',          en: 'Other',       zh: '其他' },
];

export function businessTypeLabel(value, lang) {
  const m = BUSINESS_TYPES.find((b) => b.value === value);
  if (m) return m[lang] || m.th || value;
  return value || '';
}
