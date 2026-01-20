import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { authService } from './auth.service';
import { userService } from './user.service';

export const profilePictureService = {
    /**
     * Solicitar permisos de cámara
     */
    async requestCameraPermission(): Promise<boolean> {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        return status === 'granted';
    },

    /**
     * Solicitar permisos de galería
     */
    async requestMediaLibraryPermission(): Promise<boolean> {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        return status === 'granted';
    },

    /**
     * Seleccionar imagen desde la galería
     */
    async pickImageFromGallery(): Promise<{ success: boolean; uri?: string; error?: string }> {
        try {
            const hasPermission = await this.requestMediaLibraryPermission();
            if (!hasPermission) {
                return { success: false, error: 'Se requieren permisos de galería' };
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (result.canceled) {
                return { success: false, error: 'Selección cancelada' };
            }

            return { success: true, uri: result.assets[0].uri };
        } catch (error) {
            console.error('Error picking image from gallery:', error);
            return { success: false, error: 'Error al seleccionar imagen' };
        }
    },

    /**
     * Tomar foto con la cámara
     */
    async pickImageFromCamera(): Promise<{ success: boolean; uri?: string; error?: string }> {
        try {
            const hasPermission = await this.requestCameraPermission();
            if (!hasPermission) {
                return { success: false, error: 'Se requieren permisos de cámara' };
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (result.canceled) {
                return { success: false, error: 'Captura cancelada' };
            }

            return { success: true, uri: result.assets[0].uri };
        } catch (error) {
            console.error('Error taking photo:', error);
            return { success: false, error: 'Error al tomar foto' };
        }
    },

    /**
     * Subir foto de perfil a Supabase Storage y actualizar usuario
     */
    async uploadProfilePicture(imageUri: string): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
        try {
            const currentUser = await authService.getCurrentUser();
            if (!currentUser) {
                return { success: false, error: 'No autenticado' };
            }

            // Obtener perfil actual para eliminar foto anterior si existe
            const profileResult = await userService.getCurrentUserProfile();
            const oldAvatarUrl = profileResult.user?.avatar_url;

            // Crear nombre único para el archivo
            const fileExt = imageUri.split('.').pop();
            const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
            const filePath = `${currentUser.id}/${fileName}`;

            // Convertir URI a blob para subir
            const response = await fetch(imageUri);
            const blob = await response.blob();

            // Subir a Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, blob, {
                    contentType: blob.type,
                    upsert: false,
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                return { success: false, error: 'Error al subir imagen' };
            }

            // Obtener URL pública
            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const publicUrl = data.publicUrl;

            // Actualizar perfil de usuario con nueva URL
            const updateResult = await userService.updateUserProfile({
                avatar_url: publicUrl,
            });

            if (!updateResult.success) {
                // Si falla la actualización, intentar eliminar la imagen subida
                await this.deleteProfilePictureFromStorage(filePath);
                return { success: false, error: 'Error al actualizar perfil' };
            }

            // Eliminar foto anterior si existía
            if (oldAvatarUrl) {
                await this.deleteOldProfilePicture(oldAvatarUrl);
            }

            return { success: true, avatarUrl: publicUrl };
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            return { success: false, error: 'Error al subir foto de perfil' };
        }
    },

    /**
     * Eliminar foto de perfil anterior
     */
    async deleteOldProfilePicture(avatarUrl: string): Promise<void> {
        try {
            // Extraer path del archivo desde la URL
            const urlParts = avatarUrl.split('/avatars/');
            if (urlParts.length < 2) return;

            const filePath = urlParts[1];
            await this.deleteProfilePictureFromStorage(filePath);
        } catch (error) {
            console.error('Error deleting old profile picture:', error);
        }
    },

    /**
     * Eliminar archivo del storage
     */
    async deleteProfilePictureFromStorage(filePath: string): Promise<void> {
        try {
            await supabase.storage
                .from('avatars')
                .remove([filePath]);
        } catch (error) {
            console.error('Error deleting from storage:', error);
        }
    },

    /**
     * Obtener URL pública de una imagen
     */
    getPublicUrl(filePath: string): string {
        const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
        return data.publicUrl;
    },
};
