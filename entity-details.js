/* Universal team/player profiles for BakhiraFoot; data-only, no API backend changes. */
(() => {
  "use strict";
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const norm=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const first=(...v)=>v.find(x=>x!==undefined&&x!==null&&x!=="")??"";
  const nameOf=v=>typeof v==="string"?v.trim():v&&typeof v==="object"?String(first(v.name,v.displayName,v.display_name,v.shortName,v.short_name,v.team_name,v.teamName)):"";
  function matchesNow(){try{return Array.isArray(currentMatches)?currentMatches:[]}catch(_){return[]}}
  function teamsNow(){try{return Array.isArray(teams)?teams:[]}catch(_){return[]}}
  function side(m,s){
    const raw=m?.teams?.[s]??m?.[s+"_team"]??m?.[s+"Team"]??m?.[s]??{};
    const name=first(typeof raw==="string"?raw:"",nameOf(raw),m?.[s+"_team_name"],m?.[s+"Name"],m?.[s+"_name"]);
    const v=m?.goals?.[s]??m?.scores?.[s]??m?.score?.[s]??m?.[s+"_score"]??m?.[s+"Score"]??raw?.score;
    const scoreVal=v&&typeof v==="object"?first(v.current,v.display,v.total,v.fulltime,v.score):v;
    return {name:String(name||"").trim(),logo:String(first(raw?.logo,raw?.image,raw?.badge,m?.[s+"_logo"],m?.[s+"Logo"])),score:scoreVal==null||scoreVal===""||scoreVal==="-"||!Number.isFinite(Number(scoreVal))?null:Number(scoreVal)};
  }
  const dateOf=m=>first(m?.fixture?.date,m?.date,m?.start_time,m?.kickoff,m?.utcDate);
  const leagueOf=m=>String(first(nameOf(m?.league),nameOf(m?.competition),m?.league_name,m?.competition_name,m?.tournament?.name,m?.fixture?.league?.name,"Football"));
  const idOf=m=>String(first(m?.fixture?.id,m?.fixture_id,m?.match_id,m?.id,m?.slug,m?.fixture?.slug));
  function statusOf(m){const s=String(first(m?.status?.short,m?.status?.long,m?.status_text,m?.status)).toLowerCase();if(/\b(live|1h|2h|ht|et|pen|playing)\b/.test(s))return"En direct";if(/\b(ft|aet|finished|ended|full time)\b/.test(s))return"Terminé";const d=new Date(dateOf(m));return !Number.isNaN(d.getTime())&&d.getTime()>Date.now()?"À venir":(s||"Match")}
  function unpack(p){try{if(typeof normalizeMatches==="function"){const a=normalizeMatches(p);if(Array.isArray(a))return a}}catch(_){}if(Array.isArray(p))return p;for(const k of ["response","matches","fixtures","results","data"]){if(Array.isArray(p?.[k]))return p[k];if(Array.isArray(p?.[k]?.response))return p[k].response}return[]}
  let fetchDay="",fetchPromise=null,fetchCache=[];
  async function allMatches(){const day=new Date().toISOString().slice(0,10);if(!fetchPromise||fetchDay!==day){fetchDay=day;fetchPromise=fetch("/api?date="+encodeURIComponent(day),{headers:{Accept:"application/json"},cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(p=>(fetchCache=unpack(p))).catch(e=>{console.warn("BakhiraFoot profiles",e);return fetchCache})}const seen=new Set();return [...matchesNow(),...(await fetchPromise)].filter(m=>{const id=idOf(m),k=id?"id:"+id:[norm(side(m,"home").name),norm(side(m,"away").name),norm(leagueOf(m)),String(dateOf(m)||"")].join("|");if(seen.has(k))return false;seen.add(k);return true})}
  function ensureModal(){let m=$("#bf-entity-modal");if(m)return m;const css=`
      #bf-entity-modal[hidden]{display:none!important}#bf-entity-modal{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:14px}#bf-entity-modal .bf-eb{position:absolute;inset:0;background:rgba(2,8,15,.8);backdrop-filter:blur(8px)}#bf-entity-modal .bf-ed{position:relative;width:min(760px,100%);max-height:89vh;overflow:auto;border:1px solid #294156;border-radius:20px;background:linear-gradient(155deg,#102235,#091522 72%);color:#edf5fb;box-shadow:0 30px 100px #0008}#bf-entity-modal .bf-eh{position:sticky;top:0;z-index:3;display:flex;justify-content:space-between;align-items:center;padding:13px 17px;border-bottom:1px solid #253b4e;background:#091522f5}#bf-entity-modal .bf-ec{width:36px;height:36px;border:1px solid #32495d;border-radius:10px;background:#12283a;color:#fff;font-size:22px;cursor:pointer}#bf-entity-modal .bf-ex{padding:17px}#bf-entity-modal .bf-ehero{display:flex;align-items:center;gap:14px;margin-bottom:17px;padding:16px;border:1px solid #263f53;border-radius:15px;background:linear-gradient(120deg,#132d40,#10271f)}#bf-entity-modal .bf-elogo{width:62px;height:62px;flex:0 0 62px;object-fit:contain;border-radius:13px;padding:5px;background:#f5f8fc}#bf-entity-modal .bf-efallback{display:flex;align-items:center;justify-content:center;width:62px;height:62px;flex:0 0 62px;border:1px solid #34566b;border-radius:13px;background:#0d1b29;font-size:27px}#bf-entity-modal .bf-ephoto{width:64px;height:64px;flex:0 0 64px;object-fit:cover;border:2px solid #38576c;border-radius:50%}#bf-entity-modal .bf-etitle{margin:0;color:#f3f8fc;font-size:clamp(20px,3vw,29px);line-height:1.2;font-weight:950;overflow-wrap:anywhere}#bf-entity-modal .bf-esub{margin:6px 0 0;color:#9ab0c1;font-size:11px;line-height:1.6}#bf-entity-modal .bf-esec{margin:17px 0 0}#bf-entity-modal .bf-esec h3{margin:0 0 10px;color:#e8f2f8;font-size:13px;font-weight:900}#bf-entity-modal .bf-estats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}#bf-entity-modal .bf-estat{min-width:0;padding:12px;border:1px solid #263c4f;border-radius:12px;background:#0d1c2a;overflow-wrap:anywhere}#bf-entity-modal .bf-estat strong{display:block;color:#f4fbff;font-size:21px;font-weight:950}#bf-entity-modal .bf-estat span{display:block;margin-top:5px;color:#90a8ba;font-size:9px;font-weight:850;line-height:1.4}#bf-entity-modal .bf-elist{display:grid;gap:8px}#bf-entity-modal .bf-efix{display:grid;grid-template-columns:66px minmax(0,1fr) 76px;align-items:center;gap:9px;padding:10px;border:1px solid #253b4e;border-radius:12px;background:#0d1b29}#bf-entity-modal .bf-edate{color:#8fa8ba;font-size:9px;line-height:1.5}#bf-entity-modal .bf-eteams{display:grid;gap:7px;min-width:0}#bf-entity-modal .bf-eteam{display:flex;align-items:center;gap:6px;min-width:0;color:#dbe8f1;font-size:10px;font-weight:800}#bf-entity-modal .bf-eteam img{width:19px;height:19px;object-fit:contain;flex:0 0 19px}#bf-entity-modal .bf-eteam span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#bf-entity-modal .bf-escore{display:grid;gap:6px;text-align:center;color:#f2fbff;font-size:12px;font-weight:950}#bf-entity-modal .bf-escore span{color:#7fe6b9;font-size:8px}#bf-entity-modal .bf-eempty{padding:14px;border:1px dashed #30495b;border-radius:12px;color:#9db2c2;font-size:11px;line-height:1.7}#bf-entity-modal .bf-epills{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}#bf-entity-modal .bf-epill{padding:5px 8px;border:1px solid #2c4b5c;border-radius:7px;background:#102b2a;color:#91e8c1;font-size:9px;font-weight:850}#bf-entity-modal .bf-enote{margin-top:12px;color:#829cae;font-size:10px;line-height:1.65}#bfSearchResults{width:min(540px,calc(100vw - 20px))!important;max-height:72vh!important;padding:10px!important;border:1px solid #29445a!important;border-radius:16px!important;background:#091725!important;color:#eef6fc!important;box-shadow:0 24px 70px #0006!important}#bfSearchResults .bf-search-result{display:grid!important;grid-template-columns:36px minmax(0,1fr)!important;grid-template-rows:auto auto;column-gap:10px;align-items:center;min-height:55px;margin:3px 0;padding:9px 11px!important;border:1px solid transparent!important;border-radius:11px!important;background:transparent!important;color:#eaf2f8!important}#bfSearchResults .bf-search-result:before{content:"⚽";grid-column:1;grid-row:1/span 2;display:flex;align-items:center;justify-content:center;width:34px;height:34px;border:1px solid #2b475b;border-radius:10px;background:#102437;font-size:16px}#bfSearchResults .bf-search-result[data-search-type="team"]:before{content:"🛡️"}#bfSearchResults .bf-search-result[data-search-type="player"]:before{content:"👤"}#bfSearchResults .bf-search-result[data-search-type="competition"]:before{content:"🏆"}#bfSearchResults .bf-search-result:hover{background:#122a3b!important;border-color:#2b6a51!important}#bfSearchResults .bf-search-result strong{grid-column:2;color:#f6fbff;font-size:12px;font-weight:900;overflow-wrap:anywhere}#bfSearchResults .bf-search-result small{grid-column:2;margin-top:4px;color:#9eb4c5;font-size:10px;overflow-wrap:anywhere}.bf-score-pro-team,.bf-score-team,.bf-match-team,.bf-ko-team,.ss-club,.ss-player-team,.bfmd-column-title,.bfmd-team-name,[data-bf-team-name]{cursor:pointer}[data-player-name],.ss-player-name,.bfmd-player-name,.bf-new-safe-player-name,.bf-new-safe-name,.bf-pitch-name{cursor:pointer}@media(max-width:600px){#bf-entity-modal{padding:5px}#bf-entity-modal .bf-ex{padding:10px}#bf-entity-modal .bf-ehero{gap:10px;padding:11px}#bf-entity-modal .bf-elogo,#bf-entity-modal .bf-efallback{width:50px;height:50px;flex-basis:50px}#bf-entity-modal .bf-estats{grid-template-columns:repeat(2,minmax(0,1fr))}#bf-entity-modal .bf-efix{grid-template-columns:53px minmax(0,1fr) 50px;gap:6px;padding:8px}}
    `;const st=document.createElement("style");st.id="bf-entity-styles";st.textContent=css;document.head.appendChild(st);m=document.createElement("div");m.id="bf-entity-modal";m.hidden=true;m.innerHTML='<div class="bf-eb" data-bf-entity-close></div><section class="bf-ed" role="dialog" aria-modal="true" aria-labelledby="bf-entity-title"><header class="bf-eh"><strong style="color:#6fe8b5;font-size:10px;letter-spacing:.15em">BAKHIRAFOOT · PROFIL</strong><button class="bf-ec" type="button" data-bf-entity-close aria-label="Fermer">×</button></header><div class="bf-ex" id="bf-entity-content"></div></section>';document.body.appendChild(m);return m}
  function show(html){const m=ensureModal();$("#bf-entity-content",m).innerHTML=html;document.body.dataset.bfOldOverflow=document.body.style.overflow;document.body.style.overflow="hidden";m.hidden=false;m.setAttribute("aria-hidden","false");$(".bf-ec",m)?.focus({preventScroll:true})}
  function close(){const m=$("#bf-entity-modal");if(!m)return;m.hidden=true;m.setAttribute("aria-hidden","true");document.body.style.overflow=document.body.dataset.bfOldOverflow||""}
  function logo(url, fallback){if(url&&/^(https?:\/\/|\/)/i.test(String(url)))return'<img class="bf-elogo" src="'+esc(url)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\';this.nextElementSibling.hidden=false"><span class="bf-efallback" hidden>'+fallback+'</span>';return'<span class="bf-efallback">'+esc(url||fallback)+'</span>'}
  function dateLabel(v){if(!v)return"Date non précisée";const d=new Date(v);return Number.isNaN(d.getTime())?String(v):new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"short",year:"numeric"}).format(d)}
  function standingRow(n){return $$(".ss-standing-row").find(r=>norm($(".ss-club-info strong",r)?.textContent)===norm(n))||null}
  function teamMeta(n,trigger){
    const base=teamsNow().find(t=>norm(t.name)===norm(n))||{};
    const holder=trigger?.closest?.(".bf-score-pro-team,.bf-score-team,.bf-score-card-team,.bf-match-team,.bf-ko-team,.ss-club,.bf-home-featured-team,[data-bf-team-name]");
    const img=holder?$("img[src]",holder):null;
    let logo=img?.getAttribute("src")||trigger?.getAttribute?.("data-bf-team-logo")||base.logo||"";
    for(const m of matchesNow())for(const s of ["home","away"]){const t=side(m,s);if(norm(t.name)===norm(n)&&t.logo)logo=t.logo}
    const row=standingRow(n);
    const group=row?.closest(".ss-standing-group");
    const values=row?Array.from(row.children).map(x=>String(x.textContent||"").trim()):[];
    const tableStats=values.length>=10?[
      ["Position",values[0]],["Matchs joués",values[2]],["Victoires",values[3]],
      ["Nuls",values[4]],["Défaites",values[5]],["Buts marqués",values[6]],
      ["Buts encaissés",values[7]],["Différence de buts",values[8]],["Points",values[9]]
    ].filter(x=>x[1]&&x[1]!=="—"):[];
    return{
      logo,country:base.country||"",
      league:group?$(".ss-standing-group-title",group)?.textContent?.trim()||"":"",
      row,tableStats,rank:values[0]||"",points:values[9]||""
    };
  }
  async function openTeam(n,opts={}){
    n=String(n||"").trim();if(!n)return;
    const meta=teamMeta(n,opts.trigger);
    const hero=()=>'<div class="bf-ehero">'+logo(meta.logo,"⚽")+'<div><span class="bf-entity-profile-kicker">FICHE CLUB</span><h2 class="bf-etitle" id="bf-entity-title">'+esc(n)+'</h2><p class="bf-esub">'+esc([meta.country,meta.league].filter(Boolean).join(" · ")||"Club / sélection")+'</p></div></div>';
    show(hero()+'<div class="bf-eempty">Chargement des résultats et des données de championnat disponibles…</div>');
    const list=await allMatches();
    const fixtures=list.filter(m=>norm(side(m,"home").name)===norm(n)||norm(side(m,"away").name)===norm(n))
      .sort((a,b)=>(new Date(dateOf(b)||0).getTime()||0)-(new Date(dateOf(a)||0).getTime()||0));
    const record={played:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0};
    fixtures.forEach(m=>{
      const h=side(m,"home"),a=side(m,"away");
      if(h.score==null||a.score==null)return;
      const isHome=norm(h.name)===norm(n),forGoals=isHome?h.score:a.score,against=isHome?a.score:h.score;
      record.played++;record.goalsFor+=forGoals;record.goalsAgainst+=against;
      if(forGoals>against)record.wins++;else if(forGoals===against)record.draws++;else record.losses++;
    });
    const metrics=meta.tableStats.length?meta.tableStats.map(([label,value])=>'<div class="bf-estat"><strong>'+esc(value)+'</strong><span>'+esc(label)+'</span></div>').join(""):"";
    const season=metrics?'<div class="bf-esec"><h3>Statistiques du championnat</h3><div class="bf-estats bf-entity-stat-grid">'+metrics+'</div><p class="bf-enote">Chiffres repris du classement actuellement chargé sur BakhiraFoot.</p></div>':"";
    const loaded=record.played?'<div class="bf-esec"><h3>Bilan des scores chargés</h3><div class="bf-estats"><div class="bf-estat"><strong>'+record.played+'</strong><span>Matchs avec score</span></div><div class="bf-estat"><strong>'+record.wins+'</strong><span>Victoires</span></div><div class="bf-estat"><strong>'+record.draws+'</strong><span>Nuls</span></div><div class="bf-estat"><strong>'+record.losses+'</strong><span>Défaites</span></div><div class="bf-estat"><strong>'+record.goalsFor+'</strong><span>Buts marqués</span></div><div class="bf-estat"><strong>'+record.goalsAgainst+'</strong><span>Buts encaissés</span></div></div><p class="bf-enote">Calcul limité aux rencontres avec score présentes dans les données déjà chargées.</p></div>':"";
    const matchSection=fixtures.length?'<div class="bf-esec"><h3>Rencontres disponibles ('+fixtures.length+')</h3><div class="bf-elist">'+fixtures.slice(0,10).map(fixture).join("")+'</div></div>':'<div class="bf-esec"><h3>Rencontres</h3><div class="bf-eempty">Aucune rencontre de ce club n’est présente dans les données actuellement chargées.</div></div>';
    const content=hero()+(season||loaded?season+loaded:'<div class="bf-eempty">Le classement de cette compétition n’est pas encore chargé. Les chiffres seront affichés lorsqu’une source les fournira.</div>')+matchSection+'<p class="bf-enote">Les statistiques de saison proviennent du tableau de classement visible. Les résultats ne sont pas extrapolés.</p>';
    $("#bf-entity-content",$("#bf-entity-modal")).innerHTML=content;
  }
  function playerName(node){if(!node)return"";const attr=node.getAttribute?.("data-player-name")||node.getAttribute?.("data-bf-player-name");if(attr)return attr.trim();return String(($(".bfmd-player-name,.bf-new-safe-player-name,.bf-new-safe-name,.ss-player-name,.bf-pitch-name",node)||node).textContent||"").trim().replace(/\s+/g," ")}
  function playerRow(n){const scorer=n?.closest?.(".ss-player");return scorer?.closest?.(".ss-player-row")||n?.closest?.(".ss-player-row,.bf-new-safe-list-player,.bf-new-safe-player,.bf-pitch-player,[data-bf-player-row],.bf-new-safe-combined-player")||n?.closest?.(".bfmd-player-name")?.parentElement?.parentElement||n?.parentElement||null}
  function openPlayer(n,opts={}){
    n=String(n||"").trim();if(!n)return;
    const node=opts.trigger||$$('[data-player-name],[data-bf-player-name],.ss-player-name,.bfmd-player-name,.bf-new-safe-player-name,.bf-new-safe-name,.bf-pitch-name,.bf-pitch-player,.bf-new-safe-player').find(el=>norm(playerName(el))===norm(n));
    const row=playerRow(node),img=row?$("img[src]",row):null;
    const dataNode=(opts.trigger||node)?.closest?.("[data-bf-player-name]")||opts.trigger||node;
    const meta=dataNode?.dataset||{};
    const position=first(row?$(".bfmd-position,.bf-new-safe-pos,.bf-new-safe-player-role,.ss-player-position",row)?.textContent?.trim():"",opts.position,meta.bfPlayerPosition,meta.position);
    const shirt=first(row?$(".bf-new-safe-shirt",row)?.textContent?.trim():"",meta.bfPlayerNumber,meta.number);
    const team=first(row?$(".ss-player-team",row)?.textContent?.replace(/^[🏟️⚽🛡️\s]+/u,"").trim():"",meta.bfPlayerTeam,meta.team);
    const rating=first(row?$(".bf-new-safe-player-rate,.bf-new-safe-safe-rating,.bf-new-safe-rating,.bf-new-safe-player-rating,.bfmd-rating,.ss-player-rating",row)?.textContent?.trim():"",meta.bfPlayerRating,meta.rating);
    const appearances=row?$(".ss-player-appearances",row)?.textContent?.trim():"";
    const topValue=row?$(".ss-player-value",row)?.textContent?.trim():"";
    const topTitle=row?$(".ss-player-card-head strong",row.closest(".ss-player-card"))?.textContent?.trim():"";
    const eventText=row?$(".bf-new-safe-pitch-events,.bf-new-safe-player-events,.bfmd-badges",row)?.textContent?.replace(/\s+/g," ").trim():"";
    const metrics=[];
    const add=(label,value)=>{value=String(value??"").trim();if(value&&value!=="—"&&value!=="-"&&value!=="null")metrics.push([label,value])};
    add("Numéro",shirt);add("Poste",position);add("Club",team);add("Note",rating);
    add("Matchs joués",appearances);
    add(topTitle||"Statistique du classement",topValue);
    add("Minutes",first(meta.bfPlayerMinutes,meta.minutes));
    add("Buts",first(meta.bfPlayerGoals,meta.goals));
    add("Passes décisives",first(meta.bfPlayerAssists,meta.assists));
    add("Cartons jaunes",first(meta.bfPlayerYellowCards,meta.yellowCards));
    add("Cartons rouges",first(meta.bfPlayerRedCards,meta.redCards));
    add("Arrêts",first(meta.bfPlayerSaves,meta.saves));
    add("Clean sheets",first(meta.bfPlayerCleanSheets,meta.cleanSheets));
    const unique=metrics.filter((x,i)=>metrics.findIndex(y=>y[0]===x[0])===i);
    const photo=img?.getAttribute("src")||"";
    const pills=unique.length?'<div class="bf-entity-meta">'+unique.slice(0,5).map(([k,v])=>'<span class="bf-epill">'+esc(k)+' : '+esc(v)+'</span>').join("")+'</div>':"";
    const detail=unique.length?'<div class="bf-esec"><h3>Informations et statistiques disponibles</h3><div class="bf-estats bf-entity-stat-grid">'+unique.map(([k,v])=>'<div class="bf-estat"><strong>'+esc(v)+'</strong><span>'+esc(k)+'</span></div>').join("")+'</div></div>':'<div class="bf-esec"><h3>Fiche du joueur</h3><div class="bf-eempty">La source ne fournit pas encore de statistiques individuelles pour ce joueur. Aucun chiffre n’est inventé.</div></div>';
    const events=eventText?'<div class="bf-esec"><h3>Actions relevées dans le match</h3><div class="bf-entity-event-line">'+esc(eventText)+'</div></div>':"";
    const hero='<div class="bf-ehero">'+(photo?'<img class="bf-ephoto" src="'+esc(photo)+'" alt="" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">':'<span class="bf-efallback">👤</span>')+'<div><span class="bf-entity-profile-kicker">FICHE JOUEUR</span><h2 class="bf-etitle" id="bf-entity-title">'+esc(n)+'</h2><p class="bf-esub">'+esc([team,position,opts.subtitle||""].filter(Boolean).join(" · ")||"Joueur de football")+'</p>'+pills+'</div></div>';
    show(hero+detail+events+'<p class="bf-enote">Les chiffres et actions affichés proviennent du classement ou des données du match déjà chargées.</p>');
  }
  function teamName(node){if(!node)return"";const attr=node.getAttribute?.("data-bf-team-name")||node.getAttribute?.("data-team-name");if(attr)return attr.trim();if(node.matches?.(".ss-player-team"))return node.textContent.replace(/^[🏟️⚽🛡️\s]+/u,"").trim();return String(($(".ss-club-info strong,.bf-team-name,.bf-details-team-name,.bfmd-team-name,[data-bf-team-name],strong",node)||node).textContent||"").replace(/\s+/g," ").trim()}
  function stop(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}
  document.addEventListener("click",e=>{const t=e.target instanceof Element?e.target:null;if(!t)return;if(t.closest("[data-bf-entity-close]")){stop(e);close();return}const result=t.closest("#bfSearchResults [data-search-type]");if(result&&["team","player"].includes(result.dataset.searchType)){stop(e);const n=result.dataset.searchValue||$("strong",result)?.textContent||"";if(result.dataset.searchType==="team")openTeam(n);else openPlayer(n,{subtitle:$("small",result)?.textContent||""});return}const sideTeam=t.closest("[data-bf-team-side]");if(sideTeam){const card=sideTeam.closest("[data-match-index]");let match=null;try{match=typeof currentMatches!=="undefined"?currentMatches[Number(card?.dataset.matchIndex)]:null}catch(_){}const which=sideTeam.dataset.bfTeamSide;const teamNameFromMatch=sideTeam.getAttribute("data-bf-team-name")||(match?(which==="away"?(typeof getAway==="function"?getAway(match):""):(typeof getHome==="function"?getHome(match):"")):"");if(teamNameFromMatch){stop(e);openTeam(String(teamNameFromMatch),{trigger:sideTeam});return}}const playerTeam=t.closest(".ss-player-team");if(playerTeam){const n=teamName(playerTeam);if(n){stop(e);openTeam(n,{trigger:playerTeam});return}}const pl=t.closest('[data-player-name],[data-bf-player-name],.ss-player-name,.bfmd-player-name,.bf-new-safe-player-name,.bf-new-safe-name,.bf-pitch-name,.bf-pitch-player,.bf-new-safe-player,.bf-new-safe-list-player,.bf-new-safe-combined-player');if(pl){const n=playerName(pl);if(n&&n.length<80){stop(e);openPlayer(n,{trigger:pl});return}}const tm=t.closest(".bf-score-pro-team,.bf-score-team,.bf-score-card-team,.bf-score-card-team-logo,.bf-match-team,.bf-team-name,.bf-ko-team,.ss-club,.bf-home-featured-team,.bfmd-column-title,.bfmd-team,.bf-new-safe-team,.bf-details-team,.bf-details-team-name,.bfmd-team-name,[data-bf-team-name],[data-team-name]");if(tm){const n=teamName(tm);if(n&&n.length<90&&!/^(Équipe locale|Équipe visiteuse|Domicile|Extérieur|Home|Away)$/i.test(n)){stop(e);openTeam(n,{trigger:tm})}}},true);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#bf-entity-modal")?.hidden)close()});
  window.BakhiraFootEntities={openTeam:(n,o)=>openTeam(n,o||{}),openPlayer:(n,o)=>openPlayer(n,o||{}),close};
})();