/* EL DESPACHO v2 · «Tu día empieza con el trabajo ya hecho» (29-sep-2026)

   Una sola pantalla, cuatro carriles:
     1. TU SÍ ............ lo que ya está redactado y necesita tu voz (urgente, dinero, legal)
     2. PUEDE ESPERAR .... lo redactado sin riesgo: se aprueba en bloque, de un toque
     3. SOLO TÚ .......... lo que el Ejecutor no puede decidir: te dice qué falta y tú contestas
     4. LO QUE HICE SOLO . lo que ya salió hoy, con hora y quién lo mandó

   No hay base nueva: cada encargo es una tarjeta del tablero (Sheet privado) con un
   protocolo de líneas BANDEJA en `comentarios` (ver EJECUTOR.md). El Ejecutor (rutina de
   Claude, cada hora) redacta, envía lo aprobado y se entera de lo que mandas tú desde Gmail.

   #demo en la URL enseña la pantalla con datos de ejemplo, sin tocar nada real. */
(function(){
'use strict';
var EXEC='https://script.google.com/macros/s/AKfycbyZ1p7rGHuU01vWBbynGdmlKTnlyH9CIXyhKivqLHa4rLxcHNneJKsZHv7smnjLsfH1/exec';
var LSK='pyod_clave_v1', SEP='|||', TZ='America/Hermosillo';
var DEMO=/^#demo$/.test(location.hash);
var TAREAS=[], CAIDO=false, LEIDO=0, CARGANDO=false, ABIERTO=null;

/* ───────── utilidades ───────── */
function $(s,c){ return (c||document).querySelector(s); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function hoy(){ return new Date().toLocaleDateString('en-CA',{timeZone:TZ}); }
function clave(){ try{ return localStorage.getItem(LSK)||''; }catch(e){ return ''; } }
function edadMin(iso){ var t=Date.parse(iso||''); return isNaN(t)?null:Math.max(0,Math.round((Date.now()-t)/60000)); }
function hace(m){ if(m===null) return ''; if(m<1) return 'hace un momento'; if(m<60) return 'hace '+m+' min'; if(m<1440) return 'hace '+Math.round(m/60)+' h'; return 'hace '+Math.round(m/1440)+' d'; }
function horaDe(iso){ var t=Date.parse(iso||''); return isNaN(t)?'':new Date(t).toLocaleTimeString('es-MX',{timeZone:TZ,hour:'numeric',minute:'2-digit'}); }
function diaDe(iso){ var t=Date.parse(iso||''); return isNaN(t)?'':new Date(t).toLocaleDateString('en-CA',{timeZone:TZ}); }
function limpio(t){ return String(t||'').replace(/\s+/g,' ').replace(/~|\|\|\|/g,'-').trim(); }
function enCristiano(m){ m=String(m||''); if(m==='liga') return 'Google no reconoció el acceso ahorita'; if(m==='clave') return 'tu acceso no fue reconocido: vuelve a entrar'; return m; }

/* ───────── protocolo ───────── */
function lineas(r){
  return String(r.comentarios||'').split(SEP).map(function(c){
    var p=c.split('~'); if(p.length<3) return null;
    return {autor:p[0].trim(), fecha:p[1].trim(), texto:p.slice(2).join('~').trim()};
  }).filter(function(x){ return x && /^BANDEJA /.test(x.texto); });
}
function campos(t){
  var o={_libre:[]};
  t.split(' · ').forEach(function(s,i){ if(i===0) return; var m=s.match(/^([a-z]+)=(.*)$/); if(m) o[m[1]]=m[2]; else o._libre.push(s); });
  o._libre=o._libre.join(' · '); return o;
}
var EST={LISTO:'listo',REHECHO:'listo',CANCELADO:'listo',APROBADO:'aprobado',CAMBIO:'trabajando',RESPUESTA:'trabajando',
         ENVIADO:'hecho',RESUELTO:'hecho',DESCARTADO:'descartado',ERROR:'error'};
function leer(r){
  var L=lineas(r); if(!L.length) return null;
  var s={id:r.id, r:r, n:L.length, draft:'', tipo:'correo', para:'', thread:'', prio:'media', chips:[], creada:'', falta:''};
  L.forEach(function(x){ var c=campos(x.texto);
    if(/^BANDEJA (LISTO|REHECHO)/.test(x.texto)){
      if(c.draft) s.draft=c.draft; if(c.tipo) s.tipo=c.tipo; if(c.para) s.para=c.para; if(c.thread) s.thread=c.thread;
      if(c.prio) s.prio=c.prio; if(c.chips) s.chips=c.chips.split(',').map(function(z){return z.trim();}).filter(Boolean);
      if(c.falta) s.falta=c.falta; if(!s.creada) s.creada=c.hora||'';
    }
  });
  var ult=L[L.length-1], k=(ult.texto.match(/^BANDEJA ([A-ZÁÉÍÓÚ]+)/)||[])[1]||'', c=campos(ult.texto);
  s.est=EST[k]||'listo'; s.k=k; s.hora=c.hora||''; s.motivo=c._libre; s.por=c.por||''; s.ultAutor=ult.autor;
  var obs=String(r.observaciones||''), cut=obs.indexOf('—— BORRADOR ——');
  s.resumen=(cut>=0?obs.slice(0,cut):obs).trim(); s.cuerpo=cut>=0?obs.slice(cut+14).trim():'';
  s.gmail=(String(r.links||'').split('|').map(function(x){ return x.split('~').pop().trim(); }).filter(function(u){ return /^https:\/\/mail\.google\.com\//.test(u); })[0])||'';
  s.titulo=r.actividad||'';
  if(!s.chips.length && String(r.prioridad||'')==='Alta') s.chips=['hoy'];
  s.carril = s.tipo==='decision' ? 'solo' : (s.prio==='alta'||s.chips.length ? 'si' : 'espera');
  return s;
}
function latido(items){
  /* la vuelta más reciente del Ejecutor = la última línea escrita por Claude en cualquier tarjeta */
  var mx=0; items.forEach(function(s){ lineas(s.r).forEach(function(x){ if(x.autor==='Claude'){ var t=Date.parse(campos(x.texto).hora||''); if(!isNaN(t)&&t>mx) mx=t; } }); });
  return mx? new Date(mx).toISOString():'';
}

/* ───────── backend (tablero de siempre) ───────── */
async function llamar(action,payload,vuelta){
  if(DEMO) return demoLlamar(action,payload);
  vuelta=vuelta||0;
  var ctl=new AbortController(), tope=setTimeout(function(){ ctl.abort(); },60000), r;
  try{ r=await fetch(EXEC,{method:'POST',credentials:'omit',redirect:'follow',cache:'no-store',headers:{'Content-Type':'text/plain;charset=utf-8'},
         body:JSON.stringify(Object.assign({action:action,k:clave()},payload||{})),signal:ctl.signal}); }
  catch(e){ clearTimeout(tope); throw new Error(e&&e.name==='AbortError'?'Google tardó más de un minuto':'no hay conexión ahorita'); }
  clearTimeout(tope);
  var t=await r.text(), j=null; try{ j=JSON.parse(t); }catch(e){}
  if(!j){ if(action==='getAll'&&vuelta<2){ await new Promise(function(ok){setTimeout(ok,1200*(vuelta+1));}); return llamar(action,payload,vuelta+1); }
          throw new Error(action==='getAll'?'Google contestó con una página en vez de datos':'el tablero contestó algo raro'); }
  if(j.ok===false && j.error==='liga' && action==='getAll' && vuelta<2){ await new Promise(function(ok){setTimeout(ok,1200*(vuelta+1));}); return llamar(action,payload,vuelta+1); }
  return j;
}
async function cargar(){
  if(CARGANDO) return; CARGANDO=true;
  try{
    if(!DEMO && !clave()){ CAIDO=true; pintar('sinClave'); return; }
    var j=await llamar('getAll',{});
    if(!j||j.ok===false) throw new Error(j&&j.error||'sin respuesta');
    TAREAS=j.tasks||[]; CAIDO=false; LEIDO=Date.now(); pintar();
  }catch(e){ CAIDO=true; pintar('caido',enCristiano(e.message)); }
  finally{ CARGANDO=false; }
}
/* Escribir UNA línea: releer, comprobar que nadie movió la tarjeta, escribir, releer para confirmar. */
async function escribir(s, linea, estado){
  var f=await llamar('getAll',{}); if(!f||!f.ok) throw new Error('no pude releer el tablero, así que no escribí');
  var act=(f.tasks||[]).filter(function(x){ return x.id===s.id; })[0]; if(!act) throw new Error('esa tarjeta ya no está');
  var s2=leer(act); if(!s2||s2.n!==s.n){ TAREAS=f.tasks; throw new Error('CAMBIO'); }
  var prev=String(act.comentarios||''), nueva='Alejandro~'+hoy()+'~'+linea, patch={comentarios:prev?(prev+SEP+nueva):nueva};
  if(estado && estado!==act.estado){ patch.estado=estado; patch.historial=(act.historial?act.historial+'|':'')+hoy()+' '+estado; if(estado==='Terminado') patch.fechaTerminado=hoy(); }
  var err=null; try{ var w=await llamar('update',{id:s.id,patch:patch}); if(w&&w.ok===false) err=new Error(w.error||'no lo aceptó'); }catch(x){ err=x; }
  var chk=await llamar('getAll',{}), t2=((chk&&chk.tasks)||[]).filter(function(x){ return x.id===s.id; })[0];
  if(chk&&chk.tasks) TAREAS=chk.tasks;
  if(!(t2 && String(t2.comentarios||'').indexOf(linea)>=0)) throw new Error(err?enCristiano(err.message):'al releer no lo veo escrito');
  return true;
}

/* ───────── pintar ───────── */
function items(){ return TAREAS.filter(function(r){ return String(r.borrada||'').toUpperCase()!=='TRUE'; }).map(leer).filter(Boolean); }
function chipsHtml(s){ var N={urgente:'URGENTE',hoy:'HOY',dinero:'$',legal:'LEGAL',firma:'FIRMA'};
  return s.chips.map(function(c){ return '<span class="chip c-'+esc(c)+'">'+esc(N[c]||c.toUpperCase())+'</span>'; }).join(''); }
function estadoHtml(s){
  if(s.est==='aprobado') return '<div class="est ok">✓ Aprobado '+esc(hace(edadMin(s.hora)))+' · sale en la próxima vuelta</div>';
  if(s.est==='trabajando') return '<div class="est">'+(s.k==='RESPUESTA'?'Redactando con tu respuesta':'Rehaciéndolo con tu cambio')+' · vuelve en la próxima vuelta</div>';
  if(s.est==='error') return '<div class="est mal">No salió: '+esc(s.motivo||'sin detalle')+'</div>';
  return '';
}
function tarjeta(s){
  var para = s.tipo==='decision' ? 'Te falta decidir' : ('✉ para '+(s.para||'—'));
  return '<button class="card" data-abrir="'+esc(s.id)+'"><span class="meta">'+chipsHtml(s)+'<span>'+esc(para)+'</span></span>'
    +'<span class="t">'+esc(s.titulo)+'</span>'
    +(s.tipo==='decision'&&s.falta?'<span class="r">'+esc(s.falta)+'</span>':(s.resumen?'<span class="r">'+esc(s.resumen)+'</span>':''))
    +estadoHtml(s)+'</button>';
}
function pintar(modo,det){
  var abiertos=[], hechosHoy=[], todo=items();
  todo.forEach(function(s){
    if(/^(listo|aprobado|trabajando|error)$/.test(s.est)) abiertos.push(s);
    else if(diaDe(s.hora)===hoy()) hechosHoy.push(s);
  });
  var si=abiertos.filter(function(s){ return s.carril==='si'; }), esp=abiertos.filter(function(s){ return s.carril==='espera'; }), solo=abiertos.filter(function(s){ return s.carril==='solo'; });
  var O={error:0,listo:1,trabajando:2,aprobado:3}; [si,esp,solo].forEach(function(a){ a.sort(function(x,y){ return O[x.est]-O[y.est]; }); });

  /* cabecera */
  var h=Number(new Date().toLocaleString('en-US',{timeZone:TZ,hour:'numeric',hour12:false}));
  $('#saludo').textContent=(h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches')+', Alejandro';
  $('#fecha').textContent=new Date().toLocaleDateString('es-MX',{timeZone:TZ,weekday:'long',day:'numeric',month:'long'}).toUpperCase()+' · HERMOSILLO'+(DEMO?' · DEMO':'');
  var lat=$('#latido'), ul=latido(todo), m=edadMin(ul);
  if(modo==='sinClave'){ lat.className='lat mal'; lat.innerHTML='<i></i>Falta tu llave · entra con tu liga del Portero'; }
  else if(modo==='caido'){ lat.className='lat mal'; lat.innerHTML='<i></i>No pude leer el tablero · '+esc(det||'')+' <button id="reint">Reintentar</button>'; }
  else if(m===null){ lat.className='lat esp'; lat.innerHTML='<i></i>El Ejecutor todavía no ha corrido'; }
  else if(m>130){ lat.className='lat mal'; lat.innerHTML='<i></i>El Ejecutor no ha pasado '+esc(hace(m))+' · lo urgente, mándalo tú desde Gmail'; }
  else { lat.className='lat'; lat.innerHTML='<i></i>Ejecutor pasó '+esc(hace(m)); }
  document.body.classList.toggle('caido',!!CAIDO);

  if(modo){ ['#cSi','#cEsp','#cSolo','#cHecho'].forEach(function(k){ $(k).innerHTML=''; }); $('#vacio').hidden=false;
    $('#vacio').textContent= modo==='sinClave' ? 'Abre tu liga de entrada una vez en este celular y aquí aparece tu trabajo listo.' : 'No te enseño una bandeja vacía cuando en realidad no pude leerla. En cuanto Google conteste, aparece.'; return; }

  $('#vacio').hidden = !!(si.length||esp.length||solo.length||hechosHoy.length);
  $('#vacio').textContent='Nada esperando tu sí. Cuando el Ejecutor termine algo, aparece aquí listo para mandar.';

  $('#cSi').innerHTML = si.length ? '<div class="carril">TU SÍ · '+si.length+'</div>'+si.map(tarjeta).join('') : '';

  var espListos=esp.filter(function(s){ return s.est==='listo'; });
  $('#cEsp').innerHTML = esp.length ? '<div class="carril">PUEDE ESPERAR · '+esp.length+'</div>'
    +'<div class="lote"><div class="lt">'+esp.length+(esp.length===1?' correo sin riesgo':' correos sin riesgo')+'</div>'
    +'<div class="lr">'+esp.map(function(s){ return '<button class="li" data-abrir="'+esc(s.id)+'"><span>'+esc(s.titulo)+'</span>'+(s.est!=='listo'?'<em>'+esc(s.est==='aprobado'?'aprobado':s.est==='error'?'no salió':'rehaciendo')+'</em>':'<em>›</em>')+'</button>'; }).join('')+'</div>'
    +(espListos.length?'<div class="acc" id="loteAcc"><button class="si" data-lote="pre">Aprobar '+(espListos.length===1?'este':'los '+espListos.length)+'</button></div>':'')
    +'<div class="msg" id="loteMsg"></div></div>' : '';

  $('#cSolo').innerHTML = solo.length ? '<div class="carril">SOLO TÚ · '+solo.length+'</div>'+solo.map(tarjeta).join('') : '';

  var env=hechosHoy.filter(function(s){ return s.est==='hecho'; }).length;
  $('#cHecho').innerHTML = hechosHoy.length ? '<div class="carril">LO QUE HICE SOLO · HOY</div>'
    +'<div class="min"><b>'+(env*6)+'</b><span>min que no tuviste que escribir hoy<br><small>estimado: 6 min por correo enviado</small></span></div>'
    +hechosHoy.sort(function(a,b){ return Date.parse(b.hora)-Date.parse(a.hora); }).map(function(s){
      var q = s.est==='descartado' ? '✕ Descartado' : (s.k==='RESUELTO' ? '✓ Resuelto' : (s.por==='alejandro' ? '✓ Lo mandaste tú' : '✓ Enviado'));
      return '<div class="hecho"><div><b class="'+(s.est==='descartado'?'x':'')+'">'+q+'</b> · '+esc(s.titulo)+'</div><span>'+esc(horaDe(s.hora))+'</span></div>'; }).join('') : '';

  if(ABIERTO){ var s=todo.filter(function(x){ return x.id===ABIERTO; })[0]; if(s && /^(listo|aprobado|trabajando|error)$/.test(s.est)) abrir(s,true); else cerrar(); }
}

/* ───────── hoja de detalle ───────── */
function cuerpoHtml(t){ return esc(t).replace(/⟦([^⟧]*)⟧/g,'<mark>$1</mark>'); }
function abrir(s,refresco){
  ABIERTO=s.id; var hj=$('#hoja'), acc='';
  if(s.tipo==='decision'){
    acc = s.est==='listo'||s.est==='error'
      ? '<textarea id="resp" placeholder="Tu respuesta en una frase. El Ejecutor redacta con ella."></textarea>'
        +'<div class="acc"><button data-mic="resp" class="mic">🎙</button><button class="si" data-a="responder">Que lo redacte así</button></div>'
        +'<div class="acc"><button data-a="resuelto">Ya lo resolví yo</button></div>'
      : '';
  } else if(s.est==='listo'||s.est==='error'){
    acc='<div class="acc"><button class="si" data-a="pre">'+(s.est==='error'?'Intentar otra vez':'Enviar')+'</button><button data-a="cambiar">🎙 Cambiar</button></div>'
      +(s.gmail?'<div class="acc"><a class="btn" href="'+esc(s.gmail)+'" target="_blank" rel="noopener">Abrir en Gmail y mandarlo ya</a></div>':'')
      +'<div class="acc"><button class="baja" data-a="descartar">Descartar</button></div>';
  } else if(s.est==='aprobado'){
    acc='<div class="acc"><button data-a="cancelar">Cancelar el envío</button></div>';
  }
  hj.innerHTML='<div class="asa"></div><button class="cerrar" data-a="cerrar" aria-label="Cerrar">✕</button>'
    +'<div class="hm">'+chipsHtml(s)+'<span>'+esc(s.tipo==='decision'?'DECISIÓN':'CORREO')+'</span></div>'
    +'<h2>'+esc(s.titulo)+'</h2>'
    +(s.tipo!=='decision'?'<div class="para">Para: '+esc(s.para||'—')+'</div>':'')
    +(s.tipo==='decision'&&s.falta?'<div class="falta">'+esc(s.falta)+'</div>':'')
    +estadoHtml(s)
    +(s.cuerpo?'<div class="cuerpo">'+cuerpoHtml(s.cuerpo)+'</div>'+(s.cuerpo.indexOf('⟦')>=0?'<div class="nota">Lo marcado es lo que el Ejecutor agregó o corrigió.</div>':''):(s.resumen?'<div class="cuerpo">'+esc(s.resumen)+'</div>':''))
    +'<div class="acciones" data-id="'+esc(s.id)+'">'+acc+'</div><div class="msg" id="hojaMsg"></div>';
  hj.hidden=false; $('#velo').hidden=false; document.body.classList.add('hojaAbierta');
  if(!refresco){ hj.scrollTop=0; var f=hj.querySelector('button.si,button,a'); if(f) f.focus({preventScroll:true}); }
}
function cerrar(){ ABIERTO=null; $('#hoja').hidden=true; $('#velo').hidden=true; document.body.classList.remove('hojaAbierta'); }

async function accion(s, linea, estado, msg, okTxt){
  var btns=document.querySelectorAll('#hoja button, #loteAcc button'); btns.forEach(function(b){ b.disabled=true; });
  msg.className='msg'; msg.textContent='escribiendo…';
  try{ await escribir(s,linea,estado); msg.className='msg ok'; msg.textContent=okTxt; setTimeout(function(){ pintar(); },900); return true; }
  catch(e){
    if(e.message==='CAMBIO'){ msg.className='msg mal'; msg.textContent='Cambió mientras lo mirabas: te enseño la versión nueva.'; setTimeout(function(){ pintar(); },1200); }
    else { msg.className='msg mal'; msg.textContent='No quedó: '+e.message+'. Releí el tablero y no está; puedes intentar otra vez.'; btns.forEach(function(b){ b.disabled=false; }); }
    return false;
  }
}

document.addEventListener('click', async function(ev){
  var t=ev.target; if(!t||!t.closest) return;
  if(t.closest('#reint')){ cargar(); return; }
  if(t.closest('#velo')){ cerrar(); return; }
  var ab=t.closest('[data-abrir]'); if(ab){ var s0=items().filter(function(x){ return x.id===ab.dataset.abrir; })[0]; if(s0) abrir(s0); return; }
  var b=t.closest('[data-a]');
  if(b){
    var a=b.dataset.a; if(a==='cerrar'){ cerrar(); return; }
    var s=items().filter(function(x){ return x.id===ABIERTO; })[0]; if(!s) return;
    var zona=$('#hoja .acciones'), msg=$('#hojaMsg'), ahora=new Date().toISOString();
    if(CAIDO){ msg.className='msg mal'; msg.textContent='El tablero no contesta: no escribo contra una copia vieja.'; return; }
    if(a==='pre'){
      if(!s.draft){ msg.className='msg mal'; msg.textContent='Esta tarjeta no dice qué borrador es: no la apruebo a ciegas.'; return; }
      zona.innerHTML='<div class="conf">Sale <b>tal como lo acabas de leer</b> a '+esc(s.para||'los destinatarios del borrador')+', en la próxima vuelta del Ejecutor (≤ 1 h). Lo puedes cancelar hasta entonces.</div>'
        +'<div class="acc"><button class="si" data-a="si" disabled>Sí, que salga</button><button data-a="volver">Espera</button></div>';
      setTimeout(function(){ var y=zona.querySelector('[data-a=si]'); if(y) y.disabled=false; },600); return;
    }
    if(a==='volver'){ abrir(s,true); return; }
    if(a==='si'){ await accion(s,'BANDEJA APROBADO · draft='+s.draft+' · hora='+ahora,'En proceso',msg,'✓ Aprobado. Sale en la próxima vuelta.'); return; }
    if(a==='cancelar'){ await accion(s,'BANDEJA CANCELADO · hora='+ahora,'Pendiente',msg,'Cancelado. No sale.'); return; }
    if(a==='descartar'){
      if(b.dataset.ok!=='1'){ b.dataset.ok='1'; b.textContent='Toca otra vez para descartar'; setTimeout(function(){ b.dataset.ok=''; b.textContent='Descartar'; },4000); return; }
      await accion(s,'BANDEJA DESCARTADO · hora='+ahora,'Terminado',msg,'Descartado.'); return;
    }
    if(a==='cambiar'){
      zona.innerHTML='<textarea id="camb" placeholder="Qué le cambio. Ej.: más corto, sin la segunda pregunta."></textarea>'
        +'<div class="acc"><button data-mic="camb" class="mic">🎙</button><button class="si" data-a="cambioOk">Rehacerlo así</button><button data-a="volver">Espera</button></div>';
      $('#camb').focus(); return;
    }
    if(a==='cambioOk'){ var tx=limpio($('#camb').value); if(!tx){ msg.className='msg mal'; msg.textContent='Escribe o dicta qué le cambio.'; return; }
      await accion(s,'BANDEJA CAMBIO · hora='+ahora+' · '+tx.slice(0,600),'Pendiente',msg,'Anotado. Lo rehago en la próxima vuelta.'); return; }
    if(a==='responder'){ var rx=limpio($('#resp').value); if(!rx){ msg.className='msg mal'; msg.textContent='Escribe o dicta tu respuesta.'; return; }
      await accion(s,'BANDEJA RESPUESTA · hora='+ahora+' · '+rx.slice(0,600),'Pendiente',msg,'Anotado. Lo redacto con eso en la próxima vuelta.'); return; }
    if(a==='resuelto'){ await accion(s,'BANDEJA RESUELTO · hora='+ahora,'Terminado',msg,'Listo, lo quito de tu lista.'); return; }
  }
  var lb=t.closest('[data-lote]');
  if(lb){
    var accZ=$('#loteAcc'), lm=$('#loteMsg'), lista=items().filter(function(s){ return s.carril==='espera' && s.est==='listo' && s.draft; });
    if(lb.dataset.lote==='pre'){
      accZ.innerHTML='<div class="conf">Salen '+lista.length+' correos, cada uno tal como está en su borrador. Si quieres leer alguno antes, tócalo arriba.</div>'
        +'<button class="si" data-lote="si" disabled>Sí, que salgan los '+lista.length+'</button><button data-lote="no">Espera</button>';
      setTimeout(function(){ var y=accZ.querySelector('[data-lote=si]'); if(y) y.disabled=false; },600); return;
    }
    if(lb.dataset.lote==='no'){ pintar(); return; }
    if(lb.dataset.lote==='si'){
      if(CAIDO){ lm.className='msg mal'; lm.textContent='El tablero no contesta: no escribo contra una copia vieja.'; return; }
      accZ.querySelectorAll('button').forEach(function(x){ x.disabled=true; });
      var ok=0, mal=[];
      for(var i=0;i<lista.length;i++){
        lm.className='msg'; lm.textContent='aprobando '+(i+1)+' de '+lista.length+'…';
        try{ await escribir(lista[i],'BANDEJA APROBADO · draft='+lista[i].draft+' · hora='+new Date().toISOString(),'En proceso'); ok++; }
        catch(e){ mal.push(lista[i].titulo+(e.message==='CAMBIO'?' (cambió mientras tanto)':'')); }
      }
      lm.className = mal.length?'msg mal':'msg ok';
      lm.textContent = '✓ '+ok+' aprobado'+(ok===1?'':'s')+'. Salen en la próxima vuelta.'+(mal.length?' No quedaron: '+mal.join('; ')+'.':'');
      setTimeout(function(){ pintar(); }, mal.length?3500:1200);
    }
  }
});
document.addEventListener('keydown',function(e){ if(e.key==='Escape' && ABIERTO) cerrar(); });

/* ───────── dictado (con motivo si falla) ───────── */
document.addEventListener('click',function(e){
  var b=e.target&&e.target.closest?e.target.closest('[data-mic]'):null; if(!b) return;
  var dest=document.getElementById(b.dataset.mic), SR=window.SpeechRecognition||window.webkitSpeechRecognition, msg=$('#hojaMsg');
  if(!dest) return;
  if(!SR){ msg.className='msg mal'; msg.textContent='Este navegador no dicta: usa el micrófono del teclado.'; return; }
  var rec=new SR(); rec.lang='es-MX'; rec.interimResults=true; var base=dest.value?dest.value+' ':''; b.classList.add('on');
  rec.onresult=function(ev){ var tx=''; for(var i=0;i<ev.results.length;i++) tx+=ev.results[i][0].transcript; dest.value=base+tx; };
  rec.onerror=function(ev){ msg.className='msg mal'; msg.textContent={'not-allowed':'Dale permiso de micrófono al sitio y vuelve a tocar 🎙.','no-speech':'No te oí. Vuelve a tocar 🎙.'}[ev.error]||'No pude oír: escríbelo.'; };
  rec.onend=function(){ b.classList.remove('on'); };
  try{ rec.start(); }catch(x){ b.classList.remove('on'); }
});

/* ───────── modo demo (sin tocar nada real) ───────── */
function demoDatos(){
  var H=function(min){ return new Date(Date.now()-min*60000).toISOString(); }, D=hoy();
  var row=function(id,act,obs,prio,com,extra){ return Object.assign({id:id,actividad:act,observaciones:obs,prioridad:prio,estado:'Pendiente',responsable:'Alejandro',proyecto:'Correo',links:'Borrador ~ https://mail.google.com/mail/',comentarios:com,historial:''},extra||{}); };
  return [
    row('D-1','Seguimiento de contrato · Lote 7','Corrige la cifra de la primera exhibición y pide fecha de firma.\n—— BORRADOR ——\nEstimada Mónica, buenas tardes:\n\nDoy seguimiento a la propuesta de contrato del Lote 7 que envié la semana pasada.\n\nUna corrección de captura: donde dice «$12,00.00» debe decir ⟦$12,000.00⟧ para el anticipo. Lo demás no cambia.\n\n¿Me confirmas si ya está revisado y en qué fecha podemos firmar?\n\nSaludos cordiales,\nAlejandro','Alta',
      'Claude~'+D+'~BANDEJA LISTO · tipo=correo · draft=r-demo1 · para=monica (+2 CC) · prio=alta · chips=legal,dinero · hora='+H(14)),
    row('D-2','Documentos para el banco','Adjunta los 3 PDF y confirma la cita del jueves.\n—— BORRADOR ——\nHola:\n\nTe comparto los tres documentos que pediste para el trámite: ⟦estado de cuenta, avance de obra y factura⟧.\n\nConfirmo la cita del jueves a las 10:00.\n\nSaludos,\nAlejandro','Alta',
      'Claude~'+D+'~BANDEJA LISTO · tipo=correo · draft=r-demo2 · para=ejecutivo del banco · prio=alta · chips=hoy · hora='+H(14)),
    row('D-3','Acuse: proveedor de cancelería','Confirma recepción de la cotización.\n—— BORRADOR ——\nGracias, recibida. La reviso esta semana y te comento.\n\nAlejandro','Media','Claude~'+D+'~BANDEJA LISTO · tipo=correo · draft=r-demo3 · para=ventas@cancel… · prio=media · hora='+H(14)),
    row('D-4','Acuse: invitación a comité vecinal','Agradece y confirma asistencia.\n—— BORRADOR ——\nMuchas gracias por la invitación, ahí estaré.\n\nAlejandro','Media','Claude~'+D+'~BANDEJA LISTO · tipo=correo · draft=r-demo4 · para=comite@… · prio=media · hora='+H(14)),
    row('D-5','Acuse: factura de mantenimiento','Confirma recepción y fecha de pago habitual.\n—— BORRADOR ——\nRecibida, gracias. Se programa en la siguiente fecha de pago.\n\nAlejandro','Media','Claude~'+D+'~BANDEJA LISTO · tipo=correo · draft=r-demo5 · para=facturacion@… · prio=media · hora='+H(14)),
    row('D-6','Factura de proveedor: ¿cuándo se paga?','','Alta','Claude~'+D+'~BANDEJA LISTO · tipo=decision · falta=¿Se paga este viernes o el día 15? · prio=alta · chips=dinero · hora='+H(14)),
    row('D-7','Agenda de junta semanal','Enviado.','Media','Claude~'+D+'~BANDEJA LISTO · tipo=correo · draft=r-x · para=equipo · hora='+H(300)+'|||Alejandro~'+D+'~BANDEJA APROBADO · draft=r-x · hora='+H(250)+'|||Claude~'+D+'~BANDEJA ENVIADO · msg=m1 · hora='+H(200)),
    row('D-8','Confirmación de evento','Enviado.','Media','Claude~'+D+'~BANDEJA LISTO · tipo=correo · draft=r-y · para=organizadores · hora='+H(400)+'|||Claude~'+D+'~BANDEJA ENVIADO · msg=m2 · por=alejandro · hora='+H(180)),
    row('D-9','Propuesta comercial','—','Media','Claude~'+D+'~BANDEJA LISTO · tipo=correo · draft=r-z · para=ventas · hora='+H(500)+'|||Alejandro~'+D+'~BANDEJA DESCARTADO · hora='+H(160))
  ];
}
var DEMO_T=null;
function demoLlamar(action,p){
  if(!DEMO_T) DEMO_T=demoDatos();
  return new Promise(function(ok){ setTimeout(function(){
    if(action==='getAll') return ok({ok:true,tasks:JSON.parse(JSON.stringify(DEMO_T))});
    if(action==='update'){ var t=DEMO_T.filter(function(x){ return x.id===p.id; })[0]; if(t) Object.assign(t,p.patch); return ok({ok:true}); }
    ok({ok:true});
  },250); });
}

/* ───────── arranque y refresco ───────── */
window.addEventListener('hashchange',function(){ location.reload(); });
cargar();
setInterval(function(){ if(document.visibilityState==='visible' && !ABIERTO && Date.now()-LEIDO>5*60000) cargar(); else if(!ABIERTO && !CAIDO) pintar(); },60000);
document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible' && !ABIERTO && Date.now()-LEIDO>2*60000) cargar(); });
/* el Portero termina de canjear la liga después de que esto arranca: en cuanto aparece la llave, se lee */
if(!DEMO && !clave()){ var espera=setInterval(function(){ if(clave()){ clearInterval(espera); cargar(); } },1000); setTimeout(function(){ clearInterval(espera); },30000); }
window.DESPACHO={cargar:cargar, _leer:leer};
})();
