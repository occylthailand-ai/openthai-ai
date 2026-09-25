/**
 * bank-phase2.js — OpenThaiAi ธนาคารดิจิทัลไทย Phase 2
 * สินเชื่อ · ประกัน · การลงทุน · ชำระบิล · การค้าต่างประเทศ · เงินเดือน
 * OTOP/SME/สินค้าอื่นๆ · ไทย–ASEAN–สากล
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
let _supabase = null;
let _anthropic = null;

function getDb() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new ApiError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase ยังไม่ได้ตั้งค่า');
    _supabase = createClient(url, key);
  }
  return _supabase;
}

function getAI() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

async function getAccount(accountId, userId) {
  const { data, error } = await getDb()
    .from('bank_accounts').select('*')
    .eq('id', accountId).eq('user_id', userId).eq('status', 'active').single();
  if (error || !data) throw ApiError.notFound('Account not found or inactive');
  return data;
}

async function recordTx(accountId, type, amount, currency, description, metadata = {}) {
  const { data: acc } = await getDb().from('bank_accounts').select('balance').eq('id', accountId).single();
  const before = parseFloat(acc?.balance ?? 0);
  const credits = ['deposit','transfer_in','interest','refund','loan_disbursement','invest_sell','bill_refund'];
  const delta = credits.includes(type) ? amount : -Math.abs(amount);
  const after = before + delta;
  if (after < 0) throw ApiError.badRequest('Insufficient balance');

  await getDb().from('bank_transactions').insert({
    account_id: accountId, type, amount, currency, description,
    balance_before: before, balance_after: after, metadata,
  });
  await getDb().from('bank_accounts').update({ balance: after }).eq('id', accountId);
  return after;
}

function calcMonthlyPayment(principal, annualRate, termMonths) {
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / termMonths;
  return principal * r * Math.pow(1 + r, termMonths) / (Math.pow(1 + r, termMonths) - 1);
}

// ─── Loans ───────────────────────────────────────────────────────────────────

const LOAN_RATES = {
  personal: 15.99, sme: 6.99, otop: 4.50,
  housing: 3.75, vehicle: 5.99, education: 3.00,
};

// Apply for a loan
router.post('/loans/apply', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, {
    loan_type:   'required',
    amount:      'required',
    term_months: 'required',
    purpose:     'required',
  });
  const uid = req.user.id;
  const loanType = req.body.loan_type;
  if (!LOAN_RATES[loanType]) throw ApiError.badRequest('Invalid loan type');

  const { data: kyc } = await getDb().from('bank_kyc_applications')
    .select('status,kyc_level').eq('user_id', uid).eq('status', 'approved').maybeSingle();
  if (!kyc) throw ApiError.forbidden('KYC approval required for loan application');

  const amount = parseFloat(req.body.amount);
  const termMonths = parseInt(req.body.term_months);
  if (amount <= 0 || amount > 50000000) throw ApiError.badRequest('Invalid loan amount');
  if (termMonths < 1 || termMonths > 360) throw ApiError.badRequest('Invalid loan term');

  const rate = parseFloat(req.body.interest_rate_override ?? LOAN_RATES[loanType]);
  const monthly = calcMonthlyPayment(amount, rate, termMonths);
  const totalInterest = monthly * termMonths - amount;

  const { data, error } = await getDb().from('bank_loans').insert({
    user_id:        uid,
    account_id:     req.body.account_id || null,
    loan_type:      loanType,
    amount,
    currency:       req.body.currency || 'THB',
    interest_rate:  rate,
    term_months:    termMonths,
    monthly_payment: parseFloat(monthly.toFixed(2)),
    total_interest:  parseFloat(totalInterest.toFixed(2)),
    purpose:        req.body.purpose,
    collateral:     req.body.collateral,
    balance_owing:  amount,
    status:         'submitted',
  }).select().single();
  if (error) throw new ApiError(500, 'LOAN_CREATE_FAILED', error.message);

  audit.log(req, 'loan_applied', { loan_id: data.id, type: loanType, amount });
  log.info('loan_applied', { user_id: uid, loan_id: data.id, loan_type: loanType });
  res.json({ success: true, loan: data, monthly_payment: monthly.toFixed(2) });
}));

// List user's loans
router.get('/loans', requireAuth, asyncHandler(async (req, res) => {
  const { data, error } = await getDb().from('bank_loans')
    .select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
  if (error) throw new ApiError(500, 'FETCH_FAILED', error.message);
  res.json({ success: true, loans: data });
}));

// Get loan details + repayment schedule
router.get('/loans/:id', requireAuth, asyncHandler(async (req, res) => {
  const { data: loan } = await getDb().from('bank_loans')
    .select('*').eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle();
  if (!loan) throw ApiError.notFound('Loan not found');

  const { data: schedule } = await getDb().from('bank_loan_repayments')
    .select('*').eq('loan_id', loan.id).order('due_date');

  res.json({ success: true, loan, schedule: schedule || [] });
}));

// Make a loan repayment
router.post('/loans/:id/repay', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, { account_id: 'required', amount: 'required' });
  const loan = (await getDb().from('bank_loans').select('*')
    .eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle()).data;
  if (!loan) throw ApiError.notFound('Loan not found');
  if (loan.status !== 'active') throw ApiError.badRequest('Loan is not active');

  const amount = parseFloat(req.body.amount);
  if (amount <= 0) throw ApiError.badRequest('Invalid repayment amount');

  const account = await getAccount(req.body.account_id, req.user.id);
  const newBalance = await recordTx(account.id, 'loan_repayment', amount, loan.currency,
    `Loan repayment: ${loan.id.slice(0, 8)}`);

  const newOwing = Math.max(0, parseFloat(loan.balance_owing) - amount);
  const newStatus = newOwing === 0 ? 'paid_off' : 'active';

  const { data: txData } = await getDb().from('bank_transactions')
    .select('id').eq('account_id', account.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();

  await getDb().from('bank_loans').update({ balance_owing: newOwing, status: newStatus })
    .eq('id', loan.id);
  const { data: rep } = await getDb().from('bank_loan_repayments').insert({
    loan_id: loan.id, user_id: req.user.id, amount, paid_at: new Date().toISOString(),
    status: 'paid', tx_id: txData?.id,
  }).select().single();

  audit.log(req, 'loan_repayment', { loan_id: loan.id, amount, balance_owing: newOwing });
  res.json({ success: true, repayment: rep, balance_owing: newOwing,
    loan_status: newStatus, account_balance: newBalance });
}));

// Admin: review loan
router.patch('/loans/:id/review', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, { status: 'required' });
  const allowed = ['approved','rejected','under_review'];
  if (!allowed.includes(req.body.status)) throw ApiError.badRequest('Invalid status');

  const { data, error } = await getDb().from('bank_loans').update({
    status:         req.body.status,
    reviewer_id:    req.user.id,
    reviewer_notes: req.body.notes,
    reviewed_at:    new Date().toISOString(),
    disbursed_at:   req.body.status === 'approved' ? new Date().toISOString() : null,
  }).eq('id', req.params.id).select().single();
  if (error || !data) throw ApiError.notFound('Loan not found');

  audit.log(req, 'loan_reviewed', { loan_id: data.id, status: data.status });
  res.json({ success: true, loan: data });
}));

// ─── Insurance ────────────────────────────────────────────────────────────────

const INSURANCE_PLANS = {
  'LIFE_BASIC':    { type: 'life',     name_th: 'ประกันชีวิตพื้นฐาน',       name_en: 'Basic Life Insurance',       coverage: 1000000,  premium: 500  },
  'LIFE_PREMIUM':  { type: 'life',     name_th: 'ประกันชีวิต Premium',       name_en: 'Premium Life Insurance',     coverage: 5000000,  premium: 2000 },
  'HEALTH_BASIC':  { type: 'health',   name_th: 'ประกันสุขภาพพื้นฐาน',       name_en: 'Basic Health Insurance',     coverage: 500000,   premium: 800  },
  'HEALTH_OTOP':   { type: 'health',   name_th: 'ประกันสุขภาพ OTOP SME',     name_en: 'OTOP/SME Health Insurance',  coverage: 2000000,  premium: 1500 },
  'PROP_HOME':     { type: 'property', name_th: 'ประกันบ้าน',                 name_en: 'Home Insurance',             coverage: 2000000,  premium: 300  },
  'BIZ_SME':       { type: 'sme_business', name_th: 'ประกันธุรกิจ SME',      name_en: 'SME Business Insurance',     coverage: 5000000,  premium: 1200 },
  'VEH_COMP':      { type: 'vehicle',  name_th: 'ประกันรถยนต์ชั้น 1',         name_en: 'Comprehensive Car Insurance', coverage: 1000000, premium: 600  },
  'TRAVEL_ASEAN':  { type: 'travel',   name_th: 'ประกันการเดินทาง ASEAN',    'name_en': 'ASEAN Travel Insurance',   coverage: 500000,   premium: 200  },
  'CROP_FARMER':   { type: 'crop',     name_th: 'ประกันพืชผลเกษตร',           name_en: 'Crop Insurance',             coverage: 500000,   premium: 150  },
};

router.post('/insurance/apply', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, { plan_code: 'required' });
  const plan = INSURANCE_PLANS[req.body.plan_code];
  if (!plan) throw ApiError.badRequest('Insurance plan not found');

  const { data: kyc } = await getDb().from('bank_kyc_applications')
    .select('status').eq('user_id', req.user.id).eq('status', 'approved').maybeSingle();
  if (!kyc) throw ApiError.forbidden('KYC approval required');

  const policyNum = `OTI-${Date.now().toString(36).toUpperCase()}`;
  const startsAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 365 * 86400000).toISOString();

  const { data, error } = await getDb().from('bank_insurance').insert({
    user_id:         req.user.id,
    policy_type:     plan.type,
    plan_code:       req.body.plan_code,
    plan_name_th:    plan.name_th,
    plan_name_en:    plan.name_en,
    coverage_amount: parseFloat(req.body.coverage_override ?? plan.coverage),
    premium_monthly: plan.premium,
    beneficiary:     req.body.beneficiary,
    policy_number:   policyNum,
    status:          'active',
    starts_at:       startsAt,
    expires_at:      expiresAt,
  }).select().single();
  if (error) throw new ApiError(500, 'INSURANCE_CREATE_FAILED', error.message);

  audit.log(req, 'insurance_applied', { insurance_id: data.id, plan: req.body.plan_code });
  res.json({ success: true, insurance: data });
}));

router.get('/insurance', requireAuth, asyncHandler(async (req, res) => {
  const { data, error } = await getDb().from('bank_insurance')
    .select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
  if (error) throw new ApiError(500, 'FETCH_FAILED', error.message);
  res.json({ success: true, policies: data, plans: INSURANCE_PLANS });
}));

router.post('/insurance/:id/claim', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, { description: 'required|minlen:10', amount_claimed: 'required' });
  const { data: policy } = await getDb().from('bank_insurance')
    .select('*').eq('id', req.params.id).eq('user_id', req.user.id).eq('status', 'active').maybeSingle();
  if (!policy) throw ApiError.notFound('Active insurance policy not found');

  const claimed = parseFloat(req.body.amount_claimed);
  if (claimed > parseFloat(policy.coverage_amount))
    throw ApiError.badRequest('Claim amount exceeds coverage');

  const { data, error } = await getDb().from('bank_insurance_claims').insert({
    insurance_id:   policy.id,
    user_id:        req.user.id,
    claim_type:     req.body.claim_type,
    description:    req.body.description,
    amount_claimed: claimed,
    docs_url:       req.body.docs_url,
    status:         'submitted',
  }).select().single();
  if (error) throw new ApiError(500, 'CLAIM_CREATE_FAILED', error.message);

  audit.log(req, 'insurance_claim_filed', { claim_id: data.id, insurance_id: policy.id });
  res.json({ success: true, claim: data });
}));

router.get('/insurance/:id/claims', requireAuth, asyncHandler(async (req, res) => {
  const { data: policy } = await getDb().from('bank_insurance').select('id')
    .eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle();
  if (!policy) throw ApiError.notFound('Policy not found');
  const { data } = await getDb().from('bank_insurance_claims')
    .select('*').eq('insurance_id', policy.id).order('created_at', { ascending: false });
  res.json({ success: true, claims: data || [] });
}));

// ─── Investments ──────────────────────────────────────────────────────────────

router.get('/investments/products', asyncHandler(async (req, res) => {
  let q = getDb().from('bank_investment_products').select('*').eq('is_active', true).order('sort_order');
  if (req.query.category) q = q.eq('category', req.query.category);
  const { data, error } = await q;
  if (error) throw new ApiError(500, 'FETCH_FAILED', error.message);
  res.json({ success: true, products: data });
}));

router.post('/investments/order', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, {
    account_id:   'required',
    product_code: 'required',
    direction:    'required',
    amount:       'required',
  });
  if (!['buy', 'sell'].includes(req.body.direction)) throw ApiError.badRequest('direction must be buy or sell');

  const { data: product } = await getDb().from('bank_investment_products')
    .select('*').eq('code', req.body.product_code).eq('is_active', true).maybeSingle();
  if (!product) throw ApiError.notFound('Investment product not found');

  const account = await getAccount(req.body.account_id, req.user.id);
  const amount = parseFloat(req.body.amount);
  if (amount < parseFloat(product.min_investment))
    throw ApiError.badRequest(`Minimum investment is ${product.min_investment}`);

  const navPrice = parseFloat(req.body.nav_price ?? 10);
  const units = amount / navPrice;

  if (req.body.direction === 'buy') {
    await recordTx(account.id, 'invest_buy', amount, account.currency,
      `Buy ${product.name_en}: ${units.toFixed(4)} units`);
  } else {
    await recordTx(account.id, 'invest_sell', amount, account.currency,
      `Sell ${product.name_en}: ${units.toFixed(4)} units`);
  }

  const { data, error } = await getDb().from('bank_investments').insert({
    user_id:      req.user.id,
    account_id:   account.id,
    product_code: product.code,
    direction:    req.body.direction,
    units:        parseFloat(units.toFixed(6)),
    amount,
    nav_price:    navPrice,
    currency:     product.currency,
    status:       'executed',
    settled_at:   new Date().toISOString(),
  }).select().single();
  if (error) throw new ApiError(500, 'INVESTMENT_ORDER_FAILED', error.message);

  audit.log(req, 'investment_order', { order_id: data.id, product: product.code,
    direction: data.direction, amount });
  res.json({ success: true, order: data, units: units.toFixed(6) });
}));

router.get('/investments', requireAuth, asyncHandler(async (req, res) => {
  const { data, error } = await getDb().from('bank_investments')
    .select('*, bank_investment_products(name_th, name_en, category, expected_return, risk_level)')
    .eq('user_id', req.user.id).order('created_at', { ascending: false });
  if (error) throw new ApiError(500, 'FETCH_FAILED', error.message);

  const portfolio = {};
  for (const order of data || []) {
    const code = order.product_code;
    if (!portfolio[code]) portfolio[code] = { ...order.bank_investment_products, code, units: 0, invested: 0, orders: 0 };
    const delta = order.direction === 'buy' ? 1 : -1;
    portfolio[code].units += delta * parseFloat(order.units);
    portfolio[code].invested += delta * parseFloat(order.amount);
    portfolio[code].orders += 1;
  }

  res.json({ success: true, orders: data, portfolio: Object.values(portfolio) });
}));

// ─── Bill Payments ────────────────────────────────────────────────────────────

router.get('/bills/billers', asyncHandler(async (req, res) => {
  let q = getDb().from('bank_bill_billers').select('*').eq('is_active', true).order('sort_order');
  if (req.query.category) q = q.eq('category', req.query.category);
  const { data, error } = await q;
  if (error) throw new ApiError(500, 'FETCH_FAILED', error.message);
  res.json({ success: true, billers: data });
}));

router.post('/bills/pay', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, {
    account_id:  'required',
    biller_code: 'required',
    amount:      'required',
    ref1:        'required',
  });

  const { data: biller } = await getDb().from('bank_bill_billers')
    .select('*').eq('code', req.body.biller_code).eq('is_active', true).maybeSingle();
  if (!biller) throw ApiError.notFound('Biller not found');

  const account = await getAccount(req.body.account_id, req.user.id);
  const amount = parseFloat(req.body.amount);
  if (amount <= 0 || amount > 5000000) throw ApiError.badRequest('Invalid payment amount');

  const fee = amount > 100000 ? 15 : 5;
  await recordTx(account.id, 'bill_payment', amount + fee, account.currency,
    `Bill: ${biller.name_th} (${req.body.ref1})`);

  const { data, error } = await getDb().from('bank_bill_payments').insert({
    user_id:    req.user.id,
    account_id: account.id,
    biller_code: req.body.biller_code,
    ref1:       req.body.ref1,
    ref2:       req.body.ref2 || null,
    amount,
    fee,
    status:     'completed',
    paid_at:    new Date().toISOString(),
  }).select().single();
  if (error) throw new ApiError(500, 'BILL_PAY_FAILED', error.message);

  audit.log(req, 'bill_paid', { bill_id: data.id, biller: biller.code, amount });
  log.info('bill_paid', { user_id: req.user.id, biller: biller.code, amount });
  res.json({ success: true, payment: data, biller, fee, total: amount + fee });
}));

router.get('/bills/history', requireAuth, asyncHandler(async (req, res) => {
  const page  = parseInt(req.query.page ?? '1');
  const limit = Math.min(parseInt(req.query.limit ?? '20'), 100);
  const from  = (page - 1) * limit;

  const { data, count, error } = await getDb().from('bank_bill_payments')
    .select('*, bank_bill_billers(name_th, name_en, category)', { count: 'exact' })
    .eq('user_id', req.user.id).order('created_at', { ascending: false })
    .range(from, from + limit - 1);
  if (error) throw new ApiError(500, 'FETCH_FAILED', error.message);
  res.json({ success: true, payments: data, total: count, page, limit });
}));

// ─── Trade Finance ────────────────────────────────────────────────────────────

router.post('/trade/apply', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, {
    instrument:   'required',
    counterparty: 'required',
    amount:       'required',
    currency:     'required',
    purpose:      'required',
  });

  const allowed = ['lc_import','lc_export','tt','invoice_finance','trust_receipt','bank_guarantee'];
  if (!allowed.includes(req.body.instrument)) throw ApiError.badRequest('Invalid trade finance instrument');

  const { data: kyc } = await getDb().from('bank_kyc_applications')
    .select('status,kyc_level').eq('user_id', req.user.id).eq('status', 'approved').maybeSingle();
  if (!kyc) throw ApiError.forbidden('KYC approval required for trade finance');

  const amount = parseFloat(req.body.amount);
  if (amount <= 0) throw ApiError.badRequest('Invalid amount');

  const expiresAt = req.body.expires_at
    ? new Date(req.body.expires_at).toISOString()
    : new Date(Date.now() + 90 * 86400000).toISOString();

  const { data, error } = await getDb().from('bank_trade_finance').insert({
    user_id:              req.user.id,
    account_id:           req.body.account_id || null,
    instrument:           req.body.instrument,
    counterparty:         req.body.counterparty,
    counterparty_country: req.body.counterparty_country,
    amount,
    currency:             req.body.currency.toUpperCase(),
    purpose:              req.body.purpose,
    documents_url:        req.body.documents_url,
    swift_ref:            req.body.swift_ref,
    expires_at:           expiresAt,
    status:               'submitted',
  }).select().single();
  if (error) throw new ApiError(500, 'TRADE_FINANCE_FAILED', error.message);

  audit.log(req, 'trade_finance_applied', { tf_id: data.id, instrument: data.instrument, amount });
  res.json({ success: true, trade_finance: data });
}));

router.get('/trade', requireAuth, asyncHandler(async (req, res) => {
  const { data, error } = await getDb().from('bank_trade_finance')
    .select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
  if (error) throw new ApiError(500, 'FETCH_FAILED', error.message);
  res.json({ success: true, trade_finance: data });
}));

// ─── Payroll ──────────────────────────────────────────────────────────────────

router.post('/payroll/employees', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, { full_name: 'required', base_salary: 'required' });
  const { data, error } = await getDb().from('bank_payroll_employees').insert({
    employer_id:  req.user.id,
    full_name:    req.body.full_name,
    national_id:  req.body.national_id,
    bank_account: req.body.bank_account,
    promptpay_id: req.body.promptpay_id,
    base_salary:  parseFloat(req.body.base_salary),
    currency:     req.body.currency || 'THB',
    department:   req.body.department,
    position:     req.body.position,
  }).select().single();
  if (error) throw new ApiError(500, 'EMPLOYEE_CREATE_FAILED', error.message);
  res.json({ success: true, employee: data });
}));

router.get('/payroll/employees', requireAuth, asyncHandler(async (req, res) => {
  const { data } = await getDb().from('bank_payroll_employees')
    .select('*').eq('employer_id', req.user.id).eq('is_active', true)
    .order('full_name');
  res.json({ success: true, employees: data || [] });
}));

router.post('/payroll/run', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, { account_id: 'required', period_month: 'required', period_year: 'required' });

  const account = await getAccount(req.body.account_id, req.user.id);
  const { data: employees } = await getDb().from('bank_payroll_employees')
    .select('*').eq('employer_id', req.user.id).eq('is_active', true);
  if (!employees || employees.length === 0) throw ApiError.badRequest('No active employees found');

  let totalGross = 0, totalTax = 0, totalSocial = 0, totalNet = 0;
  const lines = employees.map(emp => {
    const gross = parseFloat(emp.base_salary);
    const social = Math.min(gross * 0.05, 750);
    const taxable = Math.max(gross - social - 15000, 0);
    const tax = taxable > 0 ? taxable * 0.05 : 0;
    const net = gross - social - tax;
    totalGross += gross; totalTax += tax; totalSocial += social; totalNet += net;
    return { employee_id: emp.id, gross, tax, social_security: social, net, status: 'pending' };
  });

  if (parseFloat(account.balance) < totalNet) throw ApiError.badRequest('Insufficient balance for payroll');

  const { data: run, error } = await getDb().from('bank_payroll_runs').insert({
    employer_id:    req.user.id,
    account_id:     account.id,
    period_month:   parseInt(req.body.period_month),
    period_year:    parseInt(req.body.period_year),
    total_gross:    parseFloat(totalGross.toFixed(2)),
    total_tax:      parseFloat(totalTax.toFixed(2)),
    total_social:   parseFloat(totalSocial.toFixed(2)),
    total_net:      parseFloat(totalNet.toFixed(2)),
    employee_count: employees.length,
    status:         'processing',
    run_at:         new Date().toISOString(),
  }).select().single();
  if (error) throw new ApiError(500, 'PAYROLL_RUN_FAILED', error.message);

  const lineInserts = lines.map(l => ({ ...l, run_id: run.id }));
  await getDb().from('bank_payroll_lines').insert(lineInserts);

  await recordTx(account.id, 'payroll_disbursement', totalNet, account.currency,
    `Payroll ${req.body.period_year}-${String(req.body.period_month).padStart(2,'0')}: ${employees.length} employees`);

  await getDb().from('bank_payroll_runs').update({ status: 'completed' }).eq('id', run.id);
  await getDb().from('bank_payroll_lines').update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('run_id', run.id);

  audit.log(req, 'payroll_run', { run_id: run.id, total_net: totalNet, employees: employees.length });
  res.json({ success: true, run: { ...run, status: 'completed' }, summary: {
    employees: employees.length, total_gross: totalGross, total_tax: totalTax,
    total_social: totalSocial, total_net: totalNet,
  }});
}));

router.get('/payroll/history', requireAuth, asyncHandler(async (req, res) => {
  const { data } = await getDb().from('bank_payroll_runs')
    .select('*').eq('employer_id', req.user.id).order('created_at', { ascending: false }).limit(24);
  res.json({ success: true, runs: data || [] });
}));

// ─── Phase 2 Dashboard ────────────────────────────────────────────────────────

router.get('/dashboard/phase2', requireAuth, asyncHandler(async (req, res) => {
  const uid = req.user.id;
  const [loans, insurance, investments, bills] = await Promise.all([
    getDb().from('bank_loans').select('loan_type,amount,balance_owing,status,monthly_payment')
      .eq('user_id', uid).in('status', ['active','approved']),
    getDb().from('bank_insurance').select('policy_type,plan_name_th,coverage_amount,premium_monthly,status')
      .eq('user_id', uid).eq('status', 'active'),
    getDb().from('bank_investments').select('direction,amount,product_code')
      .eq('user_id', uid).eq('status', 'executed'),
    getDb().from('bank_bill_payments').select('amount,biller_code,paid_at')
      .eq('user_id', uid).eq('status', 'completed')
      .gte('paid_at', new Date(Date.now() - 30 * 86400000).toISOString()),
  ]);

  const totalDebt = (loans.data || []).reduce((s, l) => s + parseFloat(l.balance_owing ?? 0), 0);
  const monthlyPayment = (loans.data || []).reduce((s, l) => s + parseFloat(l.monthly_payment ?? 0), 0);
  const totalPremium = (insurance.data || []).reduce((s, i) => s + parseFloat(i.premium_monthly ?? 0), 0);
  const netInvested = (investments.data || []).reduce((s, i) => {
    return s + (i.direction === 'buy' ? 1 : -1) * parseFloat(i.amount ?? 0);
  }, 0);
  const billsPaid30d = (bills.data || []).reduce((s, b) => s + parseFloat(b.amount ?? 0), 0);

  res.json({
    success: true,
    loans: {
      count: (loans.data || []).length,
      total_debt: totalDebt,
      monthly_payment: monthlyPayment,
      list: loans.data || [],
    },
    insurance: {
      count: (insurance.data || []).length,
      monthly_premium: totalPremium,
      list: insurance.data || [],
    },
    investments: {
      net_invested: netInvested,
      order_count: (investments.data || []).length,
    },
    bills: {
      paid_30d: billsPaid30d,
      count_30d: (bills.data || []).length,
    },
  });
}));

// ─── AI Financial Planning ────────────────────────────────────────────────────

router.post('/advisor/plan', requireAuth, asyncHandler(async (req, res) => {
  validate(req.body, { goal: 'required|minlen:5' });

  const { data: dash } = await (async () => {
    try {
      const [loans, ins, inv] = await Promise.all([
        getDb().from('bank_loans').select('loan_type,amount,interest_rate,status').eq('user_id', req.user.id),
        getDb().from('bank_insurance').select('policy_type,coverage_amount,status').eq('user_id', req.user.id),
        getDb().from('bank_investments').select('product_code,direction,amount').eq('user_id', req.user.id),
      ]);
      return { data: { loans: loans.data, insurance: ins.data, investments: inv.data } };
    } catch { return { data: {} }; }
  })();

  const systemPrompt = `คุณคือที่ปรึกษาการวางแผนการเงินของ OpenThaiAi สำหรับผู้ประกอบการ OTOP/SME ไทย-ASEAN-สากล
ข้อมูลการเงินปัจจุบัน: ${JSON.stringify(dash)}
ช่วยวางแผนการเงินที่เป็นรูปธรรม สอดคล้องกับกฎหมายไทย และเหมาะกับบริบท OTOP/SME
แนะนำผลิตภัณฑ์การเงินที่เหมาะสมจาก OpenThaiAi เท่านั้น`;

  let plan;
  try {
    const msg = await getAI().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: req.body.goal }],
    });
    plan = msg.content[0].text;
  } catch {
    plan = 'ขออภัย ระบบที่ปรึกษาไม่พร้อมชั่วคราว กรุณาติดต่อฝ่ายบริการลูกค้า OpenThaiAi';
  }

  res.json({ success: true, plan });
}));

export default router;
