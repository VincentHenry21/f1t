/* ============ F1T · Firebase (Auth + Firestore) ============
   Project: summit-academy-b8968 (shared). Collections: f1t_users, f1t_days.
   Works offline-first: localStorage is the source of truth, Firestore syncs when signed in. */
window.F1TFB = (() => {
  const config = {
    apiKey: "AIzaSyC5UfJnl5ygcUSeQihGdQfXOBscocYs8_w",
    authDomain: "summit-academy-b8968.firebaseapp.com",
    projectId: "summit-academy-b8968",
    storageBucket: "summit-academy-b8968.firebasestorage.app",
    messagingSenderId: "532362317311",
    appId: "1:532362317311:web:2d391346ec89a5215cebca"
  };
  let app=null, auth=null, db=null, ok=false, uid=null;
  try{
    if (typeof firebase !== "undefined"){
      app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
      auth = firebase.auth(); db = firebase.firestore(); ok = true;
    }
  }catch(e){ ok=false; }

  function onAuth(cb){ if(ok) auth.onAuthStateChanged(u=>{ uid = u?u.uid:null; cb(u); }); else cb(null); }
  async function signUp(email,pass,name){
    const c = await auth.createUserWithEmailAndPassword(email,pass);
    if (name) await c.user.updateProfile({displayName:name});
    return c.user;
  }
  async function signIn(email,pass){ const c = await auth.signInWithEmailAndPassword(email,pass); return c.user; }
  async function google(){
    const p = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithRedirect(p); // returns after redirect via redirectResult()
  }
  async function redirectResult(){
    if(!ok) return null;
    const r = await auth.getRedirectResult();
    return (r && r.user) ? r.user : null;
  }
  async function signOut(){ if(ok) await auth.signOut(); uid=null; }

  /* ---- profile ---- */
  async function saveProfile(p){
    try{ localStorage.setItem("f1t_profile", JSON.stringify(p)); }catch(e){}
    if (ok && uid){ try{ await db.collection("f1t_users").doc(uid).set(p,{merge:true}); }catch(e){} }
  }
  function loadProfile(){
    try{ const p = JSON.parse(localStorage.getItem("f1t_profile")||"null"); if(p) return p; }catch(e){}
    return null;
  }
  async function pullProfile(){
    if (ok && uid){ try{ const s = await db.collection("f1t_users").doc(uid).get(); if(s.exists) return s.data(); }catch(e){} }
    return null;
  }

  /* ---- day logs ---- */
  function dayKeyLocal(dateKey){ return "f1t_day_"+dateKey; }
  function blankDay(){ return {kcal:0,p:0,c:0,f:0,water:0,steps:0,meals:{breakfast:[],lunch:[],dinner:[],snacks:[]},exercise:0}; }
  function loadDay(dateKey){
    try{ const d = JSON.parse(localStorage.getItem(dayKeyLocal(dateKey))||"null"); if(d) return d; }catch(e){}
    return blankDay();
  }
  async function saveDay(dateKey, day){
    try{ localStorage.setItem(dayKeyLocal(dateKey), JSON.stringify(day)); }catch(e){}
    if (ok && uid){ try{ await db.collection("f1t_days").doc(uid+"_"+dateKey).set(Object.assign({uid},day),{merge:true}); }catch(e){} }
  }
  async function pullDay(dateKey){
    if (ok && uid){ try{ const s = await db.collection("f1t_days").doc(uid+"_"+dateKey).get(); if(s.exists) return s.data(); }catch(e){} }
    return null;
  }
  async function pullHealth(dateKey){
    if (ok){ try{ const s = await db.collection("f1t_health").doc(dateKey).get(); if(s.exists) return s.data(); }catch(e){} }
    return null;
  }
  /* ---- realtime ---- */
  function subDay(dateKey, cb){
    if(!ok||!uid) return ()=>{};
    try{ return db.collection("f1t_days").doc(uid+"_"+dateKey).onSnapshot(s=>{ if(s.exists){ try{cb(s.data());}catch(e){} } },()=>{}); }
    catch(e){ return ()=>{}; }
  }
  function subProfile(cb){
    if(!ok||!uid) return ()=>{};
    try{ return db.collection("f1t_users").doc(uid).onSnapshot(s=>{ if(s.exists){ try{cb(s.data());}catch(e){} } },()=>{}); }
    catch(e){ return ()=>{}; }
  }

  return { get ready(){return ok;}, get uid(){return uid;},
    onAuth, signUp, signIn, google, redirectResult, signOut,
    saveProfile, loadProfile, pullProfile, loadDay, saveDay, pullDay, pullHealth, blankDay,
    subDay, subProfile };
})();
