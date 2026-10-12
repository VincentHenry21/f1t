/* ============ F1T v12 · Workout tracker ============
   Real sessions: exercise search, count-up timer, 45s rest countdown,
   kg/reps set logging, pause/resume, persistence, history, MET kcal. */
window.F1T_WORKOUT = (() => {
  "use strict";
  const S = window.F1T_STORE, UI = window.F1T_UI;
  const t = k => window.F1T_t(k);
  const EX = () => (window.F1T_DATA && F1T_DATA.EXERCISES) || [];
  const lang = () => S.getPref("lang","en");
  const exName = e => lang()==="my" && e.my ? e.my : e.en;

  let ses = null;       // live session
  let tickIv = null;    // count-up
  let restIv = null;    // rest countdown

  const fmtT = s => `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor(s/60)%60).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  /* ---------- open: exercise picker ---------- */
  function open(){
    UI.sheet((body, close) => {
      body.classList.add("sheet-full");
      body.innerHTML = `<h3>${UI.esc(t("startWorkout"))}</h3>
        <div class="searchrow"><input class="inp" id="wo-q" placeholder="${UI.esc(t("searchExercises"))}" aria-label="${UI.esc(t("searchExercises"))}"></div>
        <div class="chips" id="wo-f"></div>
        <div id="wo-list"></div>
        <div class="sheet-actions"><button class="btn btn-lime btn-block" id="wo-start" disabled>${UI.esc(t("startPlan"))}</button></div>`;
      const list = body.querySelector("#wo-list"), q = body.querySelector("#wo-q"), f = body.querySelector("#wo-f");
      const chosen = [];
      const groups = ["all"].concat(F1T_DATA.MUSCLES || []);
      let fg = "all";
      groups.forEach(g=>{
        const c = UI.el("button","chip"+(g==="all"?" on":""), g==="all"?t("rng_all"):g);
        c.addEventListener("click",()=>{ fg=g; f.querySelectorAll(".chip").forEach(x=>x.classList.remove("on")); c.classList.add("on"); paint(); });
        f.appendChild(c);
      });
      function paint(){
        const qv = q.value.trim().toLowerCase();
        list.innerHTML = "";
        EX().filter(e=>(fg==="all"||e.m===fg) && (!qv || e.en.toLowerCase().includes(qv) || (e.my||"").includes(q.value.trim())))
          .forEach(e=>{
            const row = UI.el("button","menu-row");
            row.innerHTML = `<span class="chev">+</span><span style="flex:1">${UI.esc(exName(e))}</span><small class="muted">${UI.esc(e.m)}</small>`;
            row.addEventListener("click",()=>{
              if(!chosen.find(x=>x.id===e.id)) chosen.push({id:e.id, sets:[]});
              UI.toast(exName(e)+" ✓");
              body.querySelector("#wo-start").disabled = false;
            });
            list.appendChild(row);
          });
        if(!list.children.length) list.appendChild(UI.empty(t("noResults"), "dumbbell"));
      }
      q.addEventListener("input", paint); paint();
      body.querySelector("#wo-start").addEventListener("click",()=>{ close(); startSession(chosen); });
    });
  }

  /* ---------- live session ---------- */
  function startSession(picked){
    const exs = picked.length ? picked : [{id:EX()[0].id, sets:[]}];
    ses = { start:Date.now(), paused:0, pausedAt:null, elapsed:0, exIdx:0, exercises:exs, restLeft:0 };
    render();
    tickIv = setInterval(()=>{
      if(ses && !ses.pausedAt){ ses.elapsed = Math.floor((Date.now()-ses.start-ses.paused)/1000); paintTimer(); }
    }, 1000);
  }
  function ex(){ return ses.exercises[ses.exIdx]; }
  function exDef(id){ return EX().find(e=>e.id===id); }

  function render(){
    const sc = document.getElementById("screen");
    sc.innerHTML = "";
    const w = UI.el("div","wo-live");
    w.innerHTML = `
      <div class="wo-top"><button class="ico-btn" id="wo-back" aria-label="${UI.esc(t("back"))}">${window.f1tIcon("back",20)}</button>
        <div class="timer" id="wo-timer">00:00:00</div>
        <button class="btn btn-sm btn-ghost" id="wo-pause">${UI.esc(t("pause"))}</button></div>
      <div class="chips" id="wo-tabs"></div>
      <h2 id="wo-exname"></h2>
      <div id="wo-sets"></div>
      <div class="row-2">
        <button class="btn btn-ghost" id="wo-prev">‹</button>
        <button class="btn btn-ghost" id="wo-next">›</button>
      </div>
      <div class="rest" id="wo-rest" hidden>
        <div class="rest-ring"><svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="30" fill="none" stroke="var(--line-2)" stroke-width="6"/><circle id="wo-rest-arc" cx="36" cy="36" r="30" fill="none" stroke="var(--lime)" stroke-width="6" stroke-linecap="round" stroke-dasharray="188.5" stroke-dashoffset="0" transform="rotate(-90 36 36)"/></svg><b id="wo-rest-n">45</b></div>
        <p class="muted">${UI.esc(t("rest"))}</p>
        <button class="btn btn-sm btn-ghost" id="wo-rest-skip">${UI.esc(t("skip"))}</button>
      </div>
      <div class="sheet-actions">
        <button class="btn btn-ghost btn-block" id="wo-discard">${UI.esc(t("discardWorkout"))}</button>
        <button class="btn btn-lime btn-block" id="wo-finish">${UI.esc(t("finishWorkout"))}</button>
      </div>`;
    sc.appendChild(w);
    const tabs = w.querySelector("#wo-tabs");
    ses.exercises.forEach((e,i)=>{
      const c = UI.el("button","chip"+(i===ses.exIdx?" on":""), exName(exDef(e.id)));
      c.addEventListener("click",()=>{ ses.exIdx=i; render(); });
      tabs.appendChild(c);
    });
    w.querySelector("#wo-exname").textContent = exName(exDef(ex().id));
    w.querySelector("#wo-back").addEventListener("click",()=>window.F1T_APP.go("home"));
    w.querySelector("#wo-pause").addEventListener("click",e=>{
      if(ses.pausedAt){ ses.paused += Date.now()-ses.pausedAt; ses.pausedAt=null; e.target.textContent=t("pause"); }
      else { ses.pausedAt=Date.now(); e.target.textContent=t("resume"); }
    });
    w.querySelector("#wo-prev").addEventListener("click",()=>{ if(ses.exIdx>0){ ses.exIdx--; render(); }});
    w.querySelector("#wo-next").addEventListener("click",()=>{
      if(ses.exIdx<ses.exercises.length-1){ ses.exIdx++; render(); }
      else addExerciseToSession();
    });
    w.querySelector("#wo-rest-skip").addEventListener("click",stopRest);
    w.querySelector("#wo-discard").addEventListener("click",()=>{
      UI.confirmDlg(t("discardWorkout"), t("discardSub"), t("discardWorkout"), ()=>{ endTimers(); ses=null; window.F1T_APP.go("home"); });
    });
    w.querySelector("#wo-finish").addEventListener("click",finish);
    paintSets(); paintTimer();
  }
  function paintTimer(){ const n=document.getElementById("wo-timer"); if(n&&ses) n.textContent=fmtT(ses.elapsed); }

  function paintSets(){
    const box = document.getElementById("wo-sets"); if(!box) return;
    const e = ex(), def = exDef(e.id);
    box.innerHTML = "";
    e.sets.forEach((s,i)=>{
      const r = UI.el("div","set-row");
      r.innerHTML = `<span class="set-num">${i+1}</span>
        <input class="inp" type="number" inputmode="decimal" value="${s.kg}" aria-label="kg">
        <span class="muted">kg</span>
        <input class="inp" type="number" inputmode="numeric" value="${s.reps||s.secs||""}" aria-label="reps">
        <span class="muted">${def.dur?"sec":t("reps")}</span>
        <button class="btn btn-sm ${s.done?"btn-lime":"btn-ghost"}" ${s.done?"disabled":""}>${s.done?"✓":"✓"}</button>`;
      const [kgI, rpI] = r.querySelectorAll("input");
      kgI.addEventListener("change",()=>{ s.kg=parseFloat(kgI.value)||0; });
      rpI.addEventListener("change",()=>{ def.dur ? s.secs=parseInt(rpI.value)||0 : s.reps=parseInt(rpI.value)||0; });
      const doneB = r.querySelector("button");
      doneB.addEventListener("click",()=>{ s.done=true; startRest(); paintSets(); });
      box.appendChild(r);
    });
    const add = UI.btn(t("addSet"), { kind:"ghost" });
    add.addEventListener("click",()=>{
      const last = e.sets[e.sets.length-1];
      e.sets.push({ kg:last?last.kg:0, reps:def.dur?0:(last?last.reps:10), secs:def.dur?(last?last.secs:60):0, done:false });
      paintSets();
    });
    box.appendChild(add);
  }

  /* ---------- rest timer: real 45s countdown ---------- */
  function startRest(){
    stopRest();
    const box = document.getElementById("wo-rest"); if(!box) return;
    box.hidden = false; ses.restLeft = 45;
    const arc = document.getElementById("wo-rest-arc"), n = document.getElementById("wo-rest-n");
    restIv = setInterval(()=>{
      ses.restLeft--;
      if(n) n.textContent = ses.restLeft;
      if(arc) arc.style.strokeDashoffset = String(188.5*(1-ses.restLeft/45));
      if(ses.restLeft<=0){ stopRest(); try{ navigator.vibrate && navigator.vibrate(200); }catch(e){} UI.toast(t("restDone")); }
    }, 1000);
  }
  function stopRest(){
    if(restIv){ clearInterval(restIv); restIv=null; }
    const box = document.getElementById("wo-rest"); if(box) box.hidden = true;
  }
  function endTimers(){ if(tickIv){clearInterval(tickIv);tickIv=null;} stopRest(); }

  function addExerciseToSession(){
    UI.sheet((body,close)=>{
      body.appendChild(UI.el("h3","",t("addExercises")));
      EX().forEach(e=>{
        if(ses.exercises.find(x=>x.id===e.id)) return;
        const r = UI.el("button","menu-row",`<span style="flex:1">${UI.esc(exName(e))}</span><small class="muted">${UI.esc(e.m)}</small>`);
        r.addEventListener("click",()=>{ ses.exercises.push({id:e.id,sets:[]}); ses.exIdx=ses.exercises.length-1; close(); render(); });
        body.appendChild(r);
      });
    });
  }

  function finish(){
    endTimers();
    const w = (S.getProfile()||{}).w || 70;
    let vol = 0, secs = ses.elapsed, kcal = 0;
    ses.exercises.forEach(e=>{
      const def = exDef(e.id);
      let exSecs = 0;
      e.sets.forEach(s=>{
        if(!s.done) return;
        vol += (s.kg||0)*(s.reps||0);
        exSecs += def.dur ? (s.secs||0) : 45;
      });
      kcal += def.met * w * (exSecs/3600);
    });
    const done = ses.exercises.filter(e=>e.sets.some(s=>s.done)).length;
    const rec = { id:"wo"+Date.now(), ts:Date.now(), dur:secs,
      exercises:ses.exercises, kcal:Math.round(kcal), vol:Math.round(vol), sets:ses.exercises.reduce((a,e)=>a+e.sets.filter(s=>s.done).length,0) };
    S.addWorkout(rec);
    ses = null;
    const sc = document.getElementById("screen");
    sc.innerHTML = "";
    const done_ = UI.el("div","done-hero");
    done_.innerHTML = `<div class="done-mark">✓</div><h2>${UI.esc(t("workoutSaved"))}</h2>
      <div class="stat-grid">
        <div class="stat"><small>${UI.esc(t("totalTime"))}</small><b>${fmtT(secs)}</b></div>
        <div class="stat"><small>${UI.esc(t("totalVolume"))}</small><b>${Math.round(vol).toLocaleString()} kg</b></div>
        <div class="stat"><small>${UI.esc(t("kcal"))}</small><b>${Math.round(kcal)}</b></div>
        <div class="stat"><small>${UI.esc(t("exercises"))}</small><b>${done}</b></div>
      </div>`;
    sc.appendChild(done_);
    const back = UI.btn(t("done"), { kind:"lime" });
    back.addEventListener("click",()=>window.F1T_APP.go("home"));
    sc.appendChild(back);
    window.F1T_SCORE.bumpStreak();
    if(window.F1T_COACH) UI.toast(t("rpeAsk"));
  }

  /* ---------- history ---------- */
  function renderHistory(el){
    const list = S.getWorkouts();
    if(!list.length){ el.appendChild(UI.empty(t("noWorkouts"), "dumbbell")); return; }
    list.slice(0,12).forEach(w=>{
      const d = new Date(w.ts);
      const row = UI.el("div","meal-item");
      row.innerHTML = `<div class="tx"><b>${d.toLocaleDateString()} · ${fmtT(w.dur||0)}</b>
        <small>${w.exercises.length} ${UI.esc(t("exercises"))} · ${Math.round(w.kcal||0)} ${UI.esc(t("kcal"))} · ${(w.vol||0).toLocaleString()} kg</small></div>`;
      el.appendChild(row);
    });
  }

  return { open, renderHistory };
})();
