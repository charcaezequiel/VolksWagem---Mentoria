# ControlAR Energia

Sistema web de monitoreo, analisis y prediccion del consumo energetico residencial en Argentina.
Incluye integracion IoT con **ESP8266MOD + PZEM-004T v3.0 + Bobina CT (dona encintada)** para lecturas en tiempo real, con interfaz bilingue (Espanol / Ingles).

---

## Indice

1. [Objetivo del proyecto](#objetivo-del-proyecto)
2. [Arquitectura del sistema](#arquitectura-del-sistema)
3. [Arquitectura IoT / Arduino](#arquitectura-iot--arduino)
4. [Arquitectura Backend](#arquitectura-backend)
5. [Arquitectura Frontend](#arquitectura-frontend)
6. [Base de datos](#base-de-datos)
7. [Stack tecnologico](#stack-tecnologico)
8. [Estructura del proyecto](#estructura-del-proyecto)
9. [Requisitos previos](#requisitos-previos)
10. [Instalacion y ejecucion](#instalacion-y-ejecucion)
11. [Credenciales de demostracion](#credenciales-de-demostracion)
12. [API REST - Endpoints](#api-rest---endpoints)
13. [Variables de entorno](#variables-de-entorno)
14. [Internacionalizacion (i18n)](#internacionalizacion-i18n)
15. [Cambios recientes](#cambios-recientes)
16. [Problemas encontrados y soluciones](#problemas-encontrados-y-soluciones)
17. [Mejoras a futuro](#mejoras-a-futuro)
18. [Integrantes del equipo](#integrantes-del-equipo)

---

## Objetivo del proyecto

ControlAR Energia es una aplicacion web desarrollada en el marco de la materia **Practicas Profesionalizantes**. Su proposito es permitir a los usuarios residenciales argentinos:

- **Monitorear** el consumo energetico de sus dispositivos en tiempo real.
- **Analizar** patrones de consumo a traves de graficos interactivos e indicadores clave (KPIs).
- **Predecir** consumos futuros basandose en datos historicos usando un motor de prediccion propio.
- **Comparar** facturas de energia mes a mes y detectar variaciones significativas.
- **Gestionar** alertas por consumo excesivo, anomalias en dispositivos y superacion de umbrales.
- **Comprender** el sistema de tarifas por provincias (OCEBA para Buenos Aires, EPRE para San Juan, etc.) y su impacto en el costo de la factura.

El proyecto esta orientado al contexto energetico argentino, contemplando las particularidades del mercado electrico residencial, las diferencias entre distribuidores provinciales y el sistema de tarifas por rangos (rango social, rango normal, rango alto).

---

## Arquitectura del sistema

### Diagrama general

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MONITOREO ENERGETICO                         │
│                      ControlAR Energia - Argentina                   │
└─────────────────────────────────────────────────────────────────────┘

  ┌──────────────────┐      WiFi       ┌──────────────────┐
  │  ESP8266MOD      │ ──────────────> │   Backend API    │
  │  + PZEM-004T     │   POST cada     │  (Node.js +      │
  │  + Bobina CT     │   10 segundos   │   Express)       │
  │  (Sensores)      │                 │   Puerto 3001    │
  │                   │   JSON:         │                  │
  │ Mide:             │   { watts,      │  ┌────────────┐  │
  │ - Voltaje (PZEM)  │     kwh,        │  │  Socket.IO │──────> Dashboard en vivo
  │ - Corriente (PZEM)│     voltage,    │  └────────────┘  │
  │ - Potencia (PZEM) │     current,    │         │        │
  │ - Energia (PZEM)  │     freq,       │         ▼        │
  │ - Frecuencia(PZEM)│     pf,         │  ┌────────────┐  │
  │ - FP (PZEM)       │     ct_amps }   │  │  Sequelize │  │
  │ - Corriente CT    │                 │  │    ORM     │  │
  └──────────────────┘                 │  └─────┬──────┘  │
                                       └────────┼─────────┘
                                                │
                                                ▼
                                       ┌─────────────────┐
                                       │    Supabase      │
                                       │  (PostgreSQL)    │
                                       └─────────────────┘
                                                ▲
                                                │
                                       ┌─────────────────┐
                                       │   Frontend       │
                                       │  (React 18)     │
                                       │  Puerto 3000    │
                                       │                  │
                                       │  - Dashboard     │
                                       │  - Graficos      │
                                       │  - Alertas       │
                                       │  - Asistente IA  │
                                       │  - Modo oscuro   │
                                       │  - ES / EN toggle│
                                       └─────────────────┘
```

### Flujo de datos en tiempo real

```
ESP8266 mide voltaje/corriente/potencia + CT (cada 10s)
        │
        ▼
POST /api/sensor/readings (con device_token)
        │
        ▼
Backend guarda en consumption_readings
        │
        ├──> Emite Socket.IO → "reading:new" → Dashboard se actualiza
        │
        └──> chequeoPeakDetection() → si hay pico → "alert:new" → Toast notification
```

### Flujo de la aplicacion web

```
Browser (React)                    Backend (Express)              Supabase
     │                                   │                            │
     │  GET /api/dashboard               │                            │
     │  (Authorization: Bearer JWT)      │                            │
     │ ──────────────────────────────>   │  SELECT * FROM ...         │
     │                                   │ ──────────────────────>    │
     │                                   │  <─── datos ──────────     │
     │  <─── JSON response ──────────    │                            │
     │                                   │                            │
     │  Socket.IO connection             │                            │
     │ ──────────────────────────────>   │  io.emit('reading:new')    │
     │  <─── on('reading:new') ──────    │                            │
     │  Actualiza graficos en vivo       │                            │
```

---

## Arquitectura IoT / Arduino

### Componentes y materiales

| # | Componente | Cantidad | Descripcion |
|---|---|---|---|
| 1 | **ESP8266MOD** (ESP-12F) | 1 | Microcontrolador con WiFi |
| 2 | **Sensor PZEM-004T v3.0** | 1 | Mide tension, corriente, potencia activa, energia acumulada, frecuencia y factor de potencia |
| 3 | **Bobina CT / Transformador dona encintada** | 1 | Sensor de corriente tipo toroidal, se engancha alrededor del cable de fase sin cortarlo |
| 4 | **Fuente USB 5V** | 1 | Alimenta el ESP8266 (minimo 500mA) |
| 5 | **Cables jumper hembra-hembra** | 4+ | Conexiones entre el PZEM y el ESP8266 |
| 6 | **Cable de fase y neutro** | 2 segmentos | Para pasar la linea de 220V por el PZEM |

> **ADVERTENCIA:** el PZEM se conecta en serie con la linea electrica de **220V CA**. La bobina CT se engancha al cable de fase. Cualquier manipulacion debe hacerse con la **llave termica cortada** y, idealmente, por alguien con conocimientos de instalaciones electricas.

### Diagrama de conexiones

```
    ┌─────────────────────┐
    │   ESP8266MOD        │
    │   (ESP-12F)         │
    │                     │
    │   D1 (GPIO5) ◄──────┼──────── RX  ┐
    │   D2 (GPIO4) ──────►┼──────── TX  │  PZEM-004T v3.0
    │   5V ──────────────┼──────── 5V  ├────
    │   GND ─────────────┼──────── GND ┘
    │                     │
    │   A0 ◄──────────────┼──────── Salida CT (bobina dona)
    └─────────────────────┘
                                 │
                          ┌──────┴──────┐
                          │   PZEM-004T │
                          │             │
                          │  L ──────────── Fase 220V (en serie)
                          │  N ──────────── Neutro 220V
                          │             │
                          │  Cable fase ──── Pasa por el orificio de la dona CT
                          └─────────────┘
```

### Pinout detallado

| Pin del PZEM / CT | Se conecta a | Funcion |
|---|---|---|
| `PZEM RX` | **D1 (GPIO5)** del ESP8266 | RX SoftwareSerial (recibe datos del PZEM) |
| `PZEM TX` | **D2 (GPIO4)** del ESP8266 | TX SoftwareSerial (envia comandos al PZEM) |
| `PZEM 5V` | **5V** del ESP8266 | Alimentacion del sensor |
| `PZEM GND` | **GND** del ESP8266 | Tierra comun |
| `PZEM L` | Fase de la linea 220V | En serie con la carga a medir |
| `PZEM N` | Neutro de la linea 220V | Neutro |
| `CT salida` | **A0** del ESP8266 | Corriente inducida por la dona |

### Mediciones del PZEM-004T

| Medicion | Rango | Precision |
|---|---|---|
| Voltaje (V) | 0-250V AC | +-1V |
| Corriente (A) | 0-16A | +-1% |
| Potencia activa (W) | 0-4000W | +-1% |
| Energia acumulada (kWh) | 0-9999.99 kWh | +-1% |
| Frecuencia (Hz) | 45-65 Hz | +-0.5Hz |
| Factor de potencia | 0.00-1.00 | +-2% |

### Bobina CT - Transformador dona encintada

La bobina CT (Current Transformer) mide la corriente que circula por el cable de fase sin necesidad de cortarlo. Se engancha alrededor del cable y genera una senal proporcional en su salida.

| Parametro | Valor tipico |
|---|---|
| Tipo | Dona encintada (toroidal) |
| Relacion de vueltas | 1:1000 a 1:3000 (varia por modelo) |
| Rango | 50A a 200A segun modelo |
| Salida | Corriente AC proporcional |
| Calibracion (EmonLib) | `CT_CALIBRATION = 30.0` (para 100A/50mA con burden 33 ohm) |

**Para calibrar:** mira la etiqueta de la dona (deberia decir "100A:50mA" o "2000:1") y ajusta `CT_CALIBRATION` en el sketch.

### Sketches Arduino

El proyecto incluye **3 sketches** en la carpeta `arduino/`:

#### 1. `esp8266_pzem_ct_monitor/` - Sketch de produccion

Sketch principal que mide con PZEM + CT y envia datos al backend cada 10 segundos.

```cpp
// Configurar al inicio del sketch:
const char* WIFI_SSID     = "TU_RED_WIFI";
const char* WIFI_PASS     = "TU_CLAVE_WIFI";
const char* SERVER_URL    = "http://192.168.1.50:3001";
const String DEVICE_TOKEN = "PEGAR_TOKEN_DEL_SENSOR";
```

#### 2. `test_diagnostico/` - Sketch de pruebas

Ejecuta **4 tests** al encender y muestra resultados en el Monitor Serial (115200 baudios):

| Test | Que verifica |
|---|---|
| **1. Wi-Fi** | Se conecta a tu red |
| **2. PZEM-004T** | Lee voltaje, corriente, potencia, energia, Hz, PF |
| **3. Bobina CT** | Detecta corriente RMS en A0 |
| **4. Backend** | GET `/api/health` + POST `/api/sensor/readings` con datos simulados |

Al final muestra un resumen tipo checklist. Si todo esta OK, pasa a modo monitoreo que envia datos reales cada 10 segundos.

#### 3. `esp32_pzem_monitor/` - Sketch original ESP32 (legacy)

Sketch original para ESP32 + PZEM-004T sin bobina CT. Se mantiene como referencia.

### Como obtener el device_token

1. Abrir la app web en `http://localhost:3000`
2. Ir a **Mis Dispositivos** > **Registrar electrodomestico**
3. Crear el dispositivo
4. Ir al **Detalle del dispositivo** (`/devices/:id`)
5. Copiar el **Token del sensor** con el boton copiar
6. Pegar en el sketch como `DEVICE_TOKEN`

### Librerias necesarias (Arduino IDE)

| Libreria | Proposito | Instalar desde |
|---|---|---|
| **PZEM004Tv30** (by oleh) | Comunicacion con el sensor PZEM-004T v3.0 | Arduino Library Manager |
| **ArduinoJson** | Serializar el JSON que se envia al backend | Arduino Library Manager |
| **EmonLib** | Calcular corriente RMS desde la bobina CT | Arduino Library Manager |
| **SoftwareSerial** | Comunicacion serial con PZEM (ESP8266) | Ya viene en ESP8266 core |
| **ESP8266WiFi** | Conexion WiFi (incluida en ESP8266 core) | Ya viene |
| **ESP8266HTTPClient** | Requests HTTP POST | Ya viene |

### Salida esperada en el Monitor Serial

```
Conectando a WiFi.....
Conectado. IP: 192.168.1.105
Monitor PZEM-004T + CT listo. Leyendo mediciones...
PZEM: V=227.1  A=5.500  W=1249.1  kWh=3.214  Hz=50.0  PF=0.98
CT:   A=2.300  W=522.3
Total: 1771.4 W | 3.214 kWh enviado
[OK 201]
```

---

## Arquitectura Backend

### Stack

| Componente | Tecnologia | Version |
|---|---|---|
| Runtime | Node.js | >= 14 (recomendado 18 LTS) |
| Framework web | Express | 4.17.3 |
| ORM | Sequelize | 6.21.0 |
| Base de datos | PostgreSQL (Supabase) | - |
| Autenticacion | JWT (jsonwebtoken) | 8.5.1 |
| Hash de passwords | bcryptjs | 2.4.3 |
| Validacion | express-validator | 6.15.0 |
| WebSockets | Socket.IO | 4.5.4 |
| IA generativa | @google/generative-ai | 0.21.0 |
| Tareas programadas | node-cron | 3.0.2 |
| Hot reload | nodemon | 2.0.20 |

### Estructura de carpetas

```
backend/
├── seeds/
│   └── seed.js                  # Datos iniciales (provincias, tarifas, usuario demo)
├── src/
│   ├── config/
│   │   ├── database.js          # Conexion a Supabase PostgreSQL via Sequelize
│   │   └── migrate.js           # Script de migracion de tablas
│   ├── controllers/             # Logica de negocio por modulo
│   │   ├── authController.js    # Login, registro, JWT
│   │   ├── deviceController.js  # CRUD dispositivos + device_token
│   │   ├── consumptionController.js  # Lecturas de consumo
│   │   ├── invoiceController.js      # Facturas
│   │   ├── alertController.js        # Alertas
│   │   ├── predictionController.js   # Prediccion IA + forecast de boleta
│   │   ├── tariffController.js       # Tarifas por provincia
│   │   ├── dashboardController.js    # KPIs del dashboard
│   │   ├── aiController.js           # Asistente IA, recomendaciones, insights
│   │   └── sensorController.js       # Ingesta de lecturas del ESP8266
│   ├── middleware/
│   │   ├── auth.js              # JWT + authenticateSensor (token de dispositivo)
│   │   ├── rateLimit.js         # Limite de intentos: 5 en register / 15 en login por IP cada 15 min
│   │   ├── security.js          # Headers de seguridad HTTP (nosniff, DENY, Permissions-Policy, etc.)
│   │   ├── errorHandler.js      # Manejo centralizado de errores
│   │   └── validate.js          # Wrapper de express-validator
│   ├── models/                  # 11 modelos Sequelize
│   │   ├── User.js
│   │   ├── Province.js
│   │   ├── DeviceCategory.js
│   │   ├── Appliance.js         # Catalogo de electrodomesticos predefinidos
│   │   ├── Device.js            # Incluye device_token y last_seen_at
│   │   ├── ConsumptionReading.js
│   │   ├── Invoice.js
│   │   ├── Alert.js
│   │   ├── Tariff.js
│   │   ├── Prediction.js
│   │   ├── Recommendation.js    # Recomendaciones generadas por IA
│   │   └── index.js             # Asociaciones entre modelos
│   ├── routes/                  # 11 archivos de rutas
│   │   ├── auth.js
│   │   ├── devices.js
│   │   ├── appliances.js
│   │   ├── consumption.js
│   │   ├── invoices.js
│   │   ├── alerts.js
│   │   ├── tariffs.js
│   │   ├── predictions.js
│   │   ├── dashboard.js
│   │   ├── ai.js
│   │   └── sensor.js            # POST /api/sensor/readings (device token)
│   ├── services/                # Servicios de calculo
│   │   ├── tariffService.js
│   │   ├── predictionService.js # Motor de prediccion IA (consumo + boleta)
│   │   ├── alertService.js
│   │   └── aiService.js         # Integracion Google Gemini + fallback local
│   ├── validators/
│   ├── utils/
│   └── server.js                # Punto de entrada (express + socket.io + cron)
├── .env                         # Variables de entorno (NO se sube a git)
├── .env.example                 # Template de variables (si se sube a git)
└── package.json
```

### Autenticacion - Dos tipos de token

**1. JWT (usuarios):**
- Se genera al hacer login/registro
- Se envia en header `Authorization: Bearer <jwt_token>`
- Validado por middleware `authenticateToken`
- Expira en 7 dias

**2. Device Token (sensor IoT):**
- Se genera automaticamente al crear un dispositivo
- Es un string hex de 48 caracteres (`crypto.randomBytes(24).toString('hex')`)
- Se envia en header `Authorization: Bearer <device_token>`
- Validado por middleware `authenticateSensor`
- No expira, se puede regenerar desde la web
- Identifica automaticamente al dispositivo y al usuario

### Cron jobs

```javascript
// Chequeo horario de alertas (cada hora en punto)
cron.schedule('0 * * * *', async () => {
  // 1. Buscar todos los usuarios activos
  // 2. Para cada uno: checkThreshold + checkPeakDetection
  // 3. Si hay alerta nueva -> emitir por Socket.IO
});
```

### sensorController.js - Ingesta IoT

```javascript
// POST /api/sensor/readings
// Headers: Authorization: Bearer <device_token>
// Body:
{
  "instant_watts": 1249.1,      // Potencia instantanea
  "accumulated_kwh_day": 3.214, // Energia acumulada del dia
  "voltage": 227.1,             // Tension (PZEM)
  "current": 5.500,             // Corriente total (PZEM + CT)
  "frequency": 50.0,            // Frecuencia de red
  "power_factor": 0.98          // Factor de potencia
}
```

---

## Arquitectura Frontend

### Stack

| Componente | Tecnologia | Version |
|---|---|---|
| Framework UI | React | 18.2.0 |
| Routing | react-router-dom | 6.20.0 |
| HTTP client | Axios | 1.6.2 |
| Graficos | Recharts | 2.10.3 |
| Iconos | Lucide React | 0.294.0 |
| Notificaciones | react-hot-toast | 2.4.1 |
| WebSockets | socket.io-client | 4.7.5 |
| Fechas | date-fns | 2.30.0 |

### 14 Paginas

| Pagina | Ruta | Descripcion |
|---|---|---|
| **HomePage** | `/` | Landing publica con descripcion del proyecto |
| **LoginPage** | `/login` | Inicio de sesion con credenciales de demo |
| **RegisterPage** | `/register` | Registro de nuevo usuario |
| **DashboardPage** | `/dashboard` | Panel principal con KPIs en tiempo real |
| **DevicesPage** | `/devices` | Listado de dispositivos + asistente de 3 pasos |
| **DeviceDetailPage** | `/devices/:id` | Detalle + token sensor + instrucciones ESP8266 |
| **ConsumptionPage** | `/consumption` | Graficos de consumo + historial de lecturas |
| **InvoicesPage** | `/invoices` | Comparacion de facturas mes a mes |
| **AlertsPage** | `/alerts` | Centro de alertas con filtros |
| **PredictionsPage** | `/predictions` | Prediccion IA de la boleta proximo mes |
| **TariffsPage** | `/tariffs` | Tarifas por provincia + calculadora |
| **ProfilePage** | `/profile` | Gestion de perfil y provincia |
| **AssistantPage** | `/assistant` | Chat con asistente IA (Gemini o local) |
| **RecommendationsPage** | `/recommendations` | Recomendaciones personalizadas de ahorro |

### 5 Contextos

| Contexto | Archivo | Funcion |
|---|---|---|
| **AuthContext** | `context/AuthContext.js` | Manejo de JWT, login/logout, usuario actual |
| **ThemeContext** | `context/ThemeContext.js` | Toggle modo oscuro/claro, preferencia guardada |
| **SocketContext** | `context/SocketContext.js` | Conexion Socket.IO, notificaciones en vivo |
| **LanguageContext** | `context/LanguageContext.js` | Internacionalizacion ES/EN, toggle idioma |
| **ManualTimerContext** | `context/ManualTimerContext.js` | Cronometros manuales persistentes (localStorage) y multi-dispositivo |

### Componentes compartidos

| Componente | Archivo | Funcion |
|---|---|---|
| **Header** | `components/layout/Header.js` | Barra superior con toggle idioma (ES/EN), usuario, notificaciones |
| **Sidebar** | `components/layout/Sidebar.js` | Navegacion lateral con etiquetas traducidas |
| **LoadingSpinner** | `components/common/LoadingSpinner.js` | Indicador de carga traducido |
| **DeviceFormModal** | `components/devices/DeviceFormModal.js` | Asistente de 3 pasos para registrar dispositivos |

### Tiempo real (Socket.IO)

```
Frontend (React)  <──── Socket.IO ────  Backend (Express)
     │                                        │
     │  on('reading:new')                     │  sensorController.addReading()
     │  on('alert:new')                       │    -> io.to(`user-${id}`).emit(...)
     │  on('recommendation:new')              │
     │                                        │
     │  Actualiza dashboard                   │
     │  Muestra toast notification            │
```

---

## Base de datos

### Diagrama Entidad-Relacion

```
provinces 1────N users 1────N devices 1────N consumption_readings
   │                                       │
   └────1────N tariffs                 belongs_to
                                 
users 1────N invoices
users 1────N alerts ────N────1 devices
users 1────N predictions
users 1────N recommendations

device_categories 1────N devices
device_categories 1────N appliances     (catalogo de electrodomesticos)
```

### Modelos

| Modelo | Descripcion | Campos clave |
|---|---|---|
| **User** | Usuarios del sistema | name, email, password_hash, user_type, province_id, alert_threshold_kwh |
| **Province** | Provincias argentinas | name, distributor_name, regulator_name (OCEBA, EPRE, etc.) |
| **DeviceCategory** | Categorias de dispositivos | name, icon, default_power, avg_daily_hours |
| **Appliance** | Catalogo de 116 electrodomesticos | category_id, name, nominal_watts, min_watts, max_watts, hours_daily_usage |
| **Device** | Dispositivos del usuario | name, model, category_id, user_id, is_active, **device_token**, **last_seen_at** |
| **ConsumptionReading** | Lecturas de consumo | instant_watts, accumulated_kwh_day, voltage, current, frequency, power_factor, source (manual/sensor/simulated) |
| **Invoice** | Facturas de energia | period_month, period_year, kwh_consumed, amount_paid, tariff_applied |
| **Alert** | Alertas del sistema | alert_type, title, message, severity (info/warning/critical), is_read |
| **Tariff** | Tarifas por provincia | category (R1-R9), tier_from/tier_to en kWh, fixed_charge, price_per_kwh (N1), price_per_kwh_n2, price_per_kwh_n3, estimados por nivel |
| **Prediction** | Predicciones IA | predicted_kwh, predicted_cost, confidence, target_month, target_year |
| **Recommendation** | Recomendaciones de ahorro | title, description, category, priority, potential_savings_kwh, potential_savings_cost, status, source (ai/local) |

### Datos semilla

- **24 jurisdicciones** (22 provincias + CABA + Buenos Aires Interior): cada una con su distribuidora y regulador (ENRE, OCEBA, EPRE, SECHEEP, DPEC, ERSEP, EPE, etc.)
- **7 categorias**: Refrigeracion, Climatizacion, Iluminacion, Entretenimiento, Cocina, Lavado, Otros
- **116 electrodomesticos** del catalogo
- **112 tarifas**: Categorias R1-R9 con cargo fijo mensual, cargos variables por nivel de subsidio (N1/N2/N3) y total estimado por rango
- **1 usuario demo**: demo@controlar.com / 123456
- **6 dispositivos** con lecturas simuladas y token de sensor asignado
- **930 lecturas de consumo** (junio-julio 2026)
- **2 facturas**, **3 alertas** de ejemplo y **3 recomendaciones** de ahorro

---

## Stack tecnologico

### Backend

| Componente | Tecnologia | Version |
|---|---|---|
| Runtime | Node.js | >= 14 (recomendado 18 LTS) |
| Framework web | Express | 4.17.3 |
| ORM | Sequelize | 6.21.0 |
| Base de datos | PostgreSQL (Supabase) | - |
| Autenticacion | JWT (jsonwebtoken) | 8.5.1 |
| Hash de passwords | bcryptjs | 2.4.3 |
| Validacion | express-validator | 6.15.0 |
| WebSockets | Socket.IO | 4.5.4 |
| IA generativa | @google/generative-ai | 0.21.0 |
| Tareas programadas | node-cron | 3.0.2 |
| Hot reload | nodemon | 2.0.20 |

### Frontend

| Componente | Tecnologia | Version |
|---|---|---|
| Framework UI | React | 18.2.0 |
| Routing | react-router-dom | 6.20.0 |
| HTTP client | Axios | 1.6.2 |
| Graficos | Recharts | 2.10.3 |
| Iconos | Lucide React | 0.294.0 |
| Notificaciones | react-hot-toast | 2.4.1 |
| WebSockets | socket.io-client | 4.7.5 |
| Utilidades de fecha | date-fns | 2.30.0 |

### IoT / Hardware

| Componente | Tecnologia |
|---|---|
| Microcontrolador | ESP8266MOD (ESP-12F) |
| Sensor de energia | PZEM-004T v3.0 |
| Sensor de corriente | Bobina CT / Transformador dona encintada |
| IDE | Arduino IDE (o PlatformIO) |
| Libreria sensor | PZEM004Tv30 (by oleh) |
| Libreria CT | EmonLib |
| Libreria JSON | ArduinoJson |

---

## Estructura del proyecto

```
VolksWagem---Mentoria/
├── backend/
│   ├── seeds/
│   │   └── seed.js
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   └── migrate.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── consumptionController.js
│   │   │   ├── dashboardController.js
│   │   │   ├── deviceController.js
│   │   │   ├── invoiceController.js
│   │   │   ├── alertController.js
│   │   │   ├── predictionController.js
│   │   │   ├── tariffController.js
│   │   │   ├── aiController.js
│   │   │   └── sensorController.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── rateLimit.js
│   │   │   ├── security.js
│   │   │   ├── errorHandler.js
│   │   │   └── validate.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Province.js
│   │   │   ├── DeviceCategory.js
│   │   │   ├── Appliance.js
│   │   │   ├── Device.js
│   │   │   ├── ConsumptionReading.js
│   │   │   ├── Invoice.js
│   │   │   ├── Alert.js
│   │   │   ├── Tariff.js
│   │   │   ├── Prediction.js
│   │   │   ├── Recommendation.js
│   │   │   └── index.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── devices.js
│   │   │   ├── appliances.js
│   │   │   ├── consumption.js
│   │   │   ├── invoices.js
│   │   │   ├── alerts.js
│   │   │   ├── tariffs.js
│   │   │   ├── predictions.js
│   │   │   ├── dashboard.js
│   │   │   ├── ai.js
│   │   │   └── sensor.js
│   │   ├── services/
│   │   │   ├── tariffService.js
│   │   │   ├── predictionService.js
│   │   │   ├── alertService.js
│   │   │   └── aiService.js
│   │   ├── validators/
│   │   ├── utils/
│   │   └── server.js
│   ├── .env
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/
│   │   │   ├── common/
│   │   │   ├── devices/
│   │   │   └── layout/
│   │   ├── context/
│   │   │   ├── AuthContext.js
│   │   │   ├── ThemeContext.js
│   │   │   ├── SocketContext.js
│   │   │   └── LanguageContext.js
│   │   ├── i18n/
│   │   │   └── translations.js
│   │   ├── pages/ (14 paginas)
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── styles/
│   │   │   └── App.css
│   │   ├── App.js
│   │   └── index.js
│   ├── .env
│   ├── .env.example
│   └── package.json
├── arduino/
│   ├── esp8266_pzem_ct_monitor/
│   │   └── esp8266_pzem_ct_monitor.ino   # Sketch produccion
│   ├── test_diagnostico/
│   │   └── test_diagnostico.ino           # Sketch diagnosticos
│   └── esp32_pzem_monitor/
│       └── esp32_pzem_monitor.ino         # Sketch legacy ESP32
├── start.bat
├── start.ps1
├── start.sh
├── fix_postgres.bat
├── README.md
└── .gitignore
```

---

## Requisitos previos

| Requisito | Version minima | Verificar con |
|---|---|---|
| **Node.js** | >= 14 (recomendado 18 LTS) | `node -v` |
| **npm** | >= 6.x | `npm -v` |
| **Git** | Cualquier version | `git --version` |
| **Arduino IDE** | 1.8+ o 2.x | Para flashear el ESP8266 |
| **PostgreSQL** (solo forma sin internet) | >= 12 | `psql --version` |

---

## Instalacion y ejecucion

### Forma 1: CON internet (Supabase en la nube)

#### Paso 1 - Clonar el repositorio

```powershell
git clone https://github.com/charcaezequiel/VolksWagem---Mentoria.git
cd VolksWagem---Mentoria
```

#### Paso 2 - Instalar Node.js (si no lo tenes)

1. Ir a https://nodejs.org
2. Descargar la version **LTS** (18 o superior)
3. Instalar con las opciones por defecto
4. Verificar:

```powershell
node -v    # Deberia mostrar v18.x.x o superior
npm -v     # Deberia mostrar 9.x.x o superior
```

#### Paso 3 - Configurar el backend

```powershell
cd backend
npm install
copy .env.example .env
```

Editar `backend/.env` con la configuracion de la base de datos (ver [Variables de entorno](#variables-de-entorno)).

#### Paso 4 - Crear la base de datos en Supabase

```powershell
npm run db:reset
```

Esto crea 11 tablas y carga los datos iniciales (provincias, tarifas, catalogo, usuario demo).

#### Paso 5 - Arrancar el backend

```powershell
npm run dev
```

Deberias ver:
```
Database connected.
Database synchronized.
Server running on port 3001 (0.0.0.0)
```

#### Paso 6 - Arrancar el frontend (segunda terminal)

```powershell
cd frontend
npm install
echo DISABLE_ESLINT_PLUGIN=true > .env
npm start
```

Se abrira el navegador en `http://localhost:3000`.

#### Paso 7 - Iniciar sesion

1. Ir a `http://localhost:3000/login`
2. Email: `demo@controlar.com` / Contrasena: `123456`

---

### Forma 2: SIN internet (PostgreSQL local)

#### Paso 1 - Copiar el proyecto con node_modules

Copiar la carpeta completa (con `node_modules` ya instalados) a la PC sin internet.

#### Paso 2 - Verificar PostgreSQL

```powershell
psql --version
Get-Service postgresql*
```

#### Paso 3 - Configurar backend para PostgreSQL local

```powershell
cd backend
copy .env.example .env
```

Editar `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=controlar_energia
DB_USER=postgres
DB_PASSWORD=postgres
```

#### Paso 4 - Crear base de datos

```powershell
npm run db:reset
```

#### Paso 5 - Arrancar backend y frontend

```powershell
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm start
```

---

### Forma 3: Inicio automatico

```powershell
# Windows:
.\start.bat

# Linux/macOS:
chmod +x start.sh && ./start.sh
```

---

### Comandos utiles del Backend

| Comando | Descripcion |
|---|---|
| `npm run dev` | Arranca el servidor con hot-reload (nodemon) |
| `npm start` | Arranca el servidor en modo produccion |
| `npm run db:migrate` | Ejecuta la migracion de tablas |
| `npm run db:seed` | Carga datos iniciales |
| `npm run db:reset` | Resetea la base: migra + seed |

### Verificar que funciona

```powershell
# Health check del backend
Invoke-WebRequest -Uri "http://localhost:3001/api/health"

# Abrir en el navegador
start http://localhost:3000
```

### Acceso desde otros dispositivos en la red

```
Desde otra PC o Notebook:
  Frontend: http://LA_IP_DE_ESTA_PC:3000
  Backend:  http://LA_IP_DE_ESTA_PC:3001
```

---

## Credenciales de demostracion

| Campo | Valor |
|---|---|
| Email | `demo@controlar.com` |
| Contrasena | `123456` |

> **Nota:** la contrasena del usuario demo `123456` no cumple la nueva politica de registro (8+ caracteres, mayus/minus/num/simbolo) pero fue cargada directamente por el seed. Los nuevos registros deben seguir la politica.

El usuario demo viene con:
- 6 dispositivos pre-cargados
- 930 lecturas de consumo historicas (junio-julio 2026)
- 2 facturas de energia
- 3 alertas
- Provincia: Buenos Aires (OCEBA)
- 3 recomendaciones de ahorro

---

## API REST - Endpoints

Todas las rutas (excepto auth) requieren header `Authorization: Bearer <token>`.

### Autenticacion

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/api/auth/register` | Registrar usuario. Body: `name`, `email`, `password`, `confirmPassword` (obligatorio y debe coincidir), `province_id` opcional. Requiere contrasena segura (8+ chars, mayus, minus, numero y simbolo). Limitado a 5 intentos por IP cada 15 min |
| POST | `/api/auth/login` | Iniciar sesion |
| GET | `/api/auth/profile` | Obtener perfil del usuario |
| PUT | `/api/auth/profile` | Actualizar perfil |

### Dispositivos

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/devices` | Listar dispositivos del usuario |
| POST | `/api/devices` | Crear nuevo dispositivo (genera device_token) |
| PUT | `/api/devices/:id` | Actualizar dispositivo |
| DELETE | `/api/devices/:id` | Eliminar dispositivo |
| GET | `/api/devices/:id/readings` | Lecturas del dispositivo |
| POST | `/api/devices/:id/regenerate-token` | Regenerar token del sensor |

### Catalogo de electrodomesticos

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/appliances` | Listar todos los electrodomesticos |
| GET | `/api/appliances/by-category` | Agrupados por categoria |

### Consumo

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/consumption/readings` | Obtener lecturas de consumo |
| POST | `/api/consumption/readings` | Registrar nueva lectura |
| GET | `/api/consumption/realtime` | Consumo en tiempo real |
| GET | `/api/consumption/live` | Ultima lectura de cada dispositivo (snapshot para las tarjetas en vivo) |
| GET | `/api/consumption/summary` | Resumen de consumo |
| GET | `/api/consumption/by-device` | Consumo por dispositivo |

### Facturas

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/invoices` | Listar facturas |
| POST | `/api/invoices` | Registrar nueva factura |
| GET | `/api/invoices/comparison` | Comparacion mensual |

### Alertas

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/alerts` | Listar alertas |
| GET | `/api/alerts/unread-count` | Cantidad sin leer |
| PUT | `/api/alerts/:id/read` | Marcar como leida |
| PUT | `/api/alerts/read-all` | Marcar todas como leidas |
| POST | `/api/alerts` | Crear alerta manual |
| DELETE | `/api/alerts/:id` | Eliminar alerta |

### Predicciones

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/predictions` | Obtener predicciones |
| POST | `/api/predictions/generate` | Generar nueva prediccion |
| GET | `/api/predictions/bill-forecast` | Pronostico de la boleta |
| GET | `/api/predictions/accuracy` | Precision del modelo |
| GET | `/api/predictions/anomalies` | Deteccion de anomalias |

### Tarifas

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/tariffs` | Listar tarifas |
| POST | `/api/tariffs` | Crear tarifa |
| GET | `/api/tariffs/province/:id` | Tarifas por provincia |
| GET | `/api/tariffs/provinces` | Listar provincias |
| GET | `/api/tariffs/estimate?province_id=&kwh=&subsidy=` | Estimar costo por consumo, cargo fijo y nivel de subsidio (N1/N2/N3) |

### Dashboard

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/dashboard/overview` | KPIs principales |
| GET | `/api/dashboard/daily` | Consumo diario |
| GET | `/api/dashboard/monthly` | Consumo mensual |
| GET | `/api/dashboard/device-breakdown` | Desglose por dispositivo |

### Inteligencia Artificial

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/ai/status` | Estado del proveedor IA |
| POST | `/api/ai/chat` | Chat con el asistente |
| GET | `/api/ai/insights` | Analisis del consumo |
| GET | `/api/ai/recommendations` | Listar recomendaciones |
| POST | `/api/ai/recommendations/generate` | Generar recomendaciones |
| PUT | `/api/ai/recommendations/:id` | Actualizar estado |
| DELETE | `/api/ai/recommendations/:id` | Eliminar recomendacion |

### Sensor IoT (ESP8266)

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/api/sensor/readings` | Alta de lectura del sensor. Auth con **device_token** |

### Health Check

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/health` | Estado del servidor |

---

## Variables de entorno

### Backend (`backend/.env`)

```env
NODE_ENV=development
PORT=3001
DB_HOST=DB_HOST_SUPABASE.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=TU_PASSWORD_SUPABASE
DB_SSL_REJECT_UNAUTHORIZED=true
# DB_SSL_CA=backend/certs/supabase-ca.pem   # opcional, solo si el hosting pide un CA custom
JWT_SECRET=random_string_de_minimo_32_caracteres
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
GEMINI_API_KEY=tu_api_key_aqui
GEMINI_MODEL=gemini-3.6-flash
```

> Los valores reales estan en `backend/.env` (NO se sube a git). No compartas el `.env` ni credenciales en el README.
>
> **Seguridad del certificado TLS:** por defecto el backend verifica el certificado de Supabase (`rejectUnauthorized: true`). Si tu proveedor usa un certificado con CA propio, guarda el cert en un archivo y apunta `DB_SSL_CA`. Solo si la conexion falla por certificado autofirmado y no podes agregar el CA, seteá `DB_SSL_REJECT_UNAUTHORIZED=false`.
>
> Para PostgreSQL local, cambiar `DB_HOST=localhost` y ajustar credenciales.

### Frontend (`frontend/.env`)

```env
DISABLE_ESLINT_PLUGIN=true
```

---

## Internacionalizacion (i18n)

El sistema incluye soporte bilingue **Espanol (ES) / Ingles (EN)** con toggle en el header.

### Archivos

| Archivo | Funcion |
|---|---|
| `frontend/src/i18n/translations.js` | Todas las traducciones (~500+ claves en ES y EN) |
| `frontend/src/context/LanguageContext.js` | Contexto + hook `useTranslation()` + `toggleLang()` |

### Como usar en componentes

```javascript
import { useTranslation } from '../context/LanguageContext';

function MiComponente() {
  const { t } = useTranslation();
  return <h1>{t('dashboard.title')}</h1>;
}
```

### Alcance

- **14 paginas** traducidas completamente
- **Header** con toggle de idioma (boton globe)
- **Sidebar** con etiquetas de navegacion traducidas
- **Modales** (DeviceFormModal) y **LoadingSpinner** traducidos
- Idioma persistido en `localStorage`
- Correccion de tildes: "En linea" -> "En linea", "Sin conexion" -> "Sin conexion"
- **Backend bilingue**: chat, insights, recomendaciones, predicciones, anomalias y alertas se traducen segun el header `Accept-Language` (ver `backend/src/utils/i18n.js`)

---

## Cambios recientes

### 24/09/2026 - Consumo por dispositivo en tiempo real (sensor IoT + socket)

- Nuevo endpoint **`GET /api/consumption/live`**: ultima lectura de cada dispositivo (query agrupada por `MAX(reading_timestamp)`, compatible PostgreSQL).
- **ConsumptionPage**: grilla de tarjetas en vivo por dispositivo (punto pulsante, badge "EN VIVO" / "Sin datos recientes" con ventana de 60s, watts actuales, kWh del dia y hora de actualizacion). La tarjeta "Consumo actual" suma los watts en vivo de todos los sensores.
- El frontend se suscribe al evento Socket.IO **`reading:new`** y actualiza la grilla, la tarjeta actual y el historial de lecturas **sin recargar la pagina**.
- **DeviceDetailPage**: la potencia actual y la ultima medicion se actualizan en tiempo real por socket, con punto pulsante.

### 24/09/2026 - Estado "En suspenso" cuando el sensor reporta 0 W

- Si el sensor esta conectado (lectura reciente) pero la ultima lectura es **0 W**, la tarjeta de potencia y el estado del sensor muestran **"Conectado · En suspenso"** (chip y punto ambar pulsante), manteniendo el indicador de que sigue conectado.
- En las tarjetas en vivo del consumo, el badge pasa a **"EN SUSPENSO"** con el hint "Sin carga detectada" cuando la lectura fresca es <= 0.5 W.

### 24/09/2026 - Cronometro manual persistente y multi-dispositivo

- Nuevo contexto global **`ManualTimerContext`** con persistencia en `localStorage` (`controlar.manual_timers` / `controlar.manual_results`): el cronometro **sigue contando aunque navegues a otra pagina o recargues** (el tiempo se calcula siempre desde `startAt`).
- Se pueden medir **varios dispositivos a la vez** (N cronometros simultaneos).
- Resultados de la sesion conservados (ultimas 20) con descarte individual y vaciado completo; cada resultado se puede guardar como lectura manual (`source: manual`).

### 24/09/2026 - Lista de electrodomesticos mas clara (wizard paso 2)

- Tarjetas del catalogo con separacion clara entre nombre, consumo y horas/dia, chip de potencia rotulado (`device_form.power_label`), icono de horas/dia y scrollbar estilizado con estilos responsive.

### 24/09/2026 - Backend 100% bilingue (ES/EN via Accept-Language)

- Middleware de idioma: **chat, insights, recomendaciones, predicciones, anomalias, alertas y meses de las facturas** se responden en el idioma del usuario.
- Diccionario centralizado en `backend/src/utils/i18n.js` (`t`, `MONTHS`, `getLang`, `localizeRecommendation`, `localizeAlert`).
- El frontend envia el idioma por interceptor axios (`Accept-Language` desde `localStorage`); las recomendaciones locales guardadas se retraducen on-the-fly.

### 22/09/2026 - i18n frontend completo + fix visual desglose por categoria

- **Alertas bilingues** (`alertText`), **catalogo de electrodomesticos** bilingue (nuevo `frontend/src/i18n/catalog.js`), navegacion, modales, DataTable y LoadingSpinner traducidos.
- Fix visual del desglose por categoria (PieChart) y correccion de tildes en las traducciones.

### Seguridad base de datos / Supabase

- **TLS verificado por defecto**: la conexion a la BD ahora valida el certificado (`rejectUnauthorized: true`). Soporte de CA propio via `DB_SSL_CA` y escape hatch `DB_SSL_REJECT_UNAUTHORIZED=false`.
- Pool endurecido: `connectionTimeoutMillis: 10000` y `keepAlive: true` en el pool de Sequelize.
- Se elimino el `NODE_TLS_REJECT_UNAUTHORIZED=0` global (deshabilitaba el chequeo SSL de todo Node).

> **Pendiente manual en el panel de Supabase (recomendado):**
> - [ ] Habilitar **SSL Enforcement** (y restringir por IP solo a la de produccion).
> - [ ] Activar **RLS (Row Level Security)** en las tablas y crear policies por `user_id`.
> - [ ] Activar **2FA / MFA** en la cuenta owner de Supabase.
> - [ ] Rotar el `DB_PASSWORD` y `JWT_SECRET` periodicamente.

### Seguridad backend

- **Rate limiting** (`middleware/rateLimit.js`, sin dependencias): max **5 intentos** en `/register` y **15** en `/login` por IP cada 15 min (HTTP 429 con `Retry-After`).
- **Headers de seguridad** (`middleware/security.js`): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` y `Cross-Origin-Resource-Policy`.
- `app.disable('x-powered-by')` y limite de body JSON de `1mb`.
- En produccion el server **no arranca** sin `JWT_SECRET` de al menos 32 caracteres.
- Emails normalizados a minusculas al registrar/login.

### Registro con contrasena segura

- **Politica de contrasena** (valida en backend y frontend): min 8 caracteres, 1 mayuscula, 1 minuscula, 1 numero y 1 simbolo. Max 128.
- **Campo "Confirmar contrasena"**: el backend exige `confirmPassword` y valida que coincida; el frontend muestra error si no.
- **Checklist en vivo**: al tipear la contrasena se listan los requisitos con tildes verdes o cruces rojas; el boton de registro se **deshabilita** hasta cumplir todos y que las contrasenas coincidan.
- Se corrigio el bug que no guardaba la provincia del usuario en el registro (`province_id`).

### Modo manual de medicion (Consumo)

- Cronometro start/stop en la pagina de Consumo para estimar kWh de una sesion y proyectar el costo mensual con la tarifa provincial y nivel de subsidio (N1/N2/N3).
- las lecturas manuales se guardan con `source: 'manual'`.

### Hardware: ESP32 a ESP8266MOD

- El microcontrolador cambio de **ESP32** a **ESP8266MOD** (ESP-12F)
- Comunicacion con PZEM via **SoftwareSerial** en D1/D2 (no mas Serial2)
- Se agrego **bobina CT (dona encintada)** para medicion de corriente adicional
- Nuevo sketch: `esp8266_pzem_ct_monitor.ino`

### Bobina CT integrada

- Transformador dona encintada para medicion de corriente sin cortar el cable
- Usa **EmonLib** para calcular corriente RMS desde A0
- Potencia total = PZEM + CT (correccion para cargas con multiples lineas)

### Internacionalizacion (i18n)

- Sistema de traducciones completo ES/EN (~500+ claves)
- Toggle de idioma en el header (boton globe)
- Persistencia del idioma en localStorage
- Todas las 14 paginas traducidas

### Sketch de diagnosticos

- Nuevo sketch `test_diagnostico.ino` que verifica Wi-Fi, PZEM, CT y Backend por separado
- Muestra resultados tipo checklist en el Monitor Serial
- Modo monitoreo automatico si todos los tests pasan

### Backend: Resolucion DNS

- Modificado `database.js` para resolver IPv6-only de Supabase
- Pendiente: aplicar Connection Pooler URL para IPv4

### Prediccion IA de la boleta

- Motor de predicciones que estima el costo de la boleta del proximo mes
- Regresion lineal + estacionalidad + factor fin de semana
- Tarifas progresivas por rangos de la provincia

### Catalogo de electrodomesticos

- 116 electrodomesticos predefinidos en 7 categorias
- Asistente de 3 pasos para registro rapido de dispositivos

---

## Problemas encontrados y soluciones

### 1. Supabase IPv6-only -> Connection Pooler (resuelto)

**Problema:** `db.sjyzifasyshgcwaleovs.supabase.co` solo tiene registro AAAA (IPv6) y la PC no tiene IPv6 global -> `getaddrinfo ENOTFOUND`.

**Solucion aplicada:** usar el **Session Pooler** de Supabase (IPv4) en `backend/.env`:

```env
DB_HOST=aws-0-us-west-2.pooler.supabase.com
DB_PORT=5432
DB_USER=postgres.sjyzifasyshgcwaleovs
DB_SSL_REJECT_UNAUTHORIZED=false
```

> Notas:
> - `DB_USER` es `postgres.<project-ref>` (el pooler no usa `postgres` a secas).
> - El pooler usa **certificado autofirmado**, por eso `DB_SSL_REJECT_UNAUTHORIZED=false`.
> - Puerto `5432` = modo **session** (recomendado para ORM/Sequelize); `6543` = modo transaction (requiere desactivar prepared statements).

### 2. Autenticacion PostgreSQL (peer authentication)

**Problema:** PostgreSQL usaba autenticacion `peer` por defecto.

**Solucion:** Configurar `pg_hba.conf` para usar autenticacion por contrasena.

### 3. Incompatibilidad de Node.js 12

**Problema:** Node.js v12 incompatible con dependencias modernas.

**Solucion:** Se fijaron versiones compatibles con Node 12 en `package.json`.

### 4. Sequelize sync con enums PostgreSQL

**Problema:** `sequelize.sync({ alter: true })` intentaba recrear tipos enum.

**Solucion:** Cambiar a `sequelize.sync({ force: false })` en `server.js`.

### 5. Proxy ECONNREFUSED

**Problema:** Frontend no conecta al backend si no esta corriendo.

**Solucion:** Asegurarse de que ambos servidores esten arrancados.

### 6. Certificado TLS al conectar con Supabase

**Problema:** El backend verifica el certificado SSL de la BD por defecto (`rejectUnauthorized: true`). Si el hosting usa un certificado autofirmado o con CA no estandar, la conexion falla con `UNABLE_TO_VERIFY_LEAF_SIGNATURE` o `DEPTH_ZERO_SELF_SIGNED_CERT`.

**Soluciones (por orden de preferencia):**
1. **Recomendado:** Exportar el CA cert del hosting y guardarlo, y configurar `DB_SSL_CA=ruta/al/cert.pem` en `.env`.
2. **Alternativa insegura** (solo si no hay otra): setear `DB_SSL_REJECT_UNAUTHORIZED=false` en `.env`. Esto desactiva la verificacion del certificado, similar al comportamiento anterior.

---

## Mejoras a futuro

### Funcionalidad
- Exportacion de reportes en PDF y CSV
- Alertas por email configurables
- Comparacion entre usuarios (anonima) para benchmarks
- Integracion con API de CAMMESA

### Tecnico
- Tests automatizados: Jest + Supertest (backend), React Testing Library (frontend)
- CI/CD: GitHub Actions
- Dockerizacion: Dockerfile + docker-compose.yml
- Documentacion Swagger/OpenAPI
- Migracion a Node 18+

### UX/UI
- Responsive mobile completo
- Onboarding wizard de primera vez

---

## Integrantes del equipo

Practicas Profesionalizantes - Equipo de 6 integrantes

---

## Licencia

Proyecto academico - Practicas Profesionalizantes 2026
