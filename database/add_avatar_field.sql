-- Agregar campo avatar_url a la tabla users
-- Este campo almacenará la URL pública de la foto de perfil del usuario en Supabase Storage

ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Comentario para documentar el campo
COMMENT ON COLUMN users.avatar_url IS 'URL pública de la foto de perfil del usuario almacenada en Supabase Storage (bucket: avatars)';
