const chatBox = document.getElementById("chatBox");
let currentState = "initial"; 
let lastProblem = "";
let lastSkinAnalysis = "";

window.onload = () => {
    initTheme();
    showGreeting();
};

function initTheme() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-theme");
        updateThemeIcon(true);
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle("dark-theme");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
    const icon = document.getElementById("themeIcon");
    if (isDark) {
        icon.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
    } else {
        icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
    }
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addMessage(text, type) {
    const div = document.createElement("div");
    div.classList.add("message", type);
    const fallback = type === "bot"
        ? "Sorry, I could not get a valid response. Please try again."
        : "";
    div.innerText = normalizeText(text) || fallback;
    chatBox.appendChild(div);
    scrollToBottom();
}

function normalizeText(value) {
    if (typeof value !== "string") {
        return "";
    }

    const text = value.trim();
    const normalized = text.toLowerCase();
    if (!text || normalized === "undefined" || normalized === "null") {
        return "";
    }

    return text;
}

function getAIText(data) {
    if (!data || typeof data !== "object") {
        return "";
    }

    return normalizeText(data.result)
        || normalizeText(data.reply)
        || normalizeText(data.message)
        || normalizeText(data.error);
}

async function readApiResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        return await response.json();
    }

    const text = await response.text();
    return { error: text };
}

function addOptions(options) {
    const div = document.createElement("div");
    div.classList.add("chat-options");
    options.forEach(opt => {
        const btn = document.createElement("button");
        btn.classList.add("option-btn");
        btn.innerText = opt.label;
        btn.onclick = () => handleOptionSelection(opt, div);
        div.appendChild(btn);
    });
    chatBox.appendChild(div);
    scrollToBottom();
}

function getMainMenuOptions() {
    return [
        { label: "Analyze Skin", action: "analyze_skin" },
        { label: "General Recommendation", action: "general_recommendation" },
        { label: "Scan Ingredients", action: "scan_ingredients" }
    ];
}

function addMainMenuOptions() {
    addOptions(getMainMenuOptions());
}

function addBackToMenuOption() {
    addOptions([
        { label: "Back to Menu", action: "main_menu" }
    ]);
}

function buildProductRecommendationPrompt() {
    const concern = normalizeText(lastProblem);
    const analysis = normalizeText(lastSkinAnalysis);

    if (!concern && !analysis) {
        return [
            "The user wants skin product suggestions but has not provided a skin concern or image analysis yet.",
            "Ask one concise follow-up question about their skin concern, affected area, and skin type before recommending products.",
            "Use plain text and avoid asterisks."
        ].join("\n");
    }

    return [
        "Based on the user's skin concern and uploaded skin-image analysis, recommend suitable over-the-counter skincare products.",
        concern ? `User concern and problem area: ${concern}` : "User concern and problem area: not provided.",
        analysis ? `Skin-image analysis summary: ${analysis}` : "Skin-image analysis summary: not available.",
        "Give practical product suggestions by category, not only generic advice.",
        "For each suggestion include: product type, useful active ingredients, how often to use, and one caution.",
        "Keep it safe: do not diagnose, avoid prescription-only treatment suggestions, recommend patch testing, sunscreen, and dermatologist care for severe, painful, spreading, infected, or persistent symptoms.",
        "Use plain text headings and avoid asterisks."
    ].join("\n");
}

function buildSkinContextForScanning() {
    const concern = normalizeText(lastProblem);
    const analysis = normalizeText(lastSkinAnalysis);
    const context = [];

    if (concern) {
        context.push(`User concern and problem area: ${concern}`);
    }

    if (analysis) {
        context.push(`Recent face or skin image analysis: ${analysis}`);
    }

    return context.join("\n\n");
}

function showGreeting() {
    addMessage("Hello! Welcome to GlowLens ✨ How can I help you today?", "bot");
    addMainMenuOptions();
}

function handleOptionSelection(opt, optionsContainer) {
    optionsContainer.style.display = "none"; // Hide options after selection
    addMessage(opt.label, "user");
    
    if (opt.action === "main_menu") {
        currentState = "initial";
        addMessage("What would you like to do next?", "bot");
        addMainMenuOptions();
    } else if (opt.action === "analyze_skin") {
        lastSkinAnalysis = "";
        addMessage("Please upload a clear photo of your skin by clicking the image icon below.", "bot");
        currentState = "chat";
    } else if (opt.action === "general_recommendation") {
        lastSkinAnalysis = "";
        addMessage("Please describe your skin concern or problem.", "bot");
        currentState = "await_problem";
    } else if (opt.action === "scan_ingredients") {
        const hasSkinContext = Boolean(buildSkinContextForScanning());
        addMessage(
            hasSkinContext
                ? "Please upload or take a photo of the product ingredients list. I will compare it with your saved skin concern or recent face analysis."
                : "Please upload or take a photo of the product ingredients list.",
            "bot"
        );
        currentState = "await_ingredients";
    } else if (opt.action.startsWith("area_")) {
        lastProblem += ` (Area: ${opt.label})`;
        addMessage("Thanks for sharing. What kind of help do you need?", "bot");
        addOptions([
            { label: "Product Recommendations", action: "product_rec" },
            { label: "Scan Your Problem Area", action: "scan_face" },
            { label: "Scan Ingredients", action: "scan_ingredients" },
            { label: "General Suggestions", action: "general_sug" }
        ]);
        currentState = "await_recommendation_type";
    } else if (opt.action === "product_rec") {
        addMessage("I can suggest products. Please wait...", "bot");
        callAI(buildProductRecommendationPrompt());
        currentState = "chat";
    } else if (opt.action === "scan_face") {
        addMessage("Please upload a clear photo of your problem area by clicking the image icon below.", "bot");
        currentState = "chat";
    } else if (opt.action === "general_sug") {
        addMessage("Generating suggestions...", "bot");
        callAI("I need general suggestions for my skin problem: " + lastProblem, true);
        currentState = "chat";
    }
}

function isSkinRelated(message) {
    const msg = message.toLowerCase();
    const keywords = [
        "skin", "face", "acne", "pimple", "dry", "oily", "red", "scar", 
        "spot", "pigment", "glow", "wrinkle", "aging", "dark", "pore",
        "itch", "flake", "peel", "bump", "texture", "routine", "wash", "cream", 
        "serum", "sunscreen", "sensitive", "breakout", "blackhead", "whitehead", "rash",
        "cheek", "nose", "forehead", "chin", "neck", "eye", "lip", "body", "patch", "mark",
        "blemish", "allergy", "irritat", "sunburn", "dull", "tone", "acnes", "pimples"
    ];
    
    for (let word of keywords) {
        if (msg.includes(word)) return true;
    }
    return false;
}

async function sendMessage() {
    const input = document.getElementById("messageInput");
    const message = input.value.trim();
    if (!message) return;

    addMessage(message, "user");
    input.value = "";

    if (currentState === "await_problem") {
        if (!isSkinRelated(message)) {
            addMessage("Please enter a valid skin or face related concern.", "bot");
            return;
        }

        lastProblem = message;
        lastSkinAnalysis = "";
        addMessage("Which area is affected?", "bot");
        addOptions([
            { label: "Face", action: "area_face" },
            { label: "Hands / Arms", action: "area_hands" },
            { label: "Legs", action: "area_legs" },
            { label: "Other Body Parts", action: "area_other" }
        ]);
        currentState = "await_body_part";
        return;
    }

    callAI(message);
    if (!lastProblem && isSkinRelated(message)) {
        lastProblem = message;
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

async function callAI(message, showProductOption = false) {
    try {
        const res = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message })
        });
        const data = await readApiResponse(res);
        
        if (!res.ok) {
            if (res.status === 429) {
                addMessage("I'm receiving too many requests. Please wait a moment before trying again.", "bot");
            } else {
                addMessage(getAIText(data) || "Sorry, I am having trouble generating a response.", "bot");
            }
            addBackToMenuOption();
            return;
        }

        addMessage(getAIText(data) || "Sorry, I could not generate a response. Please try again.", "bot");
        addBackToMenuOption();
        
        if (showProductOption) {
            addOptions([
                { label: "Get Product Recommendations", action: "product_rec" }
            ]);
        }
    } catch (e) {
        addMessage("Sorry, I am having trouble connecting to the server.", "bot");
        addBackToMenuOption();
    }
}



// 🖼️ Image Upload & Camera Integration
let cameraStream = null;

async function openCameraModal() {
    const modal = document.getElementById("cameraModal");
    const video = document.getElementById("cameraStream");
    modal.style.display = "flex";

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        video.srcObject = cameraStream;
    } catch (err) {
        alert("Unable to access camera: " + err.message);
        closeCameraModal();
    }
}

function closeCameraModal() {
    const modal = document.getElementById("cameraModal");
    modal.style.display = "none";
    
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

function takePhoto() {
    const video = document.getElementById("cameraStream");
    const canvas = document.getElementById("cameraCanvas");
    
    if (!cameraStream) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    closeCameraModal();
    
    canvas.toBlob((blob) => {
        const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
        if (currentState === "await_ingredients") {
            uploadIngredients(file);
        } else {
            uploadImage(file);
        }
    }, 'image/jpeg');
}

async function handleImageSelection() {
    const input = document.getElementById("imageInput");
    const file = input.files[0];
    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {
        addMessage("Please upload a valid image file.", "bot");
        input.value = "";
        return;
    }

    if (currentState === "await_ingredients") {
        await uploadIngredients(file);
    } else {
        await uploadImage(file);
    }

    input.value = "";
}

async function uploadImage(file) {
    addMessage(`Uploaded image: ${file.name}`, "user");
    addMessage("Analyzing image...", "bot");

    const formData = new FormData();
    formData.append("image", file);
    if (lastProblem) {
        formData.append("problem", lastProblem);
    }

    try {
        const res = await fetch("/analyze", {
            method: "POST",
            body: formData
        });
        const data = await readApiResponse(res);
        
        if (!res.ok) {
            if (res.status === 429) {
                addMessage("I'm receiving too many requests. Please wait about 30 seconds before trying again.", "bot");
            } else {
                addMessage(getAIText(data) || "Sorry, I encountered an error during analysis.", "bot");
            }
            addBackToMenuOption();
            currentState = "chat";
            return;
        }

        const analysisText = getAIText(data) || "I received the image, but I could not create a clear analysis. Please try a brighter, sharper photo.";
        lastSkinAnalysis = analysisText;
        addMessage(analysisText, "bot");
        addOptions([
            { label: "Product Suggestions", action: "product_rec" }
        ]);
        addBackToMenuOption();
        currentState = "chat";
    } catch (e) {
        addMessage("Sorry, there was an error analyzing the image. Make sure the backend server is running.", "bot");
        addBackToMenuOption();
        currentState = "chat";
    }
}

async function uploadIngredients(file) {
    addMessage(`Uploaded ingredients: ${file.name}`, "user");
    addMessage("Scanning ingredients...", "bot");

    const formData = new FormData();
    formData.append("image", file);
    if (lastProblem) {
        formData.append("problem", lastProblem);
    }
    const skinContext = buildSkinContextForScanning();
    if (skinContext) {
        formData.append("skinContext", skinContext);
    }

    try {
        const res = await fetch("/analyze-ingredients", {
            method: "POST",
            body: formData
        });
        
        const data = await readApiResponse(res);
        if (!res.ok) {
            addMessage(getAIText(data) || "There was an error scanning ingredients.", "bot");
            addBackToMenuOption();
            currentState = "chat";
            return;
        }

        addMessage(getAIText(data) || "I received the image, but I could not read the ingredients clearly. Please try a sharper photo.", "bot");
        addBackToMenuOption();
        currentState = "chat";
    } catch (e) {
        addMessage("Sorry, there was an error connecting to the backend server.", "bot");
        addBackToMenuOption();
        currentState = "chat";
    }
}
