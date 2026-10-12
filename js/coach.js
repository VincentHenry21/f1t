/* ============ F1T v12 · AI Coach ============
   Coach screen: persona pills (all free), today's plan workout card,
   post-workout RPE feedback, and a real AI chat over Pollinations.ai
   (keyless GET). Every state is real: "thinking" only while the fetch
   is in flight, error with retry on failure, cancel aborts the request.
   No simulated responses, no fake streaming, no artificial delays. */
window.F1T_COACH = (() => {
  "use strict";
  const S = window.F1T_STORE, UI = window.F1T_UI;
  const t = (k, p) => window.F1T_t(k, p);

  /* ================= plan engine (self-contained, offline) =================
     7-day templates, index 0 = Monday. [workoutKey, minutes]. */
  const TPL = {
    lose:     [["wHIIT",30],["wStrength",40],["wCardio",40],["rest",0],["wHIIT",30],["wCardio",45],["wWalk",30]],
    gain:     [["wPush",45],["wPull",45],["rest",0],["wLegs",50],["wPush",45],["wCardio",25],["rest",0]],
    maintain: [["wCardio",30],["wStrength",40],["rest",0],["wHIIT",25],["wWalk",30],["wStrength",40],["rest",0]]
  };
  function buildPlan(p){
    p = p || {};
    const goal = (p.goal==="lose"||p.goal==="gain") ? p.goal : "maintain";
    const w = +p.w || 0, h = +p.h || 0;
    let bmi = null, lo = null, hi = null, targetW = w;
    if(h > 0 && w > 0){
      const m2 = (h/100)*(h/100);
      bmi = Math.round(w/m2*10)/10;
      lo = Math.round(18.5*m2*10)/10; hi = Math.round(24.9*m2*10)/10;
      targetW = goal==="lose" ? Math.min(w,hi)
              : goal==="gain" ? Math.max(w,lo)
              : Math.min(Math.max(w,lo),hi);
      targetW = Math.round(targetW*2)/2;
    }
    const kcal = +p.targetKcal || 2000;
    const protein = w > 0 ? Math.round(1.8*w) : Math.round(kcal*0.25/4);
    const carbs = Math.round(kcal*0.45/4);
    const fat = Math.round(kcal*0.30/9);
    const water = w > 0 ? Math.round(35*w) : 2500;
    const workouts = (TPL[goal]||TPL.maintain).map((d,i) => ({ day:i, key:d[0], mins:d[1] }));
    return {
      goal,
      body: { bmi, lo, hi, targetW },
      workouts,
      nutrition: { protein, carbs, fat, water,
        preCarb: Math.round(carbs*0.18), postProt: Math.round(protein*0.3) }
    };
  }
  function todayWorkout(plan){
    const idx = (new Date().getDay()+6)%7; // 0 = Monday
    return plan.workouts[idx];
  }

  /* ================= chat state (persisted) ================= */
  const K_CHAT = "f1t_chat", MAX_KEEP = 80;
  let CHAT = null;
  let screenEl = null;
  let busy = false, ctl = null, cancelled = false;

  function loadChat(){
    if(CHAT) return CHAT;
    const v = S.read(K_CHAT, []);
    CHAT = Array.isArray(v) ? v.filter(m => m && (m.r==="user"||m.r==="bot") && typeof m.x==="string") : [];
    return CHAT;
  }
  function saveChat(){
    S.write(K_CHAT, CHAT.slice(-MAX_KEEP));
  }
  function pushMsg(m){
    CHAT.push(m);
    if(CHAT.length > MAX_KEEP) CHAT = CHAT.slice(-MAX_KEEP);
    saveChat();
  }

  /* ================= RPE feedback ================= */
  const RPE_WINDOW = 72*3600*1000;
  function latestWorkout(){
    const ws = (S.getWorkouts()||[]).filter(w => w && w.ts);
    ws.sort((a,b) => b.ts-a.ts);
    return ws[0] || null;
  }
  function needsRpe(){
    const w = latestWorkout();
    return !!(w && !w.rpe && (Date.now()-w.ts) < RPE_WINDOW);
  }
  function saveRpe(val){
    const ws = S.getWorkouts()||[];
    const w = latestWorkout();
    if(!w) return;
    const i = ws.findIndex(x => x && (x.id ? x.id===w.id : x.ts===w.ts));
    if(i < 0) return;
    ws[i] = Object.assign({}, ws[i], { rpe: val });
    S.saveWorkouts(ws);
  }
  function lastFeedback(){
    const ws = (S.getWorkouts()||[]).filter(w => w && w.rpe && w.ts);
    ws.sort((a,b) => b.ts-a.ts);
    const w = ws[0];
    if(!w) return null;
    return { rpe: w.rpe, date: new Date(w.ts).toLocaleDateString() };
  }

  /* ================= AI: real Pollinations.ai requests ================= */
  function buildSystem(){
    const per = window.F1T_SCORE ? F1T_SCORE.persona() : "coach";
    let sys = window.F1T_SCORE ? F1T_SCORE.sysFor(per)
      : "You are F1T Coach, an expert fitness and nutrition coach. Use metric units. Never diagnose medical conditions; suggest a professional for health concerns. ";
    sys += "If asked for a medical diagnosis, refuse briefly and suggest seeing a qualified professional. ";
    const p = S.getProfile() || {};
    const d = S.getDay(S.todayKey());
    const n = buildPlan(p).nutrition;
    sys += "User profile: name="+(p.name||"friend")+", age="+(p.age||"?")+
      ", height="+(p.h||"?")+"cm, weight="+(p.w||"?")+"kg, goal="+(p.goal||"maintain")+
      ", daily target="+(p.targetKcal||2000)+"kcal. ";
    sys += "Today so far: "+(d.kcal||0)+"kcal, protein "+(d.p||0)+"g, carbs "+(d.c||0)+
      "g, fat "+(d.f||0)+"g, water "+(d.water||0)+"ml, steps "+(d.steps||0)+". ";
    sys += "Plan targets (estimates): "+n.protein+"g protein, "+n.carbs+"g carbs, "+n.fat+"g fat. ";
    const fb = lastFeedback();
    if(fb) sys += "Last workout feedback: felt "+fb.rpe+" on "+fb.date+
      ". Adjust future suggestions accordingly, but never encourage training through pain. ";
    sys += "Today is "+new Date().toDateString()+".";
    return sys;
  }
  async function fetchReply(text, signal){
    const sys = buildSystem();
    let hist = loadChat()
      .filter(m => m.r==="user" || m.r==="bot")
      .slice(-6)
      .map(m => ((m.r==="user" ? "User" : "Coach")+": "+m.x).slice(0, 500));
    let url = "";
    for(;;){
      const block = (hist.length ? hist.join("\n")+"\n" : "") + "User: " + text;
      url = "https://text.pollinations.ai/"+encodeURIComponent(block)+
            "?model=openai&system="+encodeURIComponent(sys);
      if(url.length <= 7000 || !hist.length) break;
      hist = hist.slice(1);
    }
    const r = await fetch(url, { signal });
    if(!r.ok) throw new Error("ai "+r.status);
    const out = (await r.text()).trim();
    if(!out) throw new Error("empty");
    return out;
  }

  /* ================= send flow (real states only) ================= */
  function sendUser(text){
    text = (text||"").trim();
    if(!text || busy) return;
    pushMsg({ r:"user", x:text });
    requestReply(text);
  }
  async function requestReply(text){
    busy = true; cancelled = false;
    paintBar(); paintLog();
    ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 45000);
    try{
      const reply = await fetchReply(text, ctl.signal);
      pushMsg({ r:"bot", x:reply });
    }catch(e){
      if(!(e && e.name==="AbortError" && cancelled)){
        pushMsg({ r:"err", x:text });
      }
    }finally{
      clearTimeout(to); ctl = null; busy = false;
      paintBar(); paintLog();
    }
  }
  function cancelReq(){
    if(!busy || !ctl) return;
    cancelled = true;
    ctl.abort();
  }
  function retryAt(i){
    const m = CHAT[i];
    if(!m || m.r!=="err" || busy) return;
    CHAT.splice(i,1); saveChat();
    requestReply(m.x);
  }

  /* ================= rendering ================= */
  function $(id){ return document.getElementById(id); }

  function paintLog(){
    const log = $("chat-log");
    if(!log) return;
    log.innerHTML = "";
    loadChat().forEach((m, i) => {
      if(m.r === "err"){ log.appendChild(errBubble(m, i)); return; }
      const d = UI.el("div", "msg "+(m.r==="user" ? "me" : "bot"));
      const b = UI.el("div", "bubble");
      b.style.whiteSpace = "pre-wrap";
      b.textContent = m.x;
      d.appendChild(b);
      log.appendChild(d);
    });
    if(busy){
      const d = UI.el("div", "msg bot");
      const b = UI.el("div", "bubble");
      const em = UI.el("i", "", UI.esc(t("coachThinking")));
      b.appendChild(em);
      d.appendChild(b);
      log.appendChild(d);
    }
    if(screenEl) screenEl.scrollTop = screenEl.scrollHeight;
  }
  function errBubble(m, i){
    const d = UI.el("div", "msg bot");
    const b = UI.el("div", "bubble");
    const p = UI.el("p", "", UI.esc(t("coachErr")));
    p.style.margin = "0 0 .6rem";
    b.appendChild(p);
    const rb = UI.btn(t("retry"), { kind:"lime", block:false });
    rb.classList.add("btn-sm");
    rb.addEventListener("click", () => retryAt(i));
    b.appendChild(rb);
    d.appendChild(b);
    return d;
  }
  function paintBar(){
    const send = $("chat-send"), cancel = $("chat-cancel"), inp = $("chat-in");
    const chips = $("chat-chips");
    if(send) send.disabled = busy;
    if(cancel) cancel.style.display = busy ? "" : "none";
    if(inp) inp.disabled = busy;
    if(chips) chips.querySelectorAll("button").forEach(b => { b.disabled = busy; });
  }

  function workoutCard(){
    const p = S.getProfile() || {};
    const w = todayWorkout(buildPlan(p));
    const card = UI.card("plan-card");
    const head = UI.el("div", "meal-head");
    head.innerHTML = `<b>${UI.esc(t("todayWorkout"))}</b>`;
    card.appendChild(head);
    const isRest = w.key === "rest" || !w.mins;
    const line = UI.el("p", "muted");
    line.style.margin = "0";
    line.textContent = isRest ? t("restDay") : t(w.key)+" · "+t("minutes",{n:w.mins});
    card.appendChild(line);
    if(!isRest && window.F1T_WORKOUT && typeof F1T_WORKOUT.open === "function"){
      const b = UI.btn(t("startWorkout"), { kind:"lime", block:false });
      b.classList.add("btn-sm");
      b.style.marginTop = ".6rem";
      b.addEventListener("click", () => F1T_WORKOUT.open());
      card.appendChild(b);
    }
    return card;
  }

  function paintRpe(slot){
    slot.innerHTML = "";
    if(!needsRpe()) return;
    const card = UI.card("plan-card");
    card.appendChild(UI.el("b", "", UI.esc(t("rpeAsk"))));
    const seg = UI.seg([
      { v:"easy", t:t("rpeEasy") },
      { v:"ok",   t:t("rpeOk") },
      { v:"hard", t:t("rpeHard") }
    ], null, v => {
      saveRpe(v);
      slot.innerHTML = "";
      UI.toast(t("rpeThanks"));
    });
    seg.style.marginTop = ".6rem";
    card.appendChild(seg);
    slot.appendChild(card);
  }

  function paintChips(box){
    box.innerHTML = "";
    const p = S.getProfile() || {};
    const d = S.getDay(S.todayKey());
    const w = todayWorkout(buildPlan(p));
    const n = buildPlan(p).nutrition;
    const defs = [];
    if(w.key === "rest" || !w.mins){
      defs.push({ label:t("chipEnergy"), prompt:t("chipEnergyP") });
    }else{
      defs.push({ label:t("chipWorkout"), prompt:t("chipWorkoutP") });
    }
    if((d.kcal||0) > 0 && (d.p||0) < n.protein*0.5){
      defs.push({ label:t("chipMeals"), prompt:t("chipProteinP",{ n:Math.max(0, n.protein-Math.round(d.p||0)) }) });
    }else{
      defs.push({ label:t("chipMeals"), prompt:t("chipMealsP") });
    }
    defs.push({ label:t("chipForm"), prompt:t("chipFormP") });
    defs.forEach(c => {
      const b = UI.el("button", "chip", UI.esc(c.label));
      b.addEventListener("click", () => sendUser(c.prompt));
      box.appendChild(b);
    });
  }

  function render(sc){
    loadChat();
    screenEl = sc;
    sc.innerHTML = "";

    const prow = UI.el("div");
    prow.id = "persona-row";
    sc.appendChild(prow);
    if(window.F1T_SCORE) F1T_SCORE.paintPersonas();

    sc.appendChild(workoutCard());

    const rpeSlot = UI.el("div");
    rpeSlot.id = "rpe-slot";
    sc.appendChild(rpeSlot);
    paintRpe(rpeSlot);

    const log = UI.el("div", "chat");
    log.id = "chat-log";
    sc.appendChild(log);

    const chips = UI.el("div", "chips");
    chips.id = "chat-chips";
    sc.appendChild(chips);
    paintChips(chips);

    const bar = UI.el("div", "chatbar");
    const inp = UI.el("input", "inp");
    inp.id = "chat-in";
    inp.placeholder = t("askCoach");
    inp.setAttribute("autocomplete", "off");
    inp.setAttribute("aria-label", t("askCoach"));
    const send = UI.el("button", "btn btn-lime btn-sm", UI.esc(t("send")));
    send.id = "chat-send";
    const cancel = UI.el("button", "btn btn-ghost btn-sm", UI.esc(t("cancel")));
    cancel.id = "chat-cancel";
    cancel.style.display = "none";
    bar.appendChild(inp); bar.appendChild(send); bar.appendChild(cancel);
    sc.appendChild(bar);

    const disc = UI.el("div", "disclaimer", UI.esc(t("chatDisclaimer")));
    sc.appendChild(disc);

    const doSend = () => { const v = inp.value.trim(); if(!v) return; inp.value = ""; sendUser(v); };
    send.addEventListener("click", doSend);
    inp.addEventListener("keydown", e => { if(e.key === "Enter") doSend(); });
    cancel.addEventListener("click", cancelReq);

    if(!CHAT.length){
      CHAT.push({ r:"bot", x:t("coachWelcome") });
      saveChat();
    }
    paintLog();
    paintBar();
  }

  return { render, plan: buildPlan, today: todayWorkout };
})();
