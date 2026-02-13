# Golden Grove Dental Lounge – Deployment & Use Checklist

Use this checklist to deploy the app and hand it over to the client (admin) and patients.

---

## 1. Pre-deployment (Supabase & local)

- [ ] **Supabase project** created at [supabase.com](https://supabase.com)
- [ ] **SQL schema** run: Supabase Dashboard → SQL Editor → paste & run `supabase-schema.sql`
- [ ] **Admin user** created: Authentication → Users → Add user (email + password)
- [ ] **Email confirmation** (optional): Authentication → Providers → Email → turn off “Confirm email” if you want instant login
- [ ] **API keys** copied: Project Settings → API → Project URL + anon public key
- [ ] **Local `.env`** has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same as above)
- [ ] **Dependencies** installed: `npm install`
- [ ] **Build** works: `npm run build` (no errors)
- [ ] **Local test**: `npm run dev` → Staff login → use Supabase admin email/password → Dashboard loads

---

## 2. Deploy frontend (Vercel / Netlify / Cloudflare)

- [ ] **Git repo** created (GitHub/GitLab) and project pushed  
  - Do **not** commit `.env` (ensure it’s in `.gitignore`)
- [ ] **New project** on Vercel (or Netlify / Cloudflare Pages) → Import your repo
- [ ] **Build settings**
  - Build command: `npm run build`
  - Output directory: `dist`
  - Root directory: leave blank (unless app is in a subfolder)
- [ ] **Environment variables** (in host’s dashboard)
  - `VITE_SUPABASE_URL` = your Supabase Project URL
  - `VITE_SUPABASE_ANON_KEY` = your Supabase anon public key
- [ ] **Deploy** and wait for success
- [ ] **Live URL** works: open site → Book Appointment → submit → then Staff login → Dashboard

---

## 3. Post-deployment checks

- [ ] **Booking flow**: Submit a test booking → appears in Supabase Table Editor → `appointments`
- [ ] **Admin login**: Footer → Staff login → Supabase admin email/password → Dashboard, Calendar, Revenue
- [ ] **Approve/Reject**: From Dashboard, approve or reject a pending appointment → status and revenue (if approved) update correctly
- [ ] **Mobile**: Open live URL on phone → layout and booking form work

---

## 4. Handoff to client (admin)

Share with the clinic:

- **Site URL:** `https://your-deployed-url.com` (replace with real URL)
- **How to log in:** Scroll to footer → click **“Staff login”** → enter the **admin email and password** you created in Supabase (Authentication → Users).
- **What they can do:**
  - **Dashboard:** See today’s appointments, pending approvals, today’s revenue, week total. Approve or reject pending bookings (calling the patient to confirm is the process).
  - **Calendar:** Month view of appointments; click a day to see list; click an appointment for details or “Mark as completed.”
  - **Revenue:** Log new payments (amount, method, date, notes); see weekly chart and payment mix; view recent transactions.
- **Confirmation process:** “Our team will call you within 3 hours to confirm” — staff use the phone number shown in the dashboard to call patients.

---

## 5. Handoff for patients (booking)

Share with patients (e.g. link on website, social media, QR):

- **Booking URL:** `https://your-deployed-url.com` (or direct link to `/book` if you add one)
- **What they do:** Open link → **Book Appointment** → fill name, phone, email, service, preferred date → submit.
- **What they see:** “Request received. We'll call you within 3 hours to confirm.” No email/SMS; clinic will call to confirm.

---

## 6. Optional later

- [ ] **Custom domain:** In Vercel/Netlify, add your domain and point DNS
- [ ] **Backups:** Supabase backups (or exports) if needed for compliance
- [ ] **Remove demo login:** If you want to remove the fallback demo credentials from code (only when 100% on Supabase)

---

## Quick reference

| Role    | URL              | Action                                      |
|---------|------------------|---------------------------------------------|
| Patient | your-site.com   | Book Appointment → submit form              |
| Admin   | your-site.com   | Footer → Staff login → email/password → Dashboard |
