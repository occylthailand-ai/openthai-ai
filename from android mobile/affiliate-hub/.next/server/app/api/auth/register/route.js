"use strict";(()=>{var e={};e.id=2,e.ids=[2],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},1212:e=>{e.exports=require("async_hooks")},4770:e=>{e.exports=require("crypto")},6162:e=>{e.exports=require("stream")},1764:e=>{e.exports=require("util")},4492:e=>{e.exports=require("node:stream")},9965:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>A,patchFetch:()=>E,requestAsyncStorage:()=>b,routeModule:()=>m,serverHooks:()=>y,staticGenerationAsyncStorage:()=>f});var i={};r.r(i),r.d(i,{POST:()=>u});var o=r(9303),a=r(8716),n=r(670),s=r(7070),p=r(1585),l=r(6033),d=r(5662),g=r(6119),c=r(4770),x=r.n(c);let h=p.Ry({name:p.Z_().min(2,"ชื่อต้องมีอย่างน้อย 2 ตัวอักษร"),email:p.Z_().email("อีเมลไม่ถูกต้อง"),password:p.Z_().min(6,"รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")});async function u(e){try{let t=await e.json(),{name:r,email:i,password:o}=h.parse(t),a=(0,d.p)(),{data:n,error:p}=await a.auth.admin.createUser({email:i,password:o,email_confirm:!1});if(p){if(p.message.includes("already registered"))return s.NextResponse.json({error:"อีเมลนี้ถูกใช้แล้ว"},{status:409});throw p}let l=n.user.id,c=(r.replace(/\s+/g,"").replace(/[^a-zA-Zก-๙]/g,"").slice(0,6).toUpperCase()||"USER")+Math.floor(900*Math.random()+100).toString(),u=x().randomBytes(32).toString("hex"),m=x().createHash("sha256").update(u).digest("hex"),b=new Date(Date.now()+864e5).toISOString(),{error:f}=await a.from("aff_users").insert({id:l,email:i,name:r,ref_code:c,email_verified:!1,verify_token:m,verify_expires_at:b});if(f)throw f;return await (0,g.zk)(i,r,u),s.NextResponse.json({success:!0,message:"สมัครสมาชิกแล้ว กรุณาตรวจสอบอีเมลเพื่อยืนยัน",ref_code:c})}catch(e){if(e instanceof l.jm)return s.NextResponse.json({error:e.errors[0].message},{status:400});return console.error("register error:",e),s.NextResponse.json({error:"เกิดข้อผิดพลาด กรุณาลองใหม่"},{status:500})}}let m=new o.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/auth/register/route",pathname:"/api/auth/register",filename:"route",bundlePath:"app/api/auth/register/route"},resolvedPagePath:"/home/user/openthai-ai/from android mobile/affiliate-hub/app/api/auth/register/route.ts",nextConfigOutput:"",userland:i}),{requestAsyncStorage:b,staticGenerationAsyncStorage:f,serverHooks:y}=m,A="/api/auth/register/route";function E(){return(0,n.patchFetch)({serverHooks:y,staticGenerationAsyncStorage:f})}},6119:(e,t,r)=>{r.d(t,{$E:()=>p,qV:()=>l,zk:()=>s});var i=r(6495);function o(){if(!process.env.RESEND_API_KEY)throw Error("RESEND_API_KEY not configured");return new i.R(process.env.RESEND_API_KEY)}let a=process.env.EMAIL_FROM??"noreply@openthai.ai",n=process.env.NEXT_PUBLIC_APP_URL??"https://openthai.ai";async function s(e,t,r){let i=`${n}/api/auth/verify-email?token=${r}`;await o().emails.send({from:a,to:e,subject:"✦ ยืนยันอีเมล — Affiliate Hub",html:`
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#030407;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#0A0D18;border:1px solid rgba(240,180,41,0.2);border-radius:4px;">
        <tr><td style="padding:48px 40px;text-align:center;">
          <!-- Logo -->
          <div style="font-size:13px;letter-spacing:4px;text-transform:uppercase;color:#F0B429;margin-bottom:32px;">◆ AFFILIATE HUB</div>
          <!-- Heading -->
          <h1 style="font-size:28px;font-weight:300;color:#E8EAF0;margin:0 0 12px;line-height:1.3;">
            ยืนยันอีเมลของคุณ
          </h1>
          <p style="font-size:15px;color:#6A7490;margin:0 0 36px;line-height:1.7;">
            สวัสดี <strong style="color:#E8EAF0;">${t}</strong><br>
            คลิกปุ่มด้านล่างเพื่อยืนยันอีเมลและเริ่มรับ Commission
          </p>
          <!-- CTA -->
          <a href="${i}" style="display:inline-block;background:rgba(240,180,41,0.12);border:1px solid rgba(240,180,41,0.35);border-radius:2px;padding:14px 48px;font-size:15px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#F0B429;text-decoration:none;">
            ✦ ยืนยันอีเมล
          </a>
          <!-- Note -->
          <p style="font-size:12px;color:#3A4258;margin:32px 0 0;line-height:1.6;">
            ลิงก์นี้จะหมดอายุใน 24 ชั่วโมง<br>
            หากคุณไม่ได้สมัคร ไม่ต้องดำเนินการใด
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid rgba(240,180,41,0.08);text-align:center;">
          <p style="font-size:11px;letter-spacing:2px;color:#3A4258;margin:0;">AFFILIATE HUB \xb7 openthai.ai</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`})}async function p(e,t,r,i,s){await o().emails.send({from:a,to:e,subject:`✦ รับ Commission ฿${r.toLocaleString()} — Affiliate Hub`,html:`
<!DOCTYPE html>
<html lang="th">
<body style="margin:0;padding:0;background:#030407;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#0A0D18;border:1px solid rgba(240,180,41,0.2);border-radius:4px;">
        <tr><td style="padding:48px 40px;text-align:center;">
          <div style="font-size:13px;letter-spacing:4px;color:#F0B429;margin-bottom:24px;">◆ AFFILIATE HUB</div>
          <div style="font-size:48px;font-weight:700;color:#06D6A0;margin:0 0 8px;">฿${r.toLocaleString()}</div>
          <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#6A7490;margin-bottom:32px;">Commission เข้าบัญชีแล้ว</div>
          <table width="100%" style="background:#0D1020;border:1px solid rgba(240,180,41,0.1);border-radius:3px;margin-bottom:32px;">
            <tr>
              <td style="padding:14px 20px;font-size:12px;color:#6A7490;">สินค้า</td>
              <td style="padding:14px 20px;font-size:13px;color:#E8EAF0;text-align:right;">${i}</td>
            </tr>
            <tr style="border-top:1px solid rgba(240,180,41,0.08);">
              <td style="padding:14px 20px;font-size:12px;color:#6A7490;">ยอดสะสม</td>
              <td style="padding:14px 20px;font-size:13px;color:#F0B429;font-weight:700;text-align:right;">฿${s.toLocaleString()}</td>
            </tr>
          </table>
          <a href="${n}/dashboard" style="display:inline-block;background:rgba(240,180,41,0.1);border:1px solid rgba(240,180,41,0.3);border-radius:2px;padding:12px 36px;font-size:14px;letter-spacing:2px;text-transform:uppercase;color:#F0B429;text-decoration:none;">
            ดู Dashboard →
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`})}async function l(e,t,r,i,n){await o().emails.send({from:a,to:e,subject:`✦ ถอนเงิน ฿${r.toLocaleString()} — กำลังดำเนินการ`,html:`
<!DOCTYPE html>
<html lang="th">
<body style="margin:0;padding:0;background:#030407;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#0A0D18;border:1px solid rgba(240,180,41,0.2);border-radius:4px;">
        <tr><td style="padding:48px 40px;text-align:center;">
          <div style="font-size:13px;letter-spacing:4px;color:#F0B429;margin-bottom:24px;">◆ AFFILIATE HUB</div>
          <h2 style="font-size:22px;font-weight:400;color:#E8EAF0;margin:0 0 8px;">กำลังดำเนินการถอนเงิน</h2>
          <div style="font-size:36px;font-weight:700;color:#F0B429;margin:16px 0;">฿${r.toLocaleString()}</div>
          <table width="100%" style="background:#0D1020;border:1px solid rgba(240,180,41,0.1);border-radius:3px;margin:24px 0 32px;">
            <tr><td style="padding:14px 20px;font-size:12px;color:#6A7490;">ช่องทาง</td><td style="padding:14px 20px;font-size:13px;color:#E8EAF0;text-align:right;">${"promptpay"===i?"PromptPay":"โอนธนาคาร"}</td></tr>
            <tr style="border-top:1px solid rgba(240,180,41,0.08);">
              <td style="padding:14px 20px;font-size:12px;color:#6A7490;">ปลายทาง</td>
              <td style="padding:14px 20px;font-size:13px;color:#E8EAF0;text-align:right;">${n}</td>
            </tr>
            <tr style="border-top:1px solid rgba(240,180,41,0.08);">
              <td style="padding:14px 20px;font-size:12px;color:#6A7490;">ระยะเวลา</td>
              <td style="padding:14px 20px;font-size:13px;color:#06D6A0;text-align:right;">ภายใน 24 ชั่วโมง</td>
            </tr>
          </table>
          <p style="font-size:12px;color:#3A4258;line-height:1.7;margin:0;">หากมีคำถาม ติดต่อ <a href="mailto:support@openthai.ai" style="color:#F0B429;">support@openthai.ai</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`})}},5662:(e,t,r)=>{r.d(t,{p:()=>s});var i=r(7933);let o=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://placeholder.supabase.co",a=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"placeholder-anon",n=process.env.SUPABASE_SERVICE_ROLE_KEY||"placeholder-svc";(0,i.eI)(o,a);let s=()=>(0,i.eI)(o,n,{auth:{persistSession:!1}})}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),i=t.X(0,[276,972,370,911],()=>r(9965));module.exports=i})();