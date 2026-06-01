// js/supabase-config.js

// 1. Define your credentials
const SUPABASE_URL = 'https://bbzdwxrljjdabynquqvm.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiemR3eHJsampkYWJ5bnF1cXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODU0MDgsImV4cCI6MjA4NzM2MTQwOH0.vJgV1_mYDAGoZs-PfvjCu3EWPXmkoCX0b_Xs8c7qISQ';

// 2. Initialize with Persistence and attach to window
// This ensures that login sessions are saved in the browser's localStorage
if (typeof supabase !== 'undefined') {
    window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
            persistSession: true, // Key fix: ensures the session "sticks" after refresh
            autoRefreshToken: true, // Automatically renews the session token
            detectSessionInUrl: true
        }
    });
    console.log("SneakerLab connected with Persistence! _supabase is ready.");
} else {
    console.error("Supabase library not found! Make sure the CDN script is above this file in your HTML.");
}

