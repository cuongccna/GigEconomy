/**
 * Airdrop Fetcher Cron Script
 * 
 * This script calls the /api/cron/fetch-airdrops endpoint
 * to fetch new airdrops from RSS feeds.
 * 
 * Run with: node scripts/cron-fetch-airdrops.js
 * Or via PM2 cron in ecosystem.config.js
 */

// Load environment variables from .env file
require('dotenv').config();

const https = require('https');
const http = require('http');

// Configuration from environment
const APP_URL = process.env.APP_URL || 'http://localhost:3006';
const CRON_SECRET = process.env.CRON_SECRET;

async function fetchAirdrops() {
  const url = `${APP_URL}/api/cron/fetch-airdrops`;
  
  console.log(`[${new Date().toISOString()}] Starting airdrop fetch...`);
  console.log(`Calling: ${url}`);
  
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const options = {
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    // Add authorization if CRON_SECRET is set
    if (CRON_SECRET) {
      options.headers['Authorization'] = `Bearer ${CRON_SECRET}`;
    }
    
    const req = client.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`[${new Date().toISOString()}] Response:`, result);
          
          if (result.success) {
            console.log(`✅ Successfully fetched airdrops. New tasks: ${result.newTasks}`);
          } else {
            console.error(`❌ Failed: ${result.error}`);
          }
          
          resolve(result);
        } catch (e) {
          console.error('Failed to parse response:', data);
          reject(e);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`[${new Date().toISOString()}] Request error:`, error.message);
      reject(error);
    });
    
    req.end();
  });
}

// Run the fetch
fetchAirdrops()
  .then(() => {
    console.log(`[${new Date().toISOString()}] Cron job completed.`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`[${new Date().toISOString()}] Cron job failed:`, error);
    process.exit(1);
  });
