# ControlAR — Sistema de Color y UI/UX Unificado

Documento único: combina la estrategia de la propuesta de diseño (3 pilares) con la
estructura real del código. Una sola paleta, distribuida por rol, lista para Figma y para CSS.

App real: React 18, dashboard de consumo eléctrico residencial con IoT (ESP8266 + PZEM-004T),
tarifas por rangos de distribuidoras argentinas (OCEBA, EPRE), predicciones, alertas, modo oscuro
y toggle ES/EN. Ya existe todo el layout en `frontend/src/` — este documento define **los colores**.

---

## 1. Concepto unificado: 3 pilares → 3 familias de color

La propuesta define tres pilares. Cada pilar recibe **una familia de color y una sola tarea**.
Eso es lo que hace que la paleta funcione: ningún color cumple dos roles, así que nada compite.

| Pilar | Qué comunica | Familia | Color ancla | Solo se usa para |
| --- | --- | --- | --- | --- |
| **Eficiencia y sustentabilidad** | Ahorro, energía limpia | **Esmeralda** | `#10B981` | CTA, badge "ahorro", serie 1, umbral óptimo |
| **Inteligencia y tecnología** | IoT, IA, predicción | **Índigo / Violeta / Cian** | `#6366F1` · `#7C3AED` · `#38BDF8` | Enlaces, predicciones IA, estado del sensor, series 2 y 4 |
| **Confianza y claridad** | Datos, estructura, lectura | **Slate** | `#0F172A` · `#64748B` | Texto, bordes, fondos, sidebar, grid, series neutras |

Y un cuarto rol, transverse a los tres: **Alerta** (ámbar y rojo), que solo aparece cuando hay
algo que requiere atención. Nunca decora.

**Consecuencia práctica:** si un componente es un botón de acción → esmeralda. Si es un dato
del sensor o una predicción → índigo o violeta. Si es un número de una métrica o un título →
slate. Si es un problema → ámbar o rojo. Un color, un rol. Nada de "esto es lindo así que lo
pinto de esmeralda".

### Por qué esmeralda y no el azul actual

El azul `#1D4ED8` actual funciona como color de marca, pero el software **vive de gráficos**: la
app tiene 4 gráficos en el dashboard, series por dispositivo, barras mensuales, curvas de
predicción y donuts de desglose. Con el azul saturado, cada gráfico empezaba a competir con los
botones y con el texto de la app: todo era azul, nada destacaba.

Con esmeralda el color de marca queda reservado a **la acción del usuario** (CTA, item activo,
foco), y los gráficos se llevan la familia índigo/violeta/cian. Ganas contraste de jerarquía sin
perder identidad: la app pasa a "SaaS técnico" en lugar de "formulario azul".

---

## 2. Regla de distribución (esta es la parte importante)

### 2.1 Quién usa esmeralda

Solo 6 lugares, en toda la app:

1. Botón primario (`btn-primary`) y CTA del hero.
2. Item activo del menú lateral.
3. Anillo de foco y borde de input en foco.
4. Badge "ahorro" / "consumo óptimo" y la serie 1 de los gráficos.
5. Barras de progreso de ahorro objetivo.
6. Píldora "En vivo" del header.

Todo lo demás que sea esmeralda hay que revisarlo: si aparece un esmeralda decorativo, es ruido.

### 2.2 Quién usa índigo / violeta / cian

- **Índigo `#4F46E5`** — enlaces, texto seleccionable, botón secundario con relleno, series 2.
- **Violeta `#7C3AED`** — todo lo que viene del motor de predicción: tarjetas de Predicciones,
  gráficos de proyección, badge "IA", chip del Asistente IA. Serie 4.
- **Cian `#0891B2` (claro) / `#38BDF8` (oscuro)** — estado del hardware: "sensor conectado",
  valores en vivo del PZEM, voltaje/corriente, líneas de tendencia brutas. Serie 6.

### 2.3 Quién usa slate

Texto, subtítulos, bordes, separación, fondo de tabla en zebra, iconografía inactiva, ejes de
gráficos, grillas, tooltip vacío. Es el 70% de la pantalla y tiene que ser **aburrido a propósito**.

### 2.4 Quién usa ámbar y rojo

Ámbar = atención, no peligro. Rojo = límite superado, no decorativo.

| Situación | Color |
| --- | --- |
| Consumo dentro de lo normal | slate `#64748B` |
| Cerca del umbral, conviene revisar | ámbar `#F59E0B` |
| Umbral superado / factura en rango alto | rojo `#EF4444` |
| Dispositivo desenchufado / inactivo | slate `#CBD5E1` |
| Ahorro conseguido | esmeralda `#10B981` |

Regla dura: **el rojo no se usa para texto sobre blanco.** `#EF4444` da 3.8:1, no llega a AA.
Para texto rojo usá `#B91C1C`. Igual con el ámbar: `#F59E0B` da 2.1:1, es solo para relleno,
barra o punto; el texto ámbar es `#B45309`.

---

## 3. Paleta

### 3.1 Modo claro

| Rol | Hex | Dónde |
| --- | --- | --- |
| Fondo base | `#FFFFFF` | superficie de la app |
| Fondo alternado | `#F8FAFC` | hero, secciones alternas, header |
| Fondo hover / zebra | `#F1F5F9` | filas de tabla, hover de item |
| Superficie tarjeta | `#FFFFFF` | cards,KPIs, modales |
| Sidebar | `#0F172A` | navegación lateral |
| Sidebar hover | `#1E293B` | items en hover |
| Texto primario | `#0F172A` | títulos, cifras grandes |
| Texto secundario | `#64748B` | subtítulos, leyendas, ejes |
| Texto muted | `#94A3B8` | placeholders, deshabilitado |
| Borde | `#E2E8F0` | bordes de card, separadores |
| Borde fuerte | `#CBD5E1` | input, tabla, divisor visible |
| **Acento primario** | `#10B981` | CTA, activo, serie 1, foco |
| Acento primario hover | `#059669` | hover de CTA |
| Texto sobre acento | `#FFFFFF` | texto del botón — **con `#059669` o más oscuro** |
| **Acento secundario** | `#4F46E5` | enlaces, serie 2 |
| Violeta IA | `#7C3AED` | predicciones, badge IA |
| Cian IoT | `#0891B2` | sensor, valores en vivo |
| Success | `#059669` | ok, ahorro,范围内的 normal |
| Warning | `#D97706` | badge ámbar legible |
| Danger | `#DC2626` | badge rojo legible |
| Ring de foco | `rgba(16,185,129,.35)` | input:focus |

### 3.2 Modo oscuro

| Rol | Hex | Dónde |
| --- | --- | --- |
| Fondo base | `#0B0F17` | app oscura |
| Fondo hero/secciones | `#131C2E` | header, bloques destacados |
| Superficie tarjeta | `#1E293B` | cards, KPIs, paneles |
| Superficie elevada | `#24344B` | hover, dropdown, modal |
| Sidebar | `#0F172A` | navegación |
| Texto primario | `#F8FAFC` | títulos, cifras |
| Texto secundario | `#94A3B8` | subtítulos |
| Texto muted | `#64748B` | deshabilitado |
| Borde | `#2B3A4F` | bordes de card |
| Borde fuerte | `#334155` | input, tabla |
| **Acento primario** | `#34D399` | CTA, activo, serie 1 |
| Acento hover | `#10B981` | hover |
| Texto sobre acento | `#052E24` | texto del botón verde — **oscuro, no blanco** |
| **Acento secundario** | `#818CF8` | enlaces, serie 2 |
| Violeta IA | `#A78BFA` | predicciones |
| Cian IoT | `#38BDF8` | sensor, en vivo |
| Success | `#10B981` | ok, ahorro |
| Warning | `#F59E0B` | atención |
| Danger | `#EF4444` | crítico |
| Grid de gráfico | `#24344B` | grillas |

> **Ojo, modo oscuro:** el botón verde es `#34D399`, que es claro. El texto encima **no puede**
> ser blanco (2.1:1). Va `#052E24` o negro. Es el error más común al migrar a esmeralda.

### 3.3 Rampas completas

Para cuando necesités un tono intermedio (hover, bordes, tintes de fondo):

```
Esmeralda   50 #ECFDF5  100 #D1FAE5  200 #A7F3D0  300 #6EE7B7  400 #34D399
            500 #10B981  600 #059669  700 #047857  800 #065F46  900 #064E3B

Índigo      50 #EEF2FF  100 #E0E7FF  200 #C7D2FE  300 #A5B4FC  400 #818CF8
            500 #6366F1  600 #4F46E5  700 #4338CA  800 #3730A3  900 #312E81

Violeta     50 #F5F3FF  100 #EDE9FE  200 #DDD6FE  300 #C4B5FD  400 #A78BFA
            500 #8B5CF6  600 #7C3AED  700 #6D28D9  800 #5B21B6  900 #4C1D95

Cian        50 #ECFEFF  100 #CFFAFE  200 #A5F3FC  300 #67E8F9  400 #22D3EE
            500 #06B6D4  600 #0891B2  700 #0E7490  800 #155E75  900 #164E63

Slate       50 #F8FAFC  100 #F1F5F9  200 #E2E8F0  300 #CBD5E1  400 #94A3B8
            500 #64748B  600 #475569  700 #334155  800 #1E293B  900 #0F172A

Ámbar       50 #FFFBEB  100 #FEF3C7  200 #FDE68A  300 #FCD34D  400 #FBBF24
            500 #F59E0B  600 #D97706  700 #B45309  800 #92400E  900 #78350F

Rojo        50 #FEF2F2  100 #FEE2E2  200 #FECACA  300 #FCA5A5  400 #F87171
            500 #EF4444  600 #DC2626  700 #B91C1C  800 #991B1B  900 #7F1D1D
```

---

## 4. Semántica de energía y tarifas (el dominio)

Acá es donde la paleta se vuelve útil y no decorativa. El software maneja rangos tarifarios de
distribuidoras argentinas, así que el color tiene que codificar el rango:

| Rango tarifario | Fondo (tinte) | Borde | Texto |
| --- | --- | --- | --- |
| Rango social / subsidiado | `#ECFDF5` | `#A7F3D0` | `#047857` |
| Rango normal | `#EEF2FF` | `#C7D2FE` | `#4338CA` |
| Rango alto | `#FFFBEB` | `#FDE68A` | `#B45309` |
| Rango crítico / excedido | `#FEF2F2` | `#FECACA` | `#B91C1C` |

En modo oscuro, los mismos roles con superficies `#1E293B` y borde del color de estado al 30%,
texto en el tono 300/400 de la familia.

**Umbrales en el gráfico de líneas** — de abajo hacia arriba:

```
0 ──────── zona óptima (esmeralda al 8%) ──── umbral normal
       ──── zona normal (índigo al 5%) ──────── umbral de atención
              ──── zona de atención (ámbar al 10%) ──── umbral crítico
                     ──── zona crítica (rojo al 10%) ────
```

El usuario tiene que poder leer el umbral de un vistazo sin mirar la leyenda. Para eso las
zonas van con tinte muy bajo y **el umbral es una línea discontinua con etiqueta**, no un color
sólido.

---

## 5. Visualización de datos

8 series separadas **en luminancia, no solo en matiz** (requisito del proyecto: las series se
diferencian en escala de grises, para daltonismo y para impresión).

| # | Color | Uso asignado |
| --- | --- | --- |
| 1 | `#10B981` esmeralda | Consumo total del hogar (tu curva) |
| 2 | `#4F46E5` índigo | Consumo de referencia / promedio del barrio |
| 3 | `#D97706` ámbar | Proyección de predicción |
| 4 | `#7C3AED` violeta | Tarifa estimada |
| 5 | `#DC2626` rojo | Pico / máximo |
| 6 | `#0891B2` cian | Pico solar / generación |
| 7 | `#BE185D` magenta | Electrodomésticos de alta carga |
| 8 | `#65A30D` oliva | Otros dispositivos |

**Orden del donut por dispositivo** (definilo así, no al azar — los vecinos del círculo tienen que
separarse en luminancia):

```
1 esmeralda → 5 rojo → 3 ámbar → 7 magenta → 2 índigo → 6 cian → 8 oliva → 4 violeta
```

En modo oscuro subí un escalón cada uno: `#34D399, #F87171, #FBBF24, #F472B6, #818CF8, #22D3EE,
#84CC16, #A78BFA`.

Otras reglas de gráficos:

- Grilla y ejes: `#E2E8F0` claro / `#24344B` oscuro. Nunca más contraste que la serie.
- Tooltip: `#0F172A` de fondo, texto `#F8FAFC`. El único elemento oscuro flotante en modo claro.
- Área bajo la línea: esmeralda al 10–14%, degradado hacia 0% en el eje.
- Línea de predicción: discontinua, ámbar, con banda de confianza al 12%.

---

## 6. Contraste (verificado, WCAG AA)

| Combinación | Ratio | Veredicto |
| --- | --- | --- |
| `#0F172A` sobre `#FFFFFF` | 17.9:1 | AAA |
| `#64748B` sobre `#FFFFFF` | 4.8:1 | AA (apenas, no bajar de 14px) |
| `#10B981` sobre `#FFFFFF` | 2.5:1 | **No como texto.** Solo relleno grande |
| `#047857` sobre `#FFFFFF` | 5.5:1 | AA — usar este para texto esmeralda |
| `#059669` con texto `#FFFFFF` | 3.8:1 | AA solo si el texto es 18px+ o bold |
| `#047857` con texto `#FFFFFF` | 5.5:1 | AA — **este es el color del botón primario** |
| `#4F46E5` sobre `#FFFFFF` | 5.2:1 | AA |
| `#7C3AED` sobre `#FFFFFF` | 7.1:1 | AAA |
| `#0891B2` sobre `#FFFFFF` | 4.0:1 | No como texto chico. Usar `#0E7490` |
| `#D97706` sobre `#FFFFFF` | 4.0:1 | No como texto chico. Usar `#B45309` |
| `#B45309` sobre `#FFFFFF` | 5.0:1 | AA — texto ámbar |
| `#DC2626` sobre `#FFFFFF` | 5.2:1 | AA — texto rojo |
| `#B91C1C` sobre `#FFFFFF` | 6.5:1 | AAA |
| `#34D399` sobre `#0B0F17` | 10.0:1 | AAA — acento en oscuro |
| `#38BDF8` sobre `#0B0F17` | 9.0:1 | AAA |
| `#F8FAFC` sobre `#1E293B` | 13.6:1 | AAA |
| `#94A3B8` sobre `#1E293B` | 5.4:1 | AA |

**Tres decisiones que salen de esta tabla y que hay que respetar:**

1. El botón primario es `#047857` en claro y `#34D399` en oscuro, no `#10B981`. El `#10B981` es
   para bordes, iconos, series y tintes.
2. El texto esmeralda es `#047857`, nunca `#10B981`.
3. En oscuro, texto del botón verde es `#052E24`, nunca blanco.

---

## 7. Tipografía

- **Familia:** `Inter` (o `Plus Jakarta Sans` si preferís más carácter). Números con
  `font-variant-numeric: tabular-nums`, obligatorio: el dashboard actualiza cada 10 segundos y
  sin números tabulares las cifras saltan.
- **Cifra KPI:** 32–36px, weight 700, tracking `-0.02em`.
- **Cifra secundaria:** 20–24px, weight 600.
- **Título de página:** 24px, weight 700.
- **Label:** 13px, weight 500, `#64748B`, uppercase con `letter-spacing: .04em` solo en eyebrows.
- **Mono para valores crudos del sensor:** `ui-monospace` 14px — voltaje, corriente, frecuencia.
  Es un dato de instrumento y tiene que verse como tal.

---

## 8. Hero (landing)

1. Fondo `#F8FAFC`, no el gradiente azul saturado actual. En oscuro, `#131C2E`.
2. Detrás del título, un resplandor esmeralda al 12% y cian al 8%, muy difuminado, más un patrón
   de nodos al 6% que evoque la red de sensores. Nada más.
3. Badge superior: píldora `#ECFDF5`, borde `#A7F3D0`, texto `#047857`, ícono con *ping*.
4. Botón primario "Empezar gratis": `#047857`, texto blanco, radio 10px.
5. Botón secundario "Ver demostración": fondo transparente, borde `#CBD5E1`, texto `#0F172A`.
6. En oscuro: primario `#34D399` con texto `#052E24`; secundario borde `#334155`, texto `#F8FAFC`.
7. Las 4 tarjetas de cifras (`116`, `24`, `9`, `3`): fondo blanco, borde superior de 3px en la
   familia del ícono — esmeralda, índigo, violeta, cian, uno por tarjeta, en ese orden. Eso
   reemplaza el color único actual y le da variedad sin romper nada.

---

## 9. PROMPT para Figma (unificado, un solo diseño)

Pegá esto en un frame vacío de un archivo de diseño, o en Figma Make.

```
Diseña el sistema visual de "ControlAR Energía", una plataforma web de monitoreo de consumo
eléctrico residencial con IoT (sensores ESP8266 + PZEM-004T) y predicciones. Generá 3 pantallas
de escritorio de 1440x900 en fila, todas con la MISMA paleta —solo cambia el modo— y una cuarta
sección de muestra de componentes. Estética SaaS técnico, sobria, con mucho aire, sin decoración.

=== CONCEPTO ===
Tres pilares visuales, y cada color tiene una única función:
· Eficiencia y sustentabilidad → VERDE ESMERALDA (CTA, ahorro, serie 1)
· Inteligencia y tecnología → ÍNDIGO, VIOLETA y CIAN (IA, predicción, sensor, series 2/4/6)
· Confianza y claridad → SLATE (texto, bordes, estructura, sidebar)
· Atención → ÁMBBAR y ROJO, solo cuando hay un umbral superado
Nunca uses esmeralda como decoración, nunca uses rojo sin un motivo real.

=== PANTALLA 1 — Dashboard (modo claro) ===
Sidebar izquierdo de 260px en #0F172A, con logo "ControlAR Energía", items: Dashboard, Consumo,
Dispositivos, Predicciones, Facturas, Alertas, Tarifas, Asistente IA, Recomendaciones, Perfil.
El item activo tiene fondo esmeralda #047857 y texto blanco.
Header sobre fondo #F8FAFC: título "Dashboard", subtítulo "Resumen de consumo · Últimos 30 días",
a la derecha una píldora esmeralda "● En vivo" con punto pulsante, un selector "ES / EN" y avatar.

Fila de 4 tarjetas KPI sobre #FFFFFF, borde 1px #E2E8F0, radio 14px, sombra muy suave
(0 4px 6px -1px rgba(0,0,0,.05)):
  · "184.6 kWh" / Consumo del mes / "+12.4 %" con flecha verde #047857
  · "$48.230" / Costo estimado / badge ámbar "Rango alto"
  · "12" / Dispositivos / "3 en uso ahora" en cian #0891B2
  · "3" / Alertas sin leer / "1 crítica" en rojo #DC2626
Cifras en 34px weight 700 con tracking -0.02em, labels en 13px #64748B.

Debajo, un gráfico de líneas grande de consumo diario (30 días): línea esmeralda #10B981 de 2.5px
con área degradada al 12%, eje y grilla en #E2E8F0, y dos líneas de umbral discontinuas con
etiqueta: ámbar "Umbral de atención" y roja "Umbral crítico". Debajo del eje, una banda con
tinte esmeralda al 8% para la zona óptima.
Al lado, barras de consumo mensual en índigo #4F46E5 y un donut de desglose por dispositivo con
este orden de colores alrededor del círculo: #10B981, #DC2626, #D97706, #BE185D, #4F46E5, #0891B2,
#65A30D, #7C3AED.
Luego una tabla de alertas con badges: "Normal" fondo #ECFDF5 texto #047857; "Advertencia" fondo
#FFFBEB texto #B45309; "Crítico" fondo #FEF2F2 texto #B91C1C; "Inactivo" fondo #F1F5F9 texto #64748B.
Y una tarjeta "Recomendaciones" con 3 ítems, ícono de bombilla cian #0891B2.
Cerrá con un panel de rangos tarifarios con 4 tarjetas, cada una con su tinte:
Rango social #ECFDF5/#047857, Rango normal #EEF2FF/#4338CA, Rango alto #FFFBEB/#B45309,
Excedido #FEF2F2/#B91C1C.

=== PANTALLA 2 — Misma pantalla en modo oscuro ===
Repetí exactamente el mismo layout. Fondo #0B0F17, superficies de tarjeta #1E293B, sidebar
#0F172A, bordes #2B3A4F, texto #F8FAFC, secundario #94A3B8. El esmeralda sube a #34D399 y el
texto DENTRO de los botones verdes es oscuro #052E24, nunca blanco. Índigo #818CF8, violeta
#A78BFA, cian #38BDF8, ámbar #F59E0B, rojo #EF4444. Grillas en #24344B. Nada de sombras
negras, en oscuro la separación se hace con borde.

=== PANTALLA 3 — Landing (modo claro) ===
Nav superior sobre #F8FAFC con logo y links. Hero centrado: píldora esmeralda #ECFDF5 con borde
#A7F3D0 y texto #047857 que dice "Monitoreo inteligente del consumo energético" con ícono
pulsante; título grande en #0F172A sobre un resplandor esmeralda al 12% y cian al 8% muy
difuminado, más un patrón sutil de nodos al 6%; botón primario "Empezar gratis" en #047857 con
texto blanco, botón secundario "Ver demostración" con borde #CBD5E1 y fondo transparente.
Debajo, 4 tarjetas de cifras (116 electrodomésticos, 24 jurisdicciones, 9 rangos tarifarios,
3 niveles de subsidio) con fondo blanco, sombra leve y un borde superior de 3px de color
distinto en cada una: esmeralda, índigo, violeta, cian.
Luego una sección "Cómo funciona" con 4 pasos en línea de tiempo: 1 Conectar sensor, 2 Lectura
en vivo, 3 Análisis de tarifa, 4 Ahorro. Cada paso con marcador circular esmeralda, el activo
con anillo exterior. Al final un bloque de módulos en tarjetas con íconos de las familias
esmeralda / índigo / violeta / cian.

=== PANTALLA 4 — Muestra de componentes ===
Sobre fondo #FFFFFF, filas ordenadas de: botones (primario esmeralda, secundario con borde,
fantasma, deshabilitado), inputs en estado normal / foco con anillo esmeralda rgba(16,185,129,.35)
/ error, 5 badges de estado, 5 badges de rango tarifario con sus tintes, las 8 muestras de serie
de gráfico con su hex, y una escala de grises de texto (#0F172A, #64748B, #94A3B8).

=== REGLAS ===
· Números con ancho fijo (tabular-nums). No uses degradados decorativos salvo en el área del
  gráfico de líneas. No uses sombras pesadas. No uses glassmorphism. Radio 14px en tarjetas,
  10px en botones, chip con radio completo en badges.
· Contraste AA en todo el texto. Ningún texto rojo o ámbar claro sobre blanco: usá #B91C1C
  y #B45309.
· Etiquetá cada pantalla con su nombre arriba.
```

---

## 10. CSS para `frontend/src/styles/App.css`

Reemplazá el bloque `:root` y el bloque `:root.dark`. Ojo: **el proyecto usa la clase
`:root.dark`**, no `[data-theme="dark"]` de la propuesta — mantené `:root.dark` o rompés el
toggle de tema.

```css
:root {
  /* --- Marca: esmeralda (eficiencia) --- */
  --primary: #047857;          /* legible sobre blanco: 5.5:1 */
  --primary-bright: #10b981;   /* iconos, bordes, series, tintes: NO texto */
  --primary-light: #10b981;
  --primary-dark: #065f46;
  --primary-bg: #ecfdf5;
  --on-primary: #ffffff;

  /* --- Tecnología: índigo / violeta / cian --- */
  --accent-indigo: #4f46e5;
  --accent-indigo-dark: #4338ca;
  --accent-violet: #7c3aed;
  --accent-cyan: #0891b2;
  --on-cyan: #0e7490;          /* versión legible para texto */

  /* --- Neutros: slate --- */
  --bg: #ffffff;
  --bg-alt: #f8fafc;
  --surface: #ffffff;
  --surface-2: #f8fafc;
  --surface-3: #f1f5f9;
  --card-bg: #ffffff;
  --sidebar-bg: #0f172a;
  --sidebar-hover: #1e293b;
  --text: #0f172a;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --border: #e2e8f0;
  --border-strong: #cbd5e1;

  /* --- Estados --- */
  --success: #059669;
  --success-bright: #10b981;
  --warning: #d97706;          /* relleno */
  --on-warning: #b45309;       /* texto */
  --danger: #dc2626;
  --danger-dark: #b91c1c;      /* texto */
  --on-danger: #ffffff;
  --inactive: #cbd5e1;
  --on-inactive: #64748b;

  /* --- Rangos tarifarios --- */
  --tier-social-bg: #ecfdf5;   --tier-social-fg: #047857;   --tier-social-br: #a7f3d0;
  --tier-normal-bg: #eef2ff;   --tier-normal-fg: #4338ca;   --tier-normal-br: #c7d2fe;
  --tier-alto-bg:    #fffbeb;   --tier-alto-fg:    #b45309;   --tier-alto-br:    #fde68a;
  --tier-alto-crit-bg: #fef2f2; --tier-alto-crit-fg: #b91c1c; --tier-alto-crit-br: #fecaca;

  /* --- Series de gráficos (separadas en luminancia) --- */
  --chart-1: #10b981;  --chart-2: #4f46e5;  --chart-3: #d97706;  --chart-4: #7c3aed;
  --chart-5: #dc2626;  --chart-6: #0891b2;  --chart-7: #be185d;  --chart-8: #65a30d;

  --grid: #e2e8f0;
  --ring: rgba(16, 185, 129, 0.35);
  --primary-glow: rgba(16, 185, 129, 0.22);
  --primary-tint: rgba(16, 185, 129, 0.12);

  /* --- Hero: sin gradiente saturado --- */
  --grad-hero: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  --on-hero: #0f172a;
  --hero-glow-a: rgba(16, 185, 129, 0.12);
  --hero-glow-b: rgba(8, 145, 178, 0.08);

  /* --- Logo --- */
  --logo-tile-a: #047857;
  --logo-tile-b: #10b981;
  --logo-mark: #ffffff;

  --radius: 14px;
}

:root.dark {
  --primary: #34d399;
  --primary-bright: #10b981;
  --primary-light: #10b981;
  --primary-dark: #059669;
  --primary-bg: #064e3b;
  --on-primary: #052e24;        /* texto oscuro sobre verde claro: NUNCA blanco */

  --accent-indigo: #818cf8;
  --accent-indigo-dark: #a5b4fc;
  --accent-violet: #a78bfa;
  --accent-cyan: #38bdf8;
  --on-cyan: #38bdf8;

  --bg: #0b0f17;
  --bg-alt: #131c2e;
  --surface: #1e293b;
  --surface-2: #24344b;
  --surface-3: #24344b;
  --card-bg: #1e293b;
  --sidebar-bg: #0f172a;
  --sidebar-hover: #1e293b;
  --text: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --border: #2b3a4f;
  --border-strong: #334155;

  --success: #10b981;
  --warning: #f59e0b;
  --on-warning: #f59e0b;
  --danger: #ef4444;
  --danger-dark: #f87171;
  --inactive: #334155;
  --on-inactive: #94a3b8;

  --tier-social-bg: #064e3b;  --tier-social-fg: #6ee7b7;  --tier-social-br: #047857;
  --tier-normal-bg: #1e1b4b;  --tier-normal-fg: #a5b4fc;  --tier-normal-br: #4338ca;
  --tier-alto-bg:    #451a03;  --tier-alto-fg:    #fcd34d;  --tier-alto-br:    #b45309;
  --tier-alto-crit-bg: #450a0a; --tier-alto-crit-fg: #fca5a5; --tier-alto-crit-br: #b91c1c;

  --chart-1: #34d399;  --chart-2: #818cf8;  --chart-3: #fbbf24;  --chart-4: #a78bfa;
  --chart-5: #f87171;  --chart-6: #22d3ee;  --chart-7: #f472b6;  --chart-8: #84cc16;

  --grid: #24344b;
  --ring: rgba(52, 211, 153, 0.40);
  --primary-glow: rgba(52, 211, 153, 0.20);
  --primary-tint: rgba(52, 211, 153, 0.14);

  --grad-hero: linear-gradient(180deg, #131c2e 0%, #0b0f17 100%);
  --on-hero: #f8fafc;
  --hero-glow-a: rgba(52, 211, 153, 0.14);
  --hero-glow-b: rgba(56, 189, 248, 0.10);
}
```

Además, en la capa de componentes:

```css
/* Cifras en vivo: sin esto saltan cada 10 s */
.kpi-value, .stat-value, .hero-stat-value, .reading-value {
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

/* En oscuro no hay sombra: la separación es borde */
:root.dark .card,
:root.dark .stat-card { box-shadow: none; }

/* Hover de CTA claro: #10B981 con texto blanco no llega a AA */
.btn-primary:hover { background: var(--primary-dark); }
```

---

## 11. Qué mirar cuando Figma devuelva

En este orden, es lo que decide si la paleta funciona:

1. **Los 4 KPIs juntos** — si el esmeralda del KPI 1 y el ámbar del KPI 2 se parecen, ajustá el
   ámbar a `#D97706` (más oscuro) y no uses `#F59E0B` en texto.
2. **El donut** — los 8 slices tienen que separarse de un vistazo y en escala de grises.
   Convertí el frame a blanco y negro en Figma: si dos slices vecinos se funden, cambiás el orden.
3. **El botón verde en claro y en oscuro** — es donde más se falla. Claro: verde `#047857` con
   texto blanco. Oscuro: `#34D399` con texto `#052E24`. Si en el oscuro quedó texto blanco, está mal.
4. **Las líneas de umbral sobre el gráfico** — tienen que leerse sin mirar la leyenda.
5. **La tabla de rangos tarifarios** — los 4 tintes juntos no pueden verse como "el mismo color
   más claro". Si pasa, subí el contraste de los bordes.

Y una comprobación rápida en el navegador, sin Figma: activá el tema oscuro y mirá los botones
verdes. Si tenés que forzar eluously los ojos para leer el texto, el verde está demasiado claro.
