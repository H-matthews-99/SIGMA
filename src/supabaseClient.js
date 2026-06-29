import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'MASUKKAN_URL_SUPABASE_ANDA_DISINI';
const supabaseAnonKey = 'MASUKKAN_ANON_KEY_SUPABASE_ANDA_DISINI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);