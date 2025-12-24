# Railway Deployment Guide

This guide will walk you through deploying your Book Catalog app to Railway with persistent storage and PWA support for your Samsung Android 15 device.

## Prerequisites

- A Railway account (sign up at [railway.app](https://railway.app))
- Your GitHub repository connected to Railway
- A Samsung device with Android 15

## Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and log in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `books-n-shit/book-catalog` repository
5. Railway will automatically detect it as a Next.js project

## Step 2: Add Volume for Persistent Storage

**CRITICAL:** This step ensures your book data persists across deployments.

1. In your Railway project dashboard, click on your service
2. Go to the **"Volumes"** tab
3. Click **"New Volume"**
4. Configure the volume:
   - **Mount Path:** `/data`
   - **Name:** `book-data` (or any name you prefer)
5. Click **"Add Volume"**

## Step 3: Set Environment Variables

1. In your service dashboard, go to the **"Variables"** tab
2. Click **"New Variable"**
3. Add the following variable:
   ```
   DATA_PATH=/data
   ```
4. Click **"Add"**

## Step 4: Deploy

1. Railway will automatically build and deploy your app
2. Wait for the deployment to complete (usually 2-5 minutes)
3. Once deployed, Railway will provide you with a URL (e.g., `https://your-app.up.railway.app`)

## Step 5: Generate PWA Icons

The app currently has placeholder icons. You need to create actual icons:

### Option A: Use an Online Generator
1. Go to [favicon.io](https://favicon.io/favicon-generator/) or [realfavicongenerator.net](https://realfavicongenerator.net/)
2. Create a 512x512 icon with a book theme
3. Download the generated icons
4. Replace `/public/icon-192.png` and `/public/icon-512.png` with your icons
5. Commit and push to trigger a new deployment

### Option B: Use Existing Images
1. Find or create a 512x512 PNG image
2. Use an image editor to resize it to 192x192 for the smaller icon
3. Replace the placeholder files in `/public/`
4. Commit and push

## Step 6: Install PWA on Android 15

1. Open Chrome or Samsung Internet on your Samsung device
2. Navigate to your Railway URL (e.g., `https://your-app.up.railway.app`)
3. Tap the **menu (⋮)** in the browser
4. Select **"Add to Home screen"** or **"Install app"**
5. Confirm the installation
6. The app will now appear on your home screen like a native app

### PWA Features on Android 15:
- ✅ Works offline (after first load)
- ✅ Full-screen experience (no browser UI)
- ✅ Fast loading with service worker caching
- ✅ Syncs data across your mobile and computer
- ✅ Persistent storage on Railway volume

## Step 7: Verify Everything Works

1. **Add a book** on your mobile device
2. **Open the app** on your computer using the same Railway URL
3. **Verify** the book appears on both devices
4. **Test offline**: Turn off WiFi/data on mobile, the app should still load (with cached data)

## Data Storage

Your book data is stored in `/data/books.json` on the Railway volume. This means:

- ✅ Data persists across deployments
- ✅ Data is shared between all your devices
- ✅ Data survives container restarts
- ✅ You can backup the data by downloading the JSON file

## Troubleshooting

### Books not syncing between devices?
- Check that both devices are using the same Railway URL
- Refresh the page to fetch latest data
- Check Railway logs for API errors

### PWA not installing on Android?
- Ensure you're using HTTPS (Railway provides this automatically)
- Make sure the manifest.json is accessible at `/manifest.json`
- Try using Chrome instead of Samsung Internet
- Clear browser cache and try again

### Data not persisting after deployment?
- Verify the volume is mounted at `/data` in Railway dashboard
- Check that `DATA_PATH=/data` environment variable is set
- Check Railway logs for file system errors

### Service Worker not working?
- Check browser console for service worker registration errors
- Ensure `/sw.js` is accessible
- Try unregistering old service workers in browser DevTools

## Accessing Your Data

To backup or view your raw data:

1. Go to Railway dashboard
2. Click on your service
3. Go to the **"Deployments"** tab
4. Click on the latest deployment
5. Open the **"Shell"** or **"Logs"** tab
6. Run: `cat /data/books.json` to view your data

## Updating the App

When you push changes to GitHub:
1. Railway automatically detects the changes
2. Builds and deploys the new version
3. Your data in `/data/books.json` remains intact
4. Users may need to refresh or clear cache to see updates

## Custom Domain (Optional)

1. In Railway dashboard, go to **"Settings"**
2. Click **"Generate Domain"** or add your custom domain
3. Follow Railway's instructions for DNS setup
4. Update your PWA installation with the new URL

## Security Note

This is a single-user app with no authentication. Anyone with the URL can access and modify your book catalog. To add security:

- Use Railway's built-in authentication
- Add a simple password protection layer
- Keep your Railway URL private

## Support

- Railway Docs: [docs.railway.app](https://docs.railway.app)
- PWA Docs: [web.dev/progressive-web-apps](https://web.dev/progressive-web-apps/)
- Next.js Docs: [nextjs.org/docs](https://nextjs.org/docs)
