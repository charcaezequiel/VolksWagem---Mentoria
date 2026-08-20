# ControlAR Energia

Sistema web de monitoreo, analisis y prediccion del consumo energetico residencial en Argentina.
Incluye integracion IoT con ESP32 + PZEM-004T para lecturas en tiempo real.

---

## Credenciales Supabase (Base de Datos)

| Campo | Valor |
|---|---|
| **Host** | `db.sjyzifasyshgcwaleovs.supabase.co` |
| **Port** | `5432` |
| **Database** | `postgres` |
| **User** | `postgres` |
| **Password** | `W8hQo6SdtHkBKwfq` |
| **URL completa** | `postgresql://postgres:W8hQo6SdtHkBKwfq@db.sjyzifasyshgcwaleovs.supabase.co:5432/postgres` |

---

## Credenciales de IA (Gemini)

| Campo | Valor |
|---|---|
| **API Key** | `AQ.Ab8RN6KLhk9Ix5oafP5g9UniNMxRvyQCKKgy-yB7DvPCFdNQSg` |
| **Modelo** | `gemini-3.6-flash` |
| **Obtener en** | [Google AI Studio](https://aistudio.google.com) |

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
14. [Cambios recientes](#cambios-recientes)
15. [Problemas encontrados y soluciones](#problemas-encontrados-y-soluciones)
16. [Mejoras a futuro](#mejoras-a-futuro)
17. [Integrantes del equipo](#integrantes-del-equipo)

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

  ┌──────────────┐      WiFi       ┌──────────────────┐
  │   ESP32 +    │ ──────────────> │   Backend API    │
  │  PZEM-004T   │   POST cada     │  (Node.js +      │
  │  (Sensor)    │   30 segundos   │   Express)       │
  │              │                 │   Puerto 3001    │
  │ Mide:        │   JSON:         │                  │
  │ - Voltaje    │   { watts,      │  ┌────────────┐  │
  │ - Corriente  │     kwh,        │  │  Socket.IO │──────> Dashboard en vivo
  │ - Potencia   │     voltage,    │  └────────────┘  │
  │ - Energia    │     current,    │         │        │
  │ - Frecuencia │     freq,       │         ▼        │
  │ - FP         │     pf }        │  ┌────────────┐  │
  └──────────────┘                 │  │  Sequelize │  │
                                   │  │    ORM     │  │
                                   │  └─────┬──────┘  │
                                   └────────┼─────────┘
                                            │
                                            ▼
                                   ┌─────────────────┐
                                   │    Supabase      │
                                   │  (PostgreSQL)    │
                                   │  Host: db.sjyz   │
                                   │  ifasyshgcwa...  │
                                   │  Puerto: 5432    │
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
                                   └─────────────────┘
```

### Flujo de datos en tiempo real

```
ESP32 mide voltaje/corriente/potencia (cada 30s)
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
| 1 | **ESP32** (DevKit V1, WROOM-32) | 1 | Microcontrolador con WiFi. Cualquier placa ESP32 compatible |
| 2 | **Sensor PZEM-004T v3.0** | 1 | Mide tension, corriente, potencia activa, energia acumulada, frecuencia y factor de potencia. Incluye bobina de corriente (CT) interna |
| 3 | **Fuente USB 5V** | 1 | Alimenta el ESP32 (minimo 500mA, recomendado 1A) |
| 4 | **Cables jumper hembra-hembra (dupont)** | 4 | Conexiones entre el PZEM y el ESP32 |
| 5 | **Cable de fase y neutro** | 2 segmentos | Para pasar la linea de 220V por el PZEM |
| 6 | **Caja aislante** (opcional) | 1 | Proteccion y seguridad |

> **ADVERTENCIA:** el PZEM se conecta en serie con la linea electrica de **220V CA**. Cualquier manipulacion debe hacerse con la **llave termica cortada** y, idealmente, por alguien con conocimientos de instalaciones electricas.

### Diagrama de conexiones

```
    ┌─────────────────────┐
    │      ESP32          │
    │   (DevKit V1)       │
    │                     │
    │   GPIO 16 (RX2) ◄──┼──────── RX  ┐
    │   GPIO 17 (TX2) ──►┼──────── TX  │
    │   5V ──────────────┼──────── 5V  ├──── PZEM-004T v3.0
    │   GND ─────────────┼──────── GND ┘
    │                     │
    └─────────────────────┘
                                 │
                          ┌──────┴──────┐
                          │   PZEM-004T │
                          │             │
                          │  L (tornillo)──── Fase 220V (en serie)
                          │  N (tornillo)──── Neutro 220V
                          │             │
                          │  Bobina CT  │──── Cable de fase pasa por el orificio
                          └─────────────┘
```

### Pinout detallado

| Pin del PZEM-004T | Se conecta a | Funcion |
|---|---|---|
| `RX` | **GPIO 16** del ESP32 | Serial2 RX (recibe datos del PZEM) |
| `TX` | **GPIO 17** del ESP32 | Serial2 TX (envia comandos al PZEM) |
| `5V` | **5V** del ESP32 | Alimentacion del sensor |
| `GND` | **GND** del ESP32 | Tierra comun |
| `L` (tornillo) | Fase de la linea 220V | En serie con la carga a medir |
| `N` (tornillo) | Neutro de la linea 220V | Neutro |

### M草dulos que mide el PZEM-004T

| Medicion | Rango | Precision |
|---|---|---|
| Voltaje (V) | 0-250V AC | +-1V |
| Corriente (A) | 0-16A | +-1% |
| Potencia activa (W) | 0-4000W | +-1% |
| Energia acumulada (kWh) | 0-9999.99 kWh | +-1% |
| Frecuencia (Hz) | 45-65 Hz | +-0.5Hz |
| Factor de potencia | 0.00-1.00 | +-2% |

### Configuracion del sketch Arduino

Al inicio de `arduino/esp32_pzem_monitor/esp32_pzem_monitor.ino` hay que completar 4 valores:

```cpp
// 1. Tu red WiFi
const char* WIFI_SSID = "TU_RED_WIFI";
const char* WIFI_PASS = "TU_CLAVE_WIFI";

// 2. URL del backend (la IP de la PC que corre el backend)
const char* SERVER_URL = "http://192.168.1.50:3001";

// 3. Token del sensor (se genera al crear el dispositivo en la web)
const String DEVICE_TOKEN = "PEGAR_TOKEN_DEL_SENSOR";
```

**Como obtener el device_token:**
1. Abrí la app web en `http://localhost:3000`
2. Andá a **Mis Dispositivos** > **Registrar electrodoméstico**
3. Creá el dispositivo
4. Andá al **Detalle del dispositivo** (`/devices/:id`)
5. Copiá el **Token del sensor** con el boton copiar
6. Pegalo en el sketch como `DEVICE_TOKEN`

### Flujo del sensor

```
Setup:
  1. Conectar a WiFi
  2. Configurar NTP (hora Argentina UTC-3)
  3. Iniciar Serial2 (GPIO 16/17) para comunicarse con el PZEM

Loop (cada 30 segundos):
  1. Chequear si cambio el dia → si si, resetear energia acumulada del PZEM
  2. Leer del PZEM: voltaje, corriente, potencia, energia, frecuencia, FP
  3. Armar JSON con los valores
  4. POST a /api/sensor/readings con Authorization: Bearer <DEVICE_TOKEN>
  5. El backend guarda la lectura y emite Socket.IO al dashboard
```

### Librerias necesarias (Arduino IDE)

| Libreria | Proposite | Instalar desde |
|---|---|---|
| **PZEM004Tv30** (by oleh) | Comunicacion con el sensor PZEM-004T v3.0 | Arduino Library Manager |
| **ArduinoJson** | Serializar el JSON que se envia al backend | Arduino Library Manager |
| **WiFi.h** | Conexion WiFi (incluida en ESP32 core) | Ya viene |
| **HTTPClient.h** | Requests HTTP POST (incluida en ESP32 core) | Ya viene |

### Material necesario en el Monitor Serial

```
Conectando a WiFi.....
Conectado. IP: 192.168.1.105
Monitor PZEM-004T listo. Leyendo mediciones...
V=227.1  A=5.500  W=1249.1  kWh=3.214  Hz=50.0  PF=0.98
[OK 201] 1249.1 W | 3.214 kWh enviados
V=226.8  A=5.480  W=1243.0  kWh=3.215  Hz=50.0  PF=0.97
[OK 201] 1243.0 W | 3.215 kWh enviados
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
│   │   └── sensorController.js       # Ingesta de lecturas del ESP32
│   ├── middleware/
│   │   ├── auth.js              # JWT + authenticateSensor (token de dispositivo)
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
  // 3. Si hay alerta nueva → emitir por Socket.IO
});
```

### CORS configurado por IP

El backend acepta conexiones desde cualquier IP de la red local:

```
CORS_ORIGIN=http://localhost:3000,http://192.168.x.x:3000,http://192.168.x.x:3001
```

Los scripts de inicio (`start.bat`, `start.sh`) detectan la IP automaticamente y actualizan el `.env`.

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
| **DeviceDetailPage** | `/devices/:id` | Detalle + token sensor + instrucciones ESP32 |
| **ConsumptionPage** | `/consumption` | Graficos de consumo + historial de lecturas |
| **InvoicesPage** | `/invoices` | Comparacion de facturas mes a mes |
| **AlertsPage** | `/alerts` | Centro de alertas con filtros |
| **PredictionsPage** | `/predictions` | Prediccion IA de la boleta proximo mes |
| **TariffsPage** | `/tariffs` | Tarifas por provincia + calculadora |
| **ProfilePage** | `/profile` | Gestion de perfil y provincia |
| **AssistantPage** | `/assistant` | Chat con asistente IA (Gemini o local) |
| **RecommendationsPage** | `/recommendations` | Recomendaciones personalizadas de ahorro |

### 3 Contextos

| Contexto | Archivo | Funcion |
|---|---|---|
| **AuthContext** | `context/AuthContext.js` | Manejo de JWT, login/logout, usuario actual |
| **ThemeContext** | `context/ThemeContext.js` | Toggle modo oscuro/claro, preferencia guardada |
| **SocketContext** | `context/SocketContext.js` | Conexion Socket.IO, notificaciones en vivo |

### Tiempo real (Socket.IO)

```
Frontend (React)  <──── Socket.IO ────  Backend (Express)
     │                                        │
     │  on('reading:new')                     │  sensorController.addReading()
     │  on('alert:new')                       │    → io.to(`user-${id}`).emit(...)
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
| **Appliance** | Catalogo de 107 electrodomesticos | category_id, name, nominal_watts, min_watts, max_watts, hours_daily_usage |
| **Device** | Dispositivos del usuario | name, model, category_id, user_id, is_active, **device_token**, **last_seen_at** |
| **ConsumptionReading** | Lecturas de consumo | instant_watts, accumulated_kwh_day, voltage, current, frequency, power_factor, source (manual/sensor/simulated) |
| **Invoice** | Facturas de energia | period_month, period_year, kwh_consumed, amount_paid, tariff_applied |
| **Alert** | Alertas del sistema | alert_type, title, message, severity (info/warning/critical), is_read |
| **Tariff** | Tarifas por provincia | range_name (social/normal/alto), price_per_kwh, min_kwh, max_kwh |
| **Prediction** | Predicciones IA | predicted_kwh, predicted_cost, confidence, target_month, target_year |
| **Recommendation** | Recomendaciones de ahorro | title, description, category, priority, potential_savings_kwh, potential_savings_cost, status, source (ai/local) |

### Datos semilla

- **6 provincias**: Buenos Aires (OCEBA), San Juan (EPRE), Cordoba, Santa Fe, Mendoza, Entre Rios
- **7 categorias**: Aire acondicionado, Heladera, Lavarropas, Computadora, Televisor, Cocina, Otros
- **107 electrodomesticos** del catalogo (Refrigeracion, Climatizacion, Iluminacion, Entretenimiento, Cocina, Lavado, Otros)
- **8 tarifas**: Rangos social/normal/alto para OCEBA y EPRE
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
| Microcontrolador | ESP32 (WROOM-32, DevKit V1) |
| Sensor de energia | PZEM-004T v3.0 |
| IDE | Arduino IDE (o PlatformIO) |
| Libreria sensor | PZEM004Tv30 (by oleh) |
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
│   │   │   └── SocketContext.js
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
│   └── esp32_pzem_monitor/
│       └── esp32_pzem_monitor.ino
├── start.bat                    # Windows: doble clic
├── start.ps1                    # PowerShell: setup Windows
├── start.sh                     # Linux/macOS/WSL
├── README.md
└── .gitignore
```

---

## Requisitos previos

- **Node.js** >= 14 (recomendado 18 LTS)
- **npm** >= 6.x
- **Git**
- **Supabase** (ya configurado, no necesita PostgreSQL local)

> Con `start.bat` (Windows) o `start.sh` (Linux/WSL) no es necesario instalar nada manualmente.

---

## Instalacion y ejecucion

### Opcion 1: Inicio automatico (recomendada)

#### Windows

```
Doble clic en start.bat
```

El script automaticamente:
1. Detecta la IP de la red local
2. Configura CORS con esa IP
3. Instala dependencias del backend y frontend
4. Crea tablas y datos iniciales en Supabase (solo la primera vez)
5. Levanta backend (puerto 3001) y frontend (puerto 3000)

#### Linux / macOS / WSL

```bash
chmod +x start.sh
./start.sh
```

Hace lo mismo que start.bat pero para sistemas Unix.

### Opcion 2: Instalacion manual

#### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/VolksWagem---Mentoria.git
cd VolksWagem---Mentoria
```

#### 2. Configurar el Backend

```bash
cd backend

# Instalar dependencias
npm install

# Crear tablas y cargar datos iniciales en Supabase
npm run db:reset

# Arrancar el servidor (puerto 3001)
npm run dev
```

#### 3. Configurar el Frontend (otra terminal)

```bash
cd frontend

# Instalar dependencias
npm install

# Arrancar el servidor de desarrollo (puerto 3000)
npm start
```

#### 4. Abrir en el navegador

```
http://localhost:3000
```

### Comandos utiles del Backend

| Comando | Descripcion |
|---|---|
| `npm run dev` | Arranca el servidor con hot-reload (nodemon) |
| `npm start` | Arranca el servidor en modo produccion |
| `npm run db:migrate` | Ejecuta la migracion de tablas |
| `npm run db:seed` | Carga datos iniciales |
| `npm run db:reset` | Resetea la base: migra + seed |

### Verificar que funciona

```bash
# Health check del backend
curl http://localhost:3001/api/health
# Respuesta: {"status":"ok","timestamp":"2026-..."}

# Abrir en el navegador
start http://localhost:3000
```

### Acceso desde otros dispositivos en la red

```
Desde otra PC o Notebook:
  Frontend: http://LA_IP_DE_ESTA_PC:3000
  Backend:  http://LA_IP_DE_ESTA_PC:3001
```

Los scripts de inicio muestran la IP detectada al arrancar.

---

## Credenciales de demostracion

| Campo | Valor |
|---|---|
| Email | `demo@controlar.com` |
| Contrasena | `123456` |

El usuario demo viene con:
- 6 dispositivos pre-cargados (aire acondicionado, heladera, lavarropas, computadora, heladera No Frost, televisor)
- 930 lecturas de consumo historicas (junio-julio 2026)
- 2 facturas de energia
- 3 alertas (pico de consumo, anomalia, umbral superado)
- Provincia: Buenos Aires (OCEBA)
- 3 recomendaciones de ahorro

---

## API REST - Endpoints

Todas las rutas (excepto auth) requieren header `Authorization: Bearer <token>`.

### Autenticacion

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/api/auth/register` | Registrar nuevo usuario |
| POST | `/api/auth/login` | Iniciar sesion |
| GET | `/api/auth/profile` | Obtener perfil del usuario |
| PUT | `/api/auth/profile` | Actualizar perfil |

### Dispositivos

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/devices` | Listar dispositivos del usuario |
| POST | `/api/devices` | Crear nuevo dispositivo (genera device_token automaticamente) |
| PUT | `/api/devices/:id` | Actualizar dispositivo |
| DELETE | `/api/devices/:id` | Eliminar dispositivo |
| GET | `/api/devices/:id/readings` | Lecturas del dispositivo con estadisticas |
| POST | `/api/devices/:id/regenerate-token` | Regenerar el token del sensor |

### Catalogo de electrodomesticos

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/appliances` | Listar todos los electrodomesticos |
| GET | `/api/appliances/by-category` | Agrupados por categoria (para alta rapida) |

### Consumo

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/consumption/readings` | Obtener lecturas de consumo |
| POST | `/api/consumption/readings` | Registrar nueva lectura |
| GET | `/api/consumption/realtime` | Consumo en tiempo real |
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
| GET | `/api/alerts/unread-count` | Cantidad sin leer (badge del header) |
| PUT | `/api/alerts/:id/read` | Marcar como leida |
| PUT | `/api/alerts/read-all` | Marcar todas como leidas |
| POST | `/api/alerts` | Crear alerta manual |
| DELETE | `/api/alerts/:id` | Eliminar alerta |

### Predicciones

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/predictions` | Obtener predicciones |
| POST | `/api/predictions/generate` | Generar nueva prediccion |
| GET | `/api/predictions/bill-forecast` | Pronostico de la boleta del proximo mes |
| GET | `/api/predictions/accuracy` | Precision del modelo |
| GET | `/api/predictions/anomalies` | Deteccion de anomalias |

### Tarifas

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/tariffs` | Listar tarifas |
| POST | `/api/tariffs` | Crear tarifa |
| GET | `/api/tariffs/province/:id` | Tarifas por provincia |
| GET | `/api/tariffs/provinces` | Listar provincias |

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
| GET | `/api/ai/status` | Estado del proveedor IA: gemini o local |
| POST | `/api/ai/chat` | Chat con el asistente |
| GET | `/api/ai/insights` | Analisis del consumo |
| GET | `/api/ai/recommendations` | Listar recomendaciones |
| POST | `/api/ai/recommendations/generate` | Generar recomendaciones |
| PUT | `/api/ai/recommendations/:id` | Actualizar estado |
| DELETE | `/api/ai/recommendations/:id` | Eliminar recomendacion |

### Sensor IoT (ESP32)

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/api/sensor/readings` | Alta de lectura del sensor. Auth con **device_token** en header. Body: `{ instant_watts, accumulated_kwh_day, voltage, current, frequency, power_factor }` |

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
DB_HOST=db.sjyzifasyshgcwaleovs.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=W8hQo6SdtHkBKwfq
JWT_SECRET=controlar_f54e219e79ea42232848b50b78a6b0dd
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000,http://TU_IP:3000
GEMINI_API_KEY=AQ.Ab8RN6KLhk9Ix5oafP5g9UniNMxRvyQCKKgy-yB7DvPCFdNQSg
GEMINI_MODEL=gemini-3.6-flash
```

### Frontend (`frontend/.env`)

```env
DISABLE_ESLINT_PLUGIN=true
```

---

## Cambios recientes

### Catalogo de electrodomesticos

Para facilitar el alta de dispositivos, el sistema incluye un **catalogo de 107 electrodomesticos** predefinidos, agrupados en 7 categorias.

**Como funciona:** en la pagina Mis Dispositivos, el boton "Registrar electrodomestico" abre un **asistente de 3 pasos**:
1. El usuario elige la **categoria** en una grilla visual
2. Busca y selecciona el **electrodomestico del catalogo** (se completan solos los watts y horas de uso)
3. Confirma los datos antes de guardar

### Prediccion IA de la boleta

El motor de predicciones estima **cuanto va a costar la boleta del proximo mes**:
1. Toma lecturas de los ultimos 90 dias
2. Aplica **regresion lineal** sobre los ultimos 30 dias
3. Combina con **estacionalidad mensual** y **factor fin de semana**
4. Genera pronostico dia a dia para todo el proximo mes
5. Calcula el **costo** aplicando tarifas progresivas por rangos de la provincia

### Sensor IoT

- El ESP32 + PZEM-004T mide y envia datos cada 30 segundos
- Usa **device_token** (no JWT) para autenticarse
- El backend guarda la lectura y emite por Socket.IO
- El dashboard se actualiza en vivo con los nuevos datos
- La energia acumulada se reinicia a medianoche (hora Argentina)

### Asistente IA

- Chat conversacional que conoce tus datos reales
- Con **Google Gemini** configurado usa el modelo real
- Sin API key, un **motor local** responde con heuristicas
- Recomendaciones personalizadas de ahorro con ahorro estimado en kWh y pesos

### Modo oscuro

Toggle en el header que guarda la preferencia en el navegador y respeta la preferencia del sistema.

---

## Problemas encontrados y soluciones

### 1. Error de autenticacion PostgreSQL (peer authentication)

**Problema**: PostgreSQL usaba autenticacion `peer` por defecto.

**Solucion**: Configurar `pg_hba.conf` para usar autenticacion por contraseña:
```sql
ALTER USER postgres WITH PASSWORD 'postgres';
```

### 2. Incompatibilidad de Node.js 12 con dependencias modernas

**Problema**: Node.js v12.22.12 incompatible con versiones recientes de npm packages.

**Solucion**: Se fijaron versiones compatibles con Node 12 en `package.json`.

### 3. Error de Sequelize sync con enums PostgreSQL

**Problema**: `sequelize.sync({ alter: true })` intentaba recrear tipos enum que ya existian.

**Solucion**: Cambiar a `sequelize.sync({ force: false })` en `server.js`.

### 4. Proxy ECONNREFUSED entre frontend y backend

**Problema**: El frontend no puede conectar al backend si este no esta corriendo.

**Solucion**: Asegurarse de que ambos servidores esten arrancados.

### 5. `start.sh` no funcionaba en Windows

**Problema**: Script de bash no funciona en Windows nativo.

**Solucion**: Se creo `start.bat` y `start.ps1` para Windows.

---

## Mejoras a futuro

### Funcionalidad
- Exportacion de reportes en PDF y CSV
- Alertas por email configurables
- Comparacion entre usuarios (anonima) para benchmarks
- Integracion con API de CAMMESA para datos de generacion nacional

### Tecnico
- Tests automatizados: Jest + Supertest (backend), React Testing Library (frontend)
- CI/CD: GitHub Actions
- Dockerizacion: Dockerfile + docker-compose.yml
- Documentacion Swagger/OpenAPI
- Migracion a Node 18+

### UX/UI
- Internacionalizacion (i18n) espanol/ingles
- Responsive mobile completo
- Onboarding wizard de primera vez

---

## Como subir a GitHub

### 1. Instalar Git

```powershell
winget install Git.Git
```

Cerrar y reabrir PowerShell.

### 2. Crear repositorio en GitHub

1. Ir a [github.com/new](https://github.com/new)
2. Nombre: `VolksWagem---Mentoria`
3. Public o Private (a eleccion)
4. NO marcar "Add a README"
5. Click en **Create repository**

### 3. Subir desde esta PC

```powershell
cd C:\Users\alumno\Documents\VolksWagem---Mentoria

git init
git add .
git commit -m "Primer commit: proyecto ControlAR Energia completo"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/VolksWagem---Mentoria.git
git push -u origin main
```

> Reemplazar `TU_USUARIO` con el usuario de GitHub.

### 4. Verificar que .gitignore funciona

```powershell
git status
```

`backend/.env` y `frontend/.env` **NO deben aparecer** (el `.gitignore` los bloquea). Solo deben aparecer los `.env.example`.

---

## Integrantes del equipo

Practicas Profesionalizantes - Equipo de 6 integrantes

---

## Licencia

Proyecto academico - Practicas Profesionalizantes 2026
