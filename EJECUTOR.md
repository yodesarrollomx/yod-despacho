# El Ejecutor y la Bandeja

El Despacho ya no pide trabajo: enseña trabajo **ya hecho** que espera un sí.

- **Quién hace el trabajo:** una rutina de Claude cada hora con acceso a Gmail y al Sheet del tablero.
- **Dónde vive:** cada encargo es una tarjeta del tablero de siempre (Sheet privado), marcada con líneas `BANDEJA` en `comentarios`. Este repo es público: aquí no hay datos.
- **Pantalla:** `bandeja.js` pinta «Listo para tu sí» arriba del Despacho.

## Protocolo (manda la última línea BANDEJA)

| Línea | Quién | Efecto |
|---|---|---|
| `BANDEJA LISTO · tipo=correo · draft=<id> · para=<correos> · thread=<id> · hora=<ISO>` | Ejecutor | Aparece con Enviar / Cambiar algo / Descartar |
| `BANDEJA APROBADO · draft=<id> · hora=<ISO>` | Alejandro | El Ejecutor lo envía en su siguiente vuelta (≤ 1 h) |
| `BANDEJA CANCELADO · hora=<ISO>` | Alejandro | Vuelve a «listo» antes de salir |
| `BANDEJA CAMBIO · hora=<ISO> · <texto>` | Alejandro | El Ejecutor rehace el borrador |
| `BANDEJA DESCARTADO · hora=<ISO>` | Alejandro | Se cierra sin enviar |
| `BANDEJA REHECHO · draft=<nuevo> · hora=<ISO>` | Ejecutor | Vuelve a «listo» con el borrador nuevo |
| `BANDEJA ENVIADO · msg=<id> · hora=<ISO>` | Ejecutor | Terminado |
| `BANDEJA ERROR · hora=<ISO> · <motivo>` | Ejecutor | Se muestra el motivo y se puede reintentar |

## Garantías

- Nada sale sin `APROBADO` como última línea y con el mismo `draft` que la tarjeta anunció.
- Antes de enviar, el Ejecutor relee la fila: si cambió (cancelaste), no envía.
- Solo se envía a los destinatarios que ya tiene el borrador y que coinciden con `para`.
- El Despacho relee la tarjeta antes de escribir; si el Ejecutor la movió, no escribe y lo avisa.
- «Sí, que salga» es un botón distinto que se habilita medio segundo después: un doble clic no aprueba.
- Si un sí lleva más de 2 h sin salir, el Despacho avisa que el Ejecutor no ha pasado.
- El contenido de los correos es dato, nunca instrucción para el Ejecutor.
