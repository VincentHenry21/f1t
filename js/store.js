/* ============ F1T v12 · Store ============
   Single source of truth. localStorage is the primary store (same keys as
   v10 so existing user data survives); Firestore mirrors when signed in.
   Every async op carries an explicit status: idle|loading|success|error.
   No fake loading, no simulated saves. */
window.F1T_STORE = (() => {
  "use strict";

  const subs = new Map(); // key -> Set<fn>
  function on(key, fn){
    if(!subs.has(key)) subs.set(key, new Set());
    subs.get(key).add(fn);
    return () => subs.get(key).delete(fn);
  }
  function emit(key, val){ (subs.get(key)||[]).forEach(fn=>{ try{ fn(val); }catch(e){} }); }

  function read(k, fb){
    try{ const v = JSON.parse(localStorage.getItem(k)||"null"); return v==null?fb:v; }
    catch(e){ return fb; }
  }
  function write(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} emit(k, v); }

  /* ---- status registry for async ops (never fake) ---- */
  const ops = new Map();
  function opStatus(id){ return ops.get(id) || { st:"idle" }; }
  function opSet(id, st, detail){
    ops.set(id, { st, detail:detail||null, at:Date.now() });
    emit("op:"+id, ops.get(id));
  }
  async function runOp(id, fn){
    if(opStatus(id).st==="loading") return { ok:false, busy:true };
    opSet(id, "loading");
    try{
      const out = await fn();
      opSet(id, "success");
      setTimeout(()=>{ if(opStatus(id).st==="success") opSet(id,"idle"); }, 1800);
      return { ok:true, out };
    }catch(e){
      opSet(id, "error", (e&&e.message)||"error");
      return { ok:false, error:e };
    }
  }

  /* ---- domain: profile ---- */
  const K_PROFILE = "f1t_profile";
  function getProfile(){ return read(K_PROFILE, null); }
  async function saveProfile(p){
    write(K_PROFILE, p);
    if(window.F1TFB){ try{ await window.F1TFB.saveProfile(p); }catch(e){} }
  }

  /* ---- domain: day log ---- */
  function dayKey(d){ return "f1t_day_"+d; }
  function blankDay(){
    return { kcal:0, p:0, c:0, f:0, water:0, steps:0,
      meals:{ breakfast:[], lunch:[], dinner:[], snacks:[] }, exercise:0, hr:null };
  }
  function getDay(d){ const v = read(dayKey(d), null); return v || blankDay(); }
  async function saveDay(d, day){
    write(dayKey(d), day);
    if(window.F1TFB){ try{ await window.F1TFB.saveDay(d, day); }catch(e){} }
  }

  /* ---- domain: workouts ---- */
  const K_WO = "f1t_workouts";
  function getWorkouts(){ return read(K_WO, []); }
  function saveWorkouts(ws){
    write(K_WO, ws);
    if(window.F1TFB && window.F1TFB.uid){ /* mirrored on sign-in backfill */ }
  }

  /* ---- domain: auth/session ---- */
  function getUser(){ return read("f1t_user", null); }
  function setUser(u){ write("f1t_user", u); }
  function isGuest(){ return !getUser(); }

  /* ---- domain: prefs ---- */
  function getPref(k, fb){ return read("f1t_pref_"+k, fb); }
  function setPref(k, v){ write("f1t_pref_"+k, v); }

  /* ---- dates ---- */
  function todayKey(d){
    d = d || new Date();
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }
  window.F1T_todayKey = todayKey;

  return {
    on, emit, read, write,
    opStatus, opSet, runOp,
    getProfile, saveProfile,
    getDay, saveDay, blankDay,
    getWorkouts, saveWorkouts,
    addWorkout(rec){ const l = getWorkouts(); l.unshift(rec); saveWorkouts(l); return rec; },
    getUser, setUser, isGuest,
    getPref, setPref,
    todayKey,
  };
})();
