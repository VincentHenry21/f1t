/* ============ F1T v12 · i18n supplement ============
   Keys introduced by the v12 rebuild, in all 5 languages.
   Merged over the base F1T_I18N at load. */
(function(){
  const ADD = {
  en:{ agePh:"Age", comingSoon:"Coming soon", createAccount:"Create account",
    discardSub:"This workout will not be saved.", emailPh:"you@example.com",
    heightCm:"Height (cm)", heightPh:"e.g. 170", loadError:"Couldn't load. Tap retry.", loading:"Loading…",
    noReportData:"No records this week yet. Log meals or workouts to fill your report.",
    obInvalid:"Enter a valid height (100-250 cm) and weight (20-400 kg).",
    obSub:"A few details so your targets fit you.", obTitle:"Tell us about you",
    passPh:"Choose a strong password", pause:"Pause",
    popupBlocked:"The popup was blocked. Allow popups and try again.",
    reportNote:"Built from your real F1T records. Estimates are labeled where used.",
    restDone:"Rest over. Next set.", resume:"Resume", savePdf:"Save as PDF",
    sessions:"Sessions", streak:"Streak", volume:"Volume", weeklyReport:"Weekly report",
    weightChange:"Weight change", weightPh:"e.g. 68",
    welTerms:"By continuing you agree to the Terms & Conditions.", welcomeBack:"Welcome back" },
  my:{ agePh:"အသက်", comingSoon:"မကြာမီ", createAccount:"အကောင့်ဖွင့်ရန်",
    discardSub:"ဒီလေ့ကျင့်ခန်းကို သိမ်းမည်မဟုတ်ပါ။", emailPh:"you@example.com",
    heightCm:"အရပ် (စင်တီမီတာ)", heightPh:"ဥပမာ ၁၇၀", loadError:"ဖွင့်မရပါ။ ပြန်ကြိုးစားကြည့်ပါ။", loading:"ဖွင့်နေသည်…",
    noReportData:"ဒီအပတ်အတွက် မှတ်တမ်းမရှိသေးပါ။ အစားအစာ သို့မဟုတ် လေ့ကျင့်ခန်း မှတ်ပြီး အစီရင်ခံစာရယူပါ။",
    obInvalid:"အရပ် (100-250 စင်တီမီတာ) နှင့် ကိုယ်အလေးချိန် (20-400 ကီလိုဂရမ်) မှန်ကန်စွာ ဖြည့်ပါ။",
    obSub:"သင့်အတွက် ကိုက်ညီတဲ့ ပန်းတိုင်တွေ တွက်ချက်ဖို့ အချက်အလက်အနည်းငယ်။", obTitle:"သင့်အကြောင်း ပြောပြပါ",
    passPh:"ခိုင်မာတဲ့ စကားဝှက် ရွေးပါ", pause:"ခေတ္တရပ်ရန်",
    popupBlocked:"Popup ပိတ်ထားခံရပါတယ်။ Popup ခွင့်ပြုပြီး ပြန်ကြိုးစားပါ။",
    reportNote:"သင့်ရဲ့ F1T မှတ်တမ်းအစစ်တွေနဲ့ တည်ဆောက်ထားပါတယ်။ ခန့်မှန်းတန်ဖိုးတွေကို သတ်မှတ်ပြထားပါတယ်။",
    restDone:"အနားယူချိန် ပြီးပါပြီ။ နောက် set ဆက်လုပ်ပါ။", resume:"ပြန်စရန်", savePdf:"PDF အဖြစ် သိမ်းရန်",
    sessions:"အကြိမ်များ", streak:"အဆက်မပြတ်", volume:"စုစုပေါင်းဝန်", weeklyReport:"အပတ်စဉ် အစီရင်ခံစာ",
    weightChange:"ကိုယ်အလေးချိန် ပြောင်းလဲမှု", weightPh:"ဥပမာ ၆၈",
    welTerms:"ဆက်လုပ်ခြင်းဖြင့် စည်းမျဉ်းစည်းကမ်းများကို သဘောတူပါသည်။", welcomeBack:"ပြန်လည်ကြိုဆိုပါတယ်" },
  th:{ agePh:"อายุ", comingSoon:"เร็วๆ นี้", createAccount:"สร้างบัญชี",
    discardSub:"การออกกำลังกายนี้จะไม่ถูกบันทึก", emailPh:"you@example.com",
    heightCm:"ส่วนสูง (ซม.)", heightPh:"เช่น 170", loadError:"โหลดไม่ได้ แตะลองอีกครั้ง", loading:"กำลังโหลด…",
    noReportData:"ยังไม่มีบันทึกในสัปดาห์นี้ บันทึกอาหารหรือการออกกำลังกายเพื่อดูรายงาน",
    obInvalid:"กรุณากรอกส่วนสูง (100-250 ซม.) และน้ำหนัก (20-400 กก.) ให้ถูกต้อง",
    obSub:"ข้อมูลเล็กน้อยเพื่อให้เป้าหมายเหมาะกับคุณ", obTitle:"บอกเราเกี่ยวกับตัวคุณ",
    passPh:"เลือกรหัสผ่านที่แข็งแรง", pause:"หยุดชั่วคราว",
    popupBlocked:"ป๊อปอัพถูกบล็อก อนุญาตป๊อปอัพแล้วลองใหม่",
    reportNote:"สร้างจากบันทึก F1T จริงของคุณ ค่าประมาณจะระบุไว้",
    restDone:"พักเสร็จแล้ว เซตต่อไป", resume:"ทำต่อ", savePdf:"บันทึกเป็น PDF",
    sessions:"เซสชัน", streak:"สถิติต่อเนื่อง", volume:"ปริมาณงาน", weeklyReport:"รายงานรายสัปดาห์",
    weightChange:"น้ำหนักเปลี่ยนแปลง", weightPh:"เช่น 68",
    welTerms:"การดำเนินการต่อแสดงว่าคุณยอมรับข้อกำหนดการใช้งาน", welcomeBack:"ยินดีต้อนรับกลับ" },
  zh:{ agePh:"年龄", comingSoon:"即将推出", createAccount:"创建账户",
    discardSub:"本次锻炼将不会保存。", emailPh:"you@example.com",
    heightCm:"身高（厘米）", heightPh:"例如 170", loadError:"加载失败，请重试。", loading:"加载中…",
    noReportData:"本周还没有记录。记录饮食或锻炼以生成报告。",
    obInvalid:"请输入有效的身高（100-250 厘米）和体重（20-400 公斤）。",
    obSub:"填写几项信息，让目标更适合你。", obTitle:"介绍一下你自己",
    passPh:"设置一个强密码", pause:"暂停",
    popupBlocked:"弹窗被拦截，请允许弹窗后重试。",
    reportNote:"根据你的真实 F1T 记录生成，估算值已标明。",
    restDone:"休息结束，下一组。", resume:"继续", savePdf:"保存为 PDF",
    sessions:"训练次数", streak:"连续记录", volume:"训练量", weeklyReport:"每周报告",
    weightChange:"体重变化", weightPh:"例如 68",
    welTerms:"继续即表示你同意服务条款。", welcomeBack:"欢迎回来" },
  ja:{ agePh:"年齢", comingSoon:"近日公開", createAccount:"アカウントを作成",
    discardSub:"このワークアウトは保存されません。", emailPh:"you@example.com",
    heightCm:"身長（cm）", heightPh:"例：170", loadError:"読み込めませんでした。もう一度お試しください。", loading:"読み込み中…",
    noReportData:"今週の記録はまだありません。食事やトレーニングを記録してレポートを作成しましょう。",
    obInvalid:"身長（100-250 cm）と体重（20-400 kg）を正しく入力してください。",
    obSub:"あなたに合った目標を設定するための簡単な情報です。", obTitle:"あなたについて教えてください",
    passPh:"強いパスワードを設定", pause:"一時停止",
    popupBlocked:"ポップアップがブロックされました。許可してからもう一度お試しください。",
    reportNote:"実際のF1T記録から作成しています。推定値は明示しています。",
    restDone:"休憩終了。次のセットへ。", resume:"再開", savePdf:"PDFとして保存",
    sessions:"セッション", streak:"連続記録", volume:"ボリューム", weeklyReport:"週間レポート",
    weightChange:"体重の変化", weightPh:"例：68",
    welTerms:"続行することで利用規約に同意したことになります。", welcomeBack:"おかえりなさい" }
  };
  const I = window.F1T_I18N || (window.F1T_I18N = {});
  Object.keys(ADD).forEach(l => { I[l] = Object.assign({}, I[l], ADD[l]); });
})();

/* v12 module keys (meals/health/stats/coach/workout builders) */
(function(){
  const ADD2 = {
  my:{ addCup:"+ ၁ ခွက် (၂၅၀ မီလီလီတာ)", addK:"+၁,၀၀၀ လှမ်း",
    analysisNoProfile:"ကျန်းမာရေး အချက်အလက် မရှိသေးပါ",
    analysisNoProfileB:"ကိုယ်အလေးချိန် မှတ်ပြီး F1T က BMI၊ ပန်းတိုင်နဲ့ အရှိန်ကို သင့်မှတ်တမ်းအစစ်နဲ့ တွက်ပေးပါမယ်။",
    calTarget:"ကယ်လိုရီ ပန်းတိုင်", estMark:"ခန့်မှန်း", heightNeeded:"အရပ် ထည့်မှ BMI ရပါမယ်။",
    howScored:"အမှတ် တွက်ပုံ", hydTitle:"ရေဓာတ်", leftToGo:"ကျန် {n}",
    logFirstMeal:"ပထမဆုံး အစားအစာ မှတ်ပါ", logWeightFirst:"ကိုယ်အလေးချိန် မှတ်ပါ",
    monthWorkouts:"ဒီလ လေ့ကျင့်ခန်း", noWeekData:"ပြီးခဲ့တဲ့ ၇ ရက်မှာ အစားအစာ မှတ်တမ်း မရှိပါ။",
    noWeightData:"ကိုယ်အလေးချိန် မှတ်တမ်း မရှိသေးပါ။ လမ်းကြောင်း ကြည့်ဖို့ မှတ်ပါ။",
    noWeightHist:"ကိုယ်အလေးချိန် မှတ်တမ်း မရှိသေးပါ။ လမ်းကြောင်း ဒီမှာ ပေါ်လာပါမယ်။",
    notYet:"မလုပ်ရသေးပါ", overBy:"ပန်းတိုင်ထက် {n} ပို",
    paceEven:"ဒီနေ့ ပန်းတိုင်အတိုင်း ဖြစ်နေပါတယ်။ တည်တည်ငြိမ်ငြိမ် ဆက်သွားပါ။",
    paceTitle:"ခန့်မှန်း အရှိန်", quickAdd:"အမြန်ထည့်ရန်", scCal:"ကယ်လိုရီ နှင့် ပန်းတိုင်",
    scMeals:"မှတ်ထားတဲ့ အစားအစာ", scProtein:"ပရိုတိန်း", scSteps:"လှမ်း", scWater:"ရေ", scWorkout:"လေ့ကျင့်ခန်း",
    stepsInvalid:"မှန်ကန်တဲ့ လှမ်းအရေအတွက် ထည့်ပါ။", targetsTitle:"ဒီနေ့ ပန်းတိုင်များ", today:"ဒီနေ့",
    trendDelta:"{d} ကတည်းက {s}{v} ကီလို", trendTitle:"ကိုယ်အလေးချိန် လမ်းကြောင်း", waterMl:"မီလီလီတာ",
    waterOf:"ပန်းတိုင် {b} လီတာထဲက {a} လီတာ", weekCal:"ဒီအပတ် ကယ်လိုရီ",
    weightHistory:"ကိုယ်အလေးချိန် မှတ်တမ်း", weightInvalid:"၂၀ မှ ၄၀၀ ကီလိုကြား ထည့်ပါ။", workoutDone:"ပြီးပါပြီ" },
  th:{ addCup:"+ 1 แก้ว (250 มล.)", addK:"+1,000 ก้าว",
    analysisNoProfile:"ยังไม่มีข้อมูลสุขภาพ",
    analysisNoProfileB:"บันทึกน้ำหนักแล้ว F1T จะคำนวณ BMI เป้าหมาย และแนวโน้มจากบันทึกจริงของคุณ",
    calTarget:"เป้าหมายแคลอรี่", estMark:"ประมาณ", heightNeeded:"เพิ่มส่วนสูงเพื่อปลดล็อก BMI",
    howScored:"วิธีคิดคะแนน", hydTitle:"การดื่มน้ำ", leftToGo:"เหลือ {n}",
    logFirstMeal:"บันทึกมื้อแรกของคุณ", logWeightFirst:"บันทึกน้ำหนัก",
    monthWorkouts:"การออกกำลังกายเดือนนี้", noWeekData:"ไม่มีบันทึกอาหารใน 7 วันที่ผ่านมา",
    noWeightData:"ยังไม่มีบันทึกน้ำหนัก บันทึกน้ำหนักเพื่อดูแนวโน้ม",
    noWeightHist:"ยังไม่มีประวัติน้ำหนัก แนวโน้มจะแสดงที่นี่",
    notYet:"ยังไม่ได้ทำ", overBy:"เกินเป้าหมาย {n}",
    paceEven:"วันนี้เป็นไปตามเป้าหมาย รักษาความสม่ำเสมอไว้",
    paceTitle:"ประมาณการความคืบหน้า", quickAdd:"เพิ่มด่วน", scCal:"แคลอรี่เทียบเป้าหมาย",
    scMeals:"มื้อที่บันทึก", scProtein:"โปรตีน", scSteps:"ก้าว", scWater:"น้ำ", scWorkout:"ออกกำลังกาย",
    stepsInvalid:"กรุณากรอกจำนวนก้าวที่ถูกต้อง", targetsTitle:"เป้าหมายวันนี้", today:"วันนี้",
    trendDelta:"{s}{v} กก. ตั้งแต่ {d}", trendTitle:"แนวโน้มน้ำหนัก", waterMl:"มล.",
    waterOf:"{a} ลิตร จากเป้าหมาย {b} ลิตร", weekCal:"แคลอรี่สัปดาห์นี้",
    weightHistory:"ประวัติน้ำหนัก", weightInvalid:"กรอกน้ำหนักระหว่าง 20 ถึง 400 กก.", workoutDone:"เสร็จแล้ว" },
  zh:{ addCup:"+ 1 杯（250 毫升）", addK:"+1,000 步",
    analysisNoProfile:"暂无健康数据",
    analysisNoProfileB:"记录体重后，F1T 将根据你的真实记录计算 BMI、目标和进度。",
    calTarget:"热量目标", estMark:"估计", heightNeeded:"添加身高以解锁 BMI。",
    howScored:"评分方式", hydTitle:"水分补充", leftToGo:"还剩 {n}",
    logFirstMeal:"记录你的第一餐", logWeightFirst:"记录体重",
    monthWorkouts:"本月锻炼", noWeekData:"过去 7 天没有饮食记录。",
    noWeightData:"暂无体重记录。记录体重以查看趋势。",
    noWeightHist:"暂无体重历史，趋势将显示在这里。",
    notYet:"尚未", overBy:"超出目标 {n}",
    paceEven:"今天达标了，保持稳定就是胜利。",
    paceTitle:"进度预估", quickAdd:"快速添加", scCal:"热量与目标",
    scMeals:"已记录餐食", scProtein:"蛋白质", scSteps:"步数", scWater:"饮水", scWorkout:"锻炼",
    stepsInvalid:"请输入有效的步数。", targetsTitle:"今日目标", today:"今天",
    trendDelta:"自 {d} 以来 {s}{v} 公斤", trendTitle:"体重趋势", waterMl:"毫升",
    waterOf:"目标 {b} 升，已喝 {a} 升", weekCal:"本周热量",
    weightHistory:"体重历史", weightInvalid:"请输入 20 至 400 公斤之间的体重。", workoutDone:"完成" },
  ja:{ addCup:"+ 1杯（250ml）", addK:"+1,000歩",
    analysisNoProfile:"健康データはまだありません",
    analysisNoProfileB:"体重を記録すると、F1Tが実際の記録からBMI・目標・ペースを計算します。",
    calTarget:"カロリー目標", estMark:"推定", heightNeeded:"身長を入力するとBMIが表示されます。",
    howScored:"スコアの仕組み", hydTitle:"水分補給", leftToGo:"あと {n}",
    logFirstMeal:"最初の食事を記録", logWeightFirst:"体重を記録",
    monthWorkouts:"今月のワークアウト", noWeekData:"過去7日間の食事記録がありません。",
    noWeightData:"体重の記録はまだありません。記録して推移を見ましょう。",
    noWeightHist:"体重履歴はまだありません。推移はここに表示されます。",
    notYet:"まだ", overBy:"目標を {n} 超過",
    paceEven:"今日は目標通りです。この調子で。",
    paceTitle:"ペース予測", quickAdd:"クイック追加", scCal:"カロリーと目標",
    scMeals:"記録した食事", scProtein:"タンパク質", scSteps:"歩数", scWater:"水分", scWorkout:"ワークアウト",
    stepsInvalid:"正しい歩数を入力してください。", targetsTitle:"今日の目標", today:"今日",
    trendDelta:"{d}から {s}{v} kg", trendTitle:"体重の推移", waterMl:"ml",
    waterOf:"目標 {b} Lのうち {a} L", weekCal:"今週のカロリー",
    weightHistory:"体重履歴", weightInvalid:"20〜400 kgの体重を入力してください。", workoutDone:"完了" }
  };
  const I = window.F1T_I18N || {};
  Object.keys(ADD2).forEach(l => { I[l] = Object.assign({}, I[l], ADD2[l]); });
})();

/* legacy meal-logger keys, Myanmar translations */
(function(){
  const ADD3 = {
    my:{ mealTotal:"အစားအစာ စုစုပေါင်း", servings:"အကြိမ်", noFoodMatch:"ရှာတာနဲ့ ကိုက်ညီတဲ့ အစားအစာ မရှိပါ။",
      needNameKcal:"အစားအစာ အမည်နဲ့ မှန်ကန်တဲ့ ကယ်လိုရီ ထည့်ပါ။", entryDeleted:"မှတ်တမ်း ဖျက်ပြီးပါပြီ။",
      delEntryQ:"ဒီမှတ်တမ်းကို ဖျက်မလား။", customTag:"ကိုယ်ပိုင်", qtyAria:"အကြိမ်",
      photoFail:"ဒီဓာတ်ပုံကို ဖတ်မရပါ။" }
  };
  const I = window.F1T_I18N || {};
  Object.keys(ADD3).forEach(l => { I[l] = Object.assign({}, I[l], ADD3[l]); });
})();

/* body map route */
(function(){
  const ADD4 = {
    en:{ bodyMap:"Body map" },
    my:{ bodyMap:"ကြွက်သား မြေပုံ" },
    th:{ bodyMap:"แผนที่กล้ามเนื้อ" },
    zh:{ bodyMap:"肌肉图" },
    ja:{ bodyMap:"筋肉マップ" }
  };
  const I = window.F1T_I18N || {};
  Object.keys(ADD4).forEach(l => { I[l] = Object.assign({}, I[l], ADD4[l]); });
})();
