/* ============ F1T · Premium ============
   Premium plans, KBZPay purchase flow with screenshot + transaction ID,
   admin-reported claims, PRO badge, scoreboard (real database),
   streak restore, pro AI coach personas, BLE fitness-device pairing,
   and the wallet-style success animation.
   Standalone: only touches app.js through tiny surgical hooks. */
(function(){
"use strict";
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const t=k=>window.F1T_I18N?((window.F1T_I18N[document.documentElement.lang]||{})[k]!==undefined?(window.F1T_I18N[document.documentElement.lang]||{})[k]:(window.F1T_I18N.en[k]||k)):k;
const ic=(n,s)=>window.f1tIcon?window.f1tIcon(n,s||20):"";

const KBZ_NUMBER="09 457 322 394";
const PLANS={
  monthly:{price:3000, per:"perMonth"},
  yearly:{price:30000, per:"perYear"},
};

/* ---------- state ---------- */
function getPremium(){
  try{ return JSON.parse(localStorage.getItem("f1t_premium")||"null")||{status:"none"}; }
  catch(e){ return {status:"none"}; }
}
function savePremium(p){ try{ localStorage.setItem("f1t_premium",JSON.stringify(p)); }catch(e){} }
function isPremium(){
  const p=getPremium();
  return p.status==="active" && p.expiresAt && p.expiresAt>Date.now();
}
function persona(){ try{ return localStorage.getItem("f1t_coach_persona")||"coach"; }catch(e){ return "coach"; } }
function setPersona(v){ try{ localStorage.setItem("f1t_coach_persona",v); }catch(e){} }

/* persona system prompts (premium personas are richer) */
function sysFor(per){
  const base=" inside the F1T calorie tracker app. Use metric units. Never diagnose medical conditions; suggest a professional for health concerns. ";
  if(per==="pro") return "You are F1T Pro Coach, an elite strength-and-conditioning coach"+base+
    "You write like a world-class coach: precise, structured, periodized. Give sets x reps x load, rest times, and progression rules. Reference the user's logged data when relevant. Replies can be detailed (up to 220 words) with clear formatting. Push for progressive overload and consistency. ";
  if(per==="nutri") return "You are F1T Nutritionist, a sports nutrition specialist"+base+
    "You give practical meal structure, protein targets per meal, pre/post-workout fueling, and hydration guidance. Reference Myanmar foods from the app's database when helpful. Clear structure, up to 200 words. ";
  return "You are F1T Coach, an expert fitness and nutrition coach"+base+
    "Reply concisely (under 120 words unless asked for detail), practical and encouraging. ";
}

/* ---------- streak helpers (computed from real logs) ---------- */
function calcStreak(){
  let s=0; const now=new Date();
  for(let i=0;i<60;i++){ const d=new Date(now); d.setDate(d.getDate()-i);
    const k=window.F1T_todayKey(d);
    const day=window.F1TFB?window.F1TFB.loadDay(k):null;
    if(day&&day.kcal>0) s++; else break; }
  try{ const b=JSON.parse(localStorage.getItem("f1t_streak_bonus")||"null");
    if(b&&Date.now()<b.until) s+=b.days; }catch(e){}
  return s;
}
function streakPeak(){
  let p=0; try{ p=+localStorage.getItem("f1t_streak_peak")||0; }catch(e){}
  const s=calcStreak(); if(s>p){ p=s; try{ localStorage.setItem("f1t_streak_peak",String(p)); }catch(e){} }
  return p;
}
function canRestore(){
  if(!isPremium()) return false;
  const last=+localStorage.getItem("f1t_restore_at")||0;
  return Date.now()-last>7*864e5;
}
function doRestore(){
  const peak=streakPeak(); if(peak<2) return false;
  try{
    localStorage.setItem("f1t_streak_bonus",JSON.stringify({days:peak,until:Date.now()+7*864e5}));
    localStorage.setItem("f1t_restore_at",String(Date.now()));
  }catch(e){ return false; }
  return true;
}

/* ---------- power score + scoreboard ---------- */
function guestId(){
  let id=null; try{ id=localStorage.getItem("f1t_gid"); }catch(e){}
  if(!id){ id="g"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
    try{ localStorage.setItem("f1t_gid",id); }catch(e){} }
  return id;
}
function powerScore(){
  let wos=0, vol=0;
  try{
    const ws=JSON.parse(localStorage.getItem("f1t_workouts")||"[]");
    const cut=Date.now()-30*864e5;
    ws.forEach(w=>{ if(w.ts&&w.ts>=cut){ wos++;
      (w.exercises||[]).forEach(ex=>{(ex.sets||[]).forEach(s=>{ vol+=(s.kg||0)*(s.reps||0); });}); }});
  }catch(e){}
  return Math.round(wos*500 + vol/20 + calcStreak()*100);
}
async function syncBoard(){
  let name="Athlete", color=0;
  try{ const p=JSON.parse(localStorage.getItem("f1t_profile")||"null");
    if(p){ name=p.name||name; color=p.color||0; } }catch(e){}
  const entry={ id:(window.F1TFB&&window.F1TFB.uid)||guestId(), name:String(name).slice(0,24),
    color, score:powerScore(), streak:calcStreak(), premium:isPremium(), ts:Date.now() };
  if(window.F1TFB) await window.F1TFB.boardSet(entry);
  return entry;
}
async function loadBoard(){
  if(window.F1TFB) return window.F1TFB.boardTop(50);
  return [];
}

/* ---------- premium hub ---------- */
function badgeHTML(){ return `<span class="pro-badge">${ic("crown",12)}PRO</span>`; }
function statusPill(){
  const p=getPremium();
  if(isPremium()) return `<span class="pill good">${t("premiumActive")}</span>`;
  if(p.status==="pending") return `<span class="pill warn">${t("premiumPending")}</span>`;
  return `<span class="pill">${t("premiumFree")}</span>`;
}
function openPremiumHub(){
  const p=getPremium(), prem=isPremium();
  const feats=["premiumFeat1","premiumFeat2","premiumFeat3","premiumFeat4","premiumFeat5","premiumFeat6"];
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal modal-tall"><div class="sheet-grip"></div>
    <div class="prem-hero"><div class="prem-crown">${ic("crown",40)}</div>
      <h2>F1T <span style="color:var(--lime)">Premium</span></h2>
      <p>${t("premiumTag")}</p>${statusPill()}
      ${prem&&p.expiresAt?`<div class="prem-until">${t("activeUntil")}: ${new Date(p.expiresAt).toLocaleDateString()}</div>`:""}
      ${p.status==="pending"?`<div class="prem-note">${t("pendingNote")}</div>`:""}
    </div>
    <div class="plan-cards">
      ${["monthly","yearly"].map(k=>{const pl=PLANS[k];return `
      <button class="plan-card${k==="yearly"?" best":""}" data-plan="${k}">
        ${k==="yearly"?`<span class="plan-flag">${t("bestValue")} · ${t("save2mo")}</span>`:""}
        <b>${t(k)}</b><span class="plan-price">${pl.price.toLocaleString()} MMK</span>
        <small>${t(pl.per)}</small>
        <span class="plan-cta">${t("buyNow")}</span>
      </button>`;}).join("")}
    </div>
    <h3 class="prem-h">${t("premiumFeatures")}</h3>
    <div class="feat-grid">${feats.map((f,i)=>`
      <div class="glass-card feat"><span class="f-ico">${ic(["crown","flame","mic","watch","zap","trophy"][i],20)}</span>
      <span>${t(f)}</span></div>`).join("")}</div>
    <h3 class="prem-h">${t("devices")}</h3>
    <button class="glass-card menu-row" id="prem-dev"><span class="mr-ico">${ic("watch",20)}</span>
      <span class="mr-t">${t("connectWatch")}</span><span class="hr-live hidden" id="hr-live">-- ${t("bpm")}</span>
      <span class="chev">›</span></button>
    <h3 class="prem-h">${t("premiumPlans")}</h3>
    ${[["planStrength","planStrengthD"],["planShred","planShredD"]].map(x=>`
      <div class="glass-card plan-row2"><div><b>${t(x[0])}</b><small>${t(x[1])}</small></div>
      <button class="btn-lime sm" data-proplan="${t(x[0])}">${prem?t("startPlan"):t("proOnly")}</button></div>`).join("")}
    <div style="height:8px"></div>
  </div></div>`;
  $$("#modal-root [data-plan]").forEach(b=>b.onclick=()=>openPurchase(b.dataset.plan));
  $$("#modal-root [data-proplan]").forEach(b=>b.onclick=()=>{
    if(!isPremium()){ openPremiumHub(); return; }
    closeModal(); setTimeout(()=>{ if(window.F1T_PREMIUM_ASK) window.F1T_PREMIUM_ASK(b.dataset.proplan); },300);
  });
  $("#prem-dev").onclick=connectDevice;
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
  paintHR();
}
function closeModal(){
  const root=$("#modal-root"), m=root.querySelector(".modal"), b=root.querySelector(".mback");
  if(!m){ root.innerHTML=""; return; }
  m.classList.add("m-out"); if(b) b.classList.add("mback-out");
  setTimeout(()=>{ root.innerHTML=""; },190);
}

/* ---------- purchase flow ---------- */
let shotData=null;
function openPurchase(plan){
  const pl=PLANS[plan]; shotData=null;
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${t("payKZ")}</h2>
    <div class="buy-plan"><b>${t(plan)}</b><span>${pl.price.toLocaleString()} MMK ${t(pl.per)}</span></div>
    <p class="buy-step">${t("kbzStep1")}</p>
    <div class="kbz-box"><b id="kbz-num">${KBZ_NUMBER}</b>
      <button class="btn-lime sm" id="kbz-copy">${t("copy")}</button></div>
    <p class="buy-step">${t("kbzStep2")}</p>
    <label class="shot-up" id="shot-up"><input type="file" id="shot-in" accept="image/*" hidden>
      <span id="shot-label">${ic("camera",22)}<small>${t("uploadShot")}</small></span>
      <img id="shot-prev" class="hidden" alt=""></label>
    <div class="field"><label>${t("txnId")}</label>
      <input id="txn-in" inputmode="numeric" placeholder="${t("txnIdPh")}"></div>
    <button class="btn-lime big" id="claim-go">${t("submitClaim")}</button>
  </div></div>`;
  $("#kbz-copy").onclick=async()=>{ try{ await navigator.clipboard.writeText(KBZ_NUMBER.replace(/\s/g,""));
    toast(t("copied")); }catch(e){ toast(KBZ_NUMBER); } };
  $("#shot-in").onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    const img=new Image();
    img.onload=()=>{ const c=document.createElement("canvas");
      const sc=Math.min(1,900/Math.max(img.width,img.height));
      c.width=img.width*sc; c.height=img.height*sc;
      c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      shotData=c.toDataURL("image/jpeg",0.72);
      const pv=$("#shot-prev"); pv.src=shotData; pv.classList.remove("hidden");
      $("#shot-label").classList.add("hidden");
      URL.revokeObjectURL(img.src); };
    img.src=URL.createObjectURL(f);
  };
  $("#claim-go").onclick=()=>submitClaim(plan);
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function toast(msg){ if(window.F1T_TOAST) window.F1T_TOAST(msg); }
async function submitClaim(plan){
  const txn=($("#txn-in").value||"").trim();
  if(!shotData||!txn){ toast(t("needShotTxn")); return; }
  const pl=PLANS[plan];
  let name="Athlete"; try{ const p=JSON.parse(localStorage.getItem("f1t_profile")||"null"); if(p&&p.name) name=p.name; }catch(e){}
  const claim={ id:"cl"+Date.now().toString(36), name, plan, amount:pl.price, txnId:txn,
    shot:shotData, ts:Date.now(), status:"pending",
    uid:(window.F1TFB&&window.F1TFB.uid)||guestId() };
  const where=window.F1TFB?await window.F1TFB.saveClaim(claim):"local";
  savePremium({status:"pending",plan,txnId:txn,since:Date.now()});
  payAnim();
}
/* wallet-style success animation */
function payAnim(){
  let ov=$("#payanim");
  if(!ov){ ov=document.createElement("div"); ov.id="payanim"; ov.className="payanim";
    ov.innerHTML=`<div class="pa-orb"><div class="pa-core"></div></div>
      <div class="pa-check"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l8 8 15-16"/></svg></div>
      <div class="pa-text"><b>${t("claimOk")}</b><small>${t("claimOkSub")}</small></div>
      <button class="btn-lime" id="pa-done">${t("done")}</button>`;
    document.body.appendChild(ov); }
  ov.querySelector(".pa-text b").textContent=t("claimOk");
  ov.querySelector(".pa-text small").textContent=t("claimOkSub");
  ov.querySelector("#pa-done").textContent=t("done");
  requestAnimationFrame(()=>ov.classList.add("on"));
  const hide=()=>{ ov.classList.remove("on"); closeModal(); };
  ov.querySelector("#pa-done").onclick=hide;
  ov.onclick=e=>{ if(e.target===ov) hide(); };
  setTimeout(()=>{ if(ov.classList.contains("on")) hide(); },6000);
}

/* ---------- scoreboard ---------- */
async function openScoreboard(){
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal modal-tall"><div class="sheet-grip"></div>
    <h2>${ic("trophy",22)} ${t("scoreboard")}</h2>
    <div class="board-note">${t("powerScore")} · 30 ${t("days")}</div>
    <div id="board-list"><div class="empty-note">${t("boardSync")}</div></div>
  </div></div>`;
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
  const me=await syncBoard();
  const rows=await loadBoard();
  const list=$("#board-list");
  if(!rows.length){ list.innerHTML=`<div class="empty-note">${t("noBoard")}</div>`; return; }
  const medal=["🥇","🥈","🥉"];
  list.innerHTML=rows.map((r,i)=>`
    <div class="board-row${r.id===me.id?" me":""}">
      <span class="b-rank">${medal[i]||(i+1)}</span>
      <span class="b-av" style="background:hsl(${(r.color||0)*72},60%,38%)">${(r.name||"A")[0].toUpperCase()}</span>
      <span class="b-name">${escapeHtml(r.name||"Athlete")}${r.premium?badgeHTML():""}</span>
      <span class="b-st">🔥${r.streak||0}</span>
      <b class="b-score">${(r.score||0).toLocaleString()}</b>
    </div>`).join("");
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

/* ---------- fitness devices (Web Bluetooth HR) ---------- */
let hrChar=null;
async function connectDevice(){
  if(!navigator.bluetooth){ toast(t("needChrome")); return; }
  try{
    const dev=await navigator.bluetooth.requestDevice({filters:[{services:["heart_rate"]}]});
    const g=await dev.gatt.connect();
    const svc=await g.getPrimaryService("heart_rate");
    hrChar=await svc.getCharacteristic("heart_rate_measurement");
    await hrChar.startNotifications();
    hrChar.addEventListener("characteristicvaluechanged",e=>{
      const v=e.target.value; const hr=v.getUint8(1);
      try{ localStorage.setItem("f1t_hr",JSON.stringify({hr,ts:Date.now()})); }catch(_){}
      paintHR(hr);
    });
    try{ localStorage.setItem("f1t_device",JSON.stringify({name:dev.name||"HR monitor",ts:Date.now()})); }catch(_){}
    toast((dev.name||"Device")+" ✓");
  }catch(e){ /* user cancelled */ }
}
function paintHR(hr){
  let h=hr; if(h==null){ try{ const s=JSON.parse(localStorage.getItem("f1t_hr")||"null");
    if(s&&Date.now()-s.ts<30000) h=s.hr; }catch(e){} }
  const el=$("#hr-live"); if(!el) return;
  if(h==null){ el.classList.add("hidden"); } else { el.classList.remove("hidden"); el.textContent=h+" "+t("bpm"); }
}

/* ---------- coach personas ---------- */
function paintPersonas(){
  const slot=$("#persona-row"); if(!slot) return;
  const cur=persona(), prem=isPremium();
  const defs=[["coach","personaCoach"],["pro","personaPro"],["nutri","personaNutri"]];
  slot.innerHTML=`<span class="pp-lab">${t("coachPersona")}</span>`+defs.map(d=>{
    const locked=d[0]!=="coach"&&!prem;
    return `<button class="pp${cur===d[0]?" on":""}${locked?" lock":""}" data-pp="${d[0]}">
      ${locked?ic("lock",11):""}${t(d[1])}${d[0]!=="coach"?" "+badgeHTML():""}</button>`; }).join("");
  $$("#persona-row [data-pp]").forEach(b=>b.onclick=()=>{
    const v=b.dataset.pp;
    if(v!=="coach"&&!isPremium()){ openPremiumHub(); return; }
    setPersona(v); paintPersonas();
  });
}

/* ---------- public API ---------- */
window.F1T_PREMIUM={isPremium,getPremium,persona,setPersona,sysFor,openPremiumHub,openScoreboard,
  paintPersonas,paintHR,connectDevice,doRestore,canRestore,calcStreak,streakPeak,powerScore,badgeHTML,closeModal};
window.openPremiumHub=openPremiumHub;
window.openScoreboard=openScoreboard;
})();
