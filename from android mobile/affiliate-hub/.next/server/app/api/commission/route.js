"use strict";(()=>{var e={};e.id=768,e.ids=[768],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},1212:e=>{e.exports=require("async_hooks")},4770:e=>{e.exports=require("crypto")},6162:e=>{e.exports=require("stream")},1764:e=>{e.exports=require("util")},4492:e=>{e.exports=require("node:stream")},9051:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>y,patchFetch:()=>_,requestAsyncStorage:()=>f,routeModule:()=>u,serverHooks:()=>h,staticGenerationAsyncStorage:()=>b});var o={};r.r(o),r.d(o,{POST:()=>x});var i=r(9303),a=r(8716),n=r(670),s=r(7070),p=r(1585),d=r(6033),l=r(5662),c=r(6119);let g=p.Ry({ref_code:p.Z_(),buyer_name:p.Z_().optional(),product:p.Z_(),order_amount:p.Rx().positive(),omise_charge_id:p.Z_().optional(),secret:p.Z_()});async function x(e){try{let t=g.parse(await e.json());if(t.secret!==process.env.INTERNAL_API_SECRET)return s.NextResponse.json({error:"Unauthorized"},{status:401});let r=(0,l.p)(),o=parseFloat(process.env.COMMISSION_RATE??"0.35"),i=Math.floor(t.order_amount*o*100)/100,{data:a}=await r.from("aff_users").select("id, email, name").eq("ref_code",t.ref_code).limit(1);if(!a?.length)return s.NextResponse.json({error:"ref_code not found"},{status:404});let n=a[0],{data:p,error:d}=await r.from("aff_commissions").insert({user_id:n.id,ref_code:t.ref_code,buyer_name:t.buyer_name,product:t.product,order_amount:t.order_amount,rate:o,commission:i,status:"approved",omise_charge_id:t.omise_charge_id,approved_at:new Date().toISOString()}).select().single();if(d)throw d;await r.from("aff_clicks").update({converted:!0}).eq("ref_code",t.ref_code).eq("converted",!1).order("created_at",{ascending:!1}).limit(1),await m(r,n.id);let{data:x}=await r.from("aff_user_stats").select("balance").eq("id",n.id).single();return await (0,c.$E)(n.email,n.name,i,t.product,x?.balance??i).catch(console.error),s.NextResponse.json({success:!0,commission:i,id:p.id})}catch(e){if(e instanceof d.jm)return s.NextResponse.json({error:e.errors[0].message},{status:400});return console.error("commission error:",e),s.NextResponse.json({error:"Internal error"},{status:500})}}async function m(e,t){let{data:r}=await e.from("aff_user_stats").select("total_earned").eq("id",t).single(),o=r?.total_earned??0;await e.from("aff_users").update({level:o>=1e5?"Platinum":o>=3e4?"Gold":"Silver"}).eq("id",t)}let u=new i.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/commission/route",pathname:"/api/commission",filename:"route",bundlePath:"app/api/commission/route"},resolvedPagePath:"/home/user/openthai-ai/from android mobile/affiliate-hub/app/api/commission/route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:f,staticGenerationAsyncStorage:b,serverHooks:h}=u,y="/api/commission/route";function _(){return(0,n.patchFetch)({serverHooks:h,staticGenerationAsyncStorage:b})}},6119:(e,t,r)=>{r.d(t,{$E:()=>p,qV:()=>d,zk:()=>s});var o=r(6495);function i(){if(!process.env.RESEND_API_KEY)throw Error("RESEND_API_KEY not configured");return new o.R(process.env.RESEND_API_KEY)}let a=process.env.EMAIL_FROM??"noreply@openthai.ai",n=process.env.NEXT_PUBLIC_APP_URL??"https://openthai.ai";async function s(e,t,r){let o=`${n}/api/auth/verify-email?token=${r}`;await i().emails.send({from:a,to:e,subject:"✦ ยืนยันอีเมล — Affiliate Hub",html:`
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
          <a href="${o}" style="display:inline-block;background:rgba(240,180,41,0.12);border:1px solid rgba(240,180,41,0.35);border-radius:2px;padding:14px 48px;font-size:15px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#F0B429;text-decoration:none;">
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
</html>`})}async function p(e,t,r,o,s){await i().emails.send({from:a,to:e,subject:`✦ รับ Commission ฿${r.toLocaleString()} — Affiliate Hub`,html:`
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
              <td style="padding:14px 20px;font-size:13px;color:#E8EAF0;text-align:right;">${o}</td>
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
</html>`})}async function d(e,t,r,o,n){await i().emails.send({from:a,to:e,subject:`✦ ถอนเงิน ฿${r.toLocaleString()} — กำลังดำเนินการ`,html:`
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
            <tr><td style="padding:14px 20px;font-size:12px;color:#6A7490;">ช่องทาง</td><td style="padding:14px 20px;font-size:13px;color:#E8EAF0;text-align:right;">${"promptpay"===o?"PromptPay":"โอนธนาคาร"}</td></tr>
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
</html>`})}},5662:(e,t,r)=>{r.d(t,{p:()=>s});var o=r(7933);let i=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://placeholder.supabase.co",a=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"placeholder-anon",n=process.env.SUPABASE_SERVICE_ROLE_KEY||"placeholder-svc";(0,o.eI)(i,a);let s=()=>(0,o.eI)(i,n,{auth:{persistSession:!1}})}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),o=t.X(0,[276,972,370,911],()=>r(9051));module.exports=o})();