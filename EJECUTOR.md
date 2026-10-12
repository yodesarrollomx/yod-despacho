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

## v2 (29-sep): cuatro carriles

La pantalla principal (`index.html` + `app.js`) ordena todo en **Tu sí**, **Puede esperar** (se aprueba en bloque), **Solo tú** y **Lo que hice solo**. El tablero anterior vive en `clasico.html`. `#demo` enseña la pantalla con datos de ejemplo.

Campos nuevos en la línea `LISTO`:

| Campo | Uso |
|---|---|
| `tipo=correo` \| `tipo=decision` | `decision` va a **Solo tú**: no hay borrador, hay una pregunta |
| `falta=<pregunta>` | Lo que solo Alejandro puede decidir (en `decision`) |
| `prio=alta` \| `prio=media` | `alta` va a **Tu sí**; `media` a **Puede esperar** |
| `chips=urgente,dinero,legal,firma,hoy` | Etiquetas visibles; cualquier chip sube la tarjeta a **Tu sí** |

Líneas nuevas:

| Línea | Quién | Efecto |
|---|---|---|
| `BANDEJA RESPUESTA · hora=<ISO> · <texto>` | Alejandro | Contestó una decisión; el Ejecutor redacta con eso y la tarjeta vuelve como `REHECHO · tipo=correo` |
| `BANDEJA RESUELTO · hora=<ISO>` | Alejandro | Lo resolvió por fuera; se cierra |
| `BANDEJA ENVIADO · por=alejandro · hora=<ISO>` | Ejecutor | Detectó que Alejandro lo mandó desde Gmail (el borrador ya no está y hay mensaje suyo en el hilo después de `LISTO`) |

`observaciones` = resumen de 1–2 líneas + `\n—— BORRADOR ——\n` + texto completo del borrador. Lo que el Ejecutor agregó o corrigió va entre `⟦ ⟧` y se pinta resaltado.

`hora` es ISO UTC. El latido del Ejecutor es la `hora` más reciente escrita por `Claude`; si pasan más de ~2 h sin vuelta, la pantalla lo dice en rojo.

## Ejecutor de nube preparado (11-oct-2026)

El proyecto dedicado de Google y sus fuentes están en el repositorio privado yod-agent-cloud, server/bandeja. Revisión cada cinco minutos, Gmail por API y redacción por uso. Instalación, consentimiento de Google y relevo deben comprobarse; publicar este frontend no sustituye automáticamente la rutina Claude.

La configuración `bandeja_mode=cloud` y `bandeja_exec_url` cambia sólo aprobación/cancelación al nuevo backend. Las demás acciones siguen usando Operación. No hay fallback de una aprobación incierta: se relee la fila por firma de solicitud. La nueva línea APROBADO copia huella del borrador y lleva un permiso emitido por el servidor tras validar Dirección/DP; se revalida la sesión antes de enviar. Cancelar revoca ese permiso privado incluso si falla Sheets. Escribir el nombre Alejandro en un comentario no concede autoridad.

Los borradores heredados sin huella se vuelven a presentar para revisión; no se usa una aprobación anterior para un contenido nuevo. Una llamada de envío incierta queda reservada y se concilia sin repetir Gmail. Enviar no marca terminada una tarea que espera respuesta. Los correos nuevos sin una tarjeta BANDEJA no se importan ni se responden automáticamente.

El estado técnico de nube llega desde el vigilante a Accesos: programador, Gmail, libro, redacción, compuerta y último acuse separados. El latido de nube no depende de crear comentarios cuando no hay trabajo; pruebas vencidas o sin permiso quedan por verificar.
