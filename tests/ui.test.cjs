const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const copy=x=>JSON.parse(JSON.stringify(x));
const fecha=new Date().toLocaleDateString('en-CA',{timeZone:'America/Hermosillo'});
const tasks=[{id:'S-1',actividad:'Entregable sintético vencido',responsable:'Persona de ejemplo',proyecto:'Proyecto de ejemplo',estado:'En proceso',fecha:'2026-01-01',archivada:'FALSE',borrada:'FALSE'},
 {id:'S-2',actividad:'Acordar fecha',estado:'Pendiente',fecha:''},
 {id:'S-3',actividad:'Oculta archivada',archivada:'TRUE'},
 {id:'S-4',actividad:'Oculta borrada',borrada:'TRUE'},
 {id:'S-5',actividad:'Borrador sintético',estado:'Pendiente',observaciones:'Resumen\n—— BORRADOR ——\nTexto para revisar, no enviar.',comentarios:'Claude~'+fecha+'~BANDEJA LISTO · tipo=correo · draft=r-test · para=ejemplo@example.invalid · chips=legal · hora='+new Date().toISOString()}];
test('Despacho recupera carga y conserva notas con CAS global, archivo y chinche',async t=>{
 const server=http.createServer((req,res)=>{let file=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(req.url==='/')file=path.join(root,'index.html');if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}try{res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/javascript');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true});
 t.after(async()=>{await browser.close();await new Promise(ok=>server.close(ok));});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const state={version:0,data:{axes:{ejeX:'Personas',ejeY:'Pendientes'},notes:[]}};
 let fail=false,delay=false,denied=false,conflict=false,noAck=false,saves=0,reads=0;
 const requests=[];
 await page.addInitScript(()=>localStorage.setItem('pyod_clave_v1','SYNTHETIC-KEY-NOT-A-CREDENTIAL'));
 await page.route('**/*',async route=>{
  const req=route.request(),url=req.url();
  if(url.startsWith('http://127.0.0.1:'))return route.continue();
  if(url.includes('/macros/s/')&&req.method()==='POST'){
   const p=req.postDataJSON();requests.push(copy(p));
   assert.equal(p.k,'SYNTHETIC-KEY-NOT-A-CREDENTIAL');
   if(p.action==='getAll'){reads++;if(fail)return route.abort();if(delay)await new Promise(ok=>setTimeout(ok,600));return route.fulfill({json:{ok:true,tasks}});}
   if(p.action==='corchoGet')return route.fulfill({json:denied?{ok:false,error:'acceso'}:{ok:true,...copy(state)}});
   if(p.action==='corchoSave'){
    saves++;assert.ok(!('id' in p)&&!('payload' in p));assert.deepEqual(Object.keys(p.data.axes).sort(),['ejeX','ejeY']);
    if(conflict)return route.fulfill({json:{ok:false,error:'conflicto',version:state.version+1}});
    if(noAck==='missing')return route.fulfill({json:{ok:true,version:state.version+1}});
    if(noAck==='malformed')return route.fulfill({json:{ok:true,version:state.version+1,data:{axes:p.data.axes,notes:[{}]}}});
    assert.equal(p.version,state.version);state.version++;const next=copy(p.data),now=new Date().toISOString();next.notes.forEach(n=>{const old=state.data.notes.find(x=>x.id===n.id);n.createdAt=old?old.createdAt:now;n.updatedAt=now;});state.data=next;
    return route.fulfill({json:{ok:true,...copy(state)}});
   }
   throw new Error('No se permiten otras escrituras en esta prueba: '+p.action);
  }
  if(url.includes('/chinche.js')){
   const src=process.env.CHINCHE_SOURCE?fs.readFileSync(process.env.CHINCHE_SOURCE,'utf8'):'window.YODChinche={init(){},anotar(op){window.PIN_CONTEXT=op;let d=document.createElement("div");d.className="chn-hoja";d.style="position:fixed;inset:10% 10%;background:white;z-index:4001";d.innerHTML="<textarea placeholder=Chinche></textarea><button id=cancelPin>Cancelar</button>";d.querySelector("button").onclick=()=>d.remove();document.body.appendChild(d);}};';
   return route.fulfill({body:src,contentType:'application/javascript'});
  }
  if(url.includes('/portero.js'))return route.fulfill({body:'',contentType:'application/javascript'});
  return route.abort();
 });
 const base='http://127.0.0.1:'+server.address().port+'/';
 await t.test('la operación sin BANDEJA aparece y las marcas FALSE no la ocultan',async()=>{
  await page.goto(base);await page.locator('[data-tarea="S-1"]').waitFor();
  assert.equal(await page.locator('[data-tarea="S-3"],[data-tarea="S-4"]').count(),0);
  assert.match(await page.locator('#op-sinfecha').textContent(),/Acordar fecha/);
  const before=reads;await page.locator('[data-op-grupo="vencidas"]').click();assert.equal(reads,before);assert.equal(page.url(),base);
  await page.locator('[data-tarea="S-1"]').click();assert.match(await page.locator('#hoja').textContent(),/Persona de ejemplo/);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#hoja').isVisible(),false);
  await page.locator('[data-abrir="S-5"]').click();assert.match(await page.locator('#hoja').textContent(),/Texto para revisar/);
  await page.locator('[data-a="cerrar"]').click();assert.equal(saves,0);
 });
 await t.test('red lenta visible, fallo explícito y reintento sin pantalla vacía engañosa',async()=>{
  delay=true;await page.locator('#refrescar').click();assert.match(await page.locator('#latido').textContent(),/Leyendo/);await page.waitForFunction(()=>document.body.getAttribute('aria-busy')==='false');delay=false;
  fail=true;await page.locator('#refrescar').click();await page.locator('#reint').waitFor();assert.match(await page.locator('#vacio').textContent(),/no pude leerla/);
  fail=false;await page.locator('#reint').click();await page.locator('[data-tarea="S-1"]').waitFor();
 });
 await t.test('crear y editar una nota conserva detalle, ejes y versión global',async()=>{
  await page.locator('#verCorcho').click();await page.locator('#corchoNew').waitFor();await page.waitForFunction(()=>!document.querySelector('#corchoNew').disabled);
  await page.locator('#corchoNew').click();await page.locator('[name="titulo"]').fill('Nota sintética');await page.locator('[name="cuerpo"]').fill('Detalle extenso con líneas.\nSegundo párrafo. <script>no ejecutar</script>');
  await page.locator('[name="ejeX"]').fill('Equipo');await page.locator('[name="ejeY"]').fill('En revisión');await page.locator('#corchoSave').click();await page.locator('.postit').waitFor();
  assert.equal(state.version,1);assert.equal(state.data.notes.length,1);
  await page.locator('.postit-open').click();assert.match(await page.locator('[name="cuerpo"]').inputValue(),/Segundo párrafo/);
  await page.locator('#corchoClose').click();await page.locator('#corchoAxes').click();await page.locator('[name="ejeX"]').fill('Personas del equipo');await page.locator('[name="ejeY"]').fill('Estado de trabajo');await page.locator('#corchoSave').click();await page.waitForFunction(()=>!document.querySelector('#corchoDialog').open);assert.equal(state.version,2);
  assert.equal(state.data.notes.length,1);assert.equal(state.data.axes.ejeX,'Personas del equipo');
 });
 await t.test('la nota se mueve dentro del lienzo incluso en el borde móvil',async()=>{
  await page.locator('.postit-open').click();await page.locator('[name="x"]').fill('88');await page.locator('[name="y"]').fill('88');await page.locator('#corchoSave').click();await page.waitForFunction(()=>!document.querySelector('#corchoDialog').open);
  const bounds=await page.evaluate(()=>{let g=document.querySelector('#corchoGrid').getBoundingClientRect(),n=document.querySelector('.postit').getBoundingClientRect();return {gr:g.right,gb:g.bottom,nr:n.right,nb:n.bottom};});assert.ok(bounds.nr<=bounds.gr+3&&bounds.nb<=bounds.gb+3);
  const handle=page.locator('.mover');await handle.scrollIntoViewIfNeeded();const box=await handle.boundingBox();await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();await page.mouse.move(box.x-20,box.y-20,{steps:6});await page.mouse.up();await page.waitForFunction(()=>document.querySelector('#corchoMsg').textContent.includes('confirmado'));assert.ok(state.data.notes[0].x<88);
 });
 await t.test('archivar y restaurar conserva ID y texto; recarga confirma persistencia simulada',async()=>{
  const id=state.data.notes[0].id;await page.locator('.postit-open').click();await page.locator('#corchoArchiveNote').click();await page.locator('.archivo-nota').waitFor();assert.equal(state.data.notes[0].estado,'archivado');assert.equal(await page.locator('.postit').count(),0);
  await page.reload();await page.locator('#verCorcho').click();await page.locator('.archivo-nota').waitFor();await page.locator('.archivo-nota').click();assert.match(await page.locator('[name="cuerpo"]').inputValue(),/Segundo párrafo/);await page.locator('#corchoArchiveNote').click();await page.locator('.postit').waitFor();assert.equal(state.data.notes[0].id,id);assert.equal(state.data.notes[0].estado,'activo');
 });
 await t.test('la chinche abre sobre el detalle y no adjunta el texto privado de la nota',async()=>{
  await page.locator('.postit-open').click();await page.locator('#corchoPin').click();await page.locator('.chn-hoja textarea').waitFor();
  const point=await page.locator('.chn-hoja textarea').boundingBox();const hit=await page.evaluate(({x,y})=>document.elementFromPoint(x,y).closest('.chn-hoja')!==null,{x:point.x+5,y:point.y+5});assert.equal(hit,true);
  if(!process.env.CHINCHE_SOURCE){const p=await page.evaluate(()=>window.PIN_CONTEXT);assert.ok(!JSON.stringify(p).includes('Segundo párrafo'));assert.equal(p.seccion,'Mi corcho · detalle');await page.locator('#cancelPin').click();}
  else await page.locator('.chn-hoja [data-x]').click();
  assert.equal(await page.locator('#corchoDialog').isVisible(),true);await page.locator('#corchoClose').click();
 });
 await t.test('conflicto y ACK incompleto conservan texto y no anuncian guardado',async()=>{
  await page.locator('.postit-open').click();await page.locator('[name="cuerpo"]').fill('Cambio sin guardar');const original=state.data.notes[0].cuerpo;conflict=true;await page.locator('#corchoSave').click();await page.waitForFunction(()=>document.querySelector('#corchoEditMsg').textContent.includes('otro equipo'));assert.equal(await page.locator('[name="cuerpo"]').inputValue(),'Cambio sin guardar');assert.equal(state.data.notes[0].cuerpo,original);
  conflict=false;for(const variant of ['missing','malformed']){noAck=variant;await page.locator('#corchoSave').click();await page.waitForFunction(()=>document.querySelector('#corchoEditMsg').textContent.includes('por conciliar'));assert.equal(await page.locator('#corchoDialog').isVisible(),true);assert.equal(await page.locator('[name="cuerpo"]').inputValue(),'Cambio sin guardar');assert.equal(state.data.notes[0].cuerpo,original);}noAck=false;await page.locator('#corchoClose').click();
 });
 await t.test('no propietario recibe un estado claro, sin notas ni escritura',async()=>{
  denied=true;const before=saves;await page.locator('#corchoRead').click();await page.waitForFunction(()=>document.querySelector('#corchoMsg').textContent.includes('propietario'));assert.equal(await page.locator('.postit,.archivo-nota').count(),0);assert.equal(await page.locator('#corchoNew').isDisabled(),true);assert.equal(saves,before);
 });
 if(process.env.EVIDENCE_DIR){fs.mkdirSync(process.env.EVIDENCE_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.EVIDENCE_DIR,'despacho-espera-movil.png'),fullPage:true});denied=false;await page.locator('#corchoRead').click();await page.locator('.postit').waitFor();await page.screenshot({path:path.join(process.env.EVIDENCE_DIR,'corcho-movil.png'),fullPage:true});await page.setViewportSize({width:1200,height:900});await page.screenshot({path:path.join(process.env.EVIDENCE_DIR,'corcho-escritorio.png'),fullPage:true});}
 assert.deepEqual(errors,[]);assert.ok(reads>=3);assert.ok(saves>=6);
 assert.ok(requests.every(p=>['getAll','corchoGet','corchoSave'].includes(p.action)));
});
