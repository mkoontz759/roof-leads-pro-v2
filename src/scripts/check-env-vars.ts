import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config();
}

// Define required environment variables
const requiredVars = [
  'MONGODB_URI',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'SPARK_API_TOKEN',
  'SPARK_API_URL',
  'CRON_SECRET',
  'API_KEY',
  'DEBUG_API_KEY',
  'LOCALDEV_API_KEY',
  'APP_NAME',
  'NEXT_PUBLIC_APP_URL'
];

// Optional but recommended variables
const recommendedVars = [
  'MLS_CLIENT_ID',
  'MLS_CLIENT_SECRET',
  'MLS_USERNAME',
  'MLS_PASSWORD',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];

// Check for required environment variables
const missingRequired = requiredVars.filter(varName => !process.env[varName]);

// Check for recommended environment variables
const missingRecommended = recommendedVars.filter(varName => !process.env[varName]);

console.log('\n=== Environment Variables Check ===\n');

if (missingRequired.length === 0) {
  console.log('✅ All required environment variables are set correctly.');
} else {
  console.log(`❌ Missing ${missingRequired.length} required environment variables:`);
  missingRequired.forEach(varName => {
    console.log(`   - ${varName}`);
  });
}

if (missingRecommended.length > 0) {
  console.log(`\n⚠️  Missing ${missingRecommended.length} recommended environment variables:`);
  missingRecommended.forEach(varName => {
    console.log(`   - ${varName}`);
  });
}

// Check for potential hardcoded values
console.log('\n=== Checking for Potential Hardcoded Values ===\n');

const sensitivePatterns = [
  /3tk5g91q5f96npri34ilsb6a5/,  // Known hardcoded SPARK API token
  /mongodb\+srv:\/\//,           // MongoDB connection strings
  /Bearer [A-Za-z0-9\-_]+/       // Bearer tokens
];

function scanFiles(dir: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!file.startsWith('node_modules') && !file.startsWith('.next') && !file.startsWith('.git')) {
        fileList = scanFiles(filePath, fileList);
      }
    } else if (file.match(/\.(js|ts|tsx|jsx)$/)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

let hardcodedValuesFound = false;
const sourceFiles = scanFiles(path.resolve(process.cwd(), 'src'));

sourceFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  
  sensitivePatterns.forEach(pattern => {
    if (pattern.test(content)) {
      console.log(`❌ Potential hardcoded sensitive value in: ${path.relative(process.cwd(), filePath)}`);
      hardcodedValuesFound = true;
    }
  });
});

if (!hardcodedValuesFound) {
  console.log('✅ No obvious hardcoded sensitive values found.');
}

console.log('\n=== Environment Check Complete ===\n');

if (missingRequired.length > 0) {
  process.exit(1);
} 