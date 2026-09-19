/**
 * หมวด 2 — RAM / Context: Multi-Agent Orchestrator
 * ประสานงาน 15 agent definitions → เลือก agent ที่เหมาะสม → เรียกใช้
 */

import { buildContext, saveAgentMemory, recallAgentMemory } from './rag-pipeline.js'

const AGENT_REGISTRY = {
  'producer-agent':       { namespace: 'producer',      description: 'เกษตรกร โรงงาน OTOP' },
  'intermediary-agent':   { namespace: 'intermediary',  description: 'เทรดเดอร์ นายหน้า โลจิสติกส์' },
  'platform-agent':       { namespace: 'platform',      description: 'แพลตฟอร์ม OpenThai.ai' },
  'consumer-agent':       { namespace: 'consumer',      description: 'ผู้บริโภค สิทธิสวัสดิการ' },
  'ecosystem-agent':      { namespace: 'ecosystem',     description: 'นักพัฒนา หน่วยงานรัฐ' },
  'professional-agent':   { namespace: 'professional',  description: 'แพทย์ ทนาย นักบัญชี' },
  'ai-ml-engineer':       { namespace: 'ai_ml',         description: 'โมเดล RAG Fine-tune' },
  'backend-engineer':     { namespace: 'backend',       description: 'API ฐานข้อมูล' },
  'frontend-engineer':    { namespace: 'frontend',      description: 'UI/UX Next.js' },
  'devops-sre':           { namespace: 'devops',        description: 'Docker CI/CD Monitoring' },
  'security-guard':       { namespace: 'security',      description: 'Zero Trust RBAC Audit' },
  'legal-compliance':     { namespace: 'legal',         description: 'PDPA กฎหมาย Non-MLM' },
  'data-analytics':       { namespace: 'data',          description: 'KPI Dashboard Pipeline' },
  'content-localization': { namespace: 'content',       description: 'TH/ZH/EN SEO เอกสาร' },
  'chief-of-staff':       { namespace: 'cof',           description: 'วางแผน แตกงาน ตรวจ Backlog' },
}

export function resolveAgent(intent) {
  const lower = intent.toLowerCase()
  if (/เกษตร|โรงงาน|otop|ผลิต|แปรรูป/.test(lower))       return 'producer-agent'
  if (/นายหน้า|โลจิสติกส์|ขนส่ง|ยี่ปั๊ว|ส่งออก/.test(lower))  return 'intermediary-agent'
  if (/แพทย์|พยาบาล|ทนาย|นักบัญชี|วิศวกร/.test(lower))    return 'professional-agent'
  if (/สิทธิ์|ผู้บริโภค|สวัสดิการ|ร้องเรียน/.test(lower))   return 'consumer-agent'
  if (/api|fastapi|database|backend|webhook/.test(lower))   return 'backend-engineer'
  if (/docker|deploy|ci|cd|nginx|monitor/.test(lower))      return 'devops-sre'
  if (/ความปลอดภัย|rbac|zero trust|audit/.test(lower))      return 'security-guard'
  if (/pdpa|กฎหมาย|สัญญา|mlm|affiliate/.test(lower))       return 'legal-compliance'
  if (/rag|โมเดล|fine-tune|vector|embedding/.test(lower))   return 'ai-ml-engineer'
  if (/dashboard|ui|หน้าจอ|react|jsx/.test(lower))          return 'frontend-engineer'
  if (/kpi|analytics|รายงาน|pipeline|data/.test(lower))     return 'data-analytics'
  if (/แปล|ภาษา|seo|เนื้อหา|zh|en/.test(lower))            return 'content-localization'
  return 'chief-of-staff'
}

export async function run({ agentId, task, sessionId, userId }) {
  const agent = AGENT_REGISTRY[agentId]
  if (!agent) throw new Error(`Unknown agent: ${agentId}`)

  // ดึง memory เดิมของ agent นี้
  const memories = await recallAgentMemory({ agentId, query: task, matchCount: 3 })
  const ragContext = await buildContext({ query: task, namespace: agent.namespace })

  const systemPrompt = `คุณคือ ${agentId} — ${agent.description}
ทำตาม CLAUDE.md: Thai-First, PDPA ก่อน, Non-MLM, ส่งมอบของจริง
${memories.length ? `\n[ความจำก่อนหน้า]\n${memories.map(m => m.content).join('\n---\n')}` : ''}
${ragContext ? `\n[บริบทจากคลังความรู้]\n${ragContext}` : ''}`

  // บันทึก task ลง agent memory
  await saveAgentMemory({ agentId, content: `Task: ${task}`, sessionId })

  return { agentId, systemPrompt, task, sessionId, userId }
}

export async function dispatch({ intent, task, sessionId, userId }) {
  const agentId = resolveAgent(intent)
  return run({ agentId, task, sessionId, userId })
}
