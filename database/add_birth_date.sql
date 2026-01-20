-- ============================================
-- AGREGAR CAMPO birth_date A TABLA users
-- ============================================
-- Este script añade el campo de fecha de nacimiento a la tabla users

ALTER TABLE users ADD COLUMN birth_date DATE;

COMMENT ON COLUMN users.birth_date IS 'Fecha de nacimiento del usuario';
