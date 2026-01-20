-- ============================================
-- CONTROL HORARIO - SETUP DE BASE DE DATOS
-- ============================================
-- Este script crea todas las tablas necesarias para la app de control horario
-- Ejecuta este script en Supabase SQL Editor o en cualquier base de datos PostgreSQL

-- ============================================
-- TABLA: users (Usuarios del sistema)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code VARCHAR(5) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  phone_country_code VARCHAR(5) DEFAULT '+34',
  phone_extension VARCHAR(10),
  birth_date DATE,
  role VARCHAR(20) DEFAULT 'worker' CHECK (role IN ('worker', 'admin', 'supervisor')),
  department VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Comentarios explicativos
COMMENT ON TABLE users IS 'Tabla de usuarios del sistema de control horario';
COMMENT ON COLUMN users.employee_code IS 'Código de 5 dígitos usado como PIN de acceso';
COMMENT ON COLUMN users.role IS 'Rol: worker (trabajador), admin (administrador), supervisor';


-- ============================================
-- TABLA: requests (Solicitudes de fichaje)
-- ============================================
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('ENTRADA', 'SALIDA', 'ENTRADA_2', 'SALIDA_2', 'DESCANSO')),
  requested_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_requests_user_id ON requests(user_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_created_at ON requests(created_at);

-- Comentarios
COMMENT ON TABLE requests IS 'Solicitudes de fichajes olvidados o correcciones';
COMMENT ON COLUMN requests.status IS 'Estado: pending (pendiente), approved (aprobada), rejected (rechazada)';
COMMENT ON COLUMN requests.reviewed_by IS 'ID del admin/supervisor que revisó la solicitud';


-- ============================================
-- TABLA: clock_entries (Fichajes/Registros)
-- ============================================
CREATE TABLE clock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('ENTRADA', 'SALIDA', 'ENTRADA_2', 'SALIDA_2', 'DESCANSO')),
  clock_time TIMESTAMP WITH TIME ZONE NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_manual BOOLEAN DEFAULT false,
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_clock_entries_user_id ON clock_entries(user_id);
CREATE INDEX idx_clock_entries_clock_time ON clock_entries(clock_time);
-- Nota: Índices con DATE() removidos para evitar errores de IMMUTABLE

-- Comentarios
COMMENT ON TABLE clock_entries IS 'Registros de fichajes (entradas, salidas, descansos)';
COMMENT ON COLUMN clock_entries.is_manual IS 'true si el fichaje proviene de una solicitud aprobada';
COMMENT ON COLUMN clock_entries.request_id IS 'ID de la solicitud que generó este fichaje (si aplica)';


-- ============================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para la tabla users
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para la tabla requests
CREATE TRIGGER update_requests_updated_at
    BEFORE UPDATE ON requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- DATOS DE PRUEBA
-- ============================================

-- Insertar usuarios de ejemplo
INSERT INTO users (employee_code, full_name, email, role, department) VALUES
  ('12345', 'Juan Pérez', 'juan.perez@onya.com', 'worker', 'Habitaciones'),
  ('11111', 'María García', 'maria.garcia@onya.com', 'admin', 'Administración'),
  ('22222', 'Carlos López', 'carlos.lopez@onya.com', 'supervisor', 'Recepción');

-- Insertar algunos fichajes de ejemplo para el usuario 12345
INSERT INTO clock_entries (user_id, entry_type, clock_time, is_manual)
SELECT 
  u.id,
  'ENTRADA',
  '2026-01-17 09:00:00+00',
  false
FROM users u WHERE u.employee_code = '12345';

INSERT INTO clock_entries (user_id, entry_type, clock_time, is_manual)
SELECT 
  u.id,
  'SALIDA',
  '2026-01-17 14:30:00+00',
  false
FROM users u WHERE u.employee_code = '12345';

INSERT INTO clock_entries (user_id, entry_type, clock_time, is_manual)
SELECT 
  u.id,
  'ENTRADA',
  '2026-01-18 09:15:00+00',
  false
FROM users u WHERE u.employee_code = '12345';

-- Insertar una solicitud de ejemplo
INSERT INTO requests (user_id, entry_type, requested_datetime, reason, status)
SELECT 
  u.id,
  'ENTRADA',
  '2026-01-16 09:00:00+00',
  'Olvidé fichar al llegar',
  'pending'
FROM users u WHERE u.employee_code = '12345';


-- ============================================
-- POLÍTICAS DE SEGURIDAD (RLS - Row Level Security)
-- ============================================

-- Activar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clock_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- USUARIOS: Los usuarios pueden ver su propia información
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (true);  -- Por ahora permitimos ver todos los usuarios

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (true);

-- FICHAJES: Los usuarios solo pueden ver y crear sus propios fichajes
CREATE POLICY "Users can view all clock entries"
  ON clock_entries FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own clock entries"
  ON clock_entries FOR INSERT
  WITH CHECK (true);

-- SOLICITUDES: Los usuarios pueden ver y crear sus propias solicitudes
CREATE POLICY "Users can view all requests"
  ON requests FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own requests"
  ON requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update requests"
  ON requests FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete their own pending requests"
  ON requests FOR DELETE
  USING (true);



-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que todo se creó correctamente
SELECT 'Usuarios creados:' as mensaje, count(*) as total FROM users;
SELECT 'Fichajes creados:' as mensaje, count(*) as total FROM clock_entries;
SELECT 'Solicitudes creadas:' as mensaje, count(*) as total FROM requests;
