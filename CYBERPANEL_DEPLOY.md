# CyberPanel Frontend Deploy (Static)

The frontend is exported as a **static site** (`output: "export"`), so there is
**no Node process** to run on the server — just static HTML/JS/CSS files served by
CyberPanel / OpenLiteSpeed. All data comes from the backend API directly via
`NEXT_PUBLIC_API_URL`.

## 1. Build and package (from the `frontend` folder)

```powershell
npm run build
npm run package:cyberpanel
```

This produces `frontend/build.zip`. The zip contains `index.html`, `login/`,
`dashboard/`, `_next/`, etc. **at the top level** (not nested in an `out/` folder).

> The API URL is baked in at build time from `.env.local`
> (`NEXT_PUBLIC_API_URL=https://hrms-backend-t3lj.onrender.com/api`).
> If the backend URL changes, edit `.env.local` and rebuild.

## 2. Upload and extract on the server

1. CyberPanel → **Websites** → your domain → **File Manager**
2. Open the **`public_html`** folder
3. **Delete anything already inside it** (an old `index.html`, leftover standalone
   files, etc.)
4. Upload `build.zip` into `public_html`
5. **Extract** it (right-click → Extract). After extracting, `public_html` should
   contain `index.html`, `login/`, `dashboard/`, `_next/`, ... directly — not a
   `build/` or `out/` subfolder.
6. Delete `build.zip`

## 3. Verify

Open `https://your-domain.com` — the login page should load. Deep links like
`https://your-domain.com/login/` and `/dashboard/` work because each route is a
pre-rendered HTML page (trailing slash → `index.html` in that folder).

## Notes

- Make sure SSL is issued for the domain so the page loads over `https://`
  (the backend API is `https://`, and a mixed http/https page will be blocked by
  the browser).
- The backend (Render) must allow this domain in its CORS config, since the
  browser calls the backend directly from the deployed origin.
- No Node.js app, no app port, and no reverse proxy are needed for the frontend.
