#!/bin/bash

echo "=== Replit Next.js + Tailwind CSS Deployment Fix ==="
echo "Starting deployment at $(date)"

# Backup original package.json if it exists and we haven't already backed it up
if [ -f "package.json" ] && [ ! -f "package.json.original" ]; then
  echo "Backing up original package.json..."
  cp package.json package.json.original
fi

# Create a simplified package.json for Replit
echo "Creating simplified package.json for Replit..."
cat > package.json << 'EOL'
{
  "name": "realestate-saas",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start -p ${PORT:-3000}",
    "lint": "next lint",
    "prepare": "exit 0"
  },
  "dependencies": {
    "@next-auth/mongodb-adapter": "^1.1.3",
    "mongodb": "^5.9.2",
    "mongoose": "^8.11.0",
    "next": "14.2.20",
    "next-auth": "^4.24.11",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "autoprefixer": "10.4.14",
    "postcss": "8.4.24",
    "tailwindcss": "3.3.2"
  }
}
EOL

# Create Tailwind config
echo "Creating Tailwind config..."
cat > tailwind.config.js << 'EOL'
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [require("tailwindcss-animate")],
}
EOL

# Create PostCSS config
echo "Creating PostCSS config..."
cat > postcss.config.js << 'EOL'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOL

# Clean existing build
echo "Cleaning existing build..."
rm -rf .next node_modules

# Create basic eslint config to avoid dependency on eslint plugin
cat > .eslintrc.json << 'EOL'
{
  "extends": "next/core-web-vitals"
}
EOL

# Make sure npm is available
echo "Setting up npm..."
export PATH=/home/runner/.nvm/versions/node/v18.19.0/bin:$PATH

# Install dependencies
echo "Installing dependencies..."
npm install --legacy-peer-deps

# Install Next.js globally to make sure it's available
echo "Installing Next.js globally..."
npm install -g next@14.2.20

# Install Tailwind CSS globally to make it available
echo "Installing Tailwind CSS globally..."
npm install -g tailwindcss@3.3.2 postcss@8.4.24 autoprefixer@10.4.14

# Link global binaries to local
echo "Creating symbolic links..."
mkdir -p node_modules/.bin
ln -sf $(which next) node_modules/.bin/next
ln -sf $(which tailwindcss) node_modules/.bin/tailwindcss

# Verify executable paths
echo "Verifying paths..."
which next
which tailwindcss

# Build the app
echo "Building the application..."
export NODE_OPTIONS="--max-old-space-size=4096"
$(which next) build

# Start the app
echo "Starting the application..."
$(which next) start -p ${PORT:-3000}

echo "Setup complete!" 