// Script to diagnose transaction data issues
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function diagnoseTransactions() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get a sample listing
    const listing = await mongoose.connection.collection('mls_listings')
      .findOne({ 'standardFields.standardStatus': 'Active Under Contract' });
    
    if (listing) {
      console.log('Found a listing with Active Under Contract status:');
      console.log(JSON.stringify(listing, null, 2));
    } else {
      const anyListing = await mongoose.connection.collection('mls_listings').findOne();
      
      if (anyListing) {
        console.log('Found a listing (any status):');
        console.log(JSON.stringify(anyListing, null, 2));
        console.log('\nListing status:', anyListing.standardFields?.standardStatus);
        
        // Check fields used in the transactions page
        console.log('\nKey fields for transactions page:');
        console.log('standardFields.streetNumberNumeric:', anyListing.standardFields?.streetNumberNumeric);
        console.log('standardFields.streetName:', anyListing.standardFields?.streetName);
        console.log('standardFields.city:', anyListing.standardFields?.city);
        console.log('standardFields.stateOrProvince:', anyListing.standardFields?.stateOrProvince);
        console.log('standardFields.postalCode:', anyListing.standardFields?.postalCode);
        console.log('standardFields.listPrice:', anyListing.standardFields?.listPrice);
        
        // Check if the standardFields structure matches what we expect
        console.log('\nKeys in standardFields:');
        if (anyListing.standardFields) {
          console.log(Object.keys(anyListing.standardFields));
        } else {
          console.log('No standardFields property found!');
        }
      } else {
        console.log('No listings found in the database');
      }
    }
    
    // Check the agent document structure
    const agent = await mongoose.connection.collection('mlsagents').findOne();
    if (agent) {
      console.log('\nAgent document structure:');
      console.log(JSON.stringify(agent, null, 2));
    } else {
      console.log('\nNo agents found in the database');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

diagnoseTransactions(); 