-- ============================================
-- AGREGAR CAMPOS PARA TELÉFONO MEJORADO
-- ============================================
-- Este script añade campos de código de país y extensión telefónica

ALTER TABLE users ADD COLUMN phone_country_code VARCHAR(5) DEFAULT '+34';
ALTER TABLE users ADD COLUMN phone_extension VARCHAR(10);

COMMENT ON COLUMN users.phone_country_code IS 'Código de país del teléfono (ej: +34, +41)';
COMMENT ON COLUMN users.phone_extension IS 'Extensión telefónica';
