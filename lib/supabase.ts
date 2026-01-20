import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// IMPORTANTE: Reemplaza estos valores con los de tu proyecto Supabase
// Los encuentras en: Project Settings > API > Publishable key
const supabaseUrl = 'https://ymnpntgmjwoidwnysigq.supabase.co';
const supabasePublishableKey = 'sb_publishable_95278JDZbxpRBAEjd2sxkw_u7AizelC';  // La key que empieza con sb_publishable_...

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// Tipos para TypeScript
export interface User {
    id: string;
    employee_code: string;
    full_name: string;
    email?: string;
    phone?: string;
    phone_country_code?: string;
    phone_extension?: string;
    birth_date?: string;
    role: 'worker' | 'admin' | 'supervisor';
    department?: string;
    avatar_url?: string;
    created_at: string;
    updated_at: string;
    is_active: boolean;
}

export interface ClockEntry {
    id: string;
    user_id: string;
    entry_type: 'ENTRADA' | 'SALIDA' | 'ENTRADA_2' | 'SALIDA_2' | 'DESCANSO';
    clock_time: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
    created_at: string;
    is_manual: boolean;
    request_id?: string;
}

export interface Request {
    id: string;
    user_id: string;
    entry_type: 'ENTRADA' | 'SALIDA' | 'ENTRADA_2' | 'SALIDA_2' | 'DESCANSO';
    requested_datetime: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewed_by?: string;
    reviewed_at?: string;
    review_notes?: string;
    created_at: string;
    updated_at: string;
}
