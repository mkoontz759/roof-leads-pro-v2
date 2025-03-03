const mongoose = require('mongoose');
require('dotenv').config();

async function restoreAgents() {
  try {
    // Connect to database
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/roof-leads-pro';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    
    // Define MLSAgent schema with all required fields
    const AgentSchema = new mongoose.Schema({
      memberKey: String,
      memberKeyNumeric: Number,
      memberMlsId: String,
      fullName: String,
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      officeName: String,
      modificationTimestamp: Date,
      source: String,
      sourceId: String,
      association: String,
      pendingListings: Array,
      updatedAt: { type: Date, default: Date.now }
    }, { strict: false, collection: 'mlsagents' });
    
    const Agent = mongoose.model('MLSAgent', AgentSchema);
    
    // Check current state
    const currentCount = await Agent.countDocuments();
    console.log(`Current agent count: ${currentCount}`);
    
    // Import a batch of test agents to ensure the view works
    const testAgents = [
      {
        memberKey: "test1",
        memberKeyNumeric: 1001,
        fullName: "John Smith",
        firstName: "John",
        lastName: "Smith",
        email: "john@example.com",
        phone: "555-123-4567",
        officeName: "Best Realty",
        source: "spark",
        sourceId: "test1",
        association: "aar",
        updatedAt: new Date()
      },
      {
        memberKey: "test2",
        memberKeyNumeric: 1002,
        fullName: "Jane Doe",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        phone: "555-987-6543",
        officeName: "Premier Properties",
        source: "spark",
        sourceId: "test2",
        association: "aar",
        updatedAt: new Date()
      },
      {
        memberKey: "test3",
        memberKeyNumeric: 1003,
        fullName: "Robert Johnson",
        firstName: "Robert",
        lastName: "Johnson",
        email: "robert@example.com",
        phone: "555-555-5555",
        officeName: "Elite Homes",
        source: "spark",
        sourceId: "test3",
        association: "aar",
        updatedAt: new Date()
      }
    ];
    
    // Insert test agents if we don't have many agents
    if (currentCount < 5) {
      console.log("Inserting test agents to ensure the view works...");
      for (const agent of testAgents) {
        await Agent.updateOne(
          { memberKey: agent.memberKey },
          { $set: agent },
          { upsert: true }
        );
      }
      console.log("Test agents inserted");
    }
    
    // Trigger the full sync via API endpoint
    console.log("Triggering MLS sync for agents...");
    const axios = require('axios');
    try {
      const response = await axios.get('http://localhost:3000/api/debug/sync-all-agents?key=localdev');
      console.log("Sync API response:", response.data);
    } catch (error) {
      console.log("Error triggering sync:", error.message);
    }
    
    // Recheck the count
    const newCount = await Agent.countDocuments();
    console.log(`Updated agent count: ${newCount}`);
    
  } catch (error) {
    console.error('Error restoring agents:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

restoreAgents(); 