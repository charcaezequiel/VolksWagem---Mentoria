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
10. [Problemas encontrados y soluciones](#problemas-encontrados-y-soluciones)
11. [Mejoras a futuro](#mejoras-a-futuro)
12. [Integrantes del equipo](#integrantes-del-equipo)

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
| **Dashboard** | Panel principal con KPIs: consumo total, costo estimado, dispositivos activos, alertas pendientes |
| **Dispositivos** | Alta, baja, edición y listado de dispositivos domésticos con categorías |
| **Consumo** | Registro de lecturas de consumo por dispositivo con gráficos de línea temporal |
| **Facturas** | Carga y comparación de facturas de energía con análisis de variación porcentual |
| **Alertas** | Sistema de notificaciones por consumo pico, anomalías y superación de umbrales |
| **Predicciones** | Motor de predicción de consumo futuro basado en promedios históricos y estacionalidad |
| **Tarifas** | Consulta de tarifas por provincia con desglose por rango (social, normal, alto) |
| **Perfil** | Gestión de datos personales y provincia del usuario |

### Funcionalidades NO implementadas (alcance original)

- Consumo en tiempo real con sensores IoT (se simuló con datos de seed)
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
│   │   │   └── tariffController.js
│   │   ├── middleware/
│   │   │   ├── auth.js          # Verificación de JWT
│   │   │   ├── errorHandler.js  # Manejo centralizado de errores
│   │   │   └── validate.js      # Wrapper de express-validator
│   │   ├── models/              # Modelos Sequelize (9 modelos)
│   │   │   ├── User.js
│   │   │   ├── Province.js
│   │   │   ├── DeviceCategory.js
│   │   │   ├── Device.js
│   │   │   ├── ConsumptionReading.js
│   │   │   ├── Invoice.js
│   │   │   ├── Alert.js
│   │   │   ├── Tariff.js
│   │   │   ├── Prediction.js
│   │   │   └── index.js         # Asociaciones entre modelos
│   │   ├── routes/              # Rutas API (8 archivos)
│   │   │   ├── auth.js
│   │   │   ├── devices.js
│   │   │   ├── consumption.js
│   │   │   ├── invoices.js
│   │   │   ├── alerts.js
│   │   │   ├── predictions.js
│   │   │   ├── tariffs.js
│   │   │   └── dashboard.js
│   │   ├── services/            # Servicios de cálculo
│   │   │   ├── tariffService.js
│   │   │   ├── predictionService.js
│   │   │   └── alertService.js
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
│   │   │   └── AuthContext.js   # Contexto de autenticación JWT
│   │   ├── hooks/
│   │   ├── pages/               # 10 páginas (vistas)
│   │   │   ├── LoginPage.js
│   │   │   ├── RegisterPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── DevicesPage.js
│   │   │   ├── ConsumptionPage.js
│   │   │   ├── InvoicesPage.js
│   │   │   ├── AlertsPage.js
│   │   │   ├── PredictionsPage.js
│   │   │   ├── TariffsPage.js
│   │   │   └── ProfilePage.js
│   │   ├── services/
│   │   │   └── api.js           # Instancia Axios con interceptores JWT
│   │   ├── styles/
│   │   │   └── App.css          # Estilos globales (tema verde energía)
│   │   ├── utils/
│   │   ├── App.js
│   │   └── index.js
│   ├── .env                     # DISABLE_ESLINT_PLUGIN=true
│   └── package.json
├── start.sh                     # Script de inicio rápido
└── .gitignore
```

---

## Requisitos previos

- **Node.js** >= 12.x (probado con 12.22.12)
- **npm** >= 6.x
- **PostgreSQL** >= 12
- **Git**

### Instalar PostgreSQL (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

## Instalación y ejecución

### Opción 1: Inicio rápido con `start.sh`

```bash
chmod +x start.sh
./start.sh
```

Este script verifica PostgreSQL, crea la base de datos, instala dependencias, carga datos iniciales y arranca ambos servidores.

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
| POST | `/api/devices` | Crear nuevo dispositivo |
| PUT | `/api/devices/:id` | Actualizar dispositivo |
| DELETE | `/api/devices/:id` | Eliminar dispositivo |

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
| PUT | `/api/alerts/:id/read` | Marcar alerta como leída |

### Predicciones

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/predictions` | Obtener predicciones |
| POST | `/api/predictions` | Generar nueva predicción |

### Tarifas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/tariffs` | Listar tarifas |
| GET | `/api/tariffs/province/:id` | Tarifas por provincia |

### Dashboard

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/dashboard` | KPIs y datos del panel principal |

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
```

### Modelos

| Modelo | Descripción | Campos clave |
|---|---|---|
| **User** | Usuarios del sistema | name, email, password_hash, user_type, province_id |
| **Province** | Provincias argentinas | name, distributor_name, regulator_name (OCEBA, EPRE, etc.) |
| **DeviceCategory** | Categorías de dispositivos | name, icon, default_power, avg_daily_hours |
| **Device** | Dispositivos del usuario | name, model, power_rating, category_id, user_id, is_active |
| **ConsumptionReading** | Lecturas de consumo | kwh_consumed, reading_date, reading_type (manual/auto/simulated) |
| **Invoice** | Facturas de energía | period_month, period_year, kwh_consumed, amount_paid, tariff_applied |
| **Alert** | Alertas del sistema | alert_type, title, message, severity (info/warning/critical), is_read |
| **Tariff** | Tarifas por provincia | range_name (social/normal/alto), price_per_kwh, min_kwh, max_kwh |
| **Prediction** | Predicciones de consumo | predicted_kwh, predicted_cost, confidence, target_month, target_year |

### Datos semilla

- **6 provincias**: Buenos Aires (OCEBA), San Juan (EPRE), Córdoba, Santa Fe, Mendoza, Entre Ríos
- **7 categorías**: Aire acondicionado, Heladera, Lavarropas, Computadora, Televisor, Cocina, Otros
- **8 tarifas**: Rangos social/normal/alto para OCEBA y EPRE
- **1 usuario demo**: demo@controlar.com / 123456
- **6 dispositivos** con lecturas simuladas
- **930 lecturas de consumo** (junio-julio 2026)
- **2 facturas** y **3 alertas** de ejemplo

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

---

## Mejoras a futuro

### Funcionalidad

- **Dashboard en tiempo real** con Socket.IO para actualizaciones de consumo sin recargar
- **Exportación de reportes** en PDF y CSV
- **Sistema de recomendaciones** basado en patrones de uso para reducir el consumo
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

- **Modo oscuro**: Toggle para tema claro/oscuro
- **Internacionalización (i18n)**: Soporte español/inglés
- **Responsive mobile**: Optimización completa para pantallas pequeñas
- **Onboarding**: Wizard de primera vez para configurar dispositivos
- **Notificaciones in-app**: Panel de notificaciones con Socket.IO

---

## Integrantes del equipo

Prácticas Profesionalizantes - Equipo de 6 integrantes

---

## Licencia

Proyecto académico - Prácticas Profesionalizantes 2026
