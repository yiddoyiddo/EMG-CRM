# EMG-CRM Deployment Guide

## Vercel Deployment

This guide will help you deploy the EMG-CRM application to Vercel.

### Prerequisites

1. **Database**: You need a PostgreSQL database. Recommended options:
   - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
   - [Neon](https://neon.tech)
   - [Supabase](https://supabase.com)
   - [Railway](https://railway.app)

2. **Environment Variables**: Set up the following environment variables in your Vercel project:

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# NextAuth (for authentication)
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="https://your-domain.vercel.app"

# Sentry (optional - for error tracking)
NEXT_PUBLIC_SENTRY_DSN="your-sentry-dsn"
SENTRY_DSN="your-sentry-dsn"

# Exchange Rate API (optional - for currency conversion)
EXCHANGE_RATE_API_KEY="your-api-key"

# Slack Webhook (optional - for alerts)
SLACK_WEBHOOK_URL="your-slack-webhook-url"
```

### Deployment Steps

1. **Connect your repository to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Configure the project settings

2. **Set Environment Variables**:
   - In your Vercel project settings, go to "Environment Variables"
   - Add all the required environment variables listed above

3. **Database Setup**:
   - Set up your PostgreSQL database
   - Update the `DATABASE_URL` environment variable
   - The deployment will automatically run migrations

4. **Deploy**:
   - Push your code to the main branch
   - Vercel will automatically build and deploy your application

### Build Configuration

The project is configured with:
- **Framework**: Next.js 15
- **Build Command**: `npm run build`
- **Install Command**: `npm install`
- **Output Directory**: `.next`

### Database Migrations

Database migrations will run automatically during deployment. The build process includes:
- Prisma client generation
- Database migration deployment
- KPI targets seeding (if needed)

### Troubleshooting

#### Common Issues

1. **Database Connection Errors**:
   - Verify your `DATABASE_URL` is correct
   - Ensure your database is accessible from Vercel's servers
   - Check if your database provider allows external connections

2. **Build Failures**:
   - Check the build logs in Vercel dashboard
   - Ensure all environment variables are set
   - Verify TypeScript compilation passes locally

3. **Runtime Errors**:
   - Check the function logs in Vercel dashboard
   - Verify all API routes are properly configured
   - Ensure Prisma client is generated correctly

#### Local Testing

Before deploying, test locally:

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed data
npm run seed

# Start development server
npm run dev
```

### Post-Deployment

After successful deployment:

1. **Verify the application**:
   - Check all pages load correctly
   - Test API endpoints
   - Verify database connections

2. **Monitor performance**:
   - Use Vercel Analytics
   - Monitor Sentry for errors
   - Check function execution times

3. **Set up custom domain** (optional):
   - Configure your custom domain in Vercel
   - Update `NEXTAUTH_URL` to match your domain

### Security Considerations

- Keep your environment variables secure
- Use strong secrets for `NEXTAUTH_SECRET`
- Regularly rotate API keys
- Monitor for unauthorized access

### Support

For issues with:
- **Vercel**: Check [Vercel Documentation](https://vercel.com/docs)
- **Database**: Contact your database provider
- **Application**: Check the logs and error tracking
