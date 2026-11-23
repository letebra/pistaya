// Configuració pública de Supabase.
// La clau "anon" és pública per disseny: només dona els permisos que permeten
// les polítiques RLS de la base de dades. La clau "service_role" NO s'utilitza
// enlloc de l'aplicació.
export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rnyyzucqedrsjvihvltv.supabase.co';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJueXl6dWNxZWRyc2p2aWh2bHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0NDYwODUsImV4cCI6MjExMTAyMjA4NX0.q9mhfyfGAgLzbXN9IIslvhN0cipC0rdqaQWm7DwvV7U';

export const ZONA_HORARIA = 'Europe/Madrid';
export const DURADES_PERMESES = [60, 90, 120];      // minuts
export const MAX_RESERVES_FUTURES = 3;              // per persona usuària
export const DIES_ANTELACIO_MAX = 30;               // es pot reservar fins a 30 dies vista
export const HORES_MIN_CANVI = 2;                   // modificar/cancel·lar amb 2 h d'antelació
