# Fashion E-Commerce

Full-stack fashion e-commerce website.

**Stack:** Next.js 14 · FastAPI · Neon PostgreSQL · Stripe · Cloudinary

## Structure

- `/frontend` — Next.js 14 App Router storefront + admin (Vercel)
- `/backend` — FastAPI REST API (Render/Fly.io)

## Deploy

### 1. Backend → Render

1. Push this repo to GitHub (done: `keyzdom1/fashion`).
2. On [Render](https://dashboard.render.com) → **New** → **Blueprint** → connect the repo.
3. Render picks up `render.yaml`. Set env var **`DATABASE_URL`** to your Neon connection string (use `ssl=require`, not `sslmode=`):
   ```
   postgresql+asyncpg://neondb_owner:...@ep-....neon.tech/neondb?ssl=require
   ```
4. Deploy → note the URL, e.g. `https://fashion-api.onrender.com`.

### 2. Frontend → Vercel

1. On [Vercel](https://vercel.com/new) → **Import** repo `keyzdom1/fashion`.
2. Root `vercel.json` already builds `/frontend`. If asked for Root Directory, set it to `frontend`.
3. Env var:
   ```
   NEXT_PUBLIC_API_URL=https://fashion-dim3.onrender.com/api/v1
   ```
4. Deploy.

After both are up, open the Vercel URL — store, cart, and admin should work.

### Local

**Backend**

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env                             # set DATABASE_URL to your Neon branch
alembic upgrade head
python seed.py
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/api/v1/docs

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Site: http://localhost:3000

### Admin login

- Email: `donworldwider2@gmail.com`
- Password: `lapTOP1`

- Email: `admin@fashion.test`
- Password: `Admin123!`

## Environments

| Env | Frontend | Backend | Database |
|-----|----------|---------|----------|
| Local | `next dev` | `uvicorn --reload` | Neon `dev` branch |
| Staging | Vercel preview | Render staging | Neon `staging` branch |
| Production | Vercel | Render prod | Neon `main` branch |

## Environment Variables

**Backend** (`backend/.env`): `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CLOUDINARY_*`, `RESEND_API_KEY`, `CORS_ORIGINS`

**Frontend** (`frontend/.env.local`): `NEXT_PUBLIC_API_URL`

Never commit secrets. Use Vercel/Render env settings in production.

## CI/CD

GitHub Actions runs lint + tests on every PR; merge to `main` deploys staging.
