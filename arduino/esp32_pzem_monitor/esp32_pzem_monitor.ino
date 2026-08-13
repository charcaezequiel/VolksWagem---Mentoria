
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <PZEM004Tv30.h>

// Red Wi-Fi del hogar
const char* WIFI_SSID = "TU_RED_WIFI";
const char* WIFI_PASS = "TU_CLAVE_WIFI";

// URL del backend. En la misma red Wi-Fi usá la IP local de la PC:
//   ej. "http://192.168.1.50:3001"
// Si el backend corre en la misma PC con USB, probá con tu IP local.
const char* SERVER_URL = "http://192.168.1.50:3001";
const String API_PATH = "/api/sensor/readings";

// Token del sensor del dispositivo (se genera en el backend al crear el
// dispositivo y se puede copiar/regenerar desde la pagina de Detalle).
const String DEVICE_TOKEN = "PEGAR_TOKEN_DEL_SENSOR";

// Intervalo de envio en milisegundos (30 s = 30000, 1 min = 60000)
const unsigned long SEND_INTERVAL_MS = 30000;

// Zona horaria: Argentina = UTC-3 (sin horario de verano)
const long GMT_OFFSET_SEC = -3 * 3600;
const int DST_OFFSET_SEC = 0;

/* ---------------- Pines y objeto PZEM ---------------- */

#if defined(ESP32)
  #define PZEM_RX_PIN 16
  #define PZEM_TX_PIN 17
  #define PZEM_SERIAL Serial2
#else
  #error "Este codigo esta pensado para ESP32."
#endif

PZEM004Tv30 pzem(PZEM_SERIAL, PZEM_RX_PIN, PZEM_TX_PIN);

unsigned long lastSend = 0;
int lastDay = -1;

/* ---------------- Funciones ---------------- */

void connectWiFi() {
  Serial.print("Conectando a Wi-Fi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Conectado. IP: ");
  Serial.println(WiFi.localIP());
}

// Al cambiar el dia, resetea el contador de energia del PZEM
void resetEnergyAtMidnight() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return;
  if (lastDay == -1) {
    lastDay = timeinfo.tm_mday;
    return;
  }
  if (timeinfo.tm_mday != lastDay) {
    lastDay = timeinfo.tm_mday;
    Serial.printf("Nuevo dia (%02d/%02d): reseteando energia acumulada...\n",
                  timeinfo.tm_mday, timeinfo.tm_mon + 1);
    pzem.resetEnergy();
  }
}

// Envia una medicion al backend
void sendReading(float voltage, float current, float power,
                 float energy, float frequency, float powerFactor) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Sin conexion Wi-Fi. Reintentando luego...");
    connectWiFi();
    return;
  }

  HTTPClient http;
  http.begin(String(SERVER_URL) + API_PATH);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + DEVICE_TOKEN);

  // Documento JSON con los campos que espera el endpoint /api/sensor/readings
  StaticJsonDocument<256> doc;
  doc["instant_watts"] = roundf(power * 100.0) / 100.0;          // requerido
  doc["accumulated_kwh_day"] = roundf(energy * 1000.0) / 1000.0; // kWh del dia
  doc["voltage"] = roundf(voltage * 10.0) / 10.0;
  doc["current"] = roundf(current * 1000.0) / 1000.0;
  doc["frequency"] = roundf(frequency * 10.0) / 10.0;
  doc["power_factor"] = roundf(powerFactor * 100.0) / 100.0;

  String payload;
  serializeJson(doc, payload);

  int code = http.POST(payload);
  if (code == 200 || code == 201) {
    Serial.printf("[OK %d] %.1f W | %.3f kWh enviados\n", code, power, energy);
  } else {
    Serial.printf("[ERROR HTTP %d] Respuesta: %s\n", code, payload.c_str());
  }
  http.end();
}

/* ---------------- Setup ---------------- */

void setup() {
  Serial.begin(115200);
  delay(500);

  connectWiFi();

  // Hora local (para el reinicio diario de energia)
  configTime(GMT_OFFSET_SEC, DST_OFFSET_SEC, "pool.ntp.org");

  Serial.println("Monitor PZEM-004T listo. Leyendo mediciones...");
}

/* ---------------- Loop ---------------- */

void loop() {
  resetEnergyAtMidnight();

  unsigned long now = millis();
  if (now - lastSend < SEND_INTERVAL_MS) return;
  lastSend = now;

  // Lectura del PZEM-004T (si no hay datos devuelve NaN)
  float voltage = pzem.voltage();
  float current = pzem.current();
  float power = pzem.power();
  float energy = pzem.energy();          // kWh desde el ultimo reset
  float frequency = pzem.frequency();
  float powerFactor = pzem.pf();

  if (isnan(power)) {
    Serial.println("PZEM sin respuesta (revisar cableado TX/RX y 5V).");
    return;
  }

  Serial.printf("V=%.1f  A=%.3f  W=%.1f  kWh=%.3f  Hz=%.1f  PF=%.2f\n",
                voltage, current, power, energy, frequency, powerFactor);

  sendReading(voltage, current, power, energy, frequency, powerFactor);
}
