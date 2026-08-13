# ControlAR Energía

Sistema web de monitoreo, análisis y predicción del consumo energético residencial en Argentina.

---

## Índice

1. [Objetivo del proyecto](#objetivo-del-proyecto)
2. [Alcance](#alcance)
3. [Stack tecnológico](#stack-tecnológico)
4. [Estructura del proyecto](#estructura-del-proyecto)
5. [Requisitos previos](#requisitos-previos)
6. [Instalación y ejecución](#instalación-y-ejecución)
7. [Credenciales de demostración](#credenciales-de-demostración)
8. [API REST - Endpoints](#api-rest---endpoints)
9. [Base de datos](#base-de-datos)
10. [Cambios recientes](#cambios-recientes)
11. [Problemas encontrados y soluciones](#problemas-encontrados-y-soluciones)
12. [Mejoras a futuro](#mejoras-a-futuro)
13. [Integrantes del equipo](#integrantes-del-equipo)

---

## Objetivo del proyecto

ControlAR Energía es una aplicación web desarrollada en el marco de la materia **Prácticas Profesionalizantes**. Su propósito es permitir a los usuarios residenciales argentinos:

- **Monitorear** el consumo energético de sus dispositivos en tiempo real.
- **Analizar** patrones de consumo a través de gráficos interactivos e indicadores clave (KPIs).
- **Predecir** consumos futuros basándose en datos históricos usando un motor de predicción propio.
- **Comparar** facturas de energía mes a mes y detectar variaciones significativas.
- **Gestionar** alertas por consumo excesivo, anomalías en dispositivos y superación de umbrales.
- **Comprender** el sistema de tarifas por provincias (OCEBA para Buenos Aires, EPRE para San Juan, etc.) y su impacto en el costo de la factura.

El proyecto está orientado al contexto energético argentino, contemplando las particularidades del mercado eléctrico residencial, las diferencias entre distribuidores provinciales y el sistema de tarifas por rangos (rango social, rango normal, rango alto).

---

## Alcance

### Funcionalidades implementadas

| Módulo | Descripción |
|---|---|
| **Autenticación** | Registro, login y gestión de perfil con JWT (token de 7 días) |
| **Dashboard** | Panel principal con KPIs: consumo total, costo estimado, dispositivos activos, alertas pendientes, actualización en tiempo real vía Socket.IO |
| **Dispositivos** | Alta, baja, edición y listado de dispositivos domésticos con categorías, **token de sensor IoT** por dispositivo |
| **Catálogo de electrodomésticos** | 107 electrodomésticos predefinidos por categoría para el alta rápida de dispositivos |
| **Consumo** | Registro de lecturas de consumo por dispositivo con gráficos de línea temporal (manual y por sensor) |
| **Facturas** | Carga y comparación de facturas de energía con análisis de variación porcentual |
| **Alertas** | Sistema de notificaciones por consumo pico, anomalías y superación de umbrales, con **notificaciones push en vivo** |
| **Predicciones (IA)** | Motor de predicción del consumo y **estimación de la boleta del próximo mes** aplicando las tarifas por rango de la provincia (regresión lineal + estacionalidad) |
| **Tarifas** | Consulta de tarifas por provincia con desglose por rango (social, normal, alto) |
| **Asistente IA (chat)** | Chat conversacional sobre tu consumo, dispositivos, facturas y proyecciones (Google Gemini o motor local) |
| **Recomendaciones** | Generación de recomendaciones personalizadas de ahorro con potencial de ahorro en kWh y $ |
| **Sensor IoT** | Integración ESP32 + PZEM-004T con **token de sensor por dispositivo** vía `/api/sensor/readings` |
| **Modo oscuro** | Toggle claro/oscuro con preferencia guardada en el navegador |
| **Perfil** | Gestión de datos personales y provincia del usuario |

### Funcionalidades NO implementadas (alcance original)

- Exportación de reportes en PDF
- Sistema de notificaciones push por email
- App móvil
- Autenticación con redes sociales (Google, Facebook)

---

## Stack tecnológico

### Backend

| Componente | Tecnología | Versión |
|---|---|---|
| Runtime | Node.js | 12.22.12 |
| Framework web | Express | 4.17.3 |
| ORM | Sequelize | 6.21.0 |
| Base de datos | PostgreSQL | - |
| Autenticación | JWT (jsonwebtoken) | 8.5.1 |
| Hash de passwords | bcryptjs | 2.4.3 |
| Validación | express-validator | 6.15.0 |
| WebSockets | Socket.IO | 4.5.4 |
| IA generativa | @google/generative-ai | 0.21.0 |
| Tareas programadas | node-cron | 3.0.2 |
| Hot reload | nodemon | 2.0.20 |

### Frontend

| Componente | Tecnología | Versión |
|---|---|---|
| Framework UI | React | 18.2.0 |
| Routing | react-router-dom | 6.20.0 |
| HTTP client | Axios | 1.6.2 |
| Gráficos | Recharts | 2.10.3 |
| Iconos | Lucide React | 0.294.0 |
| Notificaciones | react-hot-toast | 2.4.1 |
| WebSockets | socket.io-client | 4.7.5 |
| Utilidades de fecha | date-fns | 2.30.0 |

---

## Estructura del proyecto

```
VolksWagem/
├── backend/
│   ├── seeds/
│   │   └── seed.js              # Datos iniciales (provincias, tarifas, usuario demo, etc.)
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js      # Configuración de conexión a PostgreSQL
│   │   │   └── migrate.js       # Script de migración de tablas
│   │   ├── controllers/         # Lógica de negocio por módulo
│   │   │   ├── authController.js
│   │   │   ├── consumptionController.js
│   │   │   ├── dashboardController.js
│   │   │   ├── deviceController.js
│   │   │   ├── invoiceController.js
│   │   │   ├── alertController.js
│   │   │   ├── predictionController.js
│   │   │   ├── tariffController.js
│   │   │   ├── aiController.js      # Asistente IA, recomendaciones, insights
│   │   │   └── sensorController.js  # Ingestión de lecturas del ESP32
│   │   ├── middleware/
│   │   │   ├── auth.js          # JWT + authenticateSensor (token de dispositivo)
│   │   │   ├── errorHandler.js  # Manejo centralizado de errores
│   │   │   └── validate.js      # Wrapper de express-validator
│   │   ├── models/              # Modelos Sequelize (11 modelos)
│   │   │   ├── User.js
│   │   │   ├── Province.js
│   │   │   ├── DeviceCategory.js
│   │   │   ├── Appliance.js      # Catálogo de electrodomésticos predefinidos
│   │   │   ├── Device.js
│   │   │   ├── ConsumptionReading.js
│   │   │   ├── Invoice.js
│   │   │   ├── Alert.js
│   │   │   ├── Tariff.js
│   │   │   ├── Prediction.js
│   │   │   ├── Recommendation.js  # Recomendaciones generadas por IA
│   │   │   └── index.js         # Asociaciones entre modelos
│   │   ├── routes/              # Rutas API (11 archivos)
│   │   │   ├── auth.js
│   │   │   ├── devices.js
│   │   │   ├── appliances.js    # Catálogo de electrodomésticos
│   │   │   ├── consumption.js
│   │   │   ├── invoices.js
│   │   │   ├── alerts.js
│   │   │   ├── predictions.js
│   │   │   ├── tariffs.js
│   │   │   ├── dashboard.js
│   │   │   ├── ai.js            # /api/ai/* (chat, recomendaciones, insights, status)
│   │   │   └── sensor.js        # /api/sensor/* (lecturas del ESP32 con device token)
│   │   ├── services/            # Servicios de cálculo
│   │   │   ├── tariffService.js
│   │   │   ├── predictionService.js  # Motor de predicción IA (consumo + boleta)
│   │   │   ├── alertService.js
│   │   │   └── aiService.js     # Integración Google Gemini + fallback local
│   │   ├── validators/          # Reglas de validación
│   │   ├── utils/               # Utilidades auxiliares
│   │   └── server.js            # Punto de entrada del servidor
│   ├── .env                     # Variables de entorno
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── alerts/
│   │   │   ├── auth/
│   │   │   ├── charts/          # BarChart, LineChart, PieChart (Recharts)
│   │   │   ├── common/          # StatCard, DataTable, LoadingSpinner
│   │   │   ├── dashboard/
│   │   │   ├── devices/
│   │   │   └── layout/          # Sidebar, Header, Layout
│   │   ├── context/
│   │   │   ├── AuthContext.js   # Contexto de autenticación JWT
│   │   │   ├── ThemeContext.js  # Contexto de modo oscuro/claro
│   │   │   └── SocketContext.js # Contexto de Socket.IO (notificaciones en vivo)
│   │   ├── hooks/
│   │   ├── pages/               # 14 páginas (vistas)
│   │   │   ├── HomePage.js      # Pantalla de inicio (landing pública en /)
│   │   │   ├── LoginPage.js
│   │   │   ├── RegisterPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── DevicesPage.js
│   │   │   ├── DeviceDetailPage.js  # Detalle + token del sensor + lecturas
│   │   │   ├── ConsumptionPage.js
│   │   │   ├── InvoicesPage.js
│   │   │   ├── AlertsPage.js
│   │   │   ├── PredictionsPage.js
│   │   │   ├── TariffsPage.js
│   │   │   ├── ProfilePage.js
│   │   │   ├── AssistantPage.js     # Chat con el Asistente IA
│   │   │   └── RecommendationsPage.js  # Recomendaciones de ahorro
│   │   ├── services/
│   │   │   └── api.js           # Instancia Axios con interceptores JWT
│   │   ├── styles/
│   │   │   └── App.css          # Estilos globales (tema verde energía)
│   │   ├── utils/
│   │   ├── App.js
│   │   └── index.js
│   ├── .env                     # DISABLE_ESLINT_PLUGIN=true
│   └── package.json
├── start.sh                     # Script de inicio rápido (Linux / WSL)
├── start.bat                    # Script de inicio rápido (Windows, doble clic)
├── start.ps1                    # Setup de Windows (lo usa start.bat)
├── arduino/
│   └── esp32_pzem_monitor/      # Código del sensor IoT (ESP32 + PZEM-004T)
└── .gitignore
```

---

## Requisitos previos

- **Node.js** >= 14 (recomendado 18 LTS; el proyecto fue probado con 12.22.12)
- **npm** >= 6.x
- **PostgreSQL** >= 12
- **Git**

> Con `start.sh` (Linux/WSL) o `start.bat` (Windows) no es necesario instalarlos manualmente: los scripts los instalan y configuran automáticamente.

### Instalar PostgreSQL (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

## Instalación y ejecución

### Opción 1: Inicio rápido con `start.sh` (Linux / macOS / WSL, recomendada)

```bash
chmod +x start.sh
./start.sh
```

Este script hace todo automáticamente:
- Instala **Node.js 18 LTS** y **npm** si no están (vía NodeSource).
- Instala e inicia **PostgreSQL** si no está (`postgresql` + `postgresql-contrib`).
- Configura la contraseña del usuario `postgres` y la autenticación por contraseña en `pg_hba.conf`.
- Crea la base de datos `controlar_energia` si no existe.
- Crea los archivos `backend/.env` y `frontend/.env` con la configuración necesaria (solo la primera vez).
- Instala las dependencias de backend y frontend con `npm install`.
- En la **primera ejecución** crea las tablas y carga los datos iniciales (`db:reset`); en ejecuciones posteriores respeta los datos existentes.
- Levanta **backend** (puerto 3001) y **frontend** (puerto 3000) en paralelo.
- Con `Ctrl+C` detiene ambos servidores.

> Si aparece un error, el script **ya no se cierra en silencio**: muestra el mensaje, espera una tecla y sale. En Windows nativo (Git Bash/MSYS) también detecta el entorno y te indica que uses `start.bat`.

### Opción 1b: Inicio rápido en Windows nativo con `start.bat`

En una PC con Windows basta con hacer **doble clic en `start.bat`** (o ejecutarlo desde cmd). El script ejecuta el setup de Windows (usa **winget**):

```cmd
start.bat
```

- **Si Node.js y PostgreSQL ya están instalados**, corre **sin pedir contraseña de administrador** (ideal si no conocés el admin de la PC).
- **Si falta alguno de los dos**, pide permisos de administrador (UAC) y lo instala automáticamente:
  - **Node.js 18 LTS** con `winget install OpenJS.NodeJS.LTS`.
  - **PostgreSQL** con `winget install PostgreSQL.PostgreSQL` (con la contraseña `postgres` para el usuario `postgres`).
- Crea la base `controlar_energia` si no existe y los archivos `backend/.env` y `frontend/.env`.
- Instala dependencias y, en la **primera ejecución**, crea tablas y carga los datos iniciales.
- Abre dos ventanas: backend (puerto 3001) y frontend (puerto 3000). Cerralas para detener los servidores.
- Para reiniciar la base desde cero: `start.bat -Reset`.

> Si no tenés la contraseña del administrador y Node.js/PostgreSQL **no** están instalados, pedile al admin que los instale una vez (Node LTS desde nodejs.org y PostgreSQL dejando la contraseña `postgres`). Después `start.bat` funciona sin admin.

> Nota: `start.bat` internamente ejecuta `start.ps1` (`powershell -ExecutionPolicy Bypass -File .\start.ps1`), que es el setup real de Windows.

> Nota: en Windows con **WSL** instalado podés usar `start.sh` (ver Opción 1).

### Opción 2: Instalación manual paso a paso

#### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd VolksWagem
```

#### 2. Configurar la base de datos

```bash
# Crear la base de datos (usando las credenciales del .env)
PGPASSWORD=postgres psql -U postgres -h localhost -c "CREATE DATABASE controlar_energia;"
```

#### 3. Configurar y arrancar el Backend

```bash
cd backend

# Instalar dependencias
npm install

# Crear tablas y cargar datos iniciales
npm run db:reset

# Arrancar el servidor (puerto 3001)
npm run dev
```

#### 4. Configurar y arrancar el Frontend (en otra terminal)

```bash
cd frontend

# Instalar dependencias
npm install

# Arrancar el servidor de desarrollo (puerto 3000)
npm start
```

#### 5. Abrir en el navegador

```
http://localhost:3000
```

### Comandos útiles del Backend

| Comando | Descripción |
|---|---|
| `npm run dev` | Arranca el servidor con hot-reload (nodemon) |
| `npm start` | Arranca el servidor en modo producción |
| `npm run db:migrate` | Ejecuta la migración de tablas |
| `npm run db:seed` | Carga datos iniciales |
| `npm run db:reset` | Resetea la base: migra + seed |

### Consultar la base de datos manualmente

```bash
PGPASSWORD=postgres psql -U postgres -h localhost -d controlar_energia

# Dentro de psql:
\dt                          # Listar tablas
SELECT * FROM users;         # Ver usuarios
SELECT * FROM provinces;     # Ver provincias
SELECT * FROM devices;       # Ver dispositivos
SELECT COUNT(*) FROM consumption_readings;  # Cantidad de lecturas
SELECT * FROM alerts;
SELECT * FROM tariffs;
SELECT * FROM invoices;
\q                           # Salir
```

---

## Credenciales de demostración

| Campo | Valor |
|---|---|
| Email | `demo@controlar.com` |
| Contraseña | `123456` |

El usuario demo viene con:
- 6 dispositivos pre-cargados (aire acondicionado, heladera, lavarropas, computadora, heladera No Frost, televisor)
- 930 lecturas de consumo históricas (junio-julio 2026)
- 2 facturas de energía
- 3 alertas (pico de consumo, anomalía, umbral superado)
- Provincia: Buenos Aires (OCEBA)

---

## API REST - Endpoints

Todas las rutas (excepto auth) requieren header `Authorization: Bearer <token>`.

### Autenticación

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Registrar nuevo usuario |
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/auth/profile` | Obtener perfil del usuario |
| PUT | `/api/auth/profile` | Actualizar perfil |

### Dispositivos

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/devices` | Listar dispositivos del usuario |
| POST | `/api/devices` | Crear nuevo dispositivo (genera `device_token` automáticamente) |
| PUT | `/api/devices/:id` | Actualizar dispositivo |
| DELETE | `/api/devices/:id` | Eliminar dispositivo |
| GET | `/api/devices/:id/readings` | Lecturas del dispositivo con estadísticas (potencia actual, kWh del mes, online/offline) |
| POST | `/api/devices/:id/regenerate-token` | Regenerar el token del sensor del dispositivo |

### Catálogo de electrodomésticos

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/appliances` | Listar todos los electrodomésticos del catálogo |
| GET | `/api/appliances/by-category` | Listar electrodomésticos agrupados por categoría (para el alta rápida) |

### Consumo

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/consumption` | Obtener lecturas de consumo |
| POST | `/api/consumption` | Registrar nueva lectura |
| GET | `/api/consumption/summary` | Resumen de consumo |

### Facturas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/invoices` | Listar facturas |
| POST | `/api/invoices` | Registrar nueva factura |

### Alertas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/alerts` | Listar alertas |
| GET | `/api/alerts/unread-count` | Cantidad de alertas sin leer (para el badge del header) |
| PUT | `/api/alerts/:id/read` | Marcar alerta como leída |
| PUT | `/api/alerts/read-all` | Marcar todas como leídas |

### Predicciones

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/predictions` | Obtener predicciones |
| POST | `/api/predictions` | Generar nueva predicción |
| GET | `/api/predictions/bill-forecast` | **Pronóstico de la boleta del próximo mes**: consumo estimado, costo por rango tarifario y desglose |
| GET | `/api/predictions/accuracy` | Precisión del modelo de predicción |
| GET | `/api/predictions/anomalies` | Detección de anomalías de consumo |

### Tarifas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/tariffs` | Listar tarifas |
| GET | `/api/tariffs/province/:id` | Tarifas por provincia |

### Dashboard

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/dashboard` | KPIs y datos del panel principal |

### Inteligencia Artificial (Asistente)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/ai/status` | Estado del proveedor de IA: `{ provider: gemini\|local, configured, model }` |
| POST | `/api/ai/chat` | Chat con el asistente: `{ message, history }` → `{ reply, provider }` |
| GET | `/api/ai/insights` | Genera un análisis del consumo del usuario |
| GET | `/api/ai/recommendations` | Listar recomendaciones del usuario |
| POST | `/api/ai/recommendations/generate?force=` | Generar recomendaciones (con IA o fallback local) |
| PUT | `/api/ai/recommendations/:id` | Actualizar estado de una recomendación (pending/applied/dismissed) |
| DELETE | `/api/ai/recommendations/:id` | Eliminar recomendación |

### Sensor IoT (ESP32)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/sensor/readings` | Alta de lectura del sensor. Autenticación con **token del dispositivo** en el header `Authorization: Bearer <device_token>` (no usa JWT). Body: `{ instant_watts, accumulated_kwh_day, voltage, current, frequency, power_factor }` |

---

## Base de datos

### Diagrama Entidad-Relación

```
provinces 1──N users 1──N devices 1──N consumption_readings
   │                                      │
   └──1──N tariffs                    belongs_to
                                
users 1──N invoices
users 1──N alerts ──N──1 devices
users 1──N predictions

device_categories 1──N devices
device_categories 1──N appliances     (catálogo de electrodomésticos)
```

### Modelos

| Modelo | Descripción | Campos clave |
|---|---|---|
| **User** | Usuarios del sistema | name, email, password_hash, user_type, province_id |
| **Province** | Provincias argentinas | name, distributor_name, regulator_name (OCEBA, EPRE, etc.) |
| **DeviceCategory** | Categorías de dispositivos | name, icon, default_power, avg_daily_hours |
| **Appliance** | Catálogo de electrodomésticos predefinidos | category_id, name, nominal_watts, min_watts, max_watts, hours_daily_usage |
| **Device** | Dispositivos del usuario | name, model, power_rating, category_id, user_id, is_active, **device_token**, **last_seen_at** |
| **ConsumptionReading** | Lecturas de consumo | kwh_consumed, reading_date, reading_type (manual/auto/simulated), **voltage, current, frequency, power_factor** |
| **Invoice** | Facturas de energía | period_month, period_year, kwh_consumed, amount_paid, tariff_applied |
| **Alert** | Alertas del sistema | alert_type, title, message, severity (info/warning/critical), is_read |
| **Tariff** | Tarifas por provincia | range_name (social/normal/alto), price_per_kwh, min_kwh, max_kwh |
| **Prediction** | Predicciones de consumo y boleta | predicted_kwh, predicted_cost, confidence, target_month, target_year |
| **Recommendation** | Recomendaciones de ahorro generadas por IA | title, description, category, priority, potential_savings_kwh, potential_savings_cost, status (pending/applied/dismissed), source (ai/local) |

### Datos semilla

- **6 provincias**: Buenos Aires (OCEBA), San Juan (EPRE), Córdoba, Santa Fe, Mendoza, Entre Ríos
- **7 categorías**: Aire acondicionado, Heladera, Lavarropas, Computadora, Televisor, Cocina, Otros
- **107 electrodomésticos** del catálogo (Refrigeración, Climatización, Iluminación, Entretenimiento, Cocina, Lavado, Otros)
- **8 tarifas**: Rangos social/normal/alto para OCEBA y EPRE
- **1 usuario demo**: demo@controlar.com / 123456
- **6 dispositivos** con lecturas simuladas y **token de sensor** asignado
- **930 lecturas de consumo** (junio-julio 2026)
- **2 facturas**, **3 alertas** de ejemplo y **3 recomendaciones** de ahorro

---

## Cambios recientes

### Catálogo de electrodomésticos

Para facilitar el alta de dispositivos, el sistema incluye un **catálogo de 107 electrodomésticos** predefinidos, agrupados en las 7 categorías de la tabla `device_categories`.

| Categoría | Cantidad | Ejemplos |
|---|---|---|
| Refrigeración | 8 | Heladera No Frost, freezer, minibar |
| Climatización | 17 | Aire acondicionado (split e inverter), calefactores, ventiladores |
| Iluminación | 12 | Lámparas LED, de bajo consumo, reflectores |
| Entretenimiento | 21 | TVs, consolas, computadoras, routers |
| Cocina | 25 | Microondas, hornos, freidoras de aire, anafes |
| Lavado | 12 | Lavarropas, secarropas, lavavajillas |
| Otros | 12 | Aspiradoras, termotanques, secadores |

Cada ítem del catálogo trae datos de consumo típicos: **watts nominales, mínimo, máximo y horas de uso diarias**.

**Cómo funciona:** en la página *Mis Dispositivos*, el botón **"Registrar electrodoméstico"** abre un **asistente de 3 pasos**: (1) el usuario elige la **categoría** en una grilla visual, (2) busca y selecciona el **electrodoméstico del catálogo** (se completan solos el nombre, los watts y las horas de uso) o lo configura manualmente, y (3) confirma los datos antes de guardar. La información se consume desde `GET /api/appliances/by-category` y se guarda en la tabla `appliances`.

### Predicción IA de la boleta

El módulo de predicciones ahora estima **cuánto va a costar la boleta de electricidad del próximo mes**, calculando todos los valores con las tarifas por rango de la provincia del usuario.

**Algoritmo del motor (`predictionService.js` → `generateBillForecast`):**
1. Toma las lecturas de los últimos **90 días** y agrega el consumo diario (kWh).
2. Aplica **regresión lineal** sobre los últimos 30 días para capturar la tendencia.
3. Combina el resultado con **estacionalidad mensual** (factores de verano/invierno) y el **factor fin de semana**.
4. Genera el pronóstico **día a día para todo el próximo mes** y lo suma.
5. Calcula el **costo** aplicando la tarifa progresiva por rangos de la provincia (reutiliza `tariffService`).
6. Devuelve **confianza del modelo** según la cantidad de datos y su variabilidad.
7. Persiste el pronóstico diario en la tabla `predictions` (modelo `v2.1-bill-ai`).

**Qué muestra la página *Predicciones*:**
- Tarjetas con la **boleta estimada**, consumo mensual estimado, promedio diario y confianza del modelo.
- **Gráfico de línea** con el pronóstico diario del mes.
- **Gráfico de barras** comparando los últimos 3 meses con el mes pronosticado.
- **Desglose de la boleta** por rango tarifario (kWh, $/kWh, subtotal).
- Precisión del modelo y anomalías de consumo.

> Requiere que el usuario tenga **provincia configurada** (para aplicar las tarifas) y **datos de consumo** cargados.

### Pantalla de inicio y sensor IoT

- **Pantalla de inicio (`HomePage.js`)**: la ruta pública `/` ahora muestra una landing que describe todo lo que hace la aplicación, las estadísticas del sistema, la integración IoT y botones de ingreso/registro. El resto de las rutas de la app (`/dashboard`, `/devices`, etc.) siguen iguales y protegidas por login.
- **Sensor IoT (`arduino/esp32_pzem_monitor/esp32_pzem_monitor.ino`)**: sketch para **ESP32 + PZEM-004T v3.0** que mide voltaje, corriente, potencia activa, energía acumulada, frecuencia y factor de potencia, y los envía al backend con el **token del sensor** del dispositivo:

```
POST /api/sensor/readings
Authorization: Bearer <DEVICE_TOKEN>
{ "instant_watts": 1250.5, "accumulated_kwh_day": 3.214,
  "voltage": 227.1, "current": 5.5, "frequency": 50.0, "power_factor": 0.98 }
```

Requisitos para usarlo: crear el dispositivo en la web, copiar su `device_token` desde la página **Detalle del dispositivo** (o regenerarlo) y completar la configuración al inicio del sketch. A diferencia de la versión anterior, **no es necesario el JWT del usuario ni el UUID del dispositivo**: el token identifica al dispositivo y al usuario automáticamente. La energía acumulada se reinicia a 0 cada medianoche (hora local, Argentina UTC-3) para que `accumulated_kwh_day` sea el consumo del día. Librerías: `PZEM004Tv30` (oleh) y `ArduinoJson`.

#### Materiales necesarios para armar el sensor

| # | Componente | Cantidad | Notas |
|---|---|---|---|
| 1 | **ESP32** (DevKit V1, WROOM-32) | 1 | Microcontrolador con Wi-Fi. Cualquier placa ESP32 compatible |
| 2 | **Sensor PZEM-004T v3.0** | 1 | Mide tensión, corriente, potencia y energía. Incluye la **bobina de corriente (CT)** en su interior |
| 3 | **Cargador / fuente 5V USB** | 1 | Alimenta el ESP32 (mínimo 500 mA, recomendado 1 A) |
| 4 | **Cables jumper (dupont)** hembra-hembra | 4 | Conexiones entre el PZEM y el ESP32 |
| 5 | **Cable de fase y neutro** | 2 segmentos | Para pasar la línea de 220V por el PZEM y conectar la bobina |
| 6 | **Caja / gabinete aislante** (opcional) | 1 | Protección y seguridad de la instalación |

> **Advertencia de seguridad:** el PZEM se conecta en serie con la línea eléctrica de **220V CA**. Cualquier manipulación debe hacerse con la **llave térmica cortada** y, idealmente, por alguien con conocimientos de instalaciones eléctricas.

#### Conexión del circuito

| Pin del PZEM-004T | Se conecta a |
|---|---|
| `RX` | **GPIO 16** del ESP32 (TX2) |
| `TX` | **GPIO 17** del ESP32 (RX2) |
| `5V` | **5V** del ESP32 |
| `GND` | **GND** del ESP32 |
| `L` (tornillo) | Fase de la línea de 220V (en serie con la bobina interna) |
| `N` (tornillo) | Neutro de la línea de 220V |
| Bobina interna (CT) | Pasar el **cable de fase** de la carga a medir por el orificio |

> El sketch usa `Serial2` del ESP32: RX = GPIO 16, TX = GPIO 17 (definidos como `PZEM_RX_PIN` y `PZEM_TX_PIN` al inicio del archivo).

#### Software y librerías

| Herramienta | Propósito |
|---|---|
| **Arduino IDE** (o PlatformIO) | Compilar y subir el sketch |
| **PZEM004Tv30** (de oleh) | Leer el sensor PZEM-004T v3.0 |
| **ArduinoJson** | Armar el JSON que se envía al backend |
| **WiFi.h / HTTPClient.h** | Conectividad Wi-Fi y envío HTTP (incluidas en el ESP32) |

#### Configuración en el sketch

Al inicio de `esp32_pzem_monitor.ino` hay que completar 3 valores:

```cpp
const char* WIFI_SSID     = "TU_RED_WIFI";              // nombre de tu red Wi-Fi
const char* WIFI_PASS     = "TU_CLAVE_WIFI";            // clave de tu red Wi-Fi
const String DEVICE_TOKEN = "PEGAR_TOKEN_DEL_SENSOR";   // token del dispositivo (desde Detalle del dispositivo)

// Si el backend no corre en la misma máquina, indicá la IP local:
const char* SERVER_URL = "http://192.168.1.50:3001";
```

### Asistente IA, recomendaciones y modo oscuro

- **Asistente IA (`AssistantPage.js`)**: chat conversacional que conoce tus datos reales (consumo de los últimos 3 meses, dispositivos y su consumo, facturas, pronóstico del próximo mes). Responde en español con contexto de tu hogar. Con **Google Gemini** configurado usa el modelo real; sin API key, un **motor local** responde con patrones y heurísticas (el botón del header muestra el estado: "Gemini conectado" o "Modo local").
- **Recomendaciones (`RecommendationsPage.js`)**: genera sugerencias personalizadas de ahorro (eficiencia, consumo, mantenimiento, comportamiento) con **ahorro estimado en kWh y pesos**, prioridad y estado (pendiente/aplicada/descartada). Generadas por Gemini si hay API key, o por heurísticas locales que analizan los dispositivos de mayor consumo.
- **Detalle de dispositivo (`DeviceDetailPage.js`)**: muestra el **token del sensor** con botón copiar/regenerar, las instrucciones de conexión del ESP32, estadísticas de la última medición y el gráfico de consumo del dispositivo.
- **Tiempo real**: el dashboard y el badge de alertas se actualizan en vivo vía Socket.IO cuando llega una lectura del sensor o una nueva alerta (`reading:new`, `alert:new`, `recommendation:new`), con toast de notificación.
- **Modo oscuro**: toggle en el header que guarda la preferencia en el navegador y respeta la preferencia del sistema.

### Configurar Google Gemini (opcional)

Para activar la IA real (chat, insights y recomendaciones con Gemini), pegá tu API key en `backend/.env`:

```
GEMINI_API_KEY=TU_CLAVE_DE_GOOGLE_AI_STUDIO
GEMINI_MODEL=gemini-1.5-flash
```

Obtenela gratis en [Google AI Studio](https://aistudio.google.com). Sin esta clave, el sistema funciona igual en **modo local**. La clave nunca se guarda en la base de datos ni se expone al frontend; el backend la lee de `.env`.

### Rediseño de interfaz y formularios

Se rediseñó la interfaz completa para que **cada sección de cada página sea claramente visible**, los formularios sean más amigables y el **registro de electrodomésticos** sea mucho más fácil. A continuación se explica, sección por sección, todo lo modificado.

#### 1. Sistema de diseño global (`App.css`)

- **Variables CSS con modo oscuro**: tema claro/oscuro completo con las mismas variables de color (`--surface`, `--border`, `--text`, etc.), de modo que **todas** las páginas y componentes respetan el tema automáticamente.
- **Headers de página con subtítulo**: cada página ahora tiene un encabezado con **título + ícono + descripción breve** (`page-header-text` / `page-header-subtitle`), para que el usuario sepa siempre en qué sección está y qué puede hacer ahí.
- **Secciones de página (`PageSection`)**: componente reutilizable que agrupa cada bloque de contenido en una **card con cabecera propia**: ícono de color, título, subtítulo descriptivo y acciones alineadas a la derecha. Todas las páginas usan este componente, lo que da una **jerarquía visual consistente**.
- **Formularios amigables (`Field`)**: componente de campo con **etiqueta + ícono**, texto de ayuda (`hint`), marca de obligatorio y espacio para errores. Los inputs admiten **ícono dentro del campo** (`.input-with-icon`) para guiar al usuario.
- **Modales mejorados (`Modal`)**: modal reutilizable con cabecera de ícono + título + subtítulo, tres tamaños (sm/md/lg) y pies de formulario consistentes.
- **Estados vacíos (`empty-state`)**: cuando una sección no tiene datos muestra un ícono + mensaje claro + acción sugerida, en lugar de tablas vacías.
- **Mejoras de tabla**: monospaced para valores numéricos, badges con color por fuente/origen, botones de acción compactos y filas clickeables.

#### 2. Registro de electrodomésticos con asistente de 3 pasos (`DeviceFormModal.js`)

El alta de dispositivos pasó de un formulario plano a un **asistente guiado por pasos** con indicador de progreso:

1. **Categoría**: grilla visual de tarjetas con ícono (aire acondicionado, heladera, lavarropas, computadora, televisor, cocina, iluminación, etc.) y la cantidad de electrodomésticos disponibles en cada una.
2. **Electrodoméstico**: buscador con autocompletado dentro de la categoría + lista de tarjetas del catálogo. Al elegir uno, se **rellenan automáticamente** el nombre, los watts y las horas de uso. Hay una opción *"Configurar manualmente"* para dispositivos que no estén en el catálogo.
3. **Confirmar**: resumen de la elección con el nombre editable, la potencia, las horas de uso y el botón para guardar.

Esto reduce el tiempo de carga y los errores: el usuario **elije con clics** en lugar de tipear datos técnicos.

#### 3. Página Mis Dispositivos (`DevicesPage.js`)

- **4 tarjetas de KPIs** arriba: dispositivos registrados, categorías disponibles, sensores en línea y kWh estimados por día.
- Sección *"Dispositivos del hogar"* con **filtro por categoría** integrado en el encabezado y tabla con columna de **estado del sensor** (badge "Activo"/"Sin token").
- Botón **"Ver"** por fila que navega al detalle del dispositivo, y filas clickeables.
- El formulario de alta/edición usa el **asistente de 3 pasos** descrito arriba.

#### 4. Página Consumo Energético (`ConsumptionPage.js`)

- **KPIs** (consumo actual, promedio diario, semanal y mensual) con indicador de consumo en vivo.
- Sección *"Consumo por dispositivo"* con gráfico de barras.
- Sección *"Historial de lecturas"* con **filtros de fecha en el encabezado**.
- Formulario *"Agregar lectura"* rediseñado: selector de dispositivo (dropdown con watts), campos con íconos y textos de ayuda.

#### 5. Página Facturas (`InvoicesPage.js`)

- Sección *"Comparación mensual"* con el gráfico de evolución del monto.
- Sección *"Historial de facturas"* con el mes mostrado como nombre ("Enero 2026") y badges de tarifa.
- Formulario *"Nueva factura"* rediseñado con **meses en español**, íconos por campo y placeholders orientativos.

#### 6. Dashboard (`DashboardPage.js`)

- Encabezado con **indicador de tiempo real** ("● En tiempo real — recibiendo datos de tus sensores") y accesos rápidos a Asistente IA, Recomendaciones y Agregar Lectura.
- Cada gráfico y el panel de alertas viven ahora en una **sección con título y subtítulo** (Consumo diario, Consumo mensual, Desglose por categoría, Alertas recientes) en lugar de cards genéricas.
- Sigue actualizándose en vivo con Socket.IO.

#### 7. Página Alertas (`AlertsPage.js`)

- Sección *"Centro de alertas"* con **filtros por severidad y estado en el encabezado**.
- Contador de no leídas en el título y estado vacío amigable.

#### 8. Página Predicciones (`PredictionsPage.js`)

- Los 4 KPIs (boleta estimada, consumo, promedio y confianza) se mantienen arriba.
- Todas las tarjetas pasaron a secciones con subtítulo explicativo: *"Pronóstico diario"* (con provincia, distribuidora y versión del modelo), *"Comparación mensual"*, *"Desglose de la boleta estimada"* (con total resaltado), *"Últimos meses vs. pronóstico"*, *"Precisión del modelo"* y *"Anomalías detectadas"*.

#### 9. Página Tarifas (`TariffsPage.js`)

- Sección *"Seleccionar provincia"* que muestra la **distribuidora y el regulador** de la provincia elegida.
- Secciones *"Escalas tarifarias"* (tabla de rangos) y *"Calculadora de costo"* con **resultado resaltado en verde**.
- Calculadora con campo e íconos amigables.

#### 10. Perfil (`ProfilePage.js`)

- Grilla de dos secciones: *"Información personal"* y *"Seguridad"*, cada una con íconos, subtítulos y campos con íconos y ayudas (umbral de alerta explicado).

#### 11. Autenticación (`LoginPage.js` y `RegisterPage.js`)

- **Logo con ícono degradado** en lugar de texto plano.
- Campos con **íconos dentro del input** (usuario, email, candado, mapa).
- Hint con las **credenciales de demo** en el login.

#### 12. Asistente IA, Recomendaciones y Detalle de dispositivo

- Cabeceras con subtítulo descriptivo en las tres páginas.
- **Detalle del dispositivo**: la configuración del sensor ahora es una **sección propia** *"Conectar tu sensor ESP32 + PZEM-004T"* con el token, botones copiar/regenerar, el ID del dispositivo y el endpoint; el gráfico de consumo y el historial son secciones separadas con subtítulo.

---

## Problemas encontrados y soluciones

### 1. Error de autenticación PostgreSQL (peer authentication)

**Problema**: PostgreSQL usaba autenticación `peer` por defecto, que solo permite conexiones desde el usuario del sistema sin contraseña.

**Solución**: Configurar `pg_hba.conf` para usar autenticación por contraseña y ejecutar:
```sql
ALTER USER postgres WITH PASSWORD 'postgres';
```

### 2. Incompatibilidad de Node.js 12 con dependencias modernas

**Problema**: El sistema ejecuta Node.js v12.22.12, incompatible con versiones recientes de npm packages (ESLint 8, react-scripts 5, etc.).

**Solución**:
- **Backend**: Se fijaron versiones compatibles con Node 12 en `package.json`:
  - `pg@8.7.3`, `sequelize@6.21.0`, `express-validator@6.15.0`, `jsonwebtoken@8.5.1`
  - `nodemon@2.0.20` (la serie 3.x requiere Node 14+)
- **Frontend**: Se usó `react-scripts@4.0.3` (compatible con Node 12) y `DISABLE_ESLINT_PLUGIN=true` en `.env` porque ESLint 8 requiere Node 14+.

### 3. Error de Sequelize sync con enums PostgreSQL

**Problema**: `sequelize.sync({ alter: true })` intentaba recrear tipos enum (`enum_users_user_type`) que ya existían en la base de datos, lanzando el error:
```
error: ya existe un tipo «enum_users_user_type»
```

**Solución**: Cambiar `sequelize.sync({ force: false, alter: true })` a `sequelize.sync({ force: false })` en `server.js:85`. El modo `alter` es problemático con enums de PostgreSQL. Si es necesario recrear, se usa `npm run db:reset` que droppea y recrea la base completa.

### 4. Proxy ECONNREFUSED entre frontend y backend

**Problema**: El frontend (puerto 3000) intenta hacer proxy de requests API al backend (puerto 3001), pero si el backend no está corriendo, muestra `ECONNREFUSED`.

**Solución**: Asegurarse de que ambas terminales estén abiertas y ambos servidores funcionando. El frontend usa `"proxy": "http://localhost:3001"` en `package.json` para redirigir llamadas `/api/*` al backend.

### 5. Errores de sintaxis CSS con unidades `rem`

**Problema**: En `PredictionsPage.js` y `TariffsPage.js`, los valores CSS usaban `rem` sin comillas en template literals, causando errores de compilación.

**Solución**: Eliminar espacios incorrectos y asegurar que las unidades `rem` estén correctamente formateadas en los objetos de estilo inline.

### 6. `start.sh` no funcionaba en Windows

**Problema**: En una PC con Windows sin Node.js, npm ni PostgreSQL instalados, `start.sh` (script de bash para Linux) fallaba de inmediato y con `set -e` se cerraba sin mostrar ningún mensaje útil.

**Solución**:
- Se creó **`start.bat`** para Windows: doble clic, pide permisos de administrador y ejecuta el setup completo (instala Node.js y PostgreSQL con winget, crea la base de datos y los `.env`, e inicia backend y frontend en ventanas separadas). Internamente usa **`start.ps1`** (`powershell -ExecutionPolicy Bypass -File .\start.ps1`), que hace todo el trabajo.
- Se corrigió **`start.sh`**: se quitó `set -e` y se agregaron verificaciones explícitas con mensajes claros (`die`), detección de entorno (Windows nativo vs Linux/WSL) y espera de tecla antes de cerrar, para que nunca termine en silencio.

---

## Mejoras a futuro

### Funcionalidad

- **Exportación de reportes** en PDF y CSV
- **Alertas por email** configurables por el usuario
- **Comparación entre usuarios** (anónima) para benchmarks de consumo
- **Soporte multi-moneda** con cotización del dólar MEP para conversión a USD
- **Integración con API de CAMMESA** para datos de generación nacional

### Técnico

- **Tests automatizados**: Jest + Supertest para el backend, React Testing Library para el frontend
- **CI/CD**: Pipeline con GitHub Actions para testing automático y despliegue
- **Dockerización**: `Dockerfile` + `docker-compose.yml` para levantar todo con un solo comando
- **Migraciones versionadas**: Usar `sequelize-cli` con migraciones numeradas en vez de `sync`
- **Logging estructurado**: Winston o Pino para logs con niveles y formato JSON
- **Rate limiting**: Express-rate-limit para proteger los endpoints de abuso
- **Manejo de errores global**: Sentry o similar para tracking de errores en producción
- **Documentación Swagger/OpenAPI**: Generar docs automáticas de la API
- **Migración a Node 18+**: Actualizar todas las dependencias a sus versiones actuales
- **State management**: Considerar Redux o Zustand para manejo de estado más robusto
- **PWA**: Service worker para funcionamiento offline básico

### UX/UI

- **Internacionalización (i18n)**: Soporte español/inglés
- **Responsive mobile**: Optimización completa para pantallas pequeñas
- **Onboarding**: Wizard de primera vez para configurar dispositivos

---

## Integrantes del equipo

Prácticas Profesionalizantes - Equipo de 6 integrantes

---

## Licencia

Proyecto académico - Prácticas Profesionalizantes 2026
