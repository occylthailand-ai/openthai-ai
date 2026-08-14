import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import { apiUrl } from '../apiBase';
import { useLang } from '../i18n';

// Trilingual so a visitor who chose English or Chinese isn't dropped onto an all-Thai contact page
// (the same market-entry leak already fixed on /about and the 404). Follows the site's global language
// (useLang) — no in-page switcher, matching AboutPage. The subject list is per-language; the submitted
// value is whatever the user saw, which is what the support inbox should receive.
const T = {
  th: {
    doc: 'ติดต่อเรา — Openthai.ai', back: '← กลับ', hTitle: 'ติดต่อเรา',
    heroTitle: 'ติดต่อทีมงาน Openthai.ai', heroSub1: 'ตอบกลับภายใน ', heroStrong: '1–2 วันทำการ', heroSub2: ' · เปิดให้บริการทุกวัน',
    channels: '📡 ช่องทางการติดต่อ', respTitle: '⏰ เวลาตอบกลับ',
    resp1: '📧 Email: ภายใน 24 ชม.', resp2: '💼 Business: ภายใน 4 ชม.', resp3: '🆘 ปัญหาด่วน: ภายใน 1 ชม.',
    subjects: ['สอบถามเกี่ยวกับบริการ', 'ปัญหาการใช้งาน', 'แผน Pro / Business', 'Affiliate Program', 'ข้อเสนอความร่วมมือ', 'รายงาน Bug', 'อื่นๆ'],
    lblName: 'ชื่อ', lblEmail: 'อีเมล', lblSubject: 'หัวข้อ', lblMessage: 'ข้อความ',
    phName: 'ชื่อของคุณ', phMessage: 'อธิบายปัญหาหรือข้อสอบถามของคุณ...',
    submit: '📨 ส่งข้อความ', submitting: '⏳ กำลังส่ง...',
    consent1: 'โดยการส่งข้อความ คุณยอมรับ', consentLink: 'นโยบายความเป็นส่วนตัว',
    sentTitle: 'ส่งข้อความสำเร็จ!', sentDesc1: 'ทีมงานจะตอบกลับที่อีเมล ', sentDesc2: ' ภายใน 1–2 วันทำการ',
    again: 'ส่งอีกครั้ง', home: '🏠 กลับหน้าหลัก',
    tIncomplete: 'กรุณากรอกข้อมูลให้ครบทุกช่อง', tSuccess: '✅ ส่งข้อความสำเร็จ! ทีมงานจะตอบกลับใน 1–2 วัน',
    tError: 'เกิดข้อผิดพลาด กรุณาลองใหม่', tNetwork: 'ไม่สามารถเชื่อมต่อ กรุณาลองใหม่',
  },
  en: {
    doc: 'Contact us — Openthai.ai', back: '← Back', hTitle: 'Contact us',
    heroTitle: 'Contact the Openthai.ai team', heroSub1: 'We reply within ', heroStrong: '1–2 business days', heroSub2: ' · open every day',
    channels: '📡 Contact channels', respTitle: '⏰ Response time',
    resp1: '📧 Email: within 24 hrs', resp2: '💼 Business: within 4 hrs', resp3: '🆘 Urgent: within 1 hr',
    subjects: ['Service enquiry', 'Usage problem', 'Pro / Business plan', 'Affiliate Program', 'Partnership proposal', 'Bug report', 'Other'],
    lblName: 'Name', lblEmail: 'Email', lblSubject: 'Subject', lblMessage: 'Message',
    phName: 'Your name', phMessage: 'Describe your problem or question...',
    submit: '📨 Send message', submitting: '⏳ Sending...',
    consent1: 'By sending this, you accept the ', consentLink: 'privacy policy',
    sentTitle: 'Message sent!', sentDesc1: "We'll reply to ", sentDesc2: ' within 1–2 business days',
    again: 'Send another', home: '🏠 Back to home',
    tIncomplete: 'Please fill in every field', tSuccess: "✅ Message sent! We'll reply within 1–2 days",
    tError: 'Something went wrong, please try again', tNetwork: "Couldn't connect, please try again",
  },
  zh: {
    doc: '联系我们 — Openthai.ai', back: '← 返回', hTitle: '联系我们',
    heroTitle: '联系 Openthai.ai 团队', heroSub1: '我们将在 ', heroStrong: '1–2 个工作日', heroSub2: ' 内回复 · 每天开放',
    channels: '📡 联系渠道', respTitle: '⏰ 回复时间',
    resp1: '📧 邮件：24 小时内', resp2: '💼 商务：4 小时内', resp3: '🆘 紧急：1 小时内',
    subjects: ['服务咨询', '使用问题', 'Pro / Business 套餐', 'Affiliate 计划', '合作提案', 'Bug 报告', '其他'],
    lblName: '姓名', lblEmail: '邮箱', lblSubject: '主题', lblMessage: '留言',
    phName: '你的姓名', phMessage: '描述你的问题或咨询……',
    submit: '📨 发送留言', submitting: '⏳ 发送中……',
    consent1: '发送即表示你接受', consentLink: '隐私政策',
    sentTitle: '留言已发送！', sentDesc1: '我们会回复至 ', sentDesc2: '，1–2 个工作日内',
    again: '再次发送', home: '🏠 返回首页',
    tIncomplete: '请填写所有字段', tSuccess: '✅ 留言已发送！我们将在 1–2 天内回复',
    tError: '出错了，请重试', tNetwork: '无法连接，请重试',
  },
};

export default function ContactPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { lang } = useLang();
  const t = T[lang] || T.th;
  const [form, setForm] = useState({ name: '', email: '', subject: t.subjects[0], message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => { document.title = t.doc; }, [t.doc]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error(t.tIncomplete);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        toast.success(t.tSuccess);
      } else {
        toast.error(data.message || t.tError);
      }
    } catch {
      toast.error(t.tNetwork);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '12px 16px', color: '#f8fafc', fontSize: 14, outline: 'none',
    fontFamily: "'Inter','Sarabun',sans-serif", boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 };

  return (
    <div style={{ minHeight: '100vh', background: '#080812', color: '#f8fafc', fontFamily: "'Inter','Sarabun',sans-serif" }}>

      {/* Header */}
      <header style={{ background: 'rgba(8,8,18,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 5%', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>{t.back}</button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{t.hTitle}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Contact — Openthai.ai</div>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 5%' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>💬</div>
          <h1 style={{ fontSize: 'clamp(24px,5vw,38px)', fontWeight: 900, margin: '0 0 12px', background: 'linear-gradient(90deg,#fe2c55,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t.heroTitle}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>{t.heroSub1}<strong style={{ color: '#10b981' }}>{t.heroStrong}</strong>{t.heroSub2}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 32 }}>

          {/* Contact Channels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 8px', color: '#a5b4fc' }}>{t.channels}</h2>
            {[
              { icon: '📧', label: 'Email', value: 'support@openthai.ai', href: 'mailto:support@openthai.ai' },
              { icon: '💰', label: 'Affiliate', value: 'affiliate@openthai.ai', href: 'mailto:affiliate@openthai.ai' },
              { icon: '🔒', label: 'PDPA/Privacy', value: 'privacy@openthai.ai', href: 'mailto:privacy@openthai.ai' },
              { icon: '🌐', label: 'Website', value: 'www.openthai-ai.com', href: 'https://www.openthai-ai.com' },
            ].map((c) => (
              <a key={c.label} href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px', textDecoration: 'none', transition: 'border-color 0.2s' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{c.label}</div>
                  <div style={{ fontSize: 13, color: '#a5b4fc', fontWeight: 600 }}>{c.value}</div>
                </div>
              </a>
            ))}

            {/* Response time */}
            <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '16px 18px', marginTop: 8 }}>
              <div style={{ fontWeight: 700, color: '#34d399', marginBottom: 8, fontSize: 13 }}>{t.respTitle}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.8 }}>
                {t.resp1}<br />
                {t.resp2}<br />
                {t.resp3}
              </div>
            </div>
          </div>

          {/* Form */}
          <div>
            {sent ? (
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 16, padding: '40px 32px', textAlign: 'center' }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
                <h3 style={{ color: '#34d399', fontWeight: 800, marginBottom: 8 }}>{t.sentTitle}</h3>
                <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 24 }}>{t.sentDesc1}<strong style={{ color: '#a5b4fc' }}>{form.email}</strong>{t.sentDesc2}</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: t.subjects[0], message: '' }); }}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 50, padding: '10px 20px', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
                    {t.again}
                  </button>
                  <button onClick={() => navigate('/')}
                    style={{ background: 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    {t.home}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label htmlFor="contact-name" style={labelStyle}>{t.lblName} <span style={{ color: '#fe2c55' }}>*</span></label>
                    <input id="contact-name" style={inputStyle} autoComplete="name" placeholder={t.phName} value={form.name} onChange={set('name')} required />
                  </div>
                  <div>
                    <label htmlFor="contact-email" style={labelStyle}>{t.lblEmail} <span style={{ color: '#fe2c55' }}>*</span></label>
                    <input id="contact-email" style={inputStyle} type="email" autoComplete="email" placeholder="you@email.com" value={form.email} onChange={set('email')} required />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-subject" style={labelStyle}>{t.lblSubject}</label>
                  <select id="contact-subject" style={{ ...inputStyle, cursor: 'pointer' }} value={form.subject} onChange={set('subject')}>
                    {t.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-message" style={labelStyle}>{t.lblMessage} <span style={{ color: '#fe2c55' }}>*</span></label>
                  <textarea id="contact-message" style={{ ...inputStyle, minHeight: 140, resize: 'vertical', lineHeight: 1.6 }}
                    placeholder={t.phMessage}
                    value={form.message} onChange={set('message')} required />
                  <div style={{ textAlign: 'right', fontSize: 11, color: '#7c8797', marginTop: 4 }}>
                    {form.message.length}/500
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  style={{ background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg,#fe2c55,#6366f1)', color: '#fff', border: 'none', borderRadius: 50, padding: '14px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                  {loading ? t.submitting : t.submit}
                </button>

                <p style={{ fontSize: 11, color: '#748293', textAlign: 'center', margin: 0 }}>
                  {t.consent1}{' '}
                  <button type="button" onClick={() => navigate('/privacy')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 11, padding: 0, textDecoration: 'underline' }}>
                    {t.consentLink}
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
