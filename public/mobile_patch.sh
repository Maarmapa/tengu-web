/* ═══════════════════════════════════════════
   MOBILE RESPONSIVE — FULL OVERHAUL
   Breakpoints: 768px (tablet), 480px (phone)
   ═══════════════════════════════════════════ */

python3 << 'EOF'
import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

mobile_css = """
@media(max-width:768px){
  .cursor,.cursor-ring{display:none}
  body{cursor:auto}
  nav{padding:16px 20px;background:rgba(6,5,3,.98)}
  .nav-links{display:none}
  .nav-logo{font-size:18px}
  .nav-reserve{padding:8px 14px;font-size:9px}
  .hero-kanji{font-size:180px}
  .hero-title{font-size:clamp(56px,14vw,80px)}
  .hero-tag{font-size:8.5px;letter-spacing:.2em;padding:0 20px}
  .hero-sub{font-size:11px;letter-spacing:.2em}
  .hero-ctas{flex-direction:column;align-items:center;gap:12px}
  .btn-primary,.btn-ghost{padding:12px 28px;font-size:9px;width:200px;text-align:center;display:block}
  .about,.sake-section{grid-template-columns:1fr;gap:32px;padding:64px 20px}
  .menu-section,.reserve-section,.ai-section{padding:64px 20px}
  .about-visual{height:260px}
  .about-visual::before{font-size:120px}
  .flame-icon{font-size:52px}
  .sec-title{font-size:clamp(28px,8vw,42px)}
  .sec-body{font-size:15px;max-width:100%}
  .menu-tabs{overflow-x:auto;justify-content:flex-start;-webkit-overflow-scrolling:touch;scrollbar-width:none}
  .menu-tabs::-webkit-scrollbar{display:none}
  .menu-tab{padding:10px 16px;font-size:8.5px;white-space:nowrap;flex-shrink:0}
  .menu-grid{grid-template-columns:1fr;gap:1px}
  .menu-item{padding:22px 20px}
  .menu-item-name{font-size:17px}
  .menu-item-desc{font-size:12px}
  .sake-visual{grid-template-columns:1fr 1fr;gap:10px}
  .sake-card{padding:18px 14px}
  .reserve-options{grid-template-columns:1fr;gap:16px}
  .reserve-card,.wa-card{padding:22px 18px}
  .sr-row{grid-template-columns:1fr;gap:8px}
  .reserve-hours{grid-template-columns:1fr;gap:10px}
  .ai-inner{max-width:100%}
  .chat-window{min-height:240px;max-height:360px;padding:16px}
  .chat-bubble{font-size:13px;padding:10px 13px;max-width:88%}
  .chat-controls{padding:11px}
  .chat-input{font-size:14px;padding:11px 13px}
  .chat-send{padding:11px 14px;font-size:9px}
  .chat-footer{flex-direction:column;align-items:flex-start;gap:8px;margin-top:8px}
  .sugg{font-size:7.5px;padding:5px 9px}
  footer{grid-template-columns:1fr;padding:40px 20px 28px;gap:28px}
  .footer-bottom{flex-direction:column;gap:6px}
  .wa-float{bottom:20px;right:20px;width:48px;height:48px}
  .wa-float-tip{display:none}
}
@media(max-width:480px){
  nav{padding:14px 16px}
  .nav-logo{font-size:16px}
  .hero-kanji{font-size:140px}
  .hero-title{font-size:clamp(48px,14vw,68px)}
  .btn-primary,.btn-ghost{width:180px;padding:11px 20px}
  .about,.sake-section,.menu-section,.reserve-section,.ai-section{padding:52px 16px}
  .about-visual{height:220px}
  .menu-tab{padding:9px 13px;font-size:8px}
  .menu-item{padding:18px 16px}
  .menu-item-name{font-size:16px}
  .sake-visual{grid-template-columns:1fr}
  .reserve-card,.wa-card{padding:18px 16px}
  .sr-input,.sr-select{padding:10px 11px;font-size:9.5px}
  .chat-window{padding:13px;min-height:200px;max-height:300px}
  .chat-bubble{font-size:12.5px;padding:9px 12px;max-width:92%}
  footer{padding:36px 16px 24px;gap:24px}
}
"""

if '</style>' in content:
    content = content.replace('</style>', mobile_css + '</style>', 1)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("OK - mobile CSS injected")
else:
    print("ERROR - no </style> found")
EOF


/* ── Base mobile fixes ── */
@media(max-width:768px){
  /* Hide custom cursor on touch */
  .cursor, .cursor-ring { display: none; }
  body { cursor: auto; }

  /* NAV */
  nav {
    padding: 16px 20px;
    background: rgba(6,5,3,.98);
  }
  .nav-links { display: none; }
  .nav-logo { font-size: 18px; }
  .nav-reserve {
    padding: 8px 14px;
    font-size: 9px;
  }

  /* HERO */
  .hero-kanji { font-size: 180px; }
  .hero-title { font-size: clamp(56px,14vw,80px); }
  .hero-tag { font-size: 8.5px; letter-spacing: .2em; padding: 0 20px; }
  .hero-sub { font-size: 11px; letter-spacing: .2em; }
  .hero-ctas {
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .btn-primary, .btn-ghost {
    padding: 12px 28px;
    font-size: 9px;
    width: 200px;
    text-align: center;
    display: block;
  }

  /* SECTIONS — padding */
  .about, .sake-section {
    grid-template-columns: 1fr;
    gap: 32px;
    padding: 64px 20px;
  }
  .menu-section {
    padding: 64px 20px;
  }
  .reserve-section {
    padding: 64px 20px;
  }
  .ai-section {
    padding: 64px 20px;
  }

  /* ABOUT */
  .about-visual {
    height: 260px;
  }
  .about-visual::before {
    font-size: 120px;
  }
  .flame-icon { font-size: 52px; }
  .sec-title { font-size: clamp(28px,8vw,42px); }
  .sec-body { font-size: 15px; max-width: 100%; }

  /* MENU TABS — scrollable */
  .menu-tabs {
    overflow-x: auto;
    justify-content: flex-start;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 1px;
    gap: 0;
    scrollbar-width: none;
  }
  .menu-tabs::-webkit-scrollbar { display: none; }
  .menu-tab {
    padding: 10px 16px;
    font-size: 8.5px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* MENU GRID — single column */
  .menu-grid {
    grid-template-columns: 1fr;
    gap: 1px;
  }
  .menu-item {
    padding: 22px 20px;
  }
  .menu-item-name { font-size: 17px; }
  .menu-item-desc { font-size: 12px; }
  .menu-item-price {
    font-size: 9px;
    margin-left: 10px;
  }

  /* SAKE */
  .sake-visual {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .sake-card { padding: 18px 14px; }
  .sake-card-jp { font-size: 18px; }
  .sake-card-name { font-size: 13px; }
  .sake-card-desc { font-size: 11px; }

  /* RESERVAS */
  .reserve-options {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .reserve-card, .wa-card {
    padding: 22px 18px;
  }
  .reserve-card h3, .wa-card h3 {
    font-size: 18px;
  }
  .sr-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .reserve-hours {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .rh-item { padding: 14px; }

  /* ORÁCULO */
  .ai-inner { max-width: 100%; }
  .chat-window {
    min-height: 240px;
    max-height: 360px;
    padding: 16px;
  }
  .chat-bubble {
    font-size: 13px;
    padding: 10px 13px;
    max-width: 88%;
  }
  .chat-controls { padding: 11px; }
  .chat-input { font-size: 14px; padding: 11px 13px; }
  .chat-send {
    padding: 11px 14px;
    font-size: 9px;
  }
  .chat-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-top: 8px;
  }
  .chat-suggestions { gap: 5px; }
  .sugg {
    font-size: 7.5px;
    padding: 5px 9px;
  }

  /* FOOTER */
  footer {
    grid-template-columns: 1fr;
    padding: 40px 20px 28px;
    gap: 28px;
  }
  .footer-bottom {
    flex-direction: column;
    gap: 6px;
  }
  .footer-bottom p { font-size: 7.5px; }

  /* WA FLOAT */
  .wa-float {
    bottom: 20px;
    right: 20px;
    width: 48px;
    height: 48px;
  }
  .wa-float svg { width: 22px; height: 22px; }
  .wa-float-tip { display: none; }
}

/* ── Small phones (480px) ── */
@media(max-width:480px){
  nav { padding: 14px 16px; }
  .nav-logo { font-size: 16px; }
  .nav-reserve { padding: 7px 12px; font-size: 8.5px; }

  .hero-kanji { font-size: 140px; }
  .hero-title { font-size: clamp(48px,14vw,68px); }
  .hero-ctas { gap: 10px; }
  .btn-primary, .btn-ghost { width: 180px; padding: 11px 20px; }

  .about, .sake-section { padding: 52px 16px; }
  .menu-section, .reserve-section, .ai-section { padding: 52px 16px; }

  .about-visual { height: 220px; }
  .menu-header { margin-bottom: 32px; }
  .menu-tab { padding: 9px 13px; font-size: 8px; }
  .menu-item { padding: 18px 16px; }
  .menu-item-name { font-size: 16px; }

  /* Sake — stack on very small screens */
  .sake-visual { grid-template-columns: 1fr; }

  .reserve-card, .wa-card { padding: 18px 16px; }
  .sr-input, .sr-select { padding: 10px 11px; font-size: 9.5px; }

  .chat-window { padding: 13px; min-height: 200px; max-height: 300px; }
  .chat-bubble { font-size: 12.5px; padding: 9px 12px; max-width: 92%; }
  .chat-avatar { width: 27px; height: 27px; font-size: 12px; }

  footer { padding: 36px 16px 24px; gap: 24px; }
}

/* ── Tablet landscape (769px–1024px) ── */
@media(min-width:769px) and (max-width:1024px){
  nav { padding: 20px 32px; }
  .about, .sake-section { padding: 80px 32px; gap: 48px; }
  .menu-section, .reserve-section, .ai-section { padding: 72px 32px; }
  .menu-grid { grid-template-columns: 1fr 1fr; }
  .reserve-options { grid-template-columns: 1fr 1fr; }
  .sr-row { grid-template-columns: 1fr 1fr; }
  .reserve-hours { grid-template-columns: repeat(3,1fr); }
  footer { padding: 48px 32px 28px; }
}
