// Script to check the structure of a listing in the database
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkListingStructure() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Query for a pending listing
    const listing = await mongoose.connection.collection('mls_listings')
      .findOne({ 'standardFields.standardStatus': 'Active Under Contract' });
    
    console.log('Found pending listing:');
    console.log(JSON.stringify(listing, null, 2));
    
    // Query for an active listing
    const activeListing = await mongoose.connection.collection('mls_listings')
      .findOne({ 'standardFields.standardStatus': 'Active' });
    
    console.log('\nFound active listing:');
    console.log(JSON.stringify(activeListing, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkListingStructure(); 