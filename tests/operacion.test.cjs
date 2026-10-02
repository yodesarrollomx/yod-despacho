const {test}=require('node:test');
const assert=require('node:assert/strict');
const {fecha,abiertas}=require('../operacion.js');
const hoy='2026-10-01';
test('la fecha vacía o ambigua no genera una vencida',()=>{
  assert.equal(fecha({fecha:'',semana:'Semana 38',mes:'Septiembre'},hoy).dia,null);
  assert.equal(fecha({fecha:'en unos días',mes:'Septiembre'},hoy).dia,null);
  assert.equal(fecha({fecha:'entregar después del 15',mes:'Septiembre'},hoy).dia,null);
});
test('los días imposibles se rechazan en lugar de correrse al mes siguiente',()=>{
  assert.equal(fecha({fecha:'2026-02-30'},hoy).dia,null);
  assert.equal(fecha({fecha:'31/09/2026'},hoy).dia,null);
  assert.equal(fecha({fecha:'Lunes 31',mes:'Septiembre'},hoy).dia,null);
});
test('interpreta los formatos del Sheet con procedencia visible',()=>{
  assert.equal(fecha({fecha:'Lunes 14',mes:'Septiembre'},hoy).dia,'2026-09-14');
  assert.equal(fecha({fecha:'15/09/2026'},hoy).dia,'2026-09-15');
  assert.equal(fecha({fecha:'esta semana',semana:'Semana 38'},hoy).dia,'2026-09-18');
  assert.equal(fecha({fecha:'fin de mes',mes:'Febrero'},hoy).dia,'2026-02-28');
});
test('FALSE no oculta tareas; archivo y borrado TRUE sí las ocultan',()=>{
  const rows=[{id:'1',fecha:'2026-09-28',estado:'En proceso',archivada:'FALSE',borrada:'FALSE'},
    {id:'2',archivada:'TRUE'},{id:'3',borrada:true},{id:'4',estado:'Terminado'},{id:'5',fecha:'',estado:'Pendiente'}];
  const a=abiertas(rows,hoy);assert.deepEqual(a.map(x=>x.r.id),['1','5']);
  assert.equal(a[0].dias,3);assert.equal(a[0].grupo,'vencidas');assert.equal(a[1].grupo,'sinfecha');
});
test('hoy y próxima se clasifican sin dependencia de la zona horaria del dispositivo',()=>{
  const a=abiertas([{id:'h',fecha:hoy},{id:'p',fecha:'2026-10-02'}],hoy);
  assert.equal(a[0].grupo,'hoy');assert.equal(a[1].grupo,'proximas');
});
