// config.js

// 1. Tes identifiants (récupérés dans Supabase > Settings > API)
const SUPABASE_URL = 'https://dpqxaevnarnhmxihkggk.supabase.co'; // ex: https://xyz.supabase.co
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwcXhhZXZuYXJuaG14aWhrZ2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3ODM4NjcsImV4cCI6MjA4MTM1OTg2N30.IhW3TKv4txBVcY1CRlaUGicZ5Ax3GgnQSuCPI_mIIOA'; 

// 2. Vérification que la librairie est bien chargée
if (typeof window.supabase === 'undefined') {
    console.error("ERREUR CRITIQUE : La librairie Supabase n'est pas chargée. Vérifie ton index.html !");
} else {
    // 3. CRÉATION DU CLIENT
    // Attention : on utilise window.supabase (la librairie) pour créer notre variable 'supabase' (le client)
    var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase initialisé avec succès !");
}