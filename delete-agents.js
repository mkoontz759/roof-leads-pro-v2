require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in environment variables');
  process.exit(1);
}

// Define the MLSAgent schema (simplified)
const agentSchema = new mongoose.Schema({}, { strict: false });
const MLSAgent = mongoose.models.MLSAgent || mongoose.model('MLSAgent', agentSchema);

async function deleteAllAgents() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Count agents before deletion
    const countBefore = await MLSAgent.countDocuments();
    console.log(`Total agents before deletion: ${countBefore}`);

    // Delete all agents
    const result = await MLSAgent.deleteMany({});
    console.log(`Deleted ${result.deletedCount} agents`);

    // Verify deletion
    const countAfter = await MLSAgent.countDocuments();
    console.log(`Total agents after deletion: ${countAfter}`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

deleteAllAgents(); 