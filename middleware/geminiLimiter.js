const rateLimit = require('express-rate-limit');

// Limit to 15 Gemini requests per minute 
const geminiLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 15,
  message: { message: 'Gemini API rate limit reached. Please try again in a minute.' }
});

module.exports = geminiLimiter; 