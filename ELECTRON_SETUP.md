# Electron Desktop App Setup Guide

## Overview

This guide will help you create a desktop installer for your Point of Sale system that connects to your Vercel-deployed backend.

## Prerequisites

1. Your app is deployed on Vercel
2. You have the Vercel deployment URL (e.g., `https://your-app-name.vercel.app`)
3. Node.js and npm installed

## Step 1: Update Vercel URL Configuration

### Option A: Using Environment Variable (Recommended)

1. Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_API_URL=https://your-app-name.vercel.app
VERCEL_URL=your-app-name.vercel.app
```

2. Update `electron/main.js` line 28:

```javascript
const vercelUrl = process.env.VERCEL_URL || "your-app-name.vercel.app";
```

Replace `'your-app-name.vercel.app'` with your actual Vercel URL.

3. Update `src/lib/apiConfig.ts` line 13:

```typescript
const vercelUrl =
  process.env.NEXT_PUBLIC_API_URL || "https://your-app-name.vercel.app";
```

Replace `'https://your-app-name.vercel.app'` with your actual Vercel URL.

### Option B: Hardcode URL (For quick testing)

Directly replace the placeholder URLs in:

- `electron/main.js` (line 28)
- `src/lib/apiConfig.ts` (line 13)

## Step 2: Build the Next.js App

```bash
npm run build
```

This creates the production build in the `.next` directory (or `out` if you kept that configuration).

## Step 3: Create the Electron Installer

### For Windows:

```bash
npm run electron-pack
```

This will create a Windows installer (NSIS) in the `dist` folder.

### For macOS:

```bash
npm run electron-pack
```

This will create a DMG file in the `dist` folder.

### For Linux:

```bash
npm run electron-pack
```

This will create an AppImage in the `dist` folder.

## Step 4: Distribution Files

After running `npm run electron-pack`, you'll find installers in the `dist` directory:

- **Windows**: `Point of Sale System Setup x.x.x.exe`
- **macOS**: `Point of Sale System-x.x.x.dmg`
- **Linux**: `Point of Sale System-x.x.x.AppImage`

## How It Works

### Development Mode

- In development (`npm run electron-dev`), the Electron app loads from `http://localhost:3000`
- API calls use relative URLs, which work with localhost

### Production Mode

- When built, the Electron app loads directly from your Vercel deployment URL
- All API calls are configured to use your Vercel backend
- The app connects to your online MongoDB database via the Vercel API routes

## Configuration Files

### `electron/main.js`

- Controls the Electron window
- In production, loads from Vercel URL instead of local files

### `src/lib/apiConfig.ts`

- Central configuration for API base URLs
- Automatically detects protocol and adjusts URLs accordingly

### `package.json` (build section)

- Configures electron-builder for creating installers
- Defines output formats for each platform

## Troubleshooting

### App not connecting to database

1. Verify your Vercel URL is correct in both `electron/main.js` and `src/lib/apiConfig.ts`
2. Check that environment variables are set in Vercel dashboard
3. Ensure MongoDB connection string is correct in Vercel

### Installer not creating

1. Make sure `npm run build` completed successfully
2. Check that `electron/main.js` exists
3. Verify electron-builder is installed: `npm install --save-dev electron-builder`

### App loads blank page

1. Check browser console (DevTools) for errors
2. Verify Vercel deployment is accessible
3. Ensure CORS is properly configured (should be fine with Next.js API routes)

## Testing the Desktop App

1. **Development Testing:**

   ```bash
   npm run electron-dev
   ```

2. **Production Testing:**

   ```bash
   npm run build
   npm run electron
   ```

3. **Build and Test Installer:**
   ```bash
   npm run electron-pack
   # Then run the installer from dist/ folder
   ```

## Updating the App

When you update your Vercel deployment:

1. Simply rebuild the Electron app with the same URL configuration
2. The desktop app will automatically load your latest Vercel deployment
3. No need to update the desktop app unless the API structure changes

## Security Notes

- The Electron app loads your web app from Vercel
- All API calls go through your Vercel deployment
- Database connections are handled server-side by Vercel
- No sensitive data is stored in the Electron app itself
