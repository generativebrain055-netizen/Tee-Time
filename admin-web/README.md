# Tee Time Admin

Admin web app for Tee Time. Uses the **same theme** as the React Native mobile app (TTSGolfApp) for a consistent look and feel.

## Stack

- **Vite** + **React 18** + **TypeScript**
- **React Router** for routing
- Theme via CSS variables (aligned with `TTSGolfApp/ui/theme/tokens`)

## Setup

```bash
cd admin-web
npm install
```

## Environment

Copy `.env.example` to `.env` and set your backend API URL:

```bash
cp .env.example .env
```

**Backend (super admin):** The backend uses `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` for admin login. To enable **MFA (TOTP)**, set `SUPER_ADMIN_MFA_SECRET` in the backend env to a base32 secret and add it to an authenticator app (e.g. Google Authenticator). After password sign-in, the admin portal will prompt for the 6-digit code.

## Run

```bash
npm run dev
```

Runs at **http://localhost:5174**. API requests to `/api` are proxied to the backend (default `http://localhost:3000`).

## Build

```bash
npm run build
npm run preview   # preview production build
```

## Theme

Colors, spacing, radii, and typography mirror the mobile app:

- Primary green: `#5EBC68`
- Surfaces, text, borders use the same semantic tokens
- Inter font family

See `src/theme/colors.css` and `TTSGolfApp/ui/theme/tokens.ts` for the source of truth.
