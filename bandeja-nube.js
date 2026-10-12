/* Ejecutor nube: aprobaciones ligadas a sesión real. La configuración decide el relevo. */
(function(root,factory){
 var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BandejaNube=api;
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 var configuration=null;
 function allowed(c){return !!c&&c.bandeja_mode==='cloud'&&/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,200}\/exec$/.test(c.bandeja_exec_url||'');}
 async function config(){
  if(typeof location==='object'&&location.hash==='#demo')return {bandeja_mode:'legacy'};
  if(!configuration)configuration=fetch('config.despacho.json?v=bandeja-cloud1',{credentials:'omit',cache:'no-store'}).then(function(r){if(!r.ok)throw Error('No pude leer la conexión del ejecutor.');return r.json();});
  return configuration;
 }
 function createRequest(action,row,draft,huella,key,requestId){
  if(['approve','cancel'].indexOf(action)<0||!row||typeof row.id!=='string'||!/^[0-9a-f-]{36}$/.test(requestId))throw Error('Solicitud inválida.');
  return {action:action,id:row.id,draft:draft||'',huella:huella||'',expected_comments:String(row.comentarios||''),request_id:requestId,k:key};
 }
 async function write(action,row,draft,huella,key){
  var c=await config();
  if(c.bandeja_mode!=='cloud'){if(huella)throw Error('La conexión de nube aún no está activada. Recarga al terminar el relevo.');return {cloud:false};}
  if(!allowed(c))throw Error('Falta comprobar la conexión de Bandeja en nube.');
  var id=crypto.randomUUID(),request=createRequest(action,row,draft,huella,key,id),controller=new AbortController(),timer=setTimeout(function(){controller.abort();},30000);
  var out={cloud:true,requestId:id,action:action,rowId:row.id,draft:draft||'',huella:huella||'',ok:false};
  try{
   var r=await fetch(c.bandeja_exec_url,{method:'POST',credentials:'omit',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(request),signal:controller.signal});
   if(!r.ok)throw Error('red');var result=await r.json();
   out.ok=!!result&&result.ok===true&&result.id===row.id;out.veto=!!result&&result.veto===true;
   out.error=out.ok?'':result&&result.error||'approval_unconfirmed';
  }catch(e){out.error='approval_unconfirmed';}finally{clearTimeout(timer);}
  return out; // never retry automatically; caller rereads the canonical row
 }
 function matches(row,receipt){
  if(!row||!receipt||!receipt.cloud)return false;
  var lines=String(row.comentarios||'').split('|||').filter(function(l){return /~BANDEJA /.test(l);}),last=lines[lines.length-1]||'';
  var text=last.split('~').slice(2).join('~'),parts=text.split(' · '),fields={},duplicate=false;
  parts.slice(1).forEach(function(s){var m=s.match(/^([a-z]+)=(.*)$/);if(m){if(Object.prototype.hasOwnProperty.call(fields,m[1]))duplicate=true;fields[m[1]]=m[2];}});
  return !duplicate&&row.id===receipt.rowId&&parts[0]==='BANDEJA '+(receipt.action==='approve'?'APROBADO':'CANCELADO')&&fields.firma===receipt.requestId&&
    (receipt.action==='cancel'||fields.draft===receipt.draft&&fields.huella===receipt.huella);
 }
 function message(code){
  return {owner_session_required:'Tu sesión de Dirección debe estar vigente: vuelve a entrar.',
   row_changed:'La tarjeta cambió: revisa la versión nueva.',draft_changed:'El borrador cambió: revisa la versión nueva.',
   executor_busy:'El ejecutor está atendiendo trabajo. Actualiza para comprobar el estado antes de intentar de nuevo.',
   bandeja_observing:'El ejecutor sigue en observación; falta completar el relevo.',
   recipient_mismatch:'Los destinatarios cambiaron: revisa el borrador.',
   already_sent:'Gmail ya confirmó el envío; una cancelación posterior no puede retirarlo.',
   send_outcome_uncertain:'Gmail tiene una respuesta pendiente de confirmar. Comprueba el envío antes de asegurar que se canceló.',
   approval_unconfirmed:'La respuesta no se pudo confirmar. Se releyó la tarjeta; comprueba su estado antes de volver a aprobar.'}[code]||'No se pudo confirmar esta acción.';
 }
 var lastRead=0,state=null;
 function paintState(){
  if(typeof document!=='object'||!state||document.body.getAttribute('aria-busy')==='true')return;
  var box=document.getElementById('latido');if(!box)return;
  var now=Date.now(),fresh=state.until&&now<=state.until;
  box.className='lat '+(fresh&&state.state==='ok'?'ok':'esp');
  box.textContent=fresh&&state.state==='ok'?'Ejecutor nube · revisión comprobada '+new Date(state.at).toLocaleTimeString('es-MX',{timeZone:'America/Hermosillo',hour:'2-digit',minute:'2-digit'}):
    fresh&&state.state==='fallo'?'Ejecutor nube · revisión con incidencia':'Ejecutor nube · revisión pendiente de comprobar';
 }
 async function refreshState(){
  try{
   var cfg=await config();if(!allowed(cfg))return;
   if(Date.now()-lastRead<60000){paintState();return;}lastRead=Date.now();
   var ctl=new AbortController(),timer=setTimeout(function(){ctl.abort();},15000);
   var response;
   try{response=await fetch('https://yod-cloud-room.onrender.com/horarios/estado.json',{credentials:'omit',cache:'no-store',signal:ctl.signal});if(!response.ok)throw Error('unavailable');response=await response.json();}
   finally{clearTimeout(timer);}
   var now=Date.now(),ids=['programador','gmail','tablero','ejecucion'],proof=[];
   if(response.schema!==1||response.source!=='render'||!Array.isArray(response.checks)||!/^h-[0-9a-f-]{36}$/.test(response.cycle_id||'')||
     Date.parse(response.generado_en)>now||now-Date.parse(response.generado_en)>12*60000)throw Error('unconfirmed');
   ids.forEach(function(id){var found=response.checks.filter(function(p){return p.id==='bandeja:'+id;});if(found.length!==1)throw Error('unconfirmed');proof.push(found[0]);});
   if(proof.some(function(p){var at=Date.parse(p.revisado_en),until=Date.parse(p.vence_en);return !isFinite(at)||!isFinite(until)||at>now||until<now||until<at||until-at>12*60000;}))throw Error('unconfirmed');
   state={state:proof.every(function(p){return p.estado==='ok';})?'ok':proof.some(function(p){return p.estado==='fallo';})?'fallo':'sin_confirmar',
     at:proof[0].revisado_en,until:Math.min.apply(null,proof.map(function(p){return Date.parse(p.vence_en);}))};paintState();
  }catch(e){state={state:'sin_confirmar',until:Date.now()+60000};paintState();}
 }
 return {allowed:allowed,createRequest:createRequest,write:write,matches:matches,message:message,refreshState:refreshState};
});
