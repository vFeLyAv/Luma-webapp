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
    requiredRequestFieldsMessage: "Please fill in what bothers you and what result you want."
};

let currentLanguage = defaultLanguage;
let currentTranslations = fallbackTranslations;
let progressAnimationId = null;
let requestData = null;

const screens = document.querySelectorAll(".screen");
const languageSelect = document.querySelector("#languageSelect");
const progressFill = document.querySelector("#progressFill");
const progressValue = document.querySelector("#progressValue");
const demoMessage = document.querySelector("#demoMessage");
const requestNotFoundMessage = "\u0417\u0430\u044f\u0432\u043a\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430. \u041f\u043e\u0436\u0430\u043b\u0443\u0439\u0441\u0442\u0430, \u043d\u0430\u0447\u043d\u0438\u0442\u0435 \u0437\u0430\u043d\u043e\u0432\u043e.";
const formMessage = createFormMessage();

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
        if (!saveRequestData()) {
            return;
        }

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
    const nextRequestData = getRequestDataFromForm();

    if (!nextRequestData.problem || !nextRequestData.goal) {
        showFormMessage(translate("requiredRequestFieldsMessage"));
        return false;
    }

    requestData = nextRequestData;
    hideFormMessage();
    demoMessage.hidden = true;

    return true;
}

function getRequestDataFromForm() {
    const { nameInput, ageInput, problemInput, goalInput } = getFormElements();

    return {
        type: "wellness_request",
        name: getTrimmedInputValue(nameInput),
        age: getTrimmedInputValue(ageInput),
        problem: getTrimmedInputValue(problemInput),
        goal: getTrimmedInputValue(goalInput),
        language: currentLanguage,
        createdAt: new Date().toISOString()
    };
}

function sendRequestToSpecialist() {
    if (!requestData) {
        demoMessage.hidden = false;
        demoMessage.textContent = requestNotFoundMessage;
        return;
    }

    console.log("Luma saved requestData:", requestData);

    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.sendData(JSON.stringify(requestData));
    } else {
        alert(JSON.stringify(requestData, null, 2));
    }

    demoMessage.hidden = false;
    demoMessage.textContent = "Заявка отправлена специалисту.";
}

function getFormElements() {
    return {
        nameInput: document.querySelector("#nameInput"),
        ageInput: document.querySelector("#ageInput"),
        problemInput: document.querySelector("#problemInput"),
        goalInput: document.querySelector("#goalInput")
    };
}

function getTrimmedInputValue(input) {
    return input ? input.value.trim() : "";
}

function createFormMessage() {
    const prepareButton = document.querySelector("#prepareButton");
    const message = document.createElement("p");

    message.className = "demo-message";
    message.hidden = true;

    prepareButton.insertAdjacentElement("afterend", message);

    return message;
}

function showFormMessage(message) {
    formMessage.textContent = message;
    formMessage.hidden = false;
}

function hideFormMessage() {
    formMessage.hidden = true;
    formMessage.textContent = "";
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
    document.querySelector("#problemInput").value = "";
    document.querySelector("#goalInput").value = "";
    requestData = null;
    hideFormMessage();

    document.querySelectorAll("[data-counter-for]").forEach((counter) => {
        counter.textContent = "0/300";
    });
}
