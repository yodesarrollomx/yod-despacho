const {test}=require('node:test'),assert=require('node:assert/strict'),api=require('../bandeja-nube.js');
const id='11111111-1111-4111-8111-111111111111',H='a'.repeat(64),url='https://script.google.com/macros/s/ABCDEFGHIJKLMNOPQRSTUV/exec';
test('sólo la configuración explícita de nube usa el nuevo endpoint',()=>{
 assert.equal(api.allowed({bandeja_mode:'cloud',bandeja_exec_url:url}),true);
 for(const c of [{bandeja_mode:'legacy',bandeja_exec_url:url},{bandeja_mode:'cloud',bandeja_exec_url:'https://attacker.invalid/'},{}])assert.equal(api.allowed(c),false);
});
test('la solicitud conserva versión exacta y no confía en autor/correo del navegador',()=>{
 const row={id:'R1',comentarios:'versión original',correo:'forged@example.invalid'};
 const p=api.createRequest('approve',row,'d1',H,'SYNTHETIC',id);assert.equal(p.expected_comments,row.comentarios);
 assert.equal(p.k,'SYNTHETIC');assert.equal(p.huella,H);assert.equal('correo' in p,false);assert.equal('autor' in p,false);
});
test('el ACK relecto debe ser última firma de la misma tarjeta, borrador y huella',()=>{
 const receipt={cloud:true,requestId:id,action:'approve',rowId:'R1',draft:'d1',huella:H},row={id:'R1',comentarios:'Alejandro~F~BANDEJA APROBADO · draft=d1 · huella='+H+' · firma='+id};
 assert.equal(api.matches(row,receipt),true);
 for(const altered of [{...row,id:'R2'},{...row,comentarios:row.comentarios+'|||Alejandro~F~BANDEJA CANCELADO · hora=F'},{...row,comentarios:row.comentarios.replace('draft=d1','draft=d11')},{...row,comentarios:row.comentarios+' · huella='+H}])assert.equal(api.matches(altered,receipt),false);
});
