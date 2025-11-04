const express = require('express')
const router = express.Router();
const { generateFlashCards, answerQuestion } = require('../Controllers/Upload');
const uploadWithErrorHandler = require('../../middleware/uploadMiddleware');
const geminiLimiter = require('../../middleware/geminiLimiter');
const {isAuthenticated} = require('../Controllers/User')

router.post('/uploadFile', isAuthenticated, geminiLimiter, uploadWithErrorHandler, generateFlashCards);
router.post('/answer', isAuthenticated, geminiLimiter, answerQuestion);

module.exports = router;