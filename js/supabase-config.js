// js/supabase-config.js

// Safely pull from the global ENV object
const SUPABASE_URL = window.ENV?.SUPABASE_URL;
const SUPABASE_KEY = window.ENV?.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Supabase configuration missing! Check your env.js.");
} else if (typeof supabase !== 'undefined') {
    window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });
    console.log("GEAR FETCH connected!");
} else {
    console.error("Supabase library not found!");
}