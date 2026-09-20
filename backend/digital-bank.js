/**
 * digital-bank.js — OpenThaiAi Digital Bank of Thailand
 * ธนาคารดิจิทัลไทย  |  OTOP / SME / สินค้าอื่นๆ  |  ไทย–ASEAN–สากล
 *
 * Mount: app.use('/api/bank', digitalBankRateLimit, digitalBankRouter)
 * Auth:  requireAuth middleware — all endpoints require Bearer JWT
 *
 * PDPA Gate G1: Legal sign-off required before production money movement.
 */

import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { ApiError, asyncHandler } from './middleware/error-handler.js';
import { validate } from './middleware/validate.js';
import { requireAuth } from './auth.js';
import { audit } from './audit.js';
import { log } from './logger.js';

const router = Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genAccountNumber() {
  // Format: OTB-XXXXXXXX (8 digits)
  const digits = Math.floor(10000000 + Math.random() * 90000000).toString();
  return `OTB-${digits}`;
}

async function getAccount(accountId, userId) {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  if (error || !data) throw ApiError.notFound('Account not found or inactive');
  return data;
}

async function recordTx(accountId, type, amount, currency, description, metadata = {}) {
  const { data: acc } = await supabase
    .from('bank_accounts')
    .select('balance')
    .eq('id', accountId)
    .single();
  const before = parseFloat(acc?.balance ?? 0);
  const delta = ['deposit','transfer_in','interest','refund','staking_out','escrow_release','otai_reward','promptpay_in','fx_buy'].includes(type)
    ? amount : -Math.abs(amount);
  const after = before + delta;
  if (after < 0) throw ApiError.badRequest('Insufficient balance');

  const { error: txErr } = await supabase.from('bank_transactions').insert({
    account_id: accountId, type, amount: Math.abs(amount), currency,
    balance_before: before, balance_after: after, description,
    status: 'completed', metadata,
  });
  if (txErr) throw new ApiError(500, 'TX_WRITE_FAILED', txErr.message);

  const { error: balErr } = await supabase
    .from('bank_accounts')
    .update({ balance: after, last_activity_at: new Date().toISOString() })
    .eq('id', accountId);
  if (balErr) throw new ApiError(500, 'BALANCE_UPDATE_FAILED', balErr.message);

  return after;
}

// ─── KYC ─────────────────────────────────────────────────────────────────────

// Submit KYC application
router.post('/kyc/apply', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, {
    full_name_th:   'required|minlen:2',
    id_type:        'required',
    id_number:      'required|minlen:5',
    date_of_birth:  'required',
    pdpa_consent:   'required',
  });
  const uid = req.user.id;
  if (!req.body.pdpa_consent) throw ApiError.badRequest('PDPA consent is required');

  const { data: existing } = await supabase
    .from('bank_kyc_applications')
    .select('id,status')
    .eq('user_id', uid)
    .in('status', ['pending','under_review','approved'])
    .maybeSingle();
  if (existing?.status === 'approved') throw ApiError.conflict('KYC already approved');
  if (existing?.status === 'pending' || existing?.status === 'under_review')
    throw ApiError.conflict('KYC application already in progress');

  const { data, error } = await supabase.from('bank_kyc_applications').insert({
    user_id: uid,
    full_name_th:  req.body.full_name_th,
    full_name_en:  req.body.full_name_en,
    id_type:       req.body.id_type,
    id_number:     req.body.id_number,
    id_expiry:     req.body.id_expiry,
    date_of_birth: req.body.date_of_birth,
    address_th:    req.body.address_th,
    kyc_level:     req.body.kyc_level || 'basic',
    pdpa_consent_at: new Date().toISOString(),
    selfie_url:    req.body.selfie_url,
    id_front_url:  req.body.id_front_url,
    id_back_url:   req.body.id_back_url,
    business_reg_url: req.body.business_reg_url,
  }).select().single();
  if (error) throw new ApiError(500, 'KYC_CREATE_FAILED', error.message);

  audit.log(req, 'kyc_submitted', { kyc_id: data.id, kyc_level: data.kyc_level });
  log.info('kyc_submitted', { user_id: uid, kyc_id: data.id });
  res.json({ success: true, kyc: data });
}));

// Get own KYC status
router.get('/kyc/status', requireAuth, asyncHandler(async (req, res) => {
  const { data } = await supabase
    .from('bank_kyc_applications')
    .select('id,status,kyc_level,submitted_at,reviewed_at,reviewer_notes')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  res.json({ success: true, kyc: data || null });
}));

// Admin: review KYC
router.patch('/kyc/:id/review', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, { status: 'required' });
  const validStatus = ['approved','rejected','requires_info'];
  if (!validStatus.includes(req.body.status)) throw ApiError.badRequest('Invalid status');

  const { data, error } = await supabase
    .from('bank_kyc_applications')
    .update({
      status:         req.body.status,
      reviewer_id:    req.user.id,
      reviewer_notes: req.body.notes,
      reviewed_at:    new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error || !data) throw ApiError.notFound('KYC application not found');

  audit.log(req, 'kyc_reviewed', { kyc_id: data.id, status: data.status });
  res.json({ success: true, kyc: data });
}));

// ─── Accounts ────────────────────────────────────────────────────────────────

// Open new account
router.post('/accounts/open', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, { account_type: 'required' });
  const uid = req.user.id;

  // KYC must be approved
  const { data: kyc } = await supabase
    .from('bank_kyc_applications')
    .select('id,status')
    .eq('user_id', uid)
    .eq('status', 'approved')
    .maybeSingle();
  if (!kyc) throw ApiError.forbidden('KYC approval required to open an account');

  let accountNumber;
  let tries = 0;
  do {
    accountNumber = genAccountNumber();
    const { data: dup } = await supabase
      .from('bank_accounts').select('id').eq('account_number', accountNumber).maybeSingle();
    if (!dup) break;
    tries++;
  } while (tries < 5);

  const { data, error } = await supabase.from('bank_accounts').insert({
    user_id:        uid,
    kyc_id:         kyc.id,
    account_number: accountNumber,
    account_type:   req.body.account_type,
    currency:       req.body.currency || 'THB',
    promptpay_id:   req.body.promptpay_id,
    is_primary:     req.body.is_primary ?? false,
    interest_rate:  req.body.account_type === 'savings' ? 1.5 : 0,
  }).select().single();
  if (error) throw new ApiError(500, 'ACCOUNT_CREATE_FAILED', error.message);

  audit.log(req, 'account_opened', { account_id: data.id, type: data.account_type });
  log.info('account_opened', { user_id: uid, account_id: data.id });
  res.json({ success: true, account: data });
}));

// List user accounts
router.get('/accounts', requireAuth, asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('user_id', req.user.id)
    .neq('status', 'closed')
    .order('is_primary', { ascending: false });
  if (error) throw new ApiError(500, 'FETCH_FAILED', error.message);
  res.json({ success: true, accounts: data });
}));

// Get account details + recent transactions
router.get('/accounts/:id', requireAuth, asyncHandler(async (req, res) => {
  const account = await getAccount(req.params.id, req.user.id);
  const { data: txns } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('account_id', account.id)
    .order('created_at', { ascending: false })
    .limit(20);
  res.json({ success: true, account, transactions: txns || [] });
}));

// ─── Transactions ─────────────────────────────────────────────────────────────

// Deposit (simulated — real flow goes through Omise PromptPay webhook)
router.post('/accounts/:id/deposit', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, { amount: 'required', description: 'required' });
  const account = await getAccount(req.params.id, req.user.id);
  const amount = parseFloat(req.body.amount);
  if (amount <= 0 || amount > 10000000) throw ApiError.badRequest('Invalid deposit amount');

  const newBalance = await recordTx(account.id, 'deposit', amount, account.currency,
    req.body.description, { source: req.body.source });

  audit.log(req, 'bank_deposit', { account_id: account.id, amount });
  res.json({ success: true, new_balance: newBalance, currency: account.currency });
}));

// Transfer between accounts
router.post('/transfer', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, {
    from_account_id: 'required',
    to_account_id:   'required',
    amount:          'required',
  });
  const uid = req.user.id;
  const amount = parseFloat(req.body.amount);
  if (amount <= 0) throw ApiError.badRequest('Amount must be positive');
  if (req.body.from_account_id === req.body.to_account_id)
    throw ApiError.badRequest('Cannot transfer to the same account');

  const fromAcc = await getAccount(req.body.from_account_id, uid);

  // Destination can belong to anyone (external transfer) or self
  const { data: toAcc } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('id', req.body.to_account_id)
    .eq('status', 'active')
    .maybeSingle();
  if (!toAcc) throw ApiError.notFound('Destination account not found or inactive');

  if (fromAcc.currency !== toAcc.currency && !req.body.accept_fx)
    throw ApiError.badRequest('Currency mismatch — set accept_fx:true to proceed');

  const desc = req.body.description || `Transfer to ${toAcc.account_number}`;
  await recordTx(fromAcc.id, 'transfer_out', amount, fromAcc.currency, desc,
    { to_account: toAcc.account_number });
  await recordTx(toAcc.id, 'transfer_in', amount, toAcc.currency, desc,
    { from_account: fromAcc.account_number });

  audit.log(req, 'bank_transfer', { from: fromAcc.id, to: toAcc.id, amount });
  res.json({ success: true, amount, from_account: fromAcc.account_number,
    to_account: toAcc.account_number });
}));

// PromptPay QR code generation
router.post('/accounts/:id/promptpay-qr', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, { amount: 'required' });
  const account = await getAccount(req.params.id, req.user.id);
  const amount = parseFloat(req.body.amount);
  if (!account.promptpay_id) throw ApiError.badRequest('No PromptPay ID linked to this account');
  if (amount <= 0 || amount > 1000000) throw ApiError.badRequest('Invalid QR amount');

  // EMVCo QR payload (simplified — real impl uses Thai QR payment spec)
  const qrPayload = `00020101021229370016A0000006770101115413${account.promptpay_id}5303764` +
    `54${String(amount.toFixed(2).length).padStart(2,'0')}${amount.toFixed(2)}5802TH5920OpenThaiAi Digital6304`;

  res.json({ success: true, qr_payload: qrPayload, amount, currency: 'THB',
    promptpay_id: account.promptpay_id, expires_in: 900 });
}));

// Transaction history with pagination
router.get('/accounts/:id/transactions', requireAuth, asyncHandler(async (req, res) => {
  const account = await getAccount(req.params.id, req.user.id);
  const page  = parseInt(req.query.page  ?? '1');
  const limit = Math.min(parseInt(req.query.limit ?? '20'), 100);
  const from  = (page - 1) * limit;

  let q = supabase.from('bank_transactions').select('*', { count: 'exact' })
    .eq('account_id', account.id).order('created_at', { ascending: false })
    .range(from, from + limit - 1);
  if (req.query.type) q = q.eq('type', req.query.type);

  const { data, count, error } = await q;
  if (error) throw new ApiError(500, 'FETCH_FAILED', error.message);
  res.json({ success: true, transactions: data, total: count, page, limit });
}));

// ─── FX ──────────────────────────────────────────────────────────────────────

// Get latest FX rates
router.get('/fx/rates', asyncHandler(async (req, res) => {
  const pairs = [
    ['USD','THB'],['EUR','THB'],['CNY','THB'],['JPY','THB'],
    ['SGD','THB'],['MYR','THB'],['HKD','THB'],['GBP','THB'],
  ];
  const rates = [];
  for (const [base, quote] of pairs) {
    const { data } = await supabase.from('bank_fx_rates')
      .select('*').eq('base_currency', base).eq('quote_currency', quote)
      .order('valid_at', { ascending: false }).limit(1).maybeSingle();
    if (data) rates.push(data);
  }
  res.json({ success: true, rates, as_of: new Date().toISOString() });
}));

// Admin: upsert FX rate
router.post('/fx/rates', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, {
    base_currency:  'required',
    quote_currency: 'required',
    buy_rate:       'required',
    sell_rate:      'required',
  });
  const { data, error } = await supabase.from('bank_fx_rates').insert({
    base_currency:  req.body.base_currency.toUpperCase(),
    quote_currency: req.body.quote_currency.toUpperCase(),
    buy_rate:       req.body.buy_rate,
    sell_rate:      req.body.sell_rate,
    source:         req.body.source || 'MANUAL',
    valid_at:       new Date().toISOString(),
  }).select().single();
  if (error) throw new ApiError(500, 'FX_INSERT_FAILED', error.message);
  res.json({ success: true, rate: data });
}));

// ─── Products ────────────────────────────────────────────────────────────────

router.get('/products', asyncHandler(async (req, res) => {
  let q = supabase.from('bank_products').select('*').eq('is_active', true).order('sort_order');
  if (req.query.category) q = q.eq('category', req.query.category);
  const { data, error } = await q;
  if (error) throw new ApiError(500, 'FETCH_FAILED', error.message);
  res.json({ success: true, products: data });
}));

// ─── Cards ───────────────────────────────────────────────────────────────────

router.post('/cards/request', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, { account_id: 'required', card_type: 'required', name_on_card: 'required' });
  const account = await getAccount(req.body.account_id, req.user.id);

  const { data, error } = await supabase.from('bank_cards').insert({
    account_id:   account.id,
    user_id:      req.user.id,
    card_type:    req.body.card_type,
    network:      req.body.network || 'visa',
    name_on_card: req.body.name_on_card.toUpperCase(),
    status:       'pending',
  }).select().single();
  if (error) throw new ApiError(500, 'CARD_CREATE_FAILED', error.message);

  audit.log(req, 'card_requested', { card_id: data.id, type: data.card_type });
  res.json({ success: true, card: data });
}));

router.get('/cards', requireAuth, asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('bank_cards')
    .select('*').eq('user_id', req.user.id).neq('status', 'cancelled')
    .order('created_at', { ascending: false });
  if (error) throw new ApiError(500, 'FETCH_FAILED', error.message);
  res.json({ success: true, cards: data });
}));

router.patch('/cards/:id/status', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, { status: 'required' });
  const allowed = ['active','frozen','cancelled'];
  if (!allowed.includes(req.body.status)) throw ApiError.badRequest('Invalid card status');

  const { data, error } = await supabase.from('bank_cards')
    .update({ status: req.body.status })
    .eq('id', req.params.id).eq('user_id', req.user.id)
    .select().single();
  if (error || !data) throw ApiError.notFound('Card not found');

  audit.log(req, 'card_status_changed', { card_id: data.id, status: data.status });
  res.json({ success: true, card: data });
}));

// ─── Beneficiaries ────────────────────────────────────────────────────────────

router.post('/beneficiaries', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, { nickname: 'required' });
  const { data, error } = await supabase.from('bank_beneficiaries').insert({
    user_id:        req.user.id,
    nickname:       req.body.nickname,
    bank_name:      req.body.bank_name,
    account_number: req.body.account_number,
    promptpay_id:   req.body.promptpay_id,
    account_name:   req.body.account_name,
    currency:       req.body.currency || 'THB',
  }).select().single();
  if (error) throw new ApiError(500, 'BENEFICIARY_CREATE_FAILED', error.message);
  res.json({ success: true, beneficiary: data });
}));

router.get('/beneficiaries', requireAuth, asyncHandler(async (req, res) => {
  const { data } = await supabase.from('bank_beneficiaries')
    .select('*').eq('user_id', req.user.id).order('is_favourite', { ascending: false });
  res.json({ success: true, beneficiaries: data || [] });
}));

// ─── Staking ─────────────────────────────────────────────────────────────────

router.post('/staking/stake', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, { account_id: 'required', product_code: 'required', amount: 'required', term_days: 'required' });
  const account = await getAccount(req.body.account_id, req.user.id);
  const amount = parseFloat(req.body.amount);
  const termDays = parseInt(req.body.term_days);
  if (amount <= 0) throw ApiError.badRequest('Invalid staking amount');

  const { data: product } = await supabase.from('bank_products')
    .select('*').eq('code', req.body.product_code).eq('is_active', true).maybeSingle();
  if (!product) throw ApiError.notFound('Staking product not found');

  const maturesAt = new Date(Date.now() + termDays * 86400000).toISOString();

  await recordTx(account.id, 'staking_in', amount, account.currency,
    `Staking: ${product.name_en} (${termDays}d)`);

  const { data, error } = await supabase.from('bank_staking').insert({
    user_id:      req.user.id,
    account_id:   account.id,
    product_code: product.code,
    staked_amount: amount,
    currency:     account.currency,
    apy:          product.interest_rate,
    term_days:    termDays,
    matures_at:   maturesAt,
  }).select().single();
  if (error) throw new ApiError(500, 'STAKING_CREATE_FAILED', error.message);

  audit.log(req, 'staking_created', { staking_id: data.id, amount, term_days: termDays });
  res.json({ success: true, staking: data });
}));

router.get('/staking', requireAuth, asyncHandler(async (req, res) => {
  const { data } = await supabase.from('bank_staking')
    .select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
  res.json({ success: true, staking: data || [] });
}));

// ─── mBridge Cross-border ────────────────────────────────────────────────────

router.post('/mbridge/transfer', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, {
    from_account_id:  'required',
    send_amount:      'required',
    send_currency:    'required',
    receive_currency: 'required',
    recipient_name:   'required',
    corridor:         'required',
  });
  const account = await getAccount(req.body.from_account_id, req.user.id);
  const amount = parseFloat(req.body.send_amount);
  if (amount <= 0) throw ApiError.badRequest('Invalid send amount');

  // NOTE: mBridge requires BOT API integration (not yet live in production)
  const { data, error } = await supabase.from('bank_mbridge_transfers').insert({
    user_id:          req.user.id,
    from_account_id:  account.id,
    send_amount:      amount,
    send_currency:    req.body.send_currency,
    receive_currency: req.body.receive_currency,
    recipient_name:   req.body.recipient_name,
    recipient_bank:   req.body.recipient_bank,
    recipient_country: req.body.recipient_country,
    corridor:         req.body.corridor,
    status:           'pending',
  }).select().single();
  if (error) throw new ApiError(500, 'MBRIDGE_CREATE_FAILED', error.message);

  audit.log(req, 'mbridge_transfer_initiated', { transfer_id: data.id, corridor: data.corridor });
  log.info('mbridge_transfer', { user_id: req.user.id, transfer_id: data.id, corridor: data.corridor });
  res.json({ success: true, transfer: data, note: 'Pending BOT mBridge settlement (sandbox mode)' });
}));

// ─── AI Financial Advisor ─────────────────────────────────────────────────────

router.post('/advisor/ask', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, { question: 'required|minlen:5' });

  // Load user's account summary for context
  const { data: accounts } = await supabase
    .from('bank_accounts').select('account_type,currency,balance,tier')
    .eq('user_id', req.user.id).neq('status','closed');

  const systemPrompt = `คุณคือที่ปรึกษาการเงินดิจิทัลของ OpenThaiAi ธนาคารดิจิทัลไทยสำหรับ OTOP/SME/สินค้าอื่นๆ ในบริบทไทย–ASEAN–สากล
ข้อมูลบัญชีผู้ใช้: ${JSON.stringify(accounts)}
ตอบเป็นภาษาไทยหรืออังกฤษตามคำถาม ให้คำแนะนำที่เป็นประโยชน์ ซื่อสัตย์ และสอดคล้องกับกฎหมายไทย
ห้ามแนะนำผลิตภัณฑ์นอก OpenThaiAi และห้ามรับประกันผลตอบแทน`;

  let reply;
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: req.body.question }],
    });
    reply = msg.content[0].text;
  } catch {
    reply = 'ขออภัย ระบบที่ปรึกษาชั่วคราวไม่พร้อมให้บริการ กรุณาติดต่อฝ่ายบริการลูกค้า';
  }

  res.json({ success: true, answer: reply });
}));

// ─── Dashboard summary ───────────────────────────────────────────────────────

router.get('/dashboard', requireAuth, asyncHandler(async (req, res) => {
  const uid = req.user.id;
  const [{ data: accounts }, { data: kyc }, { data: staking }, { data: cards }] =
    await Promise.all([
      supabase.from('bank_accounts').select('*').eq('user_id', uid).neq('status','closed'),
      supabase.from('bank_kyc_applications').select('status,kyc_level')
        .eq('user_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('bank_staking').select('staked_amount,apy,matures_at,status')
        .eq('user_id', uid).eq('status','active'),
      supabase.from('bank_cards').select('card_type,network,status').eq('user_id', uid),
    ]);

  const totalBalance = (accounts || []).reduce((s, a) => s + parseFloat(a.balance ?? 0), 0);
  const totalStaked  = (staking  || []).reduce((s, a) => s + parseFloat(a.staked_amount ?? 0), 0);

  res.json({
    success: true,
    kyc_status:    kyc?.status || 'none',
    kyc_level:     kyc?.kyc_level || null,
    total_balance: totalBalance,
    total_staked:  totalStaked,
    accounts:      accounts || [],
    active_cards:  (cards || []).filter(c => c.status === 'active').length,
    staking:       staking || [],
  });
}));

export default router;
