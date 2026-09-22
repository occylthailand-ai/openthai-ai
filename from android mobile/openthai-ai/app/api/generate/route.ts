import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { product, platform, langs } = await req.json()
    const langNames: Record<string,string> = { th:'Thai', 'zh-TW':'Traditional Chinese', 'zh-CN':'Simplified Chinese', en:'English' }
    const langList = (langs || ['th','zh-TW','en']).map((l:string) => langNames[l] || l).join(', ')

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `คุณคือ Openthai.ai — ผู้เชี่ยวชาญด้าน Cross-border E-commerce สำหรับผู้ขายไทย

สร้าง Product Description สำหรับ Platform: ${platform}
สินค้า: ${product}
ภาษา: ${langList}

กฎ:
- แต่ละภาษาขึ้นต้นด้วย emoji flag + ชื่อภาษา
- เนื้อหาเหมาะกับ ${platform} โดยเฉพาะ
- ใช้ keyword ที่ช่วย SEO และ algorithm
- สำหรับภาษาจีนใช้ภาษาที่คนจีนใช้จริง
- ปิดท้ายด้วย 💡 Tips 1 ข้อ`
      }]
    })

    const content = message.content.find(c => c.type === 'text')?.text || ''
    return NextResponse.json({ content })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
