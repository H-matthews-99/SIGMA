import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sb_publishable_a72mysIayb6rGM5I_LcYJw_GBoJDkqv';
const supabaseAnonKey = 'sb_secret_rp0cdbAxGTvL4NYzCPrTaQ_2OtVQew_';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);