# El Despacho · YOD OS

La pantalla de trabajo de Dirección: por cada frente del negocio, quién está esperando más.
Cinco carriles × tres casillas + la cola. Se toca una casilla, se ven sus tarjetas y se firman
ahí mismo.

**Mecánica: la misma que los demás tableros.**

| Pieza | Qué hace |
|---|---|
| `portero.js` | decide quién entra (código `DP`); deja la credencial en `pyod_clave_v1` |
| `shell.js` | pinta el menú lateral de YOD OS |
| Apps Script del board-aurum | lee (`getAll`) y escribe (`update`) el Sheet de tareas |
| Sheet del board-aurum | **el único almacén.** Aquí no se guarda nada aparte |

No hay base propia, no hay copia, no hay artifact. Lo que se firma se escribe en la misma
tarjeta del tablero de siempre, con la sesión del Portero del propio usuario — igual que
cuando él edita desde el board.

## Lo que calcula en el navegador

- **La fecha real.** El Sheet guarda `fecha` como «Lunes 24» y el mes en otra columna; aquí se
  reconstruye, y cuando la celda solo dice «esta semana» se ancla al viernes de esa semana ISO.
  Una celda vacía **no se inventa**.
- **El carril** de cada tarjeta y la disolución del proyecto «Decisiones» hacia su tema real.
- **La matrícula** `EMPRESA-SUJETO-TIPO+NÚMERO-META-QUIÉN` (ver `CODIGOS-BOARDS.md` de yod-portal).
- **Los ocho focos** de revisión, al pie.

## Cuidado

- El orden de las casillas lo propone el tablero (dinero > decisiones sin ejecutar > más viejo >
  cuántas). La última palabra es de Dirección.
- Firmar escribe un comentario `🤖 Ejecutado (Despacho, fecha)`. **Cerrado significa resuelto,
  nunca significa avisado**: una tarjeta no se da por cerrada hasta que la otra parte contesta.
