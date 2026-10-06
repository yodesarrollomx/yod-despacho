const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');

test('scripts del Despacho y HTML conservan sintaxis y versión de chinche',()=>{
 for(const file of ['app.js','operacion.js','corcho.js'])new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
 for(const file of ['index.html','clasico.html','hilo.html']){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!/\bsrc=/.test(m[1]))new vm.Script(m[2],{filename:file});
  assert.match(html,/chinche\.js\?v=ch10-contexto/);
 }
});

// Regresiones del contrato real. No se reproduce la API compartida en un mock.
test('chinches privadas: tarjetas, control exacto y repintado sin acciones de negocio',{
 skip:!process.env.CHINCHE_SOURCE&&'Define CHINCHE_SOURCE para verificar el compartido real',timeout:240000
},async t=>{
 const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
 const source=fs.readFileSync(process.env.CHINCHE_SOURCE,'utf8');
 const now=new Date().toISOString(),date=new Date().toLocaleDateString('en-CA',{timeZone:'America/Hermosillo'});
 const secrets=['ID-PRIVADO','TITULO-PRIVADO','CUERPO-PRIVADO','NOTA-PRIVADA','FALTA-PRIVADA','CORREO-PRIVADO@example.invalid','BORRADOR-PRIVADO','TOKEN-PRIVADO','CLAVE-SINTETICA'];
 const ready=(id,extra,last)=>({id:'ID-PRIVADO-'+id,actividad:'TITULO-PRIVADO-'+id,proyecto:'Admin',responsable:'Alejandro',estado:'Pendiente',fecha:date,observaciones:'Resumen privado\n—— BORRADOR ——\nCUERPO-PRIVADO',comentarios:'Claude~'+date+'~BANDEJA LISTO · tipo=correo · draft=BORRADOR-PRIVADO · para=CORREO-PRIVADO@example.invalid · hora='+now+' · '+extra+(last?'|||Claude~'+date+'~BANDEJA '+last+' · hora='+now:'')});
 const tasks=[ready('alta','prio=alta'),ready('espera','prio=media'),ready('decision','tipo=decision · falta=FALTA-PRIVADA'),ready('hecha','prio=media','ENVIADO'),ready('aprobada','prio=alta','APROBADO'),ready('cambio','prio=alta','CAMBIO'),ready('error','prio=alta','ERROR'),ready('descartada','prio=media','DESCARTADO'),{id:'ID-PRIVADO-tarea',actividad:'TITULO-PRIVADO-tarea',proyecto:'Admin',responsable:'Alejandro',estado:'En proceso',fecha:date,observaciones:'CUERPO-PRIVADO'}];
 const note=(id,estado)=>({id:'N-'+id,titulo:'NOTA-PRIVADA',cuerpo:'CUERPO-PRIVADO',ejeX:'Eje privado',ejeY:'Eje privado',x:12,y:14,color:'arena',estado,createdAt:now,updatedAt:now});
 const corcho={version:3,data:{axes:{ejeX:'Personas',ejeY:'Pendientes'},notes:[note('archivo','archivado'),note('privada','activo')]}};
 const filas=[{id:'ID-PRIVADO-caso',tipo:'caso',estado:'abierta',titulo:'TITULO-PRIVADO',texto:'CUERPO-PRIVADO',fecha:now,opciones:'[{"k":"A","texto":"Opción sintética","recomendada":true}]'},{id:'ID-PRIVADO-movimiento',tipo:'movimiento',estado:'ejecutada',titulo:'TITULO-PRIVADO',texto:'CUERPO-PRIVADO',fecha:now}];
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  try{res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/javascript');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
 });
 let browser;
 t.after(async()=>{if(browser)await browser.close();await new Promise(ok=>server.close(ok));});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(30000);
 const errors=[],requests=[],forbidden=[],deliveries=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('pyod_clave_v1','CLAVE-SINTETICA'));
 const base='http://127.0.0.1:'+server.address().port;
 await page.route('**/*',async route=>{
  const req=route.request(),url=req.url();
  if(url.includes('/chinche.js'))return route.fulfill({body:source,contentType:'application/javascript'});
  if(url.startsWith(base+'/config.despacho.json'))return route.fulfill({json:{webhook_url:base+'/synthetic-backend'}});
  if(req.method()==='POST'){
   const p=req.postDataJSON();
   if(p.accion==='produccion'){deliveries.push(p);return route.fulfill({json:{ok:true}});}
   if(p.accion==='leer'||p.action==='leer')return route.fulfill({json:{ok:true,filas:[],rows:[],datos:[]}});
   requests.push(p.action);
   if(p.action==='getAll')return route.fulfill({json:{ok:true,tasks}});
   if(p.action==='corchoGet')return route.fulfill({json:{ok:true,...corcho}});
   if(p.action==='hilo_listar')return route.fulfill({json:{ok:true,filas}});
   forbidden.push(p.action);return route.abort();
  }
  if(url.startsWith(base+'/'))return route.continue();
  return route.abort();
 });
 async function records(){return page.evaluate(()=>new Promise((ok,fail)=>{
  const r=indexedDB.open('yodChinche',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction(['chinches','fotos'],'readonly'),a=tx.objectStore('chinches').getAll(),b=tx.objectStore('fotos').getAll();tx.oncomplete=()=>{ok({pins:a.result,photos:b.result});db.close();};};r.onerror=()=>fail(r.error);
 }));}
 async function assertCards(selector){
  const cards=page.locator(selector);assert.ok(await cards.count()>0,selector);
  const invalid=await cards.evaluateAll(els=>els.filter(el=>!el.hasAttribute('data-chinche-card')||el.dataset.chinchePrivado!=='true'||!/^\d{1,4}$/.test(el.dataset.chincheItem)||el.querySelectorAll('[data-chinche-abrir]').length!==1).length);
  assert.equal(invalid,0,selector);assert.equal(await page.locator('button button, a button').count(),0);
 }
 async function cancelPin(button){
  const before=(await records()).pins.length,n=requests.length,d=deliveries.length;
  await button.click();await page.locator('.chn-hoja textarea').waitFor();assert.equal(await page.locator('.chn-foto').count(),0);
  await page.locator('.chn-hoja [data-x]').click();await page.locator('.chn-hoja').waitFor({state:'detached'});
  assert.equal((await records()).pins.length,before);assert.equal(requests.length,n);assert.equal(deliveries.length,d);
 }
 async function savePin(trigger,surface,exact){
  const before=(await records()).pins.map(p=>p.id),n=requests.length;
  await trigger();await page.locator('.chn-hoja textarea').fill('Cambio humano sintético');
  assert.equal(await page.locator('.chn-foto').count(),0);
  await page.locator('.chn-hoja [data-ok]').click();await page.locator('.chn-hoja').waitFor({state:'detached'});
  const saved=await records(),pin=saved.pins.find(p=>!before.includes(p.id));assert.ok(pin);
  assert.deepEqual(Object.keys(pin.objeto).sort(),['tipo','superficie','ruta','tarjeta'].sort());assert.equal(pin.objeto.tipo,'interfaz-privada');assert.equal(pin.objeto.superficie,surface);
  assert.match(pin.objeto.ruta,/^[a-z][a-z0-9-]*:nth-of-type\([1-9]\d{0,3}\)( > [a-z][a-z0-9-]*:nth-of-type\([1-9]\d{0,3}\))*$/);
  assert.equal(await page.evaluate(({ruta,exact})=>{const el=document.querySelector(ruta);return !!el&&(exact?el.matches(exact):el.hasAttribute('data-chinche-card'));},{ruta:pin.objeto.ruta,exact}),true);
  assert.ok(pin.objeto.tarjeta===null||Number.isInteger(pin.objeto.tarjeta)&&pin.objeto.tarjeta>=0&&pin.objeto.tarjeta<=9999);
  for(const secret of secrets)assert.ok(!JSON.stringify(pin).includes(secret),secret);
  assert.equal(pin.folio,'');assert.equal(new URL(pin.url).search,'');assert.equal(new URL(pin.url).hash,'');assert.equal(saved.photos.length,0);assert.equal(requests.length,n);
  return pin;
 }
 await t.test('BANDEJA completa, tareas y focos tienen una chinche accesible',async()=>{
  await page.goto(base+'/index.html?token=TOKEN-PRIVADO');await page.locator('#cSi .card').first().waitFor();await page.waitForFunction(()=>!!window.YODChinche?.anotarElemento);
  await assertCards('#cSi .card,#cEsp article,#cSolo .card,#cHecho .hecho,#operacion .card,#operacion .pulso-item');
  assert.equal(await page.locator('#cSi .card').count(),4);assert.equal(await page.locator('#cSolo .card').count(),1);assert.equal(await page.locator('#cHecho .hecho').count(),2);
  for(const selector of ['#cSi','#cEsp','#cSolo','#cHecho','#operacion .card','#operacion .pulso']){
   const button=page.locator(selector+' [data-chinche-abrir]').first();await cancelPin(button);assert.equal(await page.locator('#hoja').isVisible(),false);
   await savePin(()=>button.click(),'despacho-trabajo');
  }
  if(process.env.EVIDENCE_DIR){fs.mkdirSync(process.env.EVIDENCE_DIR,{recursive:true});await page.locator('#cSi').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(process.env.EVIDENCE_DIR,'chinche-mi-trabajo-movil.png'),animations:'disabled'});}
  const button=page.locator('#cSi [data-chinche-abrir]').first();await button.focus();await savePin(()=>page.keyboard.press('Enter'),'despacho-trabajo');
 });
 await t.test('detalle y señalamiento exacto conservan la navegación y la confirmación de firma',async()=>{
  await page.locator('[data-tarea="ID-PRIVADO-tarea"]').click();await savePin(()=>page.locator('#hoja [data-chinche-abrir]').click(),'despacho-trabajo');assert.equal(await page.locator('#hoja').isVisible(),true);await page.locator('#hoja [data-a="cerrar"]').click();
  await page.locator('[data-abrir="ID-PRIVADO-alta"]').click();
  assert.equal(await page.evaluate(()=>{document.querySelector('#hoja [data-a="pre"]').click();return document.querySelector('#hoja [data-a="si"]').disabled;}),true);
  await savePin(()=>page.locator('#hoja [data-chinche-abrir]').click(),'despacho-trabajo');assert.ok(await page.locator('#hoja [data-a="si"]').count());
  await savePin(async()=>{await page.evaluate(()=>YODChinche.senalar());await page.locator('#hoja [data-a="si"]').click();},'despacho-trabajo','button[data-a="si"]');
  await page.locator('#hoja [data-a="cerrar"]').click();
  await savePin(async()=>{await page.evaluate(()=>YODChinche.senalar());await page.locator('[data-op-grupo="hoy"]').click();},'despacho-trabajo','button[data-op-grupo="hoy"]');
  await savePin(async()=>{await page.evaluate(()=>YODChinche.senalar());await page.locator('#verCorcho').click();},'despacho-trabajo','button#verCorcho');assert.equal(await page.locator('#trabajo').isVisible(),true);
  await page.locator('#refrescar').click();await page.waitForFunction(()=>document.body.getAttribute('aria-busy')==='false');await assertCards('#cSi .card,#cEsp article,#operacion .card');await cancelPin(page.locator('#cEsp [data-chinche-abrir]').first());
 });
 await t.test('Corcho activo, archivo y detalle privado; cancelar conserva el formulario',async()=>{
  await page.locator('#verCorcho').click();await page.locator('.postit').waitFor();await assertCards('.postit,.archivo-notas article');
  await cancelPin(page.locator('.postit [data-chinche-abrir]'));assert.equal(await page.locator('#corchoDialog').count(),0);
  await savePin(()=>page.locator('.archivo-notas [data-chinche-abrir]').click(),'despacho-corcho');
  await page.locator('.postit-open').click();await page.locator('#corchoPin').waitFor();assert.equal(await page.locator('#corchoDialog [data-chinche-abrir],#corchoDialog [data-chinche-personal]').count(),1);await page.locator('[name="cuerpo"]').fill('Edición privada sin guardar');await cancelPin(page.locator('#corchoPin'));assert.equal(await page.locator('[name="cuerpo"]').inputValue(),'Edición privada sin guardar');
  const visibleItem=Number(await page.locator('.postit').getAttribute('data-chinche-item'));
  assert.equal(Number(await page.locator('#corchoDialog').getAttribute('data-chinche-item')),visibleItem);
  const detailPin=await savePin(()=>page.locator('#corchoPin').click(),'despacho-corcho');assert.equal(detailPin.objeto.tarjeta,visibleItem);
  await savePin(async()=>{await page.evaluate(()=>YODChinche.senalar());await page.locator('[name="cuerpo"]').click();},'despacho-corcho','textarea[name="cuerpo"]');
  if(process.env.EVIDENCE_DIR){fs.mkdirSync(process.env.EVIDENCE_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.EVIDENCE_DIR,'chinche-corcho-detalle-movil.png'),animations:'disabled'});}
  await page.locator('#corchoClose').click();
  await page.locator('.archivo-nota').click();
  assert.equal(await page.locator('#corchoDialog').getAttribute('data-chinche-item'),await page.locator('.archivo-notas article').getAttribute('data-chinche-item'));
  await page.locator('#corchoClose').click();await page.locator('#corchoAxes').click();
  assert.equal(await page.locator('#corchoDialog').getAttribute('data-chinche-item'),null);
  const axesPin=await savePin(()=>page.locator('#corchoPin').click(),'despacho-corcho');assert.equal(axesPin.objeto.tarjeta,null);
  await page.locator('#corchoClose').click();await page.locator('#corchoRead').click();await page.locator('.postit').waitFor();await assertCards('.postit,.archivo-notas article');
 });
 await t.test('hilo carga chinche en casos y movimientos sin responder ni deshacer',async()=>{
  await page.goto(base+'/hilo.html?token=TOKEN-PRIVADO');await page.locator('#hilo .card').waitFor();await assertCards('#hilo .card,#hilo .mov');
  await cancelPin(page.locator('#hilo .card [data-chinche-abrir]'));assert.equal(await page.locator('[data-opt="A"]').isDisabled(),false);
  await savePin(()=>page.locator('#hilo .mov [data-chinche-abrir]').click(),'despacho-hilo');assert.equal(await page.locator('[data-deshacer]').isDisabled(),false);
  await page.evaluate(()=>pintarTodo());await assertCards('#hilo .card,#hilo .mov');
 });
 await t.test('clásico conserva abrir, sus firmas y focos, incluso tras repintar BANDEJA',async()=>{
  await page.goto(base+'/clasico.html?token=TOKEN-PRIVADO');await page.locator('.bjItem').first().waitFor();await page.locator('.pl-card').first().waitFor();
  await assertCards('.bjItem,.bjHecho,.pl-card,.foco');
  await cancelPin(page.locator('.pl-card [data-chinche-abrir]').first());assert.equal(await page.locator('#panelPend').isVisible(),false);
  await savePin(()=>page.locator('.bjItem [data-chinche-abrir]').first().click(),'despacho-trabajo');
  await page.locator('.plFila').first().click();await savePin(()=>page.locator('#panelPend .panelCaja > [data-chinche-abrir]').click(),'despacho-trabajo');assert.equal(await page.locator('#panelPend').isVisible(),true);
  await page.locator('#panelPend [data-atras]').click();await savePin(()=>page.locator('.foco [data-chinche-abrir]').first().click(),'despacho-trabajo');
  await page.evaluate(()=>{pintarBandeja();pintarPila();});await assertCards('.bjItem,.bjHecho,.pl-card');
  if(process.env.EVIDENCE_DIR)await page.screenshot({path:path.join(process.env.EVIDENCE_DIR,'chinche-clasico-movil.png'),animations:'disabled'});
 });
 for(const p of deliveries){for(const secret of secrets.filter(s=>s!=='CLAVE-SINTETICA'))assert.ok(!p.detalle.includes(secret),secret);}
 assert.deepEqual(forbidden,[]);assert.deepEqual(errors,[]);
});
