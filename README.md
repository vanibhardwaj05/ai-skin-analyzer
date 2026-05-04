# GlowLens - AI Skin Analyzer ✨

GlowLens is a modern, web-based AI assistant designed to provide personalized dermatological education and skincare recommendations. Utilizing the power of the Google Gemini API, GlowLens can analyze photos of your skin, scan product ingredient lists, and offer tailored skincare advice through an interactive chat interface.

## 🌟 Features

- **Skin Analysis:** Upload or capture a photo of your skin concern, and GlowLens will analyze visible features, suggest what it might be, and provide general skincare tips.
- **Ingredient Scanner:** Upload a photo of a skincare product's ingredient label. GlowLens will compare it against your skin context (e.g., oily, acne-prone, sensitive) to determine if it's a good fit.
- **Interactive Chat Assistant:** Chat directly with the GlowLens AI for educational dermatology insights and product recommendations based on your unique skin concerns.
- **Premium UI/UX:** A stunning, fully responsive UI built with modern "Glassmorphism" design, complete with smooth animations and dark mode support.

## 🛠️ Technology Stack

- **Frontend:** HTML5, Vanilla JavaScript, CSS3 (Custom Glassmorphism styling)
- **Backend:** Node.js, Express.js
- **File Uploads:** Multer (in-memory storage)
- **AI Integration:** Google Gemini API (Vision & Chat)

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine. You will also need an API key from Google AI Studio.

### 1. Clone the repository
```bash
git clone https://github.com/vanibhardwaj05/ai-skin-analyzer.git
cd ai-skin-analyzer
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory and add your credentials:
```env
GEMINI_API_KEY=your_api_key_here
PORT=3000
```

### 4. Start the Application
Start the Node.js Express server:
```bash
npm start
```
The application will be accessible at `http://localhost:3000`.

## ⚠️ Disclaimer
GlowLens is strictly an **educational tool** and should not replace professional medical advice. If you have severe, painful, spreading, or infected skin concerns, please consult a certified dermatologist immediately.
