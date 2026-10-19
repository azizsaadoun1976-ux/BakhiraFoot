(() => {
  "use strict";
  const STORAGE_KEY = "bakhirafoot-language";
  const LANGS = ["fr", "en", "ar"];
  const $ = id => document.getElementById(id);
  const rows = [
    ["Accueil","Home","الرئيسية"],["Scores","Scores","النتائج"],["Compétitions","Competitions","البطولات"],["Équipes","Teams","الفرق"],["Actualités","News","الأخبار"],["Articles","Articles","مقالات"],["À propos","About","من نحن"],["Contact","Contact","اتصل بنا"],["Politique de confidentialité","Privacy policy","سياسة الخصوصية"],["Conditions d'utilisation","Terms of use","شروط الاستخدام"],["Données sportives :","Sports data:","البيانات الرياضية:"],["Rechercher une équipe ou un joueur","Search for a team or player","ابحث عن فريق أو لاعب"],["Changer le thème","Change theme","تغيير المظهر"],["Activer le mode clair","Enable light mode","تفعيل الوضع الفاتح"],["Activer le mode sombre","Enable dark mode","تفعيل الوضع الداكن"],
    ["FOOTBALL CULTURE","FOOTBALL CULTURE","ثقافة كرة القدم"],["THE GAME. THE PEOPLE. THE MOMENT.","THE GAME. THE PEOPLE. THE MOMENT.","اللعبة. الجمهور. اللحظة."],["POUR LES VRAIS PASSIONNÉS","FOR TRUE FANS","لعشاق كرة القدم الحقيقيين"],["Plus qu’un score.","More than a score.","أكثر من مجرد نتيجة."],["Toute une culture.","A whole culture.","ثقافة كاملة."],["Vivez chaque rencontre avec les scores en direct, les classements, les compositions et les histoires du football marocain et mondial.","Follow every fixture with live scores, standings, lineups and stories from Moroccan and world football.","عش كل مباراة مع النتائج المباشرة والترتيب والتشكيلات وأخبار كرة القدم المغربية والعالمية."],["Suivre les matchs","Follow matches","تابع المباريات"],["Explorer les compétitions","Explore competitions","استكشف البطولات"],["MATCHDAY","MATCHDAY","يوم المباراة"],["BOTOLA · EUROPE · MONDE","BOTOLA · EUROPE · WORLD","البطولة · أوروبا · العالم"],["LE FOOTBALL, EN DIRECT","FOOTBALL, LIVE","كرة القدم مباشرة"],["Le jeu nous","The game","اللعبة"],["rassemble.","brings us together.","تجمعنا."],["Scores · Stats · Passion","Scores · Stats · Passion","النتائج · الإحصائيات · الشغف"],["DATA EN TEMPS RÉEL","REAL-TIME DATA","بيانات مباشرة"],["VIVEZ LE FOOTBALL","LIVE FOOTBALL","عش كرة القدم"],["SANS FRONTIÈRES","WITHOUT BORDERS","بلا حدود"],
    ["Scores en direct","Live scores","نتائج مباشرة"],["Tous les matchs et résultats","All fixtures and results","جميع المباريات والنتائج"],["TOURNOIS & LIGUES","TOURNAMENTS & LEAGUES","البطولات والدوريات"],["Classements et qualifications","Standings and qualification","الترتيب والتأهل"],["À LA UNE","TOP STORIES","الأخبار الرئيسية"],["Actualités football","Football news","أخبار كرة القدم"],["Les dernières infos du football","The latest football news","آخر أخبار كرة القدم"],["Matchs du jour","Today's matches","مباريات اليوم"],["Le programme du jour, les scores en direct et les horaires des rencontres.","Today's fixtures, live scores and kickoff times.","مباريات اليوم والنتائج المباشرة ومواعيد الانطلاق."],["Tous les matchs","All matches","كل المباريات"],["Toutes les news","All news","كل الأخبار"],["Chargement des matchs…","Loading matches…","جارٍ تحميل المباريات…"],["Aucun match aujourd'hui.","No matches today.","لا توجد مباريات اليوم."],["Impossible de charger les matchs.","Unable to load matches.","تعذر تحميل المباريات."],["Impossible de charger le match.","Unable to load the match.","تعذر تحميل المباراة."],["Aucun match trouvé.","No matches found.","لم يتم العثور على مباريات."],["Matchs","Matches","المباريات"],["Sélectionnez une date","Select a date","اختر التاريخ"],["RÉPERTOIRE FOOTBALL","FOOTBALL DIRECTORY","دليل كرة القدم"],["Choisissez une compétition pour afficher ses matchs.","Choose a competition to view its matches.","اختر بطولة لعرض مبارياتها."],["Cliquez sur une compétition pour filtrer les matchs du jour.","Click a competition to filter today's matches.","اضغط على بطولة لتصفية مباريات اليوم."],["Aucun match disponible","No matches available","لا توجد مباريات متاحة"],["Aucun match","No matches","لا توجد مباريات"],["Aucun match dans ce filtre.","No matches in this filter.","لا توجد مباريات ضمن هذا التصفية."],["COMPÉTITION","COMPETITION","البطولة"],["COMPÉTITION SÉLECTIONNÉE","SELECTED COMPETITION","البطولة المحددة"],["Ouvrir le classement de cette compétition","Open this competition's standings","فتح ترتيب هذه البطولة"],["Détails","Details","التفاصيل"],["Voir les détails","View details","عرض التفاصيل"],["Détails du match","Match details","تفاصيل المباراة"],["Match Details","Match details","تفاصيل المباراة"],["Scores & Résultats","Scores & Results","النتائج والحصيلة"],["Suivez tous les matchs en direct, programmés et terminés.","Follow live, scheduled and completed matches.","تابع المباريات المباشرة والمبرمجة والمنتهية."],["Classements des grandes compétitions","Major competition standings","ترتيب البطولات الكبرى"],["Classements, buteurs et passeurs décisifs en temps réel.","Standings, top scorers and assists in real time.","الترتيب والهدافون وصناع الأهداف مباشرة."],["Équipes et clubs de football","Football teams and clubs","فرق وأندية كرة القدم"],["Actualités du football marocain et international","Moroccan and international football news","أخبار كرة القدم المغربية والعالمية"],["DERNIÈRES INFOS","LATEST NEWS","آخر الأخبار"],["CENTRE DE MATCHS","MATCH CENTER","مركز المباريات"],["FOOTBALL EN DIRECT","LIVE FOOTBALL","كرة القدم مباشرة"],["Chargement...","Loading...","جارٍ التحميل..."],["Chargement des données réelles de la rencontre.","Loading official match data.","جارٍ تحميل بيانات المباراة الرسمية."],["Identifiant du match introuvable.","Match ID not found.","لم يتم العثور على معرّف المباراة."],["Données du match invalides","Invalid match data","بيانات المباراة غير صالحة"],["MI-TEMPS","HALF-TIME","نهاية الشوط الأول"],["TERMINÉ","FINISHED","انتهت"],["À VENIR","UPCOMING","قادمة"],["REPORTÉ","POSTPONED","مؤجلة"],["ANNULÉ","CANCELLED","ألغيت"],["EN DIRECT","LIVE","مباشر"],["Le football en direct, avec passion.","Live football, with passion.","كرة القدم مباشرة، بشغف."],["Voir les matchs","View matches","شاهد المباريات"],["Buteurs","Scorers","الهدافون"],["Meilleurs buteurs","Top scorers","أفضل الهدافين"],["Meilleurs passeurs","Top assists","أفضل صناع الأهداف"],["Passeurs décisifs","Assists","التمريرات الحاسمة"],["Top 5","Top 5","أفضل 5"],["Données indisponibles.","Data unavailable.","البيانات غير متاحة."],["Équipe non renseignée","Unknown team","فريق غير محدد"],["Équipe","Team","الفريق"],["Joueur","Player","اللاعب"],["Matchs joués : —","Appearances: —","المباريات: —"],["Classement","Standings","الترتيب"],["Points","Points","النقاط"],["Journée","Matchday","الجولة"],["Groupe","Group","المجموعة"],["Saison actuelle","Current season","الموسم الحالي"],["Données de la saison actuelle.","Current-season data.","بيانات الموسم الحالي."],["Choisissez votre langue","Choose your language","اختر لغتك"],["Bienvenue sur BakhiraFoot","Welcome to BakhiraFoot","مرحباً بك في بخيرة فوت"],["Français","French","الفرنسية"],["English","English","الإنجليزية"],["العربية","Arabic","العربية"],["Continuer en français","Continue in French","المتابعة بالفرنسية"],["Continue in English","Continue in English","المتابعة بالإنجليزية"],["تابع باللغة العربية","Continue in Arabic","المتابعة بالعربية"],["Choisissez une langue pour découvrir les scores, les compétitions et l’actualité du football.","Choose a language to explore scores, competitions and football news.","اختر اللغة لاستكشاف النتائج والبطولات وأخبار كرة القدم."],["Match(s)","Match(es)","مباراة"],["Qualifications","Qualification","التأهل"],["Compositions & statistiques","Lineups & stats","التشكيلات والإحصائيات"],["Statistiques","Statistics","الإحصائيات"],["Événements","Events","الأحداث"],["Composition","Lineup","التشكيلة"],["Composition officielle","Official lineup","التشكيلة الرسمية"],["Pas encore annoncée","Not announced yet","لم يتم الإعلان عنها بعد"],["Les compositions ne sont pas encore disponibles pour cette rencontre.","Lineups have not yet been announced for this fixture.","لم يتم الإعلان عن تشكيلة هذه المباراة بعد."],["Les statistiques ne sont pas disponibles pour cette rencontre.","Match statistics are not available for this fixture.","إحصائيات هذه المباراة غير متاحة."],["Les données de cette rencontre ne sont pas encore disponibles.","Match data is not available yet.","بيانات هذه المباراة غير متاحة بعد."],["Fermer","Close","إغلاق"],["Suivant","Next","التالي"],["Précédent","Previous","السابق"],["Recherche","Search","بحث"],["Rechercher","Search","بحث"],["En direct","Live","مباشر"],["Programmés","Scheduled","مبرمجة"],["Terminés","Finished","منتهية"],["Annulés","Cancelled","ملغاة"],["Retardés","Delayed","متأخرة"],["Aujourd'hui","Today","اليوم"],["Hier","Yesterday","أمس"],["Demain","Tomorrow","غداً"],["Le programme du jour","Today's schedule","برنامج اليوم"],["Voir tous les matchs","View all matches","عرض جميع المباريات"]
  ];
  const norm = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim().toLowerCase();
  const dict = new Map();
  rows.forEach(row => [row[0],row[1],row[2]].forEach(value => {
    const key = norm(value);
    if (key && !dict.has(key)) dict.set(key,row);
  }));
  const originals = new WeakMap();
  const originalAttrs = new WeakMap();
  let activeLanguage = "fr";

  function getTranslation(value, lang=activeLanguage) {
    const key = norm(value);
    const row = dict.get(key);
    if (row) return row[LANGS.indexOf(lang)] ?? String(value ?? "");
    const clean = String(value ?? "").trim();
    let m=clean.match(/^(\d+)\s+matchs?$/i);
    if(m)return lang==="en"?(Number(m[1])===1?"1 match":m[1]+" matches"):lang==="ar"?m[1]+" مباراة":m[1]+" match(s)";
    m=clean.match(/^(\d+)\s+match\(s\)$/i);
    if(m)return lang==="en"?(Number(m[1])===1?"1 match":m[1]+" matches"):lang==="ar"?m[1]+" مباراة":m[1]+" match(s)";
    m=clean.match(/^(\d+)\s+matchs? joués?$/i);
    if(m)return lang==="en"?m[1]+" appearances":lang==="ar"?"عدد المشاركات: "+m[1]:m[1]+" matchs joués";
    if(/^Aucun match disponible pour cette date\.?$/i.test(clean))return lang==="en"?"No matches available on this date.":lang==="ar"?"لا توجد مباريات في هذا التاريخ.":clean;
    return null;
  }

  function shouldSkip(node) {
    const el=node.nodeType===1?node:node.parentElement;
    if(!el)return true;
    if(el.closest("script,style,noscript,code,pre,textarea,svg,[data-bf-no-translate]"))return true;
    if(el.closest(".bf-language-choice-code,.bf-language-choice-arrow"))return true;
    return false;
  }

  function translateTextNode(node) {
    if(!node||node.nodeType!==Node.TEXT_NODE||shouldSkip(node))return;
    if(!originals.has(node)){
      const current=node.nodeValue||"";
      originals.set(node,{text:current,prefix:(current.match(/^\s*/) || [""])[0],suffix:(current.match(/\s*$/) || [""])[0]});
    }
    const original=originals.get(node);
    const result=getTranslation(original.text);
    if(result===null)return;
    const val=original.prefix+result+original.suffix;
    if(node.nodeValue!==val)node.nodeValue=val;
  }

  function translateAttributes(el) {
    if(!el||el.nodeType!==Node.ELEMENT_NODE)return;
    if(el.matches("script,style,noscript,code,pre,[data-bf-no-translate]"))return;
    let saved=originalAttrs.get(el);
    if(!saved){saved=Object.create(null);originalAttrs.set(el,saved);}
    for(const attr of ["placeholder","aria-label","title"]){
      if(!el.hasAttribute(attr))continue;
      if(!(attr in saved))saved[attr]=el.getAttribute(attr);
      const target=getTranslation(saved[attr]);
      if(target!==null&&el.getAttribute(attr)!==target)el.setAttribute(attr,target);
    }
  }

  function translateSubtree(root) {
    if(!root)return;
    if(root.nodeType===Node.ELEMENT_NODE)translateAttributes(root);
    if(root.nodeType===Node.TEXT_NODE){translateTextNode(root);return;}
    if(root.nodeType===Node.ELEMENT_NODE&&root.matches("script,style,noscript,code,pre,[data-bf-no-translate]"))return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;while((node=walker.nextNode()))translateTextNode(node);
    if(root.querySelectorAll)root.querySelectorAll("[placeholder],[aria-label],[title]").forEach(translateAttributes);
  }

  function translatePage(){
    translateSubtree(document.body);
    const title=document.querySelector("head title");if(title)translateSubtree(title);
    const modalTitle=$("bf-language-welcome-title");
    if(modalTitle){
      modalTitle.textContent=activeLanguage==="en"?"Welcome to BakhiraFoot":activeLanguage==="ar"?"مرحباً بك في بخيرة فوت":"Bienvenue sur BakhiraFoot";
    }
  }

  function setLanguage(value,save=true){
    const lang=LANGS.includes(value)?value:"fr";
    activeLanguage=lang;
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==="ar"?"rtl":"ltr";
    if(document.body)document.body.dir=lang==="ar"?"rtl":"ltr";
    const select=$("bfLanguageSelect");if(select)select.value=lang;
    if(save){try{localStorage.setItem(STORAGE_KEY,lang);}catch{}}
    translatePage();
    const modal=$("bf-language-welcome");
    if(modal&&!modal.hidden){modal.hidden=true;if(document.body)document.body.style.overflow="";}
    document.dispatchEvent(new CustomEvent("bakhirafoot:languagechange",{detail:{language:lang}}));
  }

  function init(){
    let saved="";try{saved=localStorage.getItem(STORAGE_KEY)||"";}catch{}
    const hasSaved=LANGS.includes(saved);
    setLanguage(hasSaved?saved:"fr",false);
    const select=$("bfLanguageSelect");
    select?.addEventListener("change",()=>setLanguage(select.value,true));
    document.querySelectorAll("[data-bf-language]").forEach(button=>button.addEventListener("click",()=>setLanguage(button.getAttribute("data-bf-language"),true)));
    if(!hasSaved){const modal=$("bf-language-welcome");if(modal){modal.hidden=false;document.body.style.overflow="hidden";}}
    const observer=new MutationObserver(records=>{
      for(const record of records){
        if(record.type==="characterData")translateTextNode(record.target);
        for(const node of record.addedNodes||[])translateSubtree(node);
      }
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
  window.BakhiraFootLanguage={set:setLanguage,get:()=>activeLanguage,translate:translatePage};
})();
