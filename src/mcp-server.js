// MCP Server Integration with BrowserBase
const express = require('express');
const { runClaudeAutomation } = require('./claude-automation');
const browserbase = require('./browserbase-config');
require('dotenv').config();

const app = express();
app.use(express.json());

// Port configuration
const PORT = process.env.PORT || 3000;

// Track active browser sessions
const activeSessions = {};

// API endpoint to start a Claude interaction
app.post('/api/claude/start', async (req, res) => {
  try {
    const { sessionId = Date.now().toString(), initialPrompt } = req.body;
    
    if (activeSessions[sessionId]) {
      return res.status(400).json({ error: 'Session already exists' });
    }
    
    // Launch browser through BrowserBase
    const browser = await browserbase.launch({
      headless: true,
      defaultViewport: { width: 1280, height: 800 },
    });
    
    const page = await browser.newPage();
    await page.goto(process.env.CLAUDE_URL || 'https://claude.ai');
    await page.waitForSelector('textarea, [role="textbox"]', { timeout: 30000 });
    
    // Store session info
    activeSessions[sessionId] = { browser, page, messages: [] };
    
    // Send initial prompt if provided
    if (initialPrompt) {
      await page.waitForSelector('textarea, [role="textbox"]');
      await page.type('textarea, [role="textbox"]', initialPrompt);
      await page.keyboard.press('Enter');
      
      // Wait for Claude's response
      const responseSelector = '[data-testid="message-content"], .claude-response';
      await page.waitForSelector(responseSelector, { timeout: 60000 });
      
      // Extract response text
      const responseText = await page.evaluate((selector) => {
        const responseElement = document.querySelector(selector);
        return responseElement ? responseElement.textContent : '';
      }, responseSelector);
      
      // Store interaction in session history
      activeSessions[sessionId].messages.push({ 
        role: 'user', 
        content: initialPrompt 
      });
      
      activeSessions[sessionId].messages.push({ 
        role: 'assistant', 
        content: responseText 
      });
      
      return res.json({ 
        sessionId, 
        status: 'started', 
        initialResponse: responseText 
      });
    }
    
    return res.json({ sessionId, status: 'started' });
    
  } catch (error) {
    console.error('Error starting Claude session:', error);
    return res.status(500).json({ error: error.message });
  }
});

// API endpoint to send a message to Claude in an existing session
app.post('/api/claude/message', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Session ID and message are required' });
    }
    
    const session = activeSessions[sessionId];
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const { page } = session;
    
    // Send message to Claude
    await page.waitForSelector('textarea, [role="textbox"]');
    await page.type('textarea, [role="textbox"]', message);
    await page.keyboard.press('Enter');
    
    // Wait for Claude's response
    const responseSelector = '[data-testid="message-content"], .claude-response';
    await page.waitForSelector(responseSelector, { timeout: 60000 });
    
    // Wait for typing to complete
    await page.waitForFunction(() => {
      const typingIndicator = document.querySelector('[data-testid="typing-indicator"]');
      return !typingIndicator || typingIndicator.style.display === 'none';
    }, { timeout: 60000 });
    
    // Extract response text
    const responseText = await page.evaluate((selector) => {
      const elements = document.querySelectorAll(selector);
      // Get the last element (most recent response)
      return elements.length > 0 ? elements[elements.length - 1].textContent : '';
    }, responseSelector);
    
    // Store interaction in session history
    session.messages.push({ role: 'user', content: message });
    session.messages.push({ role: 'assistant', content: responseText });
    
    return res.json({ 
      sessionId, 
      response: responseText, 
      status: 'success' 
    });
    
  } catch (error) {
    console.error('Error sending message to Claude:', error);
    return res.status(500).json({ error: error.message });
  }
});

// API endpoint to end a session
app.post('/api/claude/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    const session = activeSessions[sessionId];
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Close the browser
    await session.browser.close();
    
    // Get conversation history
    const conversationHistory = session.messages;
    
    // Remove session
    delete activeSessions[sessionId];
    
    return res.json({ 
      sessionId, 
      status: 'ended', 
      conversationHistory 
    });
    
  } catch (error) {
    console.error('Error ending Claude session:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`MCP server running on port ${PORT}`);
  console.log(`BrowserBase integration active`);
});
