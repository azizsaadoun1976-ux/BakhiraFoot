/* BakhiraFoot Match Centre extensions
 * Adds anchored navigation and sourced match context without replacing the working fixture renderer.
 */
(() => {
  "use strict";

  if (window.BFMatchEnhancements) return;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);
  const norm = value => String(value ?? "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const first = (...values) => values.find(v => v !== null && v !== undefined && v !== "") ?? "";
  const dateLabel = value => {
    const date = new Date(value || "");
    return Number.isNaN(date.getTime()) ? "—" :
      date.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
  };

  function style() {
    if (document.getElementById("bfMatchEnhancementsStyle")) return;
    const node = document.createElement("style");
    node.id = "bfMatchEnhancementsStyle";
    node.textContent = `
      #bf-new-match-safe-modal [data-bf-match-panel][hidden]{display:none!important}
      #bf-new-match-safe-modal .bfmd-center-nav [role="tab"]:focus-visible{outline:2px solid #74edbd;outline-offset:2px}
      #bf-new-match-safe-modal .bfmc-context-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #bf-new-match-safe-modal .bfmc-result-list{display:grid;gap:8px}
      #bf-new-match-safe-modal .bfmc-result-card{display:grid;gap:8px;min-width:0;padding:11px 12px;border:1px solid rgba(88,144,168,.22);border-radius:11px;background:linear-gradient(135deg,rgba(12,34,48,.95),rgba(8,24,35,.92));box-shadow:0 5px 16px #0002}
      #bf-new-match-safe-modal .bfmc-result-meta{display:flex;justify-content:space-between;gap:10px;align-items:center;color:#89a8bb;font-size:8px}
      #bf-new-match-safe-modal .bfmc-result-meta span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #bf-new-match-safe-modal .bfmc-result-line{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:9px}
      #bf-new-match-safe-modal .bfmc-result-line strong{min-width:0;color:#eaf4f8;font-size:10px;line-height:1.35;overflow-wrap:anywhere}
      #bf-new-match-safe-modal .bfmc-result-line strong:last-child{text-align:right}
      #bf-new-match-safe-modal .bfmc-result-score{min-width:58px;padding:6px 8px;border:1px solid rgba(74,201,152,.2);border-radius:7px;background:#0a2a24;color:#8cf0c1;text-align:center;font-size:11px;font-weight:950;font-variant-numeric:tabular-nums;white-space:nowrap}
      #bf-new-match-safe-modal .bfmc-overview{display:grid;gap:12px}
      #bf-new-match-safe-modal .bfmc-overview-result{padding:17px;border:1px solid rgba(62,210,157,.28);border-radius:14px;background:linear-gradient(120deg,#0b202c,#0a2427);text-align:center}
      #bf-new-match-safe-modal .bfmc-overview-kicker{color:#72e5b4;font-size:8px;font-weight:950;letter-spacing:.16em}
      #bf-new-match-safe-modal .bfmc-overview-match{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:12px;margin:13px 0 8px}
      #bf-new-match-safe-modal .bfmc-overview-match>strong{color:#f1f8fb;font-size:clamp(12px,1.4vw,17px);overflow-wrap:anywhere}
      #bf-new-match-safe-modal .bfmc-overview-match>b{padding:8px 12px;border:1px solid rgba(75,206,157,.22);border-radius:9px;background:#092922;color:#8cf0c1;font-size:clamp(23px,3vw,34px);font-weight:1000;font-variant-numeric:tabular-nums;white-space:nowrap}
      #bf-new-match-safe-modal .bfmc-overview-match>b i{color:#6fa98e;font-style:normal;font-size:.7em}
      #bf-new-match-safe-modal .bfmc-overview-verdict{color:#d9f5e8;font-size:12px;font-weight:900}
      #bf-new-match-safe-modal .bfmc-overview-meta{margin-top:5px;color:#89a5b7;font-size:9px;line-height:1.5}
      #bf-new-match-safe-modal .bfmc-overview-block{padding:14px;border:1px solid rgba(87,137,158,.2);border-radius:12px;background:linear-gradient(145deg,rgba(12,29,42,.95),rgba(8,21,31,.96))}
      #bf-new-match-safe-modal .bfmc-overview-block>h3{margin:0 0 11px;color:#91edc5;font-size:12px;font-weight:950}
      #bf-new-match-safe-modal .bfmc-overview-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:8px}
      #bf-new-match-safe-modal .bfmc-overview-metric{display:grid;gap:7px;min-width:0;padding:11px;border:1px solid rgba(89,137,157,.2);border-radius:9px;background:#102a37}
      #bf-new-match-safe-modal .bfmc-overview-metric>span{color:#9bb4c3;font-size:9px;font-weight:800}
      #bf-new-match-safe-modal .bfmc-overview-metric>strong{display:flex;justify-content:space-between;align-items:center;gap:5px;color:#f3f8fa;font-size:15px;font-variant-numeric:tabular-nums}
      #bf-new-match-safe-modal .bfmc-overview-metric>strong i{color:#66899b;font-style:normal;font-size:9px}
      #bf-new-match-safe-modal .bfmc-overview-note{margin:9px 0 0;color:#829bad;font-size:8px;line-height:1.55}
      #bf-new-match-safe-modal .bfmc-overview-events{display:grid;gap:7px}
      #bf-new-match-safe-modal .bfmc-overview-event{display:grid;grid-template-columns:38px 9px minmax(0,1fr);align-items:center;gap:9px;padding:8px 10px;border:1px solid rgba(88,137,157,.16);border-radius:8px;background:rgba(11,29,41,.7)}
      #bf-new-match-safe-modal .bfmc-overview-event>time{color:#75e2b5;font-size:9px;font-weight:950;font-variant-numeric:tabular-nums}
      #bf-new-match-safe-modal .bfmc-overview-event-dot{width:7px;height:7px;border-radius:50%;background:#48dca1;box-shadow:0 0 0 3px rgba(72,220,161,.12)}
      #bf-new-match-safe-modal .bfmc-overview-event>div{display:grid;gap:2px;min-width:0}
      #bf-new-match-safe-modal .bfmc-overview-event strong{color:#e8f2f6;font-size:10px;overflow-wrap:anywhere}
      #bf-new-match-safe-modal .bfmc-overview-event small{color:#8ba5b6;font-size:8px}
      #bf-new-match-safe-modal .bfmc-comparison{display:grid;gap:14px}
      #bf-new-match-safe-modal .bfmc-comparison-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 17px;border:1px solid rgba(65,211,161,.25);border-radius:13px;background:radial-gradient(circle at 90% 0%,rgba(42,181,126,.18),transparent 38%),linear-gradient(115deg,#0d2c32,#10273a)}
      #bf-new-match-safe-modal .bfmc-comparison-head span{color:#72e5b4;font-size:8px;font-weight:950;letter-spacing:.16em}
      #bf-new-match-safe-modal .bfmc-comparison-head h3{margin:5px 0;color:#f3fbff;font-size:16px;font-weight:950}
      #bf-new-match-safe-modal .bfmc-comparison-head p{margin:0;color:#9ab4c4;font-size:9px}
      #bf-new-match-safe-modal .bfmc-comparison-head>b{padding:6px 9px;border:1px solid rgba(105,184,158,.28);border-radius:999px;background:#0b3b31;color:#9cf0cb;font-size:8px;white-space:nowrap}
      #bf-new-match-safe-modal .bfmc-comparison-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #bf-new-match-safe-modal .bfmc-comparison-team{min-width:0;padding:13px;border:1px solid rgba(91,142,164,.22);border-radius:12px;background:linear-gradient(145deg,#102738,#0b1c29)}
      #bf-new-match-safe-modal .bfmc-comparison-team-name{display:grid;gap:3px;min-width:0}
      #bf-new-match-safe-modal .bfmc-comparison-team-name small{color:#73dcb5;font-size:8px;font-weight:950;letter-spacing:.12em}
      #bf-new-match-safe-modal .bfmc-comparison-team-name strong{color:#f0f7fa;font-size:12px;overflow-wrap:anywhere}
      #bf-new-match-safe-modal .bfmc-comparison-team p{margin:9px 0 0;color:#8da6b7;font-size:8px}
      #bf-new-match-safe-modal .bfmc-form-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
      #bf-new-match-safe-modal .bfmc-form-chip{display:grid;place-items:center;width:25px;height:25px;border:1px solid transparent;border-radius:7px;font-size:9px;font-weight:1000}
      #bf-new-match-safe-modal .bfmc-form-chip--w{background:#0d4a36;border-color:#1b7956;color:#89f0bd}
      #bf-new-match-safe-modal .bfmc-form-chip--d{background:#3c3821;border-color:#72632d;color:#f6db82}
      #bf-new-match-safe-modal .bfmc-form-chip--l{background:#48252c;border-color:#793d48;color:#ff9da8}
      #bf-new-match-safe-modal .bfmc-form-empty{color:#9aafbd;font-size:9px}
      #bf-new-match-safe-modal .bfmc-comparison-table-wrap{width:100%;overflow-x:auto;border:1px solid rgba(95,137,159,.22);border-radius:11px}
      #bf-new-match-safe-modal .bfmc-comparison-table{width:100%;min-width:470px;border-collapse:collapse;color:#e5f0f5;font-size:10px}
      #bf-new-match-safe-modal .bfmc-comparison-table th,#bf-new-match-safe-modal .bfmc-comparison-table td{padding:10px 12px;border-bottom:1px solid rgba(110,150,172,.15);text-align:center;font-variant-numeric:tabular-nums}
      #bf-new-match-safe-modal .bfmc-comparison-table thead th{background:#102d3b;color:#9dbdce;font-size:8px;font-weight:950}
      #bf-new-match-safe-modal .bfmc-comparison-table th:first-child{text-align:left}
      #bf-new-match-safe-modal .bfmc-comparison-table tbody th{color:#b5c9d5;font-size:9px;font-weight:750}
      #bf-new-match-safe-modal .bfmc-comparison-table td.is-better{background:rgba(18,137,94,.14);color:#8af0bd;font-weight:1000}
      #bf-new-match-safe-modal .bfmc-comparison-footnote{margin:0;color:#8da4b4;font-size:9px;line-height:1.65}
      #bf-new-match-safe-modal .bfmc-context-columns>section{min-width:0;padding:10px;border:1px solid rgba(90,135,155,.2);border-radius:10px;background:rgba(7,22,32,.38)}
      #bf-new-match-safe-modal .bfmc-context-columns h4{margin:0 0 8px;color:#a4edcf;font-size:11px}
      #bf-new-match-safe-modal .bfmc-result-list{display:grid;gap:7px}
      #bf-new-match-safe-modal .bfmc-result{display:grid;grid-template-columns:72px minmax(0,1fr) auto;align-items:center;gap:8px;padding:8px;border:1px solid rgba(105,145,168,.16);border-radius:8px;background:rgba(13,31,43,.78);color:#edf6fb}
      #bf-new-match-safe-modal .bfmc-result time{color:#91a8b9;font-size:8px}
      #bf-new-match-safe-modal .bfmc-result-teams{display:grid;gap:3px;min-width:0;font-size:9px;font-weight:800}
      #bf-new-match-safe-modal .bfmc-result-teams small{color:#839bad;font-size:8px;font-weight:600}
      #bf-new-match-safe-modal .bfmc-result-score{font-size:10px;font-weight:950;white-space:nowrap}
      #bf-new-match-safe-modal .bfmc-caption{margin:0 0 9px;color:#8da7b8;font-size:9px}
      #bf-new-match-safe-modal .bfmc-table-wrap{width:100%;overflow-x:auto;border:1px solid rgba(95,137,159,.2);border-radius:9px}
      #bf-new-match-safe-modal .bfmc-table{width:100%;min-width:520px;border-collapse:collapse;color:#dce8f0;font-size:9px}
      #bf-new-match-safe-modal .bfmc-table th,#bf-new-match-safe-modal .bfmc-table td{padding:8px 9px;border-bottom:1px solid rgba(110,150,172,.14);text-align:center;white-space:nowrap}
      #bf-new-match-safe-modal .bfmc-table th{background:#102b3c;color:#8eb6ce;font-size:8px}
      #bf-new-match-safe-modal .bfmc-table td:nth-child(2){text-align:left}
      #bf-new-match-safe-modal .bfmc-table tr.is-target{background:rgba(20,112,77,.22)}
      #bf-new-match-safe-modal .bfmc-standing-team{display:flex;align-items:center;gap:6px}
      #bf-new-match-safe-modal .bfmc-standing-team img{width:20px;height:20px;object-fit:contain}
      #bf-new-match-safe-modal .bfmc-highlights,#bf-new-match-safe-modal .bfmc-news{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      #bf-new-match-safe-modal .bfmc-highlight,#bf-new-match-safe-modal .bfmc-news-card{display:flex;align-items:center;gap:10px;min-width:0;padding:10px;border:1px solid rgba(91,144,168,.2);border-radius:9px;background:rgba(12,31,44,.78);color:#e8f3f9;text-decoration:none}
      #bf-new-match-safe-modal .bfmc-highlight>span:first-child{display:grid;place-items:center;width:30px;height:30px;flex:0 0 30px;border-radius:8px;background:#143c42;color:#7ce5ba}
      #bf-new-match-safe-modal .bfmc-highlight strong,#bf-new-match-safe-modal .bfmc-news-card strong{display:block;color:#eaf5fb;font-size:9px;line-height:1.4}
      #bf-new-match-safe-modal .bfmc-news-card img,#bf-new-match-safe-modal .bfmc-news-placeholder{width:76px;height:58px;flex:0 0 76px;object-fit:cover;border-radius:6px;background:#163449}
      #bf-new-match-safe-modal .bfmc-news-placeholder{display:grid;place-items:center;color:#8bb1c8;font-size:18px}
      #bf-new-match-safe-modal .bfmc-news-card small{display:block;margin-bottom:4px;color:#8da8bb;font-size:7px}
      #bf-new-match-safe-modal .bfmc-news-card em{display:block;margin-top:5px;color:#72dcb2;font-size:8px;font-style:normal}
      #bf-new-match-safe-modal .bfmc-comment-form{display:grid;gap:7px;margin-bottom:12px}
      #bf-new-match-safe-modal .bfmc-comment-form label{color:#b6c9d6;font-size:9px;font-weight:850}
      #bf-new-match-safe-modal .bfmc-comment-form input,#bf-new-match-safe-modal .bfmc-comment-form textarea{width:100%;box-sizing:border-box;padding:10px;border:1px solid rgba(117,157,179,.25);border-radius:8px;background:#081c2a;color:#eff7fb;font:inherit;font-size:10px}
      #bf-new-match-safe-modal .bfmc-comment-form textarea{resize:vertical}
      #bf-new-match-safe-modal .bfmc-comment-submit{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
      #bf-new-match-safe-modal .bfmc-comment-submit button{padding:9px 14px;border:1px solid #228a64;border-radius:8px;background:#0b7752;color:#fff;font-size:9px;font-weight:900;cursor:pointer}
      #bf-new-match-safe-modal .bfmc-comment-submit button:disabled{opacity:.5;cursor:wait}
      #bf-new-match-safe-modal .bfmc-comment-status{color:#91a9b9;font-size:8px}
      #bf-new-match-safe-modal .bfmc-comment-status.is-error{color:#ff9da7}
      #bf-new-match-safe-modal .bfmc-vote{display:grid;gap:8px;margin:0 0 12px;padding:11px;border:1px solid rgba(77,151,129,.25);border-radius:9px;background:rgba(9,40,37,.26)}
      #bf-new-match-safe-modal .bfmc-vote-head{display:flex;justify-content:space-between;gap:8px;align-items:center;color:#dcefe7;font-size:9px;font-weight:900}
      #bf-new-match-safe-modal .bfmc-vote-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
      #bf-new-match-safe-modal .bfmc-vote-buttons button{padding:8px;border:1px solid rgba(108,160,185,.24);border-radius:7px;background:#102b3b;color:#dbeaf2;font-size:9px;font-weight:850;cursor:pointer}
      #bf-new-match-safe-modal .bfmc-vote-buttons button[aria-pressed="true"]{border-color:#31b781;background:#0b563e;color:#fff}
      #bf-new-match-safe-modal .bfmc-vote-results{display:grid;gap:5px}
      #bf-new-match-safe-modal .bfmc-vote-result{display:grid;grid-template-columns:1fr 36px;gap:8px;align-items:center;color:#a9c0cf;font-size:8px}
      #bf-new-match-safe-modal .bfmc-vote-track{height:5px;grid-column:1/-1;overflow:hidden;border-radius:5px;background:#1a3341}
      #bf-new-match-safe-modal .bfmc-vote-track i{display:block;height:100%;background:linear-gradient(90deg,#1a9b69,#5be3a4)}
      #bf-new-match-safe-modal .bfmc-vote-status{color:#91a9b9;font-size:8px}
      #bf-new-match-safe-modal .bfmc-vote-status.is-error{color:#ff9da7}
      #bf-new-match-safe-modal .bfmc-comment{margin-top:7px;padding:10px;border:1px solid rgba(103,143,164,.18);border-radius:8px;background:rgba(9,27,40,.76)}
      #bf-new-match-safe-modal .bfmc-comment header{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
      #bf-new-match-safe-modal .bfmc-comment strong{color:#dcebf4;font-size:9px}
      #bf-new-match-safe-modal .bfmc-comment time{color:#829bad;font-size:8px}
      #bf-new-match-safe-modal .bfmc-comment p{margin:6px 0 0;color:#c3d2dc;font-size:10px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}
      #bf-new-match-safe-modal [data-bf-match-panel]{scroll-margin-top:68px}
      @media(max-width:700px){
        #bf-new-match-safe-modal .bfmc-overview-result{padding:13px 9px}
        #bf-new-match-safe-modal .bfmc-overview-match{gap:5px}
        #bf-new-match-safe-modal .bfmc-overview-match>strong{font-size:10px}
        #bf-new-match-safe-modal .bfmc-overview-match>b{padding:6px 8px;font-size:22px}
        #bf-new-match-safe-modal .bfmc-overview-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
        #bf-new-match-safe-modal .bfmc-overview-metric{padding:9px}
        #bf-new-match-safe-modal .bfmc-comparison-form-grid{grid-template-columns:1fr}
        #bf-new-match-safe-modal .bfmc-comparison-head{align-items:flex-start;flex-direction:column}
        #bf-new-match-safe-modal .bfmc-result-line{gap:5px}
        #bf-new-match-safe-modal .bfmc-result-line strong{font-size:9px}
        #bf-new-match-safe-modal .bfmc-result-score{min-width:49px;font-size:10px}
        #bf-new-match-safe-modal .bfmc-context-columns{grid-template-columns:1fr}
        #bf-new-match-safe-modal .bfmc-highlights,#bf-new-match-safe-modal .bfmc-news{grid-template-columns:1fr}
        #bf-new-match-safe-modal .bfmc-result{grid-template-columns:55px minmax(0,1fr) auto;padding:7px;gap:6px}
        #bf-new-match-safe-modal .bfmc-result time{font-size:7px}
        #bf-new-match-safe-modal .bfmc-table{min-width:470px}
      }
      body:not(.dark) #bf-new-match-safe-modal .bfmc-context-columns>section{background:#f2f7fa;border-color:#dae5ec}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-result-card,
      body:not(.dark) #bf-new-match-safe-modal .bfmc-comparison-team{background:linear-gradient(145deg,#f8fbfd,#edf4f7);border-color:#d8e4eb}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-result-line strong,
      body:not(.dark) #bf-new-match-safe-modal .bfmc-comparison-team-name strong,
      body:not(.dark) #bf-new-match-safe-modal .bfmc-comparison-table{color:#20394b}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-comparison-table thead th{background:#eaf2f7;color:#4b6f84}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-comparison-table tbody th{color:#536a78}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-comparison-table td.is-better{background:#e5f7ee;color:#087c50}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-comparison-head{background:linear-gradient(115deg,#e9f8f0,#eff6fb);border-color:#cbe7d9}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-overview-result{background:linear-gradient(120deg,#edf9f2,#eef6fa);border-color:#cbe9d8}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-overview-match>strong,
      body:not(.dark) #bf-new-match-safe-modal .bfmc-overview-verdict{color:#173b34}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-overview-match>b{background:#e2f7ec;color:#087c50;border-color:#c5e6d5}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-overview-block{background:linear-gradient(145deg,#fbfdfe,#f2f7fa);border-color:#dce7ed}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-overview-block>h3{color:#087c50}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-overview-metric{background:#fff;border-color:#dce7ed}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-overview-metric>span{color:#657b88}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-overview-metric>strong{color:#1c3745}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-overview-event{background:#fff;border-color:#dce7ed}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-overview-event strong{color:#1c3745}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-overview-event small{color:#657b88}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-overview-meta,
      body:not(.dark) #bf-new-match-safe-modal .bfmc-overview-note{color:#657b88}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-comparison-head h3{color:#173b34}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-comparison-head p,
      body:not(.dark) #bf-new-match-safe-modal .bfmc-comparison-footnote,
      body:not(.dark) #bf-new-match-safe-modal .bfmc-comparison-team p{color:#607785}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-result,
      body:not(.dark) #bf-new-match-safe-modal .bfmc-highlight,
      body:not(.dark) #bf-new-match-safe-modal .bfmc-news-card,
      body:not(.dark) #bf-new-match-safe-modal .bfmc-comment{background:#f7fbfd;border-color:#dbe6ed;color:#1b3040}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-result-teams,
      body:not(.dark) #bf-new-match-safe-modal .bfmc-news-card strong,
      body:not(.dark) #bf-new-match-safe-modal .bfmc-comment strong{color:#20394b}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-comment-form input,
      body:not(.dark) #bf-new-match-safe-modal .bfmc-comment-form textarea{background:#fff;color:#182f40;border-color:#d4e0e8}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-table{color:#20394b}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-table th{background:#eaf2f7;color:#4b6f84}
      body:not(.dark) #bf-new-match-safe-modal .bfmc-comment p{color:#40596b}
    `;
    document.head.appendChild(node);
  }

  function addPanel(content, id, title, html) {
    const panel = document.createElement("section");
    panel.id = id;
    panel.dataset.bfMatchPanel = "1";
    panel.className = "bf-new-safe-section";
    panel.setAttribute("role","tabpanel");
    panel.tabIndex = 0;
    const heading = document.createElement("div");
    heading.className = "bf-new-safe-title";
    heading.textContent = title;
    const body = document.createElement("div");
    body.innerHTML = html;
    panel.append(heading, body);
    content.appendChild(panel);
    return body;
  }

  function formatRows(items, emptyText) {
    const rows = Array.isArray(items) ? items : [];
    if (!rows.length) return '<div class="bf-new-safe-empty">' + esc(emptyText) + '</div>';
    return '<div class="bfmc-result-list">' + rows.map(item =>
      '<article class="bfmc-result-card">' +
        '<div class="bfmc-result-meta"><time>' + esc(dateLabel(item.date)) + '</time>' +
        '<span>' + esc(item.competition || item.status || "Football") + '</span></div>' +
        '<div class="bfmc-result-line"><strong>' + esc(item.home || "Équipe") + '</strong>' +
        '<b class="bfmc-result-score">' + esc(item.score || "—") + '</b>' +
        '<strong>' + esc(item.away || "Équipe") + '</strong></div></article>'
    ).join("") + '</div>';
  }

  function sameTeamName(a, b) {
    const clean = value => norm(value)
      .replace(/\b(fc|cf|sc|afc|cfc|club)\b/g, " ")
      .replace(/\s+/g, " ").trim();
    const x = clean(a), y = clean(b);
    if (!x || !y) return false;
    if (x === y) return true;
    const xt = x.split(" ").filter(token => token.length > 2);
    const yt = y.split(" ").filter(token => token.length > 2);
    const common = xt.filter(token => yt.includes(token));
    const minimum = Math.min(xt.length, yt.length);
    return minimum > 0 && common.length >= (minimum === 1 ? 1 : 2) &&
      common.length / minimum >= 0.8;
  }

  function recentTeamStats(matches, teamName) {
    const result = {played:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0,form:[]};
    (Array.isArray(matches) ? matches : []).forEach(match => {
      const status = norm(match?.status);
      const statusType = norm(match?.statusType);
      const explicitlyFinished = statusType
        ? statusType === "finished"
        : /^(finished|full time|ft|ended|after extra time|after penalties|aet)$/.test(status);
      if (!explicitlyFinished) return;
      const score = String(match?.score ?? "").match(/^\s*(\d{1,2})\s*[-–:]\s*(\d{1,2})/);
      if (!score) return;
      const homeSide = sameTeamName(match?.home, teamName);
      const awaySide = sameTeamName(match?.away, teamName);
      if (homeSide === awaySide) return;
      const homeGoals = Number(score[1]), awayGoals = Number(score[2]);
      const goalsFor = homeSide ? homeGoals : awayGoals;
      const goalsAgainst = homeSide ? awayGoals : homeGoals;
      const outcome = goalsFor > goalsAgainst ? "W" : goalsFor < goalsAgainst ? "L" : "D";
      result.played++;
      result.goalsFor += goalsFor;
      result.goalsAgainst += goalsAgainst;
      if (outcome === "W") result.wins++;
      else if (outcome === "D") result.draws++;
      else result.losses++;
      result.form.push({outcome,date:match?.date || "",opponent:homeSide ? match?.away : match?.home});
    });
    result.points = result.wins * 3 + result.draws;
    result.goalDifference = result.goalsFor - result.goalsAgainst;
    result.winRate = result.played ? result.wins / result.played * 100 : 0;
    result.goalsForAverage = result.played ? result.goalsFor / result.played : 0;
    result.goalsAgainstAverage = result.played ? result.goalsAgainst / result.played : 0;
    return result;
  }

  function renderTeamComparison(homeRecent, awayRecent, homeName, awayName) {
    const home = recentTeamStats(homeRecent, homeName);
    const away = recentTeamStats(awayRecent, awayName);
    if (!home.played && !away.played) {
      return '<div class="bf-new-safe-empty">La comparaison sera affichée dès que le Match Centre reçoit des résultats récents terminés pour les deux équipes. Aucune statistique n’est inventée.</div>';
    }
    const form = stats => stats.form.length
      ? stats.form.slice(0,5).map(item =>
          '<span class="bfmc-form-chip bfmc-form-chip--' + item.outcome.toLowerCase() +
          '" title="' + esc(item.opponent || "Adversaire") + (item.date ? " · " + esc(dateLabel(item.date)) : "") + '">' +
          item.outcome + '</span>').join("")
      : '<span class="bfmc-form-empty">Données insuffisantes</span>';
    const fmt = (value, digits=0) => new Intl.NumberFormat("fr-FR",{
      minimumFractionDigits:digits,maximumFractionDigits:digits
    }).format(value);
    const rows = [
      ["Matchs joués",home.played,away.played,0,false],
      ["Points",home.points,away.points,0,false],
      ["Victoires",home.wins,away.wins,0,false],
      ["Matchs nuls",home.draws,away.draws,0,false],
      ["Défaites",home.losses,away.losses,0,true],
      ["Buts marqués / match",home.goalsForAverage,away.goalsForAverage,2,false],
      ["Buts encaissés / match",home.goalsAgainstAverage,away.goalsAgainstAverage,2,true],
      ["Différence de buts",home.goalDifference,away.goalDifference,0,false],
      ["Taux de victoire",home.winRate,away.winRate,1,false," %"]
    ];
    const hasHome = home.played > 0;
    const hasAway = away.played > 0;
    const rowHtml = rows.map(([label,h,a,digits,lowerBetter,suffix=""]) => {
      const hBetter = hasHome && hasAway && (lowerBetter ? h < a : h > a);
      const aBetter = hasHome && hasAway && (lowerBetter ? a < h : a > h);
      return '<tr><th scope="row">' + esc(label) + '</th>' +
        '<td class="' + (hBetter ? "is-better" : "") + '">' + (hasHome ? fmt(h,digits) + suffix : "—") + '</td>' +
        '<td class="' + (aBetter ? "is-better" : "") + '">' + (hasAway ? fmt(a,digits) + suffix : "—") + '</td></tr>';
    }).join("");
    return '<div class="bfmc-comparison">' +
      '<div class="bfmc-comparison-head"><div><span>FORME RÉCENTE</span><h3>Comparaison des équipes</h3>' +
      '<p>Basée sur les derniers matchs terminés disponibles</p></div><b>5 MATCHS MAX.</b></div>' +
      '<div class="bfmc-comparison-form-grid">' +
        '<section class="bfmc-comparison-team"><div class="bfmc-comparison-team-name"><small>DOMICILE</small><strong>' + esc(homeName) + '</strong></div>' +
        '<div class="bfmc-form-chips">' + form(home) + '</div><p>' + home.played + ' match(s) analysé(s)</p></section>' +
        '<section class="bfmc-comparison-team"><div class="bfmc-comparison-team-name"><small>EXTÉRIEUR</small><strong>' + esc(awayName) + '</strong></div>' +
        '<div class="bfmc-form-chips">' + form(away) + '</div><p>' + away.played + ' match(s) analysé(s)</p></section>' +
      '</div>' +
      '<div class="bfmc-comparison-table-wrap"><table class="bfmc-comparison-table">' +
      '<thead><tr><th>INDICATEUR</th><th>' + esc(homeName) + '</th><th>' + esc(awayName) + '</th></tr></thead>' +
      '<tbody>' + rowHtml + '</tbody></table></div>' +
      '<p class="bfmc-comparison-footnote">' +
      (hasHome && hasAway
        ? 'Calculs effectués à partir des résultats récents terminés. La meilleure valeur est mise en évidence ; pour les buts encaissés et les défaites, une valeur plus faible est préférable.'
        : 'Comparaison partielle : certaines données récentes ne sont pas disponibles pour les deux équipes. Les cellules manquantes restent indiquées par un tiret.') +
      ' Les matchs sans score final exploitable sont ignorés.</p>' +
    '</div>';
  }

  function renderStandings(rows, homeName, awayName) {
    const all = Array.isArray(rows) ? rows : [];
    if (!all.length) return '<div class="bf-new-safe-empty">Classement non disponible pour cette compétition ou cette saison.</div>';
    const normalize = value => norm(value).replace(/[^a-z0-9]/g,"");
    const target = name => normalize(name) === normalize(homeName) || normalize(name) === normalize(awayName);
    const top = all.slice(0,8);
    const extras = all.filter(row => target(row.team) && !top.some(item => String(item.team) === String(row.team)));
    const list = [...top,...extras].slice(0,12);
    return '<div class="bfmc-table-wrap"><table class="bfmc-table"><thead><tr><th>#</th><th>Équipe</th><th>MJ</th><th>V</th><th>N</th><th>D</th><th>Pts</th></tr></thead><tbody>' +
      list.map(row => '<tr class="' + (target(row.team) ? "is-target" : "") + '"><td>' + esc(row.rank || "—") +
        '</td><td><span class="bfmc-standing-team">' + (row.logo ? '<img src="' + esc(row.logo) + '" alt="" loading="lazy">' : "") +
        esc(row.team || "Équipe") + '</span></td><td>' + esc(row.played || "—") + '</td><td>' + esc(row.won || "—") +
        '</td><td>' + esc(row.drawn || "—") + '</td><td>' + esc(row.lost || "—") + '</td><td><strong>' +
        esc(row.points || "—") + '</strong></td></tr>').join("") + '</tbody></table></div>';
  }

  function findHighlights(details) {
    const result = [], seen = new Set(), queue = [{value:details,depth:0}];
    const visited = new Set();
    while (queue.length && visited.size < 900) {
      const current = queue.shift(), node = current.value;
      if (!node || typeof node !== "object" || visited.has(node) || current.depth > 5) continue;
      visited.add(node);
      if (Array.isArray(node)) {
        node.forEach(value => { if (value && typeof value === "object") queue.push({value,depth:current.depth+1}); });
        continue;
      }
      for (const [key,value] of Object.entries(node)) {
        if (/highlight|replay|clip|video/i.test(key)) {
          const url = typeof value === "string" ? value :
            value && typeof value === "object" ? (value.url || value.href || value.embedUrl || value.embed_url || value.src || value.link) : "";
          const label = value && typeof value === "object" ? (value.title || value.name || value.label || key) : key;
          try {
            const parsed = new URL(String(url || ""));
            if (/^https?:$/.test(parsed.protocol) && !seen.has(parsed.href)) {
              seen.add(parsed.href);
              result.push({url:parsed.href,label:String(label || "Voir le résumé vidéo")});
            }
          } catch (_) {}
        }
        if (value && typeof value === "object") queue.push({value,depth:current.depth+1});
      }
    }
    return result.slice(0,6);
  }

  function setupTabs(content, nav) {
    const buttons = Array.from(nav.querySelectorAll("[data-bf-match-tab]"));
    const panels = Array.from(content.querySelectorAll("[data-bf-match-panel]"));
    const activate = (button, shouldScroll) => {
      const target = content.querySelector("#" + button.dataset.bfMatchTab);
      if (!target) return;
      buttons.forEach(item => {
        const active = item === button;
        item.setAttribute("aria-pressed", active ? "true" : "false");
        item.setAttribute("aria-selected", active ? "true" : "false");
        item.tabIndex = active ? 0 : -1;
        const panel = content.querySelector("#" + item.dataset.bfMatchTab);
        if (panel) panel.setAttribute("aria-labelledby", item.id);
      });
      panels.forEach(panel => { panel.hidden = panel !== target; });
      target.hidden = false;
      if (shouldScroll) target.scrollIntoView({behavior:"smooth",block:"start"});
    };
    buttons.forEach(button => button.addEventListener("click", () => activate(button,true)));
    nav.addEventListener("keydown", event => {
      if (!["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return;
      const current = Math.max(0,buttons.indexOf(document.activeElement));
      let next = current;
      if (event.key === "ArrowRight") next = (current + 1) % buttons.length;
      if (event.key === "ArrowLeft") next = (current - 1 + buttons.length) % buttons.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = buttons.length - 1;
      event.preventDefault();
      buttons[next]?.focus();
      if (buttons[next]) activate(buttons[next],true);
    });
    const initial = buttons.find(button => button.getAttribute("aria-selected") === "true") || buttons[0];
    if (initial) activate(initial,false);
  }
  async function loadContext(content, args, recentNode, h2hNode, standingsNode, comparisonNode) {
    const params = new URLSearchParams({
      home: String(args.home.name || ""),
      away: String(args.away.name || ""),
      competition: String(args.competition || ""),
      date: String(args.date || "")
    });
    const token = String(args.key || "");
    content.dataset.bfMatchContextToken = token;
    try {
      const url = "/api/match-center?" + params.toString();
      const data = window.BFAPI && typeof window.BFAPI.getJSON === "function"
        ? await window.BFAPI.getJSON(url,{ttlMs:180000,staleIfErrorMs:600000,timeoutMs:16000})
        : await fetch(url,{headers:{Accept:"application/json"},cache:"no-store"}).then(async response => {
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload?.error || "Match context unavailable");
            return payload;
          });
      if (!content.isConnected || content.dataset.bfMatchContextToken !== token) return;

      recentNode.innerHTML = '<div class="bfmc-context-columns"><section><h4>' + esc(args.home.name) +
        '</h4>' + formatRows(data.homeRecent,"Historique récent non disponible pour cette équipe.") +
        '</section><section><h4>' + esc(args.away.name) + '</h4>' +
        formatRows(data.awayRecent,"Historique récent non disponible pour cette équipe.") + '</section></div>';

      h2hNode.innerHTML = formatRows(data.headToHead,"Aucune confrontation directe récente n’a été trouvée.");
      if (comparisonNode) {
        comparisonNode.innerHTML = renderTeamComparison(
          data.homeRecent, data.awayRecent, args.home.name, args.away.name
        );
      }
      const table = data.standings || {};
      standingsNode.innerHTML = (table.league
        ? '<p class="bfmc-caption">' + esc(table.league) + (table.season ? " · " + esc(table.season) : "") + '</p>'
        : "") + renderStandings(table.rows,args.home.name,args.away.name);

      const meta = data.metadata || {};
      const values = {venue:meta.venue,referee:meta.referee,channel:meta.broadcastChannel,commentator:meta.commentator};
      Object.entries(values).forEach(([key,value]) => {
        if (!value) return;
        const target = content.querySelector('[data-bf-meta-value="' + key + '"]');
        if (target && /^(?:Non communiqué|Non communiquée|—)$/i.test(target.textContent.trim())) {
          target.textContent = String(value);
        }
      });
    } catch (error) {
      console.warn("BakhiraFoot match context:",error);
      if (!content.isConnected || content.dataset.bfMatchContextToken !== token) return;
      const fallback = '<div class="bf-new-safe-empty">Les derniers résultats et le classement ne sont pas disponibles actuellement.</div>';
      recentNode.innerHTML = fallback;
      h2hNode.innerHTML = fallback;
      standingsNode.innerHTML = fallback;
      if (comparisonNode) comparisonNode.innerHTML = fallback;
    }
  }

  async function loadNews(content, args, node) {
    try {
      const data = window.BFAPI && typeof window.BFAPI.getJSON === "function"
        ? await window.BFAPI.getJSON("/api/news",{ttlMs:300000,staleIfErrorMs:1200000,timeoutMs:12000})
        : await fetch("/api/news",{headers:{Accept:"application/json"},cache:"no-store"}).then(r=>r.json());
      if (!content.isConnected) return;
      const articles = Array.isArray(data.articles) ? data.articles : [];
      const terms = [args.home.name,args.away.name,args.competition]
        .flatMap(value => String(value || "").toLowerCase().split(/[^a-z0-9à-ÿ]+/i))
        .filter(value => value.length >= 4);
      const related = articles.filter(article => {
        const text = [article.title,article.description,article.category].join(" ").toLowerCase();
        return terms.some(term => text.includes(term));
      }).slice(0,4);
      if (!related.length) {
        node.innerHTML = '<div class="bf-new-safe-empty">Aucun article récent ne cite clairement ces équipes ou cette compétition. Consulte la rubrique Actualités pour le fil football complet.</div>';
        return;
      }
      node.innerHTML = '<div class="bfmc-news">' + related.map(article => {
        const image = /^https?:\/\//i.test(String(article.image || ""))
          ? '<img src="' + esc(article.image) + '" alt="" loading="lazy">'
          : '<span class="bfmc-news-placeholder">⚽</span>';
        return '<a class="bfmc-news-card" href="' + esc(article.url) + '" target="_blank" rel="noopener noreferrer">' +
          image + '<span><small>' + esc(article.source || article.category || "Football") +
          ' · ' + esc(dateLabel(article.date)) + '</small><strong>' + esc(article.title) +
          '</strong><em>Lire la source ↗</em></span></a>';
      }).join("") + '</div>';
    } catch (error) {
      console.warn("BakhiraFoot match news:",error);
      if (content.isConnected) node.innerHTML = '<div class="bf-new-safe-empty">Les actualités ne sont pas disponibles pour le moment.</div>';
    }
  }

  function setupComments(content, args, formNode, commentsNode) {
    const form = formNode.querySelector("form");
    const status = formNode.querySelector("[data-bf-comment-status]");
    const authorInput = formNode.querySelector("[name=author]");
    const messageInput = formNode.querySelector("[name=message]");
    const submit = formNode.querySelector("button[type=submit]");
    const slug = String(args.key || "match").toLowerCase()
      .replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,100) || "match";
    const localKey = "bf:local:match-comments:" + slug;

    const setStatus = (message,error=false) => {
      status.textContent = message;
      status.classList.toggle("is-error",error);
    };
    const readLocal = () => {
      try {
        const value = JSON.parse(localStorage.getItem(localKey) || "[]");
        return Array.isArray(value) ? value.filter(item => item && typeof item.message === "string") : [];
      } catch (_) { return []; }
    };
    const render = comments => {
      const list = Array.isArray(comments) ? comments : [];
      commentsNode.innerHTML = list.length ? list.slice(0,50).map(item =>
        '<article class="bfmc-comment"><header><strong>' + esc(item.author || "Supporter") +
        '</strong><time>' + esc(dateLabel(item.createdAt)) + '</time></header><p>' +
        esc(item.message || "") + '</p></article>'
      ).join("") : '<div class="bf-new-safe-empty">Pas encore de commentaires. Lance le débat avec respect.</div>';
    };
    const saveLocal = (author,message) => {
      const comments = readLocal();
      comments.unshift({id:"local-"+Date.now(),author,message,createdAt:new Date().toISOString()});
      try { localStorage.setItem(localKey,JSON.stringify(comments.slice(0,50))); } catch (_) {}
      return comments.slice(0,50);
    };
    const refresh = async () => {
      try {
        const response = await fetch("/api/community?match="+encodeURIComponent(slug),{
          headers:{Accept:"application/json"},cache:"no-store"
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw Object.assign(new Error(payload?.message || payload?.error || "Comments unavailable"),{status:response.status});
        render(payload.comments || []);
        setStatus("Commentaires partagés");
      } catch (_) {
        render(readLocal());
        setStatus("Stockage partagé indisponible : les commentaires sauvegardés ici restent sur cet appareil.",true);
      }
    };
    if (form.dataset.ready === "1") return;
    form.dataset.ready = "1";
    form.addEventListener("submit",async event => {
      event.preventDefault();
      const author = String(authorInput.value || "").trim().slice(0,28);
      const message = String(messageInput.value || "").trim().slice(0,500);
      if (author.length < 2 || message.length < 3) {
        setStatus("Ajoute un pseudo et un commentaire plus long.",true);
        return;
      }
      submit.disabled = true;
      try {
        const response = await fetch("/api/community?match="+encodeURIComponent(slug),{
          method:"POST",
          headers:{"Content-Type":"application/json","Accept":"application/json"},
          body:JSON.stringify({author,message,match:slug})
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (response.status === 400 || response.status === 429) {
            setStatus(payload?.message || "Impossible de publier ce commentaire.",true);
            return;
          }
          throw new Error(payload?.message || "Shared comment storage unavailable");
        }
        form.reset();
        await refresh();
        setStatus("Ton commentaire a été publié.");
      } catch (_) {
        render(saveLocal(author,message));
        form.reset();
        setStatus("Enregistré sur cet appareil uniquement : le stockage partagé n’est pas configuré.",true);
      } finally {
        submit.disabled = false;
      }
    });
    render(readLocal());
    refresh();
  }


  function setupVote(content, args, overviewNode) {
    const slug = String(args.key || "match").toLowerCase()
      .replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,100) || "match";
    const localKey = "bf:local:match-vote:" + slug;
    const section = document.createElement("div");
    section.className = "bfmc-vote";
    section.innerHTML = '<div class="bfmc-vote-head"><strong>Qui remportera cette rencontre ?</strong><span data-bf-vote-total>0 vote</span></div>' +
      '<div class="bfmc-vote-buttons"><button type="button" data-bf-vote="home" aria-pressed="false">' + esc(args.home.name) +
      '</button><button type="button" data-bf-vote="away" aria-pressed="false">' + esc(args.away.name) + '</button></div>' +
      '<div class="bfmc-vote-results"><div class="bfmc-vote-result"><span>' + esc(args.home.name) + '</span><b data-bf-vote-home>0%</b><div class="bfmc-vote-track"><i data-bf-vote-home-bar style="width:0%"></i></div></div>' +
      '<div class="bfmc-vote-result"><span>' + esc(args.away.name) + '</span><b data-bf-vote-away>0%</b><div class="bfmc-vote-track"><i data-bf-vote-away-bar style="width:0%"></i></div></div></div>' +
      '<span class="bfmc-vote-status" data-bf-vote-status role="status" aria-live="polite">Ton pronostic est anonyme.</span>';
    const heading = overviewNode.querySelector(".bf-new-safe-title");
    if (heading) heading.insertAdjacentElement("afterend", section);
    else overviewNode.prepend(section);

    const buttons = Array.from(section.querySelectorAll("[data-bf-vote]"));
    const status = section.querySelector("[data-bf-vote-status]");
    const localState = () => {
      try {
        const value = JSON.parse(localStorage.getItem(localKey) || "{}");
        return value && typeof value === "object" ? value : {};
      } catch (_) { return {}; }
    };
    const render = (votes, voted, localOnly) => {
      const homeVotes = Math.max(0,Number(votes?.home || 0));
      const awayVotes = Math.max(0,Number(votes?.away || 0));
      const total = homeVotes + awayVotes;
      const homePercent = total ? Math.round(homeVotes*100/total) : 0;
      const awayPercent = total ? 100-homePercent : 0;
      section.querySelector("[data-bf-vote-total]").textContent = total + (total === 1 ? " vote" : " votes");
      section.querySelector("[data-bf-vote-home]").textContent = homePercent + "%";
      section.querySelector("[data-bf-vote-away]").textContent = awayPercent + "%";
      section.querySelector("[data-bf-vote-home-bar]").style.width = homePercent + "%";
      section.querySelector("[data-bf-vote-away-bar]").style.width = awayPercent + "%";
      buttons.forEach(button => button.setAttribute("aria-pressed",button.dataset.bfVote === voted ? "true" : "false"));
      if (localOnly) {
        status.textContent = "Pronostic enregistré sur cet appareil uniquement (stockage partagé indisponible).";
        status.classList.add("is-error");
      } else {
        status.textContent = voted ? "Ton pronostic est enregistré. Tu peux le modifier." : "Ton pronostic est anonyme.";
        status.classList.remove("is-error");
      }
    };
    const refresh = async () => {
      try {
        const response = await fetch("/api/community?match="+encodeURIComponent(slug)+"&vote=1",{
          headers:{Accept:"application/json"},cache:"no-store"
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Votes indisponibles");
        render(payload.votes,payload.voted,false);
      } catch (_) {
        const local = localState();
        const votes = local.votes || {home:0,away:0};
        render(votes,local.voted || null,true);
      }
    };
    buttons.forEach(button => button.addEventListener("click",async () => {
      const team = button.dataset.bfVote;
      buttons.forEach(item => item.disabled = true);
      try {
        const response = await fetch("/api/community?match="+encodeURIComponent(slug),{
          method:"POST",
          headers:{"Content-Type":"application/json","Accept":"application/json"},
          body:JSON.stringify({type:"vote",team,match:slug})
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.message || "Votes partagés indisponibles");
        render(payload.votes,payload.voted,false);
      } catch (_) {
        const local = localState();
        const votes = local.votes || {home:0,away:0};
        const previous = local.voted;
        if (previous !== team) {
          if (previous === "home" || previous === "away") votes[previous] = Math.max(0,Number(votes[previous]||0)-1);
          votes[team] = Number(votes[team]||0)+1;
        }
        try { localStorage.setItem(localKey,JSON.stringify({votes,voted:team})); } catch (_) {}
        render(votes,team,true);
      } finally {
        buttons.forEach(item => item.disabled = false);
      }
    }));
    refresh();
  }

  function overviewStatRows(details) {
    const raw = details?.statistics?.length ? details.statistics : details?.stats?.length ? details.stats : details?.matchStatistics?.length ? details.matchStatistics : details?.statistics || details?.stats || details?.matchStatistics || [];
    const rows = [];
    const nameOf = item => String(item?.name || item?.label || item?.key ||
      item?.type?.name || item?.type || item?.displayName || "").trim();
    const valueOf = (item, side) => {
      const value = item?.[side] ?? item?.[side + "Value"] ?? item?.[side + "_value"] ??
        item?.[side + "Team"] ?? null;
      return value && typeof value === "object" ? (value.displayValue ?? value.value ?? value.total ?? null) : value;
    };
    const blocks = Array.isArray(raw) ? raw : [];
    const periods = blocks.filter(block => Array.isArray(block?.groups));
    if (periods.length) {
      const chosen = periods.find(block => norm(block.period) === "all") || periods[0];
      for (const group of chosen.groups || []) {
        for (const item of group.statisticsItems || group.statistics || []) {
          const label = nameOf(item), home = valueOf(item,"home"), away = valueOf(item,"away");
          if (label && (home !== null || away !== null)) rows.push({label,home,away});
        }
      }
      return rows;
    }
    const direct = blocks.flatMap(block => Array.isArray(block?.statistics) ? block.statistics :
      Array.isArray(block?.stats) ? block.stats : Array.isArray(block?.statisticsItems) ? block.statisticsItems : []);
    if (direct.some(item => item?.home !== undefined || item?.away !== undefined)) {
      return direct.map(item => ({label:nameOf(item),home:valueOf(item,"home"),away:valueOf(item,"away")}))
        .filter(item => item.label);
    }
    if (blocks.length >= 2) {
      const forSide = block => Array.isArray(block?.statistics) ? block.statistics :
        Array.isArray(block?.stats) ? block.stats : Array.isArray(block?.statisticsItems) ? block.statisticsItems : [];
      const h = new Map(forSide(blocks[0]).map(item => [norm(nameOf(item)),item]).filter(entry=>entry[0]));
      const a = new Map(forSide(blocks[1]).map(item => [norm(nameOf(item)),item]).filter(entry=>entry[0]));
      return [...new Set([...h.keys(),...a.keys()])].map(key => ({
        label:nameOf(h.get(key)||a.get(key)),
        home:h.has(key) ? (h.get(key).value ?? h.get(key).displayValue ?? null) : null,
        away:a.has(key) ? (a.get(key).value ?? a.get(key).displayValue ?? null) : null
      }));
    }
    return rows;
  }

  function overviewEvents(details) {
    const roots = [details?.events,details?.incidents,details?.timeline,details?.match_events,
      details?.match?.events,details?.match?.incidents].filter(Array.isArray);
    const seen = new Set(), events = [];
    roots.flat().forEach(event => {
      if (!event || typeof event !== "object") return;
      const type = norm([
        event.type?.name,event.type?.text,event.type,event.eventType,event.event_type,
        event.incidentType?.name,event.incidentType,event.detail?.name,event.detail,
        event.description,event.text,event.incidentClass?.name
      ].filter(Boolean).join(" "));
      if (!/goal|score|scoring|but|red card|yellow card|carton|substitut|replacement|remplacement/.test(type)) return;
      const id = String(event.id ?? [event.time?.minute,event.minute,event.player?.name,type].join("|"));
      if (seen.has(id)) return;
      seen.add(id);
      const player = event.player?.name || event.player?.displayName || event.scorer?.name ||
        event.athlete?.name || event.player_name || event.name || "";
      const minute = event.minute ?? event.time?.minute ?? event.time?.elapsed ?? event.clock?.displayValue ?? "";
      const team = event.team?.name || event.team_name ||
        (event.isHome === true ? details?.teams?.home?.name : null) ||
        (event.isHome === false ? details?.teams?.away?.name : null) || "";
      events.push({type,player,minute,team});
    });
    return events.sort((a,b) => {
      const minute = value => Number(String(value).match(/\d+/)?.[0] || 999);
      return minute(a.minute)-minute(b.minute);
    }).slice(0,8);
  }

  function renderMatchOverview(args) {
    const details = args?.details || {};
    const homeName = args?.home?.name || "Domicile";
    const awayName = args?.away?.name || "Extérieur";
    const homeScore = details?.score?.home ?? details?.goals?.home ?? details?.home_score ?? null;
    const awayScore = details?.score?.away ?? details?.goals?.away ?? details?.away_score ?? null;
    const scoreKnown = homeScore !== null && awayScore !== null &&
      Number.isFinite(Number(homeScore)) && Number.isFinite(Number(awayScore));
    const status = String(details?.fixture?.status?.long || details?.fixture?.status?.short ||
      details?.status_text || details?.status || "Match");
    const statusKey = norm(status);
    const finished = /(^| )(ft|finished|full time|ended|after extra time|after penalties|aet)( |$)/.test(statusKey);
    const live = /live|in play|in progress|first half|second half|1st half|2nd half|half time|extra time|penalt/.test(statusKey);
    let result = "Résultat non communiqué";
    if (scoreKnown && finished) {
      result = Number(homeScore) === Number(awayScore) ? "Match nul" :
        Number(homeScore) > Number(awayScore) ? "Victoire de " + homeName : "Victoire de " + awayName;
    } else if (live) result = "Rencontre en cours";
    else if (!scoreKnown) result = "En attente du coup d’envoi ou du score final";
    const statRows = overviewStatRows(details);
    const statPatterns = [
      ["Possession",/possession/],
      ["Tirs cadrés",/shots on target|tir[s]? cadr|cadrés/],
      ["Tirs",/total shots|shots total|total tirs|tirs$/],
      ["Corners",/corner/],
      ["Expected goals",/expected goals|\bxg\b/]
    ];
    const metrics = statPatterns.map(([displayLabel,pattern]) => {
      const row = statRows.find(item => pattern.test(norm(item.label)) &&
        item.home !== null && item.home !== undefined &&
        item.away !== null && item.away !== undefined);
      return row ? {...row,displayLabel} : null;
    }).filter(Boolean).slice(0,4);
    const date = args?.date ? dateLabel(args.date) : "";
    const metricHtml = metrics.length ? metrics.map(row =>
      '<div class="bfmc-overview-metric"><span>' + esc(row.displayLabel || row.label) + '</span><strong>' +
      esc(row.home) + '<i>—</i>' + esc(row.away) + '</strong></div>'
    ).join("") : '<div class="bf-new-safe-empty">Les statistiques clés ne sont pas encore publiées par le fournisseur pour cette rencontre.</div>';
    const events = overviewEvents(details);
    const eventHtml = events.length ? '<div class="bfmc-overview-events">' + events.map(event =>
      '<div class="bfmc-overview-event"><time>' + esc(event.minute || "—") +
      (String(event.minute).includes("'") ? "" : (event.minute ? "'" : "")) + '</time><span class="bfmc-overview-event-dot"></span>' +
      '<div><strong>' + esc(event.player || (event.type.includes("goal") || event.type.includes("but") ? "But" : "Événement")) +
      '</strong><small>' + esc(event.team || event.type) + '</small></div></div>'
    ).join("") + '</div>' : '<div class="bf-new-safe-empty">Aucun but ou événement clé détaillé n’a été fourni par la source.</div>';
    return '<div class="bfmc-overview">' +
      '<section class="bfmc-overview-result"><span class="bfmc-overview-kicker">SYNTHÈSE DE LA RENCONTRE</span>' +
      '<div class="bfmc-overview-match"><strong>' + esc(homeName) + '</strong><b>' +
      (scoreKnown ? esc(homeScore) + ' <i>:</i> ' + esc(awayScore) : '— : —') +
      '</b><strong>' + esc(awayName) + '</strong></div><div class="bfmc-overview-verdict">' +
      esc(result) + '</div><div class="bfmc-overview-meta">' + esc(args?.competition || "Football") +
      (date ? ' · ' + esc(date) : "") + ' · ' + esc(status) + '</div></section>' +
      '<section class="bfmc-overview-block"><h3>Chiffres clés</h3><div class="bfmc-overview-metrics">' +
      metricHtml + '</div><p class="bfmc-overview-note">Les chiffres affichés proviennent du fournisseur de données de la rencontre. Les éléments absents ne sont pas estimés.</p></section>' +
      '<section class="bfmc-overview-block"><h3>Moments importants</h3>' + eventHtml + '</section>' +
      '</div>';
  }

  function attach(args) {
    const content = args?.content;
    if (!content) return;
    const matchKey = String(args.key || "");
    if (content.dataset.bfMatchEnhancementsReady === "1" &&
        content.dataset.bfMatchEnhancementKey === matchKey &&
        content.querySelector(".bfmd-center-nav")) return;
    content.dataset.bfMatchEnhancementsReady = "0";
    content.dataset.bfMatchEnhancementKey = matchKey;
    style();

    const panels = Array.from(content.children).filter(node =>
      node.classList?.contains("bf-new-safe-section") ||
      (node.tagName === "DETAILS" && node.classList?.contains("bf-new-safe-player-list"))
    );
    const panelIds = ["bfmc-lineups","bfmc-mvp","bfmc-stats","bfmc-players","bfmc-events"];
    const panelNames = ["Formations et compositions","Joueur du match","Statistiques du match","Statistiques des joueurs","Événements"];
    panels.slice(0,5).forEach((panel,index) => {
      panel.id = panelIds[index];
      panel.dataset.bfMatchPanel = "1";
      panel.setAttribute("role","tabpanel");
      panel.tabIndex = 0;
      if (index === 1) {
        const heading = panel.querySelector(".bf-new-safe-title");
        if (heading) heading.textContent = panelNames[index];
      }
    });

    const nav = document.createElement("nav");
    nav.className = "bfmd-center-nav";
    nav.setAttribute("aria-label","Sections du Match Centre");
    nav.setAttribute("role","tablist");
    const tabs = [
      ["bfmc-overview","Résumé"],["bfmc-lineups","Compos"],["bfmc-stats","Stats"],
      ["bfmc-comparison","Comparaison"],["bfmc-mvp","Joueur du match"],
      ["bfmc-players","Stats joueurs"],["bfmc-events","Événements"],
      ["bfmc-form","Derniers matchs"],["bfmc-standings","Classement"],
      ["bfmc-highlights","Highlights"],["bfmc-news","Actualités"],["bfmc-comments","Commentaires"]
    ];
    nav.innerHTML = tabs.map((tab,index) =>
      '<button type="button" role="tab" id="bfmd-tab-' + tab[0] + '" data-bf-match-tab="' + tab[0] +
      '" aria-controls="' + tab[0] + '" aria-selected="' + (index===0?"true":"false") +
      '" aria-pressed="' + (index===0?"true":"false") + '">' + tab[1] + '</button>'
    ).join("");
    const info = content.querySelector(".bf-new-safe-info");
    if (info) info.insertAdjacentElement("afterend",nav);
    else content.insertBefore(nav,content.firstChild);

    const recentNode = addPanel(content,"bfmc-form","Derniers matchs des deux équipes",
      '<div class="bfmc-context-columns"><section><h4>' + esc(args.home.name) +
      '</h4><div class="bf-new-safe-empty">Chargement des derniers matchs…</div></section><section><h4>' +
      esc(args.away.name) + '</h4><div class="bf-new-safe-empty">Chargement des derniers matchs…</div></section></div>' +
      '<div class="bf-new-safe-title bf-new-safe-subtitle">Confrontations directes</div><div data-bf-h2h><div class="bf-new-safe-empty">Chargement des confrontations…</div></div>');
    const standingsNode = addPanel(content,"bfmc-standings","Classement de la compétition",
      '<div class="bf-new-safe-empty">Chargement du classement…</div>');
    const comparisonNode = addPanel(content,"bfmc-comparison","Comparaison des équipes",
      '<div class="bf-new-safe-empty">Calcul de la forme récente des deux équipes…</div>');
    const comparisonPanel = content.querySelector("#bfmc-comparison");
    const statsPanel = content.querySelector("#bfmc-stats");
    if (statsPanel && comparisonPanel) statsPanel.insertAdjacentElement("afterend", comparisonPanel);
    const highlights = findHighlights(args.details);
    const highlightsHtml = highlights.length
      ? '<div class="bfmc-highlights">' + highlights.map(item =>
          '<a class="bfmc-highlight" href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer"><span>▶</span><strong>' +
          esc(item.label) + '<br><small>Ouvrir la vidéo ↗</small></strong></a>'
        ).join("") + '</div>'
      : '<div class="bf-new-safe-empty">Aucun lien officiel de highlights n’a été fourni par la source pour cette rencontre.</div>';
    addPanel(content,"bfmc-highlights","Highlights et vidéos",highlightsHtml);
    const newsNode = addPanel(content,"bfmc-news","Actualités liées au match",
      '<div class="bf-new-safe-empty">Recherche des articles liés à cette affiche…</div>');
    const commentsRoot = addPanel(content,"bfmc-comments","Commentaires des supporters",
      '<form class="bfmc-comment-form"><label for="bfmc-comment-author">Pseudo</label><input id="bfmc-comment-author" name="author" minlength="2" maxlength="28" required placeholder="Ton pseudo" autocomplete="nickname"><label for="bfmc-comment-message">Ton commentaire</label><textarea id="bfmc-comment-message" name="message" minlength="3" maxlength="500" rows="3" required placeholder="Réagis à cette rencontre…"></textarea><div class="bfmc-comment-submit"><button type="submit">Publier</button><span class="bfmc-comment-status" data-bf-comment-status role="status" aria-live="polite"></span></div></form><div data-bf-comment-list><div class="bf-new-safe-empty">Chargement des commentaires…</div></div>');
    const h2hNode = recentNode.querySelector("[data-bf-h2h]");
    const commentList = commentsRoot.querySelector("[data-bf-comment-list]");

    const overviewNode = addPanel(content,"bfmc-overview","Résumé du match",renderMatchOverview(args));
    const overviewPanel = content.querySelector("#bfmc-overview");
    const firstPanel = content.querySelector("#bfmc-lineups");
    if (overviewPanel && firstPanel) firstPanel.insertAdjacentElement("beforebegin",overviewPanel);

    setupTabs(content,nav);
    if (overviewNode) setupVote(content,args,overviewNode);
    content.dataset.bfMatchEnhancementsReady = "1";
    content.dataset.bfMatchEnhancementKey = matchKey;
    const matchArgs = {...args,key:String(args.key || "")};
    loadContext(content,matchArgs,recentNode,h2hNode,standingsNode,comparisonNode);
    loadNews(content,matchArgs,newsNode);
    setupComments(content,matchArgs,commentsRoot,commentList);
  }

  window.BFMatchEnhancements = Object.freeze({attach});
})();
