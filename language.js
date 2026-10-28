(() => {
  "use strict";
  const STORAGE_KEY = "bakhirafoot-language";
  const LANGS = ["fr", "en", "ar"];
  const $ = id => document.getElementById(id);
  const rows = [
    ["Accueil","Home","الرئيسية"],["Mes favoris","My favourites","المفضلة"],["Explorer","Explore","استكشف"],["FOOTBALL MONDIAL","WORLD FOOTBALL","كرة القدم العالمية"],["PERSONNALISÉ","PERSONALIZED","مخصص"],["RACCOURCI","QUICK LINKS","روابط سريعة"],["Tout voir ↗","View all ↗","عرض الكل ↗"],["Tout voir →","View all →","عرض الكل →"],["Voir tout →","View all →","عرض الكل →"],["Prochains matchs","Upcoming matches","المباريات القادمة"],["LE CLASSEMENT","THE STANDINGS","الترتيب"],["À NE PAS MANQUER","DON’T MISS","لا تفوت"],["MATCH CENTER","MATCH CENTER","مركز المباريات"],["À LA UNE","FEATURED","في الواجهة"],["Aucune compétition trouvée dans les matchs chargés.","No competitions found in the loaded matches.","لم يتم العثور على بطولات في المباريات المحملة."],["Aucun match en direct dans les données actuelles.","No live match is available in the current data.","لا توجد مباراة مباشرة في البيانات الحالية."],["Aucun prochain match trouvé dans les données chargées.","No upcoming fixture found in the loaded data.","لم يتم العثور على مباريات قادمة في البيانات المحملة."],["Traduire","Translate","ترجمة"],["Voir l’original","Show original","عرض الأصل"],["Traduction…","Translating…","جارٍ الترجمة…"],["Traduction indisponible","Translation unavailable","الترجمة غير متاحة"],["Ajouter aux favoris","Add to favourites","أضف إلى المفضلة"],["Retirer des favoris","Remove from favourites","إزالة من المفضلة"],["Cliquer sur le score pour ouvrir le match","Click the score to open match details","اضغط على النتيجة لفتح تفاصيل المباراة"],["Aucun favori choisi","No favourites chosen","لم يتم اختيار أي فرق مفضلة"]["Scores","Scores","النتائج"],["Compétitions","Competitions","البطولات"],["Équipes","Teams","الفرق"],["Actualités","News","الأخبار"],["Articles","Articles","مقالات"],["À propos","About","من نحن"],["Contact","Contact","اتصل بنا"],["Politique de confidentialité","Privacy policy","سياسة الخصوصية"],["Conditions d'utilisation","Terms of use","شروط الاستخدام"],["Données sportives :","Sports data:","البيانات الرياضية:"],["Rechercher une équipe ou un joueur","Search for a team or player","ابحث عن فريق أو لاعب"],["Changer le thème","Change theme","تغيير المظهر"],["Activer le mode clair","Enable light mode","تفعيل الوضع الفاتح"],["Activer le mode sombre","Enable dark mode","تفعيل الوضع الداكن"],
    ["FOOTBALL CULTURE","FOOTBALL CULTURE","ثقافة كرة القدم"],["THE GAME. THE PEOPLE. THE MOMENT.","THE GAME. THE PEOPLE. THE MOMENT.","اللعبة. الجمهور. اللحظة."],["POUR LES VRAIS PASSIONNÉS","FOR TRUE FANS","لعشاق كرة القدم الحقيقيين"],["Plus qu’un score.","More than a score.","أكثر من مجرد نتيجة."],["Toute une culture.","A whole culture.","ثقافة كاملة."],["Vivez chaque rencontre avec les scores en direct, les classements, les compositions et les histoires du football marocain et mondial.","Follow every fixture with live scores, standings, lineups and stories from Moroccan and world football.","عش كل مباراة مع النتائج المباشرة والترتيب والتشكيلات وأخبار كرة القدم المغربية والعالمية."],["Suivre les matchs","Follow matches","تابع المباريات"],["Explorer les compétitions","Explore competitions","استكشف البطولات"],["MATCHDAY","MATCHDAY","يوم المباراة"],["BOTOLA · EUROPE · MONDE","BOTOLA · EUROPE · WORLD","البطولة · أوروبا · العالم"],["LE FOOTBALL, EN DIRECT","FOOTBALL, LIVE","كرة القدم مباشرة"],["Le jeu nous","The game","اللعبة"],["rassemble.","brings us together.","تجمعنا."],["Scores · Stats · Passion","Scores · Stats · Passion","النتائج · الإحصائيات · الشغف"],["DATA EN TEMPS RÉEL","REAL-TIME DATA","بيانات مباشرة"],["VIVEZ LE FOOTBALL","LIVE FOOTBALL","عش كرة القدم"],["SANS FRONTIÈRES","WITHOUT BORDERS","بلا حدود"],
    ["Scores en direct","Live scores","نتائج مباشرة"],["Tous les matchs et résultats","All fixtures and results","جميع المباريات والنتائج"],["TOURNOIS & LIGUES","TOURNAMENTS & LEAGUES","البطولات والدوريات"],["Classements et qualifications","Standings and qualification","الترتيب والتأهل"],["À LA UNE","TOP STORIES","الأخبار الرئيسية"],["Actualités football","Football news","أخبار كرة القدم"],["Les dernières infos du football","The latest football news","آخر أخبار كرة القدم"],["Matchs du jour","Today's matches","مباريات اليوم"],["Le programme du jour, les scores en direct et les horaires des rencontres.","Today's fixtures, live scores and kickoff times.","مباريات اليوم والنتائج المباشرة ومواعيد الانطلاق."],["Tous les matchs","All matches","كل المباريات"],["Toutes les news","All news","كل الأخبار"],["Chargement des matchs…","Loading matches…","جارٍ تحميل المباريات…"],["Aucun match aujourd'hui.","No matches today.","لا توجد مباريات اليوم."],["Impossible de charger les matchs.","Unable to load matches.","تعذر تحميل المباريات."],["Impossible de charger le match.","Unable to load the match.","تعذر تحميل المباراة."],["Aucun match trouvé.","No matches found.","لم يتم العثور على مباريات."],["Matchs","Matches","المباريات"],["Sélectionnez une date","Select a date","اختر التاريخ"],["RÉPERTOIRE FOOTBALL","FOOTBALL DIRECTORY","دليل كرة القدم"],["Choisissez une compétition pour afficher ses matchs.","Choose a competition to view its matches.","اختر بطولة لعرض مبارياتها."],["Cliquez sur une compétition pour filtrer les matchs du jour.","Click a competition to filter today's matches.","اضغط على بطولة لتصفية مباريات اليوم."],["Aucun match disponible","No matches available","لا توجد مباريات متاحة"],["Aucun match","No matches","لا توجد مباريات"],["Aucun match dans ce filtre.","No matches in this filter.","لا توجد مباريات ضمن هذا التصفية."],["COMPÉTITION","COMPETITION","البطولة"],["COMPÉTITION SÉLECTIONNÉE","SELECTED COMPETITION","البطولة المحددة"],["Ouvrir le classement de cette compétition","Open this competition's standings","فتح ترتيب هذه البطولة"],["Détails","Details","التفاصيل"],["Voir les détails","View details","عرض التفاصيل"],["Détails du match","Match details","تفاصيل المباراة"],["Match Details","Match details","تفاصيل المباراة"],["Scores & Résultats","Scores & Results","النتائج والحصيلة"],["Suivez tous les matchs en direct, programmés et terminés.","Follow live, scheduled and completed matches.","تابع المباريات المباشرة والمبرمجة والمنتهية."],["Classements des grandes compétitions","Major competition standings","ترتيب البطولات الكبرى"],["Classements, buteurs et passeurs décisifs en temps réel.","Standings, top scorers and assists in real time.","الترتيب والهدافون وصناع الأهداف مباشرة."],["Équipes et clubs de football","Football teams and clubs","فرق وأندية كرة القدم"],["Actualités du football marocain et international","Moroccan and international football news","أخبار كرة القدم المغربية والعالمية"],["DERNIÈRES INFOS","LATEST NEWS","آخر الأخبار"],["CENTRE DE MATCHS","MATCH CENTER","مركز المباريات"],["FOOTBALL EN DIRECT","LIVE FOOTBALL","كرة القدم مباشرة"],["Chargement...","Loading...","جارٍ التحميل..."],["Chargement des données réelles de la rencontre.","Loading official match data.","جارٍ تحميل بيانات المباراة الرسمية."],["Identifiant du match introuvable.","Match ID not found.","لم يتم العثور على معرّف المباراة."],["Données du match invalides","Invalid match data","بيانات المباراة غير صالحة"],["MI-TEMPS","HALF-TIME","نهاية الشوط الأول"],["TERMINÉ","FINISHED","انتهت"],["À VENIR","UPCOMING","قادمة"],["REPORTÉ","POSTPONED","مؤجلة"],["ANNULÉ","CANCELLED","ألغيت"],["EN DIRECT","LIVE","مباشر"],["Le football en direct, avec passion.","Live football, with passion.","كرة القدم مباشرة، بشغف."],["Voir les matchs","View matches","شاهد المباريات"],["Buteurs","Scorers","الهدافون"],["Meilleurs buteurs","Top scorers","أفضل الهدافين"],["Meilleurs passeurs","Top assists","أفضل صناع الأهداف"],["Passeurs décisifs","Assists","التمريرات الحاسمة"],["Top 5","Top 5","أفضل 5"],["Données indisponibles.","Data unavailable.","البيانات غير متاحة."],["Équipe non renseignée","Unknown team","فريق غير محدد"],["Équipe","Team","الفريق"],["Joueur","Player","اللاعب"],["Matchs joués : —","Appearances: —","المباريات: —"],["Classement","Standings","الترتيب"],["Points","Points","النقاط"],["Journée","Matchday","الجولة"],["Groupe","Group","المجموعة"],["Saison actuelle","Current season","الموسم الحالي"],["Données de la saison actuelle.","Current-season data.","بيانات الموسم الحالي."],["Choisissez votre langue","Choose your language","اختر لغتك"],["Bienvenue sur BakhiraFoot","Welcome to BakhiraFoot","مرحباً بك في بخيرة فوت"],["Français","French","الفرنسية"],["English","English","الإنجليزية"],["العربية","Arabic","العربية"],["Continuer en français","Continue in French","المتابعة بالفرنسية"],["Continue in English","Continue in English","المتابعة بالإنجليزية"],["تابع باللغة العربية","Continue in Arabic","المتابعة بالعربية"],["Choisissez une langue pour découvrir les scores, les compétitions et l’actualité du football.","Choose a language to explore scores, competitions and football news.","اختر اللغة لاستكشاف النتائج والبطولات وأخبار كرة القدم."],["Match(s)","Match(es)","مباراة"],["Qualifications","Qualification","التأهل"],["Compositions & statistiques","Lineups & stats","التشكيلات والإحصائيات"],["Statistiques","Statistics","الإحصائيات"],["Événements","Events","الأحداث"],["Composition","Lineup","التشكيلة"],["Composition officielle","Official lineup","التشكيلة الرسمية"],["Pas encore annoncée","Not announced yet","لم يتم الإعلان عنها بعد"],["Les compositions ne sont pas encore disponibles pour cette rencontre.","Lineups have not yet been announced for this fixture.","لم يتم الإعلان عن تشكيلة هذه المباراة بعد."],["Les statistiques ne sont pas disponibles pour cette rencontre.","Match statistics are not available for this fixture.","إحصائيات هذه المباراة غير متاحة."],["Les données de cette rencontre ne sont pas encore disponibles.","Match data is not available yet.","بيانات هذه المباراة غير متاحة بعد."],["Fermer","Close","إغلاق"],["Suivant","Next","التالي"],["Précédent","Previous","السابق"],["Recherche","Search","بحث"],["Rechercher","Search","بحث"],["En direct","Live","مباشر"],["Programmés","Scheduled","مبرمجة"],["Terminés","Finished","منتهية"],["Annulés","Cancelled","ملغاة"],["Retardés","Delayed","متأخرة"],["Aujourd'hui","Today","اليوم"],["Hier","Yesterday","أمس"],["Demain","Tomorrow","غداً"],["Le programme du jour","Today's schedule","برنامج اليوم"],["Voir tous les matchs","View all matches","عرض جميع المباريات"],
    ["🏟️ Stade :","🏟️ Stadium:","🏟️ الملعب:"],
    ["👨‍⚖️ Arbitre :","👨‍⚖️ Referee:","👨‍⚖️ الحكم:"],
    ["📺 Chaîne :","📺 TV channel:","📺 القناة:"],
    ["🎙️ Commentateur :","🎙️ Commentator:","🎙️ المعلّق:"],
    ["Non communiqué","Not provided","غير متوفر"],
    ["Non communiquée","Not provided","غير متوفرة"],
    ["Résumé","Summary","الملخص"],
    ["Compos & terrain","Lineups & pitch","التشكيلات والملعب"],
    ["Stats du match","Match stats","إحصائيات المباراة"],
    ["Joueurs","Players","اللاعبون"],
    ["Derniers matchs","Recent matches","آخر المباريات"],
    ["Vote","Voting","التصويت"],
    ["Highlights","Highlights","أبرز اللقطات"],
    ["Commentaires","Comments","التعليقات"],
    ["Choisir une rubrique des détails du match","Choose a match-details section","اختر قسماً من تفاصيل المباراة"],
    ["Choisis une rubrique pour afficher ses détails.","Choose a section to view its details.","اختر قسماً لعرض تفاصيله."],
    ["Le score et les informations du match restent visibles. Choisis une rubrique pour consulter les détails.","The score and match information stay visible. Choose a section to view details.","ستبقى النتيجة ومعلومات المباراة ظاهرة. اختر قسماً لعرض التفاصيل."],
    ["Rubrique sélectionnée :","Selected section:","القسم المحدد:"],
    ["Choisis une autre rubrique dans le menu pour changer l’affichage.","Choose another section to change the view.","اختر قسماً آخر من القائمة لتغيير العرض."],
    ["Les données de «","Data for “","البيانات الخاصة بـ «"],
    ["Domicile","Home","الفريق المضيف"],
    ["Extérieur","Away","الفريق الضيف"],
    ["Stade","Stadium","الملعب"],
    ["Arbitre","Referee","الحكم"],
    ["Chaîne","TV channel","القناة"],
    ["Commentateur","Commentator","المعلّق"],
    ["COMPOSITIONS & PERFORMANCES SUR LE TERRAIN","LINEUPS & ON-PITCH PERFORMANCE","التشكيلات وأداء اللاعبين في الملعب"],
    ["NOTES · BUTS · PASSES · CARTONS · BLESSURES · MVP · REMPLACEMENTS","RATINGS · GOALS · ASSISTS · CARDS · INJURIES · MVP · SUBSTITUTIONS","التقييمات · الأهداف · التمريرات الحاسمة · البطاقات · الإصابات · أفضل لاعب · التبديلات"],
    ["DONNÉES DISPONIBLES POUR CHAQUE JOUEUR","PLAYER DATA AVAILABLE WHERE PROVIDED","بيانات اللاعبين المتاحة من المصدر"],
    ["📊 Statistiques des joueurs · ouvrir","📊 Player stats · open","📊 إحصائيات اللاعبين · افتح"],
    ["Clique sur un joueur pour ouvrir sa fiche","Click a player to open their profile","اضغط على لاعب لفتح ملفه"],
    ["DOMICILE · CÔTÉ GAUCHE","HOME · LEFT SIDE","المضيف · الجهة اليسرى"],
    ["EXTÉRIEUR · CÔTÉ DROIT","AWAY · RIGHT SIDE","الضيف · الجهة اليمنى"],
    ["Formations et compositions","Formations & lineups","الخطط والتشكيلات"],
    ["MVP et meilleure note","MVP & top rating","أفضل لاعب وأعلى تقييم"],
    ["Statistiques du match","Match statistics","إحصائيات المباراة"],
    ["Aucun événement détaillé disponible.","No detailed events available.","لا تتوفر أحداث مفصلة."],
    ["Composition officielle indisponible. Aucun joueur n’est placé au hasard sur le terrain.","Official lineup unavailable. Players are not placed randomly on the pitch.","التشكيلة الرسمية غير متاحة. لا يتم وضع اللاعبين عشوائياً في الملعب."],
    ["Joueurs indisponibles","Players unavailable","اللاعبون غير متاحين"],
    ["Statistiques détaillées indisponibles pour cette rencontre.","Detailed stats are unavailable for this match.","الإحصائيات التفصيلية غير متاحة لهذه المباراة."],
    ["Aucun MVP officiel ni note de joueur fournis par la source.","No official MVP or player ratings supplied by the source.","لم يوفّر المصدر أفضل لاعب رسميًا أو تقييمات اللاعبين."],
    ["⚡ Événements","⚡ Events","⚡ أحداث المباراة"],
    ["Remplacements","Substitutions","التبديلات"],
    ["📊 Qui va gagner ?","📊 Who will win?","📊 من سيفوز؟"],
    ["🗳️ Qui va gagner ?","🗳️ Who will win?","🗳️ من سيفوز؟"],
    ["Vote pour l’équipe que tu vois gagner ce match. Tu peux changer ton choix.","Vote for the team you think will win. You can change your vote.","صوّت للفريق الذي تتوقع فوزه. يمكنك تغيير تصويتك."],
    ["💬 Commentaires de cette rencontre","💬 Match comments","💬 تعليقات المباراة"],
    ["Ton pseudo","Your username","اسمك المستعار"],
    ["Ton commentaire…","Your comment…","تعليقك…"],
    ["Publier le commentaire","Post comment","نشر التعليق"],
    ["Pas encore de commentaire pour ce match. Lance la discussion !","No comments yet. Start the discussion!","لا توجد تعليقات بعد. ابدأ النقاش!"],
    ["Commentaire enregistré sur cet appareil.","Comment saved on this device.","تم حفظ التعليق على هذا الجهاز."],
    ["Vote enregistré sur cet appareil.","Vote saved on this device.","تم حفظ التصويت على هذا الجهاز."],
    ["Choisis une équipe pour enregistrer ton vote.","Choose a team to cast your vote.","اختر فريقاً لتسجيل تصويتك."],
    ["Ton vote est enregistré. Tu peux changer de choix.","Your vote is saved. You can change your choice.","تم تسجيل تصويتك. يمكنك تغيير اختيارك."],
    ["Enregistrement du vote…","Submitting vote…","جارٍ تسجيل التصويت…"],
    ["Publication…","Posting…","جارٍ النشر…"],
    ["Commentaire publié.","Comment posted.","تم نشر التعليق."],
    ["Vérifie le pseudo et le commentaire.","Check your username and comment.","تحقق من الاسم المستعار والتعليق."],
    ["Le navigateur n’a pas permis de sauvegarder ce commentaire localement.","Your browser could not save this comment locally.","تعذّر على المتصفح حفظ هذا التعليق محلياً."],
    ["🕘 Dernières confrontations directes","🕘 Recent head-to-head matches","🕘 المواجهات المباشرة الأخيرة"],
    ["Recherche des anciennes confrontations…","Loading previous meetings…","جارٍ البحث عن المواجهات السابقة…"],
    ["Aucune confrontation directe récente disponible pour ces équipes.","No recent head-to-head matches are available for these teams.","لا تتوفر مواجهات مباشرة حديثة بين الفريقين."],
    ["Les confrontations ne sont pas disponibles pour le moment.","Head-to-head data is unavailable right now.","المواجهات المباشرة غير متاحة حالياً."],
    ["🏆 Classement de","🏆 Standings for","🏆 ترتيب"],
    ["Ouvrir le classement complet ↗","Open full standings ↗","فتح الترتيب الكامل ↗"],
    ["Le classement n’est pas disponible pour cette compétition depuis la source actuelle.","Standings for this competition are unavailable from the current source.","ترتيب هذه البطولة غير متاح من المصدر الحالي."],
    ["Le classement n’est pas disponible pour le moment.","Standings are unavailable right now.","الترتيب غير متاح حالياً."],
    ["🎬 Highlights & résumés vidéo","🎬 Highlights & video recaps","🎬 أبرز اللقطات وملخصات الفيديو"],
    ["Voir les vidéos du match ↗","Watch match videos ↗","شاهد فيديوهات المباراة ↗"],
    ["📰 Actualités liées au match","📰 Match-related news","📰 أخبار المباراة"],
    ["Articles liés aux équipes et à leur compétition.","Articles related to these teams and their competition.","مقالات مرتبطة بالفريقين والبطولة."],
    ["Aucune actualité directement liée aux équipes ou à la compétition pour le moment.","No news directly related to these teams or the competition right now.","لا توجد أخبار مرتبطة مباشرة بالفريقين أو البطولة حالياً."],
    ["Matchs joués : —","Appearances: —","عدد المشاركات: —"],
    ["Position non communiquée","Position not provided","المركز غير متوفر"],
    ["Aucune statistique individuelle fournie pour ce joueur.","No individual statistics supplied for this player.","لم يتم توفير إحصائيات فردية لهذا اللاعب."],
    ["Clique sur un joueur sur le terrain pour afficher ses détails","Click a player on the pitch to view their details","اضغط على لاعب في الملعب لعرض تفاصيله"],
    ["Date inconnue","Date unknown","تاريخ غير معروف"],
    ["Équipe non renseignée","Unknown team","فريق غير محدد"],
    ["Le terrain et les informations du match restent visibles.","The pitch and match details remain visible.","سيبقى الملعب ومعلومات المباراة ظاهرين."]
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
  window.BakhiraFootLanguage={set:setLanguage,get:()=>activeLanguage,t:getTranslation,translate:translatePage};
})();
