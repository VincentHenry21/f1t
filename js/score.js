/* ============ F1T v12 · Score ============
   Coach personas (all free), scoreboard (real database), streak helpers.
   Ported from the v10 free-features module, adapted to the v12 store/UI. */
window.F1T_SCORE = (() => {
  "use strict";
  const S = window.F1T_STORE, UI = window.F1T_UI;
  const t = k => window.F1T_t(k);

  /* ---------- personas ---------- */
  function persona(){ return S.getPref("coach_persona", "coach"); }
  function setPersona(v){ S.setPref("coach_persona", v); }
  function sysFor(per){
    const base = " inside the F1T calorie tracker app. Use metric units. Never diagnose medical conditions; suggest a professional for health concerns. ";
    if(per==="pro") return "You are F1T Pro Coach, an elite strength-and-conditioning coach"+base+
      "You write like a world-class coach: precise, structured, periodized. Give sets x reps x load, rest times, and progression rules. Reference the user's logged data when relevant. Replies can be detailed (up to 220 words) with clear formatting. Push for progressive overload and consistency. ";
    if(per==="nutri") return "You are F1T Nutritionist, a sports nutrition specialist"+base+
      "You give practical meal structure, protein targets per meal, pre/post-workout fueling, and hydration guidance. Reference Myanmar foods from the app's database when helpful. Clear structure, up to 200 words. ";
    return "You are F1T Coach, an expert fitness and nutrition coach"+base+
      "Reply concisely (under 120 words unless asked for detail), practical and encouraging. ";
  }
  function paintPersonas(){
    const slot = document.getElementById("persona-row");
    if(!slot) return;
    const cur = persona();
    const defs = [["coach","personaCoach"],["pro","personaPro"],["nutri","personaNutri"]];
    slot.innerHTML = `<span class="pp-lab">${UI.esc(t("coachPersona"))}</span>` + defs.map(d =>
      `<button class="pp${cur===d[0]?" on":""}" data-pp="${d[0]}">${UI.esc(t(d[1]))}</button>`).join("");
    slot.querySelectorAll("[data-pp]").forEach(b => b.addEventListener("click", () => {
      setPersona(b.dataset.pp); paintPersonas();
    }));
  }

  /* ---------- streak (from real logs) ---------- */
  function dayActive(key){
    const day = S.getDay(key);
    if(day && day.kcal>0) return true;
    return S.getWorkouts().some(w => S.todayKey(new Date(w.ts))===key);
  }
  function calcStreak(){
    let s = 0;
    const now = new Date();
    for(let i=0;i<60;i++){
      const d = new Date(now); d.setDate(d.getDate()-i);
      if(dayActive(S.todayKey(d))) s++; else break;
    }
    const b = S.read("f1t_streak_bonus", null);
    if(b && Date.now()<b.until) s += b.days;
    return s;
  }
  function streakPeak(){
    let p = S.read("f1t_streak_peak", 0) || 0;
    const s = calcStreak();
    if(s>p){ p=s; S.write("f1t_streak_peak", p); }
    return p;
  }
  function canRestore(){ return Date.now()-(S.read("f1t_restore_at",0)||0) > 7*864e5; }
  function doRestore(){
    if(streakPeak()<2) return false;
    S.write("f1t_streak_bonus", { days:streakPeak(), until:Date.now()+7*864e5 });
    S.write("f1t_restore_at", Date.now());
    return true;
  }

  /* ---------- scoreboard ---------- */
  function guestId(){
    let id = S.read("f1t_gid", null);
    if(!id){ id = "g"+Date.now().toString(36)+Math.random().toString(36).slice(2,7); S.write("f1t_gid", id); }
    return id;
  }
  function bumpStreak(){ S.getDay(S.todayKey()); streakPeak(); S.emit("streak"); }
  function powerScore(){
    let wos=0, vol=0;
    const cut = Date.now()-30*864e5;
    S.getWorkouts().forEach(w => {
      if(w.ts && w.ts>=cut){ wos++;
        (w.exercises||[]).forEach(ex => (ex.sets||[]).forEach(s => { vol += (s.kg||0)*(s.reps||0); }));
      }
    });
    return Math.round(wos*500 + vol/20 + calcStreak()*100);
  }
  async function openScoreboard(){
    const { body, close } = UI.sheet((b) => {
      b.appendChild(UI.el("h3", "", `${t("scoreboard")}`));
      b.appendChild(UI.el("p", "muted small", `${t("powerScore")} · 30 ${t("days")}`));
      b.appendChild(UI.loading(t("boardSync")));
    });
    try{
      const p = S.getProfile() || {};
      const entry = {
        id:(window.F1TFB&&window.F1TFB.uid)||guestId(),
        name:String(p.name||t("guest")).slice(0,24),
        color:p.color||0, score:powerScore(), streak:calcStreak(), ts:Date.now()
      };
      if(window.F1TFB) await window.F1TFB.boardSet(entry);
      const rows = window.F1TFB ? await window.F1TFB.boardTop(50) : [];
      body.innerHTML = "";
      body.appendChild(UI.el("h3", "", t("scoreboard")));
      if(!rows.length){ body.appendChild(UI.empty(t("noBoard"))); return; }
      const medal = ["🥇","🥈","🥉"];
      rows.forEach((r,i) => {
        const row = UI.el("div", "board-row"+(r.id===entry.id?" me":""));
        row.innerHTML = `<span class="b-rank">${medal[i]||(i+1)}</span>
          <span class="b-av" style="background:hsl(${(r.color||0)*72},60%,38%)">${UI.esc((r.name||"A")[0].toUpperCase())}</span>
          <span class="b-name">${UI.esc(r.name||t("guest"))}</span>
          <span class="b-st">🔥${r.streak||0}</span>
          <b class="b-score">${(r.score||0).toLocaleString()}</b>`;
        body.appendChild(row);
      });
    }catch(e){
      body.innerHTML = "";
      body.appendChild(UI.el("h3", "", t("scoreboard")));
      body.appendChild(UI.errorBox(t("loadError"), null, t("retry"), ()=>{ close(); openScoreboard(); }));
    }
  }

  return { persona, setPersona, sysFor, paintPersonas,
    calcStreak, streakPeak, canRestore, doRestore, bumpStreak,
    powerScore, openScoreboard };
})();
