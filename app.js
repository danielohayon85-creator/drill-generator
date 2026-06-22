'use strict';

/* ═══════════════════════════════════════════════════
   DATA CONSTANTS
═══════════════════════════════════════════════════ */
const STORAGE_KEY = 'drill_gen_v1';

const EXERCISE_TYPES = ['תרגיל מטה','תרגיל אתר הרס','תרגיל חבירה','תרגיל מודיעין אוכלוסייה','תרגיל רציפות תפקודית','תרגיל רשותי','תרגיל מוקד','תרגיל משולב'];

const SCENARIOS = [
  {id:'earthquake',  name:'רעידת אדמה',               icon:''},
  {id:'combat',      name:'ירי רקטות / פגיעת טיל',    icon:''},
  {id:'mass_cas',    name:'פיגוע / אירוע רב נפגעים',  icon:''},
  {id:'fire',        name:'שריפה נרחבת',               icon:''},
  {id:'flood',       name:'הצפה / שיטפון',             icon:''},
  {id:'chemical',    name:'אירוע כימ"ב / חומ"ס',       icon:''},
  {id:'traffic',     name:'אסון תחבורה / ר"נ',         icon:''},
  {id:'infra',       name:'קריסת תשתיות',              icon:''},
];

const SEC_SCENARIOS = [
  {id:'road_block',   name:'חסימת כבישים',      icon:''},
  {id:'power_cut',    name:'הפסקת חשמל',         icon:''},
  {id:'comm_fail',    name:'קריסת תקשורת',       icon:''},
  {id:'hosp_load',    name:'עומס בתי חולים',     icon:''},
  {id:'water_dmg',    name:'פגיעה תשתיות מים',   icon:''},
  {id:'force_short',  name:'מחסור בכוחות',       icon:''},
  {id:'media',        name:'לחץ תקשורתי',        icon:''},
  {id:'coord_fail',   name:'בעיות תיאום',        icon:''},
];

const UNITS = [
  {id:'home_front',   name:'פיקוד העורף',        icon:''},
  {id:'fire_dept',    name:'כב"א',               icon:''},
  {id:'mda',          name:'מד"א',               icon:''},
  {id:'police',       name:'משטרת ישראל',         icon:''},
  {id:'idf',          name:'לוחמי חילוץ',         icon:''},
  {id:'authority',    name:'רשות מקומית',         icon:''},
  {id:'water_corp',   name:'תאגיד מים',           icon:''},
  {id:'electric',     name:'חח"י',               icon:''},
  {id:'hospital',     name:'בית חולים',           icon:''},
  {id:'nafa_hq',      name:'מטה נפה',             icon:''},
  {id:'pop_officer',  name:'קצין אוכלוסייה',      icon:''},
  {id:'yaklr',        name:'יקל"ר',              icon:''},
  {id:'municipal',    name:'מטה עירוני',           icon:''},
  {id:'social',       name:'רווחה / סוציאלי',     icon:''},
];

const INJ_TYPES = ['אירוע','דיווח','פקודה','עדכון','בקשה','מידע מודיעיני','הנחיה','אזהרה'];

const RELIABILITY = [
  {key:'A', label:'A — אמין',        color:'#0f7b0f'},
  {key:'B', label:'B — כנראה נכון',  color:'#0067c0'},
  {key:'C', label:'C — ספקי',        color:'#9d5d00'},
  {key:'D', label:'D — לא ידוע',     color:'#8a8886'},
];

const NAMES_F = ['דוד','משה','אברהם','יוסף','שמעון','יצחק','אהרון','עמי','אליהו','בנימין','יהודה','גד','נפתלי','ראובן','זבולון'];
const NAMES_W = ['שרה','רחל','מרים','לאה','רבקה','חנה','תמר','נועה','מיכל','דינה','ברכה','פנינה','שרון','ענת','אורית'];
const LAST_NAMES = ['כהן','לוי','ישראלי','מזרחי','פרץ','גולן','ברק','שפירא','דוד','עמר','בן-דוד','אוחיון','אשכנזי','ביטון','חדד','סבג','בוסקילה'];
const STREETS = ['הרצל','ויצמן','בן-גוריון','ז\'בוטינסקי','אחד העם','ביאליק','רוטשילד','אבן גבירול','הנשיא','המייסדים','אורנים','הדקל','הזית','הגנה','שאול המלך'];
const HOSPITALS = ['רמב"ם','איכילוב','בני ציון','הלל יפה','העמק','סורוקה','ברזילי','שיבא','הדסה'];

/* ═══════════════════════════════════════════════════
   SETTINGS & API
═══════════════════════════════════════════════════ */
const SETTINGS_KEY = 'drill_gen_settings_v1';

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
}
function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

async function callClaudeAPI(apiKey, prompt, maxTokens = 4000) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `שגיאת API: ${res.status}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

function buildInjectionPrompt(draft) {
  const scenarioNames = {
    earthquake:'רעידת אדמה', mass_cas:'פיגוע / אירוע רב נפגעים', fire:'שריפה נרחבת',
    flood:'הצפה ושיטפון', chemical:'אירוע כימ"ב / חומ"ס', combat:'ירי רקטות / פגיעת טיל',
    traffic:'אסון תחבורה / ר"נ', infra:'קריסת תשתיות',
  };
  const scenarioName = scenarioNames[draft.mainScenario] || draft.mainScenario;
  const secNames = draft.secondaryScenarios.map(s => { const o = SEC_SCENARIOS.find(x=>x.id===s); return o?o.name:s; }).join(', ');
  const unitNames = draft.units.map(u => { const o = UNITS.find(x=>x.id===u); return o?o.name:u; }).join(', ');
  const complexityHe = {1:'קלה',2:'בינונית',3:'גבוהה'}[draft.complexity];
  const [h,m] = (draft.startTime||'08:00').split(':').map(Number);
  const endT = `${padZ(Math.floor((h*60+m+draft.durationHours*60)/60)%24)}:${padZ((h*60+m+draft.durationHours*60)%60)}`;

  return `אתה מומחה לבניית תרגילי חירום למפקדות נפה של פיקוד העורף בישראל.

בנה לוח הזרמות ריאליסטי לתרגיל:
• תרחיש ראשי: ${scenarioName}${secNames ? '\n• תרחישים משניים: '+secNames : ''}
• מיקום: ${draft.location}
• תאריך: ${draft.date}  |  שעות: ${draft.startTime}–${endT}  (${draft.durationHours} שעות)
• מספר הזרמות: ${draft.injCount}
• מורכבות: ${complexityHe}${unitNames ? '\n• מכלולים: '+unitNames : ''}

כללים:
1. פתח וסיים עם "מנהל תרגיל"
2. גורמים מדווחים: מוקד, משטרה, מד"א, כב"ה, מ"פ, מ"מ, לוחמי חילוץ, אזרחים, יקל"ר לנפה
3. כלול דיווח סותר אחד לפחות (אזרחים, אמינות C/D) שמחייב בירור
4. כלול תמ"צ פינויים לפחות פעם אחת
5. טרמינולוגיה פקע"ר: לכוד גלוי/סמוי, מאותר, חולץ, פונה, צפי, מרכז משפחות
6. שעות בפורמט HH:MM בין ${draft.startTime} ל-${endT}
7. עברית קצרה וענינית, כמו תרגיל אמיתי

החזר JSON בלבד, ללא markdown, ללא הסבר:
[{"time":"HH:MM","reporter":"...","type":"אירוע|דיווח|פקודה|עדכון|בקשה|מידע מודיעיני|הנחיה|אזהרה","content":"...","expectedAction":"...","reliability":"A|B|C|D"}]`;
}

function buildStoryPrompt(draft) {
  const scenarioNames = {
    earthquake:'רעידת אדמה', mass_cas:'פיגוע / אירוע רב נפגעים', fire:'שריפה נרחבת',
    flood:'הצפה ושיטפון', chemical:'אירוע כימ"ב / חומ"ס', combat:'ירי רקטות / פגיעת טיל',
    traffic:'אסון תחבורה / ר"נ', infra:'קריסת תשתיות',
  };
  const zoneCount = {1:1,2:2,3:3}[draft.complexity]||2;
  return `אתה מומחה לבניית תרגילי חירום בישראל.

כתוב סיפור אוכלוסייה מלא לתרגיל:
• תרחיש: ${scenarioNames[draft.mainScenario]||draft.mainScenario}
• מיקום: ${draft.location}
• גודל אוכלוסייה: ${draft.populationSize.toLocaleString('he-IL')} תושבים
• שעת פתיחה: ${draft.startTime}
• מספר זירות: ${zoneCount}

מבנה נדרש (כתוב בדיוק כך):

══════════════════════════════════════════════
סיפור כללי
══════════════════════════════════════════════
[תיאור הרקע, האזעקה/האירוע, נפילות/נזקים ראשוניים]

═══════════════════════════════════════════
זירה X: רחוב [שם] [מספר]
═══════════════════════════════════════════
מיקום:              רח' [שם] [מספר], ${draft.location}
שעת דיווח ראשוני:  HH:MM
סוג אתר:           [בניין מגורים / מוסד ציבורי / בית פרטי / כולל / מפעל]
אוכלוסייה באתר:    X נפשות

רקע:
[מה קרה בזירה]

אוכלוסייה בזירה לפי קומות:
  קומה 1: X נפשות [הערה אופציונלית]
  קומה 2: X נפשות

סיכום נפגעים:
  • הרוגים:           X
  • פצועים קשים:      X
  • פצועים בינוניים:  X
  • פצועים קלים:      X
  • לכודים:           X
  • נעדרים:           X

[חזור לכל זירה]

══════════════════════════════════════════════
טבלת סיכום זירות
══════════════════════════════════════════════
[שורה לכל זירה | מיקום | שעת דיווח | סוג אתר | אוכ' | הרוגים | פצועים | לכודים]
סה"כ: [סיכום כולל]

משך התרגיל: ${draft.durationHours} שעות | רמת מורכבות: ${{1:'קלה',2:'בינונית',3:'גבוהה'}[draft.complexity]}

עברית ריאליסטית, כמו תיק תרגיל אמיתי.`;
}

/* ═══════════════════════════════════════════════════
   INJECTION TEMPLATES  (relOffset = 0..1 over duration)
═══════════════════════════════════════════════════ */
const INJ_TPL = {
  earthquake:[
    {o:.00,rep:'מנהל תרגיל',     type:'אירוע',           rel:'A', tpl:'פתיחת תרגיל — רעידת אדמה בעוצמת {mag} ריכטר. מרכז רעש: {loc}, עומק {depth} ק"מ.'},
    {o:.07,rep:'מוקד',            type:'דיווח',           rel:'B', tpl:'מוקד מציף דיווחים — קריסות ב{loc}. {cas_l} פצועים מדווחים ראשונית. נדרש כוח חירום.'},
    {o:.12,rep:'אזרחים',          type:'דיווח',           rel:'C', tpl:'"יש לכודים ברחוב {street} — שומעים קולות מתחת להריסות." תושב דיווח למוקד.'},
    {o:.18,rep:'מד"א',            type:'דיווח',           rel:'A', tpl:'{cas_l} פצועים קלים, {cas_s} קשים. מפנים לב"ח {hosp}. מוקד מד"א פעיל.'},
    {o:.24,rep:'כב"ה',            type:'דיווח',           rel:'B', tpl:'קריסה חלקית — מבנה רח\' {street}. שמיעת קולות כלואים. מבקשים כוח חילוץ וציוד.'},
    {o:.31,rep:'חח"י',            type:'דיווח',           rel:'A', tpl:'נזקים לרשת חשמל. {pwr}% מהיישוב ללא חשמל. משך שיקום: {reph} שעות.'},
    {o:.38,rep:'תאגיד מים',       type:'דיווח',           rel:'B', tpl:'שבר בצנרת ראשית ב{warea}. הפסקת אספקה ל-{ahomes} בתים. צוות בדרך.'},
    {o:.45,rep:'מהנדס העיר',      type:'דיווח',           rel:'B', tpl:'סקר ראשוני: {bh} מבנים נזק קשה, {bm} בינוני. {bd} בסכנת קריסה.'},
    {o:.52,rep:'אזרחים',          type:'דיווח',           rel:'D', tpl:'"כולם יצאו מהבניין" — סותר דיווח קודם על לכודים ברח\' {street}. נדרש תשאול ראשוני.'},
    {o:.59,rep:'לוחמי חילוץ',     type:'עדכון',           rel:'A', tpl:'חולצו {res} מהריסות. נותרים {trap} לכודים אפשריים. מבקשים ציוד כריה נוסף.'},
    {o:.67,rep:'מד"א',            type:'עדכון',           rel:'A', tpl:'עדכון נפגעים: {tot_c} סה"כ — {tot_s} קשים, {miss} נעדרים. ב"ח {hosp} בעומס.'},
    {o:.76,rep:'ראש העיר',        type:'פקודה',           rel:'A', tpl:'פתיחת {shelt} מרכזי קבלה ומפונים. מרכז ניהול חירום עירוני פעיל ב{eoc}.'},
    {o:.84,rep:'רווחה / סוציאלי', type:'דיווח',           rel:'B', tpl:'{disp} משפחות מפונות. מרכז קליטה ב{rec} — עמוס. מרכז משפחות נפתח בסמוך.'},
    {o:.92,rep:'פיקוד העורף',     type:'פקודה',           rel:'A', tpl:'ישיבת הערכת מצב כוללת. כל ראשי מכלולים — נוכחות נדרשת. הצגת תמ"צ.'},
    {o:.98,rep:'מנהל תרגיל',      type:'פקודה',           rel:'A', tpl:'סיום תרגיל — כל הכוחות: דוח ביצוע תוך 15 דקות.'},
  ],
  mass_cas:[
    {o:.00,rep:'משטרת ישראל',   type:'אירוע',           rel:'B', tpl:'דיווח על {inc} ב{loc}. נפגעים בשטח. הכוחות בדרך.'},
    {o:.08,rep:'כב"א',          type:'דיווח',           rel:'B', tpl:'הגדרת תבנה ורדיוס {rad}מ. {trap} כלואים אפשריים.'},
    {o:.15,rep:'מד"א',          type:'דיווח',           rel:'A', tpl:'{cas} נפגעים: {crit} קשים, {mod} בינוניים, {lgt} קלים. MCEI נפתח ב{mce}.'},
    {o:.23,rep:'משטרת ישראל',   type:'מידע מודיעיני',   rel:'C', tpl:'מידע ראשוני: {intel}. מעלים כוננות מרחב. ממתינים לאימות.'},
    {o:.32,rep:'בית חולים',     type:'דיווח',           rel:'A', tpl:'קיבלנו {recv} נפגעים. ניתוחים בעיצומם. מגבילים הפניות נוספות.'},
    {o:.42,rep:'ראש העיר',      type:'פקודה',           rel:'A', tpl:'מוקד מידע לאוכלוסייה פתוח — {hot}. אל תתקרבו לאזור.'},
    {o:.52,rep:'מד"א',          type:'עדכון',           rel:'A', tpl:'עדכון: {tdead} הרוגים, {twound} פצועים. זיהוי נפגעים — בהמשך.'},
    {o:.63,rep:'כב"א',          type:'עדכון',           rel:'B', tpl:'שטח מנוקה מחוץ לתבנה. ממשיכים סריקה.'},
    {o:.74,rep:'פיקוד העורף',   type:'פקודה',           rel:'A', tpl:'ישיבת הערכת מצב. הגברת כוננות ל{reg}. כל כוחות — עדכון מוכנות.'},
    {o:.87,rep:'פיקוד העורף',   type:'פקודה',           rel:'A', tpl:'ישיבת מצב סיכום. תחקיר — תוך 24 שעות. שלב הבא: {nphase}.'},
  ],
  fire:[
    {o:.00,rep:'כב"א',          type:'אירוע',           rel:'A', tpl:'שריפה פרצה ב{loc}. שטח בוער: {area} דונם. רוח {wdir} — {wspd} קמ"ש.'},
    {o:.10,rep:'כב"א',          type:'עדכון',           rel:'A', tpl:'השריפה מתרחבת. דלקות משניות ב{sloc}. האש מתקדמת לכיוון {threat}.'},
    {o:.19,rep:'ראש העיר',      type:'פקודה',           rel:'A', tpl:'פינוי חובה — שכונות {evac}. נקודות כינוס: {asm}. השתמשו בנתיב חלופי.'},
    {o:.29,rep:'מד"א',          type:'דיווח',           rel:'A', tpl:'{smk} נפגעי עשן, {burn} כוויות. מפנים ל{hosp}.'},
    {o:.39,rep:'כב"א',          type:'עדכון',           rel:'A', tpl:'{hdmg} מבנים נפגעו. כוחות חיזוק בדרך.'},
    {o:.50,rep:'חח"י',          type:'דיווח',           rel:'A', tpl:'נסיגת רשת חשמל ב{area} למניעת סיכון. {pct}% ללא חשמל.'},
    {o:.61,rep:'רווחה',         type:'דיווח',           rel:'B', tpl:'{evnum} מפונים. מרכז קבלה ב{rec}. נדרש לינה ל{supp} משפחות.'},
    {o:.73,rep:'כב"א',          type:'עדכון',           rel:'B', tpl:'שלב שיקול חזרה ל{zones}. ממתינים לאישור בטיחות.'},
    {o:.85,rep:'מהנדס העיר',    type:'דיווח',           rel:'A', tpl:'{insp} מבנים נבדקו: {safe} בטוחים, {unsafe} אסורים.'},
    {o:.95,rep:'ראש העיר',      type:'פקודה',           rel:'A', tpl:'ישיבת הערכת נזקים. חישוב לדיווח למרכז.'},
  ],
  flood:[
    {o:.00,rep:'שירות מטאורולוגי',type:'אזהרה',         rel:'A', tpl:'אזהרת שיטפון נחל {wadi}. {rain}מ"מ בשעה. צפי להצפות תוך {ttf} שעות.'},
    {o:.11,rep:'עיריית {city}', type:'דיווח',           rel:'B', tpl:'הצפות ב{streets}. {ctrap} רכבים תקועים. נדרש חילוץ.'},
    {o:.21,rep:'כב"א',          type:'דיווח',           rel:'A', tpl:'חולצו {resc} בני אדם מרכבים. תחנת שאיבה {pump} פועלת.'},
    {o:.31,rep:'מד"א',          type:'דיווח',           rel:'A', tpl:'{fcas} נפגעי הצפה. {hypo} מאושפזים להיפותרמיה.'},
    {o:.41,rep:'ראש העיר',      type:'פקודה',           rel:'A', tpl:'פינוי שכונות {nbhood} סמוך לנחל. מקלטים {shelt}.'},
    {o:.52,rep:'תאגיד מים',     type:'דיווח',           rel:'A', tpl:'זיהום מי שתייה — מנתקים {disc}. מים בבקבוקים מופצים.'},
    {o:.63,rep:'כוחות חיפוש',   type:'דיווח',           rel:'B', tpl:'{miss} נעדרים בנחל. {fnd} נמצאו, {smiss} עדיין חסרים.'},
    {o:.76,rep:'מהנדס העיר',    type:'דיווח',           rel:'B', tpl:'הצפת {fbld} בתים. גשר {brid} — נזק מבני, סגור לתנועה.'},
    {o:.88,rep:'פיקוד העורף',   type:'פקודה',           rel:'A', tpl:'ישיבת הערכת מצב. דיווח כולל נדרש מכל מכלול.'},
  ],
  chemical:[
    {o:.00,rep:'כב"א',          type:'אירוע',           rel:'B', tpl:'דליפת חומר מסוכן ב{loc}. חומר: {chem} ({haz}). אזור הכלה: {crad}מ.'},
    {o:.09,rep:'כב"א',          type:'פקודה',           rel:'A', tpl:'פינוי מיידי רדיוס {erad}מ. אוכלוסייה: סגרו חלונות, כבו מיזוג.'},
    {o:.17,rep:'מד"א',          type:'דיווח',           rel:'A', tpl:'{exp} חשופים. {symp} עם תסמינים: {symlist}. עמדת טיפול ב{tp}.'},
    {o:.27,rep:'פיקוד העורף',   type:'פקודה',           rel:'A', tpl:'הפעלת נוהל כימי. אזור {zone}: היחבאו. חסמו פתחים.'},
    {o:.38,rep:'כב"א',          type:'עדכון',           rel:'B', tpl:'הדליפה חסומה חלקית. {contai} מיכלים פונו. ניטור אוויר: {ppm} ppm.'},
    {o:.50,rep:'משרד הבריאות',  type:'הנחיה',           rel:'A', tpl:'בדיקה ב{chkpt} — חינם לכל חשוף. דיווח תסמינים: {hot}.'},
    {o:.63,rep:'כב"א',          type:'עדכון',           rel:'A', tpl:'שטח מנוקה. ניטור תקין. החזרת אוכלוסייה ל{rzone} — בשלבים.'},
    {o:.77,rep:'מד"א',          type:'עדכון',           rel:'A', tpl:'{hospN} מאושפזים. {rel} טופלו ושוחררו.'},
    {o:.90,rep:'פיקוד העורף',   type:'פקודה',           rel:'A', tpl:'ישיבת מצב — סיכום אירוע.'},
  ],
  combat:[
    {o:.00,rep:'מנהל תרגיל',    type:'אירוע',           rel:'A', tpl:'פתיחת תרגיל — אזעקה ברחבי הרשות. צבע אדום. כולם לממ"דים!'},
    {o:.06,rep:'מוקד',           type:'דיווח',           rel:'B', tpl:'מוקד מציף דיווחים על נפילות ב{loc}. {rkt} נקודות פגיעה מדווחות ראשוניות.'},
    {o:.12,rep:'אזרחים',         type:'דיווח',           rel:'C', tpl:'"שמענו פיצוץ חזק ברחוב {street} — יש אנשים פצועים בחוץ, הבניין עשן."'},
    {o:.18,rep:'מד"א',           type:'דיווח',           rel:'A', tpl:'{cas} נפגעים בשטח: {crit} קשים, {mod} בינוניים, {lgt} קלים. מפנים ל{hosp}.'},
    {o:.25,rep:'כב"ה',           type:'דיווח',           rel:'B', tpl:'פגיעה ישירה ב{hit}. קריסה חלקית. שמיעת קולות מתחת להריסות.'},
    {o:.33,rep:'מ"פ',            type:'דיווח',           rel:'A', tpl:'צפי ראשוני: {trap} לכודים גלויים, {miss} לכודים סמויים אפשריים. מבקשים כוח חילוץ ודרכי גישה.'},
    {o:.42,rep:'משטרת ישראל',    type:'פקודה',           rel:'A', tpl:'חסימת אזור רדיוס {rad}מ. כניסה לצוותי חירום בלבד. {shelt} מקלטים ציבוריים נפתחו.'},
    {o:.50,rep:'אזרחים',         type:'דיווח',           rel:'D', tpl:'"כולם יצאו מהבניין" — סותר דיווח קודם על לכודים. נדרש תשאול ראשוני לברור.'},
    {o:.58,rep:'לוחמי חילוץ',    type:'עדכון',           rel:'A', tpl:'חולצו {res} מהריסות. ממשיכים סריקה. קשר לא אותר עם {miss} שדווחו כשוהים בקומה {dead}.'},
    {o:.66,rep:'מד"א',           type:'עדכון',           rel:'A', tpl:'עדכון: {tdead} הרוגים, {twnd} פצועים פונו. רשימת פינויים מתעדכנת.'},
    {o:.75,rep:'מ"פ',            type:'עדכון',           rel:'A', tpl:'תמ"צ פינויים: {recv} נפשות — {disp} פונו, {res} ידועים בטוח, {miss} עדיין נעדרים.'},
    {o:.84,rep:'פיקוד העורף',    type:'בקשה',            rel:'A', tpl:'מבקשים חיזוקים: {req} לצורך {purp}. מרחב {reg2} — כוננות גבוהה.'},
    {o:.92,rep:'ראש העיר',       type:'פקודה',           rel:'A', tpl:'ישיבת הערכת מצב — כל מכלולים. הצגת תמ"צ כוללת. שלב הבא: ייצוב ושיקום.'},
    {o:.98,rep:'מנהל תרגיל',     type:'פקודה',           rel:'A', tpl:'סיום תרגיל — כל הכוחות: הגישו דוחות ביצוע תוך 15 דקות.'},
  ],
  traffic:[
    {o:.00,rep:'משטרת ישראל',   type:'אירוע',           rel:'A', tpl:'תאונת דרכים רב נפגעים כביש {rd} סמוך ל{loc}. {veh} כלי רכב.'},
    {o:.10,rep:'מד"א',          type:'דיווח',           rel:'A', tpl:'{cas} נפגעים: {crit} קשים, {mod} בינוניים, {lgt} קלים. פינוי בעיצומו.'},
    {o:.20,rep:'כב"א',          type:'דיווח',           rel:'A', tpl:'{trap} כלואים. חתכנו {cut} רכבים. {more} עדיין כלואים.'},
    {o:.32,rep:'משטרת ישראל',   type:'פקודה',           rel:'A', tpl:'כביש {rd} חסום — ניתוב לכביש {alt}.'},
    {o:.46,rep:'בית חולים',     type:'דיווח',           rel:'A', tpl:'קיבלנו {recv} נפגעים. {op} בניתוח. חדר מיון עמוס.'},
    {o:.62,rep:'מד"א',          type:'עדכון',           rel:'A', tpl:'כל נפגעים פונו. {fdead} הרוגים בשטח. {fhosp} מאושפזים.'},
    {o:.78,rep:'פיקוד העורף',   type:'פקודה',           rel:'A', tpl:'ישיבת מצב. עדכון סטטוס. כל מכלול — מוכנות.'},
    {o:.92,rep:'משטרת ישראל',   type:'דיווח',           rel:'A', tpl:'שחרור כביש {rd} חלקי. ניקוי שטח ב-{eta}ש.'},
  ],
  infra:[
    {o:.00,rep:'תאגיד מים',     type:'אירוע',           rel:'A', tpl:'שבר צנרת ראשית ב{loc}. {ahomes} בתים ללא מים.'},
    {o:.10,rep:'חח"י',          type:'דיווח',           rel:'A', tpl:'כשל תת-תחנה {sub}. {pct}% ללא חשמל. גנרטורים בהפעלה.'},
    {o:.19,rep:'עיריית {city}', type:'דיווח',           rel:'B', tpl:'מוסדות עברו לגנרטורים. מלאי דלק ל-{fhrs} שעות.'},
    {o:.30,rep:'ראש העיר',      type:'פקודה',           rel:'A', tpl:'פתיחת {ctrs} מרכזים עם מים/חשמל ל{cpop} תושבים.'},
    {o:.42,rep:'תאגיד מים',     type:'עדכון',           rel:'A', tpl:'תיקון ראשוני הושלם. שיקום מלא תוך {rph} שעות.'},
    {o:.56,rep:'בית חולים',     type:'בקשה',            rel:'A', tpl:'מלאי דלק מתקצה. נדרש דלק ל{fac} — דחוף.'},
    {o:.70,rep:'חח"י',          type:'עדכון',           rel:'A', tpl:'תיקון {sub2}: {sts}. שיקום כולל: {eta}ש.'},
    {o:.83,rep:'ראש העיר',      type:'פקודה',           rel:'A', tpl:'ישיבת הערכת מצב. עדכון תושבים ברשתות.'},
    {o:.94,rep:'פיקוד העורף',   type:'פקודה',           rel:'A', tpl:'שיקום {rpct}%. מעקב כל {intv} שעות.'},
  ],
};

/* ═══════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════ */
let _uidCnt = 1;
const uid = () => `id_${Date.now()}_${_uidCnt++}`;
const rnd = (a, b) => Math.round(a + Math.random() * (b - a));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const padZ = n => String(n).padStart(2,'0');
const minsToTime = (m, base=0) => { const t=base+m; return `${padZ(Math.floor(t/60)%24)}:${padZ(t%60)}`; };

/* ═══════════════════════════════════════════════════
   REAL STREET DATA (סמל ישוב / רחוב, מבוסס קובץ רשמי)
═══════════════════════════════════════════════════ */
let STREETS_DATA = null;
let _streetsLoadPromise = null;
function loadStreetsData() {
  if (!_streetsLoadPromise) {
    _streetsLoadPromise = fetch('streets.json')
      .then(r => r.ok ? r.json() : {})
      .then(d => { STREETS_DATA = d; return d; })
      .catch(() => { STREETS_DATA = {}; return {}; });
  }
  return _streetsLoadPromise;
}
function getCityStreets(location) {
  if (!STREETS_DATA) return null;
  const loc = (location || '').trim();
  if (!loc) return null;
  if (STREETS_DATA[loc]) return STREETS_DATA[loc];
  const keys = Object.keys(STREETS_DATA);
  const best = keys.find(k => k.startsWith(loc)) || keys.find(k => loc.startsWith(k)) || keys.find(k => k.includes(loc));
  return best ? STREETS_DATA[best] : null;
}
function pickStreet(location) {
  const real = getCityStreets(location);
  return (real && real.length) ? pick(real) : pick(STREETS);
}

function fillVars(tpl, ctx) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => ctx[k] !== undefined ? ctx[k] : `[${k}]`);
}

function buildCtx(draft) {
  const {location, populationSize, complexity, mainScenario} = draft;
  const m = ({1:.5,2:1,3:2})[complexity]||1;
  const city = location.split(' ').pop() || location;
  return {
    loc: location, city,
    mag:  (4.5 + Math.random()*2).toFixed(1),
    depth: rnd(8,25),
    street: pickStreet(location)+' '+rnd(1,60),
    hosp: pick(HOSPITALS),
    cas_l: rnd(10,40)*m|0,  cas_s: rnd(2,10)*m|0,
    tot_c: rnd(15,60)*m|0,  tot_s: rnd(3,12)*m|0,
    cas:   rnd(10,40)*m|0,  crit: rnd(2,8)*m|0,
    mod:   rnd(5,20)*m|0,   lgt:  rnd(8,30)*m|0,
    dead:  rnd(1,5)*m|0,    wnd:  rnd(10,40)*m|0,
    tdead: rnd(2,8)*m|0,    twnd: rnd(15,60)*m|0,
    twound:rnd(15,60)*m|0,
    miss:  rnd(2,12)*m|0,
    pwr: rnd(20,65)*m|0,    reph: rnd(4,12),
    warea: pick(['שכונת ותיקים','שכונה צפונית','מרכז העיר']),
    ahomes: rnd(50,500)*m|0,
    shelt: rnd(3,8),        eoc: pick(['בניין העירייה','מרכז קהילתי','אולם ספורט']),
    bh: rnd(3,15)*m|0,      bm: rnd(8,30)*m|0,  bd: rnd(1,5)*m|0,
    res: rnd(5,20)*m|0,     trap: rnd(1,8)*m|0,
    zone: pick(['א׳','ב׳','צפון','דרום']),
    disp: rnd(50,300)*m|0,  rec: pick(['בית ספר גמנסיה','מרכז קהילתי','אולם ספורט']),
    // mass_cas
    inc:  pick(['פיגוע','פיצוץ','ירי','דקירה המונית']),
    rad:  rnd(50,200),      mce: pick(['כיכר ראשית','חניון עירוני','מגרש פנוי']),
    intel: pick(['מידע על ארגון מעורב','תכנון נוסף','גורמים חשודים']),
    recv: rnd(8,30)*m|0,    hot: '102 / *6911',
    reg:  location,         nphase: pick(['שיקום ראשוני','ייצוב','שגרת חירום']),
    // fire
    area: rnd(30,400)*m|0,  wdir: pick(['צפון','מזרח','דרום-מערב','צפון-מזרח']),
    wspd: rnd(20,55),
    sloc: pick(['פארק צפוני','שדות חקלאיים','שמורת טבע']),
    threat: pick(['שכונת רמות','שכונת נאות','מרכז עסקים']),
    evac: pick(['רמות ב׳','הדר','גבעת ים']),
    asm:  pick(['כיכר המייסדים','מגרש ספורט','חניון הקניון']),
    smk:  rnd(5,25)*m|0,    burn: rnd(2,10)*m|0,
    hdmg: rnd(3,20)*m|0,    pct:  rnd(20,65)*m|0,
    evnum:rnd(30,200)*m|0,  supp: rnd(20,100)*m|0,
    zones:pick(['שכונה ב׳','הגנים','מרכז']),
    insp: rnd(20,80),       safe: rnd(15,60),  unsafe: rnd(3,15),
    // flood
    wadi: pick(['נחל הנגב','נחל שורק','נחל אלכסנדר','ואדי ערה']),
    rain: rnd(40,120),      ttf:  rnd(1,3),
    streets: pick(['רח\' הנביאים','דרך הצפון'])+' ו'+pick(['כביש 2','הנמל']),
    ctrap:rnd(5,25)*m|0,    pump: pick(['צפונית','דרומית','מרכזית']),
    fcas: rnd(5,20)*m|0,    hypo: rnd(2,8)*m|0,
    nbhood:pick(['גני ים','הצפון','השרון']),
    disc: pick(['שכונה א׳','מרכז','שכונה ב׳']),
    miss: rnd(1,8)*m|0,     fnd:  rnd(1,5),    smiss: rnd(0,3),
    fbld: rnd(5,30)*m|0,
    brid: pick(['הירקון','האקליפטוס','צפוני']),
    // chemical
    chem: pick(['כלור','אמוניה','גז טבעי']),
    haz:  pick(['2','3','4','2P']),
    crad: rnd(100,400),     erad: rnd(200,800),
    exp:  rnd(20,100)*m|0,  symp: rnd(5,30)*m|0,
    symlist:pick(['צריבת עיניים/שיעול','בחילות/כאבי ראש','קשיי נשימה']),
    tp:   pick(['חניון העירייה','מגרש בית ספר','גן ציבורי']),
    zone: pick(['אזור ב׳','מרכז','שכונה הוותיקה']),
    contai:rnd(2,8),        ppm:  (Math.random()*12*m).toFixed(2),
    chkpt:pick(['אצטדיון','בית ספר','מרכז ספורט']),
    rzone:pick(['שכונה ב׳','גבעת ים','מרכז']),
    hospN:rnd(5,20)*m|0,    rel:  rnd(10,40)*m|0,
    // combat
    rkt:  rnd(5,25)*m|0,    hit:  pick(['בניין מגורים','כביש ראשי','שטח פתוח']),
    reg2: pick(['גוש צפון','ממשגה','שפלה']),
    rkt2: rnd(3,15)*m|0,
    req:  pick(['כוח כב"א','אמבולנסים','גנרטורים']),
    purp: pick(['חיזוק כוחות','פינוי נוספים','שמירת סדר']),
    dl:   rnd(15,40),       hrs:  rnd(2,6),
    // traffic
    rd:   rnd(2,90),        veh:  rnd(3,8),
    cut:  rnd(1,4),         more: rnd(0,3),
    alt:  rnd(4,100),       op:   rnd(1,4),
    fdead:rnd(0,3)*m|0,     fhosp:rnd(5,20)*m|0,
    eta:  rnd(2,5),
    // infra
    sub:  pick(['צפון','דרום','מרכז']),
    fhrs: rnd(12,48),       ctrs: rnd(2,5),
    cpop: rnd(200,2000)*m|0,rph:  rnd(2,8),
    fac:  pick(['בית חולים','בית אבות','בית ספר']),
    sub2: pick(['ראשית','שנייה','מזרחית']),
    sts:  pick(['הושלם','בעיצומו','60%']),
    rpct: rnd(60,95),       intv: rnd(1,4),
  };
}

function generateInjections(draft) {
  const tpls = INJ_TPL[draft.mainScenario] || INJ_TPL.earthquake;
  const count = draft.injCount;
  const durMins = draft.durationHours * 60;
  const baseH = parseInt((draft.startTime||'08:00').split(':')[0],10)*60 + parseInt((draft.startTime||'08:00').split(':')[1],10);
  const ctx = buildCtx(draft);
  const reliMap = {A:'A',B:'B',C:'C',D:'D'};
  const reliPrf = draft.reliabilityProfile; // uniform | mixed | degrading

  const result = [];
  for (let i = 0; i < count; i++) {
    const frac = count===1 ? 0 : i/(count-1);
    // Find nearest template
    let best = tpls[0];
    let bestDist = Math.abs(tpls[0].o - frac);
    tpls.forEach(t => { const d = Math.abs(t.o - frac); if(d<bestDist){bestDist=d;best=t;} });
    // Sometimes cycle if few templates
    const tpl = tpls[i % tpls.length];
    const timeMins = Math.round(frac * durMins);
    const timeStr = minsToTime(timeMins, baseH);

    let rel = best.rel;
    if (reliPrf === 'mixed') rel = RELIABILITY[Math.floor(Math.random()*4)].key;
    else if (reliPrf === 'degrading') rel = i < count*0.4 ? 'A' : i < count*0.7 ? 'B' : 'C';

    // Secondary scenario injections woven in
    let content = fillVars(best.tpl, ctx);
    // Add secondary flavor occasionally
    if (draft.secondaryScenarios.length && i % Math.ceil(count/draft.secondaryScenarios.length) === 1) {
      const sec = draft.secondaryScenarios[(Math.floor(i/2)) % draft.secondaryScenarios.length];
      const secLabels = {
        road_block:'[חסימת כבישים — ניתוב תנועה נדרש] ',
        power_cut:'[הפסקת חשמל באזור — גנרטורים מופעלים] ',
        comm_fail:'[קשיי תקשורת — עברו לרדיו גיבוי] ',
        hosp_load:'[בתי חולים עמוסים — הפנו לב"ח חלופי] ',
        water_dmg:'[פגיעה בתשתיות מים — הגבלת שימוש] ',
        force_short:'[מחסור בכוחות — בקשת חיזוקים] ',
        media:'[לחץ תקשורתי — דובר רשות נדרש] ',
        coord_fail:'[בעיות תיאום — וועדת תיאום מיידית] ',
      };
      content += ' | ' + (secLabels[sec] || '');
    }

    result.push({
      id: uid(), order: i+1, time: timeStr,
      reporter: best.rep.replace('{city}', ctx.city),
      type: best.type, content, reliability: rel,
      expectedAction: genExpectedAction(best.type, draft.mainScenario),
      notes: '',
    });
  }
  return result;
}

function genExpectedAction(type, scenario) {
  const map = {
    'אירוע':          'פתיחת אירוע, עדכון ראשי מכלולים, פרישת כוחות.',
    'דיווח':          'קליטת מידע, עדכון תמונת מצב, הנחיית מכלולים.',
    'פקודה':          'ביצוע הפקודה, דיווח חזרה על ביצוע.',
    'עדכון':          'עדכון תמונת מצב, תיעוד שינויים.',
    'בקשה':           'הערכת הבקשה, הפניה למקור המאשר, מענה.',
    'מידע מודיעיני':  'הערכת מידע, הפצה רלוונטית, עדכון כוננות.',
    'הנחיה':          'קליטה, הפצה לגורמים הרלוונטיים.',
    'אזהרה':          'הפצת האזהרה לציבור, נקיטת אמצעים מונעים.',
  };
  return map[type] || 'קליטה, הערכה, הנחיית כוחות.';
}

function generatePopulationStory(draft) {
  const {mainScenario, location, populationSize, complexity, durationHours, secondaryScenarios, startTime} = draft;
  const m = ({1:.5,2:1,3:2})[complexity]||1;
  const [startH, startM] = (startTime||'08:00').split(':').map(Number);
  const baseMin = startH*60 + startM;

  const storyIntros = {
    earthquake: `ביום האירוע ${location} פעלה בשגרה רגילה. בשעה ${minsToTime(-18,baseMin)} חשו תושבים רעד ראשוני קל. בשעה ${startTime} פגעה רעידת אדמה בעוצמת ${(5+Math.random()).toFixed(1)} ריכטר ברחבי הרשות וגרמה לנזקים במבנים ובתשתיות.`,
    combat:     `ביום האירוע בשעה ${minsToTime(-12,baseMin)} נשמעה אזעקה ברחבי ${location} בעקבות ירי רקטות. תושבים מיהרו לממ"דים ולמקלטים. בשעה ${startTime} אותרו נקודות פגיעה ישירה ברחבי הרשות.`,
    mass_cas:   `ביום האירוע בשעה ${startTime} דווח על אירוע רב-נפגעים ב${location}. צוותי חירום גויסו לאתר לטיפול בנפגעים ולחיפוש לכודים.`,
    fire:       `ביום האירוע בשעה ${startTime} פרצה שריפה נרחבת ב${location}. הרוח הצפה את האש לאזורים נוספים. תושבים פונו משכונות סמוכות.`,
    flood:      `לאחר גשמים עזים שגרמו לעלייה מהירה בנחלים, בשעה ${startTime} הוצאה התרעת שיטפון ל${location}. כלי רכב ותושבים נלכדו בהצפות.`,
    chemical:   `בשעה ${startTime} אותרה דליפת חומר מסוכן ב${location}. התפשטות הענן הכימי אילצה פינוי מיידי של אזורים סמוכים.`,
    traffic:    `בשעה ${startTime} אירעה תאונת דרכים קשה ב${location}. לכודים ונפגעים בשטח — צוותי חירום גויסו למקום.`,
    infra:      `בשעה ${startTime} קרסה תשתית קריטית ב${location} וגרמה לנזקים נרחבים. צוותי חירום פועלים לשיקום ולסיוע לתושבים.`,
  };
  const intro = storyIntros[mainScenario] || storyIntros.earthquake;

  // תרחישים עם נקודת פגיעה יחידה (טק"ק, דליפה, תאונת דרכים) מקבלים זירה אחת מורכבת;
  // המורכבות מתבטאת בכמות נפגעים/אוכלוסייה בזירה (משתנה m), לא במספר זירות.
  const SINGLE_SITE = ['combat','chemical','traffic','mass_cas'];
  const zoneCount = SINGLE_SITE.includes(mainScenario) ? 1 : (({1:1,2:2,3:3})[complexity]||2);
  const siteTypes = ['בניין מגורים','מוסד ציבורי','בית פרטי','מפעל / מחסן','מוסד חינוכי','בניין משרדים','כולל / ישיבה'];

  const bgByScenario = (street, houseNum, siteType, popAtSite, floors) => ({
    earthquake: `בבניין רחוב ${street} ${houseNum} — ${siteType} בן ${floors} קומות — שהו ${popAtSite} אנשים בזמן הרעידה. חלק מהדיירים היו בממ"דים, אחרים בחדרים פתוחים. בעקבות הרעידה קרס חלק מהמבנה ונחסמו יציאות מהקומות.`,
    combat:     `ברחוב ${street} ${houseNum} — ${siteType} — שהו ${popAtSite} אנשים בזמן האזעקה. לאחר ירידה למקלט, פגעה רקטה ישירות במבנה. חלק מהשוהים לא הספיקו לרדת.`,
    mass_cas:   `באזור רחוב ${street} ${houseNum} — ${siteType} — שהו ${popAtSite} אנשים שנפגעו באירוע. הנפגעים פזורים בשטח רחב.`,
    fire:       `ברחוב ${street} ${houseNum} — ${siteType} — שהו ${popAtSite} אנשים כאשר פרצה האש. חלק פונו בזמן, אחרים נלכדו בקומות עליונות.`,
    flood:      `ברחוב ${street} ${houseNum} — ${siteType} — נלכדו ${popAtSite} אנשים בהצפות. רמות המים עלו מהר ולא אפשרו יציאה.`,
    chemical:   `ברחוב ${street} ${houseNum} — ${siteType} — היו ${popAtSite} אנשים בזמן הדליפה. חלק קיבלו הוראה להתבצר, אחרים חולצו.`,
    traffic:    `בכביש סמוך לרחוב ${street} נפגעו ${popAtSite} אנשים שהיו בכלי הרכב. מספר לכודים בשברי הרכבים.`,
    infra:      `ברחוב ${street} ${houseNum} — ${siteType} — שהו ${popAtSite} אנשים בעת קריסת התשתית. חלק נפגעו ישירות.`,
  })[mainScenario] || `ברחוב ${street} ${houseNum} — ${siteType} — שהו ${popAtSite} אנשים בעת האירוע.`;

  let zonesSections = '';
  let totKilled=0, totSerious=0, totMod=0, totLight=0, totTrapped=0, totMissing=0;
  const summaryRows = [];

  for (let z=1; z<=zoneCount; z++) {
    const street   = pickStreet(location);
    const houseNum = rnd(1,80);
    const siteType = pick(siteTypes);
    const floors   = rnd(2,6);
    const popAtSite= rnd(8,35) * Math.max(1,Math.round(m));
    const reportTime = minsToTime(rnd(3,18), baseMin);

    const killed   = Math.random()<.35 ? rnd(1,3)*Math.ceil(m) : 0;
    const serious  = rnd(1,4)*Math.ceil(m);
    const mod      = rnd(2,6)*Math.ceil(m);
    const light    = rnd(3,10)*Math.ceil(m);
    const trapped  = rnd(2,8)*Math.ceil(m);
    const missing  = rnd(1,5)*Math.ceil(m);

    totKilled  += killed;
    totSerious += serious;
    totMod     += mod;
    totLight   += light;
    totTrapped += trapped;
    totMissing += missing;

    let floorLines = '';
    let remaining = popAtSite;
    for (let f=1; f<=Math.min(floors,4); f++) {
      const fp = f<floors ? rnd(2,Math.max(3,Math.ceil(remaining/2))) : remaining;
      remaining = Math.max(0, remaining-fp);
      const note = Math.random()<.4 ? pick([' (כולל קשישים)',' (ילדים)',' (עובדים)',' (מוגבלי ניידות)']) : '';
      floorLines += `  קומה ${f}: ${fp} נפשות${note}\n`;
    }

    const endTime = minsToTime(rnd(45, durationHours*60-5), baseMin);
    summaryRows.push({z, street, houseNum, reportTime, siteType, popAtSite, killed, injured:serious+mod+light, trapped, endTime});

    zonesSections += `
═══════════════════════════════════════════
זירה ${z}: רחוב ${street} ${houseNum}
═══════════════════════════════════════════
מיקום:              רח' ${street} ${houseNum}, ${location}
שעת דיווח ראשוני:  ${reportTime}
סוג אתר:           ${siteType}
אוכלוסייה באתר:    ${popAtSite} נפשות

רקע:
${bgByScenario(street, houseNum, siteType, popAtSite, floors)}

אוכלוסייה בזירה לפי קומות:
${floorLines}
סיכום נפגעים:
  • הרוגים:           ${killed}
  • פצועים קשים:      ${serious}
  • פצועים בינוניים:  ${mod}
  • פצועים קלים:      ${light}
  • לכודים:           ${trapped}
  • נעדרים:           ${missing}
`;
  }

  const summaryHeader = `${'─'.repeat(80)}\n זירה        | מיקום                 | דיווח  | סוג אתר          | אוכ' | הרוגים | פצועים | לכודים\n${'─'.repeat(80)}`;
  const summaryBody = summaryRows.map(r =>
    ` זירה ${r.z}      | רח' ${r.street} ${r.houseNum}`.padEnd(24) +
    `| ${r.reportTime}  | ${r.siteType.slice(0,16).padEnd(16)} | ${String(r.popAtSite).padEnd(4)} | ${String(r.killed).padEnd(6)} | ${String(r.injured).padEnd(6)} | ${r.trapped}`
  ).join('\n');
  const summaryFooter = `${'─'.repeat(80)}\nסה"כ: ${totKilled} הרוגים | ${totSerious+totMod+totLight} פצועים (${totSerious} קשים / ${totMod} בינוניים / ${totLight} קלים) | ${totTrapped} לכודים | ${totMissing} נעדרים`;

  const secText = secondaryScenarios.length
    ? '\n\nאתגרים משניים:\n' + secondaryScenarios.map(s=>{
        const obj = SEC_SCENARIOS.find(x=>x.id===s);
        return `• ${obj?obj.name:s}`;
      }).join('\n')
    : '';

  return `══════════════════════════════════════════════
סיפור כללי
══════════════════════════════════════════════
${intro}

אוכלוסיית הרשות: ${populationSize.toLocaleString('he-IL')} תושבים
כ-${Math.round(populationSize*0.15).toLocaleString('he-IL')} אוכלוסיות רגישות (קשישים, ילדים, אנשים עם מוגבלויות)

מרכזי מידע ותמיכה שנפתחו:
• מוקד 106 — ${pick(['בניין העירייה','מרכז קהילתי','אולם ספורט'])}
• מרכז משפחות — סמוך לאתר, בניהול הרשות המקומית
• ${Math.max(2,Math.round(populationSize/5000))} מרכזי כינוס ופינוי${secText}
${zonesSections}
══════════════════════════════════════════════
טבלת סיכום זירות
══════════════════════════════════════════════
${summaryHeader}
${summaryBody}
${summaryFooter}

משך התרגיל: ${durationHours} שעות | רמת מורכבות: ${{1:'קלה',2:'בינונית',3:'גבוהה'}[complexity]}`;
}

function generateAnchorList(draft, count=20) {
  const statuses = [
    'ידוע בטוח','ידוע בטוח','ידוע בטוח','ידוע בטוח','ידוע בטוח',
    'פונה','פונה','מאותר','נעדר',
    'פצוע קל','פצוע בינוני','פצוע קשה',
    'לכוד','הרוג','חולץ',
  ];
  const list = [];
  for (let i=0;i<count;i++) {
    const isMale = Math.random() > .45;
    const isMinor = Math.random() < .18;
    const firstName = isMale ? pick(NAMES_F) : pick(NAMES_W);
    const lastName = pick(LAST_NAMES);
    list.push({
      id: uid(),
      idNum: '0' + rnd(10000000,99999999),
      firstName,
      lastName,
      gender: isMale ? 'ז' : 'נ',
      isMinor: isMinor ? 'כן' : 'לא',
      street: pickStreet(draft.location),
      houseNum: rnd(1,120),
      entrance: Math.random() > .55 ? pick(['א','ב','ג','ד']) : '',
      apt: rnd(1,40),
      phone: '05'+rnd(0,9)+'-'+rnd(1000000,9999999),
      status: pick(statuses),
      notes: '',
    });
  }
  return list;
}

function generateExpectations(draft) {
  const selectedUnits = UNITS.filter(u => draft.units.includes(u.id));
  const generic = [
    'קליטת הזרמות ועדכון תמונת מצב בזמן אמת.',
    'יישום נוהלי החירום בהתאם לסוג האירוע.',
    'תיאום עם גורמים נוספים וניהול תקשורת פנים-ארגונית.',
    'ניהול רישום ותיעוד מדויק של כל פעולה.',
    'הפצת מידע ומשוב לגורמים הרלוונטיים.',
  ];
  const unitSpecific = {
    home_front: 'ניהול כולל של האירוע, פיקוד על כוחות, הפעלת נוהלי פקע"ר.',
    fire_dept:  'חילוץ מהריסות, כיבוי, הצלה, קביעת תבנה.',
    mda:        'טיפול בנפגעים, פינוי, ניהול MCEI, עדכון מצב רפואי.',
    police:     'סדר ציבורי, חסימת אזורים, חקירה ראשונית, בקרת כניסה.',
    idf:        'חיזוק כוחות, תמיכה לוגיסטית, פעילות מבצעית.',
    authority:  'ניהול עירוני, פתיחת מרכזי קבלה, עדכון ציבורי, רווחה.',
    water_corp: 'בדיקת צנרת, תיקון שברים, הפסקת אספקה מסוכנת.',
    electric:   'ניתוק רשת מסוכנת, שיקום, הפעלת גנרטורים.',
    hospital:   'קבלת נפגעים, טריאז\', ניתוחים, עדכון משפחות.',
    nafa_hq:    'ניהול מידע מרחבי, תיאום בין-ארגוני, הפקת דוחות.',
    pop_officer:'ניהול מודיעין אוכלוסייה, עדכון אנשור ורשימות עוגן.',
    yaklr:      'ניהול קשר, ניהול יומן תרגיל, הפצת הנחיות.',
    municipal:  'תיאום בין כל מכלולי הרשות, ניהול מרכז שליטה.',
    social:     'מענה לאוכלוסיות רגישות, פתיחת מוקדי תמיכה.',
  };
  return selectedUnits.map(u=>({
    unitId: u.id,
    unitName: u.name,
    unitIcon: u.icon,
    expectation: unitSpecific[u.id] || generic[Math.floor(Math.random()*generic.length)],
  }));
}

function emptyDraft() {
  const today = new Date().toISOString().slice(0,10);
  return {
    id: uid(),
    createdAt: today,
    name: '',
    date: today,
    location: '',
    exerciseType: EXERCISE_TYPES[0],
    complexity: 2,
    durationHours: 4,
    startTime: '08:00',
    mainScenario: '',
    secondaryScenarios: [],
    units: [],
    injCount: 12,
    reliabilityProfile: 'mixed',
    populationSize: 50000,
    populationStory: '',
    anchorList: [],
    anchorCount: 20,
    injections: [],
    authorityExpect: 'ניהול שוטף ומתואם של האירוע, קבלת החלטות בזמן אמת, תיאום בין כל המכלולים ושמירה על רציפות תפקודית.',
    unitExpectations: [],
    mentorHighlights: '',
    controllerHighlights: '',
    evaluationMetrics: [],
    trainingObjectives: [],
  };
}

/* ═══════════════════════════════════════════════════
   VUE TEMPLATE
═══════════════════════════════════════════════════ */
const TEMPLATE = /* html */`
<div>
  <!-- TOASTS -->
  <div class="toast-container">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="'toast-'+t.type">{{ t.msg }}</div>
  </div>

  <!-- ── HOME ── -->
  <div v-if="view==='home'" class="home-wrap">
    <div class="home-panel">
      <div class="home-hero">
          <h1 class="home-title">מחולל תרגילים</h1>
        <p class="home-sub">כלי מקצועי לבניית תיקי תרגיל מלאים למפקדות נפה, רשויות מקומיות, חונכים ובקרים</p>
      </div>
      <div class="home-actions">
        <button class="home-btn home-btn-primary" @click="startNew">
          צור תרגיל חדש
        </button>
        <button class="home-btn home-btn-secondary" @click="view='exercises'">
          תרגילים שמורים ({{ exercises.length }})
        </button>
      </div>
      <div style="margin-top:16px;display:flex;justify-content:center;align-items:center;gap:12px">
        <button class="btn btn-ghost btn-sm" @click="showSettings=true" style="font-size:13px">
          הגדרות API
        </button>
        <span v-if="settings.apiKey && settings.useApi" style="font-size:12px;color:#0f7b0f;font-weight:600">
          ✓ Claude AI פעיל
        </span>
        <span v-else style="font-size:12px;color:#8a8886">
          (ללא AI — שימוש בתבניות)
        </span>
      </div>
      <div class="home-features">
        <div class="feature-card"><div class="feature-title">אשף שלבים</div><div class="feature-desc">8 תרחישים, עד 3 אתגרים משניים</div></div>
        <div class="feature-card"><div class="feature-title">הזרמות אוטומטיות</div><div class="feature-desc">לוח הזרמות מלא עם זמנים ומדווחים</div></div>
        <div class="feature-card"><div class="feature-title">סיפור אוכלוסייה</div><div class="feature-desc">סיפור + רשימת עוגן סינתטית</div></div>
        <div class="feature-card"><div class="feature-title">ציפיות ודגשים</div><div class="feature-desc">לכל מכלול, חונך ובקר</div></div>
        <div class="feature-card"><div class="feature-title">ייצוא CSV</div><div class="feature-desc">לוח הזרמות לאקסל</div></div>
        <div class="feature-card"><div class="feature-title">ייצוא Word</div><div class="feature-desc">תיק תרגיל מלא להפצה</div></div>
      </div>
      <div class="home-legal">
        <p>כל הזכויות במערכת שמורות לדניאל אוחיון.</p>
        <p>העלאת חומרים למערכת, לרבות בדיקת סיווגם והתאמתם לשימוש, הינה באחריות המשתמש בלבד. אין להעלות חומרים בניגוד לדין, להנחיות אבטחת מידע או לנהלים החלים על המשתמש.</p>
      </div>
    </div>
  </div>

  <!-- ── EXERCISES LIST ── -->
  <div v-else-if="view==='exercises'" class="page-wrap">
    <div class="page-header">
      <button class="back-btn" @click="view='home'">← חזרה</button>
      <span class="page-title">תרגילים שמורים</span>
      <button class="btn btn-primary" @click="startNew">חדש</button>
    </div>
    <div v-if="exercises.length===0" class="card">
      <div class="empty-state">
        <div class="empty-title">אין תרגילים שמורים עדיין</div>
        <div class="empty-sub mb-4">צור תרגיל חדש כדי להתחיל</div>
        <button class="btn btn-primary" @click="startNew">צור תרגיל ראשון</button>
      </div>
    </div>
    <div v-else>
      <div style="margin-bottom:16px">
        <input v-model="searchQ" class="form-control" placeholder="חיפוש לפי שם / מיקום..." style="max-width:340px" />
      </div>
      <div class="exercises-grid">
        <div v-for="ex in filteredExercises" :key="ex.id" class="ex-card">
          <div class="ex-card-top" @click="openExercise(ex)">
            <div class="ex-type-tag">{{ ex.exerciseType }}</div>
            <div class="ex-name">{{ ex.name || '(ללא שם)' }}</div>
            <div class="ex-location">{{ ex.location || '—' }} &nbsp;·&nbsp; {{ ex.date }}</div>
          </div>
          <div class="ex-card-mid">
            <div class="ex-stat"><strong>{{ ex.injections.length }}</strong> הזרמות</div>
            <div class="ex-stat"><strong>{{ ex.durationHours }}ש'</strong> משך</div>
            <div class="ex-stat"><strong>{{ scenarioLabel(ex.mainScenario) }}</strong></div>
            <div class="ex-stat"><strong>{{ complexityLabel(ex.complexity) }}</strong></div>
          </div>
          <div class="ex-card-actions">
            <button class="btn btn-secondary btn-sm" @click="duplicateExercise(ex.id)">שכפל</button>
            <button class="btn btn-danger btn-sm" @click="confirmDelete(ex.id)">מחק</button>
            <button class="btn btn-primary btn-sm" @click="openExercise(ex)">פתח ←</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── WIZARD ── -->
  <div v-else-if="view==='wizard'" class="page-wrap">
    <div class="page-header">
      <button class="back-btn" @click="confirmLeaveWizard">← יציאה</button>
      <span class="page-title">יצירת תרגיל חדש</span>
    </div>
    <!-- Progress -->
    <div class="progress-wrap">
      <div class="progress-steps">
        <template v-for="(s,i) in wizardSteps" :key="i">
          <div class="prog-step">
            <div class="prog-circle" :class="step>i+1?'done':step===i+1?'active':'todo'">
              <span v-if="step>i+1">✓</span><span v-else>{{ i+1 }}</span>
            </div>
            <span class="prog-label" :class="step>i+1?'done':step===i+1?'active':''">{{ s }}</span>
          </div>
          <div v-if="i<wizardSteps.length-1" class="prog-divider" :class="step>i+1?'done':''"></div>
        </template>
      </div>
    </div>

    <!-- STEP 1: Basic info -->
    <div v-if="step===1" class="wizard-card">
      <div class="wizard-body">
        <div class="story-section-title">פרמטרים בסיסיים</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">שם התרגיל *</label>
            <input v-model="draft.name" class="form-control" placeholder="לדוגמה: תרגיל מטה ניר אליהו 2025" />
          </div>
          <div class="form-group">
            <label class="form-label">תאריך התרגיל</label>
            <input v-model="draft.date" type="date" class="form-control" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">מיקום / רשות *</label>
            <input v-model="draft.location" class="form-control" placeholder="שם הרשות / יישוב / אזור" />
          </div>
          <div class="form-group">
            <label class="form-label">סוג תרגיל</label>
            <select v-model="draft.exerciseType" class="form-control">
              <option v-for="t in EXERCISE_TYPES" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">שעת פתיחה</label>
            <input v-model="draft.startTime" type="time" class="form-control" />
          </div>
          <div class="form-group">
            <label class="form-label">משך (שעות): {{ draft.durationHours }}</label>
            <div class="slider-wrap">
              <input type="range" min="1" max="12" v-model.number="draft.durationHours" class="slider" />
              <div class="slider-labels"><span>1</span><span>6</span><span>12</span></div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">גודל אוכלוסייה</label>
            <input v-model.number="draft.populationSize" type="number" class="form-control" min="1000" step="1000" />
          </div>
        </div>
        <div class="form-group mt-3">
          <label class="form-label">רמת מורכבות</label>
          <div class="chip-grid">
            <div v-for="(lbl,i) in ['קלה (מכלול 1)','בינונית (מכלולים 2-3)','גבוהה (מלא)']" :key="i"
                 class="sel-chip" :class="draft.complexity===i+1?'selected':''" @click="draft.complexity=i+1">
              {{ lbl }}
            </div>
          </div>
        </div>
      </div>
      <div class="wizard-footer">
        <span class="text-muted">שלב 1 מתוך {{ wizardSteps.length }}</span>
        <button class="btn btn-primary" @click="nextStep" :disabled="!draft.name||!draft.location">המשך ←</button>
      </div>
    </div>

    <!-- STEP 2: Scenario -->
    <div v-if="step===2" class="wizard-card">
      <div class="wizard-body">
        <div class="story-section-title">תרחיש ראשי</div>
        <div class="scenario-grid mb-6">
          <div v-for="s in SCENARIOS" :key="s.id" class="scenario-card"
               :class="draft.mainScenario===s.id?'selected':''" @click="draft.mainScenario=s.id">
            <div class="scenario-name">{{ s.name }}</div>
          </div>
        </div>
        <div class="divider"></div>
        <div class="story-section-title mt-4">תרחישים משניים (עד 3)</div>
        <div class="chip-grid">
          <div v-for="s in SEC_SCENARIOS" :key="s.id"
               class="sel-chip" :class="draft.secondaryScenarios.includes(s.id)?'secondary-selected':''"
               @click="toggleSec(s.id)">
            {{ s.name }}
            <span v-if="draft.secondaryScenarios.includes(s.id)" style="font-weight:800;color:#9d5d00">✓</span>
          </div>
        </div>
        <div v-if="draft.secondaryScenarios.length>0" class="info-box mt-3">
          <span>{{ draft.secondaryScenarios.length }} תרחיש/ים משניים נבחרו. הם ייכנסו ללוח ההזרמות כאתגרים בתוך האירוע הראשי.</span>
        </div>
      </div>
      <div class="wizard-footer">
        <button class="btn btn-secondary" @click="step--">← חזרה</button>
        <button class="btn btn-primary" @click="nextStep" :disabled="!draft.mainScenario">המשך ←</button>
      </div>
    </div>

    <!-- STEP 3: Units -->
    <div v-if="step===3" class="wizard-card">
      <div class="wizard-body">
        <div class="story-section-title">מכלולים משתתפים</div>
        <p class="text-muted mb-4">בחר את הגורמים שמשתתפים בתרגיל. הם ישמשו ליצירת ציפיות ודגשים.</p>
        <div class="chip-grid">
          <div v-for="u in UNITS" :key="u.id"
               class="sel-chip" :class="draft.units.includes(u.id)?'selected-green':''"
               @click="toggleUnit(u.id)">
            {{ u.name }}
            <span v-if="draft.units.includes(u.id)" style="font-weight:800;color:#0f7b0f">✓</span>
          </div>
        </div>
        <div class="info-box mt-4" v-if="draft.units.length>0">
          <span>{{ draft.units.length }} מכלולים נבחרו.</span>
        </div>
      </div>
      <div class="wizard-footer">
        <button class="btn btn-secondary" @click="step--">← חזרה</button>
        <button class="btn btn-primary" @click="nextStep">המשך ←</button>
      </div>
    </div>

    <!-- STEP 4: Injection params -->
    <div v-if="step===4" class="wizard-card">
      <div class="wizard-body">
        <div class="story-section-title">פרמטרי הזרמות</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">מספר הזרמות: <strong>{{ draft.injCount }}</strong></label>
            <div class="number-input-wrap">
              <button class="num-btn" @click="draft.injCount=Math.max(4,draft.injCount-1)">−</button>
              <span class="num-val">{{ draft.injCount }}</span>
              <button class="num-btn" @click="draft.injCount=Math.min(40,draft.injCount+1)">+</button>
            </div>
            <div class="form-hint">מומלץ: {{ Math.round(draft.durationHours*2.5) }}–{{ Math.round(draft.durationHours*4) }} הזרמות ל-{{ draft.durationHours }} שעות</div>
          </div>
          <div class="form-group">
            <label class="form-label">פרופיל אמינות מידע</label>
            <div class="chip-grid mt-2">
              <div v-for="p in [{id:'uniform',label:'אחיד — כולן A/B'},{id:'mixed',label:'מעורב — A עד D'},{id:'degrading',label:'מידרדר — טוב להרע'}]"
                   :key="p.id" class="sel-chip" :class="draft.reliabilityProfile===p.id?'selected':''"
                   @click="draft.reliabilityProfile=p.id" style="font-size:12px">
                {{ p.label }}
              </div>
            </div>
          </div>
        </div>
        <div class="info-box mt-3">
          <span>⏱️</span>
          <span>קצב הזרמה ממוצע: <strong>כל {{ Math.round(draft.durationHours*60/draft.injCount) }} דקות</strong> — {{ draft.injCount }} הזרמות בפרק של {{ draft.durationHours }} שעות.</span>
        </div>
      </div>
      <div class="wizard-footer">
        <button class="btn btn-secondary" @click="step--">← חזרה</button>
        <button class="btn btn-primary" @click="runGenerate">
          <span v-if="settings.apiKey && settings.useApi">צור עם AI ←</span>
          <span v-else>צור הזרמות ←</span>
        </button>
      </div>
    </div>

    <!-- STEP 5: Edit injections -->
    <div v-if="step===5" class="wizard-card">
      <div class="card-header">
        <span class="card-title">לוח הזרמות — {{ draft.injections.length }} הזרמות</span>
        <button class="btn btn-secondary btn-sm" @click="runGenerate">ייצר מחדש</button>
      </div>
      <div class="inj-table-wrap" style="max-height:460px;overflow-y:auto">
        <table class="inj-table">
          <thead><tr><th>#</th><th>שעה</th><th>גורם מדווח</th><th>סוג</th><th>תוכן ההזרמה</th><th>פעולה צפויה</th><th>אמינות</th><th>עריכה</th></tr></thead>
          <tbody>
            <tr v-for="inj in draft.injections" :key="inj.id" :class="editingInjId===inj.id?'inj-row-edit':''">
              <td><div class="inj-order">{{ inj.order }}</div></td>
              <td><div class="inj-time">{{ inj.time }}</div></td>
              <td style="font-size:12px;font-weight:600;white-space:nowrap">{{ inj.reporter }}</td>
              <td>
                <span class="badge" :class="injTypeBadge(inj.type)">{{ inj.type }}</span>
              </td>
              <td class="inj-content">
                <div v-if="editingInjId!==inj.id">{{ inj.content }}</div>
                <textarea v-else v-model="inj.content" class="form-control" style="min-height:70px;font-size:12px"></textarea>
              </td>
              <td class="inj-action">
                <div v-if="editingInjId!==inj.id">{{ inj.expectedAction }}</div>
                <input v-else v-model="inj.expectedAction" class="form-control" style="font-size:11px" />
              </td>
              <td>
                <span v-if="editingInjId!==inj.id">
                  <span class="rel-dot" :style="{background:relColor(inj.reliability)}"></span>{{ inj.reliability }}
                </span>
                <select v-else v-model="inj.reliability" class="form-control" style="width:70px;font-size:11px">
                  <option v-for="r in RELIABILITY" :key="r.key" :value="r.key">{{ r.key }}</option>
                </select>
              </td>
              <td>
                <button v-if="editingInjId!==inj.id" class="btn btn-ghost btn-sm" @click="editingInjId=inj.id">ערוך</button>
                <button v-else class="btn btn-success btn-sm" @click="editingInjId=null">✓</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="wizard-footer">
        <button class="btn btn-secondary" @click="step--">← חזרה</button>
        <button class="btn btn-primary" @click="nextStep">המשך ←</button>
      </div>
    </div>

    <!-- STEP 6: Population story -->
    <div v-if="step===6" class="wizard-card">
      <div class="wizard-body">
        <div class="story-section-title">סיפור האוכלוסייה</div>
        <div class="form-group">
          <div style="display:flex;justify-content:flex-end;margin-bottom:8px">
            <button class="btn btn-secondary btn-sm" @click="draft.populationStory=generatePopulationStory(draft)">צור מחדש</button>
          </div>
          <textarea v-model="draft.populationStory" class="form-control" style="min-height:260px;font-size:13px;line-height:1.8"></textarea>
        </div>
        <div class="divider"></div>
        <div class="story-section-title">רשימת עוגן ({{ draft.anchorList.length }} תושבים)</div>
        <div style="display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-bottom:8px">
          <label class="text-muted" style="display:flex;align-items:center;gap:6px">
            גודל הרשימה:
            <input type="number" v-model.number="draft.anchorCount" min="1" max="200" class="form-control" style="width:80px;padding:5px 8px" />
          </label>
          <button class="btn btn-secondary btn-sm" @click="draft.anchorList=generateAnchorList(draft,draft.anchorCount||20)">צור רשימה</button>
        </div>
        <div style="overflow-x:auto">
          <table class="anchor-table">
            <thead><tr><th>#</th><th>שם משפחה</th><th>שם פרטי</th><th>מגדר</th><th>ת.ז.</th><th>האם קטן</th><th>רחוב</th><th>מס'</th><th>כניסה</th><th>דירה</th><th>טלפון</th><th>סטטוס</th></tr></thead>
            <tbody>
              <tr v-for="(a,i) in draft.anchorList.slice(0,10)" :key="a.id">
                <td>{{ i+1 }}</td>
                <td style="font-weight:600">{{ a.lastName }}</td>
                <td>{{ a.firstName }}</td>
                <td style="text-align:center">{{ a.gender }}</td>
                <td style="direction:ltr;font-size:11px">{{ a.idNum }}</td>
                <td style="text-align:center">{{ a.isMinor }}</td>
                <td>{{ a.street }}</td>
                <td>{{ a.houseNum }}</td>
                <td>{{ a.entrance }}</td>
                <td>{{ a.apt }}</td>
                <td style="direction:ltr;font-size:11px">{{ a.phone }}</td>
                <td><span class="badge" :class="anchorBadge(a.status)">{{ a.status }}</span></td>
              </tr>
              <tr v-if="draft.anchorList.length>10"><td colspan="12" style="text-align:center;color:#8a8886;font-size:11px">... ועוד {{ draft.anchorList.length-10 }} רשומות</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="wizard-footer">
        <button class="btn btn-secondary" @click="step--">← חזרה</button>
        <button class="btn btn-primary" @click="nextStep">המשך ←</button>
      </div>
    </div>

    <!-- STEP 7: Expectations -->
    <div v-if="step===7" class="wizard-card">
      <div class="wizard-body">
        <div class="story-section-title">ציפיות ודגשים</div>
        <div class="form-group">
          <label class="form-label">ציפיות מהרשות / מפקד (כולל)</label>
          <textarea v-model="draft.authorityExpect" class="form-control" style="min-height:80px"></textarea>
        </div>
        <div class="divider"></div>
        <div v-if="draft.unitExpectations.length>0">
          <div class="form-label mb-2">ציפיות לפי מכלול:</div>
          <div v-for="ue in draft.unitExpectations" :key="ue.unitId" class="form-group">
            <label class="form-label" style="font-size:12px">{{ ue.unitName }}</label>
            <input v-model="ue.expectation" class="form-control" />
          </div>
        </div>
        <div class="divider"></div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">דגשי חונך</label>
            <textarea v-model="draft.mentorHighlights" class="form-control" style="min-height:100px"
              placeholder="נקודות להדגשה בפני החונך לפני ובמהלך התרגיל..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">דגשי בקר</label>
            <textarea v-model="draft.controllerHighlights" class="form-control" style="min-height:100px"
              placeholder="נקודות בקרה, מדדי הערכה, דברים לבדוק..."></textarea>
          </div>
        </div>
      </div>
      <div class="wizard-footer">
        <button class="btn btn-secondary" @click="step--">← חזרה</button>
        <button class="btn btn-primary btn-lg" @click="finalizeExercise">שמור תרגיל ←</button>
      </div>
    </div>
  </div>

  <!-- ── DETAIL VIEW ── -->
  <div v-else-if="view==='detail' && current" class="page-wrap">
    <div class="page-header">
      <button class="back-btn" @click="view='exercises'">← חזרה לרשימה</button>
      <span class="page-title" style="flex:1">{{ current.name }}</span>
      <div class="btn-group">
        <button class="btn btn-secondary btn-sm" @click="exportCSV">CSV</button>
        <button class="btn btn-secondary btn-sm" @click="exportWord">Word</button>
        <button class="btn btn-ghost btn-sm" @click="window.print()">הדפסה</button>
      </div>
    </div>
    <!-- Hero -->
    <div class="detail-hero">
      <div class="detail-type">{{ current.exerciseType }}</div>
      <div class="detail-name">{{ current.name }}</div>
      <div class="detail-meta">
        <div class="detail-meta-item">{{ current.location }}</div>
        <div class="detail-meta-item">{{ current.date }}</div>
        <div class="detail-meta-item">⏰ {{ current.startTime }} ({{ current.durationHours }} שעות)</div>
        <div class="detail-meta-item">{{ scenarioLabel(current.mainScenario) }}</div>
        <div class="detail-meta-item">{{ complexityLabel(current.complexity) }}</div>
      </div>
      <div class="detail-stats">
        <div class="detail-stat"><div class="detail-stat-num">{{ current.injections.length }}</div><div class="detail-stat-lbl">הזרמות</div></div>
        <div class="detail-stat"><div class="detail-stat-num">{{ current.units.length }}</div><div class="detail-stat-lbl">מכלולים</div></div>
        <div class="detail-stat"><div class="detail-stat-num">{{ current.anchorList.length }}</div><div class="detail-stat-lbl">עוגנים</div></div>
        <div class="detail-stat"><div class="detail-stat-num">{{ current.populationSize.toLocaleString('he-IL') }}</div><div class="detail-stat-lbl">אוכלוסייה</div></div>
      </div>
    </div>
    <!-- Tabs -->
    <div class="detail-tabs">
      <button class="dtab" :class="detailTab==='injections'?'active':''" @click="detailTab='injections'">לוח הזרמות</button>
      <button class="dtab" :class="detailTab==='story'?'active':''" @click="detailTab='story'">סיפור אוכלוסייה</button>
      <button class="dtab" :class="detailTab==='anchors'?'active':''" @click="detailTab='anchors'">🆔 רשימת עוגן</button>
      <button class="dtab" :class="detailTab==='expect'?'active':''" @click="detailTab='expect'">ציפיות ודגשים</button>
      <button class="dtab" :class="detailTab==='export'?'active':''" @click="detailTab='export'">ייצוא</button>
      <button class="dtab" :class="detailTab==='pptx'?'active':''" @click="detailTab='pptx'">מצגת</button>
    </div>

    <!-- Tab: Injections -->
    <div v-if="detailTab==='injections'" class="card">
      <div class="card-header">
        <span class="card-title">לוח הזרמות — {{ current.injections.length }} הזרמות</span>
        <div class="btn-group">
          <span class="text-muted" style="align-self:center">{{ current.startTime }} — {{ endTime }}</span>
        </div>
      </div>
      <div class="inj-table-wrap">
        <table class="inj-table">
          <thead><tr><th>#</th><th>שעה</th><th>גורם מדווח</th><th>סוג</th><th>תוכן ההזרמה</th><th>פעולה צפויה</th><th>אמינות</th></tr></thead>
          <tbody>
            <tr v-for="inj in current.injections" :key="inj.id">
              <td><div class="inj-order">{{ inj.order }}</div></td>
              <td><div class="inj-time">{{ inj.time }}</div></td>
              <td style="font-size:12px;font-weight:600;max-width:120px">{{ inj.reporter }}</td>
              <td><span class="badge" :class="injTypeBadge(inj.type)">{{ inj.type }}</span></td>
              <td class="inj-content">{{ inj.content }}</td>
              <td class="inj-action">{{ inj.expectedAction }}</td>
              <td>
                <span class="badge" :style="{background:relColor(inj.reliability)+'22',color:relColor(inj.reliability)}">
                  {{ inj.reliability }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab: Story -->
    <div v-if="detailTab==='story'" class="card">
      <div class="card-header"><span class="card-title">סיפור האוכלוסייה</span></div>
      <div class="card-body">
        <pre class="story-text">{{ current.populationStory }}</pre>
      </div>
    </div>

    <!-- Tab: Anchors -->
    <div v-if="detailTab==='anchors'" class="card">
      <div class="card-header">
        <span class="card-title">🆔 רשימת עוגן — {{ current.anchorList.length }} תושבים</span>
      </div>
      <div style="overflow-x:auto">
        <table class="anchor-table">
          <thead><tr><th>#</th><th>שם משפחה</th><th>שם פרטי</th><th>מגדר</th><th>ת.ז.</th><th>האם קטן</th><th>רחוב</th><th>מס'</th><th>כניסה</th><th>דירה</th><th>טלפון</th><th>סטטוס</th></tr></thead>
          <tbody>
            <tr v-for="(a,i) in current.anchorList" :key="a.id">
              <td style="color:#8a8886">{{ i+1 }}</td>
              <td style="font-weight:600">{{ a.lastName }}</td>
              <td>{{ a.firstName }}</td>
              <td style="text-align:center">{{ a.gender }}</td>
              <td style="direction:ltr;font-size:11px">{{ a.idNum }}</td>
              <td style="text-align:center">{{ a.isMinor }}</td>
              <td>{{ a.street }}</td>
              <td>{{ a.houseNum }}</td>
              <td>{{ a.entrance }}</td>
              <td>{{ a.apt }}</td>
              <td style="direction:ltr;font-size:11px">{{ a.phone }}</td>
              <td><span class="badge" :class="anchorBadge(a.status)">{{ a.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab: Expectations -->
    <div v-if="detailTab==='expect'">
      <div class="exp-section">
        <div class="exp-header">ציפיות מהרשות (כולל)</div>
        <div class="exp-body"><p style="line-height:1.8">{{ current.authorityExpect }}</p></div>
      </div>
      <div v-if="current.unitExpectations.length>0" class="exp-section">
        <div class="exp-header">ציפיות לפי מכלול</div>
        <div class="exp-body">
          <div v-for="ue in current.unitExpectations" :key="ue.unitId" class="exp-unit-row">
            <div class="exp-unit-name">{{ ue.unitName }}</div>
            <div class="exp-unit-text">{{ ue.expectation }}</div>
          </div>
        </div>
      </div>
      <div class="grid-2">
        <div class="exp-section" v-if="current.mentorHighlights">
          <div class="exp-header">דגשי חונך</div>
          <div class="exp-body"><pre class="story-text" style="font-size:13px">{{ current.mentorHighlights }}</pre></div>
        </div>
        <div class="exp-section" v-if="current.controllerHighlights">
          <div class="exp-header">דגשי בקר</div>
          <div class="exp-body"><pre class="story-text" style="font-size:13px">{{ current.controllerHighlights }}</pre></div>
        </div>
      </div>
    </div>

    <!-- Tab: Export -->
    <!-- Tab: PPTX -->
    <div v-if="detailTab==='pptx'">
      <div class="card">
        <div class="card-header">
          <span class="card-title">מצגת תדריך לתרגיל</span>
          <button class="btn btn-primary" @click="exportPPTX" :disabled="pptxLoading">
            <span v-if="pptxLoading">⏳ מייצר...</span>
            <span v-else>הורד PowerPoint</span>
          </button>
        </div>
        <div class="card-body">
          <p class="text-muted" style="margin-bottom:16px">המצגת מכילה את השקפים הבאים:</p>
          <div style="display:flex;flex-direction:column;gap:6px">
            <div class="slide-row">
              <span class="slide-num">1</span>
              <span class="slide-name">שקף כותרת</span>
              <span class="text-muted slide-info">{{ current.name }} — {{ current.exerciseType }}</span>
            </div>
            <div class="slide-row">
              <span class="slide-num">2</span>
              <span class="slide-name">פרטי התרגיל</span>
              <span class="text-muted slide-info">מיקום, תאריך, מכלולים, מורכבות</span>
            </div>
            <div class="slide-row">
              <span class="slide-num">3</span>
              <span class="slide-name">תרחיש</span>
              <span class="text-muted slide-info">{{ scenarioLabel(current.mainScenario) }}</span>
            </div>
            <div class="slide-row">
              <span class="slide-num">4</span>
              <span class="slide-name">ציר הזמן</span>
              <span class="text-muted slide-info">{{ current.startTime }} – {{ endTime }} ({{ current.durationHours }} שעות) · {{ current.injections.length }} הזרמות</span>
            </div>
            <div class="slide-row">
              <span class="slide-num">5</span>
              <span class="slide-name">כללי התרגיל</span>
              <span class="text-muted slide-info">הנחיות כלליות למשתתפים</span>
            </div>
            <div class="slide-row slide-row-accent">
              <span class="slide-num slide-num-accent">6–{{ 5+Math.ceil(current.injections.length/5) }}</span>
              <span class="slide-name">לוח הזרמות</span>
              <span class="text-muted slide-info">{{ current.injections.length }} הזרמות · {{ Math.ceil(current.injections.length/5) }} שקפים</span>
            </div>
            <div v-if="current.populationStory" class="slide-row">
              <span class="slide-num slide-num-muted">+1</span>
              <span class="slide-name">סיפור האוכלוסייה</span>
              <span class="text-muted slide-info">תמצית לתדריך</span>
            </div>
            <div v-if="current.unitExpectations.length" class="slide-row">
              <span class="slide-num slide-num-muted">+1</span>
              <span class="slide-name">ציפיות לפי מכלול</span>
              <span class="text-muted slide-info">{{ current.unitExpectations.length }} מכלולים</span>
            </div>
            <div class="slide-row">
              <span class="slide-num slide-num-end">סוף</span>
              <span class="slide-name">שקף סיום</span>
              <span class="text-muted slide-info">בהצלחה לכולם!</span>
            </div>
          </div>
          <div v-if="pptxError" class="warn-box" style="margin-top:14px;background:var(--red-light);color:var(--red)">{{ pptxError }}</div>
        </div>
      </div>
    </div>

    <div v-if="detailTab==='export'">
      <div class="export-grid">
        <div class="export-card" @click="exportCSV">
          
          <div class="export-title">ייצוא לוח הזרמות — CSV</div>
          <div class="export-desc">קובץ שניתן לפתוח ב-Excel. מכיל את כל ההזרמות עם שעות, מדווחים ותוכן.</div>
          <button class="btn btn-primary">הורד CSV</button>
        </div>
        <div class="export-card" @click="exportWord">
          
          <div class="export-title">ייצוא תיק תרגיל מלא — Word</div>
          <div class="export-desc">מסמך Word מלא עם כל תוכן התיק: תרחיש, סיפור אוכלוסייה, הזרמות, ציפיות ודגשים.</div>
          <button class="btn btn-purple">הורד Word</button>
        </div>
        <div class="export-card" @click="exportPPTX">
          
          <div class="export-title">מצגת תדריך — PowerPoint</div>
          <div class="export-desc">מצגת PowerPoint מעוצבת לתדריך התרגיל: שקפי כותרת, תרחיש, לוח הזרמות וציפיות.</div>
          <button class="btn btn-purple">הורד PPTX</button>
        </div>
      </div>
      <div class="card mt-4">
        <div class="card-header"><span class="card-title">תיק תרגיל — תצוגה מקדימה</span></div>
        <div class="card-body">
          <div class="story-section">
            <div class="story-section-title">פרטי התרגיל</div>
            <div class="story-text">שם: {{ current.name }}
תאריך: {{ current.date }}   |   מיקום: {{ current.location }}
סוג: {{ current.exerciseType }}   |   תרחיש: {{ scenarioLabel(current.mainScenario) }}
משך: {{ current.durationHours }} שעות החל {{ current.startTime }}
רמת מורכבות: {{ complexityLabel(current.complexity) }}   |   אוכלוסייה: {{ current.populationSize.toLocaleString('he-IL') }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- API loading overlay -->
  <div v-if="apiLoading" style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center">
    <div style="background:white;border:1px solid var(--gray-200);border-radius:var(--radius-lg);padding:36px 48px;text-align:center;max-width:340px;box-shadow:var(--shadow-lg)">
      <div style="font-weight:700;font-size:16px;margin-bottom:8px">Claude AI עובד...</div>
      <div style="color:var(--gray-600);font-size:13px">{{ apiLoading }}</div>
      <div style="margin-top:18px;display:flex;gap:6px;justify-content:center">
        <div style="width:8px;height:8px;border-radius:50%;background:var(--primary);animation:bounce .8s infinite"></div>
        <div style="width:8px;height:8px;border-radius:50%;background:var(--primary);animation:bounce .8s .2s infinite"></div>
        <div style="width:8px;height:8px;border-radius:50%;background:var(--primary);animation:bounce .8s .4s infinite"></div>
      </div>
    </div>
  </div>

  <!-- Settings modal -->
  <div v-if="showSettings" class="modal-backdrop" @click.self="showSettings=false">
    <div class="modal" style="max-width:480px">
      <div class="modal-header">
        <span class="modal-title">הגדרות Claude API</span>
        <button class="modal-close" @click="showSettings=false">✕</button>
      </div>
      <div class="modal-body">
        <div class="info-box mb-4">
          <span>עם API key תקני Claude יוצר הזרמות וסיפורי אוכלוסייה איכותיים יותר. ללא מפתח — המערכת עובדת עם תבניות.</span>
        </div>
        <div class="form-group">
          <label class="form-label">מפתח API של Anthropic (Claude)</label>
          <input v-model="settings.apiKey" class="form-control" type="password"
            placeholder="sk-ant-api03-..." style="direction:ltr;letter-spacing:.05em" />
          <div class="form-hint">המפתח נשמר מקומית בדפדפן בלבד, לא נשלח לשום שרת.</div>
        </div>
        <div class="form-group mt-3">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
            <input type="checkbox" v-model="settings.useApi" style="width:18px;height:18px" />
            <span style="font-weight:600">הפעל יצירת תוכן עם AI</span>
          </label>
          <div class="form-hint">כשמופעל — לחיצה על "צור הזרמות" תפנה לשרת Claude. אם נכשל — חוזר לתבניות.</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="showSettings=false">ביטול</button>
        <button class="btn btn-primary" @click="saveSettingsData">שמור הגדרות</button>
      </div>
    </div>
  </div>

  <!-- Delete confirm modal -->
  <div v-if="showDeleteModal" class="modal-backdrop" @click.self="showDeleteModal=false">
    <div class="modal modal-sm">
      <div class="modal-header"><span class="modal-title">מחיקת תרגיל</span><button class="modal-close" @click="showDeleteModal=false">✕</button></div>
      <div class="modal-body"><p>האם למחוק את התרגיל הזה לצמיתות? לא ניתן לשחזר.</p></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="showDeleteModal=false">ביטול</button>
        <button class="btn btn-danger" @click="doDelete">מחק</button>
      </div>
    </div>
  </div>
</div>
`;

/* ═══════════════════════════════════════════════════
   POWERPOINT EXPORT
═══════════════════════════════════════════════════ */
async function doExportPPTX(ex, helpers) {
  const { endTime, getScenarioLabel, getComplexityLabel } = helpers;

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = ex.name;

  const C = {
    navy:  '1e3a8a', navy2: '152a5e',
    lblue: 'dbeafe', white: 'ffffff',
    lgray: 'f1f5f9', gray:  '6b7280',
    amber: 'd97706', dark:  '1f2937',
    muted: '94a3b8',
  };

  const W = 10, H = 5.625;
  const durationHours = Number(ex.durationHours);
  const totalMins = durationHours * 60;
  const [startH, startM] = (ex.startTime || '08:00').split(':').map(Number);
  const startBase = startH * 60 + startM;
  const sLabel = getScenarioLabel(ex.mainScenario);
  const cLabel = getComplexityLabel(ex.complexity);

  function hdr(s, title) {
    s.addShape(pptx.shapes.RECTANGLE, { x:0, y:0, w:W, h:0.85, fill:{color:C.navy}, line:{type:'none'} });
    s.addShape(pptx.shapes.RECTANGLE, { x:0, y:0, w:0.25, h:0.85, fill:{color:C.amber}, line:{type:'none'} });
    s.addText(title, { x:0.45, y:0, w:9.4, h:0.85, fontSize:22, bold:true, color:C.white, align:'right', rtlMode:true, valign:'middle' });
  }

  // ── Slide 1: Title ──────────────────────────────────────
  {
    const s = pptx.addSlide();
    s.background = {color: C.navy};
    s.addShape(pptx.shapes.RECTANGLE, { x:0, y:0, w:0.25, h:H, fill:{color:C.amber}, line:{type:'none'} });
    s.addText(ex.exerciseType, { x:0.5, y:0.85, w:7.5, h:0.5, fontSize:13, color:C.lblue, align:'right', rtlMode:true });
    s.addText(ex.name, { x:0.5, y:1.4, w:9.0, h:2.0, fontSize:34, bold:true, color:C.white, align:'right', rtlMode:true, valign:'middle' });
    s.addText(`${ex.location}   |   ${ex.date}   |   ${ex.startTime}–${endTime}`, { x:0.5, y:3.65, w:9.0, h:0.5, fontSize:13, color:C.lblue, align:'right', rtlMode:true });
    s.addText(`${sLabel}   ·   מורכבות: ${cLabel}   ·   ${durationHours} שעות`, { x:0.5, y:4.2, w:9.0, h:0.45, fontSize:12, color:C.white, align:'right', rtlMode:true });
    s.addShape(pptx.shapes.RECTANGLE, { x:0, y:H-0.45, w:W, h:0.45, fill:{color:C.navy2}, line:{type:'none'} });
    s.addText('מחולל תרגילים — מפקדת נפה  |  לשימוש פנימי בלבד', { x:0, y:H-0.45, w:W, h:0.45, fontSize:9, color:C.muted, align:'center', valign:'middle' });
  }

  // ── Slide 2: Details ────────────────────────────────────
  {
    const s = pptx.addSlide();
    s.background = {color: C.white};
    hdr(s, 'פרטי התרגיל');
    const unitNames = ex.units.map(id => { const u=UNITS.find(x=>x.id===id); return u?u.name:id; }).join(', ') || '—';
    const detRows = [
      [{text:'שם התרגיל', options:{bold:true,align:'right',rtlMode:true,fill:{color:C.lgray},fontSize:13}}, {text:ex.name, options:{align:'right',rtlMode:true,fill:{color:C.lgray},fontSize:13}}],
      [{text:'תאריך', options:{bold:true,align:'right',rtlMode:true,fill:{color:C.white},fontSize:13}}, {text:ex.date, options:{align:'right',rtlMode:true,fill:{color:C.white},fontSize:13}}],
      [{text:'מיקום / רשות', options:{bold:true,align:'right',rtlMode:true,fill:{color:C.lgray},fontSize:13}}, {text:ex.location, options:{align:'right',rtlMode:true,fill:{color:C.lgray},fontSize:13}}],
      [{text:'סוג תרגיל', options:{bold:true,align:'right',rtlMode:true,fill:{color:C.white},fontSize:13}}, {text:ex.exerciseType, options:{align:'right',rtlMode:true,fill:{color:C.white},fontSize:13}}],
      [{text:'תרחיש', options:{bold:true,align:'right',rtlMode:true,fill:{color:C.lgray},fontSize:13}}, {text:sLabel, options:{align:'right',rtlMode:true,fill:{color:C.lgray},fontSize:13}}],
      [{text:'שעות תרגיל', options:{bold:true,align:'right',rtlMode:true,fill:{color:C.white},fontSize:13}}, {text:`${ex.startTime}–${endTime} (${durationHours} שעות)`, options:{align:'right',rtlMode:true,fill:{color:C.white},fontSize:13}}],
      [{text:'מורכבות', options:{bold:true,align:'right',rtlMode:true,fill:{color:C.lgray},fontSize:13}}, {text:cLabel, options:{align:'right',rtlMode:true,fill:{color:C.lgray},fontSize:13}}],
      [{text:'מכלולים', options:{bold:true,align:'right',rtlMode:true,fill:{color:C.white},fontSize:13}}, {text:unitNames, options:{align:'right',rtlMode:true,fill:{color:C.white},fontSize:13}}],
    ];
    s.addTable(detRows, { x:0.5, y:1.0, w:9.0, rowH:0.43, border:{pt:1,color:'d1d5db'}, colW:[2.5,6.5] });
  }

  // ── Slide 3: Scenario ───────────────────────────────────
  {
    const s = pptx.addSlide();
    s.background = {color: C.navy};
    s.addShape(pptx.shapes.RECTANGLE, { x:0, y:0, w:0.25, h:H, fill:{color:C.amber}, line:{type:'none'} });
    s.addText('תרחיש התרגיל', { x:0.45, y:0.2, w:9.4, h:0.65, fontSize:15, color:C.lblue, align:'right', rtlMode:true });
    s.addText(sLabel, { x:0.5, y:1.8, w:9.0, h:0.9, fontSize:32, bold:true, color:C.white, align:'center', rtlMode:true });
    if (ex.secondaryScenarios && ex.secondaryScenarios.length) {
      const secTxt = ex.secondaryScenarios.map(id => { const sc=SEC_SCENARIOS.find(x=>x.id===id); return sc?sc.name:id; }).join('    ');
      s.addText('תרחישים משניים:', { x:0.5, y:3.7, w:9.0, h:0.4, fontSize:12, color:C.muted, align:'right', rtlMode:true });
      s.addText(secTxt, { x:0.5, y:4.1, w:9.0, h:0.55, fontSize:15, color:C.lblue, align:'center', rtlMode:true });
    }
  }

  // ── Slide 4: Timeline ───────────────────────────────────
  {
    const s = pptx.addSlide();
    s.background = {color: C.white};
    hdr(s, 'ציר הזמן');
    s.addShape(pptx.shapes.LINE, { x:0.8, y:2.65, w:8.4, h:0, line:{color:'d1d5db',width:2} });

    const nodes = [
      {frac:0,   label:'פתיחת\nתרגיל', time:ex.startTime, accent:true},
      {frac:0.5, label:'מחצית\nתרגיל', time:minsToTime(totalMins*0.5, startBase), accent:false},
      {frac:1,   label:'סיום\nתרגיל',  time:endTime, accent:true},
    ];
    if (durationHours >= 3) {
      nodes.splice(1,0,{frac:0.33, label:'שליש\nראשון', time:minsToTime(totalMins*0.33,startBase), accent:false});
      nodes.splice(3,0,{frac:0.66, label:'שני\nשלישים', time:minsToTime(totalMins*0.66,startBase), accent:false});
    }
    nodes.forEach(nd => {
      const x = 0.8 + nd.frac * 8.4;
      s.addShape(pptx.shapes.OVAL, { x:x-0.2, y:2.45, w:0.4, h:0.4, fill:{color:nd.accent?C.amber:C.navy}, line:{color:nd.accent?C.amber:C.navy,width:1} });
      s.addText(nd.time,  { x:x-0.65, y:1.8,  w:1.3, h:0.5,  fontSize:12, bold:true, color:C.navy, align:'center' });
      s.addText(nd.label, { x:x-0.7,  y:3.0,  w:1.4, h:0.65, fontSize:11, color:C.gray, align:'center', rtlMode:true });
    });

    const stats = [
      {val:String(ex.injections.length), lbl:'הזרמות'},
      {val:String(Math.round(totalMins/ex.injections.length)), lbl:'דקות בין הזרמות'},
      {val:String(ex.units.length), lbl:'מכלולים'},
    ];
    stats.forEach((st,i) => {
      const x = 0.5 + i*3.2;
      s.addShape(pptx.shapes.RECTANGLE, { x, y:4.0, w:2.8, h:1.0, fill:{color:C.lgray}, line:{pt:1,color:'e2e8f0'} });
      s.addText(st.val, { x, y:4.05, w:2.8, h:0.55, fontSize:28, bold:true, color:C.navy, align:'center' });
      s.addText(st.lbl, { x, y:4.6,  w:2.8, h:0.35, fontSize:11, color:C.gray, align:'center', rtlMode:true });
    });
  }

  // ── Slide 5: Rules ──────────────────────────────────────
  {
    const s = pptx.addSlide();
    s.background = {color: C.navy};
    s.addShape(pptx.shapes.RECTANGLE, { x:0, y:0, w:0.25, h:H, fill:{color:C.amber}, line:{type:'none'} });
    s.addText('כללי התרגיל', { x:0.45, y:0.2, w:9.4, h:0.75, fontSize:22, bold:true, color:C.white, align:'right', rtlMode:true });
    const avgInt = Math.round(totalMins / ex.injections.length);
    s.addText([
      {text:'כל ההזרמות מועברות דרך מנהל התרגיל בלבד', options:{bullet:true, breakLine:true}},
      {text:'יומן האירוע מתועד לאורך כל התרגיל', options:{bullet:true, breakLine:true}},
      {text:'כל הפעולות לצורכי תרגיל בלבד — אין פעולות אמת', options:{bullet:true, breakLine:true}},
      {text:'ניתן לבקש "הקפאה" לצורך הבהרה', options:{bullet:true, breakLine:true}},
      {text:`קצב הזרמה: הזרמה כל ~${avgInt} דקות`, options:{bullet:true, breakLine:true}},
      {text:'שאלות — פנה למנהל התרגיל', options:{bullet:true}},
    ], { x:0.6, y:1.15, w:9.0, h:4.1, fontSize:15, color:C.white, align:'right', rtlMode:true, valign:'top', paraSpaceAfter:6 });
  }

  // ── Slides 6+: Injection board (5 per slide) ────────────
  const PER_SLIDE = 5;
  const injPages = Math.ceil(ex.injections.length / PER_SLIDE);
  for (let pg = 0; pg < injPages; pg++) {
    const s = pptx.addSlide();
    s.background = {color: C.white};
    hdr(s, `לוח הזרמות${injPages > 1 ? ` (${pg+1}/${injPages})` : ''}`);
    const batch = ex.injections.slice(pg*PER_SLIDE, (pg+1)*PER_SLIDE);
    const injRows = [
      [
        {text:'שעה', options:{bold:true,color:C.white,fill:{color:C.navy},fontSize:13,align:'center'}},
        {text:'דיווח / תוכן', options:{bold:true,color:C.white,fill:{color:C.navy},fontSize:13,align:'right',rtlMode:true}},
        {text:'גורם מדווח', options:{bold:true,color:C.white,fill:{color:C.navy},fontSize:13,align:'right',rtlMode:true}},
      ],
      ...batch.map((inj,i) => {
        const bg = i%2===0 ? C.white : C.lgray;
        return [
          {text:inj.time, options:{align:'center',bold:true,fill:{color:bg},fontSize:12}},
          {text:inj.content, options:{align:'right',rtlMode:true,fill:{color:bg},fontSize:11}},
          {text:inj.reporter, options:{align:'right',rtlMode:true,bold:true,fill:{color:bg},fontSize:11}},
        ];
      }),
    ];
    const rowH = Math.min(0.77, (H-1.05)/(batch.length+1));
    s.addTable(injRows, { x:0.3, y:0.97, w:9.4, rowH, border:{pt:1,color:'d1d5db'}, colW:[1.1,6.3,2.0] });
  }

  // ── Population story summary ─────────────────────────────
  if (ex.populationStory) {
    const s = pptx.addSlide();
    s.background = {color: C.white};
    hdr(s, 'סיפור האוכלוסייה — תמצית');
    const lines = ex.populationStory.split('\n').filter(l=>l.trim()).slice(0,26).join('\n');
    s.addText(lines, { x:0.4, y:0.97, w:9.2, h:4.5, fontSize:10.5, align:'right', rtlMode:true, valign:'top', color:C.dark, paraSpaceAfter:3 });
  }

  // ── Expectations ────────────────────────────────────────
  if (ex.unitExpectations && ex.unitExpectations.length) {
    const s = pptx.addSlide();
    s.background = {color: C.white};
    hdr(s, 'ציפיות לפי מכלול');
    const expRows = [
      [
        {text:'מכלול', options:{bold:true,color:C.white,fill:{color:C.navy},fontSize:13,align:'right',rtlMode:true}},
        {text:'ציפיות', options:{bold:true,color:C.white,fill:{color:C.navy},fontSize:13,align:'right',rtlMode:true}},
      ],
      ...ex.unitExpectations.map((ue,i) => {
        const bg = i%2===0 ? C.white : C.lgray;
        return [
          {text:`${ue.unitIcon} ${ue.unitName}`, options:{bold:true,align:'right',rtlMode:true,fill:{color:bg},fontSize:12}},
          {text:ue.expectation, options:{align:'right',rtlMode:true,fill:{color:bg},fontSize:11}},
        ];
      }),
    ];
    const rowH = Math.min(0.52, (H-1.05)/(ex.unitExpectations.length+1));
    s.addTable(expRows, { x:0.3, y:0.97, w:9.4, rowH, border:{pt:1,color:'d1d5db'}, colW:[2.3,7.1] });
  }

  // ── Closing slide ────────────────────────────────────────
  {
    const s = pptx.addSlide();
    s.background = {color: C.navy};
    s.addShape(pptx.shapes.RECTANGLE, { x:0, y:0, w:0.25, h:H, fill:{color:C.amber}, line:{type:'none'} });
    s.addText('בהצלחה לכולם!', { x:0.4, y:1.6, w:9.2, h:1.4, fontSize:44, bold:true, color:C.amber, align:'center', rtlMode:true, valign:'middle' });
    s.addText(ex.name, { x:0.4, y:3.2, w:9.2, h:0.6, fontSize:18, color:C.white, align:'center', rtlMode:true });
    s.addText('מחולל תרגילים — מפקדת נפה  |  לשימוש פנימי בלבד', { x:0, y:H-0.45, w:W, h:0.45, fontSize:9, color:C.muted, align:'center', valign:'middle' });
  }

  await pptx.writeFile({fileName: `תדריך_${ex.name||'תרגיל'}.pptx`});
}

/* ═══════════════════════════════════════════════════
   VUE APP
═══════════════════════════════════════════════════ */
Vue.createApp({
  template: TEMPLATE,
  data() {
    return {
      view: 'home',
      exercises: [],
      step: 1,
      draft: emptyDraft(),
      editingInjId: null,
      current: null,
      detailTab: 'injections',
      toasts: [],
      searchQ: '',
      showDeleteModal: false,
      deleteTargetId: null,
      showSettings: false,
      settings: loadSettings(),
      apiLoading: '',
      pptxLoading: false,
      pptxError: '',
      // expose constants to template
      SCENARIOS, SEC_SCENARIOS, UNITS, RELIABILITY, EXERCISE_TYPES,
      wizardSteps: ['פרמטרים','תרחיש','מכלולים','הזרמות','עריכה','אוכלוסייה','ציפיות'],
    };
  },
  computed: {
    filteredExercises() {
      if (!this.searchQ) return this.exercises;
      const q = this.searchQ.toLowerCase();
      return this.exercises.filter(e=>
        (e.name||'').toLowerCase().includes(q) ||
        (e.location||'').toLowerCase().includes(q)
      );
    },
    endTime() {
      if (!this.current) return '';
      const [h,m] = (this.current.startTime||'08:00').split(':').map(Number);
      const total = h*60 + m + this.current.durationHours*60;
      return `${padZ(Math.floor(total/60)%24)}:${padZ(total%60)}`;
    },
  },
  methods: {
    startNew() { this.draft = emptyDraft(); this.step = 1; this.editingInjId = null; this.view = 'wizard'; },
    toggleSec(id) {
      const idx = this.draft.secondaryScenarios.indexOf(id);
      if (idx>=0) this.draft.secondaryScenarios.splice(idx,1);
      else if (this.draft.secondaryScenarios.length<3) this.draft.secondaryScenarios.push(id);
      else this.toast('ניתן לבחור עד 3 תרחישים משניים','warning');
    },
    toggleUnit(id) {
      const idx = this.draft.units.indexOf(id);
      if (idx>=0) this.draft.units.splice(idx,1); else this.draft.units.push(id);
    },
    nextStep() { if (this.step < 7) this.step++; },
    finalizeExercise() {
      const ex = JSON.parse(JSON.stringify(this.draft));
      const idx = this.exercises.findIndex(e=>e.id===ex.id);
      if (idx>=0) this.exercises.splice(idx,1,ex); else this.exercises.push(ex);
      this.saveData();
      this.toast('התרגיל נשמר בהצלחה!','success');
      this.current = ex;
      this.detailTab = 'injections';
      this.view = 'detail';
    },
    openExercise(ex) { this.current = JSON.parse(JSON.stringify(ex)); this.detailTab = 'injections'; this.view = 'detail'; },
    confirmLeaveWizard() { if (confirm('לצאת מהאשף? ההתקדמות לא תישמר.')) this.view = 'home'; },
    confirmDelete(id) { this.deleteTargetId = id; this.showDeleteModal = true; },
    doDelete() {
      this.exercises = this.exercises.filter(e=>e.id!==this.deleteTargetId);
      this.saveData(); this.showDeleteModal = false;
      if (this.current && this.current.id === this.deleteTargetId) { this.current = null; this.view = 'exercises'; }
      this.toast('תרגיל נמחק','info');
    },
    duplicateExercise(id) {
      const ex = this.exercises.find(e=>e.id===id);
      if (!ex) return;
      const copy = JSON.parse(JSON.stringify(ex));
      copy.id = uid(); copy.name = copy.name + ' (עותק)'; copy.createdAt = new Date().toISOString().slice(0,10);
      this.exercises.push(copy); this.saveData(); this.toast('תרגיל שוכפל','success');
    },

    // Generate helpers (exposed to template)
    generatePopulationStory(d) { return generatePopulationStory(d); },
    generateAnchorList(d, n) { return generateAnchorList(d, n); },

    // Step 4→5 also generate story & anchors
    async runGenerate() {
      await loadStreetsData();
      const settings = loadSettings();
      const apiKey = settings.apiKey;
      const useApi = !!(apiKey && settings.useApi);

      // — Injections —
      if (useApi) {
        this.apiLoading = 'מייצר הזרמות עם AI...';
        try {
          const raw = await callClaudeAPI(apiKey, buildInjectionPrompt(this.draft));
          const jsonStr = raw.replace(/```json\n?|\n?```/g, '').trim();
          const parsed = JSON.parse(jsonStr);
          this.draft.injections = parsed.map((inj, i) => ({
            id: uid(), order: i+1,
            time: inj.time || '',
            reporter: inj.reporter || '',
            type: inj.type || 'דיווח',
            content: inj.content || '',
            expectedAction: inj.expectedAction || genExpectedAction(inj.type, this.draft.mainScenario),
            reliability: inj.reliability || 'B',
            notes: '',
          }));
          this.toast('הזרמות נוצרו בהצלחה עם AI', 'success');
        } catch(e) {
          this.toast(`שגיאת API — עובר לתבניות: ${e.message}`, 'warning');
          this.draft.injections = generateInjections(this.draft);
        }
      } else {
        this.draft.injections = generateInjections(this.draft);
      }

      // — Population story —
      if (!this.draft.populationStory) {
        if (useApi) {
          this.apiLoading = 'מייצר סיפור אוכלוסייה עם AI...';
          try {
            this.draft.populationStory = await callClaudeAPI(apiKey, buildStoryPrompt(this.draft), 3000);
          } catch {
            this.draft.populationStory = generatePopulationStory(this.draft);
          }
        } else {
          this.draft.populationStory = generatePopulationStory(this.draft);
        }
      }

      this.apiLoading = '';
      if (!this.draft.anchorList.length) this.draft.anchorList = generateAnchorList(this.draft, this.draft.anchorCount||20);
      if (!this.draft.unitExpectations.length) this.draft.unitExpectations = generateExpectations(this.draft);
      if (!this.draft.mentorHighlights) {
        this.draft.mentorHighlights = `• ודא שהמשתתפים קולטים הזרמות בזמן ומגיבים בהתאם.\n• הדגש ניהול תמונת מצב מתעדכנת.\n• וודא שמתבצע תיאום בין-מכלולי מול כל אירוע.`;
      }
      if (!this.draft.controllerHighlights) {
        this.draft.controllerHighlights = `• בדוק: האם הצוות מדווח ב-${Math.round(this.draft.durationHours*60/this.draft.injCount)} דקות לכל הזרמה?\n• בדוק: תיאום — האם גורמים משתתפים מתואמים?\n• בדוק: האם יומן האירוע מתועד כראוי?`;
      }
      this.step = 5;
    },

    exportCSV() {
      if (!this.current) return;
      const ex = this.current;

      // Sheet 1 — לוח הזרמות לתרגיל (3 cols, matches real drill-day format)
      const drillRows = [
        [`תרגיל: ${ex.name}`, '', ''],
        [`תאריך: ${ex.date}  |  מיקום: ${ex.location}  |  ${ex.startTime}–${this.endTime}`, '', ''],
        ['', '', ''],
        ['שעה', 'דיווח', 'גורם מדווח'],
      ];
      ex.injections.forEach(inj => drillRows.push([inj.time, inj.content, inj.reporter]));

      const wsDrill = XLSX.utils.aoa_to_sheet(drillRows);
      wsDrill['!cols'] = [{wch:8},{wch:60},{wch:20}];
      // merge header cells
      wsDrill['!merges'] = [{s:{r:0,c:0},e:{r:0,c:2}},{s:{r:1,c:0},e:{r:1,c:2}}];

      // Sheet 2 — גרסת בקר (full columns)
      const ctrlRows = [['#','שעה','גורם מדווח','סוג','תוכן ההזרמה','פעולה צפויה','אמינות']];
      ex.injections.forEach(inj => ctrlRows.push([inj.order, inj.time, inj.reporter, inj.type, inj.content, inj.expectedAction, inj.reliability]));

      const wsCtrl = XLSX.utils.aoa_to_sheet(ctrlRows);
      wsCtrl['!cols'] = [{wch:4},{wch:8},{wch:18},{wch:14},{wch:55},{wch:35},{wch:8}];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsDrill, 'לוח הזרמות — תרגיל');
      XLSX.utils.book_append_sheet(wb, wsCtrl, 'לוח הזרמות — בקר');
      XLSX.writeFile(wb, `הזרמות_${ex.name||'תרגיל'}.xlsx`);
      this.toast('יוצא ל-Excel — 2 גרסאות','success');
    },

    async exportWord() {
      if (!this.current) return;
      if (typeof docx === 'undefined') {
        this.toast('ספריית docx לא נטענה. בדוק חיבור אינטרנט ורענן.','error');
        return;
      }
      const ex = this.current;
      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle, ShadingType } = docx;

      const COL = { primary:'0067C0', dark:'1B1B1B', muted:'5C5C5C', light:'F3F3F3', border:'D1D1D1', green:'0F7B0F', amber:'9D5D00', red:'C42B1C', white:'FFFFFF' };
      const TYPE_BG = {'אירוע':'FDE7E9','דיווח':'E8F1FB','פקודה':'EEF0FC','עדכון':'E6F4E6','בקשה':'FDF0DB','מידע מודיעיני':'F3F3F3','הנחיה':'E8F1FB','אזהרה':'FDF0DB'};

      const txt = (text, opts={}) => new TextRun({ text: String(text ?? ''), rightToLeft: true, ...opts });
      const para = (text, opts={}) => {
        const { bold, size, color, italics, align, ...rest } = opts;
        return new Paragraph({
          bidirectional: true,
          alignment: align || AlignmentType.RIGHT,
          children: [txt(text, { bold, size, color, italics })],
          ...rest,
        });
      };
      const cell = (text, opts={}) => {
        const { bold, size, color, align, fill, width } = opts;
        return new TableCell({
          width: width ? { size: width, type: WidthType.DXA } : undefined,
          shading: fill ? { fill } : undefined,
          children: [new Paragraph({
            bidirectional: true,
            alignment: align || AlignmentType.RIGHT,
            children: [txt(text, { bold, size: size ?? 18, color })],
          })],
        });
      };
      const headerCell = (text, width) => cell(text, { bold:true, color:COL.white, fill:COL.primary, width, align:AlignmentType.RIGHT, size:20 });
      const row = cells => new TableRow({ children: cells });
      const table = rows => new Table({ rows });
      const sectionHeading = text => new Paragraph({
        bidirectional: true, alignment: AlignmentType.RIGHT,
        shading: { type: ShadingType.CLEAR, color:'auto', fill: 'EFF6FF' },
        border: { right: { style: BorderStyle.SINGLE, size: 24, color: COL.primary } },
        spacing: { before: 300, after: 150 },
        children: [txt(text, { bold:true, size:28, color:COL.primary })],
      });
      const subHeading = text => new Paragraph({
        bidirectional: true, alignment: AlignmentType.RIGHT, spacing:{before:200,after:100},
        children:[txt(text,{bold:true,size:22,color:COL.dark})],
      });
      const bodyText = (text, opts={}) => para(text, { size:20, color:COL.dark, spacing:{after:80}, ...opts });
      const preBlock = text => (text||'').split('\n').map(line => para(line || ' ', { size:18, color:COL.dark, spacing:{after:20} }));
      const pageBreak = () => new Paragraph({ pageBreakBefore:true, children:[] });

      const secNames = ex.secondaryScenarios.map(id=>{const s=SEC_SCENARIOS.find(x=>x.id===id);return s?s.name:id;}).join(', ') || '—';
      const unitNames = ex.units.map(id=>{const u=UNITS.find(x=>x.id===id);return u?u.name:id;}).join(', ') || '—';

      const children = [];

      // Cover
      children.push(
        new Paragraph({ bidirectional:true, alignment:AlignmentType.CENTER, spacing:{before:600,after:200}, children:[txt('תיק תרגיל',{bold:true,size:56,color:COL.primary})] }),
        new Paragraph({ bidirectional:true, alignment:AlignmentType.CENTER, spacing:{after:300}, border:{bottom:{style:BorderStyle.SINGLE,size:12,color:COL.primary}}, children:[txt(ex.name,{size:32,color:COL.dark})] }),
        new Paragraph({ bidirectional:true, alignment:AlignmentType.CENTER, spacing:{after:80}, children:[txt(`${ex.location}  ·  ${ex.date}  ·  ${ex.startTime}–${this.endTime}`,{size:22,color:COL.muted})] }),
        new Paragraph({ bidirectional:true, alignment:AlignmentType.CENTER, spacing:{after:80}, children:[txt(`${ex.exerciseType}  ·  ${this.scenarioLabel(ex.mainScenario)}`,{size:22,color:COL.muted})] }),
        new Paragraph({ bidirectional:true, alignment:AlignmentType.CENTER, spacing:{after:600}, children:[txt(`${this.complexityLabel(ex.complexity)}  ·  ${ex.populationSize.toLocaleString('he-IL')} תושבים`,{size:22,color:COL.muted})] }),
        new Paragraph({ bidirectional:true, alignment:AlignmentType.CENTER, children:[txt(`הופק: ${new Date().toLocaleDateString('he-IL')}  |  מחולל תרגילים — מפקדת נפה`,{size:16,color:COL.muted})] }),
      );

      // 1. Details
      children.push(sectionHeading('1. פרטי התרגיל'));
      children.push(table([
        row([cell('שם התרגיל',{bold:true,width:1800}), cell(ex.name,{width:3200}), cell('תאריך',{bold:true,width:1400}), cell(ex.date,{width:2600})]),
        row([cell('מיקום / רשות',{bold:true,width:1800}), cell(ex.location,{width:3200}), cell('סוג תרגיל',{bold:true,width:1400}), cell(ex.exerciseType,{width:2600})]),
        row([cell('תרחיש ראשי',{bold:true,width:1800}), cell(this.scenarioLabel(ex.mainScenario),{width:3200}), cell('תרחישים משניים',{bold:true,width:1400}), cell(secNames,{width:2600})]),
        row([cell('שעות תרגיל',{bold:true,width:1800}), cell(`${ex.startTime}–${this.endTime} (${ex.durationHours} שעות)`,{width:3200}), cell('מורכבות',{bold:true,width:1400}), cell(this.complexityLabel(ex.complexity),{width:2600})]),
        row([cell('גודל אוכלוסייה',{bold:true,width:1800}), cell(`${ex.populationSize.toLocaleString('he-IL')} תושבים`,{width:3200}), cell('מכלולים',{bold:true,width:1400}), cell(unitNames,{width:2600})]),
      ]));

      // 2. Population story
      children.push(pageBreak());
      children.push(sectionHeading('2. סיפור האוכלוסייה'));
      children.push(...preBlock(ex.populationStory));

      // 3. Injection board — drill version
      children.push(pageBreak());
      children.push(sectionHeading(`3. לוח הזרמות — גרסת תרגיל (${ex.injections.length} הזרמות)`));
      children.push(bodyText('לשימוש בזמן התרגיל בלבד', { italics:true, size:18, color:COL.muted }));
      children.push(table([
        row([headerCell('שעה',800), headerCell('דיווח',5500), headerCell('גורם מדווח',1700)]),
        ...ex.injections.map((inj,i)=>{ const bg = i%2 ? COL.light : COL.white; return row([
          cell(inj.time, {align:AlignmentType.CENTER, bold:true, color:COL.primary, fill:bg, width:800}),
          cell(inj.content, {fill:bg, width:5500}),
          cell(inj.reporter, {bold:true, fill:bg, width:1700}),
        ]); }),
      ]));

      // 4. Injection board — controller version
      children.push(pageBreak());
      children.push(sectionHeading('4. לוח הזרמות — גרסת בקר'));
      children.push(bodyText('כולל פעולות צפויות ואמינות — לשימוש הבקר בלבד', { italics:true, size:18, color:COL.muted }));
      children.push(table([
        row([headerCell('#',400), headerCell('שעה',700), headerCell('גורם מדווח',1300), headerCell('סוג',900), headerCell('תוכן ההזרמה',3500), headerCell('פעולה צפויה',1900), headerCell('אמ׳',500)]),
        ...ex.injections.map((inj,i)=>{ const bg = i%2 ? COL.light : COL.white; return row([
          cell(String(inj.order), {align:AlignmentType.CENTER, fill:bg, width:400}),
          cell(inj.time, {align:AlignmentType.CENTER, fill:bg, width:700}),
          cell(inj.reporter, {bold:true, fill:bg, width:1300}),
          cell(inj.type, {align:AlignmentType.CENTER, size:16, fill: TYPE_BG[inj.type]||COL.light, width:900}),
          cell(inj.content, {fill:bg, width:3500}),
          cell(inj.expectedAction, {color:COL.muted, size:16, fill:bg, width:1900}),
          cell(inj.reliability, {align:AlignmentType.CENTER, bold:true, color: this.relColor(inj.reliability).slice(1).toUpperCase(), fill:bg, width:500}),
        ]); }),
      ]));

      // 5. Anchor list
      children.push(pageBreak());
      children.push(sectionHeading(`5. רשימת עוגן (${ex.anchorList.length} תושבים)`));
      children.push(table([
        row([headerCell('#',400),headerCell('שם משפחה',1100),headerCell('שם פרטי',1100),headerCell('מגדר',500),headerCell('ת.ז.',1200),headerCell('קטין',500),headerCell('רחוב',1300),headerCell('מס׳',500),headerCell('כניסה',500),headerCell('דירה',500),headerCell('טלפון',1200),headerCell('סטטוס',1100)]),
        ...ex.anchorList.map((a,i)=>{ const bg = i%2 ? COL.light : COL.white; return row([
          cell(String(i+1), {align:AlignmentType.CENTER, color:COL.muted, fill:bg, width:400}),
          cell(a.lastName||'', {bold:true, fill:bg, width:1100}),
          cell(a.firstName||a.name||'', {fill:bg, width:1100}),
          cell(a.gender||'', {align:AlignmentType.CENTER, fill:bg, width:500}),
          cell(a.idNum||'', {size:16, fill:bg, width:1200}),
          cell(a.isMinor||'', {align:AlignmentType.CENTER, fill:bg, width:500}),
          cell(a.street||'', {fill:bg, width:1300}),
          cell(String(a.houseNum||''), {fill:bg, width:500}),
          cell(a.entrance||'', {fill:bg, width:500}),
          cell(String(a.apt||''), {fill:bg, width:500}),
          cell(a.phone||'', {size:16, fill:bg, width:1200}),
          cell(a.status||'', {bold:true, fill:bg, width:1100}),
        ]); }),
      ]));

      // 6. Expectations
      children.push(pageBreak());
      children.push(sectionHeading('6. ציפיות ודגשים'));
      children.push(subHeading('ציפיות מהרשות (כולל)'));
      children.push(...(ex.authorityExpect||'').split('\n').filter(Boolean).map(l=>bodyText(l)));
      if (ex.unitExpectations && ex.unitExpectations.length) {
        children.push(subHeading('ציפיות לפי מכלול'));
        children.push(table([
          row([headerCell('מכלול',1800), headerCell('ציפיות',6700)]),
          ...ex.unitExpectations.map((ue,i)=>{ const bg = i%2 ? COL.light : COL.white; return row([
            cell(ue.unitName, {bold:true, fill:bg, width:1800}),
            cell(ue.expectation, {fill:bg, width:6700}),
          ]); }),
        ]));
      }
      if (ex.mentorHighlights) {
        children.push(subHeading('דגשי חונך'));
        children.push(...ex.mentorHighlights.split('\n').filter(Boolean).map(l=>bodyText(l)));
      }
      if (ex.controllerHighlights) {
        children.push(subHeading('דגשי בקר'));
        children.push(...ex.controllerHighlights.split('\n').filter(Boolean).map(l=>bodyText(l)));
      }

      const doc = new Document({ sections: [{ properties: {}, children }] });

      try {
        const blob = await Packer.toBlob(doc);
        const safeName = (ex.name||'תרגיל').replace(/[\\/:*?"<>|]/g,'_');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `תיק_תרגיל_${safeName}.docx`;
        a.click();
        this.toast('תיק תרגיל יוצא ל-Word','success');
      } catch(e) {
        this.toast(`שגיאה בייצוא ל-Word: ${e.message}`,'error');
      }
    },

    async exportPPTX() {
      if (!this.current) return;
      if (typeof PptxGenJS === 'undefined') {
        this.pptxError = 'ספריית PptxGenJS לא נטענה. בדוק חיבור אינטרנט ורענן.';
        return;
      }
      this.pptxLoading = true;
      this.pptxError = '';
      try {
        await doExportPPTX(this.current, {
          endTime: this.endTime,
          getScenarioLabel: id => this.scenarioLabel(id),
          getComplexityLabel: c => this.complexityLabel(c),
        });
        this.toast('מצגת PowerPoint יוצאה בהצלחה','success');
      } catch(e) {
        this.pptxError = `שגיאה ביצירת המצגת: ${e.message}`;
        this.toast('שגיאה ביצוא PowerPoint','error');
      } finally {
        this.pptxLoading = false;
      }
    },

    saveSettingsData() { saveSettings(this.settings); this.showSettings = false; this.toast('הגדרות נשמרו','success'); },
    saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.exercises)); },
    loadData() {
      try { const d = localStorage.getItem(STORAGE_KEY); if(d) this.exercises = JSON.parse(d); }
      catch(e) { console.warn('Could not load saved data'); }
    },
    toast(msg, type='success') {
      const id = uid();
      this.toasts.push({id, msg, type});
      setTimeout(()=>{ this.toasts = this.toasts.filter(t=>t.id!==id); }, 3500);
    },
    scenarioLabel(id) { const s=SCENARIOS.find(x=>x.id===id); return s?s.name:id||'—'; },
    scenarioEmoji(id)  { const s=SCENARIOS.find(x=>x.id===id); return s?s.icon:''; },
    complexityLabel(c) { return {1:'קלה',2:'בינונית',3:'גבוהה'}[c]||'—'; },
    injTypeBadge(t) {
      return {
        'אירוע':'badge-red','דיווח':'badge-blue','פקודה':'badge-purple',
        'עדכון':'badge-green','בקשה':'badge-orange','מידע מודיעיני':'badge-gray',
        'הנחיה':'badge-blue','אזהרה':'badge-orange',
      }[t]||'badge-gray';
    },
    relColor(r) { return {A:'#0f7b0f',B:'#0067c0',C:'#9d5d00',D:'#8a8886'}[r]||'#8a8886'; },
    injTypeBgColor(t) { return {'אירוע':'#fee2e2','דיווח':'#dbeafe','פקודה':'#ede9fe','עדכון':'#d1fae5','בקשה':'#ffedd5','מידע מודיעיני':'#f3f4f6','הנחיה':'#dbeafe','אזהרה':'#ffedd5'}[t]||'#f3f4f6'; },
    anchorBadge(s) {
      return {
        'ידוע בטוח':'badge-green','חולץ':'badge-green','מאותר':'badge-green',
        'פונה':'badge-blue','בטיפול רווחה':'badge-blue',
        'פצוע קל':'badge-orange','פצוע בינוני':'badge-orange',
        'פצוע קשה':'badge-red','לכוד':'badge-red','נעדר':'badge-red','הרוג':'badge-red',
        // legacy statuses
        'בבית':'badge-green','מפונה':'badge-blue','מאושפז':'badge-red',
      }[s]||'badge-gray';
    },
  },
  mounted() { this.loadData(); loadStreetsData(); },
}).mount('#app');
