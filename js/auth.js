/* ============ F1T v12 · Auth ============
   Welcome, email/Google auth, onboarding, profile, settings.
   Errors are specific and actionable (never one generic message). */
window.F1T_AUTH = (() => {
  "use strict";
  const S = window.F1T_STORE, UI = window.F1T_UI;
  const t = k => window.F1T_t(k);
  let mode = "signup"; // or "login"

  /* ---------- specific auth errors ---------- */
  function errMsg(e){
    const c = (e && e.code) || "";
    if(c==="auth/email-already-in-use") return t("errEmailInUse");
    if(c==="auth/invalid-email") return t("errBadEmail");
    if(c==="auth/weak-password") return t("errWeakPass");
    if(c==="auth/wrong-password"||c==="auth/invalid-credential") return t("errBadCred");
    if(c==="auth/user-not-found") return t("errNoUser");
    if(c==="auth/operation-not-allowed") return t("errAuthOff");
    if(c==="auth/network-request-failed") return t("errNetwork");
    if(c==="auth/too-many-requests") return t("errTooMany");
    if(c==="auth/unauthorized-domain") return t("errDomain");
    if(c==="auth/popup-blocked"||c==="auth/popup-closed-by-user") return t("authFail");
    return t("authFail");
  }

  /* ---------- welcome ---------- */
  function renderWelcome(sc){
    sc.innerHTML = "";
    const w = UI.el("div", "welcome");
    w.innerHTML = `
      <div class="wel-aurora"></div>
      <div class="wel-mark brand-font">F1T</div>
      <h1 class="wel-title">${UI.esc(t("welTitle"))}</h1>
      <p class="wel-sub">${UI.esc(t("welSub"))}</p>
      <div class="wel-cta"></div>
      <button class="linklike" id="wel-login">${UI.esc(t("login"))}</button>
      <p class="wel-terms small muted">${UI.esc(t("welTerms"))}</p>`;
    const cta = UI.btn(t("getStarted"), { kind:"lime" });
    cta.addEventListener("click", ()=>{ mode="signup"; renderAuth(sc); });
    w.querySelector(".wel-cta").appendChild(cta);
    w.querySelector("#wel-login").addEventListener("click", ()=>{ mode="login"; renderAuth(sc); });
    sc.appendChild(w);
  }

  /* ---------- email auth ---------- */
  function renderAuth(sc){
    sc.innerHTML = "";
    const w = UI.el("div", "authwrap");
    w.innerHTML = `<div class="wel-mark sm brand-font">F1T</div>
      <h2>${UI.esc(mode==="signup"?t("createAccount"):t("welcomeBack"))}</h2>
      <div class="segwrap"></div>
      <div class="errbox" hidden></div>
      <div class="form"></div>
      <div class="divider"><span>${UI.esc(t("or"))}</span></div>
      <div class="gwrap"></div>
      <button class="linklike" id="auth-guest">${UI.esc(t("continueGuest"))}</button>`;
    const segW = w.querySelector(".segwrap");
    segW.appendChild(UI.seg(
      [{v:"signup",t:t("signup")},{v:"login",t:t("login")}], mode, v=>{ mode=v; renderAuth(sc); }));
    const form = w.querySelector(".form");
    const errBox = w.querySelector(".errbox");
    const showErr = m => { errBox.hidden=false; errBox.textContent=m; };
    if(mode==="signup") form.appendChild(UI.field(t("name"), UI.input({ placeholder:t("namePh") })));
    const emIn = UI.input({ type:"email", placeholder:t("emailPh"), inputmode:"email" });
    const pwIn = UI.input({ type:"password", placeholder:t("passPh") });
    form.appendChild(UI.field(t("email"), emIn));
    form.appendChild(UI.field(t("password"), pwIn));
    const go = UI.btn(mode==="signup"?t("signup"):t("login"), { kind:"lime" });
    go.addEventListener("click", async ()=>{
      const em = emIn.value.trim(), pw = pwIn.value;
      if(!em||!pw){ showErr(t("needEmailPass")); return; }
      errBox.hidden = true; go.setBusy(true);
      const r = await S.runOp("auth", async ()=>{
        if(!window.F1TFB) throw { code:"auth/network-request-failed" };
        return mode==="signup"
          ? await window.F1TFB.signUp(em, pw, form.querySelector("input").value.trim())
          : await window.F1TFB.signIn(em, pw);
      });
      go.setBusy(false);
      if(!r.ok && !r.busy){ showErr(r.error&&r.error.code?errMsg(r.error):t("authFail")); return; }
      if(r.ok) afterAuth(r.out);
    });
    form.appendChild(go);
    const g = UI.btn(t("continueGoogle"), { kind:"ghost", icon:"google" });
    g.addEventListener("click", async ()=>{
      errBox.hidden = true; g.setBusy(true);
      const r = await S.runOp("gauth", async ()=>{
        if(!window.F1TFB) throw { code:"auth/network-request-failed" };
        await window.F1TFB.google();
        return "redirect";
      });
      g.setBusy(false);
      if(!r.ok && !r.busy) showErr(r.error&&r.error.code?errMsg(r.error):t("authFail"));
    });
    w.querySelector(".gwrap").appendChild(g);
    w.querySelector("#auth-guest").addEventListener("click", ()=>{
      S.write("f1t_guest", true);
      if(!S.getProfile()) renderOnboarding(sc); else window.F1T_APP.go("home");
    });
    sc.appendChild(w);
  }
  async function afterAuth(u){
    S.setUser({ uid:u.uid, email:u.email, name:u.displayName });
    S.write("f1t_guest", false);
    try{ if(window.F1TFB) await window.F1TFB.pushLocalToCloud(); }catch(e){}
    if(!S.getProfile()){ const sc=document.getElementById("screen"); renderOnboarding(sc); }
    else window.F1T_APP.go("home");
  }

  /* ---------- onboarding ---------- */
  const GOALS = ["lose","maintain","gain"];
  function renderOnboarding(sc){
    sc.innerHTML = "";
    const w = UI.el("div", "obwrap");
    w.innerHTML = `<h2>${UI.esc(t("obTitle"))}</h2><p class="muted">${UI.esc(t("obSub"))}</p><div class="form"></div>`;
    const form = w.querySelector(".form");
    const nameI = UI.input({ placeholder:t("namePh"), value:(S.getUser()||{}).name||"" });
    const ageI = UI.input({ type:"number", placeholder:t("agePh"), inputmode:"numeric" });
    const hI = UI.input({ type:"number", placeholder:t("heightPh"), inputmode:"decimal" });
    const wI = UI.input({ type:"number", placeholder:t("weightPh"), inputmode:"decimal" });
    form.appendChild(UI.field(t("name"), nameI));
    const row = UI.el("div","row-2");
    row.appendChild(UI.field(t("age"), ageI)); row.appendChild(UI.field(t("heightCm"), hI));
    form.appendChild(row);
    form.appendChild(UI.field(t("weightKg"), wI));
    form.appendChild(UI.el("span","field-lb", t("goal")));
    const goalSeg = UI.seg(GOALS.map(g=>({v:g,t:t("goal_"+g)})), "maintain", ()=>{});
    form.appendChild(goalSeg);
    let goal = "maintain";
    goalSeg.querySelectorAll(".seg-b").forEach(b=>b.addEventListener("click",()=>{ goal=b.textContent; }));
    const done = UI.btn(t("getStarted"), { kind:"lime" });
    const err = UI.el("p","errbox small", ""); err.hidden = true;
    done.addEventListener("click", async ()=>{
      const h = parseFloat(hI.value), wv = parseFloat(wI.value);
      if(!h||h<100||h>250||!wv||wv<20||wv>400){ err.hidden=false; err.textContent=t("obInvalid"); form.appendChild(err); return; }
      done.setBusy(true);
      const segOn = goalSeg.querySelector(".seg-b.on");
      const gv = GOALS[[...goalSeg.querySelectorAll(".seg-b")].indexOf(segOn)] || "maintain";
      await S.saveProfile({ name:nameI.value.trim()||t("guest"), age:parseInt(ageI.value)||null,
        h, w:h, w0:wv, goal:gv, ts:Date.now() });
      window.F1T_APP.go("home");
    });
    form.appendChild(done); form.appendChild(err);
    sc.appendChild(w);
  }

  /* ---------- profile ---------- */
  function renderProfile(sc){
    sc.innerHTML = "";
    const p = S.getProfile() || {};
    const head = UI.el("div","screen-head");
    head.innerHTML = `<div><h1>${UI.esc(p.name||t("guest"))}</h1>
      <p class="muted small">${[p.age?t("age")+" "+p.age:null,p.h?p.h+" cm":null,p.goal?t("goal_"+p.goal):null].filter(Boolean).join(" · ")}</p></div>`;
    sc.appendChild(head);
    const grid = UI.el("div","stat-grid");
    const day = S.getDay(S.todayKey());
    [["kcal", Math.round(day.kcal)],["protein", Math.round(day.p)+"g"],["water",(day.water/1000).toFixed(1)+"L"]]
      .forEach(([k,v])=>{ const s=UI.el("div","stat"); s.innerHTML=`<small>${UI.esc(t("st_"+k))}</small><b>${UI.esc(v)}</b>`; grid.appendChild(s); });
    sc.appendChild(grid);
    const rows = [
      ["trophy", t("scoreboard"), ()=>window.F1T_SCORE.openScoreboard()],
      ["muscle-chest", t("bodyMap"), ()=>window.F1T_APP.go("body")],
      ["doc", t("weeklyReport"), ()=>window.F1T_REPORT && F1T_REPORT.open()],
      ["flame", t("rewards"), ()=>window.F1T_APP.go("home")],
      ["pencil", t("editProfile"), ()=>renderOnboarding(sc)],
    ];
    rows.forEach(([ic,label,fn])=>{
      const b = UI.el("button","menu-row", `${window.f1tIcon(ic,20)}<span>${UI.esc(label)}</span><span class="chev">›</span>`);
      b.addEventListener("click", fn);
      sc.appendChild(b);
    });
  }

  /* ---------- settings ---------- */
  function renderSettings(sc){
    sc.innerHTML = "";
    sc.appendChild(UI.el("div","screen-head")).innerHTML = `<div><h1>${UI.esc(t("settings"))}</h1></div>`;
    const mk = (icon,label,fn) => {
      const b = UI.el("button","menu-row", `${window.f1tIcon(icon,20)}<span>${UI.esc(label)}</span><span class="chev">›</span>`);
      b.addEventListener("click", fn); sc.appendChild(b); return b;
    };
    mk("moon", t("appearance"), ()=>{
      const cur = S.getPref("theme","dark");
      S.setPref("theme", cur==="dark"?"light":"dark");
      document.documentElement.dataset.theme = S.getPref("theme","dark");
      UI.toast(t("saved"));
    });
    mk("lang", t("language"), ()=>{
      const langs = [["en","English"],["my","မြန်မာ"],["th","ไทย"],["zh","中文"],["ja","日本語"]];
      UI.sheet((body, close)=>{
        body.appendChild(UI.el("h3","",t("language")));
        langs.forEach(([v,lb])=>{
          const b = UI.el("button","menu-row", `<span>${UI.esc(lb)}</span>${S.getPref("lang","en")===v?'<span class="chev">✓</span>':""}`);
          b.addEventListener("click", ()=>{ S.setPref("lang", v); close(); });
          body.appendChild(b);
        });
      });
    });
    mk("doc", t("terms"), ()=>UI.sheet((body)=>{ body.appendChild(UI.el("h3","",t("terms"))); body.appendChild(UI.el("p","muted",t("termsBody"))); }));
    mk("logout", t("logout"), ()=>{
      UI.confirmDlg(t("logout"), t("confirmLogout"), t("logout"), async ()=>{
        try{ if(window.F1TFB) await window.F1TFB.signOut(); }catch(e){}
        S.setUser(null); S.write("f1t_guest", false);
        renderWelcome(document.getElementById("screen"));
      });
    });
    const ver = UI.el("p", "ver", "F1T v12");
    sc.appendChild(ver);
  }

  return { renderWelcome, renderAuth, renderOnboarding, renderProfile, renderSettings };
})();
