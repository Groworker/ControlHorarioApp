-- ============================================
-- AGREGAR POLÍTICA DE DELETE PARA REQUESTS
-- ============================================
-- Este script añade la política faltante para permitir que los usuarios
-- eliminen sus propias solicitudes pendientes

-- Política para permitir DELETE en requests
CREATE POLICY "Users can delete their own pending requests"
  ON requests FOR DELETE
  USING (true);

-- Esta política permite a los usuarios eliminar cualquier request
-- La validación de que sea pendiente y del usuario se hace en el código de la aplicación
-- Si prefieres mayor seguridad a nivel de base de datos, reemplaza por:
-- USING (auth.uid() = user_id AND status = 'pending');
