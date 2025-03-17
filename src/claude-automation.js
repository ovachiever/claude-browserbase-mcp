// Claude Automation using BrowserBase
const browserbase = require('./browserbase-config');
require('dotenv').config();

async function runClaudeAutomation() {
  try {
    // Launch a new browser instance
    const browser = await browserbase.launch({
      headless: false, // Set to true for production
      defaultViewport: { width: 1280, height: 800 },
    });

    // Create a new page
    const page = await browser.newPage();
    
    // Navigate to Claude desktop URL
    await page.goto(process.env.CLAUDE_URL || 'https://claude.ai');
    
    console.log('Navigated to Claude');
    
    // Wait for the page to load
    await page.waitForSelector('textarea, [role="textbox"]', { timeout: 30000 });
    console.log('Chat interface detected');
    
    // Example automation: Send a message to Claude
    await sendMessageToClaude(page, 'Hello Claude, this is a test message from BrowserBase MCP');
    
    // Wait for Claude's response
    await waitForClaudeResponse(page);
    
    // Close the browser after our automation is complete
    await browser.close();
    console.log('Automation completed successfully');
    
  } catch (error) {
    console.error('Error during automation:', error);
  }
}

// Helper function to send a message to Claude
async function sendMessageToClaude(page, message) {
  try {
    // Find the input element (the selector may vary based on Claude's interface)
    const inputSelector = 'textarea, [role="textbox"]';
    await page.waitForSelector(inputSelector);
    
    // Type the message
    await page.type(inputSelector, message);
    
    // Press Enter or click send button (adjust based on Claude's interface)
    await page.keyboard.press('Enter');
    // Alternative: await page.click('[data-testid="send-button"]');
    
    console.log('Message sent to Claude:', message);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// Helper function to wait for Claude's response
async function waitForClaudeResponse(page) {
  try {
    // This selector should target Claude's response elements
    // You may need to adjust this based on actual DOM structure
    const responseSelector = '[data-testid="message-content"], .claude-response';
    
    // Wait for the response to appear
    await page.waitForSelector(responseSelector, { timeout: 60000 });
    
    // Wait for the typing indicator to disappear (if applicable)
    await page.waitForFunction(() => {
      const typingIndicator = document.querySelector('[data-testid="typing-indicator"]');
      return !typingIndicator || typingIndicator.style.display === 'none';
    }, { timeout: 60000 });
    
    console.log('Claude responded to the message');
    
    // Optionally extract the response text
    const responseText = await page.evaluate((selector) => {
      const responseElement = document.querySelector(selector);
      return responseElement ? responseElement.textContent : '';
    }, responseSelector);
    
    console.log('Response content:', responseText.substring(0, 100) + '...');
  } catch (error) {
    console.error('Error waiting for response:', error);
  }
}

// Export the function for use in other modules
module.exports = { runClaudeAutomation };

// Run the automation if this script is executed directly
if (require.main === module) {
  runClaudeAutomation();
}
