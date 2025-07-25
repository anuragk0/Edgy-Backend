const express = require('express')
const router = express.Router();
const { generateFlashCards, answerQuestion } = require('../Controllers/Upload');
const uploadWithErrorHandler = require('../../middleware/uploadMiddleware');
const geminiLimiter = require('../../middleware/geminiLimiter');

router.post('/uploadFile', geminiLimiter, uploadWithErrorHandler, generateFlashCards);
router.post('/answer', geminiLimiter, answerQuestion);

module.exports = router;