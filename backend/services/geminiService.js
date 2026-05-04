const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const primaryModelName = process.env.GEMINI_MODEL || "gemini-1.5-flash"; 
const fallbackModelNames = ["gemini-1.5-flash-latest", "gemini-2.0-flash-exp"];
const modelNames = [primaryModelName, ...fallbackModelNames]
    .filter((modelName, index, models) => modelName && models.indexOf(modelName) === index);

if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured in .env. Requests will fail.");
}

// Initialize GoogleGenerativeAI with your API key.
const genAI = new GoogleGenerativeAI(apiKey || "");

function getModel(modelName) {
    // Use multimodal Gemini models so the same service can handle text and images.
    return genAI.getGenerativeModel({ model: modelName });
}


function fileToGenerativePart(file) {
    if (!file || !file.buffer) {
        throw new Error("No uploaded image data was received.");
    }

    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
        throw new Error("Uploaded file must be an image.");
    }

    return {
        inlineData: {
            data: file.buffer.toString("base64"),
            mimeType: file.mimetype
        },
    };
}

function cleanProblemContext(problemContext) {
    if (typeof problemContext !== "string") {
        return "";
    }

    const cleaned = problemContext.trim();
    const normalized = cleaned.toLowerCase();
    if (!cleaned || normalized === "undefined" || normalized === "null") {
        return "";
    }

    return cleaned;
}

function sanitizeModelText(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/^\s*\*\s+/gm, "- ")
        .trim();
}

function extractResponseText(result) {
    const response = result && result.response;

    try {
        const text = response && typeof response.text === "function" ? response.text() : "";
        if (text && text.trim()) {
            return sanitizeModelText(text);
        }
    } catch (error) {
        console.warn("Gemini response.text() did not return text:", error.message);
    }

    const candidateText = response && response.candidates
        ? response.candidates
            .flatMap(candidate => (candidate.content && candidate.content.parts) || [])
            .map(part => part.text)
            .filter(Boolean)
            .join("\n")
            .trim()
        : "";

    return sanitizeModelText(candidateText);
}

async function generateContent(parts, fallbackMessage) {
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing.");
    }

    let lastError;

    for (const modelName of modelNames) {
        try {
            const result = await getModel(modelName).generateContent(parts);
            const text = extractResponseText(result);

            return text || fallbackMessage;
        } catch (error) {
            lastError = error;

            if (!isRetryableGeminiError(error)) {
                throw error;
            }

            console.warn(`Gemini model ${modelName} failed with ${error.status || "unknown"}; trying fallback model.`);
        }
    }

    throw lastError;
}

function isRetryableGeminiError(error) {
    return [429, 500, 502, 503, 504].includes(error && error.status);
}

function isProductRecommendationRequest(message) {
    const text = cleanProblemContext(message).toLowerCase();

    return text.includes("product")
        && (text.includes("recommend") || text.includes("suggest"))
        && (text.includes("skin") || text.includes("acne") || text.includes("redness") || text.includes("oil"));
}

function buildFallbackProductRecommendations(message) {
    const text = cleanProblemContext(message).toLowerCase();
    const isOily = text.includes("oily") || text.includes("shine") || text.includes("forehead") || text.includes("nose");
    const hasRedness = text.includes("red") || text.includes("irritat") || text.includes("sensitive");
    const hasUnderEye = text.includes("under eye") || text.includes("under-eye") || text.includes("dark circles") || text.includes("darker areas under the eyes");
    const hasAcne = text.includes("acne") || text.includes("breakout") || text.includes("pimple");

    const suggestions = [
        "Product suggestions based on your uploaded skin analysis",
        "",
        "Gentle cleanser",
        isOily || hasAcne
            ? "Choose a mild gel cleanser for oily or combination skin. Look for salicylic acid if pores feel clogged, or a simple fragrance-free cleanser if your skin feels sensitive."
            : "Choose a mild fragrance-free cleanser that does not leave the skin tight or dry.",
        "Use once or twice daily. If redness increases, reduce to once daily.",
        "",
        "Lightweight moisturizer",
        "Choose a non-comedogenic gel-cream or lotion with niacinamide, glycerin, hyaluronic acid, or ceramides. This helps balance shine while supporting the skin barrier.",
        "Use morning and night.",
        "",
        "Daily sunscreen",
        "Use a broad-spectrum SPF 30 or higher. For redness or sensitivity, mineral sunscreen with zinc oxide can be a good option.",
        "Use every morning and reapply outdoors.",
    ];

    if (hasRedness) {
        suggestions.push(
            "",
            "Redness support",
            "Consider a calming serum or moisturizer with niacinamide, panthenol, centella, green tea, or azelaic acid. Start slowly and patch test first.",
            "Avoid harsh scrubs, strong exfoliating acids, and fragranced products while redness is active."
        );
    }

    if (hasAcne || isOily) {
        suggestions.push(
            "",
            "Oiliness or breakout support",
            "For occasional clogged pores, consider salicylic acid 0.5% to 2% two or three nights per week. For active pimples, benzoyl peroxide can help as a spot treatment.",
            "Do not start multiple actives at once, and avoid benzoyl peroxide near the eyes."
        );
    }

    if (hasUnderEye) {
        suggestions.push(
            "",
            "Under-eye area",
            "Use a gentle hydrating eye product or lightweight moisturizer with hyaluronic acid, glycerin, niacinamide, or caffeine. Keep sunscreen away from direct eye contact but protect the area carefully.",
            "Dark under-eye areas can be genetic or sleep-related, so skincare may only help mildly."
        );
    }

    suggestions.push(
        "",
        "Important caution",
        "Patch test new products, add one product at a time, and stop anything that burns or worsens redness. See a dermatologist if redness becomes painful, persistent, spreading, infected, or if breakouts are severe."
    );

    return suggestions.join("\n");
}

function buildFallbackIngredientScanAdvice(problemContext, skinContext) {
    const context = [cleanProblemContext(problemContext), cleanProblemContext(skinContext)]
        .filter(Boolean)
        .join("\n")
        .toLowerCase();
    const hasOiliness = context.includes("oily") || context.includes("shine") || context.includes("forehead") || context.includes("nose");
    const hasRedness = context.includes("red") || context.includes("sensitive") || context.includes("irritat");
    const hasUnderEye = context.includes("under eye") || context.includes("under-eye") || context.includes("dark");
    const hasAcne = context.includes("acne") || context.includes("breakout") || context.includes("pimple") || context.includes("comedone");
    const response = [
        "I could not read the product label right now because the AI service is busy. Please try the scan again in a moment, or type/paste the ingredient list here.",
        "",
        "Fit for your skin concern",
        "I can still compare the product once the ingredients are visible. Based on your saved skin context, here is what to look for."
    ];

    if (hasOiliness || hasAcne) {
        response.push(
            "",
            "Helpful ingredients for oiliness or breakouts",
            "Look for niacinamide, salicylic acid, zinc PCA, green tea, lightweight humectants like glycerin or hyaluronic acid, and non-comedogenic gel or lotion textures.",
            "",
            "Ingredients to be careful with",
            "Be careful with heavy oils, thick butters, very rich balms, high fragrance, and too many strong exfoliating acids in one product."
        );
    }

    if (hasRedness) {
        response.push(
            "",
            "Helpful ingredients for redness or sensitivity",
            "Look for panthenol, centella, allantoin, ceramides, niacinamide, colloidal oatmeal, green tea, or azelaic acid.",
            "",
            "Ingredients to be careful with",
            "Avoid strong fragrance, denatured alcohol near the top of the list, harsh scrubs, and high-strength acids if your skin is already red or irritated."
        );
    }

    if (hasUnderEye) {
        response.push(
            "",
            "Under-eye caution",
            "For the under-eye area, prefer gentle hydrating ingredients like hyaluronic acid, glycerin, niacinamide, caffeine, or peptides. Avoid strong acids, retinoids, fragrance, or benzoyl peroxide near the eyes unless guided by a professional."
        );
    }

    response.push(
        "",
        "How to use or avoid",
        "Patch test first, add one new product at a time, and stop if burning, swelling, or worsening redness occurs. If your concern is painful, spreading, infected, or persistent, see a dermatologist."
    );

    return response.join("\n");
}

async function analyzeSkin(file, problemContext) {
    try {
        const imagePart = fileToGenerativePart(file);
        const concern = cleanProblemContext(problemContext);
        const prompt = [
            "You are GlowAI, a careful dermatology education assistant.",
            "Analyze the uploaded skin photo using only visible observations from the image.",
            "Do not claim a definite diagnosis. Be practical, friendly, and concise.",
            concern
                ? `The user's stated concern is: "${concern}". Address this concern directly.`
                : "The user did not provide a specific concern, so identify visible skin patterns and likely care needs.",
            "Respond in plain text with these short sections:",
            "Visible observations",
            "What it may suggest",
            "Skin care suggestions",
            "When to see a dermatologist",
            "Avoid markdown tables and avoid asterisks."
        ].join("\n");

        return await generateContent(
            [prompt, imagePart],
            "I received the image, but I could not generate a clear skin analysis. Please try a brighter, sharper photo."
        );
    } catch (error) {
        console.error("Error in analyzeSkin:", error);
        throw error;
    }
}

async function analyzeIngredients(file, problemContext, skinContext) {
    const concern = cleanProblemContext(problemContext);
    const savedSkinContext = cleanProblemContext(skinContext);

    try {
        const imagePart = fileToGenerativePart(file);
        const prompt = [
            "You are GlowAI, a cosmetic chemist and dermatology education assistant.",
            "Read the uploaded product image or product ingredient label. Extract the product name and ingredients you can see.",
            "If the image does not show ingredients clearly, say that clearly and ask for a clearer ingredients-label photo.",
            savedSkinContext
                ? `Use this saved skin context from the user's earlier chat or face scan:\n${savedSkinContext}`
                : concern
                    ? `The user's skin concern is: "${concern}".`
                    : "The user did not provide a specific concern.",
            "Judge whether this product looks helpful, risky, or unclear for the user's skin context.",
            "Specifically call out ingredients that may help the user's concern and ingredients that may worsen oiliness, redness, sensitivity, acne, dryness, or under-eye irritation if relevant.",
            "Respond in plain text with these short sections:",
            "Ingredients detected",
            "Fit for your skin concern",
            "Helpful ingredients for you",
            "Ingredients to be careful with",
            "How to use or avoid",
            "Avoid markdown tables and avoid asterisks."
        ].join("\n");

        return await generateContent(
            [prompt, imagePart],
            "I received the label image, but I could not read enough ingredients. Please try a clearer photo of the full label."
        );
    } catch (error) {
        console.error("Error in analyzeIngredients:", error);
        if (isRetryableGeminiError(error)) {
            return buildFallbackIngredientScanAdvice(concern, savedSkinContext);
        }
        throw error;
    }
}

async function chat(message) {
    const userMessage = cleanProblemContext(message);

    try {
        const prompt = [
            "Act as GlowAI, a dermatology education assistant.",
            `A user says: "${userMessage}".`,
            "Respond helpfully, professionally, and concisely.",
            "Do not diagnose with certainty. Recommend medical care for severe, painful, spreading, infected, or persistent symptoms.",
            "Use plain text formatting. Do not use asterisks."
        ].join("\n");

        return await generateContent(
            prompt,
            "I'm sorry, I couldn't generate a helpful response. Please try again."
        );
    } catch (error) {
        console.error("Error in chat:", error);
        if (isProductRecommendationRequest(userMessage)) {
            return buildFallbackProductRecommendations(userMessage);
        }
        throw error;
    }
}

module.exports = {
    analyzeSkin,
    analyzeIngredients,
    chat
};
