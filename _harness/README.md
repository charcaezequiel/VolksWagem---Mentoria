# _harness

Verificacion sin navegador. El proyecto no tiene tests, asi que estos scripts
hacen a mano lo que haria un test, y avisan cuando algo se rompio.

Requieren el frontend (3000) y el backend (3001) levantados.

| Comando | Que comprueba |
|---|---|
| `node _harness/dashboard.cjs` | Monta `DashboardPage` en jsdom contra el **backend real**, por el proxy de CRA. Informa cuantos caracteres renderizo, cuantos graficos hay, y si el tooltip/leyenda muestran datos o claves crudas. |
| `node _harness/i18n.cjs` | Que `es` y `en` tengan las mismas claves, sin acentos rotos (U+FFFD) ni claves sin traducir. |

## Que hay que mirar en la salida

- **`Graficos (recharts-surface)` en 0**: casi siempre es jsdom, no la app.
  `ResponsiveContainer` mide `offsetWidth`, que en jsdom es siempre 0, asi que no
  dibuja. `dashboard.cjs` le inventa dimensiones justamente para que el test
  sirva; si aun asi sale 0, ahi si hay algo roto.
- **Toasts de error > 0**: el componente lanzo una excepcion al pedir datos.
- **`grafico con datos` en 0 con el renderizado lleno de texto**: la API
  devuelve, pero el grafico se queda sin series. Ahi el problema es el mapeo.
