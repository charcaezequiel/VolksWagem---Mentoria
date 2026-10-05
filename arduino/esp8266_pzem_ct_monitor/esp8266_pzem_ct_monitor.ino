/*
=====================================================
 CONTROLAR ENERGIA
 ESP8266MOD + PZEM-004T V4 + SCT-013

 Envio datos al Backend
=====================================================

  Microcontrolador: ESP8266MOD (ESP-12F / NodeMCU)
  Sensores:         PZEM-004T V4 + SCT-013 (pinza CT)

  Conexiones:
    PZEM TX -> D2 (GPIO4)  RX del ESP
    PZEM RX -> D1 (GPIO5)  TX del ESP
    PZEM 5V -> 5V
    PZEM GND-> GND
    SCT-013 -> A0

  Librerias requeridas:
    - ESP8266WiFi / ESP8266HTTPClient / SoftwareSerial (core ESP8266)
    - ArduinoJson  (Benoit Blanchon, v6 o v7)
    - PZEM004Tv30  (Mandulay)
    - EmonLib      (OpenEnergyMonitor)

  Notas sobre ESP8266MOD:
    - Solo tiene 1 UART hardware (reservado para el monitor serial),
      por eso el PZEM va por SoftwareSerial.
    - Solo tiene 1 pin analogo (A0), usado por el SCT-013.
    - El ADC es de 10 bits (0-1023). Asegurate de que la placa tenga el
      divisor de voltaje para que el centro de la senal quede en ~1.65V.
    - WiFi usa ESP8266WiFi.h en vez de WiFi.h.
*/

#include <ESP8266WiFi.h>

#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

#include <SoftwareSerial.h>
#include <PZEM004Tv30.h>

#include <EmonLib.h>
#include <ArduinoJson.h>

// ===============================
// WIFI
// ===============================

const char* SSID = "Thiagod";
const char* PASSWORD = "87654321";

// ===============================
// SERVIDOR CONTROLAR
// ===============================

const char* SERVER_URL = "http://10.249.206.200:3001";

const char* API_PATH = "/api/sensor/readings";

// TOKEN DEL DISPOSITIVO (verificado: guarda lecturas en la BD)

String DEVICE_TOKEN = "72b7957c13750d0931a3bebbd189e27ded27476f24043359";

// ===============================
// PZEM V4
// ===============================

// PZEM TX -> D2 GPIO4 (pin RX del ESP)
// PZEM RX -> D1 GPIO5 (pin TX del ESP)

#define PZEM_RX_PIN 4
#define PZEM_TX_PIN 5

SoftwareSerial pzemSerial(PZEM_RX_PIN, PZEM_TX_PIN);

PZEM004Tv30 pzem(pzemSerial);

// ===============================
// SCT-013
// ===============================

#define SCT_PIN A0

// Calibracion del CT (SCT-013-000 con burden interno ~ 30).
// Si tus valores se ven muy altos o bajos, ajusta esta constante.
const float CT_CALIBRATION = 30.0;

EnergyMonitor emon;

float corrienteCT = 0;

// ===============================
// VARIABLES PZEM
// ===============================

float voltage = 0;
float current = 0;
float power = 0;
float energy = 0;
float frequency = 0;
float pf = 0;

// ===============================
// SETUP
// ===============================

void setup() {

  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("==============================");
  Serial.println(" CONTROLAR ENERGY");
  Serial.println(" ESP8266 + PZEM V4");
  Serial.println("==============================");

  // SCT-013: ajuste inicial
  emon.current(SCT_PIN, CT_CALIBRATION);

  // WIFI
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.setSleep(false);

  WiFi.begin(SSID, PASSWORD);

  Serial.print("Conectando WiFi");

  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 60) {
    delay(500);
    Serial.print(".");
    intentos++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi conectado");
    Serial.print("IP ESP8266: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi NO conectado (revisar SSID/red)");
  }
}

// ===============================
// LOOP
// ===============================

void loop() {

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi perdido, reconectando...");
    WiFi.reconnect();
    delay(3000);
  }

  leerSensores();
  mostrarDatos();
  enviarServidor();

  delay(30000);
}

// ===============================
// LECTURA SENSORES
// ===============================

void leerSensores() {

  Serial.println();
  Serial.println("LEYENDO SENSORES...");

  // -------- PZEM (con reintentos) --------
  // La primera lectura tras encender suele fallar y devolver NaN (0.00).
  bool pzemOK = false;

  for (int t = 0; t < 3 && !pzemOK; t++) {
    voltage   = pzem.voltage();
    current   = pzem.current();
    power     = pzem.power();
    energy    = pzem.energy();
    frequency = pzem.frequency();
    pf        = pzem.pf();

    if (!isnan(power) && !isnan(voltage)) {
      pzemOK = true;
    } else {
      delay(700);
    }
  }

  if (!pzemOK) {
    Serial.println("PZEM sin respuesta: revisar 5V, GND comun y TX/RX");
  }

  // Evitar NaN
  if (isnan(voltage))   voltage = 0;
  if (isnan(current))   current = 0;
  if (isnan(power))     power = 0;
  if (isnan(energy))    energy = 0;
  if (isnan(frequency)) frequency = 0;
  if (isnan(pf))        pf = 0;

  // -------- SCT013 --------
  corrienteCT = emon.calcIrms(1480);
  if (isnan(corrienteCT)) corrienteCT = 0;
}

// ===============================
// MOSTRAR SERIAL
// ===============================

void mostrarDatos() {

  Serial.println();
  Serial.println("========== PZEM ==========");

  Serial.print("Voltaje: ");
  Serial.print(voltage);
  Serial.println(" V");

  Serial.print("Corriente PZEM: ");
  Serial.print(current);
  Serial.println(" A");

  Serial.print("Potencia: ");
  Serial.print(power);
  Serial.println(" W");

  Serial.print("Energia: ");
  Serial.print(energy);
  Serial.println(" kWh");

  Serial.print("Frecuencia: ");
  Serial.print(frequency);
  Serial.println(" Hz");

  Serial.print("Factor potencia: ");
  Serial.println(pf);

  Serial.println();

  Serial.print("Corriente SCT-013: ");
  Serial.print(corrienteCT);
  Serial.println(" A");

  if (corrienteCT > 15.0) {
    Serial.println("AVISO: lecturas de CT sospechosamente altas.");
    Serial.println("  Si no hay una carga grande, revisar:");
    Serial.println("  - bias de A0 (divisor a mitad de escala ~1.65V)");
    Serial.println("  - que la pinza abrace UN solo cable");
    Serial.println("  - el factor CT_CALIBRATION");
  }

  Serial.println("==========================");
}

// ===============================
// POST AL BACKEND (una lectura)
// ===============================

// Verifica si el backend responde (no toca la BD, es rapido)
bool backendAlcanzable() {
  WiFiClient client;
  HTTPClient http;
  String url = String(SERVER_URL) + "/api/health";
  http.begin(client, url);
  http.setTimeout(10000);
  int code = http.GET();
  http.end();
  return code == 200;
}

int postJSON(const String& url, const String& json) {
  WiFiClient client;
  HTTPClient http;

  http.begin(client, url);

  // CLAVE: el backend tarda varios segundos en responder (Supabase en la
  // nube, a veces 15-17s). Con timeout menor el POST falla con "-1",
  // aunque el server y la BD esten OK.
  http.setTimeout(45000);

  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + DEVICE_TOKEN);

  int code = http.POST(json);

  if (code >= 400) {
    Serial.print("Cuerpo del error: ");
    Serial.println(http.getString());
  }

  http.end();
  return code;
}

// ===============================
// ENVIO BACKEND
// ===============================

void enviarServidor() {

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi desconectado");
    return;
  }

  String url = String(SERVER_URL) + String(API_PATH);

  // Verificar que el ESP alcance al backend antes de enviar
  Serial.print("Revisando backend (" + String(SERVER_URL) + ")... ");
  if (!backendAlcanzable()) {
    Serial.println("NO alcanzable");
    Serial.println(">> El ESP NO puede llegar a la PC desde esta red.");
    Serial.println(">> Si en la web la IP responde pero aqui no, la red del");
    Serial.println(">> colegio aisla los dispositivos entre si (AP isolation).");
    Serial.println(">> Solucion: conectar la PC y el ESP a un hotspot del celular");
    Serial.println(">> y poner en SERVER_URL la IP de la PC en esa red (ipconfig).");
    return;
  }
  Serial.println("OK");

  // JSON
  StaticJsonDocument<300> doc;

  doc["instant_watts"]       = power;
  doc["accumulated_kwh_day"] = energy;
  doc["voltage"]             = voltage;
  doc["current"]             = current;
  doc["frequency"]           = frequency;
  doc["power_factor"]        = pf;

  String json;
  serializeJson(doc, json);

  Serial.println();
  Serial.println("Enviando datos al backend...");
  Serial.print("URL: ");
  Serial.println(url);
  Serial.print("JSON: ");
  Serial.println(json);

  // Intento 1
  int response = postJSON(url, json);

  // Reintento ante error de red
  if (response < 0) {
    Serial.println("Error de red, reintentando...");
    delay(1500);
    response = postJSON(url, json);
  }

  Serial.print("HTTP Response: ");
  Serial.println(response);

  if (response == 200 || response == 201) {
    Serial.println("OK: lectura guardada en la base de datos");
  } else if (response >= 400) {
    Serial.println("ERROR EN BACKEND (ver mensaje de error arriba)");
  } else {
    Serial.println("ERROR DE RED");
    Serial.println("No se pudo contactar con backend");
  }
}