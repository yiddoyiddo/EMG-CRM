This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Quick Deployment

1. **Set up a PostgreSQL database** (Vercel Postgres, Neon, Supabase, etc.)
2. **Configure environment variables** (see `env.template` for required variables)
3. **Deploy to Vercel** using the Vercel CLI or GitHub integration

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## EMG-CRM Reporting Suite

### Seed KPI Targets

```
npm run seed
```

### Generate Comprehensive Test Data

```
npx ts-node scripts/create-comprehensive-sales-test-data.ts
```

### Backfill Historical Date Fields

```
npx ts-node scripts/backfill-pipeline-dates.ts
```

### Running Locally

1. `npm install`
2. `npx prisma generate && npx prisma migrate dev`
3. `npm run dev`

Open `http://localhost:3000/reporting` for the executive dashboard.

### CSV Export

Each reporting view (Call Volume, Agreement Tracking, Lists Out) includes an **Export CSV** button to download the current dataset for offline analysis.

### Continuous Integration

Pushes & pull-requests to `main` trigger the **CI** workflow (`.github/workflows/ci.yml`) which runs linting and build steps on Node 20.
