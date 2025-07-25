const express = require('express');
const router = express.Router();
const {reviewCards, swipeCard, updateNext} = require('../Controllers/FlashCard')

router.post('/review', reviewCards);
router.post('/swipeCard', swipeCard);
router.post('/update', updateNext);

module.exports = router;