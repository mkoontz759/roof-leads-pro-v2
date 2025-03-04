# Replit Deployment Guide for RoofLeadsPro

This guide will help you deploy the RoofLeadsPro application on Replit.

## Required Environment Variables (Secrets)

Add these to Replit Secrets (lock icon in the sidebar):

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/database` |
| `NEXTAUTH_URL` | Full URL of your Replit app | `https://roof-leads-pro-v2.replit.app` |
| `NEXTAUTH_SECRET` | Secret for NextAuth sessions | `your-secure-random-string` |
| `NEXT_PUBLIC_APP_URL` | Same as NEXTAUTH_URL | `https://roof-leads-pro-v2.replit.app` |
| `APP_NAME` | Application name | `RoofLeadsPro` |

## Deployment Steps

1. **Import from GitHub**:
   - Go to [replit.com/new](https://replit.com/new)
   - Click "Import from GitHub"
   - Enter your repository URL
   - Click "Import"

2. **Add Environment Variables**:
   - Click the lock icon in the sidebar
   - Add all required secrets listed above
   - Click "Add new secret" for each one

3. **Deploy the Application**:
   - Click the "Run" button
   - Wait for the build to complete
   - Your app should be live at your Replit URL

## Troubleshooting

If you encounter issues:

1. **Build Errors**:
   - Check the console output for specific errors
   - Verify all required secrets are set
   - Make sure your MongoDB connection is valid

2. **Runtime Errors**:
   - Check browser console for client-side errors
   - Check Replit logs for server-side errors

3. **Database Connection Issues**:
   - Ensure your MongoDB URI is correct
   - Check if your IP is whitelisted in MongoDB Atlas
   - Verify the database name in the connection string

## Maintenance

To update your deployment:

1. Push changes to GitHub
2. In Replit, pull the latest changes
3. Click "Run" to rebuild and restart

## Support

If you need help, please refer to:
- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Replit Documentation](https://docs.replit.com) 