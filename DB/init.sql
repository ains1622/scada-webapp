\c dashboard;

-- Crear tabla clima
CREATE TABLE clima (
    id SERIAL PRIMARY KEY,
    temperatura REAL,
    humedad REAL,
    presion REAL,
    v_viento NUMERIC(5,2),
    d_viento REAL,
    indiceUV REAL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Función que emite notificación
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
        'indiceUV', NEW.indiceUV,
        'timestamp', NEW.timestamp
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