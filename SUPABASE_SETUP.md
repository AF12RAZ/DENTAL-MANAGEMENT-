# Supabase setup – production admin login

Follow these steps to use **real admin login** with Supabase (no demo credentials).

---

## 1. Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) and sign in (or create an account).
2. Click **New project**.
3. Choose your **organization**, set a **project name** and **database password** (save the password).
4. Pick a **region** and click **Create new project**. Wait until the project is ready.

---

## 2. Run the database schema

1. In the Supabase dashboard, open **SQL Editor** (left sidebar).
2. Click **New query**.
3. Open the file **`supabase-schema.sql`** in this project and copy its full contents.
4. Paste into the SQL Editor and click **Run** (or press Ctrl+Enter).
5. You should see “Success. No rows returned.” Tables `appointments` and `revenue` and RLS policies are now created.

---

## 3. Get your API keys

1. In the Supabase dashboard, go to **Project Settings** (gear icon in the left sidebar).
2. Click **API** in the left menu.
3. Copy:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`)
   - **anon public** key (under “Project API keys”)

---

## 4. Add env vars to your app

1. In the project root, copy `.env.example` to a new file named **`.env`** (same folder as `package.json`).
2. Edit **`.env`** and set:

   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
   ```

   Replace with your real **Project URL** and **anon public** key from step 3.

3. Save the file. Restart the dev server if it’s running (`npm run dev`).

---

## 5. Create the admin user (for login)

1. In the Supabase dashboard, go to **Authentication** → **Users** (left sidebar).
2. Click **Add user** (or **Invite user**).
3. Choose **Create new user**.
4. Enter:
   - **Email:** the email the admin will use to log in (e.g. `admin@goldengrove.com`).
   - **Password:** a strong password the admin will use.
5. Click **Create user** (or **Send invite**; if you use invite, the user may need to set their password from the email link first).

That email + password is the **admin login** for your site.

---

## 6. Use admin login on your site

1. Open your site (e.g. `http://localhost:5173` when running locally).
2. Scroll to the **footer** and click **“Staff login”** (or go directly to `/login`).
3. Enter the **same email and password** you created in step 5.
4. Click sign in. You should be redirected to the **Dashboard**; appointments and revenue are loaded from Supabase.

- **Booking form (public):** Patients can book without logging in; data is stored in Supabase.
- **Admin (after login):** Only logged-in admins see Dashboard, Calendar, Revenue and can approve/reject appointments and add revenue.

---

## Summary

| Step | What you do |
|------|------------------|
| 1 | Create Supabase project at supabase.com |
| 2 | Run `supabase-schema.sql` in SQL Editor |
| 3 | Copy Project URL + anon key from Settings → API |
| 4 | Create `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |
| 5 | Create admin user in Authentication → Users |
| 6 | On your site: footer **Staff login** → enter that email/password |

After this, admin login is **only** the Supabase user you created; the old demo credentials are not used when Supabase is configured.

---

## If "Return visits (offline)" on the Dashboard stays empty

If you added the **revenue** table before return-visit support existed, the table may be missing columns. In Supabase **SQL Editor**, run:

```sql
ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS will_visit_back boolean default false;
ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS follow_up_notes text;
```

Then reload the app. New offline transactions marked **Will visit back** will appear under Dashboard → Return visits → Offline, and will persist after refresh.
