import { useState } from "react";

const BRANDS = [
  {
    id: "china",
    name: "China AI 🇨🇳",
    icon: "龙",
    color: "#E84545",
    accent: "#FFB0B0",
    bg: "#150505",
    tagline: "DeepSeek · Doubao · Qwen · Yuanbao · 2026",
    badge: "RISING POWER",
    flag: "🇨🇳",
    sections: [
      {
        title: "4 โมเดล AI จีนที่ต้องรู้",
        sub: "China's Top LLMs — กำลังเขย่าวงการ AI โลก",
        color: "#E84545",
        tools: [
          {
            name: "DeepSeek R1 / R2",
            company: "杭州深度求索 · ก่อตั้ง 2023",
            desc: "Deep-reasoning model ที่สร้าง \"wake-up call\" ให้บริษัท AI อเมริกา — ประสิทธิภาพสูงด้วย compute น้อยกว่า GPT อย่างมีนัยสำคัญ",
            highlight: "🌊 Game Changer ปี 2025",
            badge: "🏆 Global Impact",
            detail: "เกิดจาก hedge fund ที่มี NVIDIA GPU ชั้นสูง — ชนะ benchmark หลายตัวด้วยต้นทุนต่ำกว่า 10×",
            color: "#E84545",
          },
          {
            name: "Doubao (豆包)",
            company: "ByteDance (TikTok) · ปัจจุบัน #1 จีน",
            desc: "Chatbot ยอดนิยมที่สุดในจีน ต้นปี 2026 — แซง WeChat AI และ Baidu ไปแล้ว ผู้ใช้งานหลายร้อยล้านคน",
            highlight: "📱 Most Used in China 2026",
            badge: "🥇 #1 Chatbot",
            detail: "ByteDance ใช้ประสบการณ์จาก TikTok algorithm มาสร้าง personalized AI experience",
            color: "#FF6B35",
          },
          {
            name: "Qwen / Qwen 3 (通义千问)",
            company: "Alibaba Cloud · Tongyi Series",
            desc: "Top-tier LLM จาก Alibaba — open source บางเวอร์ชัน, เก่งภาษาจีน-อังกฤษ, ใช้ใน e-commerce และ enterprise",
            highlight: "🛒 Alibaba Ecosystem",
            badge: "⭐ Top-tier",
            detail: "รองรับ multimodal, code generation, tool use — integrate กับ Taobao, Tmall, Aliyun",
            color: "#FF9F1C",
          },
          {
            name: "Yuanbao (元宝)",
            company: "Tencent · WeChat Ecosystem",
            desc: "Chatbot แข็งแกร่งจาก Tencent — integrate กับ WeChat, QQ และ ecosystem 1.3 พันล้าน user",
            highlight: "💬 WeChat Integration",
            badge: "🔗 Super App",
            detail: "ข้อได้เปรียบหลักคือการเข้าถึง distribution channel ผ่าน WeChat ที่ใหญ่ที่สุดในโลก",
            color: "#07C160",
          },
        ],
      },
      {
        title: "เทรนด์และพัฒนาการ China AI 2026",
        sub: "Key Developments ที่กระทบตลาด AI โลก",
        color: "#C83030",
        tools: [
          {
            name: "นโยบายแห่งชาติ 2026–2030",
            company: "中华人民共和国 · Government Policy",
            desc: "รัฐบาลจีนกำหนดให้ AI เป็นโครงสร้างพื้นฐานระดับชาติ — embed AI เข้าสู่ทุกภาคเศรษฐกิจ เทียบเท่าไฟฟ้าและอินเทอร์เน็ต",
            highlight: "🏛️ National Infrastructure AI",
            badge: "📋 Policy",
            detail: "แผน 5 ปี 2026–2030 มุ่งให้จีนเป็นผู้นำ AI โลกภายในปี 2030",
            color: "#C83030",
          },
          {
            name: "Talent Overtakes US/Europe",
            company: "Global AI Research · 2025 milestone",
            desc: "ปี 2025 เป็นครั้งแรกที่ lead authors ในงานประชุม AI ระดับโลกชั้นนำ มาจากจีนมากกว่าสหรัฐฯ และยุโรป",
            highlight: "🎓 #1 AI Research Talent 2025",
            badge: "📊 Milestone",
            detail: "บ่งชี้ว่าจีนไม่ได้เพียง \"ตามทัน\" แต่กำลัง \"ก้าวนำ\" ในด้าน AI research",
            color: "#A52020",
          },
          {
            name: "Voice AI 70ms Latency",
            company: "New Chinese Voice Models · 2026",
            desc: "โมเดล voice AI จีนรุ่นใหม่ทำได้ ~70ms latency — เร็วกว่ามนุษย์พูดตอบกัน ทำให้ real-time conversation เป็นธรรมชาติมาก",
            highlight: "⚡ Ultra-low Latency",
            badge: "🎙️ Voice",
            detail: "เน้น efficiency ไม่ใช่ scale — innovation ด้าน architecture และ optimization",
            color: "#882020",
          },
          {
            name: "Mali — AI Cultural Ambassador 🇹🇭",
            company: "TAT + CMG · Thailand-China",
            desc: "การท่องเที่ยวแห่งประเทศไทย ร่วมกับ China Media Group สร้าง AI influencer \"Mali\" เป็น cultural exchange ambassador ไทย-จีน",
            highlight: "🌸 AI ทูตวัฒนธรรมไทย-จีน",
            badge: "🌏 Thailand Link",
            detail: "ตัวอย่างของ AI ที่ใช้สร้าง soft power และ cultural diplomacy ระหว่างประเทศ",
            color: "#C84040",
          },
        ],
      },
      {
        title: "China vs US AI Race — Strategic View",
        sub: "การแข่งขัน AI ระหว่างมหาอำนาจ",
        color: "#943030",
        tools: [
          {
            name: "Hardware Access (NVIDIA Chips)",
            company: "Geopolitical AI · Supply Chain",
            desc: "DeepSeek เริ่มจาก hedge fund ที่มี NVIDIA GPU ชั้นสูง — การเข้าถึง hardware ยังเป็นปัจจัยชี้ขาด แม้ US จะพยายาม export ban",
            highlight: "💡 Hardware = Power",
            badge: "⚙️ Infrastructure",
            detail: "US export restrictions ทำให้จีนต้องพัฒนา chip ของตนเอง (Huawei Ascend, Biren) อย่างเร่งด่วน",
            color: "#943030",
          },
          {
            name: "Efficiency Innovation",
            company: "China AI Strategy · 2025–2026",
            desc: "จีนโฟกัสที่ efficiency ไม่ใช่ raw compute — DeepSeek ทำให้โลกรู้ว่าโมเดลดีไม่จำเป็นต้องใช้ GPU มหาศาล",
            highlight: "🎯 Do More With Less",
            badge: "💡 Innovation",
            detail: "เทคนิค Mixture-of-Experts (MoE), knowledge distillation, efficient training เป็นจุดแข็งของทีม AI จีน",
            color: "#7A2828",
          },
          {
            name: "Data Advantage",
            company: "Chinese Tech Giants",
            desc: "WeChat, TikTok, Taobao, Baidu มีข้อมูลพฤติกรรมผู้ใช้ภาษาจีนมหาศาล — ทำให้ fine-tune โมเดลสำหรับ Chinese market ได้แม่นยำมาก",
            highlight: "📊 1.4B Users Data",
            badge: "🗄️ Big Data",
            detail: "ข้อมูลจากตลาดภายในที่ใหญ่ที่สุดในโลก เป็น competitive advantage ที่ US replicate ไม่ได้",
            color: "#602020",
          },
          {
            name: "โอกาสสำหรับธุรกิจไทย 🇹🇭",
            company: "OpenThai.AI · ASEAN Bridge",
            desc: "ไทยอยู่กึ่งกลาง US-China AI — ธุรกิจไทยสามารถใช้ทั้ง DeepSeek API, Qwen, Doubao และ OpenAI/Claude ตามความเหมาะสม",
            highlight: "🌏 Thailand = ASEAN Gateway",
            badge: "🇹🇭 Opportunity",
            detail: "ต้นทุน API จาก Chinese models ต่ำกว่า 5–10× — เหมาะสำหรับ startups และ SMEs ไทยที่มีงบประมาณจำกัด",
            color: "#E84545",
          },
        ],
      },
    ],
  },
  {
    id: "microsoft",
    name: "Microsoft AI",
    icon: "⊞",
    color: "#00A4EF",
    accent: "#A8DEFF",
    bg: "#041220",
    tagline: "Copilot 80+ · Azure Foundry · Wave 3",
    badge: "ENTERPRISE",
    sections: [
      {
        title: "Microsoft Copilot Family",
        sub: "80+ Products · Wave 3 · Frontier Suite (Claude + OpenAI)",
        color: "#00A4EF",
        tools: [
          { name: "Microsoft 365 Copilot", company: "Microsoft · Wave 3 2026", desc: "AI ใน Word, Excel, PowerPoint, Outlook, Teams — Agent Mode: create/refine docs iteratively", highlight: "🏆 80M+ Users", badge: "🏆 Most Used", detail: "ต้องมี M365 E3/E5 + $30/user/month add-on" },
          { name: "GitHub Copilot", company: "Microsoft · Developer Tool", desc: "AI coding assistant — code completion, PR review, agentic coding พร้อม Claude integration", highlight: "💻 1B+ Completions", badge: "💻 Dev #1", detail: "รองรับ VS Code, JetBrains, Neovim และอีก 10+ IDEs" },
          { name: "Copilot Studio", company: "Microsoft · No-Code Agent Builder", desc: "สร้าง custom AI agents โดยไม่เขียนโค้ด — publish ไป Teams, Web, Mobile, Facebook", highlight: "🤖 No-Code Agents", badge: "🤖 Builder", detail: "ใช้ Azure OpenAI GPT model พร้อม NLU และ topic management" },
          { name: "Azure Copilot", company: "Microsoft · Agentic Cloud Ops", desc: "6 specialized agents: migration, deployment, optimization, observability, resiliency, troubleshooting", highlight: "☁️ Agentic Cloud", badge: "☁️ DevOps", detail: "ยังอยู่ใน gated preview — align กับ RBAC และ Azure Policy อัตโนมัติ" },
          { name: "Security Copilot", company: "Microsoft Security", desc: "วิเคราะห์ threats ใน Defender, Entra, Intune, Purview — AI-powered SOC", highlight: "🛡️ Enterprise Security", badge: "🛡️ Security", detail: "integrate กับ partner ecosystem ของ Microsoft Security ทั้งหมด" },
          { name: "Copilot Cowork (Preview)", company: "Microsoft + Anthropic", desc: "Long-running multi-step work ข้ามเวลา — สร้างร่วมกับ Anthropic นำ Claude Cowork มาสู่ M365", highlight: "✨ Built with Anthropic", badge: "✨ Preview", detail: "ยังอยู่ใน research preview — announce มีนาคม 2026" },
        ],
      },
      {
        title: "Azure AI Platform",
        sub: "Foundry · OpenAI · NIM · Claude on Azure",
        color: "#7FB3D3",
        tools: [
          { name: "Azure AI Foundry", company: "Microsoft Cloud", desc: "Platform หลัก build AI apps — รองรับ GPT, Claude, Phi, open source models ทั้งหมด", highlight: "🏗️ Core Platform", badge: "🏗️ Core", detail: "รวม Foundry IQ + Fabric IQ เชื่อม data sources ได้ครบ" },
          { name: "Azure OpenAI Service", company: "Microsoft + OpenAI", desc: "GPT-4o, o3, DALL-E 3, Whisper ผ่าน Azure — enterprise security + compliance", highlight: "🔒 Enterprise Grade", badge: "🔒 Secure", detail: "SOC 2, HIPAA, ISO 27001 — data ไม่ใช้ train model" },
          { name: "Claude on Azure Foundry", company: "Microsoft + Anthropic", desc: "Claude Opus/Sonnet พร้อมบน Azure Foundry — model flexibility ไม่ lock-in", highlight: "🤝 Anthropic Partnership", badge: "🤝 Partner", detail: "ประกาศ March 2026 — Claude available ใน Copilot Frontier program" },
          { name: "Microsoft AI Skills (132+)", company: "GitHub microsoft/skills", desc: "Skills ecosystem สำหรับ AI coding agents — MCP servers, custom agents, Agents.md", highlight: "📦 132 Skills", badge: "📦 Skills", detail: "ทำงานใน VS Code, GitHub Copilot, Claude และทุก tool ที่รองรับ standard" },
        ],
      },
    ],
  },
  {
    id: "grok",
    name: "Grok xAI",
    icon: "𝕏",
    color: "#E8C547",
    accent: "#FFF5A0",
    bg: "#120F00",
    tagline: "Grok 4 · DeepSearch · 2M Token · X Real-time",
    badge: "REAL-TIME",
    sections: [
      {
        title: "Grok Model Family 2026",
        sub: "xAI Colossus · 200,000 NVIDIA H100 GPUs",
        color: "#E8C547",
        tools: [
          { name: "Grok 4 Heavy", company: "xAI · Multi-Agent Flagship", desc: "Multi-agent sub-teams ทำงานขนาน — research synthesis จาก 50+ sources, complex analysis", highlight: "🏆 Most Powerful", badge: "🏆 Heavy", detail: "$300/month SuperGrok Heavy — enterprise-focused" },
          { name: "Grok 4 / Grok 4 Fast", company: "xAI · Flagship + Speed", desc: "Most intelligent model + Fast variant < 2 วินาที — real-time X data integration", highlight: "⚡ Speed + Intelligence", badge: "⚡ Flagship", detail: "$3.00/1M tokens — $0.20 สำหรับ Fast variants" },
          { name: "Grok 3 Mini", company: "xAI · Budget Reasoning", desc: "High GPQA score ต้นทุนต่ำ — เหมาะ startups และ logic-based reasoning tasks", highlight: "💰 Best Value", badge: "💰 Efficient", detail: "แนะนำสำหรับ high-volume applications ที่ cost เป็นปัจจัยหลัก" },
          { name: "grok-code-fast-1", company: "xAI · Agentic Coding", desc: "Reasoning model สำหรับ agentic coding โดยเฉพาะ — เร็วและประหยัด", highlight: "💻 Code Specialist", badge: "💻 Code", detail: "ราคา $0.20/1M tokens — ต่ำสุดใน Grok family" },
        ],
      },
      {
        title: "Grok Unique Capabilities",
        sub: "สิ่งที่มีเฉพาะ Grok เท่านั้น",
        color: "#D4A520",
        tools: [
          { name: "DeepSearch + DeeperSearch", company: "xAI · Real-time Research", desc: "Multi-source real-time research จาก web + X platform — synthesize conflicting information", highlight: "🔍 Real-time Truth", badge: "🔍 Search", detail: "DeeperSearch ใช้ extended search + reasoning — available แม้ใน free tier" },
          { name: "X / Twitter Data Integration", company: "xAI + X Platform", desc: "เข้าถึง live social data จาก X เฉพาะ Grok เท่านั้น — trend analysis, sentiment, viral content", highlight: "📡 Social Intelligence", badge: "📡 Exclusive", detail: "ข้อมูล real-time ที่ AI อื่นเข้าไม่ได้ — ข้อได้เปรียบสำคัญ" },
          { name: "Grok Imagine 1.0", company: "xAI Media · Feb 2026", desc: "Text-to-Image + Image-to-Video (10 วินาที, 720p, audio) — 1.245 billion videos สร้างใน 30 วัน", highlight: "🎬 1.2B Videos", badge: "🎬 Media", detail: "Aurora model — text-to-video + image-to-video + chibi template viral March 2026" },
          { name: "2M Token Context Window", company: "xAI · Largest Context", desc: "Context window ใหญ่ที่สุดในตลาด — วิเคราะห์ legal filings, research papers, code repos ทั้งหมด", highlight: "📄 2M Tokens", badge: "📄 Context", detail: "เทียบ: GPT-4o = 128K, Claude = 200K, Gemini = 2M, Grok = 2M" },
        ],
      },
    ],
  },
  {
    id: "google",
    name: "Google AI",
    icon: "G",
    color: "#34A853",
    accent: "#A8F0C0",
    bg: "#041208",
    tagline: "Gemini 3.1 · NotebookLM · Veo 3 · Workspace",
    badge: "MULTIMODAL",
    sections: [
      {
        title: "Google Gemini Ecosystem",
        sub: "2M Token · Workspace Integration · Real-time Search",
        color: "#34A853",
        tools: [
          { name: "Gemini 3.1 Pro", company: "Google DeepMind · Feb 2026", desc: "Flagship — Long-Context Reasoning 2M tokens, competitor analysis, multimodal PDF/video", highlight: "🏆 Best Google Model", badge: "🏆 Pro", detail: "Strong: planning, regional context | Weaker: L&D tasks" },
          { name: "Gemini 2.5 Flash", company: "Google · Speed Variant", desc: "Speed-optimized แต่คุณภาพใกล้เคียง Pro — เหมาะ high-volume, everyday tasks", highlight: "⚡ Fast + Quality", badge: "⚡ Flash", detail: "แนะนำสำหรับ API integration ที่ต้องการ throughput สูง" },
          { name: "Gemma 4 / Gemma 4 Turbo", company: "Google · Open Source", desc: "Open models: 1B/4B/12B/27B — run locally, CodeGemma, mobile-optimized Gemma 3n", highlight: "🔓 Open + Local", badge: "🔓 Open", detail: "Gemma 4 Turbo: 58.9GB → 18.5GB ด้วย NVFP4 quantization บน RTX 5090" },
          { name: "NotebookLM + Gemini Notebooks", company: "Google · Apr 2026 Integrated", desc: "Research hub — PDF/URL/video source, podcast, video overview, infographic, sync กับ Gemini app", highlight: "📚 Research Partner", badge: "📚 Research", detail: "เพิ่งรวมเข้า Gemini app อย่างสมบูรณ์ เมษายน 2026" },
          { name: "Veo 3.1", company: "Google · Video AI", desc: "Video generation ชั้นนำ — 8 วินาทีพร้อมเสียง, interactive direction, text-to-video สมจริง", highlight: "🎬 Best Video AI", badge: "🎬 Video", detail: "Available เฉพาะ Google AI Ultra subscribers" },
        ],
      },
    ],
  },
  {
    id: "nvidia",
    name: "NVIDIA AI",
    icon: "∇",
    color: "#76B900",
    accent: "#C8F060",
    bg: "#081200",
    tagline: "NIM · AI-Q · Agent Toolkit · Blueprints",
    badge: "INFRASTRUCTURE",
    sections: [
      {
        title: "NVIDIA AI Stack 2026",
        sub: "The Engine Behind Every AI Company",
        color: "#76B900",
        tools: [
          { name: "NVIDIA NIM", company: "NVIDIA Developer Platform", desc: "Accelerated inference microservices — deploy AI models บน GPU ทุกที่ stable API + enterprise support", highlight: "⚡ Run AI Anywhere", badge: "⚡ Core", detail: "Cloud (AWS/Azure/GCP) หรือ On-Premise — ใช้ใน OpenAI, Microsoft, Google" },
          { name: "NVIDIA AI-Q Blueprint", company: "NVIDIA + LangChain · #1 Ranking", desc: "#1 Deep Research Agent บน DeepResearch Bench I+II — hybrid frontier + Nemotron open models", highlight: "🏆 #1 Research Agent", badge: "🏆 #1", detail: "ลดค่า query 50%+ ด้วย hybrid approach — open source ใช้ได้ฟรี" },
          { name: "NVIDIA Agent Toolkit", company: "NVIDIA · GTC 2026 Announce", desc: "OpenShell + AI-Q + Nemotron — ecosystem สร้าง self-evolving enterprise AI agents", highlight: "🤖 Self-Evolving Agents", badge: "🤖 Agents", detail: "Partners: Adobe, SAP, Salesforce, ServiceNow, Cisco, CrowdStrike" },
          { name: "NVIDIA Blueprints", company: "NVIDIA Partner Ecosystem", desc: "Pre-built AI workflows: Customer Service Avatar, RAG, Drug Discovery, Financial Data Flywheel", highlight: "📐 Ready-to-Deploy", badge: "📐 Blueprints", detail: "Free to download — deploy ใน production ด้วย NVIDIA AI Enterprise" },
          { name: "Nemotron Open Models", company: "NVIDIA · Open Source LLMs", desc: "Enterprise LLMs open source — ใช้ใน AI-Q Blueprints, ลด cost สำหรับ specialized tasks", highlight: "💰 Cut Cost 50%", badge: "💰 Efficient", detail: "เหมาะสำหรับ domain-specific fine-tuning โดยไม่ต้องใช้ frontier models" },
        ],
      },
    ],
  },
];

const COMPARE_ROWS = [
  ["📝 เขียน/draft เอกสาร", "— (ภาษาจีน)", "M365 Copilot ✦", "Grok 4", "Gemini+Docs ✦", "NeMo"],
  ["🔍 Real-time Search", "DeepSeek ✦", "Copilot+Bing", "DeepSearch ✦", "Gemini+Search ✦", "—"],
  ["💻 AI Coding", "DeepSeek R1", "GitHub Copilot ✦", "grok-code-fast", "Gemini Flash", "NIM+NeMo"],
  ["🎬 Video Generation", "Doubao Video", "—", "Grok Imagine ✦", "Veo 3.1 ✦", "Blueprints"],
  ["📚 Research/RAG", "Qwen RAG", "Azure AI Search", "Heavy Mode ✦", "NotebookLM ✦", "AI-Q ✦"],
  ["🤖 Enterprise Agents", "Yuanbao", "Copilot Studio ✦", "Grok Business", "Gemini Gems", "Blueprints ✦"],
  ["💰 ต้นทุนต่ำ", "DeepSeek ✦✦", "M365 (bundled)", "Grok Mini ✦", "Gemini Free ✦", "Nemotron ✦"],
  ["🏗️ Infrastructure", "— (Huawei)", "Azure Foundry ✦", "xAI API", "Google Cloud AI", "NIM GPU ✦"],
  ["🌏 Thailand/ASEAN", "Mali AI ✦", "Azure Thailand", "—", "Gemini Thai", "—"],
];

export default function App() {
  const [activeBrand, setActiveBrand] = useState("china");
  const [activeSection, setActiveSection] = useState(0);
  const [expandedTool, setExpandedTool] = useState(null);

  const brand = BRANDS.find(b => b.id === activeBrand);
  const section = brand.sections[Math.min(activeSection, brand.sections.length - 1)];

  return (
    <div style={{ minHeight: "100vh", background: "#080808", fontFamily: "'Segoe UI', 'Sarabun', sans-serif", color: "#DDD8D0" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
        .btn { transition: all 0.2s; cursor: pointer; }
        .btn:hover { opacity: 1 !important; }
        .card { transition: all 0.2s; cursor: pointer; }
        .card:hover { transform: translateY(-2px); }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .fade { animation: fadeUp 0.28s ease forwards; }
        @keyframes shimmer { 0%,100%{opacity:0.7} 50%{opacity:1} }
      `}</style>

      {/* Header */}
      <div style={{ background: "#060606", borderBottom: "1px solid #141414", padding: "18px 20px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: "linear-gradient(135deg,#D4A853,#C07830)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#080808", flexShrink: 0 }}>OT</div>
            <div>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>OpenThai<span style={{ color: "#D4A853" }}>·AI</span></span>
              <span style={{ fontSize: 10, color: "#444", marginLeft: 8, letterSpacing: "0.2em" }}>GLOBAL AI HUB 2026</span>
              <div style={{ fontSize: 10, color: "#3A3A3A", letterSpacing: "0.12em" }}>🇨🇳 CHINA · ⊞ MICROSOFT · 𝕏 GROK · G GOOGLE · ∇ NVIDIA</div>
            </div>
            <div style={{ marginLeft: "auto", padding: "4px 12px", background: "rgba(232,69,69,0.12)", border: "1px solid rgba(232,69,69,0.25)", borderRadius: 16, fontSize: 10, color: "#E84545", letterSpacing: "0.1em", animation: "shimmer 2s infinite" }}>
              🔴 LIVE · UPDATED APR 2026
            </div>
          </div>

          {/* Brand tabs */}
          <div style={{ display: "flex", gap: 2, overflowX: "auto", paddingBottom: 0 }}>
            {BRANDS.map(b => (
              <button key={b.id} className="btn"
                onClick={() => { setActiveBrand(b.id); setActiveSection(0); setExpandedTool(null); }}
                style={{
                  background: activeBrand === b.id ? `${b.color}14` : "transparent",
                  border: "none",
                  borderBottom: activeBrand === b.id ? `2px solid ${b.color}` : "2px solid transparent",
                  padding: "10px 16px", fontSize: 12,
                  color: activeBrand === b.id ? b.color : "#3A3A3A",
                  fontWeight: activeBrand === b.id ? 700 : 400,
                  whiteSpace: "nowrap",
                }}>
                {b.icon} {b.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 18px 80px" }}>

        {/* Brand hero */}
        <div style={{ background: `linear-gradient(135deg, ${brand.bg}, #0A0A0A)`, border: `1px solid ${brand.color}28`, borderRadius: 12, padding: "18px 22px", marginBottom: 22, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }} className="fade">
          <div style={{ width: 52, height: 52, borderRadius: 13, background: `${brand.color}18`, border: `1px solid ${brand.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: brand.color, fontWeight: 900, flexShrink: 0 }}>{brand.icon}</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{brand.name}</span>
              <span style={{ fontSize: 9, padding: "2px 8px", background: `${brand.color}20`, border: `1px solid ${brand.color}35`, borderRadius: 10, color: brand.color, letterSpacing: "0.15em" }}>{brand.badge}</span>
            </div>
            <div style={{ fontSize: 12, color: "#555" }}>{brand.tagline}</div>
          </div>
          {/* Section selector */}
          {brand.sections.length > 1 && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {brand.sections.map((s, i) => (
                <button key={i} className="btn"
                  onClick={() => { setActiveSection(i); setExpandedTool(null); }}
                  style={{ background: activeSection === i ? `${brand.color}20` : "#111", border: `1px solid ${activeSection === i ? brand.color + "50" : "#222"}`, borderRadius: 8, padding: "5px 12px", fontSize: 11, color: activeSection === i ? brand.color : "#444", cursor: "pointer" }}>
                  {["📌", "📊", "🌐"][i]} {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Section title */}
        <div style={{ marginBottom: 18 }} key={`${activeBrand}-${activeSection}`} className="fade">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 3, height: 18, background: section.color, borderRadius: 2 }} />
            <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{section.title}</span>
          </div>
          <div style={{ fontSize: 11, color: "#555", marginLeft: 11, marginTop: 2 }}>{section.sub}</div>
        </div>

        {/* Tools */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 12, marginBottom: 32 }} className="fade">
          {section.tools.map((tool, i) => {
            const key = `${activeBrand}-${activeSection}-${i}`;
            const isOpen = expandedTool === key;
            return (
              <div key={i} className="card"
                onClick={() => setExpandedTool(isOpen ? null : key)}
                style={{ background: isOpen ? `${section.color}0A` : "#0D0D0D", border: `1px solid ${isOpen ? section.color + "50" : "#1A1A1A"}`, borderRadius: 10, overflow: "hidden", position: "relative" }}>
                {isOpen && <div style={{ height: 2, background: `linear-gradient(90deg, ${section.color}, transparent)` }} />}
                <div style={{ padding: "15px 17px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: isOpen ? "#fff" : "#B0A8A0", letterSpacing: "-0.2px" }}>{tool.name}</span>
                    <span style={{ fontSize: 9, padding: "2px 8px", background: `${section.color}18`, border: `1px solid ${section.color}30`, borderRadius: 10, color: section.color, whiteSpace: "nowrap", flexShrink: 0 }}>{tool.badge}</span>
                  </div>
                  {tool.company && <div style={{ fontSize: 10, color: section.color + "AA", marginBottom: 6, letterSpacing: "0.05em" }}>{tool.company}</div>}
                  <div style={{ fontSize: 12, color: "#666", lineHeight: 1.65 }}>{tool.desc}</div>
                  {tool.highlight && (
                    <div style={{ marginTop: 8, padding: "4px 10px", background: `${section.color}10`, border: `1px solid ${section.color}20`, borderRadius: 6, fontSize: 11, color: section.color + "CC" }}>{tool.highlight}</div>
                  )}
                  {isOpen && tool.detail && (
                    <div style={{ marginTop: 10, padding: "8px 12px", background: "#060606", border: "1px solid #1E1E1E", borderRadius: 7, fontSize: 11.5, color: "#777", lineHeight: 1.6 }}>
                      💡 {tool.detail}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* FULL Comparison Matrix */}
        <div style={{ background: "#090909", border: "1px solid #161616", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #161616", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 3, height: 16, background: "#D4A853", borderRadius: 2 }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Global AI Comparison Matrix</span>
            <span style={{ fontSize: 10, color: "#444", marginLeft: 4 }}>🇨🇳 China · ⊞ Microsoft · 𝕏 Grok · G Google · ∇ NVIDIA</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead>
                <tr>
                  {["Use Case", "🇨🇳 China AI", "⊞ Microsoft", "𝕏 Grok", "G Google", "∇ NVIDIA"].map((h, i) => (
                    <th key={i} style={{ padding: "9px 13px", textAlign: "left", color: i === 0 ? "#444" : [null, "#E84545", "#00A4EF", "#E8C547", "#34A853", "#76B900"][i], borderBottom: "1px solid #161616", fontWeight: 700, whiteSpace: "nowrap", fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? "transparent" : "#050505" }}>
                    {row.map((cell, ci) => {
                      const isHighlight = cell.includes("✦");
                      const colors = [null, "#E84545", "#00A4EF", "#E8C547", "#34A853", "#76B900"];
                      return (
                        <td key={ci} style={{ padding: "8px 13px", color: ci === 0 ? "#666" : isHighlight ? colors[ci] : "#3A3A3A", fontWeight: isHighlight ? 700 : 400, borderBottom: "1px solid #111", fontSize: 11 }}>
                          {cell.replace(" ✦✦", " ⭐⭐").replace(" ✦", " ⭐")}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "8px 20px", borderTop: "1px solid #111" }}>
            <span style={{ fontSize: 10, color: "#2A2A2A" }}>⭐ = recommended · ⭐⭐ = best-in-class · by OpenThai.AI team</span>
          </div>
        </div>

        {/* China AI special insight */}
        <div style={{ background: "linear-gradient(135deg, #150505, #0A0A0A)", border: "1px solid rgba(232,69,69,0.2)", borderRadius: 12, padding: "18px 22px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#E84545", marginBottom: 12, letterSpacing: "0.1em" }}>🐉 CHINA AI INSIGHT — ทำไมธุรกิจไทยต้องสนใจ</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {[
              { icon: "💰", title: "ราคาถูกกว่า 5–10×", desc: "DeepSeek API ต้นทุนต่ำกว่า GPT-4 มากสำหรับ SMEs ไทย" },
              { icon: "🇨🇳🇹🇭", title: "Thai-China Commerce", desc: "Doubao + Qwen รองรับภาษาจีน-ไทยดีกว่า model อเมริกา" },
              { icon: "🌸", title: "Mali AI Ambassador", desc: "ตัวอย่าง AI Soft Power — โอกาส creative economy ไทย" },
              { icon: "⚡", title: "Voice AI 70ms", desc: "เร็วกว่า GPT-4o voice — เหมาะ real-time customer service" },
            ].map((item, i) => (
              <div key={i} style={{ background: "rgba(232,69,69,0.05)", border: "1px solid rgba(232,69,69,0.12)", borderRadius: 8, padding: "11px 14px" }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{item.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#E84545", marginBottom: 3 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: "#555" }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* OpenThai footer */}
        <div style={{ background: "linear-gradient(135deg,#100C02,#080808)", border: "1px solid rgba(212,168,83,0.18)", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 24 }}>🇹🇭</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#D4A853" }}>OpenThai.AI — Hub รวม AI โลกทั้งหมดในภาษาไทย</div>
            <div style={{ fontSize: 11, color: "#555" }}>China 🇨🇳 · Microsoft ⊞ · Grok 𝕏 · Google G · NVIDIA ∇ · Claude · ChatGPT + 40 tools</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["Partner 20–30%", "Commission ทุก sale", "Support 7 วัน"].map(t => (
              <span key={t} style={{ fontSize: 9.5, padding: "3px 10px", background: "rgba(212,168,83,0.08)", border: "1px solid rgba(212,168,83,0.18)", borderRadius: 14, color: "#D4A853" }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
