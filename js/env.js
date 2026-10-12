/* F1T Environment engine · real-time weather + adaptive workout/eating recommendations + smart reminders
   Weather: Open-Meteo (no key). Reverse geocode: BigDataCloud client API (no key). */
window.F1T_ENV = (function(){
  const GEO_KEY="f1t_geo", WX_KEY="f1t_wx";

  /* device location, cached 24h */
  function getLocation(force){
    if(!force){
      try{ const c=JSON.parse(localStorage.getItem(GEO_KEY)||"null");
        if(c && Date.now()-c.ts<24*3600e3) return Promise.resolve(c); }catch(e){}
    }
    return new Promise(res=>{
      if(!navigator.geolocation || !navigator.geolocation.getCurrentPosition) return res(null);
      let done=false;
      const to=setTimeout(()=>{ if(!done){ done=true; res(null); } }, 9000);
      navigator.geolocation.getCurrentPosition(
        p=>{ if(done) return; done=true; clearTimeout(to);
          const c={lat:p.coords.latitude, lon:p.coords.longitude, ts:Date.now()};
          try{ localStorage.setItem(GEO_KEY, JSON.stringify(c)); }catch(e){}
          res(c); },
        ()=>{ if(done) return; done=true; clearTimeout(to); res(null); },
        {timeout:8000, maximumAge:3600000});
    });
  }

  /* current weather, cached 30 min */
  async function getWeather(lat, lon){
    try{ const c=JSON.parse(localStorage.getItem(WX_KEY)||"null");
      if(c && Date.now()-c.ts<30*60e3 && Math.abs(c.lat-lat)<.05 && Math.abs(c.lon-lon)<.05) return c.wx;
    }catch(e){}
    try{
      const u="https://api.open-meteo.com/v1/forecast?latitude="+lat.toFixed(3)
        +"&longitude="+lon.toFixed(3)
        +"&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto";
      const r=await fetch(u);
      if(!r.ok) return null;
      const j=await r.json();
      if(!j || !j.current) return null;
      try{ localStorage.setItem(WX_KEY, JSON.stringify({lat, lon, ts:Date.now(), wx:j.current})); }catch(e){}
      return j.current;
    }catch(e){ return null; }
  }

  async function placeName(lat, lon){
    try{
      const r=await fetch("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude="+lat
        +"&longitude="+lon+"&localityLanguage=en");
      if(!r.ok) return "";
      const j=await r.json();
      return j.city || j.locality || "";
    }catch(e){ return ""; }
  }

  /* WMO weather codes -> condition key */
  function conditionOf(code){
    if(code===0) return "clear";
    if(code===1 || code===2) return "pcloudy";
    if(code===3) return "cloudy";
    if(code===45 || code===48) return "fog";
    if(code>=51 && code<=57) return "drizzle";
    if((code>=61 && code<=67) || (code>=80 && code<=82)) return "rain";
    if(code>=95) return "storm";
    return "cloudy";
  }
  function condIcon(cond){
    return {clear:"sun", pcloudy:"cloudSun", cloudy:"cloud", fog:"cloud",
      drizzle:"cloudRain", rain:"cloudRain", storm:"cloudBolt"}[cond] || "cloud";
  }

  /* recommendations from weather + bpm + body */
  function buildRecs(wx, bpm, body){
    const recs={workout:[], eat:[], flags:{}};
    if(!wx) return recs;
    const tp=wx.temperature_2m, feels=wx.apparent_temperature, hum=wx.relative_humidity_2m;
    const cond=conditionOf(wx.weather_code), F=recs.flags;
    F.hot   = (feels!=null?feels:tp) >= 34 || tp >= 33;
    F.cold  = tp <= 15;
    F.rain  = cond==="rain" || cond==="storm" || cond==="drizzle";
    F.humid = hum != null && hum >= 80;
    F.calm  = !F.hot && !F.cold && !F.rain && (cond==="clear" || cond==="pcloudy");

    if(F.rain)      recs.workout.push("rec_rain_w");
    else if(F.hot)  recs.workout.push("rec_heat_w");
    else if(F.cold) recs.workout.push("rec_cold_w");
    else if(F.calm) recs.workout.push("rec_calm_w");
    if(F.humid) recs.workout.push("rec_humid_w");

    if(F.hot)       recs.eat.push("rec_heat_e");
    else if(F.cold) recs.eat.push("rec_cold_e");
    else            recs.eat.push("rec_calm_e");

    if(bpm){
      if(bpm>=90)      recs.workout.push("rec_bpmHigh_w");
      else if(bpm<=60) recs.workout.push("rec_bpmLow_w");
    }
    /* body-aware intensity nudge */
    if(body && body.bmi){
      if(body.bmi>=30) recs.workout.push("rec_bodyLow_w");
      else if(body.bmi<18.5) recs.eat.push("rec_bodyGain_e");
    }
    return recs;
  }

  /* smart reminders -> [{icon,key}] ; ctx:{wx,waterMl,waterTarget,hadWorkout} */
  function checkReminders(ctx){
    const out=[];
    const hour=new Date().getHours();
    const wx=ctx.wx;
    const hot=wx && ((wx.apparent_temperature!=null?wx.apparent_temperature:wx.temperature_2m) >= 34
      || wx.temperature_2m >= 33);
    if(hot && ctx.waterMl < ctx.waterTarget*0.6)
      out.push({icon:"droplet", key:"rem_waterHot"});
    else if(hour>=15 && ctx.waterMl < 1000)
      out.push({icon:"droplet", key:"rem_water"});
    if(ctx.hadWorkout && ctx.waterMl < ctx.waterTarget*0.5)
      out.push({icon:"droplet", key:"rem_postWorkout"});
    return out;
  }

  return { getLocation, getWeather, placeName, conditionOf, condIcon, buildRecs, checkReminders };
})();
