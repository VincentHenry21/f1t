/* ============ F1T · food database ============
   kcal per typical serving. p/c/f = protein, carbs, fat grams. */
window.F1T_FOODS = [
  // Myanmar staples
  {id:"mohinga", en:"Mohinga (1 bowl)", my:"မုန့်ဟင်းခါး (၁ ပွဲ)", kcal:350, p:14, c:58, f:6, ic:"bowl", cat:"my"},
  {id:"khaukswe", en:"Khauk Swe Thoke (1 plate)", my:"ခေါက်ဆွဲသုပ် (၁ ပွဲ)", kcal:450, p:12, c:70, f:14, ic:"bowl", cat:"my"},
  {id:"shannoodle", en:"Shan Noodles (1 bowl)", my:"ရှမ်းခေါက်ဆွဲ (၁ ပွဲ)", kcal:480, p:18, c:65, f:16, ic:"bowl", cat:"my"},
  {id:"tealeaf", en:"Tea Leaf Salad (1 plate)", my:"လက်ဖက်သုပ် (၁ ပွဲ)", kcal:220, p:5, c:12, f:18, ic:"salad", cat:"my"},
  {id:"coconutrice", en:"Coconut Rice (1 plate)", my:"အုန်းထမင်း (၁ ပွဲ)", kcal:520, p:10, c:78, f:18, ic:"bowl", cat:"my"},
  {id:"mohinga2", en:"Nan Gyi Thoke (1 plate)", my:"နန်းကြီးသုပ် (၁ ပွဲ)", kcal:430, p:14, c:62, f:14, ic:"bowl", cat:"my"},
  {id:"fishsoup", en:"Fish Soup Rice (1 bowl)", my:"ငါးဟင်းထမင်း (၁ ပွဲ)", kcal:380, p:22, c:52, f:8, ic:"bowl", cat:"my"},
  {id:"paratha", en:"Paratha (1 pc)", my:"ပလာတာ (၁ ချပ်)", kcal:280, p:6, c:36, f:12, ic:"layers", cat:"my"},
  {id:"samosa", en:"Samosa (2 pc)", my:"စမူဆာ (၂ ခု)", kcal:260, p:6, c:28, f:14, ic:"dumpling", cat:"my"},
  {id:"briyani", en:"Chicken Briyani (1 plate)", my:"ဒံပေါက် (၁ ပွဲ)", kcal:650, p:28, c:70, f:26, ic:"bowl", cat:"my"},
  {id:"milktea", en:"Milk Tea (1 cup)", my:"လက်ဖက်ရည် (၁ ခွက်)", kcal:120, p:3, c:16, f:5, ic:"tea", cat:"my"},
  // Rice & mains
  {id:"rice1", en:"Steamed Rice (1 cup)", my:"ထမင်း (၁ ခွက်)", kcal:205, p:4, c:45, f:0, ic:"bowl", cat:"main"},
  {id:"friedrice", en:"Fried Rice (1 plate)", my:"ထမင်းကြော် (၁ ပွဲ)", kcal:550, p:14, c:72, f:22, ic:"bowl", cat:"main"},
  {id:"chickencurry", en:"Chicken Curry + Rice", my:"ကြက်သားဟင်း + ထမင်း", kcal:620, p:32, c:68, f:22, ic:"meat", cat:"main"},
  {id:"porkcurry", en:"Pork Curry + Rice", my:"ဝက်သားဟင်း + ထမင်း", kcal:700, p:28, c:66, f:32, ic:"meat", cat:"main"},
  {id:"eggcurry", en:"Egg Curry + Rice", my:"ကြက်ဥဟင်း + ထမင်း", kcal:520, p:18, c:64, f:20, ic:"egg", cat:"main"},
  {id:"noodlesoup", en:"Noodle Soup (1 bowl)", my:"ခေါက်ဆွဲပြုတ် (၁ ပွဲ)", kcal:380, p:16, c:58, f:9, ic:"bowl", cat:"main"},
  {id:"instantnoodle", en:"Instant Noodles (1 pack)", my:"အသင့်စား ခေါက်ဆွဲ (၁ ထုပ်)", kcal:385, p:8, c:52, f:16, ic:"bowl", cat:"main"},
  // Breakfast
  {id:"eggs2", en:"Boiled Eggs (2)", my:"ကြက်ဥပြုတ် (၂ လုံး)", kcal:155, p:13, c:1, f:11, ic:"egg", cat:"bfast"},
  {id:"toast", en:"Toast + Jam (2 slices)", my:"ပေါင်မုန့် + ယို (၂ ချပ်)", kcal:220, p:5, c:42, f:4, ic:"bread", cat:"bfast"},
  {id:"oatmeal", en:"Oatmeal (1 bowl)", my:"ဂျုံကွေကာ (၁ ပွဲ)", kcal:150, p:5, c:27, f:3, ic:"bowl", cat:"bfast"},
  {id:"banana", en:"Banana (1)", my:"ငှက်ပျောသီး (၁ လုံး)", kcal:105, p:1, c:27, f:0, ic:"fruit", cat:"bfast"},
  {id:"pancake", en:"Pancakes (3)", my:"ပန်ကိတ် (၃ ချပ်)", kcal:350, p:8, c:58, f:10, ic:"layers", cat:"bfast"},
  // Snacks & drinks
  {id:"apple", en:"Apple (1)", my:"ပန်းသီး (၁ လုံး)", kcal:95, p:0, c:25, f:0, ic:"fruit", cat:"snack"},
  {id:"chips", en:"Potato Chips (1 pack)", my:"အာလူးကြော် (၁ ထုပ်)", kcal:230, p:3, c:24, f:14, ic:"snack", cat:"snack"},
  {id:"choc", en:"Chocolate Bar", my:"ချောကလက်", kcal:250, p:3, c:28, f:14, ic:"candy", cat:"snack"},
  {id:"cola", en:"Cola (1 can)", my:"ကိုလာ (၁ ဘူး)", kcal:140, p:0, c:39, f:0, ic:"drink", cat:"snack"},
  {id:"bubbletea", en:"Bubble Tea (1 cup)", my:"Bubble Tea (၁ ခွက်)", kcal:320, p:4, c:68, f:6, ic:"drink", cat:"snack"},
  {id:"yogurt", en:"Yogurt (1 cup)", my:"ဒိန်ချဉ် (၁ ခွက်)", kcal:150, p:8, c:18, f:5, ic:"shake", cat:"snack"},
  {id:"nuts", en:"Mixed Nuts (handful)", my:"အစေ့အဆန် (တစ်ဆုပ်)", kcal:170, p:6, c:6, f:15, ic:"snack", cat:"snack"},
  // Healthy
  {id:"grilledchicken", en:"Grilled Chicken Breast", my:"ကြက်ရင်အုပ် ကင်", kcal:280, p:42, c:0, f:12, ic:"meat", cat:"fit"},
  {id:"salad", en:"Chicken Salad", my:"ကြက်သား အသုပ်", kcal:250, p:24, c:12, f:12, ic:"salad", cat:"fit"},
  {id:"proteinshake", en:"Protein Shake", my:"Protein Shake", kcal:160, p:25, c:8, f:3, ic:"shake", cat:"fit"},
  {id:"salmon", en:"Grilled Fish", my:"ငါးကင်", kcal:300, p:34, c:0, f:16, ic:"fish", cat:"fit"},
];

/* Mifflin-St Jeor → daily target */
window.F1T_calcTarget = function(sex, age, hCm, wKg, goal, active){
  let bmr = sex === "male"
    ? 10*wKg + 6.25*hCm - 5*age + 5
    : 10*wKg + 6.25*hCm - 5*age - 161;
  let tdee = bmr * (active ? 1.55 : 1.375);
  if (goal === "lose") tdee -= 500;
  if (goal === "gain") tdee += 300;
  return Math.round(tdee / 50) * 50;
};

window.F1T_todayKey = function(d){
  d = d || new Date();
  // Asia/Yangon date
  const parts = new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Yangon",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
  return parts; // YYYY-MM-DD
};

/* ---- exercises: 40 entries across 7 muscle groups, MET values ---- */
window.F1T_DATA = window.F1T_DATA || {};
window.F1T_DATA.EXERCISES = [
 {id:"pushup",en:"Push-Up",my:"ပွင့်တင်ထောက်",m:"chest",met:8},
 {id:"bench",en:"Bench Press",my:"ဘန်ချ်ပရက်စ်",m:"chest",met:6},
 {id:"incline",en:"Incline Dumbbell Press",my:"အင်ကလိုင်းပရက်စ်",m:"chest",met:6},
 {id:"fly",en:"Chest Fly",my:"ချတ်စ်ဖလိုင်",m:"chest",met:5},
 {id:"dips",en:"Dips",my:"ဒစ်ပ်",m:"chest",met:8},
 {id:"pullup",en:"Pull-Up",my:"ပူလ်အပ်",m:"back",met:8},
 {id:"latpull",en:"Lat Pulldown",my:"လက်တ်ပူလ်ဒေါင်း",m:"back",met:6},
 {id:"bbrow",en:"Barbell Row",my:"ဘားဘဲလ်ရိုး",m:"back",met:6},
 {id:"seatrow",en:"Seated Row",my:"ထိုင်ရိုး",m:"back",met:6},
 {id:"deadlift",en:"Deadlift",my:"ဒတ်ဒ်လစ်ဖ့်",m:"back",met:8},
 {id:"ohp",en:"Overhead Press",my:"အိုဗာဟတ်ပရက်စ်",m:"shoulders",met:6},
 {id:"latraise",en:"Lateral Raise",my:"လက်တာရယ်ရိတ်စ်",m:"shoulders",met:5},
 {id:"frontraise",en:"Front Raise",my:"ဖရန့်ရိတ်စ်",m:"shoulders",met:5},
 {id:"reardelt",en:"Rear Delt Fly",my:"ရီးယားဒဲလ်တ်ဖလိုင်",m:"shoulders",met:5},
 {id:"shrugs",en:"Shrugs",my:"ရှရပ်ဂ်",m:"shoulders",met:5},
 {id:"squat",en:"Squat",my:"စကွပ်",m:"legs",met:7},
 {id:"legpress",en:"Leg Press",my:"လက်ဂ်ပရက်စ်",m:"legs",met:6},
 {id:"lunge",en:"Lunge",my:"လွန်းချ်",m:"legs",met:6},
 {id:"legcurl",en:"Leg Curl",my:"လက်ဂ်ကားလ်",m:"legs",met:5},
 {id:"legext",en:"Leg Extension",my:"လက်ဂ်အစ်က်စတန်းရှင်း",m:"legs",met:5},
 {id:"calfraise",en:"Calf Raise",my:"ကက်ဖ်ရိတ်စ်",m:"legs",met:5},
 {id:"rdl",en:"Romanian Deadlift",my:"ရိုမေးနီးယန်းဒတ်ဒ်လစ်ဖ့်",m:"legs",met:6},
 {id:"bcurl",en:"Bicep Curl",my:"ဘိုင်ဆက်ပ်ကားလ်",m:"arms",met:4},
 {id:"hammer",en:"Hammer Curl",my:"ဟမ်းမားကားလ်",m:"arms",met:4},
 {id:"pushdown",en:"Tricep Pushdown",my:"ထရိုင်ဆက်ပ်ပွတ်ရှ်ဒေါင်း",m:"arms",met:4},
 {id:"ohext",en:"Overhead Extension",my:"အိုဗာဟတ်အစ်က်စတန်းရှင်း",m:"arms",met:4},
 {id:"preacher",en:"Preacher Curl",my:"ပရီချာကားလ်",m:"arms",met:4},
 {id:"plank",en:"Plank",my:"ပလန့်ခ်",m:"core",met:4,dur:true},
 {id:"crunch",en:"Crunch",my:"ခရန့်ချ်",m:"core",met:5},
 {id:"legraise",en:"Leg Raise",my:"လက်ဂ်ရိတ်စ်",m:"core",met:5},
 {id:"rtwist",en:"Russian Twist",my:"ရရှားတွစ်စ်",m:"core",met:5},
 {id:"mtclimb",en:"Mountain Climber",my:"မောင်တင်းကလိုင်းမား",m:"core",met:8},
 {id:"run",en:"Run",my:"ပြေးခြင်း",m:"cardio",met:9.8,dur:true},
 {id:"cycle",en:"Cycle",my:"စက်ဘီးစီးခြင်း",m:"cardio",met:7.5,dur:true},
 {id:"jumprope",en:"Jump Rope",my:"ကြိုးခုန်ခြင်း",m:"cardio",met:10,dur:true},
 {id:"burpee",en:"Burpee",my:"ဘာပီ",m:"cardio",met:10},
 {id:"rowm",en:"Row Machine",my:"ရိုးစက်",m:"cardio",met:7,dur:true},
 {id:"walk",en:"Walk",my:"လမ်းလျှောက်ခြင်း",m:"cardio",met:3.8,dur:true},
 {id:"swim",en:"Swim",my:"ရေကူးခြင်း",m:"cardio",met:8,dur:true},
 {id:"ellip",en:"Elliptical",my:"အယ်လစ်ပတစ်ကယ်",m:"cardio",met:6.5,dur:true},
];
window.F1T_DATA.MUSCLES = ["chest","back","shoulders","legs","arms","core","cardio"];
