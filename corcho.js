/* Corcho privado. El servidor decide acceso y versiones; sin copia local persistente. */
(function(){
'use strict';
var DEMO=location.hash==='#demo',loaded=false,busy=false,notes=[],config=null,editing=null,drag=null,version=0,data=null,demoState=null;
var q=function(s){return document.querySelector(s);};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function clamp(v){return Math.max(0,Math.min(88,Number(v)||0));}
function message(t,error){var m=q('#corchoMsg');if(m){m.textContent=t;m.className='msg'+(error?' mal':'');}}
function note(id){return notes.find(function(n){return n.id===id;});}
function view(corcho){q('#trabajo').hidden=corcho;q('#corcho').hidden=!corcho;document.body.classList.toggle('corchoVista',corcho);q('#verTrabajo').setAttribute('aria-pressed',String(!corcho));q('#verCorcho').setAttribute('aria-pressed',String(corcho));if(corcho&&!loaded)load();else if(corcho)place();}
async function call(action,p){
  if(!DEMO)return window.DESPACHO.llamar(action,p);
  if(!demoState)demoState={ok:true,version:0,data:{axes:{ejeX:'Personas',ejeY:'Pendientes'},notes:[{id:'N-demo',titulo:'Revisar el entregable',cuerpo:'Una nota de ejemplo. Puedes moverla, editarla y archivarla.',ejeX:'Equipo',ejeY:'Esta semana',x:20,y:18,color:'arena',estado:'activo',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}]}};
  if(action==='corchoGet')return JSON.parse(JSON.stringify(demoState));
  if(p.version!==demoState.version)return {ok:false,error:'conflicto',version:demoState.version};
  var demoData=JSON.parse(JSON.stringify(p.data)),now=new Date().toISOString();demoData.notes.forEach(function(n){var old=demoState.data.notes.find(function(x){return x.id===n.id;});n.createdAt=old?old.createdAt:now;n.updatedAt=now;});
  demoState={ok:true,version:p.version+1,data:demoData};
  return JSON.parse(JSON.stringify(demoState));
}
function validData(d){
  function text(s,max,required){return typeof s==='string'&&s.length<=max&&(!required||!!s.trim());}
  if(!d||!d.axes||!text(d.axes.ejeX,100,true)||!text(d.axes.ejeY,100,true)||!Array.isArray(d.notes)||d.notes.length>500)return false;
  var seen={};return d.notes.every(function(n){if(!n||typeof n.id!=='string'||!/^N-[A-Za-z0-9-]{1,96}$/.test(n.id)||seen[n.id])return false;seen[n.id]=true;return text(n.titulo,160,true)&&text(n.cuerpo,12000,false)&&text(n.ejeX,100,false)&&text(n.ejeY,100,false)&&typeof n.x==='number'&&isFinite(n.x)&&n.x>=0&&n.x<=88&&typeof n.y==='number'&&isFinite(n.y)&&n.y>=0&&n.y<=88&&['arena','rosa','verde','azul','lila'].includes(n.color)&&['activo','archivado'].includes(n.estado)&&typeof n.createdAt==='string'&&!isNaN(Date.parse(n.createdAt))&&typeof n.updatedAt==='string'&&!isNaN(Date.parse(n.updatedAt));});
}
function adopt(j){
  if(!j||!Number.isSafeInteger(j.version)||j.version<0||!validData(j.data))throw new Error('El corcho todavía no está disponible. Puedes seguir usando Mi trabajo.');
  version=j.version;data=JSON.parse(JSON.stringify(j.data));
  config={id:'@config',version:version,payload:{ejeX:data.axes.ejeX,ejeY:data.axes.ejeY}};
  notes=data.notes.map(function(p){return {id:p.id,version:version,payload:p};});
}
function shell(){
  q('#corcho').innerHTML='<h2 class="seccion">Mi corcho</h2><p class="ayuda">Tus notas, tus ejes. Al terminar, ensártalas en el archivo para volver a ellas.</p>'
    +(DEMO?'<p class="ayuda">Ejemplo: los cambios se pierden al salir.</p>':'')
    +'<div class="corcho-tools"><button id="corchoNew" disabled>+ Nota</button><button id="corchoAxes" disabled>Cambiar ejes</button><button id="corchoRead">Actualizar corcho</button></div>'
    +'<div id="corchoMsg" class="msg" role="status" aria-live="polite">Leyendo tu corcho…</div><div id="corchoBoard"></div><section id="corchoArchive"></section>';
}
async function load(){
  if(busy)return;busy=true;loaded=false;shell();
  try{
    var j=await call('corchoGet',{});
    if(!j||j.ok!==true)throw new Error(j&&j.error==='acceso'?'Este corcho es privado del propietario.':j&&j.error==='clave'?'Vuelve a entrar con tu liga del Portero.':'No pude leer tu corcho.');
    adopt(j);loaded=true;paint();message('Corcho actualizado'+(DEMO?' · ejemplo sin guardar.':'.'));
  }catch(e){message(e.message+' Usa Actualizar corcho para reintentar.',true);}
  finally{busy=false;enable();}
}
function enable(){q('#corchoNew').disabled=!loaded||busy;q('#corchoAxes').disabled=!loaded||busy;q('#corchoRead').disabled=busy;}
function paint(){
  var active=notes.filter(function(n){return n.payload.estado!=='archivado';}),arch=notes.filter(function(n){return n.payload.estado==='archivado';});
  q('#corchoBoard').innerHTML='<div class="axis-x">'+esc(config.payload.ejeX||'Eje X')+' →</div><div class="axis-y">'+esc(config.payload.ejeY||'Eje Y')+' ↑</div><div class="corcho-grid" id="corchoGrid">'
    +active.map(function(n){var p=n.payload,c=['arena','rosa','verde','azul','lila'].includes(p.color)?p.color:'arena';return '<article class="postit '+c+'" data-nota="'+esc(n.id)+'" style="left:'+clamp(p.x)+'%;top:'+clamp(p.y)+'%"><button class="mover" data-mover="'+esc(n.id)+'" aria-label="Mover '+esc(p.titulo)+'">⠿ Mover</button><button class="postit-open" data-nota-abrir="'+esc(n.id)+'"><strong>'+esc(p.titulo)+'</strong><span>'+esc(p.cuerpo||'Abrir detalle')+'</span><small>'+esc([p.ejeX,p.ejeY].filter(Boolean).join(' · '))+'</small></button></article>';}).join('')
    +(!active.length?'<p class="corcho-empty">Tu corcho está libre. Añade tu primera nota.</p>':'')+'</div>';
  q('#corchoArchive').innerHTML='<h3 class="seccion">📎 Clavo de comandas · '+arch.length+'</h3><p class="ayuda">Terminadas, conservadas. Toca una para leerla o devolverla al corcho.</p><div class="archivo-notas">'
    +arch.sort(function(a,b){return String(b.payload.updatedAt||'').localeCompare(String(a.payload.updatedAt||''));}).map(function(n){return '<button class="archivo-nota" data-nota-abrir="'+esc(n.id)+'"><strong>'+esc(n.payload.titulo)+'</strong><span>'+esc(n.payload.ejeX||'')+'</span></button>';}).join('')+'</div>';
  place();
}
function place(){var grid=q('#corchoGrid');if(!grid||drag)return;grid.querySelectorAll('.postit').forEach(function(el){var n=note(el.dataset.nota);if(!n)return;el.style.left=Math.max(0,grid.clientWidth-el.offsetWidth)*clamp(n.payload.x)/88+'px';el.style.top=Math.max(0,grid.clientHeight-el.offsetHeight)*clamp(n.payload.y)/88+'px';});}
function dialog(record){
  editing=record;var axes=record.id==='@config',p=record.payload;
  var el=q('#corchoDialog');if(!el){el=document.createElement('dialog');el.id='corchoDialog';el.setAttribute('aria-modal','true');document.body.appendChild(el);var back=document.createElement('div');back.id='corchoBackdrop';back.hidden=true;document.body.appendChild(back);}
  el.innerHTML='<form id="corchoForm"><button type="button" class="cerrar" id="corchoClose" aria-label="Cerrar nota">✕</button><h2>'+esc(axes?'Mis ejes':p.estado==='archivado'?'Comanda archivada':'Mi nota')+'</h2>'
    +(axes?'<label>Eje horizontal<input name="ejeX" required maxlength="100" value="'+esc(p.ejeX||'')+'"></label><label>Eje vertical<input name="ejeY" required maxlength="100" value="'+esc(p.ejeY||'')+'"></label>':
      '<label>Título<input name="titulo" required maxlength="160" value="'+esc(p.titulo||'')+'"></label><label>Detalle<textarea name="cuerpo" maxlength="12000">'+esc(p.cuerpo||'')+'</textarea></label>'
      +'<div class="corcho-fields"><label>'+esc(config.payload.ejeX||'Eje X')+'<input name="ejeX" maxlength="100" value="'+esc(p.ejeX||'')+'"></label><label>'+esc(config.payload.ejeY||'Eje Y')+'<input name="ejeY" maxlength="100" value="'+esc(p.ejeY||'')+'"></label></div>'
      +'<div class="corcho-fields"><label>Posición horizontal<input name="x" type="range" min="0" max="88" value="'+clamp(p.x)+'"></label><label>Posición vertical<input name="y" type="range" min="0" max="88" value="'+clamp(p.y)+'"></label></div>'
      +'<label>Color<select name="color">'+['arena','rosa','verde','azul','lila'].map(function(c){return '<option '+(p.color===c?'selected ':'')+'value="'+c+'">'+c+'</option>';}).join('')+'</select></label>')
    +'<div id="corchoEditMsg" class="msg" role="status" aria-live="polite"></div><div class="acc"><button type="submit" class="si" id="corchoSave">Guardar'+(DEMO?' en el ejemplo':'')+'</button>'
    +(!axes&&record.version>0?'<button type="button" id="corchoArchiveNote">'+(p.estado==='archivado'?'Volver al corcho':'Terminar y archivar')+'</button>':'')+'</div></form>';
  el.querySelector('.acc').insertAdjacentHTML('beforeend','<button type="button" id="corchoPin">📌 Pedir un cambio aquí</button>');
  el.show();q('#corchoBackdrop').hidden=false;q('main').inert=true;document.body.classList.add('corchoAbierto');el.querySelector('input').focus();
}
function close(){if(busy)return;var el=q('#corchoDialog');if(el&&el.open)el.close();if(q('#corchoBackdrop'))q('#corchoBackdrop').hidden=true;q('main').inert=false;document.body.classList.remove('corchoAbierto');editing=null;q('#corchoNew').focus();}
async function save(record,payload){
  if(busy)return false;busy=true;enable();
  var msg=q('#corchoEditMsg'),buttons=document.querySelectorAll('#corchoDialog button');buttons.forEach(function(b){b.disabled=true;});if(msg)msg.textContent='Guardando…';else message('Guardando posición…');
  try{
    var candidate=JSON.parse(JSON.stringify(data));
    if(record.id==='@config')candidate.axes={ejeX:payload.ejeX,ejeY:payload.ejeY};
    else{var index=candidate.notes.findIndex(function(n){return n.id===record.id;}),newNote=Object.assign({},payload,{id:record.id});if(index<0)candidate.notes.push(newNote);else candidate.notes[index]=newNote;}
    var expected=version,j=await call('corchoSave',{version:expected,data:candidate});
    if(!j||j.ok!==true){if(j&&j.error==='conflicto')throw new Error('Esta nota cambió en otro equipo. Tu texto sigue aquí: cópialo antes de cerrar y actualizar el corcho.');throw new Error('No se confirmó el guardado. Conservé tu texto; puedes reintentar.');}
    if(!Number.isSafeInteger(j.version)||j.version<=expected||!validData(j.data))throw new Error('Guardado por conciliar: falta una versión y datos válidos del servidor. Conservé tu texto; actualiza el corcho antes de reintentar.');
    // Solo el snapshot confirmado del servidor puede sustituir los datos leídos.
    adopt(j);
    paint();message(DEMO?'Cambio aplicado al ejemplo; no se guardó.':'Guardado y confirmado.');return true;
  }catch(e){if(msg)msg.textContent=e.message;else message(e.message,true);paint();return false;}
  finally{busy=false;buttons.forEach(function(b){b.disabled=false;});enable();}
}
function formPayload(){var f=q('#corchoForm'),d=new FormData(f),p=Object.assign({},editing.payload);if(editing.id==='@config')return {ejeX:String(d.get('ejeX')||'').trim(),ejeY:String(d.get('ejeY')||'').trim()};['titulo','cuerpo','ejeX','ejeY','color'].forEach(function(k){p[k]=String(d.get(k)||'');});p.titulo=p.titulo.trim();p.x=clamp(d.get('x'));p.y=clamp(d.get('y'));return p;}
document.addEventListener('click',async function(e){
  if(e.target.id==='corchoBackdrop')return close();
  var t=e.target.closest('button');if(!t)return;
  if(t.id==='verTrabajo')return view(false);if(t.id==='verCorcho')return view(true);
  if(t.id==='corchoRead')return load();
  if(t.id==='corchoNew'&&!busy){var id='N-'+(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2));return dialog({id:id,version:0,payload:{titulo:'',cuerpo:'',ejeX:'',ejeY:'',x:12,y:12,color:'arena',estado:'activo'}});}
  if(t.id==='corchoAxes'&&!busy)return dialog(config);
  if(t.dataset.notaAbrir&&!busy)return dialog(note(t.dataset.notaAbrir));
  if(t.id==='corchoClose')return close();
  if(t.id==='corchoPin'&&!busy&&editing){
    if(!window.YODChinche||!window.YODChinche.anotar){q('#corchoEditMsg').textContent='La chinche no cargó. Recarga la página y vuelve a intentar.';return;}
    // Contexto técnico mínimo: no adjuntar el contenido privado de la nota a un encargo público.
    window.YODChinche.anotar({seccion:'Mi corcho · detalle',css:'#corchoDialog',texto:'Detalle de nota privada',valores:{notaId:editing.id,version:version}});return;
  }
  if(t.id==='corchoArchiveNote'&&!busy&&editing){if(!q('#corchoForm').reportValidity())return;var p=formPayload();p.estado=p.estado==='archivado'?'activo':'archivado';if(await save(editing,p))close();}
});
document.addEventListener('submit',async function(e){if(e.target.id!=='corchoForm')return;e.preventDefault();if(!editing||busy)return;if(await save(editing,formPayload()))close();});
document.addEventListener('cancel',function(e){if(e.target.id==='corchoDialog'){e.preventDefault();close();}},true);
document.addEventListener('keydown',function(e){var el=q('#corchoDialog');if(!el||!el.open||e.target.closest('[class*="chn-"]'))return;if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){var fs=Array.from(el.querySelectorAll('button,input,textarea,select')).filter(function(x){return !x.disabled;}),first=fs[0],last=fs[fs.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
document.addEventListener('pointerdown',function(e){
  var h=e.target.closest('[data-mover]');if(!h||busy||e.button!==0)return;var n=note(h.dataset.mover),grid=q('#corchoGrid');if(!n||!grid)return;
  var el=h.closest('.postit'),box={width:Math.max(1,grid.clientWidth-el.offsetWidth),height:Math.max(1,grid.clientHeight-el.offsetHeight)};drag={record:n,handle:h,node:el,box:box,sx:e.clientX,sy:e.clientY,x:clamp(n.payload.x),y:clamp(n.payload.y),moved:false};h.setPointerCapture(e.pointerId);e.preventDefault();
});
document.addEventListener('pointermove',function(e){if(!drag)return;var dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;drag.moved=drag.moved||Math.abs(dx)+Math.abs(dy)>5;drag.nx=clamp(drag.x+dx/drag.box.width*88);drag.ny=clamp(drag.y+dy/drag.box.height*88);drag.node.style.left=drag.box.width*drag.nx/88+'px';drag.node.style.top=drag.box.height*drag.ny/88+'px';});
document.addEventListener('pointerup',async function(){if(!drag)return;var d=drag;drag=null;if(d.moved)await save(d.record,Object.assign({},d.record.payload,{x:d.nx,y:d.ny}));});
document.addEventListener('pointercancel',function(){drag=null;if(loaded)paint();});
shell();
window.addEventListener('resize',place);
})();
