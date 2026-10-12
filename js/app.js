/* ============ F1T · app ============ */
(function(){
"use strict";
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
/* storage that never throws (private mode, opaque origins) */
const store = {
  get(k){ try{ return window.localStorage.getItem(k); }catch(e){ return null; } },
  set(k,v){ try{ window.localStorage.setItem(k,v); }catch(e){} },
  del(k){ try{ window.localStorage.removeItem(k); }catch(e){} }
};
const I = () => window.F1T_I18N[S.lang] || window.F1T_I18N.en;
const t = k => (I()[k] !== undefined ? I()[k] : (window.F1T_I18N.en[k] || k));

const S = {
  lang: store.get("f1t_lang") || "en",
  profile: null, day: null, dateKey: window.F1T_todayKey(),
  user: null, guest: store.get("f1t_guest")==="1",
  view: "splash", obStep: 0, ob: {},
};

/* ---------- helpers ---------- */
function yangonNow(){ return new Date(new Date().toLocaleString("en-US",{timeZone:"Asia/Yangon"})); }
function toast(msg){ const el=$("#toast"); el.textContent=msg; el.classList.remove("hidden");
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.add("hidden"),2200); }
function show(view){
  S.view=view;
  $$(".view").forEach(v=>v.classList.remove("active"));
  $("#view-"+view).classList.add("active");
  $("#tabbar").classList.toggle("hidden", !["home","stats","rewards","menu"].includes(view));
  $$("#tabbar .tab[data-goto]").forEach(b=>b.classList.toggle("on", b.dataset.goto===view));
  window.scrollTo(0,0);
  if(view==="home") renderHome();
  if(view==="stats") renderStats();
  if(view==="rewards") renderRewards();
  if(view==="menu") renderMenu();
}
function applyI18n(){
  document.documentElement.lang = S.lang==="my"?"my":"en";
  $$("[data-i18n]").forEach(el=>{ el.textContent = t(el.dataset.i18n); });
  $$("[data-i18n-ph]").forEach(el=>{ el.placeholder = t(el.dataset.i18nPh); });
  $("#auth-lang").textContent = S.lang==="en" ? "မြန်မာ" : "English";
  if(["home","stats","rewards","menu"].includes(S.view)) show(S.view);
}
function fmt(n){ return n.toLocaleString("en-US"); }

/* ---------- profile / day ---------- */
async function loadAll(){
  S.profile = window.F1TFB.loadProfile();
  const remote = await window.F1TFB.pullProfile();
  if(remote && !S.profile){ S.profile = remote; await window.F1TFB.saveProfile(remote); }
  S.day = window.F1TFB.loadDay(S.dateKey);
  const rday = await window.F1TFB.pullDay(S.dateKey);
  if(rday && (!S.day || !S.day.kcal)){ S.day = Object.assign(window.F1TFB.blankDay(), rday); }
}
function saveDay(){ window.F1TFB.saveDay(S.dateKey, S.day); }
function dayKeys(n){ // last n date keys ending today, oldest first
  const out=[]; const now=yangonNow();
  for(let i=n-1;i>=0;i--){ const d=new Date(now); d.setDate(d.getDate()-i); out.push(window.F1T_todayKey(d)); }
  return out;
}
function streak(){
  let s=0; const now=yangonNow();
  for(let i=0;i<60;i++){ const d=new Date(now); d.setDate(d.getDate()-i);
    const k=window.F1T_todayKey(d);
    const day = k===S.dateKey ? S.day : window.F1TFB.loadDay(k);
    if(day && day.kcal>0) s++; else break;
  }
  return s;
}

/* ---------- auth ---------- */
let authMode="login";
function initAuth(){
  $$(".auth-tab").forEach(b=>b.onclick=()=>{
    authMode=b.dataset.mode;
    $$(".auth-tab").forEach(x=>x.classList.toggle("active",x===b));
    $("#auth-name-row").classList.toggle("hidden", authMode==="login");
    $("#auth-go").textContent = t(authMode);
  });
  $("#auth-lang").onclick=()=>{ S.lang = S.lang==="en"?"my":"en"; store.set("f1t_lang",S.lang); applyI18n(); };
  $("#auth-go").onclick=doAuth;
  $("#auth-google").onclick=async()=>{
    try{ const u=await window.F1TFB.google(); afterLogin(u); }
    catch(e){ authErr(t("authFail")); }
  };
  $("#auth-guest").onclick=()=>{ S.guest=true; store.set("f1t_guest","1"); enter(); };
}
function authErr(m){ const e=$("#auth-err"); e.textContent=m; e.classList.remove("hidden"); }
async function doAuth(){
  const em=$("#auth-email").value.trim(), pw=$("#auth-pass").value;
  if(!em||!pw){ authErr(t("needEmailPass")); return; }
  $("#auth-err").classList.add("hidden");
  try{
    let u;
    if(authMode==="signup"){ u=await window.F1TFB.signUp(em,pw,$("#auth-name").value.trim()); }
    else{ u=await window.F1TFB.signIn(em,pw); }
    afterLogin(u);
  }catch(e){ authErr(t("authFail")); }
}
async function afterLogin(u){
  S.user=u; S.guest=false; store.del("f1t_guest");
  await loadAll();
  enter();
}
async function enter(){
  if(!S.day){ await loadAll(); }
  if(!S.profile){ startOnboarding(); }
  else show("home");
}

/* ---------- onboarding ---------- */
function startOnboarding(){ S.obStep=0; S.ob={}; show("onboarding"); renderOb(); }
function renderOb(){
  const dots=$$(".ob-steps span"); dots.forEach((d,i)=>d.classList.toggle("on",i<=S.obStep));
  const b=$("#ob-body"); const o=S.ob;
  if(S.obStep===0){
    b.innerHTML=`<div class="glass-card ob-card"><h2>${t("ob1t")}</h2><p>${t("ob1p")}</p>
      <div class="field"><label>${t("name")}</label><input id="ob-name" value="${o.name||""}" placeholder="${t("namePh")}"></div>
      <div class="ob-nav"><button class="btn-lime" id="ob-next">${t("next")}</button></div></div>`;
    $("#ob-next").onclick=()=>{ o.name=$("#ob-name").value.trim()||t("guest"); S.obStep=1; renderOb(); };
  }else if(S.obStep===1){
    b.innerHTML=`<div class="glass-card ob-card"><h2>${t("ob2t")}</h2><p>${t("ob2p")}</p>
      <div class="field"><label>${t("age")}</label><input id="ob-age" type="number" inputmode="numeric" value="${o.age||""}" placeholder="18"></div>
      <div class="field"><label>${t("sex")}</label><div class="seg" id="ob-sex">
        <button data-v="male" class="${o.sex==="male"?"on":""}">${t("male")}</button>
        <button data-v="female" class="${(!o.sex||o.sex==="female")?"on":""}">${t("female")}</button></div></div>
      <div class="field"><label>${t("height")}</label><input id="ob-h" type="number" inputmode="numeric" value="${o.h||""}" placeholder="170"></div>
      <div class="field"><label>${t("weightNow")}</label><input id="ob-w" type="number" inputmode="numeric" value="${o.w||""}" placeholder="65"></div>
      <div class="ob-nav"><button class="btn-back" id="ob-back">${t("back")}</button><button class="btn-lime" id="ob-next">${t("next")}</button></div></div>`;
    $("#ob-sex").onclick=e=>{ if(e.target.dataset.v){ o.sex=e.target.dataset.v;
      $$("#ob-sex button").forEach(x=>x.classList.toggle("on",x===e.target)); } };
    $("#ob-back").onclick=()=>{ S.obStep=0; renderOb(); };
    $("#ob-next").onclick=()=>{ o.age=+$("#ob-age").value||18; o.h=+$("#ob-h").value||170; o.w=+$("#ob-w").value||65;
      o.sex=o.sex||"female"; S.obStep=2; renderOb(); };
  }else{
    const goals=[["lose","🎯",t("lose"),t("loseS")],["maintain","⚖️",t("maintain"),t("maintainS")],["gain","💪",t("gain"),t("gainS")]];
    b.innerHTML=`<div class="glass-card ob-card"><h2>${t("ob3t")}</h2><p>${t("ob3p")}</p>
      ${goals.map(g=>`<button class="goal-opt ${o.goal===g[0]?"on":""}" data-v="${g[0]}"><span class="g-ico">${g[1]}</span><span><b>${g[2]}</b><small>${g[3]}</small></span></button>`).join("")}
      <div class="field" style="margin-top:14px"><label>${t("active")}</label><div class="seg" id="ob-act">
        <button data-v="1" class="${o.active?"on":""}">${t("yesActive")}</button>
        <button data-v="0" class="${!o.active?"on":""}">${t("noActive")}</button></div></div>
      <div class="glass-card" style="padding:16px;text-align:center;margin-bottom:6px">
        <div style="font-size:12px;font-weight:700;color:var(--ink2)">${t("yourTarget")}</div>
        <div style="font-size:38px;font-weight:800" id="ob-target">--</div>
        <div style="font-size:12px;font-weight:700;color:var(--ink2)">${t("kcal")} / ${t("days")}</div>
      </div>
      <div class="ob-nav"><button class="btn-back" id="ob-back">${t("back")}</button><button class="btn-lime" id="ob-done">${t("letsGo")}</button></div></div>`;
    const upd=()=>{ o.target=window.F1T_calcTarget(o.sex,o.age,o.h,o.w,o.goal||"maintain",!!o.active);
      $("#ob-target").textContent=fmt(o.target); };
    b.onclick=e=>{
      const g=e.target.closest(".goal-opt"); if(g){ o.goal=g.dataset.v;
        $$(".goal-opt").forEach(x=>x.classList.toggle("on",x===g)); upd(); }
      const a=e.target.closest("#ob-act button"); if(a){ o.active=a.dataset.v==="1";
        $$("#ob-act button").forEach(x=>x.classList.toggle("on",x===a)); upd(); }
    };
    o.goal=o.goal||"maintain"; upd();
    $("#ob-back").onclick=()=>{ S.obStep=1; renderOb(); };
    $("#ob-done").onclick=async()=>{
      S.profile={name:o.name,age:o.age,sex:o.sex,h:o.h,w:o.w,goal:o.goal,active:!!o.active,targetKcal:o.target,lang:S.lang,created:Date.now()};
      await window.F1TFB.saveProfile(S.profile);
      toast(t("targetUpdated")); show("home");
    };
  }
}

/* ---------- HOME ---------- */
function greeting(){
  const h=yangonNow().getHours();
  return h<12?t("hiMorning"):h<17?t("hiAfternoon"):t("hiEvening");
}
function renderHome(){
  const p=S.profile||{}, d=S.day;
  $("#home-hi").textContent=greeting();
  const nm=(p.name||t("guest")); $("#home-name").textContent=nm;
  $("#home-avatar").textContent=(nm[0]||"F").toUpperCase();
  const target=p.targetKcal||2000;
  const wk=dayKeys(7).filter(k=>{ const dd=k===S.dateKey?d:window.F1TFB.loadDay(k); return dd&&dd.kcal>0; }).length;
  const ringC=2*Math.PI*44, ringP=Math.min(1,wk/7);
  const meals=[["breakfast","🍳"],["lunch","🍱"],["dinner","🌙"],["snacks","🍿"]];
  const mealKcal=m=> (d.meals[m]||[]).reduce((a,x)=>a+x.kcal,0);
  const thumbs=m=> (d.meals[m]||[]).slice(0,3).map(x=>`<span>${x.ico||"🍽"}</span>`).join("");
  // date strip: current week Mon..Sun
  const now=yangonNow(); const dow=(now.getDay()+6)%7;
  const mon=new Date(now); mon.setDate(mon.getDate()-dow);
  const months=[t("jan"),t("feb"),t("mar"),t("apr"),t("may"),t("jun"),t("jul"),t("aug"),t("sep"),t("oct"),t("nov"),t("dec")];
  const dows=[t("mon"),t("tue"),t("wed"),t("thu"),t("fri"),t("sat"),t("sun")];
  let ds="";
  for(let i=0;i<7;i++){ const dt=new Date(mon); dt.setDate(dt.getDate()+i);
    const isT=window.F1T_todayKey(dt)===S.dateKey;
    ds+=`<div class="ds-day ${isT?"today":""}"><span>${dows[i]}</span><b>${dt.getDate()}</b></div>`; }
  const cups=Math.floor(d.water/250);
  $("#home-body").innerHTML=`
    <div class="glass-card intake-card">
      <div><div class="intake-top"><span class="zap">⚡</span>${t("dailyIntake")}</div>
        <h2>${t("weeklyProgress")}</h2>
        <div class="intake-sub">${fmt(d.kcal)} / ${fmt(target)} ${t("kcal")}</div>
        <div class="kcal-bar"><i style="width:${Math.min(100,Math.round(d.kcal/target*100))}%"></i></div>
      </div>
      <div class="ring"><svg width="104" height="104"><circle cx="52" cy="52" r="44" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="11"/>
        <circle cx="52" cy="52" r="44" fill="none" stroke="#141414" stroke-width="11" stroke-linecap="round" stroke-dasharray="${ringC}" stroke-dashoffset="${ringC*(1-ringP)}"/></svg>
        <div class="rv"><b>${wk}</b><small>${t("days")}</small></div></div>
    </div>
    <div class="duo">
      <div class="glass-card mini"><div class="m-top"><span>${t("stepsToWalk")}</span><span class="m-ico">👣</span></div>
        <div class="m-big">${fmt(d.steps)} <small>${t("steps")}</small></div></div>
      <div class="glass-card mini"><div class="m-top"><span>${t("drinkWater")}</span><span class="m-ico">💧</span></div>
        <div class="m-big">${cups} <small>${t("glass")}</small></div>
        <div class="water-drops">${"💧".repeat(Math.min(8,cups))||""}${"▫️".repeat(Math.max(0,8-Math.min(8,cups)))}</div></div>
    </div>
    <div class="glass-card datestrip"><div class="ds-head"><b>${months[mon.getMonth()]} ${mon.getFullYear()}</b>
      <div class="ds-nav"><button id="ds-prev">‹</button><button id="ds-next">›</button></div></div>
      <div class="ds-row">${ds}</div></div>
    ${meals.map(m=>{ const k=mealKcal(m[0]); const items=d.meals[m[0]]||[];
      return `<div class="glass-card meal"><div class="m-info"><b>${t(m[0])}</b>
        <div class="m-kcal">🔥 ${k? fmt(k)+" "+t("kcal") : "0 "+t("kcal")}</div></div>
        <div class="m-thumbs">${thumbs(m[0])}</div>
        <button class="add-btn" data-meal="${m[0]}">+</button></div>`; }).join("")}`;
  $$("#home-body .add-btn").forEach(b=>b.onclick=()=>openMealPicker(b.dataset.meal));
  $("#home-cal").innerHTML="▦";
}

/* ---------- STATS ---------- */
function renderStats(){
  const p=S.profile||{}, target=p.targetKcal||2000;
  const keys=dayKeys(7); const dows=[t("mon"),t("tue"),t("wed"),t("thu"),t("fri"),t("sat"),t("sun")];
  const dowOf=k=>{ const dt=new Date(k+"T12:00:00+06:30"); return dows[(dt.getDay()+6)%7]; };
  const vals=keys.map(k=>{ const dd=k===S.dateKey?S.day:window.F1TFB.loadDay(k); return dd?dd.kcal:0; });
  const max=Math.max(target,...vals,1);
  const bars=vals.map((v,i)=>{ const pct=Math.round(v/target*100);
    return `<div class="bar-c"><span class="pct">${v?pct+"%":""}</span>
      <div class="bar ${v>=target*0.9?"fill":""}" style="height:${Math.max(6,Math.round(v/max*150))}px"></div>
      <span class="dl">${dowOf(keys[i])}</span></div>`; }).join("");
  const d=S.day; const cups=Math.floor(d.water/250);
  const spark=Array.from({length:14},()=>4+Math.round(Math.random()*36));
  $("#stats-body").innerHTML=`
    <div class="glass-card stat-hero"><div class="s-label">${t("calories")}</div>
      <div class="s-nums"><b>${fmt(d.kcal)}</b><small>${t("kcal")}</small><span class="tgt">${t("target")}: ${fmt(target)} ${t("kcal")}</span></div>
      <div class="bars">${bars}</div></div>
    <div class="stat-grid">
      <div class="glass-card stat-tile"><div class="t-top"><span class="t-ico">🏃</span>${t("exercise")}</div>
        <div class="spark">${spark.map(h=>`<i style="height:${h}px"></i>`).join("")}</div>
        <div class="t-big">${(d.exercise||0).toFixed(1)} <small>${t("hours")}</small></div></div>
      <div class="glass-card stat-tile"><div class="t-top"><span class="t-ico">❤️</span>${t("bpm")}</div>
        <svg class="pulse" width="100%" height="44" viewBox="0 0 120 44" preserveAspectRatio="none">
          <polyline points="0,26 14,26 20,26 24,10 28,40 32,26 46,26 52,18 56,34 60,26 78,26 84,8 90,42 96,26 120,26"
            fill="none" stroke="#e5486f" stroke-width="2.5" stroke-linecap="round"/></svg>
        <div class="t-big">${d.bpm||86} <small>${t("bpm")}</small></div></div>
      <div class="glass-card stat-tile"><div class="t-top"><span class="t-ico">⚖️</span>${t("weight")}</div>
        <div class="t-big">${p.w||"--"} <small>${t("kg")}</small></div></div>
      <div class="glass-card stat-tile"><div class="t-top"><span class="t-ico">💧</span>${t("water")}</div>
        <div class="t-big">${cups} <small>${t("cups")}</small></div>
        <div class="drop-row">${"💧".repeat(Math.min(8,cups))}</div></div>
    </div>`;
}

/* ---------- REWARDS ---------- */
function badges(){
  const d=S.day, p=S.profile||{}, target=p.targetKcal||2000;
  const st=streak();
  const bfastStreak=(()=>{ let s=0; const now=yangonNow();
    for(let i=0;i<30;i++){ const dt=new Date(now); dt.setDate(dt.getDate()-i); const k=window.F1T_todayKey(dt);
      const dd=k===S.dateKey?d:window.F1TFB.loadDay(k);
      if(dd&&dd.meals&&dd.meals.breakfast&&dd.meals.breakfast.length) s++; else break; } return s; })();
  return [
    {n:t("b1n"),d:t("b1d"),ico:"📝",won:st>=1},
    {n:t("b2n"),d:t("b2d"),ico:"🔥",won:st>=3},
    {n:t("b3n"),d:t("b3d"),ico:"💧",won:Math.floor(d.water/250)>=8},
    {n:t("b4n"),d:t("b4d"),ico:"👣",won:d.steps>=10000},
    {n:t("b5n"),d:t("b5d"),ico:"🎯",won:d.kcal>0&&Math.abs(d.kcal-target)/target<=0.1},
    {n:t("b6n"),d:t("b6d"),ico:"🌅",won:bfastStreak>=5},
  ];
}
function renderRewards(){
  const st=streak(); const bs=badges();
  $("#rewards-body").innerHTML=`
    <div class="glass-card streak-card"><div class="flame">🔥</div><b>${st}</b><span>${t("dayStreak")}</span>
      <div style="margin-top:8px;font-size:13px">${t("keepGoing")}</div></div>
    <div class="badge-grid">${bs.map(b=>`<div class="glass-card badge ${b.won?"won":""}">
      <span class="b-ico">${b.won?b.ico:"🔒"}</span><b>${b.n}</b><small>${b.d}</small></div>`).join("")}</div>`;
}

/* ---------- MENU ---------- */
function renderMenu(){
  const p=S.profile||{};
  const who = S.user ? (S.user.displayName||S.user.email) : (S.guest? t("guest") : t("notSignedIn"));
  $("#menu-body").innerHTML=`
    <div class="glass-card prof-card"><div class="avatar">${((p.name||"F")[0]||"F").toUpperCase()}</div>
      <div><b>${p.name||t("guest")}</b><small>${t("signedInAs")}: ${who}</small></div></div>
    <div class="menu-list">
      <button class="glass-card menu-row" id="m-lang"><span class="mr-ico">🌐</span>${t("language")}<span class="mr-sub">${t("langName")}</span><span class="chev">›</span></button>
      <button class="glass-card menu-row" id="m-goals"><span class="mr-ico">🎯</span>${t("editGoals")}<span class="mr-sub">${fmt(p.targetKcal||2000)} ${t("kcal")}</span><span class="chev">›</span></button>
      <button class="glass-card menu-row" id="m-install"><span class="mr-ico">📲</span>${t("installApp")}<span class="chev">›</span></button>
      <button class="glass-card menu-row danger" id="m-logout"><span class="mr-ico">🚪</span>${t("logout")}</button>
    </div>
    <div class="empty-note">${t("version")}</div>`;
  $("#m-lang").onclick=()=>{ S.lang=S.lang==="en"?"my":"en"; store.set("f1t_lang",S.lang);
    if(S.profile){ S.profile.lang=S.lang; window.F1TFB.saveProfile(S.profile); } applyI18n(); };
  $("#m-goals").onclick=openGoals;
  $("#m-install").onclick=()=>openInfo(t("installApp"), t("installHow"));
  $("#m-logout").onclick=async()=>{ if(confirm(t("confirmLogout"))){ await window.F1TFB.signOut();
    store.del("f1t_guest"); location.reload(); } };
}
function openInfo(title, body){
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${title}</h2><p style="font-weight:500;color:var(--ink2);line-height:1.6;margin-bottom:16px">${body}</p>
    <button class="btn-lime" id="m-ok">${t("done")}</button></div></div>`;
  $("#m-ok").onclick=closeModal; $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function openGoals(){
  const p=S.profile||{};
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${t("editGoals")}</h2>
    <div class="field"><label>${t("target")} (${t("kcal")})</label><input id="g-kcal" type="number" inputmode="numeric" value="${p.targetKcal||2000}"></div>
    <div class="field"><label>${t("weightNow")}</label><input id="g-w" type="number" inputmode="numeric" value="${p.w||""}"></div>
    <button class="btn-lime" id="g-save">${t("save")}</button></div></div>`;
  $("#g-save").onclick=async()=>{ S.profile.targetKcal=+$("#g-kcal").value||2000;
    if($("#g-w").value) S.profile.w=+$("#g-w").value;
    await window.F1TFB.saveProfile(S.profile); closeModal(); toast(t("targetUpdated")); renderMenu(); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function closeModal(){ $("#modal-root").innerHTML=""; }

/* ---------- SHEET + LOGGING ---------- */
function openSheet(){
  const opts=[["meal","🍽",t("logMeal")],["water","💧",t("logWater")],["weight","⚖️",t("logWeight")],["steps","👣",t("logSteps")]];
  $("#sheet-grid").innerHTML=opts.map(o=>`<button class="sheet-opt" data-k="${o[0]}"><span>${o[1]}</span>${o[2]}</button>`).join("");
  $("#sheet").classList.remove("hidden"); $("#sheet-backdrop").classList.remove("hidden");
  $$("#sheet-grid .sheet-opt").forEach(b=>b.onclick=()=>{ closeSheet();
    const k=b.dataset.k;
    if(k==="meal") openMealPicker("snacks");
    if(k==="water") openWater();
    if(k==="weight") openWeight();
    if(k==="steps") openSteps();
  });
}
function closeSheet(){ $("#sheet").classList.add("hidden"); $("#sheet-backdrop").classList.add("hidden"); }

function openMealPicker(meal){
  const foodName=f=> S.lang==="my"? f.my : f.en;
  const renderList=q=>{
    const list=window.F1T_FOODS.filter(f=>!q||foodName(f).toLowerCase().includes(q.toLowerCase())).slice(0,30);
    $("#food-list").innerHTML=list.map(f=>`<button class="food-row" data-id="${f.id}">
      <span class="f-ico">${f.ico}</span><span class="f-info"><b>${foodName(f)}</b><small>P ${f.p}g · C ${f.c}g · F ${f.f}g</small></span>
      <span class="f-kcal">${f.kcal}</span></button>`).join("") ||
      `<div class="empty-note">${t("noMeals")}</div>`;
    $$("#food-list .food-row").forEach(b=>b.onclick=()=>addFood(meal, window.F1T_FOODS.find(f=>f.id===b.dataset.id)));
  };
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${t(meal)} · ${t("addFood")}</h2>
    <input class="search" id="food-q" placeholder="${t("searchFood")}">
    <div id="food-list"></div>
    <div class="or"><span>${t("or")}</span></div>
    <div class="field"><label>${t("customFood")} · ${t("foodName")}</label><input id="cf-name" placeholder="${t("foodName")}"></div>
    <div class="qty-row"><input id="cf-kcal" type="number" inputmode="numeric" placeholder="${t("calories")} (${t("kcal")})">
      <button class="btn-lime" id="cf-add" style="width:auto;padding:14px 26px">${t("add")}</button></div>
    </div></div>`;
  renderList("");
  $("#food-q").oninput=e=>renderList(e.target.value);
  $("#cf-add").onclick=()=>{ const n=$("#cf-name").value.trim(), k=+$("#cf-kcal").value||0;
    if(!n||!k) return; addFood(meal,{id:"c"+Date.now(),en:n,my:n,kcal:k,p:0,c:0,f:0,ico:"🍽"}); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function addFood(meal,f){
  S.day.meals[meal].push({id:f.id,name:f.en,name_my:f.my,kcal:f.kcal,p:f.p,c:f.c,f:f.f,ico:f.ico,at:Date.now()});
  S.day.kcal+=f.kcal; S.day.p+=f.p; S.day.c+=f.c; S.day.f+=f.f;
  saveDay(); closeModal(); toast("🔥 "+t("logged")); renderHome();
}
function openWater(){
  let cups=Math.floor(S.day.water/250);
  const draw=()=>{ $("#w-n").textContent=cups; };
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>💧 ${t("logWater")}</h2><p style="text-align:center;color:var(--ink2);font-weight:600">${t("oneCup")}</p>
    <div class="stepper"><button id="w-m">−</button><b id="w-n">${cups}</b><button id="w-p">+</button></div>
    <button class="btn-lime" id="w-save">${t("save")}</button></div></div>`;
  $("#w-m").onclick=()=>{ cups=Math.max(0,cups-1); draw(); };
  $("#w-p").onclick=()=>{ cups=Math.min(20,cups+1); draw(); };
  $("#w-save").onclick=()=>{ S.day.water=cups*250; saveDay(); closeModal(); toast("💧 "+t("logged")); renderHome(); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function openWeight(){
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>⚖️ ${t("logWeight")}</h2>
    <div class="field"><label>${t("weight")} (${t("kg")})</label><input id="wt-v" type="number" inputmode="decimal" value="${S.profile.w||""}"></div>
    <button class="btn-lime" id="wt-save">${t("save")}</button></div></div>`;
  $("#wt-save").onclick=async()=>{ const v=+$("#wt-v").value; if(v>0){ S.profile.w=v;
    await window.F1TFB.saveProfile(S.profile); } closeModal(); toast("⚖️ "+t("logged")); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function openSteps(){
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>👣 ${t("logSteps")}</h2>
    <div class="field"><label>${t("stepsToWalk")}</label><input id="st-v" type="number" inputmode="numeric" value="${S.day.steps||""}"></div>
    <button class="btn-lime" id="st-save">${t("save")}</button></div></div>`;
  $("#st-save").onclick=()=>{ S.day.steps=+$("#st-v").value||0; saveDay(); closeModal(); toast("👣 "+t("logged")); renderHome(); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}

/* ---------- boot ---------- */
function initNav(){
  $$("[data-goto]").forEach(b=>{ if(b.id!=="tab-add") b.onclick=()=>show(b.dataset.goto); });
  $("#tab-add").onclick=openSheet;
  $("#sheet-close").onclick=closeSheet;
  $("#sheet-backdrop").onclick=closeSheet;
}
async function boot(){
  applyI18n(); initAuth(); initNav();
  setTimeout(async()=>{
    let landed=false;
    window.F1TFB.onAuth(async u=>{
      if(landed) return; landed=true;
      S.user=u||null;
      if(u || S.guest){ await loadAll(); enter(); }
      else show("auth");
    });
    // fallback if firebase unavailable
    setTimeout(async()=>{ if(!landed){ landed=true;
      if(S.guest){ await loadAll(); enter(); } else show("auth"); } }, 3500);
  }, 900);
  if(navigator.serviceWorker && navigator.serviceWorker.register){ try{ navigator.serviceWorker.register("sw.js").catch(()=>{}); }catch(e){} }
}
document.addEventListener("DOMContentLoaded", boot);
})();
