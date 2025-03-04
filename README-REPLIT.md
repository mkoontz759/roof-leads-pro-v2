# Deploying RoofLeadsPro on Replit

This guide will help you set up the RoofLeadsPro application on Replit.

## Prerequisites

1. A Replit account
2. MongoDB Atlas database
3. SPARK API credentials
4. NextAuth configuration

## Setup Steps

### 1. Fork the Repository to Replit

1. In Replit, create a new project from GitHub
2. Connect your GitHub account and select the RoofLeadsPro repository
3. Let Replit clone the repository

### 2. Configure Environment Variables

1. In your Replit project, click on the lock icon in the left sidebar to open the "Secrets" panel
2. Add the following environment variables:

```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
NEXTAUTH_URL=https://<your-replit-app-url>
NEXTAUTH_SECRET=your-nextauth-secret-key
SPARK_API_TOKEN=your-spark-api-token
SPARK_API_URL=https://replication.sparkapi.com
CRON_SECRET=your-cron-secret-key
API_KEY=your-api-key
DEBUG_API_KEY=your-debug-api-key
LOCALDEV_API_KEY=your-localdev-api-key
APP_NAME=RoofLeadsPro
NEXT_PUBLIC_APP_URL=https://<your-replit-app-url>
```

Replace the placeholders with your actual values.

### 3. Install Dependencies and Build the App

1. In the Replit shell, run:
```bash
npm install
```

2. After installation completes, build the app:
```bash
npm run build
```

### 4. Run the Application

1. Start the application:
```bash
npm run start
```

Or simply press the "Run" button in the Replit interface.

## Troubleshooting

### Database Connection Issues

If you're having trouble connecting to MongoDB:

1. Ensure your IP address is whitelisted in MongoDB Atlas (or allow all IPs)
2. Check that your MongoDB URI is correct in the environment variables
3. Verify the database user has the correct permissions

### Build Failures

If the build fails:

1. Check the error logs in the Replit console
2. Ensure all dependencies are installed correctly
3. Verify that your environment variables are set correctly

### API Connection Issues

If you're having trouble with the SPARK API:

1. Verify your API token is correct
2. Check that the API URL is accessible from Replit
3. Test the API connection using the debug routes

## Maintenance

### Keeping Your App Running

Replit free tier will spin down your app when idle. To keep it running:

1. Set up a service like UptimeRobot to ping your app regularly
2. Use the built-in "Always On" feature in Replit (requires paid plan)

### Updating the Application

To update your application:

1. Pull the latest changes from GitHub
2. Install any new dependencies: `npm install`
3. Rebuild the application: `npm run build`
4. Restart the server: `npm run start` 