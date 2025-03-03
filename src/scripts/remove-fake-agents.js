/**
 * This script removes all fake agent data and code from the application
 * 
 * Instructions:
 * 1. Delete all fake agents from the database
 * 2. Update all listings to use real agent data or MLS-based identifiers
 * 3. Remove all code that generates fake agent data
 * 
 * Files to modify:
 * - src/lib/services/spark-sync.ts
 *   - Remove generateRealisticAgentName function
 *   - Remove cityAgentMap
 *   - Update extractAgentInfo to use real data only
 *   - Replace all instances of agent-${city} with MLS-based identifiers
 * 
 * - src/app/api/debug/fix-agent-keys/route.ts
 *   - Delete this file entirely as it generates fake agent data
 * 
 * Steps to run:
 * 1. First, delete all fake agents:
 *    curl -X GET "http://localhost:3000/api/debug/clear-fake-agents?key=localdev"
 * 
 * 2. Then run a full sync with real agent data:
 *    curl -X GET "http://localhost:3000/api/debug/sync-real-agents?key=localdev"
 * 
 * 3. Check agent data from the API:
 *    curl -X GET "http://localhost:3000/api/debug/check-agent-data?key=localdev"
 */

console.log('Please follow the instructions in this file to remove all fake agent data and code.');
console.log('This is a guide file, not an executable script.'); 