// Vercel serverless: returns Supabase config from env so the client gets the correct keys at runtime.
// Use the Legacy anon key (JWT, starts with eyJ) in VITE_SUPABASE_ANON_KEY so PostgREST accepts Authorization: Bearer.
// Optional: set SUPABASE_ANON_JWT to the Legacy anon key; it overrides VITE_SUPABASE_ANON_KEY when present.
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const anonKey =
    process.env.SUPABASE_ANON_JWT ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';
  res.json({
    url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    anonKey,
  });
}
