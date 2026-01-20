# Guía de Configuración: Supabase Storage para Fotos de Perfil

Esta guía te ayudará a configurar el bucket de Storage en Supabase para almacenar las fotos de perfil de los usuarios.

## Paso 1: Aplicar Migración de Base de Datos

Primero, ejecuta el script SQL para agregar el campo `avatar_url` a la tabla `users`:

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **SQL Editor** (en el menú lateral)
3. Haz clic en **New query**
4. Copia y pega el contenido del archivo [add_avatar_field.sql](file:///c:/Users/luisy/OneDrive/Escritorio/Agencia%20Suiza/12.%20App%20Control%20Horario/ControlHorario_Onya/database/add_avatar_field.sql)
5. Haz clic en **Run** para ejecutar la migración

## Paso 2: Crear Bucket de Storage

1. En Supabase Dashboard, navega a **Storage** (en el menú lateral)
2. Haz clic en **Create a new bucket**
3. Configura el bucket con los siguientes valores:
   - **Name**: `avatars`
   - **Public bucket**: ✅ **Activado** (para que las URLs sean accesibles públicamente)
   - **File size limit**: 5MB (opcional, pero recomendado)
   - **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp` (opcional)
4. Haz clic en **Create bucket**

## Paso 3: Configurar Políticas de Acceso (RLS Policies)

Ahora necesitas configurar las políticas de seguridad para el bucket `avatars`:

### 3.1 Política de Lectura Pública (SELECT)

Esta política permite que cualquiera pueda ver las fotos de perfil.

1. En el bucket `avatars`, ve a **Policies**
2. Haz clic en **New Policy**
3. Selecciona **For full customization**
4. Configura la política:
   - **Policy name**: `Public avatar read access`
   - **Allowed operation**: `SELECT`
   - **Target roles**: `public`
   - **USING expression**:
     ```sql
     true
     ```
5. Haz clic en **Review** y luego en **Save policy**

### 3.2 Política de Subida (INSERT)

Esta política permite que los usuarios autenticados suban sus fotos de perfil.

1. Haz clic en **New Policy**
2. Selecciona **For full customization**
3. Configura la política:
   - **Policy name**: `Authenticated users can upload avatars`
   - **Allowed operation**: `INSERT`
   - **Target roles**: `authenticated`
   - **WITH CHECK expression**:
     ```sql
     bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
     ```
4. Haz clic en **Review** y luego en **Save policy**

### 3.3 Política de Actualización (UPDATE)

Esta política permite que los usuarios actualicen sus propias fotos.

1. Haz clic en **New Policy**
2. Selecciona **For full customization**
3. Configura la política:
   - **Policy name**: `Users can update own avatars`
   - **Allowed operation**: `UPDATE`
   - **Target roles**: `authenticated`
   - **USING expression**:
     ```sql
     bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
     ```
   - **WITH CHECK expression**:
     ```sql
     bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
     ```
4. Haz clic en **Review** y luego en **Save policy**

### 3.4 Política de Eliminación (DELETE)

Esta política permite que los usuarios eliminen sus propias fotos antiguas.

1. Haz clic en **New Policy**
2. Selecciona **For full customization**
3. Configura la política:
   - **Policy name**: `Users can delete own avatars`
   - **Allowed operation**: `DELETE`
   - **Target roles**: `authenticated`
   - **USING expression**:
     ```sql
     bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
     ```
4. Haz clic en **Review** y luego en **Save policy**

## Paso 4: Verificar Configuración

Para verificar que todo está configurado correctamente:

1. Ve a **Storage** → **avatars**
2. Verifica que el bucket esté marcado como **Public**
3. Ve a **Policies** y confirma que tienes 4 políticas:
   - ✅ Public avatar read access (SELECT)
   - ✅ Authenticated users can upload avatars (INSERT)
   - ✅ Users can update own avatars (UPDATE)
   - ✅ Users can delete own avatars (DELETE)

## ¡Listo!

Ahora tu aplicación está lista para subir y gestionar fotos de perfil. Los usuarios podrán:

- Ver las fotos de perfil de todos los usuarios
- Subir su propia foto de perfil
- Actualizar su foto de perfil existente
- El sistema eliminará automáticamente fotos antiguas cuando se suba una nueva

---

**Nota de Seguridad**: Las políticas RLS garantizan que solo los usuarios puedan modificar sus propias fotos. El patrón `(storage.foldername(name))[1] = auth.uid()::text` verifica que el usuario solo puede acceder a archivos en su propia carpeta (identificada por su `user_id`).
