/*
 *  ControlAR – Monitor de consumo energético
 *  Microcontrolador: ESP8266MOD (ESP-12E / NodeMCU compatible)
 *  Sensores: PZEM-004T v3.0 + Bobina CT (SCT-013)
 *
 *  Conexiones:
 *    PZEM-004T  ->  SoftwareSerial D1 (GPIO5/RX) y D2 (GPIO4/TX)
 *    Bobina CT  ->  A0 (ADC del ESP8266)
 *
 *  Librerías requeridas (instalar desde el Board Manager o Library Manager):
 *    - ESP8266WiFi           (incluida con el core ESP8266)
 *    - ESP8266HTTPClient     (incluida con el core ESP8266)
 *    - ArduinoJson           (by Benoit Blanchon, v6 o v7)
 *    - PZEM004Tv30           (by Mandulay)
 *    - EmonLib               (by OpenEnergyMonitor)
 *    - SoftwareSerial        (incluida con el core ESP8266)
 *
 *  Notas sobre ESP8266MOD vs ESP32:
 *    - El ESP8266 tiene un solo UART hardware (reservado para debug por Serial).
 *    - Se usa SoftwareSerial para comunicarse con el PZEM-004T.
 *    - Solo tiene 1 pin analógico (A0), compartido para la bobina CT.
 *    - El ADC es de 10 bits (0–1023) con rango 0–3.3V en la mayoría de
 *      los módulos ESP8266MOD.  Asegurate de que tu placa tenga el divisor
 *      de voltaje adecuado para la bobina CT.
 *    - WiFi usa ESP8266WiFi.h en vez de WiFi.h.
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <PZEM004Tv30.h>
#include <SoftwareSerial.h>
#include <EmonLib.h>

// ─────────────── Configuración Wi-Fi ───────────────
const char* WIFI_SSID = "BA Escuela";
const char* WIFI_PASS = "";

// ─────────────── Configuración del Backend ───────────────
// IMPORTANTE: usá la IP de la PC en la MISMA red del ESP.
// NO uses la IP de CloudflareWARP (172.x) ni de VirtualBox (192.168.56.x).
// Ver la IP real con "ipconfig" en la PC (ej. 10.120.2.224 / 192.168.x.x).
const char* SERVER_URL = "http://10.120.2.224:3001";
const String API_PATH  = "/api/sensor/readings";

// Token del sensor (se genera en el backend al crear el dispositivo)
const String DEVICE_TOKEN = "a1cb641062e4f6622c3933d5433aac4c4f11928e6b665681";

// ─────────────── Intervalo de envío ───────────────
// 30 segundos = 30000 ms
const unsigned long SEND_INTERVAL_MS = 30000;

// ─────────────── Zona horaria ───────────────
// Argentina = UTC-3 (sin horario de verano)
const long   GMT_OFFSET_SEC = -3 * 3600;
const int    DST_OFFSET_SEC = 0;

// ─────────────── Pines del PZEM-004T (SoftwareSerial) ───────────────
// En ESP8266 se recomienda usar GPIO5 (D1) y GPIO4 (D2) para SoftwareSerial.
#define PZEM_RX_PIN  5   // D1 – conectar al TX del PZEM
#define PZEM_TX_PIN  4   // D2 – conectar al RX del PZEM

// ─────────────── Pin de la Bobina CT ───────────────
// Solo hay un pin analógico en el ESP8266: A0
#define CT_PIN       A0

// ─────────────── Calibración de la Bobina CT ───────────────
// El factor de calibración depende de:
//   - Modelo de la bobina (SCT-013-000 = 100A/50mA → ~30 con burden de 33Ω)
//   - Resistencia burden instalada
//   - Divisor de voltaje (si tu placa lo tiene)
//
// Valores de referencia para SCT-013-000:
//   Con burden de 33Ω y divisor:  cal_factor ≈ 30.0
//   Con burden de 100Ω:            cal_factor ≈ 11.1
//   Sin burden (bobina con salida de voltaje): ajustar según el rango
//
// Usá el monitor serial para verificar que los valores sean correctos.
const float CT_CALIBRATION = 30.0;

// ─────────────── Objetos globales ───────────────

// SoftwareSerial para el PZEM-004T
SoftwareSerial pzemSerial(PZEM_RX_PIN, PZEM_TX_PIN);

// Objeto PZEM (usa SoftwareSerial en vez de HardwareSerial)
PZEM004Tv30 pzem(pzemSerial);

// Objeto EmonLib para la bobina CT
EnergyMonitor emon;

// Variables de control
unsigned long lastSend = 0;
int lastDay = -1;

// Variables de estado
unsigned long bootTime = 0;        // millis() de arranque del dispositivo
unsigned long lastSuccessAt = 0;   // millis() del último envío exitoso
int lastHttpCode = 0;              // último código HTTP devuelto por el backend
bool backendReachable = false;     // si el último envío fue exitoso
char lastHttpError[32] = "-";      // texto breve del último error de red

// ─────────────── Funciones auxiliares ───────────────

void connectWiFi() {
  Serial.print("Conectando a Wi-Fi");
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 60) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("Conectado. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("No se pudo conectar a Wi-Fi. Reintentando en el próximo ciclo...");
  }
}

// Formatea millis() como "D días HH:MM:SS"
String formatMillis(unsigned long ms) {
  unsigned long totalSec = ms / 1000;
  char buf[40];
  sprintf(buf, "%lud %02lu:%02lu:%02lu",
          totalSec / 86400, (totalSec % 86400) / 3600,
          (totalSec % 3600) / 60, totalSec % 60);
  return String(buf);
}

// Realiza el POST al backend y devuelve el código HTTP
int postReading(const String& payload) {
  HTTPClient http;
  WiFiClient client;
  http.begin(client, String(SERVER_URL) + API_PATH);
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + DEVICE_TOKEN);
  int code = http.POST(payload);
  http.end();
  return code;
}

// Muestra el panel de estado en el Monitor Serial
void printStatus(float voltage, float current, float power, float energy) {
  Serial.println("== ESTADO ==");
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("  Wi-Fi  : CONECTADO   IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("  Wi-Fi  : DESCONECTADO");
  }
  Serial.printf("  Backend: %s   (HTTP %d)\n",
                backendReachable ? "OK" : "FALLO", lastHttpCode);
  if (!backendReachable) {
    Serial.printf("  Motivo : %s\n", lastHttpError);
  }
  Serial.printf("  Tiempo conectado: %s\n", formatMillis(millis() - bootTime).c_str());
  if (lastSuccessAt > 0) {
    Serial.printf("  Ultimo envio OK  : hace %s\n", formatMillis(millis() - lastSuccessAt).c_str());
  } else {
    Serial.println("  Ultimo envio OK  : ninguna");
  }
  Serial.printf("  Carga actual: %.1f W\n", power);
  Serial.printf("  Tension: %.1f V   Corriente: %.3f A   Energia: %.3f kWh\n",
                voltage, current, energy);
  Serial.println("================");
}

// Resetea la energía acumulada del PZEM al cambiar de día
void resetEnergyAtMidnight() {
  time_t now = time(nullptr);
  struct tm* timeinfo = localtime(&now);

  if (lastDay == -1) {
    lastDay = timeinfo->tm_mday;
    return;
  }

  if (timeinfo->tm_mday != lastDay) {
    lastDay = timeinfo->tm_mday;
    Serial.printf("Nuevo dia (%02d/%02d): reseteando energia acumulada del PZEM...\n",
                  timeinfo->tm_mday, timeinfo->tm_mon + 1);
    pzem.resetEnergy();
  }
}

// Envía una lectura combinada (PZEM + CT) al backend
void sendReading(float voltage, float currentPzem, float powerPzem,
                 float energy, float frequency, float powerFactor,
                 float currentCT, float powerCT) {

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Sin conexion Wi-Fi. Reintentando...");
    backendReachable = false;
    connectWiFi();
    return;
  }

  // Potencia combinada: PZEM (línea principal) + CT (rama adicional)
  float totalPower = powerPzem + powerCT;

  // JSON con los campos que espera el endpoint /api/sensor/readings
  StaticJsonDocument<512> doc;
  doc["instant_watts"]       = roundf(totalPower * 100.0) / 100.0;
  doc["accumulated_kwh_day"] = roundf(energy * 1000.0) / 1000.0;
  doc["voltage"]             = roundf(voltage * 10.0) / 10.0;
  doc["current"]             = roundf((currentPzem + currentCT) * 1000.0) / 1000.0;
  doc["frequency"]           = roundf(frequency * 10.0) / 10.0;
  doc["power_factor"]        = roundf(powerFactor * 100.0) / 100.0;

  String payload;
  serializeJson(doc, payload);

  int code = postReading(payload);

  // Si no se pudo conectar (HTTP -1 = red/backend inalcanzable), reintentar una vez
  if (code < 0) {
    delay(1500);
    code = postReading(payload);
  }

  if (code == 200 || code == 201) {
    backendReachable = true;
    lastHttpCode = code;
    lastSuccessAt = millis();
    snprintf(lastHttpError, sizeof(lastHttpError), "-");
    Serial.printf("[OK %d] PZEM: %.1fW | CT: %.2fA | Total: %.1fW | %.3f kWh\n",
                  code, powerPzem, currentCT, totalPower, energy);
  } else {
    backendReachable = false;
    lastHttpCode = code;
    if (code < 0) {
      snprintf(lastHttpError, sizeof(lastHttpError), "red inalcanzable");
      Serial.printf("[ERROR HTTP %d] No se pudo contactar %s%s (revisa la IP desde el ESP)\n",
                    code, SERVER_URL, API_PATH.c_str());
    } else {
      snprintf(lastHttpError, sizeof(lastHttpError), "HTTP %d", code);
      Serial.printf("[ERROR HTTP %d] %s\n", code, payload.c_str());
    }
  }
}

// ─────────────── Setup ───────────────

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("========================================");
  Serial.println("  ControlAR – ESP8266 + PZEM + CT");
  Serial.println("========================================");

  bootTime = millis();

  // Inicializar SoftwareSerial para el PZEM
  // (el constructor de PZEM004Tv30 ya arranca el puerto a 9600)

  // Inicializar EmonLib para la bobina CT
  // (pin analógico, factor de calibración)
  emon.current(CT_PIN, CT_CALIBRATION);

  // Conectar a Wi-Fi
  connectWiFi();

  // Configurar hora vía NTP (para reset diario de energía)
  configTime(GMT_OFFSET_SEC, DST_OFFSET_SEC, "pool.ntp.org", "time.nist.gov");

  Serial.println("Leyendo sensores cada 30 segundos...");
  Serial.println();
}

// ─────────────── Loop ───────────────

void loop() {
  // Reset de energía acumulada al cambiar de día
  resetEnergyAtMidnight();

  // Monitorear Wi-Fi: si se pierde, reconectar
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ESTADO] Wi-Fi perdido. Reconectando...");
    backendReachable = false;
    connectWiFi();
  }

  // Solo enviar cada SEND_INTERVAL_MS
  unsigned long now = millis();
  if (now - lastSend < SEND_INTERVAL_MS) return;
  lastSend = now;

  // ── Lectura del PZEM-004T (con reintentos) ──
  // La primera lectura suele fallar al encender; se reintenta hasta 3 veces.
  float voltage = NAN, currentP = NAN, powerP = NAN, energy = NAN, frequency = NAN, pf = NAN;
  bool pzemOk = false;

  for (int attempt = 0; attempt < 3; attempt++) {
    voltage    = pzem.voltage();
    currentP   = pzem.current();
    powerP     = pzem.power();
    energy     = pzem.energy();
    frequency  = pzem.frequency();
    pf         = pzem.pf();

    if (!isnan(powerP) && !isnan(voltage)) {
      pzemOk = true;
      break;
    }
    delay(500);
  }

  if (!pzemOk) {
    Serial.println("PZEM sin respuesta (revisar cableado TX/RX, GND y 5V).");
  }

  // ── Lectura de la Bobina CT ──
  // EmonLib calcula la corriente RMS (en Amperes)
  float currentCT = emon.calcIrms(1480);  // 1480 muestras por ciclo (50Hz)
  float powerCT   = currentCT * (pzemOk ? voltage : 220.0);  // estimar con voltaje PZEM o 220V

  // ── Imprimir en monitor serial ──
  Serial.println("--- Ciclo de lectura ---");
  if (pzemOk) {
    Serial.printf("  PZEM:  V=%.1f  A=%.3f  W=%.1f  kWh=%.3f  Hz=%.1f  PF=%.2f\n",
                  voltage, currentP, powerP, energy, frequency, pf);
  }
  Serial.printf("  CT:    A=%.3f  W=%.1f (estimado con V=%.1f)\n",
                currentCT, powerCT, pzemOk ? voltage : 220.0);
  Serial.printf("  TOTAL: W=%.1f  A=%.3f\n",
                (pzemOk ? powerP : 0) + powerCT,
                (pzemOk ? currentP : 0) + currentCT);

  // ── Enviar al backend ──
  if (pzemOk) {
    sendReading(voltage, currentP, powerP, energy, frequency, pf, currentCT, powerCT);
  } else {
    // Si el PZEM no responde, al menos enviar la lectura del CT
    Serial.println("PZEM no disponible. Enviando solo datos del CT...");
    sendReading(0, 0, 0, 0, 0, 0, currentCT, powerCT);
  }

  // ── Panel de estado ──
  float totalCurrent = (pzemOk ? currentP : 0) + currentCT;
  float totalPower = (pzemOk ? powerP : 0) + powerCT;
  float refVoltage = pzemOk ? voltage : (currentCT > 0.01 ? 220.0 : 0);
  printStatus(refVoltage, totalCurrent, totalPower, pzemOk ? energy : 0);

  Serial.println();
}
