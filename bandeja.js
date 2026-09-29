/* LA BANDEJA · «Listo para tu sí» (29-sep-2026)

   El Despacho deja de pedirte trabajo: te enseña trabajo YA HECHO y te pide un sí.
   Quien lo hace es el Ejecutor (rutina de Claude, cada hora, con tu Gmail y el Sheet
   del tablero). No hay base nueva ni backend nuevo: cada encargo es una tarjeta del
   tablero de siempre, marcada en sus comentarios. Así lo privado se queda en el Sheet
   privado (este repo es público) y la escritura usa el mismo `update` que ya se probó.

   EL PROTOCOLO (una línea por paso en `comentarios`, formato autor~fecha~texto):
     Claude~F~BANDEJA LISTO · tipo=correo · draft=<id> · para=<correos> · hora=<ISO>
     Alejandro~F~BANDEJA APROBADO · draft=<id> · hora=<ISO>        ← tu «sí»
     Alejandro~F~BANDEJA CAMBIO · hora=<ISO> · <lo que quieres cambiar>
     Alejandro~F~BANDEJA CANCELADO · hora=<ISO>                      ← te arrepentiste antes de que saliera
     Alejandro~F~BANDEJA DESCARTADO · hora=<ISO>
     Claude~F~BANDEJA ENVIADO · msg=<id> · hora=<ISO>
     Claude~F~BANDEJA REHECHO · draft=<nuevo> · hora=<ISO>
     Claude~F~BANDEJA ERROR · hora=<ISO> · <motivo>
   Manda la ÚLTIMA línea BANDEJA. El Ejecutor sólo envía un borrador cuya última línea
   es APROBADO con el mismo draft que la tarjeta anunció. Nada sale sin esa línea. */
(function(){
  var SEP='|||', HORA_EJECUTOR=65*60*1000;

  function lineas(r){
    return String(r.comentarios||'').split(SEP).map(function(c){
      var p=c.split('~'); if(p.length<3) return null;
      return {autor:p[0].trim(), fecha:p[1].trim(), texto:p.slice(2).join('~').trim()};
    }).filter(function(x){ return x && /^BANDEJA /.test(x.texto); });
  }
  function campos(t){
    var o={}; t.split(' · ').forEach(function(s){ var m=s.match(/^([a-z]+)=(.*)$/); if(m) o[m[1]]=m[2]; });
    var partes=t.split(' · '); o._libre=partes.filter(function(s){ return !/^([a-z]+)=/.test(s) && !/^BANDEJA /.test(s); }).join(' · ');
    return o;
  }
  function estadoDe(r){
    var L=lineas(r); if(!L.length) return null;
    var ult=L[L.length-1], k=(ult.texto.match(/^BANDEJA ([A-ZÁÉÍÓÚ]+)/)||[])[1]||'';
    var draft='', tipo='', para='', creada='';
    L.forEach(function(x){ var c=campos(x.texto);
      if(/^BANDEJA (LISTO|REHECHO)/.test(x.texto)){ if(c.draft) draft=c.draft; if(c.tipo) tipo=c.tipo; if(c.para) para=c.para; if(!creada) creada=c.hora||x.fecha; }
    });
    var est={LISTO:'listo',REHECHO:'listo',CANCELADO:'listo',APROBADO:'aprobado',CAMBIO:'cambio',
             ENVIADO:'hecho',DESCARTADO:'descartado',ERROR:'error'}[k]||'listo';
    var c=campos(ult.texto);
    return {est:est, ult:ult, hora:c.hora||'', motivo:c._libre, draft:draft, tipo:tipo||'correo', para:para, creada:creada, n:L.length};
  }
  function edadMin(iso){ var t=Date.parse(iso||''); return isNaN(t)?null:Math.round((Date.now()-t)/60000); }
  function haceTxt(m){ if(m===null) return ''; if(m<1) return 'hace un momento'; if(m<60) return 'hace '+m+' min'; if(m<48*60) return 'hace '+Math.round(m/60)+' h'; return 'hace '+Math.round(m/1440)+' d'; }
  function e(s){ return (window.esc||function(x){return String(x);})(s); }
  function ligaGmail(r){
    var l=String(r.links||'').split('|').map(function(x){ return x.split('~').pop().trim(); }).filter(function(u){ return /^https:\/\/mail\.google\.com\//.test(u); });
    return l[0]||'';
  }

  window.pintarBandeja=function(){
    var sec=document.getElementById('bandeja'); if(!sec) return;
    var T=(window.TAREAS||[]).filter(function(r){ return String(r.borrada||'').toUpperCase()!=='TRUE'; });
    var items=T.map(function(r){ var s=estadoDe(r); return s?{r:r,s:s}:null; }).filter(Boolean);
    var abiertos=items.filter(function(x){ return /^(listo|aprobado|cambio|error)$/.test(x.s.est); });
    var hechos=items.filter(function(x){ return /^(hecho|descartado)$/.test(x.s.est) && (edadMin(x.s.hora)===null || edadMin(x.s.hora)<7*1440); });
    var L=document.getElementById('bandejaL'), N=document.getElementById('bandejaN'), H=document.getElementById('bandejaH');
    if(!(window.TAREAS||[]).length){ L.innerHTML='<p class="bjVacio">Esperando al tablero para saber qué tengo listo.</p>'; N.textContent=''; H.innerHTML=''; return; }
    /* ¿el Ejecutor está vivo? Un «sí» que lleva más de una hora sin salir es la señal. */
    var atorado=abiertos.filter(function(x){ var m=edadMin(x.s.hora); return (x.s.est==='aprobado'||x.s.est==='cambio') && m!==null && m*60000>HORA_EJECUTOR*2; });
    N.textContent = abiertos.length ? ('· '+abiertos.length+(abiertos.length===1?' cosa':' cosas')) : '';
    var aviso = atorado.length ? '<div class="bjAviso">El Ejecutor no ha pasado en más de 2 horas: '+atorado.length+' '+(atorado.length===1?'cosa aprobada sigue':'cosas aprobadas siguen')+' sin salir. No es tu culpa ni se perdió: se envía en cuanto vuelva a correr.</div>' : '';
    if(!abiertos.length){
      L.innerHTML=aviso+'<p class="bjVacio">Nada esperando tu sí. Cuando termine algo, aparece aquí listo para mandar.</p>';
    } else {
      abiertos.sort(function(a,b){ var o={error:0,listo:1,cambio:2,aprobado:3}; return o[a.s.est]-o[b.s.est]; });
      L.innerHTML=aviso+abiertos.map(function(x){
        var r=x.r, s=x.s, g=ligaGmail(r), btns='', est='';
        if(s.est==='listo') btns='<button class="bjSi" data-bj="pre">Enviar</button><button data-bj="cambio">Cambiar algo</button><button data-bj="descartar">Descartar</button>';
        if(s.est==='error'){ est='<div class="bjEst mal">No salió: '+e(s.motivo||'error sin detalle')+'</div>'; btns='<button class="bjSi" data-bj="pre">Intentar otra vez</button><button data-bj="cambio">Cambiar algo</button><button data-bj="descartar">Descartar</button>'; }
        if(s.est==='aprobado'){ est='<div class="bjEst">✓ Aprobado '+e(haceTxt(edadMin(s.hora)))+'. Sale en la próxima vuelta del Ejecutor (a más tardar en una hora).</div>'; btns='<button data-bj="cancelar">Cancelar el envío</button>'; }
        if(s.est==='cambio'){ est='<div class="bjEst">Rehaciéndolo con tu cambio: «'+e(s.motivo)+'». Vuelve aquí en la próxima vuelta.</div>'; }
        return '<div class="bjItem" data-id="'+e(r.id)+'" data-n="'+s.n+'" data-draft="'+e(s.draft)+'">'
          +'<div class="bjMeta">'+e(s.tipo==='correo'?'✉ CORREO':s.tipo.toUpperCase())+(s.para?' · para '+e(s.para):'')+' · '+e(r.proyecto||'')+'</div>'
          +'<div class="bjT">'+e(r.actividad||'')+'</div>'
          +(r.observaciones?'<div class="bjR">'+e(r.observaciones)+'</div>':'')
          +(g?'<a class="bjLiga" href="'+e(g)+'" target="_blank" rel="noopener">Leerlo completo en Gmail ↗</a>':'')
          +est+'<div class="bjB">'+btns+'</div><div class="bjMsg"></div></div>';
      }).join('');
    }
    H.innerHTML = hechos.length ? ('<div class="bjHechoT">LO QUE YA SALIÓ · últimos 7 días</div>'+hechos.map(function(x){
      return '<div class="bjHecho">'+(x.s.est==='hecho'?'✓ Enviado':'✕ Descartado')+' · '+e(x.r.actividad||'')+' <span>'+e(haceTxt(edadMin(x.s.hora)))+'</span></div>'; }).join('')) : '';
  };

  /* Escribir: releer la tarjeta, comprobar que NADIE (ni el Ejecutor) la movió mientras
     mirabas, añadir UNA línea, y releer para confirmar. Nunca decir «no se escribió»
     sin releer: Google a veces escribe y luego contesta error. */
  async function escribir(item, linea, estado, msg){
    var id=item.dataset.id, nVisto=+item.dataset.n;
    if(window.CAIDO){ msg.className='bjMsg mal'; msg.textContent='El tablero no contesta ahora: no escribo contra una copia vieja.'; return false; }
    if(!(window.credencial&&credencial())){ msg.className='bjMsg mal'; msg.textContent='Entra con tu liga del Portero: sin ella no puedo escribir.'; return false; }
    item.querySelectorAll('button').forEach(function(b){ b.disabled=true; });
    msg.className='bjMsg'; msg.textContent='leyendo la tarjeta…';
    try{
      var f=await llamar('getAll',{}); if(!f||!f.ok) throw new Error('no pude releer el tablero');
      var act=(f.tasks||[]).filter(function(x){ return x.id===id; })[0];
      if(!act) throw new Error('esa tarjeta ya no está');
      var s=estadoDe(act);
      if(!s || s.n!==nVisto){ msg.className='bjMsg mal'; msg.textContent='Cambió mientras la mirabas (el Ejecutor pasó). Te enseño la versión nueva.'; await cargar(); return false; }
      var prev=String(act.comentarios||''), nueva='Alejandro~'+hoyLocal()+'~'+linea, patch={comentarios: prev?(prev+SEP+nueva):nueva};
      if(estado && estado!==act.estado){ patch.estado=estado; patch.historial=(act.historial?act.historial+'|':'')+hoyLocal()+' '+estado; if(estado==='Terminado') patch.fechaTerminado=hoyLocal(); }
      msg.textContent='escribiendo…';
      var w=null, err=null; try{ w=await llamar('update',{id:id,patch:patch}); }catch(x){ err=x; }
      var chk=await llamar('getAll',{}), t2=((chk&&chk.tasks)||[]).filter(function(x){ return x.id===id; })[0];
      var quedo=!!t2 && String(t2.comentarios||'').indexOf(linea)>=0;
      if(!quedo) throw new Error(err?err.message:(w&&w.error)||'al releer no lo veo escrito');
      return true;
    }catch(x){
      msg.className='bjMsg mal'; msg.textContent='No quedó: '+(window.enCristiano?enCristiano(x.message):x.message)+'. Releí el tablero y no está; puedes intentar otra vez.';
      item.querySelectorAll('button').forEach(function(b){ b.disabled=false; });
      return false;
    }
  }

  document.addEventListener('click', async function(ev){
    var b=ev.target&&ev.target.closest?ev.target.closest('[data-bj]'):null; if(!b) return;
    var item=b.closest('.bjItem'), msg=item.querySelector('.bjMsg'), accion=b.dataset.bj, ahora=new Date().toISOString();
    var r=(window.TAREAS||[]).filter(function(x){ return x.id===item.dataset.id; })[0]||{}, s=estadoDe(r)||{};
    if(accion==='pre'){
      /* Confirmación con un botón DISTINTO que aparece medio segundo después: un doble
         clic no puede aprobar sin leer a quién le sale. */
      var zona=item.querySelector('.bjB');
      zona.innerHTML='<div class="bjConf">Sale a <b>'+e(s.para||'(los destinatarios del borrador)')+'</b> tal como está en Gmail, en la próxima vuelta (≤ 1 h). Hasta entonces lo puedes cancelar.</div>'
        +'<button class="bjSi" data-bj="si" disabled>Sí, que salga</button><button data-bj="volver">No, espera</button>';
      setTimeout(function(){ var y=zona.querySelector('[data-bj=si]'); if(y) y.disabled=false; },600);
      return;
    }
    if(accion==='volver'){ pintarBandeja(); return; }
    if(accion==='si'){
      if(!item.dataset.draft){ msg.className='bjMsg mal'; msg.textContent='Esta tarjeta no dice qué borrador es: no la apruebo a ciegas.'; return; }
      if(await escribir(item,'BANDEJA APROBADO · draft='+item.dataset.draft+' · hora='+ahora,'En proceso',msg)) await cargar();
      return;
    }
    if(accion==='cancelar'){
      if(await escribir(item,'BANDEJA CANCELADO · hora='+ahora,'Pendiente',msg)) await cargar();
      return;
    }
    if(accion==='descartar'){
      if(b.dataset.ok!=='1'){ b.dataset.ok='1'; b.textContent='¿Seguro? Descartar'; setTimeout(function(){ b.dataset.ok=''; b.textContent='Descartar'; },4000); return; }
      if(await escribir(item,'BANDEJA DESCARTADO · hora='+ahora,'Terminado',msg)) await cargar();
      return;
    }
    if(accion==='cambio'){
      var zona2=item.querySelector('.bjB');
      zona2.innerHTML='<textarea class="bjTxt" id="bjTxt-'+e(item.dataset.id)+'" placeholder="Qué le cambio (puedes dictarlo)"></textarea>'
        +'<button data-mic="bjTxt-'+e(item.dataset.id)+'">🎙 Dictar</button><button class="bjSi" data-bj="cambioOk">Rehacerlo así</button><button data-bj="volver">Cancelar</button>';
      zona2.querySelector('textarea').focus(); return;
    }
    if(accion==='cambioOk'){
      var t=(item.querySelector('.bjTxt').value||'').replace(/\s+/g,' ').replace(/~|\|\|\|/g,'-').trim();
      if(!t){ msg.className='bjMsg mal'; msg.textContent='Escribe o dicta qué le cambio.'; return; }
      if(await escribir(item,'BANDEJA CAMBIO · hora='+ahora+' · '+t.slice(0,600),'Pendiente',msg)) await cargar();
    }
  });
})();
