# Point of Sale System - Vercel Deployment Guide

## Environment Variables Setup

To deploy this application on Vercel, you need to set up the following environment variables in your Vercel dashboard:

### Required Environment Variables

1. **MONGODB_URI**

   - Your MongoDB connection string
   - Example: ``
   - Get this from your MongoDB Atlas dashboard

2. **JWT_SECRET**
   - A secure random string for JWT token signing
   - Generate a strong secret for production use
   - Example: `your-super-secure-jwt-secret-key-here`

### How to Set Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable:
   - Name: `MONGODB_URI`
   - Value: Your MongoDB connection string
   - Environment: Production, Preview, Development (select all)
5. Repeat for `JWT_SECRET`

## Deployment Steps

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set up the environment variables as described above
4. Deploy!

## Build Configuration

The project is configured with:

- Next.js 15.5.4
- MongoDB with Mongoose
- TypeScript
- Tailwind CSS
- ESLint (updated configuration)

## API Routes

All API routes have been updated to handle missing database connections gracefully, returning appropriate error responses when the database is not available.

## Troubleshooting

If you encounter build errors:

1. Ensure all environment variables are set in Vercel
2. Check that your MongoDB connection string is correct
3. Verify that your MongoDB cluster allows connections from Vercel's IP ranges
