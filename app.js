const supportedLanguages = ["ru", "uk", "en", "de", "ar"];
const defaultLanguage = "en";

// English text is kept here only as an emergency fallback for browsers
// that block local JSON loading from file:// URLs.
const fallbackTranslations = {
    appTitle: "Luma Mini App",
    brand: "Luma",
    splashSubtitle: "Your personal wellness assistant",
    languageLabel: "Language",
    backLabel: "Back",
    homeTitle: "Good morning! ☀️",
    homeDescription: "I’m Luma, your personal wellness assistant. I’ll help you prepare your request for a specialist.",
    startButton: "Start",
    safeNote: "Your data is safe and confidential",
    formTitle: "Your request",
    formDescription: "Tell me a few things so I can prepare the best request for you.",
    nameLabel: "Name",
    namePlaceholder: "Your name",
    ageLabel: "Age",
    agePlaceholder: "Your age",
    botherLabel: "What bothers you?",
    botherPlaceholder: "Describe what’s concerning you",
    resultLabel: "What result do you want?",
    resultPlaceholder: "What would you like to achieve?",
    prepareButton: "Prepare request",
    analysisTitle: "Analyzing your request...",
    analysisDescription: "Luma is understanding your needs and preparing the best request for a specialist.",
    analysisNote: "This may take a few moments",
    successTitle: "Request prepared",
    successDescription: "Your request is ready to be sent to a specialist.",
    sendButton: "Send to specialist",
    againButton: "Start again",
    demoMessage: "This is a demo for now. Later the request will be sent to a specialist.",
    requiredRequestFieldsMessage: "Please fill in what bothers you and what result you want before sending."
};

let currentLanguage = defaultLanguage;
let currentTranslations = fallbackTranslations;
let progressAnimationId = null;
let requestData = {
    name: "",
    age: "",
    problem: "",
    goal: "",
    language: defaultLanguage
};

const screens = document.querySelectorAll(".screen");
const languageSelect = document.querySelector("#languageSelect");
const progressFill = document.querySelector("#progressFill");
const progressValue = document.querySelector("#progressValue");
const demoMessage = document.querySelector("#demoMessage");
const requiredRequestFieldsMessage = "Пожалуйста, заполните, что вас беспокоит и какого результата вы хотите.";

// Telegram injects this object only inside the real Mini App environment.
if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
}

document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
    currentLanguage = getSavedLanguage();
    await setLanguage(currentLanguage, false);
    connectButtons();
    connectCounters();

    setTimeout(() => {
        showScreen("home");
    }, 1350);
}

function getSavedLanguage() {
    const savedLanguage = localStorage.getItem("lumaLanguage");

    if (supportedLanguages.includes(savedLanguage)) {
        return savedLanguage;
    }

    return defaultLanguage;
}

async function setLanguage(language, shouldSave = true) {
    const nextLanguage = supportedLanguages.includes(language) ? language : defaultLanguage;

    currentLanguage = nextLanguage;
    currentTranslations = await loadTranslations(nextLanguage);

    if (shouldSave) {
        localStorage.setItem("lumaLanguage", nextLanguage);
    }

    document.documentElement.lang = nextLanguage;
    document.documentElement.dir = nextLanguage === "ar" ? "rtl" : "ltr";
    languageSelect.value = nextLanguage;

    applyTranslations();
}

async function loadTranslations(language) {
    try {
        const response = await fetch(`./locales/${language}.json`, { cache: "no-cache" });

        if (!response.ok) {
            throw new Error("Locale file was not loaded");
        }

        return await response.json();
    } catch (error) {
        if (language !== defaultLanguage) {
            return loadTranslations(defaultLanguage);
        }

        return fallbackTranslations;
    }
}

function applyTranslations() {
    document.title = translate("appTitle");

    document.querySelectorAll("[data-i18n]").forEach((element) => {
        element.textContent = translate(element.dataset.i18n);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
        element.placeholder = translate(element.dataset.i18nPlaceholder);
    });

    document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
        element.setAttribute("aria-label", translate(element.dataset.i18nAria));
    });
}

function translate(key) {
    return currentTranslations[key] || fallbackTranslations[key] || key;
}

function connectButtons() {
    document.querySelector("#startButton").addEventListener("click", () => {
        showScreen("form");
    });

    document.querySelector("#backButton").addEventListener("click", () => {
        showScreen("home");
    });

    document.querySelector("#prepareButton").addEventListener("click", () => {
        saveRequestData();
        showScreen("analysis");
        startAnalysis();
    });

    document.querySelector("#sendButton").addEventListener("click", () => {
        sendRequestToSpecialist();
    });

    document.querySelector("#againButton").addEventListener("click", () => {
        resetForm();
        demoMessage.hidden = true;
        showScreen("home");
    });

    languageSelect.addEventListener("change", (event) => {
        setLanguage(event.target.value);
    });
}

function saveRequestData() {
    requestData = getRequestDataFromForm();
}

function getRequestDataFromForm() {
    const { nameInput, ageInput, botherInput, resultInput } = getFormElements();

    return {
        name: getTrimmedInputValue(nameInput),
        age: getTrimmedInputValue(ageInput),
        problem: getTrimmedInputValue(botherInput),
        goal: getTrimmedInputValue(resultInput),
        language: currentLanguage
    };
}

function sendRequestToSpecialist() {
    const { nameInput, ageInput, botherInput, resultInput } = getFormElements();
    const name = getTrimmedInputValue(nameInput);
    const age = getTrimmedInputValue(ageInput);
    const problem = getTrimmedInputValue(botherInput);
    const goal = getTrimmedInputValue(resultInput);

    if (!problem || !goal) {
        demoMessage.hidden = false;
        demoMessage.textContent = requiredRequestFieldsMessage;
        return;
    }

    const payload = {
        type: "wellness_request",
        name: name,
        age: age,
        problem: problem,
        goal: goal,
        language: currentLanguage,
        createdAt: new Date().toISOString()
    };

    requestData = {
        name: name,
        age: age,
        problem: problem,
        goal: goal,
        language: currentLanguage
    };

    console.log("Luma payload:", payload);

    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.sendData(JSON.stringify(payload));
    } else {
        console.log("Luma demo payload:", payload);
        alert("Demo mode: Telegram WebApp API is not available. Payload was printed to console.");
    }

    demoMessage.hidden = false;
    demoMessage.textContent = "Заявка отправлена специалисту.";
}

function getFormElements() {
    return {
        nameInput: document.querySelector("#nameInput"),
        ageInput: document.querySelector("#ageInput"),
        botherInput: document.querySelector("#botherInput"),
        resultInput: document.querySelector("#resultInput")
    };
}

function getTrimmedInputValue(input) {
    return input ? input.value.trim() : "";
}

function connectCounters() {
    document.querySelectorAll("[data-counter-for]").forEach((counter) => {
        const input = document.querySelector(`#${counter.dataset.counterFor}`);

        input.addEventListener("input", () => {
            counter.textContent = `${input.value.length}/300`;
        });
    });
}

function showScreen(screenName) {
    if (progressAnimationId && screenName !== "analysis") {
        cancelAnimationFrame(progressAnimationId);
        progressAnimationId = null;
    }

    screens.forEach((screen) => {
        screen.classList.toggle("is-active", screen.dataset.screen === screenName);
    });
}

function startAnalysis() {
    const duration = 2700;
    const startTime = performance.now();

    progressFill.style.width = "0%";
    progressValue.textContent = "0%";

    function updateProgress(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const percent = Math.round(progress * 100);

        progressFill.style.width = `${percent}%`;
        progressValue.textContent = `${percent}%`;

        if (percent < 100) {
            progressAnimationId = requestAnimationFrame(updateProgress);
            return;
        }

        progressAnimationId = null;

        setTimeout(() => {
            showScreen("success");
        }, 450);
    }

    progressAnimationId = requestAnimationFrame(updateProgress);
}

function resetForm() {
    document.querySelector("#nameInput").value = "";
    document.querySelector("#ageInput").value = "";
    document.querySelector("#botherInput").value = "";
    document.querySelector("#resultInput").value = "";
    requestData = {
        name: "",
        age: "",
        problem: "",
        goal: "",
        language: currentLanguage
    };

    document.querySelectorAll("[data-counter-for]").forEach((counter) => {
        counter.textContent = "0/300";
    });
}
