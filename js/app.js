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
const t = (k,p) => { let s = (I()[k] !== undefined ? I()[k] : (window.F1T_I18N.en[k] || k));
  if(p) for(const key in p) s = String(s).split("{"+key+"}").join(p[key]); return s; };
const ic = (n,s) => window.f1tIcon(n, s || 20);

const S = {
  lang: store.get("f1t_lang") || "en",
  theme: store.get("f1t_theme") || "light",
  profile: null, day: null, dateKey: window.F1T_todayKey(),
  user: null, guest: store.get("f1t_guest")==="1",
  view: "splash", obStep: 0, ob: {},
  homeWeek: 0, statsWeek: 0,
};
function applyTheme(){
  document.documentElement.dataset.theme = S.theme === "dark" ? "dark" : "light";
  try{ store.set("f1t_theme", S.theme); }catch(e){}
}

/* ---------- helpers ---------- */
function yangonNow(){ return new Date(new Date().toLocaleString("en-US",{timeZone:"Asia/Yangon"})); }
function toast(msg){ const el=$("#toast"); el.textContent=msg; el.classList.remove("hidden");
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.add("hidden"),2200); }
function show(view){
  S.view=view;
  $$(".view").forEach(v=>v.classList.remove("active"));
  $("#view-"+view).classList.add("active");
  $("#tabbar").classList.toggle("hidden", !["home","stats","rewards","profile"].includes(view));
  $$("#tabbar .tab[data-goto]").forEach(b=>b.classList.toggle("on", b.dataset.goto===view));
  window.scrollTo(0,0);
  if(view==="home") renderHome();
  if(view==="stats") renderStats();
  if(view==="rewards") renderRewards();
  if(view==="profile") renderProfile();
}
function applyI18n(){
  document.documentElement.lang = S.lang==="my"?"my":"en";
  $$("[data-i18n]").forEach(el=>{ el.textContent = t(el.dataset.i18n); });
  $$("[data-i18n-ph]").forEach(el=>{ el.placeholder = t(el.dataset.i18nPh); });
  $("#auth-lang").textContent = S.lang==="en" ? "မြန်မာ" : "English";
  if(["home","stats","rewards","profile"].includes(S.view)) show(S.view);
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
/* realtime subscriptions */
let unsubDay=null, unsubProfile=null;
function stopLive(){ try{ if(unsubDay)unsubDay(); }catch(e){} try{ if(unsubProfile)unsubProfile(); }catch(e){} unsubDay=unsubProfile=null; }
function resubDay(){
  try{ if(unsubDay)unsubDay(); }catch(e){} unsubDay=null;
  if(S.guest || !window.F1TFB.ready) return;
  unsubDay=window.F1TFB.subDay(S.dateKey, d=>{
    S.day=Object.assign(window.F1TFB.blankDay(), d);
    if(["home","stats"].includes(S.view)) show(S.view);
  });
}
function subscribeLive(){
  stopLive();
  if(S.guest || !window.F1TFB.ready) return;
  unsubProfile=window.F1TFB.subProfile(p=>{ S.profile=Object.assign({},S.profile,p);
    if(S.view==="profile") renderProfile(); });
  resubDay();
}
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
    $("#auth-err").classList.add("hidden");
    try{ await window.F1TFB.google(); /* redirects to Google, returns via boot() */ }
    catch(e){ authErr(googleErrMsg(e)); }
  };
  $("#auth-guest").onclick=()=>{ S.guest=true; store.set("f1t_guest","1"); enter(); };
}
function authErr(m){ const e=$("#auth-err"); e.textContent=m; e.classList.remove("hidden"); }
function googleErrMsg(e){
  const c=(e&&e.code)||"";
  if(c==="auth/unauthorized-domain") return t("errDomain");
  if(c==="auth/operation-not-allowed") return t("errGoogleOff");
  if(c==="auth/network-request-failed") return t("errNetwork");
  if(c==="auth/popup-blocked"||c==="auth/popup-closed-by-user") return t("authFail");
  return t("authFail");
}
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
  await loadHealth(); subscribeLive();
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
    const goals=[["lose","target",t("lose"),t("loseS")],["maintain","scale",t("maintain"),t("maintainS")],["gain","dumbbell",t("gain"),t("gainS")]];
    b.innerHTML=`<div class="glass-card ob-card"><h2>${t("ob3t")}</h2><p>${t("ob3p")}</p>
      ${goals.map(g=>`<button class="goal-opt ${o.goal===g[0]?"on":""}" data-v="${g[0]}"><span class="g-ico">${ic(g[1],26)}</span><span><b>${g[2]}</b><small>${g[3]}</small></span></button>`).join("")}
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

/* ---------- APPLE HEALTH ---------- */
function renderHealthCard(){
  if(!S.user) return "";
  const h=S.health;
  if(!h){
    return `<div class="glass-card health-card"><div class="h-top"><span class="h-ico">${ic("health",20)}</span><b>Apple Health</b></div>
      <div class="h-setup">${t("healthSetup")}</div></div>`;
  }
  const km=(h.distanceM/1000).toFixed(1);
  return `<div class="glass-card health-card"><div class="h-top"><span class="h-ico">${ic("health",20)}</span><b>Apple Health</b>
      <span class="h-sync">${ic("sync",12)} ${h.syncedAt||""}</span></div>
    <div class="h-row">
      <div><b>${fmt(h.steps||0)}</b><small>${t("steps")}</small></div>
      <div><b>${Math.round(h.activeKcal||0)}</b><small>${t("kcal")}</small></div>
      <div><b>${km}</b><small>km</small></div>
    </div>
    ${h.steps&&!S.day.steps?`<button class="btn-glass full" id="use-health-steps">${t("useHealthSteps")}</button>`:""}
  </div>`;
}
async function loadHealth(){
  S.health=null;
  if(!S.user || !window.F1TFB.ready) return;
  try{
    const doc=await window.F1TFB.pullHealth(S.dateKey);
    if(doc&&doc.steps!=null){
      S.health={steps:Math.round(doc.steps),activeKcal:doc.activeKcal||0,distanceM:doc.distanceM||0,
        syncedAt:doc.updatedAt||""};
    }
  }catch(e){}
}

/* ---------- notifications ---------- */
function notifItems(){
  const items=[]; const d=S.day||{}, p=S.profile||{};
  let st=0; try{ st=streak(); }catch(e){}
  if(!(d.kcal>0)) items.push({icon:"utensils",tone:"warn",title:t("ntLogTitle"),body:t("ntLogBody")});
  else if(st>=2) items.push({icon:"flame",tone:"good",title:t("ntStreakTitle",{n:st}),body:t("ntStreakBody")});
  try{
    const an=window.F1T_ANALYSIS.dayInsights(d,p);
    an.filter(x=>x.tone==="warn"||x.tone==="bad").slice(0,2).forEach(x=>items.push({icon:"activity",tone:x.tone,title:x.title,body:x.body}));
  }catch(e){}
  try{
    const won=badges().filter(b=>b.won).length, seen=+store.get("f1t_badges_seen")||0;
    if(won>seen) items.push({icon:"trophy",tone:"good",title:t("ntBadgeTitle"),body:t("ntBadgeBody",{n:won-seen})});
  }catch(e){}
  try{ items.push({icon:"zap",tone:"info",title:t("tipTitle"),body:t("tip"+window.F1T_ANALYSIS.tipOfDay(S.dateKey))}); }catch(e){}
  return items;
}
function notifSig(items){ return S.dateKey+":"+items.map(i=>i.title).join("|"); }
function refreshBell(){
  const items=notifItems(); const dot=$("#home-bell .dot"); if(!dot) return;
  dot.style.display = (items.length && store.get("f1t_notif_read")!==notifSig(items)) ? "block" : "none";
}
function openNotif(){
  const items=notifItems(); const sig=notifSig(items);
  const toneIcon={good:"check",warn:"bell",info:"zap",bad:"x"};
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${t("notifications")}</h2>
    ${items.length?`<div class="insights">`+items.map(n=>`
      <div class="glass-card insight ${n.tone}"><span class="i-ico">${ic(toneIcon[n.tone]||"bell",18)}</span>
      <div><b>${n.title}</b><p>${n.body}</p></div></div>`).join("")+`</div>`
    :`<div class="empty-note">${t("notifEmpty")}</div>`}
    <button class="btn-lime" id="nt-ok">${t("done")}</button></div></div>`;
  try{ store.set("f1t_badges_seen",String(badges().filter(b=>b.won).length)); }catch(e){}
  store.set("f1t_notif_read",sig);
  $("#nt-ok").onclick=()=>{ closeModal(); refreshBell(); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback"){ closeModal(); refreshBell(); } };
}

/* ---------- date switching ---------- */
async function switchDate(key){
  S.dateKey=key; S.homeWeek=0;
  S.day=window.F1TFB.loadDay(key);
  try{ const r=await window.F1TFB.pullDay(key); if(r&&(!S.day||!S.day.kcal)) S.day=Object.assign(window.F1TFB.blankDay(),r); }catch(e){}
  if(!S.day) S.day=window.F1TFB.blankDay();
  refreshBell(); resubDay(); show(S.view);
}
function weekKeys(offset){ // 7 keys ending (today - 7*offset), oldest first
  const out=[]; const now=yangonNow();
  for(let i=6;i>=0;i--){ const d=new Date(now); d.setDate(d.getDate()-i-(offset||0)*7); out.push(window.F1T_todayKey(d)); }
  return out;
}
let pickYM=null;
function openDatePicker(){
  const now=yangonNow(); pickYM=[now.getFullYear(),now.getMonth()]; drawPicker();
}
function drawPicker(){
  const y=pickYM[0], m=pickYM[1];
  const months=[t("jan"),t("feb"),t("mar"),t("apr"),t("may"),t("jun"),t("jul"),t("aug"),t("sep"),t("oct"),t("nov"),t("dec")];
  const dows=[t("mon"),t("tue"),t("wed"),t("thu"),t("fri"),t("sat"),t("sun")];
  const startDow=(new Date(y,m,1).getDay()+6)%7, dim=new Date(y,m+1,0).getDate();
  const todayK=window.F1T_todayKey();
  let cells="";
  for(let i=0;i<startDow;i++) cells+=`<span class="pk-empty"></span>`;
  for(let d=1;d<=dim;d++){ const k=window.F1T_todayKey(new Date(y,m,d));
    cells+=`<button class="pk-day ${k===S.dateKey?"sel":""} ${k===todayK?"today":""}" data-k="${k}">${d}</button>`; }
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <div class="pk-head"><button id="pk-prev">‹</button><b>${months[m]} ${y}</b><button id="pk-next">›</button></div>
    <div class="pk-grid">${dows.map(d=>`<span class="pk-dow">${d}</span>`).join("")}${cells}</div>
    <button class="btn-lime" id="pk-today">${t("today")}</button></div></div>`;
  $("#pk-prev").onclick=()=>{ let mm=m-1,yy=y; if(mm<0){mm=11;yy--;} pickYM=[yy,mm]; drawPicker(); };
  $("#pk-next").onclick=()=>{ let mm=m+1,yy=y; if(mm>11){mm=0;yy++;} pickYM=[yy,mm]; drawPicker(); };
  $("#pk-today").onclick=()=>{ closeModal(); switchDate(window.F1T_todayKey()); };
  $$("#modal-root .pk-day").forEach(b=>b.onclick=()=>{ closeModal(); switchDate(b.dataset.k); });
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function openWeekPick(){
  const opts=[[0,t("week")],[1,t("lastWeek")],[2,t("twoWeeksAgo")]];
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${t("weekView")}</h2>
    <div class="wk-list">${opts.map(o=>`
      <button class="goal-opt ${S.statsWeek===o[0]?"on":""}" data-w="${o[0]}">
        <span class="g-ico">${ic("calendar",22)}</span><span><b>${o[1]}</b></span></button>`).join("")}</div>
    </div></div>`;
  $$("#modal-root .goal-opt").forEach(b=>b.onclick=()=>{ S.statsWeek=+b.dataset.w; closeModal(); renderStats(); });
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
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
  const meals=["breakfast","lunch","dinner","snacks"];
  const mealKcal=m=> (d.meals[m]||[]).reduce((a,x)=>a+x.kcal,0);
  const thumbs=m=> (d.meals[m]||[]).slice(0,3).map(x=>x.photo?`<span><img src="${x.photo}" alt=""></span>`:`<span>${ic(x.ic||"bowl",20)}</span>`).join("");
  // date strip: week Mon..Sun, S.homeWeek=0 is current week
  const now=yangonNow(); const dow=(now.getDay()+6)%7;
  const mon=new Date(now); mon.setDate(mon.getDate()-dow-(S.homeWeek||0)*7);
  const months=[t("jan"),t("feb"),t("mar"),t("apr"),t("may"),t("jun"),t("jul"),t("aug"),t("sep"),t("oct"),t("nov"),t("dec")];
  const dows=[t("mon"),t("tue"),t("wed"),t("thu"),t("fri"),t("sat"),t("sun")];
  let ds="";
  for(let i=0;i<7;i++){ const dt=new Date(mon); dt.setDate(dt.getDate()+i);
    const k=window.F1T_todayKey(dt); const isT=k===S.dateKey;
    ds+=`<button class="ds-day ${isT?"today":""}" data-k="${k}"><span>${dows[i]}</span><b>${dt.getDate()}</b></button>`; }
  const cups=Math.floor(d.water/250);
  const drops=Array.from({length:8},(_,i)=>`<i class="${i<Math.min(8,cups)?"on":""}">${ic("droplet",13)}</i>`).join("");
  const healthCard = renderHealthCard();
  $("#home-body").innerHTML=`
    <div class="glass-card intake-card">
      <div><div class="intake-top"><span class="zap">${ic("zap",13)}</span>${t("dailyIntake")}</div>
        <h2>${t("weeklyProgress")}</h2>
        <div class="intake-sub">${fmt(d.kcal)} / ${fmt(target)} ${t("kcal")}</div>
        <div class="kcal-bar"><i style="width:${Math.min(100,Math.round(d.kcal/target*100))}%"></i></div>
      </div>
      <div class="ring"><svg width="104" height="104"><circle cx="52" cy="52" r="44" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="11"/>
        <circle cx="52" cy="52" r="44" fill="none" stroke="#141414" stroke-width="11" stroke-linecap="round" stroke-dasharray="${ringC}" stroke-dashoffset="${ringC*(1-ringP)}"/></svg>
        <div class="rv"><b>${wk}</b><small>${t("days")}</small></div></div>
    </div>
    <div class="duo">
      <div class="glass-card mini" id="mini-steps"><div class="m-top"><span>${t("stepsToWalk")}</span><span class="m-ico">${ic("footprints",18)}</span></div>
        <div class="m-big">${fmt(d.steps)} <small>${t("steps")}</small></div>${S.health&&S.health.steps?`<div class="sync-note">${ic("sync",12)} ${t("fromHealth")}</div>`:""}</div>
      <div class="glass-card mini" id="mini-water"><div class="m-top"><span>${t("drinkWater")}</span><span class="m-ico">${ic("droplet",18)}</span></div>
        <div class="m-big">${cups} <small>${t("glass")}</small></div>
        <div class="water-drops">${drops}</div></div>
    </div>
    ${healthCard}
    <div class="glass-card tip-card"><span class="tip-ico">${ic("zap",18)}</span>
      <div><b>${t("tipTitle")}</b><p>${t("tip"+window.F1T_ANALYSIS.tipOfDay(S.dateKey))}</p></div></div>
    <div class="glass-card datestrip"><div class="ds-head"><b>${months[mon.getMonth()]} ${mon.getFullYear()}</b>
      <div class="ds-nav"><button id="ds-prev">‹</button><button id="ds-next">›</button></div></div>
      <div class="ds-row">${ds}</div></div>
    ${meals.map(m=>{ const k=mealKcal(m);
      return `<div class="glass-card meal"><div class="m-info"><b>${t(m)}</b>
        <div class="m-kcal">${ic("flame",14)} ${k? fmt(k)+" "+t("kcal") : "0 "+t("kcal")}</div></div>
        <div class="m-thumbs">${thumbs(m)}</div>
        <button class="add-btn" data-meal="${m}">+</button></div>`; }).join("")}`;
  $$("#home-body .add-btn").forEach(b=>b.onclick=()=>openMealPicker(b.dataset.meal));
  $$("#home-body .ds-day").forEach(b=>b.onclick=()=>switchDate(b.dataset.k));
  $("#ds-prev").onclick=()=>{ S.homeWeek=(S.homeWeek||0)+1; renderHome(); };
  $("#ds-next").onclick=()=>{ S.homeWeek=Math.max(0,(S.homeWeek||0)-1); renderHome(); };
  const ms=$("#mini-steps"), mw=$("#mini-water");
  if(ms) ms.onclick=openSteps; if(mw) mw.onclick=openWater;
  const uh=$("#use-health-steps"); if(uh) uh.onclick=()=>{ S.day.steps=S.health.steps; saveDay(); renderHome(); toast(t("logged")); };
  refreshBell();
}

/* ---------- STATS ---------- */
/* ---------- HEALTH ANALYSIS ---------- */
function renderAnalysis(){
  const p=S.profile||{}, d=S.day||{};
  const A=window.F1T_ANALYSIS, an=A.analyzeDay(d,p,t);
  const bmi=A.bmi(p.h,p.w);
  const catKey={underweight:"bmiUnder",healthy:"bmiHealthy",overweight:"bmiOver",obese:"bmiObese"};
  const catTone={underweight:"warn",healthy:"good",overweight:"warn",obese:"bad"};
  let bmiHtml="";
  if(bmi){
    const pos=Math.min(100,Math.max(0,(bmi.value-14)/(36-14)*100));
    bmiHtml=`<div class="bmi-block">
      <div class="bmi-top"><div><b>${bmi.value.toFixed(1)}</b><small>${t("bmi")}</small></div>
        <span class="pill ${catTone[bmi.cat]}">${t(catKey[bmi.cat])}</span></div>
      <div class="bmi-bar"><i style="left:${pos}%"></i></div>
      <div class="bmi-range">${t("bmiRange")}: ${Math.round(bmi.lo)} - ${Math.round(bmi.hi)} ${t("kg")}</div>
      <div class="bmi-note">${t("bmiNote")}</div></div>`;
  }
  const mRow=(label,m,icon)=>{ const pct=Math.min(100,Math.round(m.a/m.t*100));
    const tone=pct<70?"warn":pct<=125?"good":"info";
    return `<div class="macro-row"><span class="m-ico2">${ic(icon,16)}</span>
      <div class="m-mid"><div class="m-lab"><b>${label}</b><span>${t("ofTarget",{a:m.a,b:m.t})}</span></div>
      <div class="m-bar ${tone}"><i style="width:${pct}%"></i></div></div></div>`; };
  const totG=an.macros.p.a+an.macros.c.a+an.macros.f.a;
  const seg=(v,c)=>{ const p=totG?Math.round(v/totG*100):0; return p?`<i class="${c}" style="width:${p}%"></i>`:""; };
  const toneIcon={good:"check",warn:"bell",info:"zap",bad:"x"};
  const cards=an.insights.map(n=>`<div class="glass-card insight ${n.tone}">
    <span class="i-ico">${ic(n.icon,20)}</span>
    <div><b>${n.title}</b><p>${n.body}</p></div></div>`).join("");
  return `<div class="glass-card analysis-card">
      <div class="a-head"><span class="a-ico">${ic("activity",18)}</span><b>${t("analysis")}</b></div>
      ${bmiHtml}
      <div class="macro-block">
        ${mRow(t("protein"),an.macros.p,"meat")}
        ${mRow(t("carbs"),an.macros.c,"bread")}
        ${mRow(t("fat"),an.macros.f,"droplet")}
      </div>
      ${totG?`<div class="segbar">${seg(an.macros.p.a,"sp")}${seg(an.macros.c.a,"sc")}${seg(an.macros.f.a,"sf")}</div>
      <div class="seg-leg"><span><span class="cl-dot" style="background:#f2542d"></span>${t("protein")}</span><span><span class="cl-dot" style="background:#ffc53d"></span>${t("carbs")}</span><span><span class="cl-dot" style="background:#7fc400"></span>${t("fat")}</span></div>`:""}
      </div></div>
    <div class="insights">${cards}</div>`;
}

function renderStats(){
  const p=S.profile||{}, target=p.targetKcal||2000;
  const keys=weekKeys(S.statsWeek||0); const dows=[t("mon"),t("tue"),t("wed"),t("thu"),t("fri"),t("sat"),t("sun")];
  const dowOf=k=>{ const dt=new Date(k+"T12:00:00+06:30"); return dows[(dt.getDay()+6)%7]; };
  const vals=keys.map(k=>{ const dd=k===S.dateKey?S.day:window.F1TFB.loadDay(k); return dd?dd.kcal:0; });
  const max=Math.max(target,...vals,1);
  const wkLabel=(S.statsWeek||0)===0? t("week") : (S.statsWeek===1? t("lastWeek") : t("twoWeeksAgo"));
  const bars=vals.map((v,i)=>{ const pct=Math.round(v/target*100);
    return `<div class="bar-c"><span class="pct">${v?pct+"%":""}</span>
      <div class="bar ${v>=target*0.9?"fill":""}" style="height:${Math.max(6,Math.round(v/max*150))}px"></div>
      <span class="dl">${dowOf(keys[i])}</span></div>`; }).join("");
  const d=S.day; const cups=Math.floor(d.water/250);
  const drops=Array.from({length:8},(_,i)=>`<i class="${i<Math.min(8,cups)?"on":""}">${ic("droplet",13)}</i>`).join("");
  const exHist=dayKeys(14).map(k=>{ const dd=k===S.dateKey?d:window.F1TFB.loadDay(k); return dd?(dd.exercise||0):0; });
  const exMax=Math.max(1,...exHist);
  const spark=exHist.map(v=>4+Math.round(v/exMax*36));
  $("#stats-body").innerHTML=`
    <div class="glass-card stat-hero"><div class="s-label">${t("calories")} · ${wkLabel}</div>
      <div class="cal-ring-wrap">
        <div class="cal-ring"><svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" style="stroke:var(--track)" stroke-width="12"/>
          <circle cx="60" cy="60" r="52" fill="none" stroke="url(#calg)" stroke-width="12" stroke-linecap="round"
            stroke-dasharray="${2*Math.PI*52}" stroke-dashoffset="${(2*Math.PI*52)*(1-Math.min(1,d.kcal/target))}"/>
          <defs><linearGradient id="calg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#ffc53d"/><stop offset="1" stop-color="#f2542d"/></linearGradient></defs></svg>
          <div class="rv"><b>${fmt(d.kcal)}</b><small>${t("eaten")}</small></div></div>
        <div class="cal-legend">
          <div class="cl-row"><span class="cl-dot" style="background:#f2542d"></span>${t("eaten")}<b>${fmt(d.kcal)}</b></div>
          <div class="cl-row"><span class="cl-dot" style="background:#b8f04a"></span>${t("left")}<b>${fmt(Math.max(0,target-d.kcal))}</b></div>
          <div class="cl-row"><span class="cl-dot" style="background:#7cc7ff"></span>${t("target")}<b>${fmt(target)}</b></div>
        </div></div>
      <div class="bars">${bars}</div></div>
    ${renderAnalysis()}
    <div class="stat-grid">
      <div class="glass-card stat-tile" id="st-exercise"><div class="t-top"><span class="t-ico">${ic("activity",15)}</span>${t("exercise")}</div>
        <div class="spark">${spark.map(h=>`<i style="height:${h}px"></i>`).join("")}</div>
        <div class="t-big">${(d.exercise||0).toFixed(1)} <small>${t("hours")}</small></div></div>
      <div class="glass-card stat-tile" id="st-bpm"><div class="t-top"><span class="t-ico">${ic("heart",15)}</span>${t("bpm")}</div>
        <svg class="pulse" width="100%" height="44" viewBox="0 0 120 44" preserveAspectRatio="none">
          <polyline points="0,26 14,26 20,26 24,10 28,40 32,26 46,26 52,18 56,34 60,26 78,26 84,8 90,42 96,26 120,26"
            fill="none" stroke="#e63b30" stroke-width="2.5" stroke-linecap="round"/></svg>
        <div class="t-big">${d.bpm?d.bpm:"--"} <small>${t("bpm")}</small></div></div>
      <div class="glass-card stat-tile" id="st-weight"><div class="t-top"><span class="t-ico">${ic("scale",15)}</span>${t("weight")}</div>
        <div class="t-big">${p.w||"--"} <small>${t("kg")}</small></div></div>
      <div class="glass-card stat-tile" id="st-water"><div class="t-top"><span class="t-ico">${ic("droplet",15)}</span>${t("water")}</div>
        <div class="t-big">${cups} <small>${t("cups")}</small></div>
        <div class="drop-row">${drops}</div></div>
    </div>`;
  $("#st-exercise").onclick=openExercise;
  $("#st-bpm").onclick=openBpm;
  $("#st-weight").onclick=openWeight;
  $("#st-water").onclick=openWater;
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
    {n:t("b1n"),d:t("b1d"),ic:"pencil",won:st>=1},
    {n:t("b2n"),d:t("b2d"),ic:"flame",won:st>=3},
    {n:t("b3n"),d:t("b3d"),ic:"droplet",won:Math.floor(d.water/250)>=8},
    {n:t("b4n"),d:t("b4d"),ic:"footprints",won:d.steps>=10000},
    {n:t("b5n"),d:t("b5d"),ic:"target",won:d.kcal>0&&Math.abs(d.kcal-target)/target<=0.1},
    {n:t("b6n"),d:t("b6d"),ic:"sunrise",won:bfastStreak>=5},
  ];
}
function renderRewards(){
  const st=streak(); const bs=badges();
  $("#rewards-body").innerHTML=`
    <div class="glass-card streak-card"><div class="flame">${ic("flame",44)}</div><b>${st}</b><span>${t("dayStreak")}</span>
      <div style="margin-top:8px;font-size:13px">${t("keepGoing")}</div></div>
    <div class="badge-grid">${bs.map(b=>`<div class="glass-card badge ${b.won?"won":""}">
      <span class="b-ico">${ic(b.won?b.ic:"lock",30)}</span><b>${b.n}</b><small>${b.d}</small></div>`).join("")}</div>`;
}

/* ---------- MENU ---------- */
function renderProfile(){
  const p=S.profile||{};
  const who = S.user ? (S.user.displayName||S.user.email) : (S.guest? t("guest") : t("notSignedIn"));
  const A=window.F1T_ANALYSIS, bmi=A?A.bmi(p.h,p.w):null;
  let st=0; try{ st=streak(); }catch(e){}
  $("#profile-body").innerHTML=`
    <div class="glass-card logo-card"><img class="app-logo logo-profile" src="assets/icons/icon-192.png" alt="F1T">
      <div><div class="logo-md">F1<span>T</span></div><small>${t("tagline")}</small></div></div>
    <div class="glass-card prof-card"><div class="avatar">${((p.name||"F")[0]||"F").toUpperCase()}</div>
      <div><b>${p.name||t("guest")}</b><small>${t("signedInAs")}: ${who}</small></div></div>
    <div class="glass-card p-stats">
      <div><b>${bmi?bmi.value.toFixed(1):"--"}</b><small>${t("bmi")}</small></div>
      <div><b>${fmt(p.targetKcal||2000)}</b><small>${t("kcal")}${t("perDay")}</small></div>
      <div><b>${st}</b><small>${t("dayStreak")}</small></div></div>
    <div class="menu-list">
      <button class="glass-card menu-row" id="m-lang"><span class="mr-ico">${ic("globe",20)}</span><span class="mr-t">${t("language")}</span><span class="mr-sub">${t("langName")}</span><span class="chev">›</span></button>
      <button class="glass-card menu-row" id="m-goals"><span class="mr-ico">${ic("target",20)}</span><span class="mr-t">${t("editGoals")}</span><span class="mr-sub">${fmt(p.targetKcal||2000)} ${t("kcal")}</span><span class="chev">›</span></button>
      <div class="glass-card menu-row theme-row" id="m-theme"><div class="theme-top"><span class="mr-ico">${ic("sun",20)}</span><span class="mr-t">${t("appearance")}</span></div>
        <span class="seg-sm theme-seg"><button data-th="light" class="${S.theme!=="dark"?"on":""}">${t("lightMode")}</button><button data-th="dark" class="${S.theme==="dark"?"on":""}">${t("darkMode")}</button></span></div>
      <button class="glass-card menu-row" id="m-install"><span class="mr-ico">${ic("smartphone",20)}</span><span class="mr-t">${t("installApp")}</span><span class="chev">›</span></button>
      <button class="glass-card menu-row danger" id="m-logout"><span class="mr-ico">${ic("logout",20)}</span><span class="mr-t">${t("logout")}</span></button>
    </div>
    <div class="empty-note">${t("version")}</div>`;
  $("#m-lang").onclick=()=>{ S.lang=S.lang==="en"?"my":"en"; store.set("f1t_lang",S.lang);
    if(S.profile){ S.profile.lang=S.lang; window.F1TFB.saveProfile(S.profile); } applyI18n(); };
  $("#m-goals").onclick=openGoals;
  $("#m-theme").onclick=e=>{ const b=e.target.closest("[data-th]"); if(!b) return;
    S.theme=b.dataset.th; applyTheme();
    $$("#m-theme [data-th]").forEach(x=>x.classList.toggle("on",x===b)); };
  $("#m-install").onclick=()=>openInfo(t("installApp"), t("installHow"));
  $("#m-logout").onclick=()=>{
    $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
      <h2>${t("logout")}</h2><p style="text-align:center;color:var(--ink2);font-weight:600;margin-bottom:18px">${t("confirmLogout")}</p>
      <div class="ob-nav"><button class="btn-back" id="lg-cancel">${t("cancel")}</button>
      <button class="btn-lime" id="lg-ok">${t("logout")}</button></div></div></div>`;
    $("#lg-cancel").onclick=closeModal;
    $("#lg-ok").onclick=async()=>{ stopLive(); await window.F1TFB.signOut(); store.del("f1t_guest"); location.reload(); };
    $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
  };
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
    await window.F1TFB.saveProfile(S.profile); closeModal(); toast(t("targetUpdated")); renderProfile(); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function closeModal(){ $("#modal-root").innerHTML=""; }

/* ---------- SHEET + LOGGING ---------- */
function openSheet(){
  const opts=[["meal","utensils",t("logMeal")],["water","droplet",t("logWater")],["weight","scale",t("logWeight")],["steps","footprints",t("logSteps")],["exercise","activity",t("exercise")],["camera","camera",t("takePhoto")]];
  $("#sheet-grid").innerHTML=opts.map(o=>`<button class="sheet-opt" data-k="${o[0]}"><span>${ic(o[1],26)}</span>${o[2]}</button>`).join("");
  $("#sheet").classList.remove("hidden"); $("#sheet-backdrop").classList.remove("hidden");
  $$("#sheet-grid .sheet-opt").forEach(b=>b.onclick=()=>{ closeSheet();
    const k=b.dataset.k;
    if(k==="meal") openMealPicker("snacks");
    if(k==="water") openWater();
    if(k==="weight") openWeight();
    if(k==="steps") openSteps();
    if(k==="exercise") openExercise();
    if(k==="camera") openCamera();
  });
}
function closeSheet(){ $("#sheet").classList.add("hidden"); $("#sheet-backdrop").classList.add("hidden"); }

function openMealPicker(meal){
  const foodName=f=> S.lang==="my"? f.my : f.en;
  const renderList=q=>{
    const list=window.F1T_FOODS.filter(f=>!q||foodName(f).toLowerCase().includes(q.toLowerCase())).slice(0,30);
    $("#food-list").innerHTML=list.map(f=>`<button class="food-row" data-id="${f.id}">
      <span class="f-ico">${ic(f.ic,22)}</span><span class="f-info"><b>${foodName(f)}</b><small>P ${f.p}g · C ${f.c}g · F ${f.f}g</small></span>
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
    if(!n||!k) return; addFood(meal,{id:"c"+Date.now(),en:n,my:n,kcal:k,p:0,c:0,f:0,ic:"utensils"}); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function addFood(meal,f){
  S.day.meals[meal].push({id:f.id,name:f.en,name_my:f.my,kcal:f.kcal,p:f.p,c:f.c,f:f.f,ic:f.ic||"utensils",at:Date.now()});
  S.day.kcal+=f.kcal; S.day.p+=f.p; S.day.c+=f.c; S.day.f+=f.f;
  saveDay(); closeModal(); toast(t("logged")); renderHome();
}
function openWater(){
  let cups=Math.floor(S.day.water/250);
  const draw=()=>{ $("#w-n").textContent=cups; };
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${ic("droplet",22)} ${t("logWater")}</h2><p style="text-align:center;color:var(--ink2);font-weight:600">${t("oneCup")}</p>
    <div class="stepper"><button id="w-m">−</button><b id="w-n">${cups}</b><button id="w-p">+</button></div>
    <button class="btn-lime" id="w-save">${t("save")}</button></div></div>`;
  $("#w-m").onclick=()=>{ cups=Math.max(0,cups-1); draw(); };
  $("#w-p").onclick=()=>{ cups=Math.min(20,cups+1); draw(); };
  $("#w-save").onclick=()=>{ S.day.water=cups*250; saveDay(); closeModal(); toast(t("logged")); renderHome(); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function openWeight(){
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${ic("scale",22)} ${t("logWeight")}</h2>
    <div class="field"><label>${t("weight")} (${t("kg")})</label><input id="wt-v" type="number" inputmode="decimal" value="${S.profile.w||""}"></div>
    <button class="btn-lime" id="wt-save">${t("save")}</button></div></div>`;
  $("#wt-save").onclick=async()=>{ const v=+$("#wt-v").value; if(v>0){ S.profile.w=v;
    await window.F1TFB.saveProfile(S.profile); } closeModal(); toast(t("logged")); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function openSteps(){
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${ic("footprints",22)} ${t("logSteps")}</h2>
    <div class="field"><label>${t("stepsToWalk")}</label><input id="st-v" type="number" inputmode="numeric" value="${S.day.steps||""}"></div>
    <button class="btn-lime" id="st-save">${t("save")}</button></div></div>`;
  $("#st-save").onclick=()=>{ S.day.steps=+$("#st-v").value||0; saveDay(); closeModal(); toast(t("logged")); renderHome(); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function downscalePhoto(file){
  return new Promise(res=>{
    try{
      const img=new Image();
      img.onload=()=>{
        const max=640; let w=img.width,h=img.height;
        if(w>max||h>max){ const r=Math.min(max/w,max/h); w=Math.round(w*r); h=Math.round(h*r); }
        const c=document.createElement("canvas"); c.width=w||1; c.height=h||1;
        c.getContext("2d").drawImage(img,0,0,c.width,c.height);
        try{ URL.revokeObjectURL(img.src); }catch(e){}
        res(c.toDataURL("image/jpeg",0.72));
      };
      img.onerror=()=>res(null);
      img.src=URL.createObjectURL(file);
    }catch(e){ res(null); }
  });
}
function openCamera(){
  let meal="snacks", photo=null;
  const meals=["breakfast","lunch","dinner","snacks"];
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${ic("camera",22)} ${t("takePhoto")}</h2>
    <div class="cam-preview" id="cam-prev"><span>${ic("camera",40)}</span></div>
    <input type="file" id="cam-file" accept="image/*" capture="environment" class="hidden">
    <div class="seg-sm" style="margin-bottom:12px">${meals.map(m=>`<button data-m="${m}" class="${m===meal?"on":""}">${t(m)}</button>`).join("")}</div>
    <div class="field"><label>${t("foodName")}</label><input id="cam-name" placeholder="${t("foodName")}"></div>
    <div class="qty-row"><input id="cam-kcal" type="number" inputmode="numeric" placeholder="${t("calories")} (${t("kcal")})">
      <button class="btn-lime" id="cam-save" style="width:auto;padding:14px 26px">${t("add")}</button></div>
    <button class="btn-glass full" id="cam-snap">${t("takePhoto")}</button></div></div>`;
  $$("#modal-root .seg-sm button").forEach(b=>b.onclick=()=>{ meal=b.dataset.m;
    $$("#modal-root .seg-sm button").forEach(x=>x.classList.toggle("on",x===b)); });
  $("#cam-snap").onclick=()=>$("#cam-file").click();
  $("#cam-file").onchange=async e=>{
    const f=e.target.files&&e.target.files[0]; if(!f) return;
    const url=await downscalePhoto(f);
    if(url){ photo=url; $("#cam-prev").innerHTML=`<img src="${url}" alt="">`; $("#cam-snap").textContent=t("retake"); }
  };
  $("#cam-save").onclick=()=>{
    const n=$("#cam-name").value.trim()||t("takePhoto"), k=+$("#cam-kcal").value||0;
    if(!k||!photo) return;
    S.day.meals[meal].push({id:"p"+Date.now(),name:n,name_my:n,kcal:k,p:0,c:0,f:0,ic:"camera",photo,at:Date.now()});
    S.day.kcal+=k; saveDay(); closeModal(); toast(t("logged")); renderHome();
  };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function openExercise(){
  let h=S.day.exercise||0;
  const draw=()=>{ $("#ex-n").textContent=h.toFixed(1); };
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${ic("activity",22)} ${t("logExercise")}</h2><p style="text-align:center;color:var(--ink2);font-weight:600">${t("hours")}</p>
    <div class="stepper"><button id="ex-m">−</button><b id="ex-n">${h.toFixed(1)}</b><button id="ex-p">+</button></div>
    <button class="btn-lime" id="ex-save">${t("save")}</button></div></div>`;
  $("#ex-m").onclick=()=>{ h=Math.max(0,Math.round((h-0.5)*2)/2); draw(); };
  $("#ex-p").onclick=()=>{ h=Math.min(24,Math.round((h+0.5)*2)/2); draw(); };
  $("#ex-save").onclick=()=>{ S.day.exercise=h; saveDay(); closeModal(); toast(t("logged")); show(S.view); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function openBpm(){
  let v=S.day.bpm||70;
  const draw=()=>{ $("#bp-n").textContent=v; };
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${ic("heart",22)} ${t("logBpm")}</h2><p style="text-align:center;color:var(--ink2);font-weight:600">${t("bpm")}</p>
    <div class="stepper"><button id="bp-m">−</button><b id="bp-n">${v}</b><button id="bp-p">+</button></div>
    <button class="btn-lime" id="bp-save">${t("save")}</button></div></div>`;
  $("#bp-m").onclick=()=>{ v=Math.max(40,v-1); draw(); };
  $("#bp-p").onclick=()=>{ v=Math.min(220,v+1); draw(); };
  $("#bp-save").onclick=()=>{ S.day.bpm=v; saveDay(); closeModal(); toast(t("logged")); show(S.view); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}

/* ---------- boot ---------- */
function initNav(){
  $$("[data-goto]").forEach(b=>{ if(b.id!=="tab-add") b.onclick=()=>show(b.dataset.goto); });
  $("#tab-add").onclick=openSheet;
  $("#sheet-close").onclick=closeSheet;
  $("#sheet-backdrop").onclick=closeSheet;
  /* designed icons */
  const tg={home:"home",stats:"chart",rewards:"trophy",profile:"user"};
  $$("#tabbar .tab[data-goto] .t-ico").forEach(el=>{ el.innerHTML=ic(tg[el.closest(".tab").dataset.goto]||"home",22); });
  $("#tab-add .t-ico").innerHTML=ic("plus",30);
  $("#home-cal").innerHTML=ic("calendar",19);
  $("#home-bell").innerHTML=ic("bell",19)+'<span class="dot"></span>';
  $("#home-cal").onclick=openDatePicker;
  $("#home-bell").onclick=openNotif;
  $$(".page-head .back").forEach(b=>{ b.innerHTML=ic("chevL",22); });
  $$(".page-head .more").forEach(b=>{ b.innerHTML=ic("more",20); b.onclick=openWeekPick; });
}
async function boot(){
  applyTheme(); applyI18n(); initAuth(); initNav();
  let redirErr=null;
  try{ await window.F1TFB.redirectResult(); }catch(e){ redirErr=e; }
  setTimeout(async()=>{
    let landed=false;
    window.F1TFB.onAuth(async u=>{
      if(landed) return; landed=true;
      S.user=u||null;
      if(u || S.guest){ await loadAll(); enter(); }
      else { show("auth"); if(redirErr) authErr(googleErrMsg(redirErr)); }
    });
    // fallback if firebase unavailable
    setTimeout(async()=>{ if(!landed){ landed=true;
      if(S.guest){ await loadAll(); enter(); }
      else { show("auth"); if(redirErr) authErr(googleErrMsg(redirErr)); } } }, 3500);
  }, 900);
  if(navigator.serviceWorker && navigator.serviceWorker.register){ try{ navigator.serviceWorker.register("sw.js").catch(()=>{}); }catch(e){} }
}
document.addEventListener("DOMContentLoaded", boot);
window.F1T={state:S,show,applyLang:applyI18n,t,ic:(n,s)=>window.f1tIcon(n,s)};
})();
