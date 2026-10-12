/* ============ F1T · Free features ============
   Everything is free: coach personas (Coach, Pro Coach, Nutritionist),
   scoreboard (real database), streak restore, BLE heart-rate pairing.
   Standalone: only touches app.js through tiny surgical hooks. */
(function(){
"use strict";
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const t=k=>window.F1T_I18N?((window.F1T_I18N[document.documentElement.lang]||{})[k]!==undefined?(window.F1T_I18N[document.documentElement.lang]||{})[k]:(window.F1T_I18N.en[k]||k)):k;
const ic=(n,s)=>window.f1tIcon?window.f1tIcon(n,s||20):"";

/* ---------- coach personas (all free) ---------- */
function persona(){ try{ return localStorage.getItem("f1t_coach_persona")||"coach"; }catch(e){ return "coach"; } }
function setPersona(v){ try{ localStorage.setItem("f1t_coach_persona",v); }catch(e){} }
function sysFor(per){
  const base=" inside the F1T calorie tracker app. Use metric units. Never diagnose medical conditions; suggest a professional for health concerns. ";
  if(per==="pro") return "You are F1T Pro Coach, an elite strength-and-conditioning coach"+base+
    "You write like a world-class coach: precise, structured, periodized. Give sets x reps x load, rest times, and progression rules. Reference the user's logged data when relevant. Replies can be detailed (up to 220 words) with clear formatting. Push for progressive overload and consistency. ";
  if(per==="nutri") return "You are F1T Nutritionist, a sports nutrition specialist"+base+
    "You give practical meal structure, protein targets per meal, pre/post-workout fueling, and hydration guidance. Reference Myanmar foods from the app's database when helpful. Clear structure, up to 200 words. ";
  return "You are F1T Coach, an expert fitness and nutrition coach"+base+
    "Reply concisely (under 120 words unless asked for detail), practical and encouraging. ";
}
function paintPersonas(){
  const slot=$("#persona-row"); if(!slot) return;
  const cur=persona();
  const defs=[["coach","personaCoach"],["pro","personaPro"],["nutri","personaNutri"]];
  slot.innerHTML=`<span class="pp-lab">${t("coachPersona")}</span>`+defs.map(d=>
    `<button class="pp${cur===d[0]?" on":""}" data-pp="${d[0]}">${t(d[1])}</button>`).join("");
  $$("#persona-row [data-pp]").forEach(b=>b.onclick=()=>{
    setPersona(b.dataset.pp); paintPersonas();
  });
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
    color, score:powerScore(), streak:calcStreak(), ts:Date.now() };
  if(window.F1TFB) await window.F1TFB.boardSet(entry);
  return entry;
}
async function loadBoard(){
  if(window.F1TFB) return window.F1TFB.boardTop(50);
  return [];
}
async function openScoreboard(){
  const root=$("#modal-root");
  root.innerHTML=`<div class="mback" id="mback"><div class="modal modal-tall"><div class="sheet-grip"></div>
    <h2>${ic("trophy",22)} ${t("scoreboard")}</h2>
    <div class="board-note">${t("powerScore")} · 30 ${t("days")}</div>
    <div id="board-list"><div class="empty-note">${t("boardSync")}</div></div>
  </div></div>`;
  const close=()=>{ root.innerHTML=""; };
  root.querySelector("#mback").onclick=e=>{ if(e.target.id==="mback") close(); };
  const me=await syncBoard();
  const rows=await loadBoard();
  const list=$("#board-list");
  if(!rows.length){ list.innerHTML=`<div class="empty-note">${t("noBoard")}</div>`; return; }
  const medal=["🥇","🥈","🥉"];
  list.innerHTML=rows.map((r,i)=>`
    <div class="board-row${r.id===me.id?" me":""}">
      <span class="b-rank">${medal[i]||(i+1)}</span>
      <span class="b-av" style="background:hsl(${(r.color||0)*72},60%,38%)">${(r.name||"A")[0].toUpperCase()}</span>
      <span class="b-name">${escapeHtml(r.name||"Athlete")}</span>
      <span class="b-st">🔥${r.streak||0}</span>
      <b class="b-score">${(r.score||0).toLocaleString()}</b>
    </div>`).join("");
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

/* ---------- public API ---------- */
window.F1T_FREE={persona,setPersona,sysFor,openScoreboard,
  paintPersonas,doRestore,canRestore,calcStreak,streakPeak,powerScore};
window.openScoreboard=openScoreboard;
})();
