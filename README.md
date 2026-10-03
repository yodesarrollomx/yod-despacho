# El Despacho · YOD OS

La pantalla de trabajo de Dirección reúne la Bandeja del Ejecutor, las tareas abiertas de
la operación y un Corcho privado. Las tareas ordinarias se ven aunque no tengan un borrador
BANDEJA; se agrupan en vencidas, hoy, próximas y sin fecha confirmada. El tablero previo
sigue disponible en `clasico.html`.

**Mecánica: la misma que los demás tableros.**

| Pieza | Qué hace |
|---|---|
| `portero.js` | decide quién entra (código `DP`); deja la credencial en `pyod_clave_v1` |
| `shell.js` | pinta el menú lateral de YOD OS |
| Apps Script del board-aurum | lee (`getAll`) y escribe (`update`) el Sheet de tareas |
| Sheet del board-aurum | **el único almacén.** Aquí no se guarda nada aparte |
| Corcho del mismo backend | ejes y notas privadas del propietario; versión global para evitar sobrescribir desde otro equipo |

No hay base propia ni copia local persistente. Lo que se firma se escribe en la misma
tarjeta del tablero de siempre, con la sesión del Portero del propio usuario — igual que
cuando él edita desde el board.

## Lo que calcula en el navegador

- **La fecha real.** El Sheet guarda `fecha` como «Lunes 24» y el mes en otra columna; aquí se
  reconstruye, y cuando la celda solo dice «esta semana» se ancla al viernes de esa semana ISO.
  Una celda vacía **no se inventa**.
- **El carril** de cada tarjeta y la disolución del proyecto «Decisiones» hacia su tema real.
- **La matrícula** `EMPRESA-SUJETO-TIPO+NÚMERO-META-QUIÉN` (ver `CODIGOS-BOARDS.md` de yod-portal).
- **Los ocho focos** de revisión, al pie.

## Corcho privado

`corchoGet` devuelve `{ok,version,data:{axes:{ejeX,ejeY},notes}}` y `corchoSave` recibe
`{k,version,data}`. La versión es global, nunca una versión por nota. El backend valida la
identidad real del propietario y el permiso DP; el navegador no decide quién puede entrar.
Las notas no se incluyen en `getAll`. El Corcho permite mover notas, editar su detalle,
cambiar ejes y archivar/restaurar sin borrar. Los conflictos conservan el texto del editor.
La chinche del detalle recibe contexto técnico mínimo, sin adjuntar el contenido privado.

Las tareas usan el backend de Operación existente. Provisionalmente, únicamente
`corchoGet` y `corchoSave` usan la implementación existente del Portero. Allí se valida
la sesión directamente, sin renovar sesiones ni utilizar una caché para autorizar.
La configuración de propietario y almacén se instala de forma privada y falla cerrada
si falta. No se añaden scopes ni permisos; el libro y todos sus ancestros deben ser
privados del propietario efectivo. La integración en Git no demuestra despliegue ni persistencia.
Si falta el servicio, la interfaz lo informa y permite seguir en Mi trabajo. `#demo` nunca
guarda en el Sheet y sus cambios se pierden al salir.

Cuando se identifique el proyecto editable de Operación, se podrá trasladar el handler
y cambiar `CORCHO_EXEC` conservando el mismo libro, contrato y versiones. La migración
no requiere copiar o borrar notas. Registro: `CHG-DESPACHO-CORCHO-PROVISIONAL-035` en
el atlas de YOD. Para rollback, restaurar frontend y versión previa de código sin
borrar el libro ni cambiar su ACL.

## Verificación

`npm ci` y `npm run test:unit` verifican fechas, flags y clasificación. Para regresiones de
interfaz: `npx playwright install chromium` y `npm test`. `CHINCHE_SOURCE` permite probar
el script compartido del atlas fijado; sin esa variable se usa un doble local. Las pruebas
interceptan la red y usan datos sintéticos: no escriben en endpoints de negocio.

## Cuidado

- El orden de las casillas lo propone el tablero (dinero > decisiones sin ejecutar > más viejo >
  cuántas). La última palabra es de Dirección.
- Firmar escribe un comentario `🤖 Ejecutado (Despacho, fecha)`. **Cerrado significa resuelto,
  nunca significa avisado**: una tarjeta no se da por cerrada hasta que la otra parte contesta.
