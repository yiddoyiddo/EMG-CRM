# EMG-CRM Vercel Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Code Quality
- [x] TypeScript compilation passes
- [x] ESLint errors resolved (or ignored for build)
- [x] Build completes successfully
- [x] All dependencies are properly installed

### 2. Configuration Files
- [x] `vercel.json` created with proper configuration
- [x] `next.config.ts` updated for production
- [x] `package.json` includes necessary scripts
- [x] Environment variables template created (`env.template`)

### 3. Database Setup
- [ ] PostgreSQL database provisioned
- [ ] Database connection string ready
- [ ] Database migrations tested locally
- [ ] Seed data script ready

### 4. Environment Variables
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NEXTAUTH_SECRET` - Authentication secret
- [ ] `NEXTAUTH_URL` - Your Vercel domain URL
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - Sentry DSN (optional)
- [ ] `SENTRY_DSN` - Sentry DSN (optional)
- [ ] `EXCHANGE_RATE_API_KEY` - Currency conversion API key (optional)
- [ ] `SLACK_WEBHOOK_URL` - Slack notifications (optional)

## 🚀 Deployment Steps

### Step 1: Prepare Repository
```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 2: Set Up Vercel Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure project settings:
   - Framework Preset: Next.js
   - Root Directory: `./` (default)
   - Build Command: `npm run build`
   - Install Command: `npm install`
   - Output Directory: `.next`

### Step 3: Configure Environment Variables
In your Vercel project settings:
1. Go to "Environment Variables"
2. Add each required environment variable from the list above
3. Set environment to "Production" (and optionally "Preview" for testing)

### Step 4: Deploy
1. Vercel will automatically deploy when you push to main
2. Monitor the build logs for any issues
3. Check that the deployment completes successfully

## 🔧 Post-Deployment Verification

### 1. Basic Functionality
- [ ] Homepage loads correctly
- [ ] Navigation works
- [ ] All pages are accessible

### 2. Database Connection
- [ ] Database migrations ran successfully
- [ ] KPI targets seeded (if needed)
- [ ] Can create/read/update/delete records

### 3. API Endpoints
- [ ] All API routes respond correctly
- [ ] Authentication works (if implemented)
- [ ] Reporting functions work

### 4. Performance
- [ ] Pages load within acceptable time
- [ ] No console errors
- [ ] Mobile responsiveness works

## 🐛 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check build logs in Vercel dashboard
   - Verify all environment variables are set
   - Ensure TypeScript compilation passes

2. **Database Connection Errors**
   - Verify `DATABASE_URL` is correct
   - Check database is accessible from Vercel
   - Ensure database provider allows external connections

3. **Runtime Errors**
   - Check function logs in Vercel dashboard
   - Verify API routes are properly configured
   - Check Sentry for error tracking

### Useful Commands

```bash
# Test build locally
npm run build

# Test database connection
npx prisma db push

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed data
npm run seed
```

## 📞 Support

- **Vercel Issues**: Check [Vercel Documentation](https://vercel.com/docs)
- **Database Issues**: Contact your database provider
- **Application Issues**: Check logs and error tracking

## 🎉 Success!

Once all items are checked off, your EMG-CRM application should be successfully deployed and running on Vercel!
