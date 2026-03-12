# 🏠 משימות הבית — Supabase + Netlify Setup

## What you need (all free)
- **Supabase** account → supabase.com
- **GitHub** account → github.com
- **Netlify** account → netlify.com

---

## STEP 1 — Create your Supabase database (5 minutes)

1. Go to **https://supabase.com** → Sign in → **New project**
   - Name: `chores-family`
   - Pick any region close to Israel (e.g. `eu-central-1`)
   - Set a database password → **Create project** (takes ~1 minute)

2. In the left sidebar click **SQL Editor** → click **New query**

3. Paste this SQL and click **Run**:

```sql
create table family_data (
  id   int primary key,
  data jsonb not null default '{}'::jsonb
);

-- Allow anyone to read and write (fine for a private family app)
alter table family_data enable row level security;
create policy "allow all" on family_data for all using (true) with check (true);

-- Insert the initial empty row
insert into family_data (id, data) values (1, '{"log":[],"bonus":{"ido":0,"yotam":0,"itai":0}}');

-- Enable Realtime on the table (needed for instant sync)
alter publication supabase_realtime add table family_data;
```

4. Go to **Settings → API** (left sidebar)
   - Copy **Project URL** (looks like `https://xyzabc.supabase.co`)
   - Copy **anon public** key (long string starting with `eyJ...`)

5. Open `src/supabase.js` and paste them:

```js
const SUPABASE_URL = "https://xyzabc.supabase.co";   // ← your URL
const SUPABASE_KEY = "eyJ...";                         // ← your anon key
```

---

## STEP 2 — Push to GitHub (3 minutes)

```bash
npm install
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/chores-family.git
git push -u origin main
```

---

## STEP 3 — Deploy on Netlify (2 minutes)

1. Go to **https://netlify.com** → Log in
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** → select `chores-family`
4. Build settings (auto-detected from `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click **Deploy site** ✅

Your site will be live at something like:
`https://chores-family-abc123.netlify.app`

Every push to GitHub redeploys automatically.

---

## Changing the PINs

Open `src/App.jsx`, find the USERS array at the top:

```js
{ id: "asaf", name: "אסף", ..., pin: "1234" },  // ← change
{ id: "anna", name: "אנה", ..., pin: "5678" },  // ← change
```

Push to GitHub → Netlify redeploys in ~30 seconds.

---

## How syncing works

- Data is stored in **Supabase** (PostgreSQL database)
- The app **polls every 8 seconds** — if any device adds a chore, all other devices see it within 8 seconds
- A small 🟢/🟡 dot in the corner shows sync status
- The free Supabase tier supports up to 500MB and 2GB of bandwidth — more than enough for a family app

---

## File structure

```
chores-family/
├── src/
│   ├── App.jsx        ← main app (all components)
│   ├── supabase.js    ← database connection ← EDIT THIS
│   └── main.jsx       ← entry point
├── index.html
├── package.json
├── vite.config.js
└── netlify.toml
```
