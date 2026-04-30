const express = require('express');
const router = express.Router();
const { chat } = require('../services/geminiService');

function getClientErrorMessage(error, fallback) {
    const message = error && error.message ? error.message : "";

    if (message.includes("GEMINI_API_KEY")) {
        return "Gemini API key is missing. Please add GEMINI_API_KEY to your .env file.";
    }

    return fallback;
}

// Chat Route
router.post('/', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'No message provided' });
        }
        
        const replyText = await chat(message);
        res.json({ reply: replyText, result: replyText });
    } catch (error) {
        console.error("Full Chat Route Error Details:", error);
        res.status(500).json({ error: getClientErrorMessage(error, 'Failed to generate response') });
    }
});

module.exports = router;
