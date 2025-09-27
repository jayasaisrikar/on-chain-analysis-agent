# 🚀 Vercel Deployment Guide

This guide will help you deploy your Crypto Analysis Agent to Vercel.

## Prerequisites

- A Vercel account ([sign up here](https://vercel.com/signup))
- API keys for:
  - OpenAI API
  - Google AI (Gemini) API  
  - CoinAPI (optional, for market data)

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/your-repo&env=OPENAI_API_KEY,GOOGLE_API_KEY,COINAPI_KEY)

## Manual Deployment

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Clone and Setup

```bash
git clone <your-repo-url>
cd frontend
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file based on `.env.example`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys:

```env
OPENAI_API_KEY=sk-your-openai-key
GOOGLE_API_KEY=your-gemini-api-key
COINAPI_KEY=your-coinapi-key
```

### 4. Deploy to Vercel

```bash
vercel
```

Follow the prompts:
- Link to existing project or create new one
- Choose your deployment settings
- Set production environment variables

### 5. Set Environment Variables in Vercel Dashboard

1. Go to your project in the [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

| Variable Name | Description | Required |
|---------------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes (if using OpenAI) |
| `GOOGLE_API_KEY` | Your Google AI API key | Yes (if using Gemini) |
| `COINAPI_KEY` | Your CoinAPI key | Optional |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | No |

## Configuration Options

### App Configuration

In `app/page.tsx`, you can configure the app behavior:

```typescript
const appConfig: Partial<AppConfig> = {
  // Set to true to use environment keys, false to require user keys
  fallbackToEnvKeys: true,
  
  // Set to false to hide user settings UI completely
  enableUserSettings: true,
  
  // Set to true to always require user API keys
  requireUserApiKeys: false
};
```

### API Routes Configuration

The `vercel.json` file is configured for:
- **60 seconds** timeout for analysis API
- **30 seconds** timeout for other APIs
- Optimal caching headers
- Regional deployment (US East)

## Troubleshooting

### Build Errors

1. **Module not found errors**: Make sure all dependencies are in `package.json`
2. **Webpack errors**: Check the webpack configuration in `next.config.mjs`
3. **TypeScript errors**: Run `npm run build` locally first

### Runtime Errors

1. **API key errors**: Verify environment variables are set correctly
2. **CORS errors**: Check API route configurations
3. **Timeout errors**: Increase function timeout in `vercel.json`

### Performance Issues

1. **Slow builds**: The app uses code splitting and optimization
2. **Large bundle size**: Three.js and Babylon.js are code-split
3. **API latency**: Consider upgrading to Vercel Pro for better performance

## Domain Configuration

### Custom Domain

1. Go to **Settings** → **Domains** in Vercel Dashboard
2. Add your custom domain
3. Configure DNS records as instructed

### SSL Certificate

Vercel automatically provides SSL certificates for all domains.

## Monitoring

### Analytics

Enable Vercel Analytics in your dashboard for:
- Page views and performance metrics
- Core Web Vitals monitoring
- Real user monitoring

### Logs

View function logs in:
- **Functions** tab in Vercel Dashboard
- Real-time logs during development with `vercel dev`

## Environment-Specific Deployment

### Development
```bash
vercel dev
```

### Preview (Staging)
```bash
vercel --prod=false
```

### Production
```bash
vercel --prod
```

## Advanced Configuration

### Custom Build Command

If you need a custom build process, modify `vercel.json`:

```json
{
  "buildCommand": "npm run build:custom",
  "installCommand": "npm ci"
}
```

### Edge Functions

For better performance, consider moving lightweight APIs to Edge Runtime by adding to your API routes:

```typescript
export const runtime = 'edge';
```

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Project Issues](https://github.com/your-username/your-repo/issues)

---

**🎉 Your Crypto Analysis Agent is now ready for deployment!**