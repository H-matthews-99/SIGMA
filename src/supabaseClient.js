import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sb_publishable_a72mysIayb6rGM5I_LcYJw_GBoJDkqv';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1Y3hvbW50YXd4Z3pmc3Zvd2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NDEyNTksImV4cCI6MjA5ODMxNzI1OX0.yMCF_Y9K3MshixdEFW5Yf1iPbwOl-6mQCxlUAUulYi8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);