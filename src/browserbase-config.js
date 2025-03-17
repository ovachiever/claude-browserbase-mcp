// BrowserBase Configuration
const { BrowserBase } = require('@browserbasehq/sdk');

// Initialize the SDK with your API key
const browserbase = new BrowserBase({
  apiKey: process.env.BROWSERBASE_API_KEY,
  // Optional: Configure your preferred region
  region: 'us-east-1', // Or your preferred region
});

module.exports = browserbase;
