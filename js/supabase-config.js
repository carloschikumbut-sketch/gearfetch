// js/supabase-config.js

// 1. Check if they exist in the browser's global scope (Vercel injection)
// OR fall back to the local file if you're testing on your computer
const SUPABASE_URL = process.env.SUPABASE_URL || window.ENV?.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || window.ENV?.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Supabase keys not found!");
} else {
    window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("GEAR FETCH connected securely!");
}
