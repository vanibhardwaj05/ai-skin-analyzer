const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { handleAnalyzeSkin, handleAnalyzeIngredients } = require('./routes/analyzeRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.post('/analyze', upload.single('image'), handleAnalyzeSkin);
app.post('/analyze-ingredients', upload.single('image'), handleAnalyzeIngredients);
app.use('/chat', chatRoutes);

// Catch-all middleware to serve the frontend for any other requests
app.use((req, res, next) => {
    // Avoid serving index.html for API routes that might have failed
    if (req.path.startsWith('/analyze') || req.path.startsWith('/chat')) {
        return next();
    }
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

module.exports = app;
