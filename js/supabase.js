const SUPABASE_URL = "https://ecfrcyeltvmcaymmedcc.supabase.co";
const SUPABASE_KEY = "sb_publishable_ghriEXc9lI6DUknYbn2MeQ_82L935w9";

// Create Supabase client and expose it globally
window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);