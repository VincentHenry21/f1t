/* ============ F1T v12 · App shell ============
   Router + tab bar + boot. Screens are modules: F1T_MEALS, F1T_HEALTH,
   F1T_STATS, F1T_COACH, F1T_WORKOUT, F1T_SCORE, F1T_REPORT, F1T_ANATOMY,
   F1T_AUTH. Every screen render is driven by real store state. */
window.F1T_APP = (() => {
  "use strict";
  const S = window.F1T_STORE, UI = window.F1T_UI;
  const t = (k, p) => {
    const L = window.F1T_I18N || {}, lang = document.documentElement.lang || "en";
    let s = (L[lang] && L[lang][k] !== undefined) ? L[lang][k] : ((L.en && L.en[k]) || k);
    if(p) Object.keys(p).forEach(key => { s = s.replace("{"+key+"}", p[key]); });
    return s;
  };
  window.F1T_t = t;

  const TABS = [
    { id:"home",    icon:"home",     label:() => t("summary") },
    { id:"coach",   icon:"coach",    label:() => t("coach") },
    { id:"add",     fab:true },
    { id:"profile", icon:"user",     label:() => t("profile") },
    { id:"settings",icon:"gear",     label:() => t("settings") },
  ];
  let cur = "home";

  function renderTabbar(){
    const bar = document.getElementById("tabbar");
    bar.innerHTML = "";
    TABS.forEach(tb => {
      if(tb.fab){
        const f = UI.el("button", "", window.f1tIcon("plus", 24));
        f.id = "fab"; f.setAttribute("aria-label", t("quickLog"));
        f.addEventListener("click", () => quickAdd());
        bar.appendChild(f);
        return;
      }
      const b = UI.el("button", "tab"+(cur===tb.id?" on":""));
      b.setAttribute("aria-label", tb.label());
      b.innerHTML = `<span class="bubble"></span>${window.f1tIcon(tb.icon, 22)}<span>${UI.esc(tb.label())}</span>`;
      b.addEventListener("click", ()=>go(tb.id));
      bar.appendChild(b);
    });
  }

  function go(id){
    /* teardown the 3D view before leaving it (frees WebGL resources) */
    if(cur === "body" && id !== "body"){
      try{ window.F1T_ANAT && F1T_ANAT.dispose(document.getElementById("screen")); }catch(e){}
    }
    cur = id;
    renderTabbar();
    const sc = document.getElementById("screen");
    sc.scrollTop = 0;
    const R = {
      home:    () => window.F1T_STATS && F1T_STATS.renderHome(sc),
      coach:   () => window.F1T_COACH && F1T_COACH.render(sc),
      profile: () => window.F1T_AUTH && F1T_AUTH.renderProfile(sc),
      settings:() => window.F1T_AUTH && F1T_AUTH.renderSettings(sc),
      body:    () => {
        sc.innerHTML = "";
        const head = UI.el("div","screen-head");
        head.innerHTML = `<button class="ico-btn" id="body-back" aria-label="${UI.esc(t("back"))}">${window.f1tIcon("back",20)}</button><div><h1>${UI.esc(t("bodyMap"))}</h1></div>`;
        sc.appendChild(head);
        head.querySelector("#body-back").addEventListener("click", ()=>go("profile"));
        if(window.F1T_ANAT) F1T_ANAT.render(sc); else sc.appendChild(UI.empty(t("loadError")));
      },
    }[id];
    if(R) R(); else sc.appendChild(UI.empty(t("comingSoon")));
  }

  function quickAdd(){
    const { sheet } = UI;
    sheet((body, close) => {
      body.appendChild(UI.el("h3", "", t("quickLog")));
      const mk = (icon, label, fn) => {
        const b = UI.el("button", "menu-row", `${window.f1tIcon(icon,20)}<span>${UI.esc(label)}</span><span class="chev">›</span>`);
        b.addEventListener("click", ()=>{ close(); setTimeout(fn, 220); });
        body.appendChild(b);
      };
      mk("food", t("logMeal"), ()=>window.F1T_MEALS && F1T_MEALS.openLogger());
      mk("drop", t("logWater"), ()=>window.F1T_HEALTH && F1T_HEALTH.openWater());
      mk("steps", t("logSteps"), ()=>window.F1T_HEALTH && F1T_HEALTH.openSteps());
      mk("scale", t("logWeight"), ()=>window.F1T_HEALTH && F1T_HEALTH.openWeight());
      mk("dumbbell", t("startWorkout"), ()=>window.F1T_WORKOUT && F1T_WORKOUT.open());
    });
  }

  /* ---------- boot ---------- */
  async function boot(){
    const lang = S.getPref("lang", "en");
    document.documentElement.lang = lang;
    renderTabbar();
    const sc = document.getElementById("screen");
    sc.appendChild(UI.loading(t("loading")));

    // session restore (real, not faked)
    const user = S.getUser();
    if(!user && !S.read("f1t_guest", false)){
      if(window.F1T_AUTH) F1T_AUTH.renderWelcome(sc);
      else sc.innerHTML = "";
      return;
    }
    // restore Firebase session if the SDK is present
    if(window.F1TFB){
      try{
        const r = await window.F1TFB.redirectResult();
        if(r) S.setUser({ uid:r.uid, email:r.email, name:r.displayName });
      }catch(e){}
    }
    go("home");
  }

  if("serviceWorker" in navigator){
    addEventListener("load", ()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  }
  document.addEventListener("DOMContentLoaded", boot);
  // re-render on language change
  S.on("f1t_pref_lang", ()=>{ document.documentElement.lang = S.getPref("lang","en"); renderTabbar(); go(cur); });

  return { go, boot, renderTabbar };
})();
