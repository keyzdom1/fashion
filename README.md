# Fashion E-Commerce

Full-stack fashion e-commerce website.

**Stack:** Next.js 14 · FastAPI · Neon PostgreSQL · Stripe · Cloudinary

## Structure

- `/frontend` — Next.js 14 App Router storefront + admin (Vercel)
- `/backend` — FastAPI REST API (Render/Fly.io)

## Local Setup

### Backend

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

### Seed admin

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
