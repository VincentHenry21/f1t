/* ============ F1T · food database ============
   kcal per typical serving. p/c/f = protein, carbs, fat grams. */
window.F1T_FOODS = [
  // Myanmar staples
  {id:"mohinga", en:"Mohinga (1 bowl)", my:"မုန့်ဟင်းခါး (၁ ပွဲ)", kcal:350, p:14, c:58, f:6, ico:"🍜", cat:"my"},
  {id:"khaukswe", en:"Khauk Swe Thoke (1 plate)", my:"ခေါက်ဆွဲသုပ် (၁ ပွဲ)", kcal:450, p:12, c:70, f:14, ico:"🍝", cat:"my"},
  {id:"shannoodle", en:"Shan Noodles (1 bowl)", my:"ရှမ်းခေါက်ဆွဲ (၁ ပွဲ)", kcal:480, p:18, c:65, f:16, ico:"🍜", cat:"my"},
  {id:"tealeaf", en:"Tea Leaf Salad (1 plate)", my:"လက်ဖက်သုပ် (၁ ပွဲ)", kcal:220, p:5, c:12, f:18, ico:"🥗", cat:"my"},
  {id:"coconutrice", en:"Coconut Rice (1 plate)", my:"အုန်းထမင်း (၁ ပွဲ)", kcal:520, p:10, c:78, f:18, ico:"🍚", cat:"my"},
  {id:"mohinga2", en:"Nan Gyi Thoke (1 plate)", my:"နန်းကြီးသုပ် (၁ ပွဲ)", kcal:430, p:14, c:62, f:14, ico:"🍝", cat:"my"},
  {id:"fishsoup", en:"Fish Soup Rice (1 bowl)", my:"ငါးဟင်းထမင်း (၁ ပွဲ)", kcal:380, p:22, c:52, f:8, ico:"🍲", cat:"my"},
  {id:"paratha", en:"Paratha (1 pc)", my:"ပလာတာ (၁ ချပ်)", kcal:280, p:6, c:36, f:12, ico:"🥞", cat:"my"},
  {id:"samosa", en:"Samosa (2 pc)", my:"စမူဆာ (၂ ခု)", kcal:260, p:6, c:28, f:14, ico:"🥟", cat:"my"},
  {id:"briyani", en:"Chicken Briyani (1 plate)", my:"ဒံပေါက် (၁ ပွဲ)", kcal:650, p:28, c:70, f:26, ico:"🍛", cat:"my"},
  {id:"milktea", en:"Milk Tea (1 cup)", my:"လက်ဖက်ရည် (၁ ခွက်)", kcal:120, p:3, c:16, f:5, ico:"🧋", cat:"my"},
  // Rice & mains
  {id:"rice1", en:"Steamed Rice (1 cup)", my:"ထမင်း (၁ ခွက်)", kcal:205, p:4, c:45, f:0, ico:"🍚", cat:"main"},
  {id:"friedrice", en:"Fried Rice (1 plate)", my:"ထမင်းကြော် (၁ ပွဲ)", kcal:550, p:14, c:72, f:22, ico:"🍳", cat:"main"},
  {id:"chickencurry", en:"Chicken Curry + Rice", my:"ကြက်သားဟင်း + ထမင်း", kcal:620, p:32, c:68, f:22, ico:"🍛", cat:"main"},
  {id:"porkcurry", en:"Pork Curry + Rice", my:"ဝက်သားဟင်း + ထမင်း", kcal:700, p:28, c:66, f:32, ico:"🍛", cat:"main"},
  {id:"eggcurry", en:"Egg Curry + Rice", my:"ကြက်ဥဟင်း + ထမင်း", kcal:520, p:18, c:64, f:20, ico:"🍳", cat:"main"},
  {id:"noodlesoup", en:"Noodle Soup (1 bowl)", my:"ခေါက်ဆွဲပြုတ် (၁ ပွဲ)", kcal:380, p:16, c:58, f:9, ico:"🍜", cat:"main"},
  {id:"instantnoodle", en:"Instant Noodles (1 pack)", my:"အသင့်စား ခေါက်ဆွဲ (၁ ထုပ်)", kcal:385, p:8, c:52, f:16, ico:"🍜", cat:"main"},
  // Breakfast
  {id:"eggs2", en:"Boiled Eggs (2)", my:"ကြက်ဥပြုတ် (၂ လုံး)", kcal:155, p:13, c:1, f:11, ico:"🥚", cat:"bfast"},
  {id:"toast", en:"Toast + Jam (2 slices)", my:"ပေါင်မုန့် + ယို (၂ ချပ်)", kcal:220, p:5, c:42, f:4, ico:"🍞", cat:"bfast"},
  {id:"oatmeal", en:"Oatmeal (1 bowl)", my:"ဂျုံကွေကာ (၁ ပွဲ)", kcal:150, p:5, c:27, f:3, ico:"🥣", cat:"bfast"},
  {id:"banana", en:"Banana (1)", my:"ငှက်ပျောသီး (၁ လုံး)", kcal:105, p:1, c:27, f:0, ico:"🍌", cat:"bfast"},
  {id:"pancake", en:"Pancakes (3)", my:"ပန်ကိတ် (၃ ချပ်)", kcal:350, p:8, c:58, f:10, ico:"🥞", cat:"bfast"},
  // Snacks & drinks
  {id:"apple", en:"Apple (1)", my:"ပန်းသီး (၁ လုံး)", kcal:95, p:0, c:25, f:0, ico:"🍎", cat:"snack"},
  {id:"chips", en:"Potato Chips (1 pack)", my:"အာလူးကြော် (၁ ထုပ်)", kcal:230, p:3, c:24, f:14, ico:"🍟", cat:"snack"},
  {id:"choc", en:"Chocolate Bar", my:"ချောကလက်", kcal:250, p:3, c:28, f:14, ico:"🍫", cat:"snack"},
  {id:"cola", en:"Cola (1 can)", my:"ကိုလာ (၁ ဘူး)", kcal:140, p:0, c:39, f:0, ico:"🥤", cat:"snack"},
  {id:"bubbletea", en:"Bubble Tea (1 cup)", my:"Bubble Tea (၁ ခွက်)", kcal:320, p:4, c:68, f:6, ico:"🧋", cat:"snack"},
  {id:"yogurt", en:"Yogurt (1 cup)", my:"ဒိန်ချဉ် (၁ ခွက်)", kcal:150, p:8, c:18, f:5, ico:"🍦", cat:"snack"},
  {id:"nuts", en:"Mixed Nuts (handful)", my:"အစေ့အဆန် (တစ်ဆုပ်)", kcal:170, p:6, c:6, f:15, ico:"🥜", cat:"snack"},
  // Healthy
  {id:"grilledchicken", en:"Grilled Chicken Breast", my:"ကြက်ရင်အုပ် ကင်", kcal:280, p:42, c:0, f:12, ico:"🍗", cat:"fit"},
  {id:"salad", en:"Chicken Salad", my:"ကြက်သား အသုပ်", kcal:250, p:24, c:12, f:12, ico:"🥗", cat:"fit"},
  {id:"proteinshake", en:"Protein Shake", my:"Protein Shake", kcal:160, p:25, c:8, f:3, ico:"🥛", cat:"fit"},
  {id:"salmon", en:"Grilled Fish", my:"ငါးကင်", kcal:300, p:34, c:0, f:16, ico:"🐟", cat:"fit"},
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
