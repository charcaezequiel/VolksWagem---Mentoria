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
// En la misma red Wi-Fi usá la IP local de la PC:
//   ej. "http://192.168.1.50:3001"
const char* SERVER_URL = "http://192.168.56.1:3001";
const String API_PATH  = "/api/sensor/readings";

// Token del sensor (se genera en el backend al crear el dispositivo)
const String DEVICE_TOKEN = "28f1259f48226dbca67d4e8526d6ab0d9f28b5733e7b9b36";

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

// ─────────────── Funciones auxiliares ───────────────

void connectWiFi() {
  Serial.print("Conectando a Wi-Fi");
  WiFi.mode(WIFI_STA);
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
    connectWiFi();
    return;
  }

  HTTPClient http;
  WiFiClient client;
  http.begin(client, String(SERVER_URL) + API_PATH);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + DEVICE_TOKEN);

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

  int code = http.POST(payload);

  if (code == 200 || code == 201) {
    Serial.printf("[OK %d] PZEM: %.1fW | CT: %.2fA | Total: %.1fW | %.3f kWh\n",
                  code, powerPzem, currentCT, totalPower, energy);
  } else {
    Serial.printf("[ERROR HTTP %d] %s\n", code, payload.c_str());
  }

  http.end();
}

// ─────────────── Setup ───────────────

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("========================================");
  Serial.println("  ControlAR – ESP8266 + PZEM + CT");
  Serial.println("========================================");

  // Inicializar SoftwareSerial para el PZEM
  pzemSerial.begin(9600);

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

  // Solo enviar cada SEND_INTERVAL_MS
  unsigned long now = millis();
  if (now - lastSend < SEND_INTERVAL_MS) return;
  lastSend = now;

  // ── Lectura del PZEM-004T ──
  float voltage    = pzem.voltage();
  float currentP   = pzem.current();
  float powerP     = pzem.power();
  float energy     = pzem.energy();       // kWh desde el último reset
  float frequency  = pzem.frequency();
  float pf         = pzem.pf();

  bool pzemOk = !isnan(powerP);

  if (!pzemOk) {
    Serial.println("PZEM sin respuesta (revisar cableado TX/RX y 5V).");
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

  Serial.println();
}
