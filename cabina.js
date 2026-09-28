/* ==========================================================================
   LA CABINA · Despacho v2.0
   Tres bloques que se montan ARRIBA del acuerdo del día, sin tocar nada de lo
   que ya existe ni escribir en ningún Sheet:

     1 · PULSO            cuánto fluye el trabajo (no cuánto hay)
     2 · TU CUELLO        lo tuyo que frena a los demás, en el orden en que frena
     3 · PROYECTOS        una tarjeta por folio, en su etapa oficial

   Método:  Kanban (flujo, trabajo abierto, tiempo de cierre) + teoría de las
   restricciones (el cuello eres tú: se protege tu atención) + compuertas de
   etapa (Potencial → Trámite → Obra → Venta, de os/proyectos.js).

   Reglas heredadas que aquí se respetan:
   · NADA de dinero en el Despacho (decisión del 27-sep): el «costo de demorar»
     se dice en días y en etapa, nunca en pesos.
   · Solo LEE. Todo sale de las mismas tarjetas que ya trae `cargar()` y del
     registro de folios; no hay segunda base de datos.
   · Una celda sin dato no se inventa: se ve «—» y se dice por qué.
   ========================================================================== */
(function () {
  'use strict';
  if (window.Cabina) return;

  var CSS = '\
#cabina{margin:6px 0 22px;display:grid;gap:14px}\
#cabina .cbK{font:600 11px var(--mono);letter-spacing:.12em;color:var(--oro);text-transform:uppercase}\
#cabina .cbBox{border:1px solid var(--hair2);border-radius:14px;background:var(--panel);padding:16px}\
#cabina .cbHead{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px 16px;margin-bottom:12px}\
#cabina .cbHead h2{margin:0;font:400 22px/1.15 var(--serif);color:var(--ink)}\
#cabina .cbHead .cbS{font:13px var(--sans);color:var(--dim)}\
/* pulso */\
#cabina .cbPulso{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0;border:1px solid var(--hair2);border-radius:14px;overflow:hidden;background:var(--panel)}\
#cabina .cbP{padding:14px 16px;display:grid;gap:4px;border-right:1px solid var(--hair);align-content:start}\
#cabina .cbP:last-child{border-right:0}\
#cabina .cbP b{font:600 30px/1 var(--mono);color:var(--ink);font-variant-numeric:tabular-nums}\
#cabina .cbP span{font:12px var(--sans);color:var(--dim);line-height:1.35}\
#cabina .cbP i{font:600 11px var(--mono);font-style:normal;letter-spacing:.04em}\
#cabina .cbP .up{color:var(--verde)} #cabina .cbP .dn{color:var(--ambar)} #cabina .cbP .eq{color:var(--faint)}\
#cabina .cbP.mal b{color:var(--rojo)}\
#cabina .cbRitmo{grid-column:1/-1;padding:10px 16px;border-top:1px solid var(--hair);font:13px var(--sans);color:var(--ink2);background:var(--panel2)}\
#cabina .cbRitmo b{color:var(--oro2);font-weight:600}\
/* cuello */\
#cabina .cbFila{display:grid;grid-template-columns:auto 1fr auto;gap:4px 14px;align-items:start;padding:12px 0;border-top:1px solid var(--hair)}\
#cabina .cbFila:first-of-type{border-top:0}\
#cabina .cbN{font:600 12px var(--mono);color:var(--oro);padding-top:3px}\
#cabina .cbT{font:500 15px/1.35 var(--sans);color:var(--ink)}\
#cabina .cbM{font:12px var(--mono);color:var(--faint);margin-top:3px;display:flex;flex-wrap:wrap;gap:4px 10px}\
#cabina .cbChips{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}\
#cabina .cbChip{font:600 11px var(--mono);padding:3px 8px;border-radius:999px;border:1px solid var(--hair2);color:var(--ink2);white-space:nowrap}\
#cabina .cbChip.tarde{color:var(--rojo);border-color:#4A2A24;background:var(--rojoS)}\
#cabina .cbChip.dec{color:var(--morado);border-color:#3D2F5A}\
#cabina .cbChip.uno{color:var(--ambar);border-color:#4A3A1A}\
#cabina .cbMas{margin-top:8px;min-height:40px;padding:0 14px;border-radius:10px;border:1px solid var(--hair2);background:var(--panel2);color:var(--ink);font:500 14px var(--sans);cursor:pointer}\
#cabina .cbMas:hover{border-color:var(--oro)}\
#cabina .cbVacio{font:14px var(--sans);color:var(--verde);padding:6px 0}\
/* etapas */\
#cabina .cbEtapas{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;align-items:start}\
#cabina .cbCol{display:grid;gap:8px;align-content:start;min-width:0}\
#cabina .cbCol>h3{margin:0;font:600 11px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--dim);display:flex;justify-content:space-between;padding:0 2px 6px;border-bottom:2px solid var(--hair2)}\
#cabina .cbCol.sin>h3{color:var(--ambar);border-color:#4A3A1A}\
#cabina .cbCard{border:1px solid var(--hair2);border-radius:12px;background:var(--panel2);padding:12px;display:grid;gap:6px;min-width:0}\
#cabina a.cbCard{text-decoration:none;color:inherit} #cabina a.cbCard:hover{border-color:var(--oro)}\
#cabina .cbCard h4{margin:0;font:500 15px/1.25 var(--sans);color:var(--ink)}\
#cabina .cbCard .cbF{font:11px var(--mono);color:var(--faint)}\
#cabina .cbCard .cbSig{font:12.5px/1.4 var(--sans);color:var(--ink2)}\
#cabina .cbCard .cbNum{display:flex;gap:10px;font:600 11px var(--mono);color:var(--dim)}\
#cabina .cbCard .cbNum .r{color:var(--rojo)}\
#cabina .cbCard .cbAviso{font:12px/1.4 var(--sans);color:var(--ambar)}\
#cabina .cbCard.pausa{opacity:.6}\
#cabina .cbCol .cbVacioCol{font:12px var(--sans);color:var(--mute);padding:6px 2px}\
#cabina .cbFrentes{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--hair);font:12px var(--mono);color:var(--dim)}\
#cabina .cbFrentes span{border:1px solid var(--hair2);border-radius:999px;padding:4px 10px}\
@media (max-width:900px){\
 #cabina .cbPulso{grid-template-columns:repeat(2,minmax(0,1fr))}\
 #cabina .cbP{border-bottom:1px solid var(--hair)}\
 #cabina .cbP:nth-child(2n){border-right:0}\
 #cabina .cbFila{grid-template-columns:auto 1fr}\
 #cabina .cbChips{grid-column:2;justify-content:flex-start}\
 #cabina .cbEtapas{grid-template-columns:1fr}\
}';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function z(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
  function haceDias(n) { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return iso(d); }
  function diaDeStr(v) { return (typeof diaDe === 'function') ? diaDe(v) : (v ? String(v).slice(0, 10) : null); }
  function fecha(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function etiquetaDias(d) { return d === null ? 'sin fecha' : d > 0 ? d + ' d tarde' : d === 0 ? 'hoy' : 'en ' + (-d) + ' d'; }
  function mediana(a) { if (!a.length) return null; a = a.slice().sort(function (x, y) { return x - y; }); var m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
  function borrada(r) { return r.borrada === true || String(r.borrada).toLowerCase() === 'true'; }

  /* ───────── cálculo ───────── */
  function calcular() {
    var todas = (window.TAREAS || []).filter(function (r) { return !borrada(r); });
    var vivas = (window.VIVAS || []);
    var abiertas = vivas.filter(function (r) { return !r._pausa; });

    var d7 = haceDias(7), d14 = haceDias(14), d28 = haceDias(28), d60 = haceDias(60);
    var cerr = todas.map(function (r) { return { r: r, t: diaDeStr(r.fechaTerminado) }; }).filter(function (x) { return x.t; });
    var c7 = cerr.filter(function (x) { return x.t > d7; }).length;
    var cAnt = cerr.filter(function (x) { return x.t > d14 && x.t <= d7; }).length;
    var c28 = cerr.filter(function (x) { return x.t > d28; }).length;

    /* tiempo de cierre: del primer renglón del historial a fechaTerminado */
    var dur = [];
    cerr.forEach(function (x) {
      if (x.t <= d60) return;
      var ini = null;
      String(x.r.historial || '').split('|').forEach(function (h) { var m = /^\s*(\d{4}-\d{2}-\d{2})\s/.exec(h); if (m && (!ini || m[1] < ini)) ini = m[1]; });
      var a = fecha(ini), b = fecha(x.t);
      if (a && b && b >= a) dur.push(Math.round((b - a) / 86400000));
    });

    var vencidas = abiertas.filter(function (r) { var d = window.dias ? dias(r._f) : null; return d !== null && d > 0; });
    var espOtros = abiertas.filter(function (r) { return r._espAotro; });

    /* tu cuello: lo tuyo que frena. Orden: más tarde primero; después decisión
       sin ejecutar; después la etapa del proyecto (más cerca de obra, más pesa). */
    var PESO = { 'Venta': 3, 'Obra': 4, 'Trámite': 2, 'Potencial': 1 };
    var cuello = abiertas.filter(function (r) {
      var d = window.dias ? dias(r._f) : null;
      return r._mio && (r._dec || r._miaCerrar || (d !== null && d > 0));
    }).map(function (r) {
      var d = window.dias ? dias(r._f) : null;
      var p = window.YodProyectos ? YodProyectos.buscar(r.proyecto) : null;
      return { r: r, tarde: d !== null && d > 0 ? d : 0, dec: !!r._dec, cerrar: !!r._miaCerrar, p: p, w: p ? (PESO[p.etapa] || 0) : 0 };
    }).sort(function (a, b) { return b.tarde - a.tarde || (b.dec - a.dec) || (b.w - a.w); });

    return { todas: todas, vivas: vivas, abiertas: abiertas, c7: c7, cAnt: cAnt, c28: c28, dur: dur, vencidas: vencidas, espOtros: espOtros, cuello: cuello };
  }

  /* ───────── pulso ───────── */
  function htmlPulso(D) {
    var dlt = D.c7 - D.cAnt;
    var tend = dlt > 0 ? '<i class="up">▲ ' + dlt + ' vs. la semana pasada</i>' : dlt < 0 ? '<i class="dn">▼ ' + (-dlt) + ' vs. la semana pasada</i>' : '<i class="eq">= igual que la semana pasada</i>';
    var med = mediana(D.dur);
    var cierre = D.dur.length >= 3 ? '<b>' + Math.round(med) + ' d</b><span>tiempo típico para cerrar una tarjeta<br><i class="eq">con ' + D.dur.length + ' cerradas en 60 días</i></span>'
      : '<b>—</b><span>tiempo típico para cerrar<br><i class="eq">faltan cerradas con historial (hay ' + D.dur.length + ')</i></span>';
    var pausa = D.vivas.length - D.abiertas.length;
    var ritmo = '';
    if (D.c28 > 0) {
      var porSem = D.c28 / 4, sem = D.abiertas.length / porSem;
      ritmo = 'A tu ritmo de <b>' + (Math.round(porSem * 10) / 10) + ' cierres por semana</b>, vaciar lo abierto (sin contar lo nuevo que entre) tomaría <b>' +
        (sem < 1 ? 'menos de una semana' : Math.round(sem) + (Math.round(sem) === 1 ? ' semana' : ' semanas')) + '</b>.';
    } else {
      ritmo = 'No hay cierres registrados en los últimos 28 días, así que no se puede estimar el ritmo. Cierra una tarjeta desde el Despacho para que empiece a medirse.';
    }
    return '<div class="cbPulso" role="group" aria-label="Pulso del trabajo">' +
      '<div class="cbP"><b>' + D.c7 + '</b><span>cerradas en 7 días</span>' + tend + '</div>' +
      '<div class="cbP"><b>' + D.abiertas.length + '</b><span>abiertas ahora<br><i class="eq">' + pausa + ' en pausa aparte</i></span></div>' +
      '<div class="cbP' + (D.vencidas.length ? ' mal' : '') + '"><b>' + D.vencidas.length + '</b><span>vencidas<br><i class="eq">con fecha ya pasada</i></span></div>' +
      '<div class="cbP"><b>' + D.espOtros.length + '</b><span>esperando a otros<br><i class="eq">la pelota no está contigo</i></span></div>' +
      '<div class="cbP">' + cierre + '</div>' +
      '<div class="cbRitmo">' + ritmo + '</div></div>';
  }

  /* ───────── tu cuello ───────── */
  var UN_SENTIDO = /firm|contrat|rescis|escritur|transfer|demanda|cancel|despid|liquid|convenio|poder notarial|ceder|traspas/i;
  function htmlCuello(D) {
    var n = D.cuello.length;
    var head = '<div class="cbHead"><div><div class="cbK">Tu cuello de botella</div><h2>' +
      (n ? 'Estás frenando ' + n + (n === 1 ? ' cosa' : ' cosas') : 'No estás frenando nada') + '</h2></div>' +
      '<div class="cbS">Lo tuyo que está vencido, o que es una decisión pendiente, en el orden en que más pesa.</div></div>';
    if (!n) return '<div class="cbBox">' + head + '<div class="cbVacio">Todo lo tuyo va al día. Lo que se atore ahora será de otros.</div></div>';
    var filas = D.cuello.slice(0, 5).map(function (x, i) {
      var r = x.r, chips = '';
      if (x.tarde) chips += '<span class="cbChip tarde">' + x.tarde + ' d tarde</span>';
      if (x.dec) chips += '<span class="cbChip dec">decisión sin ejecutar</span>';
      if (x.cerrar) chips += '<span class="cbChip dec">redactada: te toca cerrarla</span>';
      var txt = String(r.actividad || '') + ' ' + String(r.entregable || '');
      var uno = UN_SENTIDO.test(txt);
      chips += uno ? '<span class="cbChip uno" title="Sugerencia por las palabras de la tarjeta. Un solo sentido = difícil de deshacer: conviene pensarlo.">⚑ un solo sentido</span>'
        : '<span class="cbChip" title="Sugerencia por las palabras de la tarjeta. Reversible = se puede corregir después: conviene decidir rápido.">↺ reversible</span>';
      var folio = x.p ? x.p.folio : '';
      return '<div class="cbFila"><span class="cbN">' + (i + 1) + '</span><div><div class="cbT">' + esc(String(r.actividad || '(sin título)').slice(0, 160)) + '</div>' +
        '<div class="cbM"><span>' + esc(r.id || '') + '</span><span>' + esc(String(r.proyecto || 'sin proyecto').trim()) + (folio ? ' · ' + esc(folio) : '') + '</span>' +
        (x.p && x.p.etapa ? '<span>etapa: ' + esc(x.p.etapa) + '</span>' : '') + '</div></div><div class="cbChips">' + chips + '</div></div>';
    }).join('');
    var mas = n > 5 ? '<button class="cbMas" type="button" id="cbVer">Ver ' + (n - 5 === 1 ? 'la otra' : 'las otras ' + (n - 5)) + ' en «Lo abierto» ↓</button>'
      : '<button class="cbMas" type="button" id="cbVer">Verlas en «Lo abierto» ↓</button>';
    return '<div class="cbBox">' + head + filas + mas + '</div>';
  }

  /* ───────── proyectos por etapa ───────── */
  function tarjetaProyecto(p, D) {
    var mias = D.vivas.filter(function (r) { return window.YodProyectos && YodProyectos.folio(r.proyecto) === p.folio; });
    var ab = mias.filter(function (r) { return !r._pausa; });
    var ven = ab.filter(function (r) { var d = window.dias ? dias(r._f) : null; return d !== null && d > 0; });
    var sig = ab.filter(function (r) { return r._f; }).sort(function (a, b) { return a._f - b._f; })[0];
    var enPausa = mias.length > 0 && !ab.length;
    var sigTxt = sig ? '<div class="cbSig"><b>Sigue:</b> ' + esc(String(sig.actividad || '').slice(0, 90)) + ' <span class="cbF">· ' + esc(sig.responsable || 'sin dueño') + ' · ' + esc(etiquetaDias(dias(sig._f))) + '</span></div>'
      : (ab.length ? '<div class="cbSig">Sin fecha en sus tarjetas abiertas.</div>' : '');
    var aviso = !p.etapa ? '<div class="cbAviso">Sin etapa: pónsela en la pestaña PROYECTOS del Sheet «YOD OS · Control Maestro».</div>' : '';
    var cuerpo = '<h4>' + esc(p.nombre) + '</h4><div class="cbF">' + esc(p.folio) + ' · ' + esc(p.etapa_actual || '—') + '</div>' + sigTxt + aviso +
      '<div class="cbNum"><span>' + ab.length + ' abiertas</span>' + (ven.length ? '<span class="r">' + ven.length + ' vencidas</span>' : '') + (enPausa ? '<span>' + mias.length + ' en pausa</span>' : '') + '</div>';
    return p.tablero ? '<a class="cbCard' + (enPausa ? ' pausa' : '') + '" href="' + esc(p.tablero) + '" title="Abrir el tablero de ' + esc(p.nombre) + '">' + cuerpo + '</a>'
      : '<div class="cbCard' + (enPausa ? ' pausa' : '') + '">' + cuerpo + '</div>';
  }
  function htmlEtapas(D) {
    var YP = window.YodProyectos;
    var head = '<div class="cbHead"><div><div class="cbK">Proyectos por etapa</div><h2>Dónde está cada proyecto</h2></div>' +
      '<div class="cbS">Una tarjeta por folio. Las etapas son las oficiales del registro de proyectos.</div></div>';
    if (!YP) return '<div class="cbBox">' + head + '<div class="cbVacioCol">El registro de folios no cargó. Recarga la página.</div></div>';
    var reales = YP.lista.filter(function (p) { return p.tipo !== 'Frente operativo'; });
    var frentes = YP.lista.filter(function (p) { return p.tipo === 'Frente operativo'; });
    var cols = YP.etapas.map(function (e) { return { t: e, l: reales.filter(function (p) { return p.etapa === e; }) }; });
    cols.push({ t: 'Por clasificar', l: reales.filter(function (p) { return !p.etapa; }), sin: true });
    var html = cols.map(function (c) {
      return '<div class="cbCol' + (c.sin ? ' sin' : '') + '"><h3><span>' + esc(c.t) + '</span><span>' + c.l.length + '</span></h3>' +
        (c.l.length ? c.l.map(function (p) { return tarjetaProyecto(p, D); }).join('') : '<div class="cbVacioCol">—</div>') + '</div>';
    }).join('');
    var fr = frentes.map(function (p) {
      var n = D.abiertas.filter(function (r) { return YP.folio(r.proyecto) === p.folio; }).length;
      return n ? '<span>' + esc(p.nombre) + ' · ' + n + '</span>' : '';
    }).join('');
    return '<div class="cbBox">' + head + '<div class="cbEtapas">' + html + '</div>' + (fr ? '<div class="cbFrentes"><b>Frentes operativos abiertos:</b>' + fr + '</div>' : '') + '</div>';
  }

  /* ───────── montaje ───────── */
  function montar() {
    var el = document.getElementById('cabina');
    if (el) return el;
    if (!document.getElementById('cabinaCss')) { var st = document.createElement('style'); st.id = 'cabinaCss'; st.textContent = CSS; document.head.appendChild(st); }
    el = document.createElement('section'); el.id = 'cabina'; el.setAttribute('aria-label', 'La cabina');
    var ac = document.getElementById('acuerdo');
    if (ac && ac.parentNode) ac.parentNode.insertBefore(el, ac); else { var w = document.querySelector('.w'); if (!w) return null; w.insertBefore(el, w.children[1] || null); }
    return el;
  }
  function pintar() {
    if (!window.TAREAS || !window.TAREAS.length) return;
    var el = montar(); if (!el) return;
    var D = calcular();
    el.innerHTML = htmlPulso(D) + htmlCuello(D) + htmlEtapas(D);
    var b = document.getElementById('cbVer');
    if (b) b.onclick = function () {
      try { window.FILTRO = null; window.VER_SOLO_VENCIDAS = true; if (window.pintarCinta) pintarCinta(); if (window.pintarPila) pintarPila(); } catch (e) { }
      var pl = document.getElementById('pila'); if (pl) pl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  }

  /* se cuelga de pintar(): cada vez que el Despacho se repinta, la cabina también */
  var original = window.pintar;
  if (typeof original === 'function') {
    window.pintar = function () { var r = original.apply(this, arguments); try { pintar(); } catch (e) { console.error('[cabina]', e); } return r; };
  }
  /* el registro de folios llega por su propio <script>: al llegar, se repinta */
  window.addEventListener('load', function () { try { pintar(); } catch (e) { console.error('[cabina]', e); } });
  try { pintar(); } catch (e) { }

  window.Cabina = { pintar: pintar, calcular: calcular };
})();
