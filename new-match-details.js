(function(){
"use strict";

const API="/api?fixture=";

const arr=v=>Array.isArray(v)?v:[];
const obj=v=>v&&typeof v==="object"&&!Array.isArray(v)?v:null;

const first=(...a)=>
  a.find(v=>v!==null&&v!==undefined&&v!=="")??null;

const esc=v=>String(v??"")
  .replace(/&/g,"&amp;")
  .replace(/</g,"&lt;")
  .replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;")
  .replace(/'/g,"&#039;");

const norm=v=>String(v??"")
  .toLowerCase()
  .trim()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g,"")
  .replace(/\s+/g," ");

const nameOf=v=>String(
  first(
    v?.name,
    v?.displayName,
    v?.fullName,
    v?.full_name,
    v?.shortName,
    v?.title,
    ""
  )
);


/* =========================================================
   GET CURRENT MATCH
========================================================= */

function getMatch(i,card){
  try{
    return Array.isArray(window.currentMatches)
      ? window.currentMatches[i] || null
      : null;
  }catch{
    return null;
  }
}


/* =========================================================
   GET NEW MATCH ID
========================================================= */

function newId(i,card){

  const m=getMatch(i,card);

  if(!m){
    return null;
  }

  let provider=norm(
    first(
      m.provider,
      m.score?.provider,
      m.fixture?.provider,
      ""
    )
  );

  let id=first(
    m.fixture?.upstreamId,
    m.upstreamId,
    m.fixture?.id,
    m.id,
    card?.dataset?.fixtureId,
    card?.dataset?.matchSlug,
    card?.dataset?.slug
  );

  if(id===null || id===""){
    return null;
  }

  id=String(id).trim();

  if(/^(sofa|espn|tsdb)-/i.test(id)){
    return id;
  }

  if(provider.includes("sofa")){
    return "sofa-"+id;
  }

  if(provider.includes("espn")){
    return "espn-"+id;
  }

  if(
    provider.includes("sportsdb") ||
    provider.includes("sportdb") ||
    provider.includes("tsdb")
  ){
    return "tsdb-"+id;
  }

  return null;
}


/* =========================================================
   TEAM
========================================================= */

function team(d,s){

  const t=
    d?.teams?.[s] ||
    d?.[s+"_team"] ||
    d?.[s+"Team"] ||
    d?.[s] ||
    {};

  return {
    id:first(
      t.id,
      t.team_id,
      d?.[s+"_id"]
    ),

    name:String(
      first(
        t.name,
        t.displayName,
        d?.[s+"_name"],
        s==="home"
          ? "Domicile"
          : "Extérieur"
      )
    ),

    logo:String(
      first(
        t.logo,
        t.image,
        t.badge,
        t.picture,
        d?.[s+"_logo"],
        ""
      )
    )
  };
}


/* =========================================================
   SCORE
========================================================= */

function score(d,s){

  return first(
    d?.score?.[s],
    d?.goals?.[s],
    d?.[s+"_score"],
    d?.[s+"Score"],
    "-"
  );
}


/* =========================================================
   STATUS
========================================================= */

function status(d){

  const s=
    d?.fixture?.status ??
    d?.status ??
    {};

  return String(
    first(
      d?.status_text,
      typeof s==="string"
        ? s
        : null,
      s.long,
      s.description,
      s.short,
      "Match"
    )
  );
}


/* =========================================================
   LEAGUE
========================================================= */

function league(d){

  return String(
    first(
      d?.league?.name,
      d?.competition?.name,
      typeof d?.competition==="string"
        ? d.competition
        : null,
      "Football"
    )
  );
}


/* =========================================================
   PLAYER HELPERS
========================================================= */

function pName(p){

  const x=
    p?.player &&
    obj(p.player)
      ? p.player
      : p;

  return String(
    first(
      p?.name,
      p?.player_name,
      x?.name,
      x?.displayName,
      "Joueur"
    )
  );
}

function pNum(p){

  const x=
    p?.player &&
    obj(p.player)
      ? p.player
      : p;

  return first(
    p?.number,
    p?.shirt_number,
    p?.shirtNumber,
    p?.jersey,
    x?.number,
    "-"
  );
}

function pPos(p){

  const x=
    p?.player &&
    obj(p.player)
      ? p.player
      : p;

  return String(
    first(
      p?.position,
      p?.pos,
      p?.role,
      x?.position,
      x?.pos,
      ""
    )
  );
}

function pPhoto(p){

  const x=
    p?.player &&
    obj(p.player)
      ? p.player
      : p;

  return String(
    first(
      p?.photo,
      p?.image,
      p?.picture,
      p?.avatar,
      p?.headshot,
      p?.photo_url,
      p?.image_url,

      x?.photo,
      x?.image,
      x?.picture,
      x?.avatar,
      x?.headshot,
      x?.photo_url,
      x?.image_url,

      ""
    )
  );
}

function pRate(p){

  const x=
    p?.player &&
    obj(p.player)
      ? p.player
      : p;

  const r=
    first(
      p?.rating,
      p?.match_rating,
      p?.matchRating,
      p?.ratingValue,
      p?.statistics?.rating,
      p?.performance?.rating,

      x?.rating,
      x?.match_rating,
      x?.ratingValue
    );

  if(r===null){
    return null;
  }

  const n=
    Number(
      String(r)
        .replace(",",".")
        .trim()
    );

  return Number.isFinite(n)
    ? n
    : null;
}

function pSide(p){

  return norm(
    first(
      p?.side,
      p?.team_side,
      p?.teamType,
      ""
    )
  );
}


/* =========================================================
   PLAYER TEAM CHECK
========================================================= */

function belongs(p,s,t){

  const ps=pSide(p);

  if(ps){

    if(s==="home"){
      return ps==="home" || ps==="host";
    }

    return ps==="away" || ps==="guest";
  }

  const pt=
    p?.team ||
    p?.club ||
    {};

  const id=
    first(
      pt.id,
      pt.team_id,
      p?.team_id
    );

  const n=
    first(
      pt.name,
      p?.team_name
    );

  return !!(
    (
      t.id &&
      id &&
      String(t.id)===String(id)
    )
    ||
    (
      n &&
      t.name &&
      norm(n)===norm(t.name)
    )
  );
}


/* =========================================================
   LINEUPS
========================================================= */

function lineup(d,s,t){

  const raw=
    first(
      d?.lineups,
      d?.lineup,
      d?.compositions,
      d?.formations,
      {}
    );

  let g=null;

  if(Array.isArray(raw)){

    g=
      raw.find(
        x=>belongsGroup(x,s,t)
      )
      ||
      raw[s==="home"?0:1]
      ||
      null;

  }else if(obj(raw)){

    g=
      raw[s]
      ||
      raw[
        s==="home"
          ? "homeTeam"
          : "awayTeam"
      ]
      ||
      raw[
        s==="home"
          ? "host"
          : "guest"
      ]
      ||
      null;
  }

  let xi=[];
  let sub=[];

  let f=
    first(
      g?.formation,
      g?.tactics?.formation,
      g?.tacticalFormation,

      obj(raw)
        ? raw?.[s+"_formation"]
        : null,

      d?.[s+"_formation"],

      "—"
    );


  /* DIRECT SIDE */

  if(obj(raw)){

    xi=
      arr(
        first(
          raw?.[s+"_xi"],
          raw?.[s+"_startingXI"],
          raw?.[s+"_starting_xi"],
          []
        )
      );

    sub=
      arr(
        first(
          raw?.[s+"_subs"],
          raw?.[s+"_substitutes"],
          raw?.[s+"_bench"],
          []
        )
      );
  }


  /* SOURCE */

  if(!xi.length && g){

    xi=
      arr(
        first(
          g.startXI,
          g.startingXI,
          g.starting_xi,
          g.starters,
          g.xi,
          g.players,
          []
        )
      );
  }

  if(!sub.length && g){

    sub=
      arr(
        first(
          g.substitutes,
          g.subs,
          g.bench,
          []
        )
      );
  }


  /* ALL PLAYERS */

  const all=
    arr(
      obj(raw)
        ? (
            raw.players ||
            raw.lineup_players
          )
        : null
    );

  if(!xi.length && all.length){

    const a=
      all.filter(
        p=>belongs(p,s,t)
      );

    const st=
      a.filter(
        p=>
          p?.starter===true ||
          p?.is_starting===true ||
          p?.starting===true ||
          p?.first===1 ||
          p?.first===true
      );

    xi=
      (
        st.length
          ? st
          : a
      ).slice(0,11);

    if(
      !sub.length &&
      a.length>11
    ){
      sub=a.slice(11);
    }
  }


  /* ARRAY FORMAT */

  if(
    !xi.length &&
    Array.isArray(raw)
  ){

    const a=
      raw
        .filter(
          x=>
            obj(x) &&
            (
              x.name ||
              x.player_name ||
              x.player
            )
        )
        .filter(
          p=>belongs(p,s,t)
        );

    const st=
      a.filter(
        p=>
          p?.starter===true ||
          p?.is_starting===true ||
          p?.first===1 ||
          p?.first===true
      );

    xi=
      (
        st.length
          ? st
          : a
      ).slice(0,11);

    if(
      !sub.length &&
      a.length>11
    ){
      sub=a.slice(11);
    }
  }


  /* DIRECT DETAILS */

  if(!xi.length){

    xi=
      arr(
        first(
          d?.[s+"_xi"],
          d?.[s+"_startingXI"],
          []
        )
      );
  }


  return {
    formation:
      String(f||"—")
        .replace(
          /^(\d{3,4})$/,
          (_,x)=>x.split("").join("-")
        ),

    xi:
      xi.slice(0,11),

    sub
  };
}


/* =========================================================
   LINEUP TEAM MATCH
========================================================= */

function belongsGroup(x,s,t){

  if(!obj(x)){
    return false;
  }

  const q=
    x.team ||
    x.club ||
    {};

  const id=
    first(
      q.id,
      q.team_id,
      x.team_id,
      x.id
    );

  const n=
    first(
      q.name,
      x.team_name,
      x.name
    );

  const side=
    norm(
      first(
        x.side,
        x.team_side,
        ""
      )
    );

  return !!(
    (
      t.id &&
      id &&
      String(t.id)===String(id)
    )
    ||
    (
      n &&
      t.name &&
      norm(n)===norm(t.name)
    )
    ||
    side===s
    ||
    (
      s==="home" &&
      side==="host"
    )
    ||
    (
      s==="away" &&
      side==="guest"
    )
  );
}


/* =========================================================
   EVENTS
========================================================= */

function events(d){

  return arr(
    first(
      d?.events,
      d?.incidents,
      d?.plays,
      []
    )
  );
}

function eType(e){

  return norm(
    first(
      typeof e?.type==="object"
        ? nameOf(e.type)
        : e?.type,

      e?.incidentType,
      e?.kind,
      e?.detail,
      e?.text,

      ""
    )
  );
}

function eIcon(e){

  const t=eType(e);

  if(
    t.includes("goal") ||
    t.includes("score")
  ){
    return "⚽";
  }

  if(t.includes("yellow")){
    return "🟨";
  }

  if(t.includes("red")){
    return "🟥";
  }

  if(t.includes("sub")){
    return "🔄";
  }

  return "•";
}

function ePlayer(e){

  return String(
    first(
      e?.player?.name,
      e?.athlete?.displayName,
      e?.player_name,
      e?.name,
      e?.participants?.[0]?.athlete?.displayName,
      e?.text,
      e?.detail,
      "Événement"
    )
  );
}

function eAssist(e){

  return String(
    first(
      e?.assist?.name,
      e?.assist?.player?.name,
      e?.participants?.[1]?.athlete?.displayName,
      e?.in?.name,
      e?.player_in?.name,
      ""
    )
  );
}

function eTeam(e){

  return String(
    first(
      e?.team?.name,
      e?.team_name,
      e?.club?.name,
      ""
    )
  );
}

function eMin(e){

  return first(
    e?.minute,
    e?.clock?.displayValue,
    e?.elapsed,
    e?.time?.minute,
    e?.time,
    "-"
  );
}


/* =========================================================
   RATINGS MAP
========================================================= */

function ratingMap(d){

  const m=new Map();

  for(
    const p of arr(d?.players)
  ){

    const r=pRate(p);

    if(r!==null){

      m.set(
        norm(pName(p)),
        r
      );
    }
  }

  for(
    const g of arr(d?.lineups)
  ){

    for(
      const p of arr(g?.players)
    ){

      const r=pRate(p);

      if(r!==null){

        m.set(
          norm(pName(p)),
          r
        );
      }
    }
  }

  return m;
}


/* =========================================================
   CSS
========================================================= */

function styles(){

  if(
    document.getElementById(
      "bfndStyle"
    )
  ){
    return;
  }

  const s=
    document.createElement(
      "style"
    );

  s.id="bfndStyle";

  s.textContent=`

#bfNewMatchDetailsModal{
  display:none;
  position:fixed;
  inset:0;
  z-index:999999;
}

.bfnd-bg{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.82);
  display:flex;
  align-items:center;
  justify-content:center;
  padding:12px;
  overflow:auto;
}

.bfnd-box{
  width:min(1150px,100%);
  max-height:95vh;
  overflow:auto;
  background:var(--card,#fff);
  color:var(--text,#111827);
  border-radius:22px;
  padding:24px;
  position:relative;
  box-shadow:0 30px 100px rgba(0,0,0,.45);
}

.bfnd-close{
  position:absolute;
  top:10px;
  right:10px;
  width:40px;
  height:40px;
  border:0;
  border-radius:50%;
  cursor:pointer;
  font-size:18px;
  font-weight:900;
}

.bfnd-league{
  text-align:center;
  font-size:13px;
  font-weight:900;
  opacity:.7;
}

.bfnd-head{
  display:grid;
  grid-template-columns:1fr auto 1fr;
  gap:16px;
  align-items:center;
  text-align:center;
  margin:16px 0;
}

.bfnd-team{
  font-weight:900;
  overflow-wrap:anywhere;
}

.bfnd-team img{
  width:70px;
  height:70px;
  object-fit:contain;
  display:block;
  margin:auto;
}

.bfnd-score{
  font-size:40px;
  font-weight:950;
}

.bfnd-status{
  font-size:10px;
  font-weight:900;
  padding:6px 11px;
  border-radius:999px;
  background:rgba(220,38,38,.1);
  display:inline-block;
  margin-top:6px;
}

.bfnd-info{
  display:flex;
  justify-content:center;
  gap:7px;
  flex-wrap:wrap;
}

.bfnd-info span{
  padding:6px 9px;
  border-radius:999px;
  background:rgba(127,127,127,.1);
  font-size:10px;
}

.bfnd-sec{
  margin-top:24px;
  padding-top:18px;
  border-top:1px solid rgba(127,127,127,.16);
}

.bfnd-title{
  font-size:17px;
  font-weight:950;
  margin-bottom:13px;
}

.bfnd-pitches,
.bfnd-lists{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:16px;
}

.bfnd-pitch{
  position:relative;
  aspect-ratio:.68;
  border-radius:14px;
  overflow:hidden;

  background:
    repeating-linear-gradient(
      90deg,
      #26743b 0,
      #26743b 10%,
      #2e8045 10%,
      #2e8045 20%
    );
}

.bfnd-line{
  position:absolute;
  inset:7px;
  border:2px solid #fff;
}

.bfnd-mid{
  position:absolute;
  top:50%;
  left:7px;
  right:7px;
  height:2px;
  background:#fff;
}

.bfnd-circle{
  position:absolute;
  top:50%;
  left:50%;
  width:20%;
  aspect-ratio:1;
  transform:translate(-50%,-50%);
  border:2px solid #fff;
  border-radius:50%;
}

.bfnd-player{
  position:absolute;
  transform:translate(-50%,-50%);
  width:90px;
  text-align:center;
}

.bfnd-photo{
  width:42px;
  height:42px;
  border-radius:50%;
  object-fit:cover;
  border:2px solid #fff;
  background:#fff;
  display:inline-block;
}

.bfnd-pname{
  font-size:9px;
  font-weight:900;
  background:rgba(0,0,0,.78);
  color:#fff;
  border-radius:5px;
  padding:3px;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}

.bfnd-num{
  font-size:9px;
  background:#fff;
  border-radius:50%;
  padding:3px 5px;
  position:relative;
  left:20px;
  top:-8px;
}

.bfnd-rate{
  font-size:9px;
  font-weight:900;
  background:#fff;
  border-radius:5px;
  display:inline-block;
  padding:2px 4px;
}

.bfnd-row{
  display:grid;
  grid-template-columns:36px 34px 1fr auto;
  gap:7px;
  align-items:center;
  padding:7px;
  margin-bottom:6px;
  border-radius:9px;
  background:rgba(127,127,127,.07);
}

.bfnd-row img{
  width:34px;
  height:34px;
  border-radius:50%;
  object-fit:cover;
}

.bfnd-num2{
  width:30px;
  height:30px;
  border-radius:50%;
  display:flex;
  align-items:center;
  justify-content:center;
  background:rgba(127,127,127,.12);
  font-size:9px;
  font-weight:900;
}

.bfnd-name{
  font-size:11px;
  font-weight:900;
}

.bfnd-pos{
  font-size:9px;
  opacity:.55;
}

.bfnd-badge{
  font-size:8px;
  padding:3px 5px;
  border-radius:5px;
  background:rgba(127,127,127,.12);
}

.bfnd-event{
  display:grid;
  grid-template-columns:45px 30px 1fr;
  gap:8px;
  align-items:center;
  padding:9px;
  border-radius:9px;
  background:rgba(127,127,127,.07);
  margin-bottom:6px;
}

.bfnd-empty{
  padding:12px;
  border-radius:9px;
  background:rgba(127,127,127,.06);
  font-size:11px;
  opacity:.65;
}

.bfnd-motm{
  text-align:center;
  padding:12px;
  border-radius:10px;
  background:rgba(250,204,21,.1);
  font-size:12px;
  font-weight:900;
}

@media(max-width:800px){

  .bfnd-pitches,
  .bfnd-lists{
    grid-template-columns:1fr;
  }
}

@media(max-width:600px){

  .bfnd-box{
    padding:18px 10px;
  }

  .bfnd-head{
    gap:8px;
  }

  .bfnd-score{
    font-size:28px;
  }

  .bfnd-team{
    font-size:11px;
  }

  .bfnd-team img{
    width:55px;
    height:55px;
  }

  .bfnd-row{
    grid-template-columns:32px 32px 1fr;
  }

  .bfnd-badge{
    grid-column:3;
  }
}

`;

  document.head.appendChild(s);
}


/* =========================================================
   MODAL
========================================================= */

function modal(){

  let m=
    document.getElementById(
      "bfNewMatchDetailsModal"
    );

  if(m){
    return m;
  }

  m=
    document.createElement(
      "div"
    );

  m.id=
    "bfNewMatchDetailsModal";

  m.innerHTML=`

    <div class="bfnd-bg">

      <div
        class="bfnd-box"
        onclick="event.stopPropagation()"
      >

        <button
          class="bfnd-close"
          type="button"
        >
          ✕
        </button>

        <div id="bfndContent"></div>

      </div>

    </div>

  `;

  document.body.appendChild(m);

  m
    .querySelector(".bfnd-close")
    .onclick=close;

  m
    .querySelector(".bfnd-bg")
    .onclick=close;

  styles();

  return m;
}

function close(){

  const m=
    document.getElementById(
      "bfNewMatchDetailsModal"
    );

  if(m){
    m.style.display="none";
  }

  document.body.style.overflow="";
}


/* =========================================================
   PLAYER ROW
========================================================= */

function row(p,rm){

  const photo=pPhoto(p);

  const r=
    first(
      pRate(p),
      rm.get(
        norm(pName(p))
      )
    );

  return`

    <div class="bfnd-row">

      ${
        photo
          ? `
            <img
              src="${esc(photo)}"
              loading="lazy"
              alt="${esc(pName(p))}"
            >
          `
          : `
            <div class="bfnd-num2">
              ⚽
            </div>
          `
      }

      <div class="bfnd-num2">
        ${esc(pNum(p))}
      </div>

      <div>

        <div class="bfnd-name">
          ${esc(pName(p))}
        </div>

        <div class="bfnd-pos">
          ${esc(pPos(p))}
        </div>

      </div>

      <div>

        ${
          r!=null
            ? `
              <span class="bfnd-badge">
                ⭐ ${esc(r)}
              </span>
            `
            : ""
        }

      </div>

    </div>

  `;
}


/* =========================================================
   PITCH
========================================================= */

function pitch(l,t,rm){

  const ps=
    arr(l.xi)
      .slice(0,11);

  if(!ps.length){

    return`

      <div>

        <b>
          ${esc(t.name)}
        </b>

        <div class="bfnd-empty">
          التشكيلة غير متوفرة
        </div>

      </div>

    `;
  }

  const c={
    gk:[],
    def:[],
    mid:[],
    att:[],
    u:[]
  };

  for(
    const p of ps
  ){

    const x=
      norm(
        pPos(p)
      );

    let k;

    if(
      x.includes("goal") ||
      ["g","gk","1"].includes(x)
    ){

      k="gk";

    }else if(
      x.includes("def") ||
      x.includes("back") ||
      ["d","df","2"].includes(x)
    ){

      k="def";

    }else if(
      x.includes("mid") ||
      ["m","mf","3"].includes(x)
    ){

      k="mid";

    }else if(
      x.includes("att") ||
      x.includes("forw") ||
      x.includes("strik") ||
      x.includes("wing") ||
      ["f","fw","4"].includes(x)
    ){

      k="att";

    }else{

      k="u";
    }

    c[k].push(p);
  }


  let f=
    String(
      l.formation || ""
    )
      .split("-")
      .map(Number)
      .filter(n=>n>0);


  if(!f.length){

    f=[
      c.def.length || 4,
      c.mid.length || 3,
      c.att.length || 3
    ];
  }


  const rows=[
    [
      ...c.gk.slice(0,1)
    ]
  ];

  const used=[
    0,
    0,
    0
  ];


  f.forEach(
    (n,i)=>{

      let list;

      let idx;

      if(i===0){

        list=c.def;
        idx=0;

      }else if(
        i===f.length-1
      ){

        list=c.att;
        idx=2;

      }else{

        list=c.mid;
        idx=1;
      }

      const a=
        list.slice(
          used[idx],
          used[idx]+n
        );

      used[idx]+=a.length;

      rows.push(a);
    }
  );


  const flat=[];

  rows.forEach(
    (r,ri)=>{

      r.forEach(
        (p,ci)=>{

          flat.push({
            p,

            x:
              50 +
              (
                ci -
                (r.length-1)/2
              ) *
              Math.min(
                17,
                70 /
                Math.max(
                  r.length,
                  1
                )
              ),

            y:
              8 +
              ri *
              (
                84 /
                (
                  rows.length-1 ||
                  1
                )
              )
          });

        }
      );

    }
  );


  return`

    <div>

      <div
        style="
          text-align:center;
          font-size:12px;
          font-weight:900;
          margin-bottom:6px;
        "
      >

        ${esc(t.name)}

        <span style="opacity:.6">
          ${esc(l.formation)}
        </span>

      </div>

      <div class="bfnd-pitch">

        <div class="bfnd-line"></div>
        <div class="bfnd-mid"></div>
        <div class="bfnd-circle"></div>

        ${flat.map(
          ({p,x,y})=>{

            const ph=
              pPhoto(p);

            const r=
              first(
                pRate(p),
                rm.get(
                  norm(
                    pName(p)
                  )
                )
              );

            return`

              <div
                class="bfnd-player"
                style="
                  left:${Math.max(
                    7,
                    Math.min(
                      93,
                      x
                    )
                  )}%;
                  top:${y}%;
                "
              >

                ${
                  ph
                    ? `
                      <img
                        class="bfnd-photo"
                        src="${esc(ph)}"
                        alt="${esc(
                          pName(p)
                        )}"
                      >
                    `
                    : `
                      <div class="bfnd-photo">
                        ⚽
                      </div>
                    `
                }

                <span class="bfnd-num">
                  ${esc(pNum(p))}
                </span>

                <div class="bfnd-pname">
                  ${esc(pName(p))}
                </div>

                ${
                  r!=null
                    ? `
                      <div class="bfnd-rate">
                        ⭐ ${esc(r)}
                      </div>
                    `
                    : ""
                }

              </div>

            `;
          }
        ).join("")}

      </div>

    </div>

  `;
}


/* =========================================================
   OPEN DETAILS
========================================================= */

async function openDetails(id){

  if(!id){
    return;
  }

  const m=modal();

  const c=
    document.getElementById(
      "bfndContent"
    );

  m.style.display="block";

  document.body.style.overflow=
    "hidden";

  c.innerHTML=`

    <div class="bfnd-empty">

      ⏳ جاري تحميل تفاصيل المباراة...

    </div>

  `;


  try{

    const r=
      await fetch(
        API +
        encodeURIComponent(id),
        {
          cache:"no-store",

          headers:{
            Accept:
              "application/json"
          }
        }
      );


    const raw=
      await r.text();


    if(!r.ok){

      throw new Error(
        `API HTTP ${r.status}`
      );
    }


    let p;

    try{

      p=
        JSON.parse(raw);

    }catch{

      throw new Error(
        "Réponse JSON invalide"
      );
    }


    let d=
      p?.data ||
      p?.match ||
      p;


    if(
      d?.match &&
      obj(d.match)
    ){

      d=d.match;
    }


    if(!obj(d)){

      throw new Error(
        "Données du match introuvables"
      );
    }


    const h=
      team(
        d,
        "home"
      );

    const a=
      team(
        d,
        "away"
      );


    const hl=
      lineup(
        d,
        "home",
        h
      );

    const al=
      lineup(
        d,
        "away",
        a
      );


    const ev=
      events(d);

    const rm=
      ratingMap(d);


    const date=
      d?.fixture?.date ||
      d?.date;


    const info=`

      ${
        date
          ? `
            <span>
              📅 ${
                esc(
                  new Date(
                    date
                  ).toLocaleString(
                    "fr-FR"
                  )
                )
              }
            </span>
          `
          : ""
      }

      ${
        d?.fixture?.venue
          ? `
            <span>
              🏟️ ${
                esc(
                  nameOf(
                    d.fixture.venue
                  )
                )
              }
            </span>
          `
          : ""
      }

      ${
        d?.fixture?.referee
          ? `
            <span>
              👨‍⚖️ ${
                esc(
                  nameOf(
                    d.fixture.referee
                  )
                )
              }
            </span>
          `
          : ""
      }

    `;


    const eventHtml=
      ev.length

        ? ev.map(
            e=>`

              <div class="bfnd-event">

                <b>
                  ${esc(eMin(e))}'
                </b>

                <span>
                  ${eIcon(e)}
                </span>

                <div>

                  <b>
                    ${esc(
                      ePlayer(e)
                    )}
                  </b>

                  ${
                    eTeam(e)
                      ? `
                        <div
                          style="
                            font-size:9px;
                            opacity:.6;
                          "
                        >
                          ${esc(
                            eTeam(e)
                          )}
                        </div>
                      `
                      : ""
                  }

                  ${
                    eAssist(e)
                      ? `
                        <div
                          style="
                            font-size:9px;
                            opacity:.7;
                          "
                        >
                          ↪ ${esc(
                            eAssist(e)
                          )}
                        </div>
                      `
                      : ""
                  }

                </div>

              </div>

            `
          ).join("")

        : `
          <div class="bfnd-empty">
            ماكايناش أحداث مفصلة لهاد الماتش.
          </div>
        `;


    const mot=
      first(
        d?.player_of_match,
        d?.playerOfMatch,
        d?.man_of_the_match,
        d?.manOfTheMatch,
        d?.mvp,
        d?.best_player
      );


    c.innerHTML=`

      <div class="bfnd-league">
        🏆 ${esc(
          league(d)
        )}
      </div>


      <div class="bfnd-head">

        <div class="bfnd-team">

          ${
            h.logo
              ? `
                <img
                  src="${esc(h.logo)}"
                  alt="${esc(h.name)}"
                >
              `
              : "⚽"
          }

          <div>
            ${esc(h.name)}
          </div>

        </div>


        <div>

          <div class="bfnd-score">

            ${esc(
              score(
                d,
                "home"
              )
            )}

            -

            ${esc(
              score(
                d,
                "away"
              )
            )}

          </div>

          <div class="bfnd-status">

            ${esc(
              status(d)
            )}

          </div>

        </div>


        <div class="bfnd-team">

          ${
            a.logo
              ? `
                <img
                  src="${esc(a.logo)}"
                  alt="${esc(a.name)}"
                >
              `
              : "⚽"
          }

          <div>
            ${esc(a.name)}
          </div>

        </div>

      </div>


      <div class="bfnd-info">

        ${info}

      </div>


      <div class="bfnd-sec">

        <div class="bfnd-title">
          🧩 Formations & Compositions
        </div>

        <div class="bfnd-pitches">

          ${pitch(
            hl,
            h,
            rm
          )}

          ${pitch(
            al,
            a,
            rm
          )}

        </div>

      </div>


      <div class="bfnd-sec">

        <div class="bfnd-title">
          👥 Joueurs
        </div>


        <div class="bfnd-lists">


          <div>

            <b>
              ${esc(h.name)}
            </b>


            ${
              hl.xi.length
                ? hl.xi.map(
                    p=>row(
                      p,
                      rm
                    )
                  ).join("")
                : `
                  <div class="bfnd-empty">
                    التشكيلة غير متوفرة
                  </div>
                `
            }


            ${
              hl.sub.length

                ? `

                  <h4>
                    Banc
                  </h4>

                  ${
                    hl.sub
                      .slice(0,14)
                      .map(
                        p=>row(
                          p,
                          rm
                        )
                      )
                      .join("")
                  }

                `

                : ""
            }

          </div>


          <div>

            <b>
              ${esc(a.name)}
            </b>


            ${
              al.xi.length
                ? al.xi.map(
                    p=>row(
                      p,
                      rm
                    )
                  ).join("")
                : `
                  <div class="bfnd-empty">
                    التشكيلة غير متوفرة
                  </div>
                `
            }


            ${
              al.sub.length

                ? `

                  <h4>
                    Banc
                  </h4>

                  ${
                    al.sub
                      .slice(0,14)
                      .map(
                        p=>row(
                          p,
                          rm
                        )
                      )
                      .join("")
                  }

                `

                : ""
            }

          </div>


        </div>

      </div>


      <div class="bfnd-sec">

        <div class="bfnd-title">
          ⏱️ Événements
        </div>

        ${eventHtml}

      </div>


      ${
        mot

          ? `

            <div class="bfnd-sec">

              <div class="bfnd-motm">

                ⭐ Joueur du match :

                ${esc(
                  typeof mot==="string"
                    ? mot
                    : nameOf(mot)
                )}

              </div>

            </div>

          `

          : ""
      }


    `;

  }catch(e){

    console.error(
      "BAKHIRAFOOT NEW DETAILS ERROR",
      e
    );

    c.innerHTML=`

      <div class="bfnd-empty">

        ما قدرناش نحملو تفاصيل هاد الماتش.

        <br><br>

        <strong>
          ${esc(
            e?.message ||
            "Erreur inconnue"
          )}
        </strong>

      </div>

    `;
  }
}


/* =========================================================
   HOOK
========================================================= */

function hook(){

  document.addEventListener(
    "click",
    e=>{

      const card=
        e.target?.closest?.(
          ".match-card"
        );

      if(!card){
        return;
      }


      const i=
        Number(
          card.dataset.matchIndex
        );

      if(
        !Number.isInteger(i)
      ){
        return;
      }


      const id=
        newId(
          i,
          card
        );


      /*
       * غير الماتشات الجداد
       * كنوقفو onclick القديم
       */

      if(!id){
        return;
      }


      e.preventDefault();

      e.stopImmediatePropagation();


      console.log(
        "BAKHIRAFOOT NEW DETAILS:",
        id
      );


      openDetails(id);

    },
    true
  );


  /*
   * PROGRAMMATIC OPEN
   */

  const old=
    window.openMatchDetails;


  window.bfOpenMatchDetails=
    openDetails;


  window.openMatchDetails=
    function(i){

      const card=
        document.querySelector(
          `.match-card[data-match-index="${i}"]`
        );

      const id=
        newId(
          i,
          card
        );


      if(id){

        console.log(
          "BAKHIRAFOOT NEW DETAILS:",
          id
        );

        return openDetails(
          id
        );
      }


      /*
       * SportScore القديم
       */

      if(
        typeof old==="function"
      ){

        return old(i);

      }

    };


  /*
   * ESC
   */

  document.addEventListener(
    "keydown",
    e=>{

      if(
        e.key==="Escape"
      ){

        close();

      }

    }
  );

}


/* =========================================================
   START
========================================================= */

if(
  document.readyState==="loading"
){

  document.addEventListener(
    "DOMContentLoaded",
    hook
  );

}else{

  hook();

}

})();
