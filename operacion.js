/* Reglas de lectura del Sheet. No modifica tareas ni inventa fechas. */
(function(root){
'use strict';
var MESES={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,setiembre:9,octubre:10,noviembre:11,diciembre:12};
function normal(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();}
function flag(v){return v===true||String(v).toUpperCase()==='TRUE';}
function dia(y,m,d){
  var t=new Date(Date.UTC(y,m-1,d));
  return t.getUTCFullYear()===y&&t.getUTCMonth()===m-1&&t.getUTCDate()===d?t.toISOString().slice(0,10):null;
}
function fecha(r,hoy){
  var f=String(r.fecha||'').trim(), n=normal(f), m, y=Number(hoy.slice(0,4));
  if(!f)return {dia:null,origen:'Sin fecha'};
  m=f.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if(m)return {dia:dia(+m[1],+m[2],+m[3]),origen:'Fecha indicada'};
  m=f.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m)return {dia:dia(+m[3],+m[2],+m[1]),origen:'Fecha indicada'};
  var mes=MESES[normal(r.mes)];
  m=n.match(/^fin de (mes|[a-z]+)$/);
  if(m){var k=m[1]==='mes'?mes:MESES[m[1]];if(k)return {dia:dia(y,k,new Date(Date.UTC(y,k,0)).getUTCDate()),origen:'Fin de mes · año actual'};}
  if(/^(esta semana|este sem|esta sem)$/.test(n)){
    var w=String(r.semana||'').match(/^(?:Semana\s*)?(\d{1,2})$/i);
    if(w&&+w[1]>=1&&+w[1]<=53){var t=new Date(Date.UTC(y,0,4));t.setUTCDate(t.getUTCDate()-(t.getUTCDay()||7)+1+(+w[1]-1)*7+4);return {dia:t.toISOString().slice(0,10),origen:'Viernes de '+r.semana+' · año actual'};}
  }
  m=n.match(/^(?:lunes|martes|miercoles|jueves|viernes|sabado|domingo)?\s*(\d{1,2})$/);
  if(m&&mes)return {dia:dia(y,mes,+m[1]),origen:'Día y mes del Sheet · año actual'};
  return {dia:null,origen:'Fecha por aclarar: '+f};
}
function abiertas(rows,hoy){
  return rows.filter(function(r){return !flag(r.borrada)&&!flag(r.archivada)&&normal(r.estado)!=='terminado';}).map(function(r){
    var f=fecha(r,hoy),dias=f.dia?Math.round((Date.parse(hoy+'T00:00:00Z')-Date.parse(f.dia+'T00:00:00Z'))/86400000):null;
    return {r:r,fecha:f,dias:dias,grupo:dias===null?'sinfecha':dias>0?'vencidas':dias===0?'hoy':'proximas'};
  }).sort(function(a,b){return (b.dias===null?-Infinity:b.dias)-(a.dias===null?-Infinity:a.dias)||String(a.r.id).localeCompare(String(b.r.id));});
}
var api={fecha:fecha,abiertas:abiertas,flag:flag};
if(typeof module==='object'&&module.exports)module.exports=api;else root.DespachoOperacion=api;
})(typeof window==='object'?window:globalThis);
