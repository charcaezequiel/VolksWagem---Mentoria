/*
 *  ControlAR – Sketch de PRUEBA / DIAGNÓSTICO
 *  Micro: ESP8266MOD  |  Sensores: PZEM-004T v3.0 + Bobina CT
 *
 *  Verifica cada componente por separado y muestra resultados en el Monitor Serial.
 *  Si todo está OK, pasa a modo monitoreo enviando datos al backend cada 10 s.
 *
 *  Conexiones:
 *    PZEM-004T TX  → D1 (GPIO5)   [RX SoftwareSerial]
 *    PZEM-004T RX  → D2 (GPIO4)   [TX SoftwareSerial]
 *    PZEM-004T VCC → 5V
 *    PZEM-004T GND → GND
 *    Bobina CT      → A0
 *
 *  Librerías (instalar desde Library Manager):
 *    ArduinoJson · PZEM004Tv30 · EmonLib
 *
 *  Abrí el Monitor Serial a 115200 baudios.
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <PZEM004Tv30.h>
#include <SoftwareSerial.h>
#include <EmonLib.h>

// ═══════════════ CONFIGURACIÓN ═══════════════

const char* WIFI_SSID     = "TU_RED_WIFI";
const char* WIFI_PASS     = "TU_CLAVE_WIFI";
const char* SERVER_URL    = "http://192.168.1.50:3001";
const String API_PATH     = "/api/sensor/readings";
const String DEVICE_TOKEN = "PEGAR_TOKEN_DEL_SENSOR";

// Pines ESP8266MOD
#define PZEM_RX_PIN  5   // D1 → TX del PZEM
#define PZEM_TX_PIN  4   // D2 → RX del PZEM
#define CT_PIN       A0  // Bobina CT

// Calibración CT (ajustar según tu bobina y burden)
const float CT_CALIBRATION = 30.0;

// Intervalo de monitoreo (10 s)
const unsigned long INTERVAL_MS = 10000;

// ═══════════════ OBJETOS ═══════════════

SoftwareSerial pzemSerial(PZEM_RX_PIN, PZEM_TX_PIN);
PZEM004Tv30 pzem(pzemSerial);
EnergyMonitor emon;

unsigned long lastSend = 0;

// ═══════════════ TEST 1: WI-FI ═══════════════

bool testWiFi() {
  Serial.println("══════ TEST 1: Wi-Fi ══════");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  Serial.printf("  Conectando a \"%s\"", WIFI_SSID);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("  [OK] Wi-Fi conectado");
    Serial.printf("       IP: %s   RSSI: %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
    return true;
  }

  Serial.println("  [FALLA] No se pudo conectar a Wi-Fi");
  Serial.println("          Revisá SSID y contraseña.");
  return false;
}

// ═══════════════ TEST 2: PZEM-004T ═══════════════

bool testPZEM() {
  Serial.println("══════ TEST 2: PZEM-004T ══════");

  float v   = pzem.voltage();
  float i   = pzem.current();
  float p   = pzem.power();
  float e   = pzem.energy();
  float f   = pzem.frequency();
  float pf  = pzem.pf();

  if (!isnan(v)) {
    Serial.println("  [OK] PZEM respondiendo");
    Serial.printf("       V=%.1f  A=%.3f  W=%.1f  kWh=%.3f  Hz=%.1f  PF=%.2f\n",
                  v, i, p, e, f, pf);
    return true;
  }

  Serial.println("  [FALLA] PZEM sin respuesta");
  Serial.println("          - Cableado TX/RX invertido?");
  Serial.println("          - Sin 5V / GND?");
  Serial.println("          - Esperá 10s tras encender (modo sleep)");
  return false;
}

// ═══════════════ TEST 3: BOBINA CT ═══════════════

bool testCT() {
  Serial.println("══════ TEST 3: Bobina CT ══════");

  float irms  = emon.calcIrms(1480);
  float vPzem = pzem.voltage();
  if (isnan(vPzem)) vPzem = 220.0;
  float watts = irms * vPzem;

  Serial.printf("  Corriente: %.3f A    Potencia (est.): %.1f W\n", irms, watts);

  if (irms > 0.01) {
    Serial.println("  [OK] Bobina CT detectando corriente");
    return true;
  }

  Serial.println("  [AVISO] Corriente ~0 A");
  Serial.println("          - ¿Hay carga encendida en el circuito?");
  Serial.println("          - ¿La bobina está bien conectada a A0?");
  Serial.println("          - Revisá el factor de calibración.");
  return false;
}

// ═══════════════ TEST 4: BACKEND ═══════════════

bool testBackend() {
  Serial.println("══════ TEST 4: Backend HTTP ══════");

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("  [SKIP] Sin Wi-Fi");
    return false;
  }

  WiFiClient client;
  HTTPClient http;

  // Health check
  String url = String(SERVER_URL) + "/api/health";
  Serial.printf("  GET %s ... ", url.c_str());
  http.begin(client, url);
  http.setTimeout(5000);
  int code = http.GET();
  http.end();

  if (code != 200) {
    Serial.printf("[FALLA HTTP %d]\n", code);
    Serial.println("  El backend no responde. Verificá IP y puerto.");
    return false;
  }
  Serial.println("[OK]");

  // POST de prueba
  Serial.printf("  POST %s ... ", API_PATH.c_str());
  http.begin(client, String(SERVER_URL) + API_PATH);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + DEVICE_TOKEN);

  StaticJsonDocument<256> doc;
  doc["instant_watts"]       = 100.0;
  doc["accumulated_kwh_day"] = 0.5;
  doc["voltage"]             = 220.0;
  doc["current"]             = 0.455;
  doc["frequency"]           = 50.0;
  doc["power_factor"]        = 0.90;

  String payload;
  serializeJson(doc, payload);
  code = http.POST(payload);
  String resp = http.getString();
  http.end();

  if (code == 201 || code == 200) {
    Serial.printf("[OK HTTP %d]\n", code);
    Serial.printf("  Respuesta: %s\n", resp.c_str());
    return true;
  }

  Serial.printf("[FALLA HTTP %d]\n", code);
  Serial.printf("  Respuesta: %s\n", resp.c_str());
  if (code == 401) Serial.println("  → Token inválido. Copialo desde la web.");
  if (code == 404) Serial.println("  → Endpoint no encontrado. Revisá la URL.");
  return false;
}

// ═══════════════ ENVÍO DE LECTURA REAL ═══════════════

void sendReading(float v, float i_p, float p_p, float e, float f, float pf, float i_ct) {
  if (WiFi.status() != WL_CONNECTED) return;

  float p_ct    = i_ct * (isnan(v) ? 220.0 : v);
  float pTotal  = (isnan(p_p) ? 0 : p_p) + p_ct;

  WiFiClient client;
  HTTPClient http;
  http.begin(client, String(SERVER_URL) + API_PATH);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + DEVICE_TOKEN);

  StaticJsonDocument<512> doc;
  doc["instant_watts"]       = roundf(pTotal * 100.0) / 100.0;
  doc["accumulated_kwh_day"] = roundf(e * 1000.0) / 1000.0;
  doc["voltage"]             = roundf(v * 10.0) / 10.0;
  doc["current"]             = roundf(((isnan(i_p) ? 0 : i_p) + i_ct) * 1000.0) / 1000.0;
  doc["frequency"]           = roundf(f * 10.0) / 10.0;
  doc["power_factor"]        = roundf(pf * 100.0) / 100.0;

  String payload;
  serializeJson(doc, payload);
  int code = http.POST(payload);
  http.end();

  Serial.printf("  [HTTP %d] %.1fW | %.3f kWh enviado\n", code, pTotal, e);
}

// ═══════════════ SETUP ═══════════════

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("╔══════════════════════════════════════╗");
  Serial.println("║   ControlAR – Diagnóstico completo   ║");
  Serial.println("║   ESP8266 + PZEM + CT                ║");
  Serial.println("╚══════════════════════════════════════╝");
  Serial.println();

  pzemSerial.begin(9600);
  emon.current(CT_PIN, CT_CALIBRATION);

  delay(2000);

  bool w = testWiFi();    Serial.println();
  bool p = testPZEM();    Serial.println();
  bool c = testCT();      Serial.println();
  bool b = w ? testBackend() : false; Serial.println();

  Serial.println("╔══════════════════════════════════════╗");
  Serial.println("║          RESULTADOS                  ║");
  Serial.printf(  "║  Wi-Fi:     %s                      ║\n", w ? "OK " : "FAIL");
  Serial.printf(  "║  PZEM:      %s                      ║\n", p ? "OK " : "FAIL");
  Serial.printf(  "║  CT:        %s                      ║\n", c ? "OK " : "~0A ");
  Serial.printf(  "║  Backend:   %s                      ║\n", b ? "OK " : "FAIL");
  Serial.println("╚══════════════════════════════════════╝");
  Serial.println();

  if (w && p && b) {
    Serial.println(">> Todo OK. Entrando en modo monitoreo (cada 10s).");
  } else {
    Serial.println(">> Revisá los errores de arriba antes de continuar.");
  }
  Serial.println();
}

// ═══════════════ LOOP ═══════════════

void loop() {
  unsigned long now = millis();
  if (now - lastSend < INTERVAL_MS) return;
  lastSend = now;

  Serial.printf("--- Ciclo %lus ---\n", now / 1000);

  float v   = pzem.voltage();
  float i_p = pzem.current();
  float p_p = pzem.power();
  float e   = pzem.energy();
  float f   = pzem.frequency();
  float pf  = pzem.pf();
  float i_ct = emon.calcIrms(1480);

  if (!isnan(p_p)) {
    Serial.printf("  PZEM: V=%.1f A=%.3f W=%.1f kWh=%.3f\n", v, i_p, p_p, e);
  } else {
    Serial.println("  PZEM: sin datos");
  }
  Serial.printf("  CT:   A=%.3f  W=%.1f\n", i_ct, i_ct * (!isnan(v) ? v : 220.0));

  sendReading(v, i_p, p_p, e, f, pf, i_ct);
  Serial.println();
}
