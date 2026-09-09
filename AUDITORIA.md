# El Despacho · auditoría de botones (8-sep-2026)

Hecha **en el Chrome de Alejandro**, con su sesión del Portero viva, sobre
`https://yodesarrollomx.github.io/yod-despacho/`. Cada control se apretó de
verdad y se anotó qué se movió. Nada se dio por bueno "leyendo el código".

## Regla que se respetó

Se movió una celda real **una sola vez**, con una tarjeta marcada como prueba.
El botón **Firmar** se apretó hasta el punto en que pide confirmación y ahí se
canceló: ese botón escribe *"firmada por Alejandro"* en una decisión real del
negocio, y esa firma es suya, no mía.

## Control por control

| # | Control | Qué dispara | Qué se movió | Resultado |
|---|---------|-------------|--------------|-----------|
| 1 | Carga de la página | `getAll` al Apps Script del board con la credencial del Portero | nada | 147 filas leídas → 48 vivas, 5 carriles, 11 casillas |
| 2 | Sin credencial | corta antes de pedir nada | nada | avisa "Todavía no entras" y no borra lo escrito |
| 3 | **Soltar un pendiente** (hero) | baja a la caja y le pone el cursor | nada | foco en la caja de texto, anillo dorado |
| 4 | Caja de texto | escribir / dictar | nada | acepta texto y dictado del teclado |
| 5 | Selectores proyecto / dueño / plazo | se llenan del tablero vivo | nada | 15 proyectos, 9 dueños, 3 plazos |
| 6 | **Ponerlo en el tablero** vacío | guarda de entrada | nada | "Escribe algo primero.", cero peticiones |
| 7 | **Ponerlo en el tablero** con texto | `create` | **sí: tarjeta A-151** | 147 → 148 filas; `Septiembre / Semana 37 / Viernes 11 / Admin / Alejandro / Pendiente` |
| 8 | Clic en una casilla | abre la hoja de abajo | nada | 12 filas, matrícula, dueño, estado, días de retraso |
| 9 | Cerrar hoja: la ✕ | `cerrarHoja()` | nada | cierra y suelta el scroll |
| 10 | Cerrar hoja: clic afuera | `cerrarHoja()` | nada | cierra |
| 11 | Cerrar hoja: tecla Esc | `cerrarHoja()` | nada | cierra |
| 12 | **Firmar** | relee, pide confirmación, `update` de la columna `comentarios` | **nada: cancelado a propósito** | el aviso enseña el texto exacto; al cancelar el botón queda igual y no se escribe |
| 13 | Botón de tema (🌙 del shell) | cambia `data-tema` | nada | el Despacho se queda oscuro en los dos modos, a propósito |
| 14 | Engrane de accesos (⚙ del shell) | matriz de accesos del Portero | **no se tocó** | es el panel que en agosto borró permisos; se deja para él |

## Lo que se rompió y se arregló durante la auditoría

1. **Los títulos se perdían.** `portero.js` inyecta su hoja *después* de la del
   tablero y en modo claro repinta `--bg`, el color del `body` y `.hero` con
   `!important`. Como El Despacho nace oscuro, quedaba tinta clara sobre fondo
   claro. Se anclaron los tokens con `html[data-tema][data-tema]`. → `559b848`
2. **El lienzo salía crema.** `shell.css` pinta `.yod-canvas{background:#f6f3ed}`
   y `.yod-shell{color:#231d14}` porque los demás tableros son claros. Se anula
   sólo dentro del lienzo; barra lateral y barra de arriba quedan intactas.
3. **La fecha se adelantaba un día.** Los sellos usaban `toISOString()`, que es
   UTC: después de las seis de la tarde en México la tarjeta nacía con la fecha
   de mañana. Ahora `hoyLocal()`.
4. **El fondo se movía con la hoja abierta.** Se bloquea el scroll mientras la
   hoja está arriba.
5. **Firmar podía borrar el comentario de otro.** El `patch` reemplaza la
   columna `comentarios` completa y el texto se armaba con lo que estaba en
   memoria desde que se abrió la página. Ahora relee la tarjeta justo antes de
   escribir y aborta si ya venía firmada. Es el mismo error que en agosto borró
   accesos.

## Lo que queda pendiente

- La tarjeta de prueba **A-151** sigue en el Sheet. Dice "PRUEBA DE AUDITORÍA —
  se puede borrar".
- El camino de `update` está probado hasta el aviso de confirmación. Para verlo
  escribir de punta a punta hace falta que él apriete **Firmar** una vez.
- El Despacho no tiene fila en las pestañas `Portal` / `Sistemas` del Sheet, así
  que todavía no sale en la rejilla de módulos ni en el ⌘K.
