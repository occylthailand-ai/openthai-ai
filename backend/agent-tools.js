// ── Agent Tools — Thai Function Calling schema, wired to real backend functions ──
// Uses Claude/Gemini's *native* tool-use APIs (no fine-tuning — see DECISIONS_LOG.md,
// "OpenThaiAi described as a foundation-model / tokenizer project" for why that's not
// how this works). Tools are deliberately narrow: read-only lookups that reuse
// existing contact-verified public endpoints, plus one write path (trigger_automation)
// that only fires pre-registered webhooks — the model picks an event name/payload,
// never a destination URL, so it can't be used to make arbitrary outbound requests.
//
// Canonical shape follows Anthropic's tool format (name, description, input_schema).
// toGeminiTools() adapts it to Gemini's functionDeclarations shape for the fallback path.

export const TOOL_DEFINITIONS = [
  {
    name: 'track_order',
    description: 'ตรวจสอบสถานะคำสั่งซื้อจากเลขที่ออเดอร์และช่องทางติดต่อของลูกค้า (อีเมล/เบอร์โทรที่ใช้ตอนสั่งซื้อ) — ใช้เมื่อผู้ใช้ถามว่าออเดอร์ของเขาถึงไหนแล้ว',
    input_schema: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: 'เลขที่คำสั่งซื้อ เช่น ord_1234567890_abcde' },
        contact: { type: 'string', description: 'อีเมลหรือเบอร์โทรที่ใช้ตอนสั่งซื้อ สำหรับยืนยันตัวตนผู้ถาม' },
      },
      required: ['order_id', 'contact'],
    },
  },
  {
    name: 'check_dispute_status',
    description: 'ตรวจสอบสถานะข้อพิพาทคำสั่งซื้อ (escrow dispute) จากเลขที่ข้อพิพาทและช่องทางติดต่อของฝ่ายที่เกี่ยวข้อง — ใช้เมื่อผู้ใช้ถามความคืบหน้าข้อพิพาทที่เปิดไว้',
    input_schema: {
      type: 'object',
      properties: {
        dispute_id: { type: 'string', description: 'เลขที่ข้อพิพาท เช่น dsp_1234567890_abcde' },
        contact: { type: 'string', description: 'อีเมลของฝ่ายที่เกี่ยวข้อง (ผู้เปิดข้อพิพาทหรืออีกฝ่าย) สำหรับยืนยันตัวตน' },
      },
      required: ['dispute_id', 'contact'],
    },
  },
  {
    name: 'list_skills',
    description: 'แสดงรายการทักษะ AI (Skills) ที่ OpenThaiAi มีให้ใช้งานจริงตอนนี้ กรองตามหมวดหมู่ได้ — ใช้เมื่อผู้ใช้ถามว่า OpenThaiAi ทำอะไรได้บ้าง',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'หมวดหมู่ที่ต้องการกรอง (ไม่บังคับ) เช่น content, quality, learning, evaluation' },
      },
    },
  },
  {
    name: 'trigger_automation',
    description: 'ส่ง event ไปยังระบบอัตโนมัติภายนอกที่ลงทะเบียนไว้แล้วเท่านั้น (เช่น n8n workflow ที่แอดมินตั้งค่าไว้) — ใช้เมื่อผู้ใช้ต้องการให้เริ่ม automation ที่มีอยู่แล้ว ไม่ใช่สำหรับส่งคำขอไป URL ใดๆ ที่ไม่ได้ลงทะเบียน',
    input_schema: {
      type: 'object',
      properties: {
        event: { type: 'string', description: 'ชื่อ event ที่จะส่ง เช่น agent.completed, content.generated, custom.command' },
        data: { type: 'object', description: 'ข้อมูลประกอบ event ที่จะส่งไปให้ปลายทางที่ลงทะเบียนไว้' },
      },
      required: ['event'],
    },
  },
];

// Gemini functionDeclarations use `parameters` instead of `input_schema` — otherwise identical shape.
export function toGeminiTools(defs = TOOL_DEFINITIONS) {
  return [{ functionDeclarations: defs.map(({ name, description, input_schema }) => ({ name, description, parameters: input_schema })) }];
}

// context: { orders, disputes, skillsRegistry, webhooks } — injected by server.js, which already owns these instances.
export async function executeTool(name, input, context) {
  const { orders, disputes, skillsRegistry, webhooks } = context;
  switch (name) {
    case 'track_order': {
      if (!orders) return { error: 'orders module not available' };
      return await orders.track(input?.order_id, input?.contact);
    }
    case 'check_dispute_status': {
      if (!disputes) return { error: 'disputes module not available' };
      return await disputes.track(input?.dispute_id, input?.contact);
    }
    case 'list_skills': {
      const list = (skillsRegistry || []).filter((s) => !input?.category || s.category === input.category);
      return { count: list.length, skills: list.map((s) => ({ id: s.id, name: s.name, category: s.category, endpoint: s.endpoint, status: s.status })) };
    }
    case 'trigger_automation': {
      if (!webhooks) return { error: 'webhook system not available' };
      const targetCount = webhooks.list().length;
      webhooks.dispatch(input?.event, input?.data || {});
      return { dispatched: true, event: input?.event, registered_targets: targetCount };
    }
    default:
      return { error: `unknown tool: ${name}` };
  }
}
