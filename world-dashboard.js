/* BakhiraFoot World Dashboard — responsive, source-backed match centre. */
(() => {
  "use strict";
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const norm=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const first=(...v)=>v.find(x=>x!==undefined&&x!==null&&x!=="")??"";
  let dayMatches=[],liveMatches=[],all=[],liveTimer=null,dayTimer=null;
  const FAV_KEY="bakhirafoot-world-favorites-v1";
  function call(name,m,fallback=""){try{return typeof window[name]==="function"?window[name](m):fallback}catch(_){return fallback}}
  function unpack(data){try{if(typeof normalizeMatches==="function"){const n=normalizeMatches(data);if(Array.isArray(n))return n}}catch(_){}if(Array.isArray(data))return data;for(const k of ["response","matches","fixtures","results","data"]){if(Array.isArray(data?.[k]))return data[k];if(Array.isArray(data?.[k]?.response))return data[k].response}return[]}
  function team(m,s){const val=call(s==="home"?"getHome":"getAway",m,"");if(val&&typeof val==="object")return String(first(val.name,val.displayName,val.shortName,"Équipe"));if(val)return String(val);const raw=m?.teams?.[s]??m?.[s+"_team"]??m?.[s]??{};return String(first(typeof raw==="string"?raw:"",raw?.name,raw?.displayName,raw?.shortName,m?.[s+"_team_name"],m?.[s+"_name"],"Équipe"))}
  function crest(m,s){const val=call(s==="home"?"getHomeLogo":"getAwayLogo",m,"");const raw=m?.teams?.[s]??m?.[s+"_team"]??m?.[s]??{};return String(first(val,raw?.logo,raw?.image,raw?.badge,m?.[s+"_logo"],m?.[s+"Logo"],""))}
  function score(m,s){const val=call(s==="home"?"getHomeScore":"getAwayScore",m,"");if(val!==""&&val!==null&&val!==undefined&&val!=="-")return String(val);const raw=m?.goals?.[s]??m?.score?.[s]??m?.[s+"_score"]??m?.teams?.[s]?.score;if(raw===0)return"0";if(raw===null||raw===undefined||raw==="")return"—";return String(typeof raw==="object"?first(raw.current,raw.display,raw.total,raw.fulltime,"—"):raw)}
  function competition(m){return String(first(call("getLeague",m,""),m?.league?.name,m?.league_name,m?.competition?.name,m?.competition,"Football"))}
  function dateOf(m){return first(m?.fixture?.date,m?.date,m?.start_time,m?.kickoff,m?.utcDate,"")}
  function dateObj(m){const d=new Date(dateOf(m));return Number.isNaN(d.getTime())?null:d}
  function isLiveMatch(m){try{if(typeof window.isLive==="function"&&window.isLiveMatch(m?.status,m?.status_text))return true}catch(_){}const s=String(first(m?.status?.short,m?.status?.long,m?.status_text,m?.status,"")).toLowerCase();return /\b(live|1h|2h|ht|et|pen|playing|in play|en direct)\b/.test(s)}
  function status(m){if(isLiveMatch(m))return"En direct";const s=String(first(m?.status?.short,m?.status?.long,m?.status_text,m?.status,"")).toLowerCase();if(/\b(ft|aet|finished|ended|full time|termine|terminé)\b/.test(s))return"Terminé";const d=dateObj(m);return d&&d.getTime()>Date.now()?"À venir":s||"Match"}
  function time(m){const d=dateObj(m);return d?new Intl.DateTimeFormat("fr-FR",{hour:"2-digit",minute:"2-digit"}).format(d):"—"}
  function dateLabel(m){const d=dateObj(m);if(!d)return"Date non précisée";if(d.toDateString()===new Date().toDateString())return"Aujourd’hui · "+time(m);return new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(d)}
  function identity(m){const id=first(m?.fixture?.id,m?.fixture_id,m?.match_id,m?.id,m?.slug,m?.fixture?.slug,"");return id?"id:"+id:[norm(team(m,"home")),norm(team(m,"away")),norm(competition(m)),String(dateOf(m))].join("|")}
  function favs(){try{const x=JSON.parse(localStorage.getItem(FAV_KEY)||"[]");return Array.isArray(x)?x.filter(v=>typeof v==="string"):[]}catch(_){return[]}}
  function storeFavs(x){try{localStorage.setItem(FAV_KEY,JSON.stringify(x))}catch(_){}}
  async function fetchMatches(q){const r=await fetch("/api?"+q,{headers:{Accept:"application/json"},cache:"no-store"});if(!r.ok)throw Error("API "+r.status);return unpack(await r.json())}
  function makeWidget(kicker,title,body,view){const box=document.createElement("section");box.className="bf-world-widget";const head=document.createElement("div");head.className="bf-world-widget-head";const left=document.createElement("div");const small=document.createElement("span");small.className="bf-world-kicker";small.textContent=kicker;const h=document.createElement("h2");h.textContent=title;left.append(small,h);head.append(left);if(view){const b=document.createElement("button");b.type="button";b.className="bf-world-view-all";b.dataset.bfWorldGo=view;b.textContent="Tout voir →";head.append(b)}const area=document.createElement("div");area.className="bf-world-widget-body";area.append(body);box.append(head,area);return box}
  function empty(text){const d=document.createElement("div");d.className="bf-world-empty";d.textContent=text;return d}
  function createShell(){
    const home=$("#home");if(!home||$(".bf-world-dashboard",home))return;
    const shell=document.createElement("div");shell.className="bf-world-dashboard";
    const left=document.createElement("aside");left.className="bf-world-rail bf-world-rail-left";left.setAttribute("aria-label","Compétitions et clubs");
    const comps=document.createElement("div");comps.id="bfWorldCompetitions";comps.className="bf-world-comp-list";comps.append(empty("Chargement des compétitions…"));
    const favorites=document.createElement("div");favorites.id="bfWorldFavorites";favorites.className="bf-world-fav-list";favorites.append(empty("Choisissez les clubs à suivre avec ☆."));
    const shortcuts=document.createElement("div");shortcuts.className="bf-world-shortcuts";
    shortcuts.innerHTML='<button type="button" class="bf-world-comp" data-bf-world-go="scores">◉ <span class="bf-world-comp-label">Tous les scores</span> →</button><button type="button" class="bf-world-comp" data-bf-world-go="leagues">▤ <span class="bf-world-comp-label">Classements</span> →</button><button type="button" class="bf-world-comp" data-bf-world-go="news">▣ <span class="bf-world-comp-label">Actualités</span> →</button>';
    left.append(makeWidget("FOOTBALL MONDIAL","Compétitions",comps,"leagues"),makeWidget("PERSONNALISÉ","Mes favoris",favorites,""),makeWidget("RACCOURCI","Explorer",shortcuts,""));
    const center=document.createElement("div");center.className="bf-world-main";center.id="bfWorldMain";
    const featured=document.createElement("section");featured.className="bf-world-featured";featured.id="bfWorldFeatured";featured.setAttribute("aria-live","polite");featured.append(empty("Chargement des rencontres…"));center.append(featured);
    const right=document.createElement("aside");right.className="bf-world-rail bf-world-rail-right";right.setAttribute("aria-label","Matchs en direct et à venir");
    const liveBox=document.createElement("div");liveBox.className="bf-world-feature-list";liveBox.id="bfWorldLive";liveBox.append(empty("Recherche des matchs en direct…"));
    const count=document.createElement("span");count.id="bfWorldLiveCount";count.className="bf-world-count";count.textContent="LIVE";
    const liveWidget=makeWidget("LIVE CENTER","En direct",liveBox,"scores");liveWidget.querySelector(".bf-world-widget-head").append(count);
    const nextBox=document.createElement("div");nextBox.className="bf-world-feature-list";nextBox.id="bfWorldUpcoming";nextBox.append(empty("Chargement du programme…"));
    const standings=document.createElement("div");standings.id="bfWorldStandings";standings.className="bf-world-standings";standings.append(empty("Les classements disponibles apparaîtront ici."));
    right.append(liveWidget,makeWidget("À NE PAS MANQUER","Prochains matchs",nextBox,"scores"),makeWidget("LE CLASSEMENT","Classements",standings,"leagues"));
    shell.append(left,center,right);
    const anchor=$(".home-shortcuts",home)||$(".home-live-section",home)||home.firstElementChild;
    home.insertBefore(shell,anchor);
    [$(".home-shortcuts",home),$(".home-live-section",home),$(".home-news-heading",home),$("#homeNews",home),$(".bf-editorial-guide",home),$("#bfCommunity",home)].filter(Boolean).forEach(n=>center.appendChild(n));
    const title=$(".home-live-heading h2",center);if(title)title.textContent="Les matchs du jour";
    const p=$(".home-live-heading p",center);if(p)p.textContent="Scores, calendriers et rencontres du football mondial.";
    copyStandings();
  }
  function teamList(){
    const map=new Map();
    all.forEach(m=>["home","away"].forEach(s=>{const n=team(m,s),k=norm(n);if(!k||k==="equipe")return;if(!map.has(k))map.set(k,{name:n,logo:crest(m,s),count:0,live:0});const t=map.get(k);t.count++;if(!t.logo)t.logo=crest(m,s);if(isLiveMatch(m))t.live++}));
    return Array.from(map.values()).sort((a,b)=>b.live-a.live||b.count-a.count||a.name.localeCompare(b.name));
  }
  function logoHtml(src,cls){return src&&/^https?:\/\//i.test(src)?'<img class="'+cls+'" src="'+esc(src)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\';this.nextElementSibling.hidden=false"><span class="bf-world-team-fallback" hidden>⚽</span>':'<span class="bf-world-team-fallback">'+esc(src||"⚽")+'</span>'}
  function teamRow(t,canFav){const fav=favs().some(n=>norm(n)===norm(t.name));return '<div class="bf-world-club-row"><button type="button" class="bf-world-team-button" data-bf-team-name="'+esc(t.name)+'" data-bf-team-logo="'+esc(t.logo)+'">'+logoHtml(t.logo,"bf-world-team-logo")+'<span class="bf-world-team-label">'+esc(t.name)+'</span></button>'+(canFav?'<button type="button" class="bf-world-fav-toggle '+(fav?"is-fav":"")+'" data-bf-favorite="'+esc(t.name)+'" aria-label="'+(fav?"Retirer des favoris":"Ajouter aux favoris")+'" title="'+(fav?"Retirer des favoris":"Ajouter aux favoris")+'">'+(fav?"★":"☆")+'</button>':"")+'</div>'}
  function renderLeft(){
    const c=$("#bfWorldCompetitions"),f=$("#bfWorldFavorites");if(!c||!f)return;
    const comps=new Map();all.forEach(m=>{const n=competition(m),k=norm(n);if(!k)return;if(!comps.has(k))comps.set(k,{name:n,count:0,live:0});comps.get(k).count++;if(isLiveMatch(m))comps.get(k).live++});
    const list=Array.from(comps.values()).sort((a,b)=>b.live-a.live||b.count-a.count).slice(0,10);
    c.innerHTML=list.length?list.map(x=>'<div class="bf-world-comp-row"><button type="button" class="bf-world-comp" data-bf-world-competition="'+esc(x.name)+'"><span class="bf-world-comp-logo">'+(x.live?"🟢":"🏆")+'</span><span class="bf-world-comp-label">'+esc(x.name)+'</span></button><span class="bf-world-comp-count">'+(x.live?x.live+" LIVE":x.count)+'</span></div>').join(""):'<div class="bf-world-empty">Aucune compétition trouvée dans les matchs chargés.</div>';
    const ts=teamList(),saved=favs(),chosen=saved.map(n=>ts.find(t=>norm(t.name)===norm(n))||{name:n,logo:""}).slice(0,10);
    f.innerHTML=chosen.length?chosen.map(t=>teamRow(t,true)).join(""):'<div class="bf-world-empty">Pas encore de favoris. Appuyez sur ☆ à côté d’un club pour l’enregistrer ici.</div>';
  }
  function featuredCrest(match,side){const src=crest(match,side);return src&&/^https?:\/\//i.test(src)?'<img class="bf-world-featured-crest" src="'+esc(src)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\';this.nextElementSibling.hidden=false"><span class="bf-world-featured-fallback" hidden>⚽</span>':'<span class="bf-world-featured-fallback">'+esc(src||"⚽")+'</span>'}
  function featuredMarkup(m){
    const h=team(m,"home"),a=team(m,"away"),liveNow=isLiveMatch(m);
    return '<div class="bf-world-featured-head"><span class="bf-world-featured-label">'+(liveNow?'<i class="bf-world-live-dot"></i> EN DIRECT':'⚡ À LA UNE')+'</span><span class="bf-world-featured-meta">'+esc(competition(m)+' · '+dateLabel(m))+'</span></div><div class="bf-world-featured-body">'+
      '<button type="button" class="bf-world-featured-team" data-bf-team-name="'+esc(h)+'" data-bf-team-logo="'+esc(crest(m,"home"))+'">'+featuredCrest(m,"home")+'<span class="bf-world-featured-name">'+esc(h)+'</span></button>'+
      '<div class="bf-world-featured-score"><button type="button" class="bf-world-featured-scoreline" data-bf-world-match="'+esc(identity(m))+'" aria-label="Voir les détails du match">'+esc(score(m,"home"))+' : '+esc(score(m,"away"))+'</button><span class="bf-world-featured-status '+(liveNow?"is-live":"")+'">'+esc(status(m))+'</span></div>'+
      '<button type="button" class="bf-world-featured-team" data-bf-team-name="'+esc(a)+'" data-bf-team-logo="'+esc(crest(m,"away"))+'">'+featuredCrest(m,"away")+'<span class="bf-world-featured-name">'+esc(a)+'</span></button></div><div class="bf-world-featured-details"><span>'+esc(competition(m))+'</span><span>'+esc(dateLabel(m))+'</span><span>Cliquer sur le score pour ouvrir le match</span></div>';
  }
  function pickFeatured(){
    if(!all.length)return null;
    return [...all].sort((a,b)=>{const l=Number(isLiveMatch(b))-Number(isLiveMatch(a));if(l)return l;const da=dateObj(a)?.getTime()||0,db=dateObj(b)?.getTime()||0;const fa=da>Date.now(),fb=db>Date.now();if(fa!==fb)return fa?-1:1;if(fa)return da-db;return db-da})[0];
  }
  function openMatch(m){
    if(!m)return;
    try{let arr=Array.isArray(currentMatches)?currentMatches:[];const key=identity(m);let i=arr.findIndex(x=>identity(x)===key);if(i<0){arr.push(m);currentMatches=arr;i=arr.length-1}else if(isLiveMatch(m)){arr[i]=m;currentMatches=arr}if(typeof openMatchDetails==="function")openMatchDetails(i);else if(typeof window.openMatchDetails==="function")window.openMatchDetails(i)}catch(e){console.warn("BakhiraFoot match details:",e)}
  }
  function eventCard(m){const h=team(m,"home"),a=team(m,"away"),liveNow=isLiveMatch(m),d=dateObj(m);return '<button type="button" class="bf-world-event" data-bf-world-match="'+esc(identity(m))+'"><span class="bf-world-event-date">'+esc(liveNow?"LIVE":time(m))+'<br>'+esc(d?new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"short"}).format(d):"")+'</span><span class="bf-world-event-teams"><span class="bf-world-event-team">'+logoHtml(crest(m,"home"),"bf-world-event-logo")+'<span>'+esc(h)+'</span></span><span class="bf-world-event-team">'+logoHtml(crest(m,"away"),"bf-world-event-logo")+'<span>'+esc(a)+'</span></span><span class="bf-world-event-score">'+esc(score(m,"home"))+' : '+esc(score(m,"away"))+' · '+esc(competition(m))+'</span></span></button>'}
  function renderRight(){
    const l=$("#bfWorldLive"),u=$("#bfWorldUpcoming"),count=$("#bfWorldLiveCount");
    const liveList=all.filter(isLive).sort((a,b)=>(dateObj(b)?.getTime()||0)-(dateObj(a)?.getTime()||0));
    const next=all.filter(m=>{const d=dateObj(m);return d&&d.getTime()>Date.now()&&!isLiveMatch(m)}).sort((a,b)=>(dateObj(a)?.getTime()||0)-(dateObj(b)?.getTime()||0));
    if(count)count.textContent=liveList.length?liveList.length+" LIVE":"0 LIVE";
    if(l)l.innerHTML=liveList.length?liveList.slice(0,5).map(eventCard).join(""):'<div class="bf-world-empty">Aucun match en direct dans les données actuelles.</div>';
    if(u)u.innerHTML=next.length?next.slice(0,5).map(eventCard).join(""):'<div class="bf-world-empty">Aucun prochain match trouvé dans les données chargées.</div>';
  }
  function copyStandings(){
    const target=$("#bfWorldStandings"),source=$("#realStandings");if(!target||!source)return;
    const rows=$$(".ss-standing-row",source).slice(0,5);if(!rows.length)return;
    const box=document.createElement("div");box.className="bf-world-standing-source";
    const group=rows[0].closest(".ss-standing-group"),heading=group?.querySelector(".ss-standing-group-title");
    if(heading){const h=document.createElement("h3");h.textContent=heading.textContent;h.style.cssText="font-size:10px;color:#8debc4;margin:0 0 8px";box.append(h)}
    rows.forEach(row=>box.append(row.cloneNode(true)));target.innerHTML="";target.append(box);
  }
  function render(){
    const f=$("#bfWorldFeatured"),m=pickFeatured();
    if(f)f.innerHTML=m?featuredMarkup(m):'<div class="bf-world-featured-head"><span class="bf-world-featured-label">⚡ MATCH CENTER</span><span class="bf-world-featured-meta">Football mondial</span></div><div class="bf-world-empty">Aucune rencontre trouvée dans les données de cette journée. Consultez Scores pour changer de date.</div>';
    renderLeft();renderRight();copyStandings();
  }
  async function updateDay(){try{const date=new Date().toISOString().slice(0,10),result=await fetchMatches("date="+encodeURIComponent(date));if(result.length)dayMatches=result;all=merge();render()}catch(e){console.warn("BakhiraFoot dashboard date:",e);if(!all.length)render()}}
  async function updateLive(){try{const result=await fetchMatches("live=all");if(result.length)liveMatches=result;all=merge();render()}catch(e){console.warn("BakhiraFoot dashboard live:",e)}}
  function merge(){const map=new Map();[...dayMatches,...liveMatches].forEach(m=>{if(!m)return;const k=identity(m),old=map.get(k);if(!old||isLiveMatch(m)||score(m,"home")!=="—")map.set(k,m)});return Array.from(map.values())}
  function go(page){if(typeof window.go==="function")window.go(page);else $('nav [data-page="'+page+'"]')?.click()}
  document.addEventListener("click",e=>{
    const t=e.target instanceof Element?e.target:null;if(!t)return;
    const page=t.closest("[data-bf-world-go]");if(page){e.preventDefault();go(page.dataset.bfWorldGo);return}
    const comp=t.closest("[data-bf-world-competition]");if(comp){e.preventDefault();const n=comp.dataset.bfWorldCompetition;if(typeof window.openBakhiraCompetitionStandings==="function")window.openBakhiraCompetitionStandings(n);else go("leagues");return}
    const fav=t.closest("[data-bf-favorite]");if(fav){e.preventDefault();e.stopPropagation();const n=fav.dataset.bfFavorite,old=favs(),exists=old.some(v=>norm(v)===norm(n));storeFavs(exists?old.filter(v=>norm(v)!==norm(n)):[...old,n].slice(-20));renderLeft();return}
    const fixture=t.closest("[data-bf-world-match]");if(fixture){e.preventDefault();openMatch(all.find(m=>identity(m)===fixture.dataset.bfWorldMatch)||dayMatches.find(m=>identity(m)===fixture.dataset.bfWorldMatch)||liveMatches.find(m=>identity(m)===fixture.dataset.bfWorldMatch))}
  });
  function start(){
    const home=$("#home");if(!home)return;
    createShell();updateDay();updateLive();
    if(liveTimer)clearInterval(liveTimer);liveTimer=setInterval(()=>{if($("#home")?.classList.contains("active"))updateLive()},45000);
    if(dayTimer)clearInterval(dayTimer);dayTimer=setInterval(()=>{if($("#home")?.classList.contains("active"))updateDay()},120000);
    const source=$("#realStandings");if(source&&typeof MutationObserver!=="undefined")new MutationObserver(()=>copyStandings()).observe(source,{childList:true,subtree:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();