const mongoose = require('mongoose');
require('dotenv').config();

async function checkAgents() {
  try {
    // Connect to database
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/roof-leads-pro';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    
    // Define MLSAgent schema
    const AgentSchema = new mongoose.Schema({}, { strict: false, collection: 'mlsagents' });
    const Agent = mongoose.model('MLSAgent', AgentSchema);
    
    // Count agents
    const agentCount = await Agent.countDocuments();
    console.log(`Total agents in database: ${agentCount}`);
    
    // Get sample agents to verify data structure
    const sampleAgents = await Agent.find().limit(2);
    console.log('\nSample Agent Data:');
    console.log(JSON.stringify(sampleAgents, null, 2));
    
    // Count listings for reference
    const ListingSchema = new mongoose.Schema({}, { strict: false, collection: 'mlslistings' });
    const Listing = mongoose.model('MLSListing', ListingSchema);
    const listingCount = await Listing.countDocuments();
    console.log(`\nTotal listings in database: ${listingCount}`);
    
  } catch (error) {
    console.error('Error checking agents:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkAgents(); 