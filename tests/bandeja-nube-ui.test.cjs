const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),clone=x=>JSON.parse(JSON.stringify(x)),H='a'.repeat(64),endpoint='https://script.google.com/macros/s/ABCDEFGHIJKLMNOPQRSTUV/exec';
for(const width of [390,1200])test('aprobación nube y cancelación con respuesta perdida · '+width,async t=>{
 const row={id:'R1',actividad:'Correo sintético',proyecto:'Ejemplo',responsable:'Dirección',estado:'Pendiente',observaciones:'Resumen\\n—— BORRADOR ——\\nTexto para revisar.',borrada:'FALSE',archivada:'FALSE',
 comentarios:'YOD nube~2026-10-11~BANDEJA LISTO · tipo=correo · draft=d1 · huella='+H+' · para=recipient@example.invalid · hora='+new Date().toISOString()};
 const server=http.createServer((req,res)=>{const p=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!p.startsWith(root+path.sep)){res.writeHead(403);return res.end();}try{res.setHeader('Content-Type',p.endsWith('.html')?'text/html':p.endsWith('.json')?'application/json':'application/javascript');res.end(fs.readFileSync(p));}catch{res.writeHead(404);res.end();}});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const browser=await chromium.launch({headless:true});t.after(async()=>{await browser.close();await new Promise(ok=>server.close(ok));});
 const page=await browser.newPage({viewport:{width,height:844}});let approvals=0,cancels=0,oldUpdates=0;
 await page.addInitScript(()=>localStorage.setItem('pyod_clave_v1','SYNTHETIC'));
 await page.route('**/*',async route=>{
  const r=route.request(),url=r.url();
  if(url.startsWith('http://127.0.0.1:')){
   if(url.includes('/config.despacho.json'))return route.fulfill({json:{bandeja_mode:'cloud',bandeja_exec_url:endpoint}});
   return route.continue();
  }
  if(r.method()==='POST'&&url.includes('/macros/s/')){
   const p=r.postDataJSON();assert.equal(p.k,'SYNTHETIC');
   if(url===endpoint){
    assert.equal(p.id,row.id);assert.equal(p.expected_comments,row.comentarios);assert.equal(p.huella,H);
    if(p.action==='approve'){approvals++;assert.equal(p.draft,'d1');row.comentarios+='|||Alejandro~2026-10-11~BANDEJA APROBADO · draft=d1 · huella='+H+' · firma='+p.request_id+' · hora='+new Date().toISOString();}
    else{assert.equal(p.action,'cancel');cancels++;row.comentarios+='|||Alejandro~2026-10-11~BANDEJA CANCELADO · firma='+p.request_id+' · hora='+new Date().toISOString();}
    return route.abort(); // Google changed the row; transport response was lost
   }
   if(p.action==='getAll')return route.fulfill({json:{ok:true,tasks:[clone(row)]}});
   if(p.action==='update'){oldUpdates++;throw Error('No se aprueba por el backend antiguo');}
   return route.fulfill({json:{ok:false,error:'unsupported'}});
  }
  return route.abort();
 });
 await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.locator('[data-abrir=R1]').click();
 await page.locator('[data-a=pre]').click();assert.equal(approvals,0);assert.equal(await page.locator('[data-a=si]').isDisabled(),true);
 await page.locator('[data-a=si]').click();await page.waitForFunction(()=>/Aprobado/.test(document.querySelector('#hoja').textContent));
 assert.equal(approvals,1);assert.equal(oldUpdates,0);
 await page.locator('[data-a=cancelar]').waitFor();await page.locator('[data-a=cancelar]').click();
 await page.waitForFunction(()=>document.querySelector('#hojaMsg').textContent.includes('Cancelado'));
 assert.equal(cancels,1);assert.equal(approvals,1);assert.equal(oldUpdates,0);assert.equal(row.estado,'Pendiente');
});
