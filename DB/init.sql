\c dashboard;

-- Crear tabla clima (añadida columna station)
CREATE TABLE IF NOT EXISTS clima (
    id SERIAL PRIMARY KEY,
    temperatura REAL,
    humedad REAL,
    presion REAL,
    v_viento NUMERIC(5,2),
    d_viento REAL,
    indiceuv REAL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    station TEXT
);

-- Índice para consultas por estación
CREATE INDEX IF NOT EXISTS idx_clima_station ON clima (station);

CREATE TABLE alertas (
  parametro TEXT PRIMARY KEY,
  min_value DOUBLE PRECISION,
  max_value DOUBLE PRECISION,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Función que emite notificación (incluye station)
CREATE OR REPLACE FUNCTION notify_new_clima()
RETURNS TRIGGER AS $$
DECLARE
    payload JSON;
BEGIN
    payload := json_build_object(
        'id', NEW.id,
        'temperatura', NEW.temperatura,
        'humedad', NEW.humedad,
        'presion', NEW.presion,
        'v_viento', NEW.v_viento,
        'd_viento', NEW.d_viento,
        'indiceuv', NEW.indiceuv,
        'timestamp', NEW.timestamp,
        'station', NEW.station
    );

    PERFORM pg_notify('clima_channel', payload::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER clima_notify_trigger
AFTER INSERT ON clima
FOR EACH ROW EXECUTE FUNCTION notify_new_clima();


CREATE TABLE central (
    id SERIAL PRIMARY KEY,
    voltaje REAL,
    corriente REAL,
    potencia REAL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Función notificación
CREATE OR REPLACE FUNCTION notify_new_central()
RETURNS TRIGGER AS $$
DECLARE
    payload JSON;
BEGIN
    payload := json_build_object(
        'id', NEW.id,
        'voltaje', NEW.voltaje,
        'corriente', NEW.corriente,
        'potencia', NEW.potencia,
        'timestamp', NEW.timestamp
    );

    PERFORM pg_notify('central_channel', payload::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER central_notify_trigger
AFTER INSERT ON central
FOR EACH ROW EXECUTE FUNCTION notify_new_central();
