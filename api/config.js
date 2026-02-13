// Vercel serverless: returns Supabase config from env so the client gets the correct keys at runtime (avoids build-time inlining issues).
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    url: process.env.VITE_SUPABASE_URL || '',
    anonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
  });
}
