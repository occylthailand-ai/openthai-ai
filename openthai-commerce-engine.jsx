import { useState } from 'react';

// Sample products from the database
const sampleProducts = [
  { id: 1, name: "น้ำพริกเผาแม่ประนอม", category: "OTOP Food", region: "ภาคกลาง", description: "น้ำพริกเผาสูตรโบราณ รสชาติเข้มข้น ทำจากพริกแห้งคั่วและกระเทียม" },
  { id: 2, name: "Pop Mart Molly", category: "China Trendy", region: "China", description: "ฟิกเกอร์ Art Toy ยอดนิยม สะสมได้ ลุ้นตัวลับ" },
  { id: 3, name: "ผ้าไหมมัดหมี่", category: "OTOP Textile", region: "ภาคอีสาน", description: "ผ้าไหมทอมือ ลายมัดหมี่โบราณ ย้อมสีธรรมชาติ" },
  { id: 4, name: "K-Beauty Serum", category: "Korea Beauty", region: "Korea", description: "เซรั่มบำรุงผิว สูตรเกาหลี ลดริ้วรอย ผิวกระจ่างใส" },
  { id: 5, name: "Japanese Matcha Kit Kat", category: "JP Snacks", region: "Japan", description: "คิทแคทรสชาเขียวมัทฉะแท้จากญี่ปุ่น หอมละมุน" },
];

// Hook types based on 9 Skills framework
const hookTypes = ["Story Hook", "Process/ASMR", "Contrast", "Question", "Transformation"];

export default function OpenThaiCommerceEngine() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customProduct, setCustomProduct] = useState({ name: '', category: '', description: '' });
  const [useCustom, setUseCustom] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState(['th', 'zh', 'en']);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('th');

  const toggleLanguage = (lang) => {
    setSelectedLanguages(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const generateContent = async () => {
    const product = useCustom ? customProduct : selectedProduct;
    if (!product || !product.name) {
      setError('กรุณาเลือกหรือกรอกข้อมูลสินค้า');
      return;
    }
    if (selectedLanguages.length === 0) {
      setError('กรุณาเลือกภาษาอย่างน้อย 1 ภาษา');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    const langNames = {
      th: 'Thai',
      zh: 'Chinese (Simplified)',
      en: 'English'
    };

    const prompt = `You are an expert TikTok content creator for e-commerce. Generate viral TikTok content for this product.

PRODUCT:
- Name: ${product.name}
- Category: ${product.category || 'General'}
- Description: ${product.description || 'N/A'}
- Region: ${product.region || 'Thailand'}

Generate content in these languages: ${selectedLanguages.map(l => langNames[l]).join(', ')}

For EACH language, create:
1. Script with:
   - Hook (3 seconds) - attention grabber
   - Story (20 seconds) - product benefits/demo
   - CTA (7 seconds) - call to action
2. Caption (2-3 sentences)
3. Hashtags (10 relevant hashtags)

Respond ONLY with valid JSON in this exact format, no markdown:
{
  "th": {
    "script": { "hook": "...", "story": "...", "cta": "..." },
    "caption": "...",
    "hashtags": ["#tag1", "#tag2", ...]
  },
  "zh": {
    "script": { "hook": "...", "story": "...", "cta": "..." },
    "caption": "...",
    "hashtags": ["#tag1", "#tag2", ...]
  },
  "en": {
    "script": { "hook": "...", "story": "...", "cta": "..." },
    "caption": "...",
    "hashtags": ["#tag1", "#tag2", ...]
  },
  "hookType": "Story Hook or Process/ASMR or Contrast or Question or Transformation",
  "whyItWorks": "Brief explanation why this hook works for this product"
}

Only include keys for languages that were requested.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'API Error');
      }

      const text = data.content?.[0]?.text || '';
      const cleanJson = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      setResults(parsed);
      setActiveTab(selectedLanguages[0]);
    } catch (err) {
      setError('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const langLabels = { th: '🇹🇭 ไทย', zh: '🇨🇳 中文', en: '🇬🇧 English' };

  return (
    <div style={{ fontFamily: 'var(--font-sans)', maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 500, margin: '0 0 8px' }}>Openthai.ai Commerce Engine</h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '14px' }}>
          สร้าง TikTok Content หลายภาษาจากสินค้าของคุณ
        </p>
      </div>

      {/* Input Section */}
      <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-lg)', padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <button 
            onClick={() => setUseCustom(false)}
            style={{ 
              flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer',
              background: !useCustom ? 'var(--color-background-info)' : 'transparent',
              color: !useCustom ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
              border: '0.5px solid var(--color-border-secondary)',
              fontWeight: 500
            }}
          >
            เลือกจาก Database
          </button>
          <button 
            onClick={() => setUseCustom(true)}
            style={{ 
              flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer',
              background: useCustom ? 'var(--color-background-info)' : 'transparent',
              color: useCustom ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
              border: '0.5px solid var(--color-border-secondary)',
              fontWeight: 500
            }}
          >
            กรอกเอง
          </button>
        </div>

        {!useCustom ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sampleProducts.map(p => (
              <div 
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: selectedProduct?.id === p.id ? '2px solid var(--color-border-info)' : '0.5px solid var(--color-border-tertiary)',
                  background: selectedProduct?.id === p.id ? 'var(--color-background-info)' : 'var(--color-background-primary)',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500 }}>{p.name}</span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', background: 'var(--color-background-tertiary)', padding: '2px 8px', borderRadius: '4px' }}>{p.category}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{p.description}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="ชื่อสินค้า"
              value={customProduct.name}
              onChange={e => setCustomProduct({...customProduct, name: e.target.value})}
              style={{ padding: '12px', borderRadius: '8px', border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)' }}
            />
            <input 
              type="text" 
              placeholder="หมวดหมู่ (เช่น OTOP Food, K-Beauty)"
              value={customProduct.category}
              onChange={e => setCustomProduct({...customProduct, category: e.target.value})}
              style={{ padding: '12px', borderRadius: '8px', border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)' }}
            />
            <textarea 
              placeholder="รายละเอียดสินค้า..."
              value={customProduct.description}
              onChange={e => setCustomProduct({...customProduct, description: e.target.value})}
              rows={3}
              style={{ padding: '12px', borderRadius: '8px', border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)', resize: 'vertical' }}
            />
          </div>
        )}
      </div>

      {/* Language Selection */}
      <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-lg)', padding: '16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>เลือกภาษาที่ต้องการ</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {Object.entries(langLabels).map(([code, label]) => (
            <button
              key={code}
              onClick={() => toggleLanguage(code)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                cursor: 'pointer',
                border: selectedLanguages.includes(code) ? '2px solid var(--color-border-info)' : '0.5px solid var(--color-border-tertiary)',
                background: selectedLanguages.includes(code) ? 'var(--color-background-info)' : 'var(--color-background-primary)',
                color: selectedLanguages.includes(code) ? 'var(--color-text-info)' : 'var(--color-text-primary)',
                fontWeight: 500,
                fontSize: '14px'
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={generateContent}
        disabled={loading}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '10px',
          border: 'none',
          background: loading ? 'var(--color-background-tertiary)' : 'linear-gradient(135deg, #7F77DD, #1D9E75)',
          color: loading ? 'var(--color-text-secondary)' : 'white',
          fontWeight: 500,
          fontSize: '16px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '16px'
        }}
      >
        {loading ? '⏳ กำลังสร้าง Content...' : '✨ สร้าง TikTok Content'}
      </button>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--color-background-danger)', color: 'var(--color-text-danger)', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
          
          {/* Hook Analysis */}
          <div style={{ padding: '16px', borderBottom: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ background: '#7F77DD', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500 }}>
                {results.hookType}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>9 Skills Analysis</span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)' }}>{results.whyItWorks}</p>
          </div>

          {/* Language Tabs */}
          <div style={{ display: 'flex', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            {selectedLanguages.map(lang => (
              <button
                key={lang}
                onClick={() => setActiveTab(lang)}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderBottom: activeTab === lang ? '2px solid var(--color-text-info)' : '2px solid transparent',
                  background: 'transparent',
                  color: activeTab === lang ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {langLabels[lang]}
              </button>
            ))}
          </div>

          {/* Content Display */}
          {results[activeTab] && (
            <div style={{ padding: '20px' }}>
              {/* Script */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px', color: 'var(--color-text-secondary)' }}>📹 Script (30 วินาที)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--color-background-danger)', borderLeft: '3px solid #E24B4A' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-danger)', marginBottom: '4px', fontWeight: 500 }}>HOOK (0-3s)</div>
                    <div style={{ fontSize: '14px' }}>{results[activeTab].script?.hook}</div>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--color-background-info)', borderLeft: '3px solid #378ADD' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-info)', marginBottom: '4px', fontWeight: 500 }}>STORY (3-23s)</div>
                    <div style={{ fontSize: '14px' }}>{results[activeTab].script?.story}</div>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--color-background-success)', borderLeft: '3px solid #639922' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-success)', marginBottom: '4px', fontWeight: 500 }}>CTA (23-30s)</div>
                    <div style={{ fontSize: '14px' }}>{results[activeTab].script?.cta}</div>
                  </div>
                </div>
              </div>

              {/* Caption */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: 'var(--color-text-secondary)' }}>📝 Caption</div>
                <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--color-background-secondary)', fontSize: '14px' }}>
                  {results[activeTab].caption}
                </div>
              </div>

              {/* Hashtags */}
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: 'var(--color-text-secondary)' }}># Hashtags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {results[activeTab].hashtags?.map((tag, i) => (
                    <span key={i} style={{ 
                      padding: '4px 10px', 
                      borderRadius: '20px', 
                      background: 'var(--color-background-info)', 
                      color: 'var(--color-text-info)',
                      fontSize: '13px'
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Copy Button */}
              <button
                onClick={() => {
                  const content = results[activeTab];
                  const text = `🎬 SCRIPT:\n\n[HOOK] ${content.script?.hook}\n\n[STORY] ${content.script?.story}\n\n[CTA] ${content.script?.cta}\n\n📝 CAPTION:\n${content.caption}\n\n${content.hashtags?.join(' ')}`;
                  navigator.clipboard.writeText(text);
                }}
                style={{
                  width: '100%',
                  marginTop: '20px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '0.5px solid var(--color-border-secondary)',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                📋 Copy ทั้งหมด
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats Footer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '20px' }}>
        <div style={{ background: 'var(--color-background-secondary)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 500 }}>300+</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>สินค้าใน Database</div>
        </div>
        <div style={{ background: 'var(--color-background-secondary)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 500 }}>3</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>ภาษา</div>
        </div>
        <div style={{ background: 'var(--color-background-secondary)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 500 }}>30s</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Script ต่อชิ้น</div>
        </div>
      </div>
    </div>
  );
}
