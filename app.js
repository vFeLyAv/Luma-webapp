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
const specialistDefaultApiUrl = "http://127.0.0.1:8000";
const specialistStorageKeys = {
    apiUrl: "lumaSpecialistApiUrl",
    adminKey: "lumaSpecialistAdminKey",
    draftPrefix: "lumaSpecialistReplyDraft:"
};
const specialistStatusOptions = ["new", "in_progress", "done", "cancelled"];
const specialistStatusLabels = {
    new: "New",
    in_progress: "In progress",
    done: "Done",
    cancelled: "Cancelled"
};
const specialistState = {
    requests: [],
    currentRequest: null
};
const specialistElements = {
    apiUrlInput: document.querySelector("#specialistApiUrlInput"),
    adminKeyInput: document.querySelector("#specialistAdminKeyInput"),
    refreshButton: document.querySelector("#specialistRefreshButton"),
    refreshIconButton: document.querySelector("#specialistRefreshIconButton"),
    list: document.querySelector("#specialistRequestList"),
    listState: document.querySelector("#specialistListState"),
    dashboardToast: document.querySelector("#specialistToast"),
    detailBackButton: document.querySelector("#specialistDetailBackButton"),
    detailTitle: document.querySelector("#specialistDetailTitle"),
    detailSubtitle: document.querySelector("#specialistDetailSubtitle"),
    detailContent: document.querySelector("#specialistDetailContent"),
    detailToast: document.querySelector("#specialistDetailToast"),
    replyBackButton: document.querySelector("#specialistReplyBackButton"),
    replyTitle: document.querySelector("#specialistReplyTitle"),
    replySubtitle: document.querySelector("#specialistReplySubtitle"),
    replyContent: document.querySelector("#specialistReplyContent"),
    replyToast: document.querySelector("#specialistReplyToast")
};

// Telegram injects this object only inside the real Mini App environment.
if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
}

document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
    if (isSpecialistMode()) {
        initSpecialistDashboard();
        return;
    }

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

function isSpecialistMode() {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.replace("#", "").toLowerCase();

    return params.get("mode") === "specialist" || hash === "specialist";
}

function initSpecialistDashboard() {
    // This is a temporary local specialist dashboard. For production we need Telegram initData authorization and server-side user verification.
    document.title = "Luma Specialist Dashboard";
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";

    loadSpecialistSettings();
    connectSpecialistControls();
    showSpecialistDashboard();
}

function connectSpecialistControls() {
    specialistElements.refreshButton.addEventListener("click", loadSpecialistRequests);
    specialistElements.refreshIconButton.addEventListener("click", loadSpecialistRequests);
    specialistElements.apiUrlInput.addEventListener("change", () => {
        saveSpecialistSettings();
        loadSpecialistRequests();
    });
    specialistElements.adminKeyInput.addEventListener("change", () => {
        saveSpecialistSettings();
        loadSpecialistRequests();
    });
    specialistElements.detailBackButton.addEventListener("click", showSpecialistDashboard);
    specialistElements.replyBackButton.addEventListener("click", () => {
        if (specialistState.currentRequest) {
            renderRequestDetail(specialistState.currentRequest);
            return;
        }

        showSpecialistDashboard();
    });
}

function loadSpecialistSettings() {
    const savedApiUrl = localStorage.getItem(specialistStorageKeys.apiUrl);
    const savedAdminKey = localStorage.getItem(specialistStorageKeys.adminKey);

    specialistElements.apiUrlInput.value = savedApiUrl || specialistDefaultApiUrl;
    specialistElements.adminKeyInput.value = savedAdminKey || "";
}

function saveSpecialistSettings() {
    const apiUrl = specialistElements.apiUrlInput.value.trim() || specialistDefaultApiUrl;
    const adminKey = specialistElements.adminKeyInput.value.trim();

    specialistElements.apiUrlInput.value = apiUrl;
    localStorage.setItem(specialistStorageKeys.apiUrl, apiUrl);

    if (adminKey) {
        localStorage.setItem(specialistStorageKeys.adminKey, adminKey);
    } else {
        localStorage.removeItem(specialistStorageKeys.adminKey);
    }
}

function showSpecialistDashboard() {
    hideSpecialistToast(specialistElements.replyToast);
    hideSpecialistToast(specialistElements.detailToast);
    showScreen("specialist-dashboard");
    loadSpecialistRequests();
}

async function loadSpecialistRequests() {
    saveSpecialistSettings();
    hideSpecialistToast(specialistElements.dashboardToast);
    renderSpecialistListState("loading");

    try {
        const response = await fetch(`${getSpecialistApiUrl()}/requests?limit=20`, {
            headers: createSpecialistFetchHeaders()
        });

        console.log("Specialist API response status:", response.status);

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = response.status === 204 ? null : await parseSpecialistJsonResponse(response);

        console.log("Specialist API raw data:", data);

        specialistState.requests = extractRequestsFromPayload(data);
        renderSpecialistRequests(specialistState.requests);
    } catch (error) {
        specialistState.requests = [];
        console.error("Specialist requests load failed:", error);
        renderSpecialistListState("error", getErrorMessage(error));
    }
}

function renderSpecialistRequests(requests) {
    const safeRequests = Array.isArray(requests) ? requests : [];

    clearElement(specialistElements.list);
    specialistElements.listState.hidden = true;

    if (!safeRequests.length) {
        renderSpecialistListState("empty");
        return;
    }

    safeRequests.forEach((request) => {
        specialistElements.list.append(createSpecialistRequestCard(request));
    });
}

function createSpecialistRequestCard(request) {
    const card = createElement("article", "specialist-request-card");
    const requestId = getRequestApiId(request);
    const topRow = createElement("div", "specialist-request-top");
    const number = createElement("span", "specialist-request-number", formatRequestNumber(request));
    const statusChip = createStatusChip(getRequestStatus(request));
    const clientLine = createElement("div", "specialist-client-line");
    const avatar = createElement("span", "specialist-avatar", getInitials(getClientName(request)));
    const clientText = createElement("span", "specialist-client-text");
    const name = createElement("strong", "", getClientName(request));
    const meta = createElement("small", "", formatClientMeta(request));
    const telegram = createElement("small", "specialist-telegram-preview", getTelegramContactText(request));
    const preview = createElement("p", "specialist-preview", truncateText(getConcernText(request), 92));
    const actionRow = createElement("div", "specialist-card-action-row");
    const spacer = createElement("span", "");
    const openButton = createElement("button", "specialist-open-button", "Open request");

    openButton.type = "button";
    openButton.append(createSvgUse("icon-chevron-right"));
    openButton.disabled = !requestId;
    openButton.addEventListener("click", () => openSpecialistRequest(requestId));

    topRow.append(number, statusChip);
    clientText.append(name, meta, telegram);
    clientLine.append(avatar, clientText);
    actionRow.append(spacer, openButton);
    card.append(topRow, clientLine, preview, actionRow);

    return card;
}

async function openSpecialistRequest(requestId) {
    const cachedRequest = findSpecialistRequest(requestId);

    hideSpecialistToast(specialistElements.detailToast);
    showScreen("specialist-detail");

    if (cachedRequest) {
        renderRequestDetail(cachedRequest);
    } else {
        renderSpecialistDetailState("loading");
    }

    try {
        const payload = await fetchSpecialistJson(`/requests/${encodeURIComponent(requestId)}`);
        const request = extractSingleRequestFromPayload(payload) || cachedRequest;

        if (!request) {
            throw new Error("Request was not found");
        }

        specialistState.currentRequest = request;
        upsertSpecialistRequest(request);
        renderRequestDetail(request);
    } catch (error) {
        if (cachedRequest) {
            showSpecialistToast(specialistElements.detailToast, "Could not refresh request details.");
            return;
        }

        renderSpecialistDetailState("error");
    }
}

function renderRequestDetail(request) {
    const requestId = getRequestApiId(request);
    const status = getRequestStatus(request);

    specialistState.currentRequest = request;
    showScreen("specialist-detail");
    clearElement(specialistElements.detailContent);
    specialistElements.detailTitle.textContent = `Request ${formatRequestNumber(request)}`;
    specialistElements.detailSubtitle.textContent = formatClientMeta(request);

    specialistElements.detailContent.append(
        createDetailStatusRow(status),
        createClientInformationCard(request),
        createTextInfoCard("icon-heart", "What bothers the client", getConcernText(request)),
        createTextInfoCard("icon-star", "Desired result", getGoalText(request)),
        createTelegramProfileCard(request),
        createMetaInfoCard(request),
        createStatusControlCard(requestId, status),
        createDetailActionCard(request)
    );
}

function createClientInformationCard(request) {
    const card = createElement("section", "specialist-info-card");
    const heading = createSectionHeading("icon-user", "Client information");
    const grid = createElement("div", "specialist-data-grid");

    grid.append(
        createDataRow("Name", getClientName(request)),
        createDataRow("Age", formatAge(request)),
        createDataRow("Language", getLanguageText(request))
    );
    card.append(heading, grid);

    return card;
}

function createDetailStatusRow(status) {
    const row = createElement("div", "specialist-detail-status-row");

    row.append(createStatusChip(status));

    return row;
}

function createTextInfoCard(iconId, title, text) {
    const card = createElement("section", "specialist-info-card");
    const body = createElement("p", "specialist-body-text", text || "No details provided.");

    card.append(createSectionHeading(iconId, title), body);

    return card;
}

function createMetaInfoCard(request) {
    const card = createElement("section", "specialist-info-card");
    const heading = createSectionHeading("icon-link", "Request meta");
    const grid = createElement("div", "specialist-data-grid");

    grid.append(
        createDataRow("Date created", formatCreatedAt(request))
    );
    card.append(heading, grid);

    return card;
}

function createTelegramProfileCard(request) {
    const card = createElement("section", "specialist-info-card");
    const grid = createElement("div", "specialist-data-grid");
    const telegramLink = getTelegramProfileLink(request);

    grid.append(
        createDataRow("ID", getTelegramUserId(request)),
        createDataRow("Username", getTelegramUsername(request)),
        createDataRow("Telegram name", getTelegramName(request))
    );
    card.append(createSectionHeading("icon-link", "Telegram profile"), grid);

    if (telegramLink) {
        const link = createElement("a", "specialist-outline-action specialist-telegram-link", "Open Telegram");

        link.href = telegramLink;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.prepend(createSvgUse("icon-link"));
        card.append(link);
    }

    return card;
}

function createStatusControlCard(requestId, currentStatus) {
    const card = createElement("section", "specialist-info-card");
    const form = createElement("div", "specialist-status-form");
    const select = createElement("select", "specialist-status-select");
    const button = createElement("button", "specialist-primary-action", "Change status");

    specialistStatusOptions.forEach((status) => {
        const option = createElement("option", "", specialistStatusLabels[status]);

        option.value = status;
        select.append(option);
    });

    select.value = specialistStatusOptions.includes(currentStatus) ? currentStatus : "new";
    button.type = "button";
    button.disabled = !requestId;
    button.addEventListener("click", () => {
        updateRequestStatus(requestId, select.value);
    });

    form.append(createSectionHeading("icon-edit", "Status"), select, button);
    card.append(form);

    return card;
}

function createDetailActionCard(request) {
    const wrapper = createElement("div", "specialist-detail-actions");
    const replyButton = createElement("button", "specialist-outline-action", "Write reply");

    replyButton.type = "button";
    replyButton.prepend(createSvgUse("icon-edit"));
    replyButton.addEventListener("click", () => renderReplyScreen(request));
    wrapper.append(replyButton);

    return wrapper;
}

async function updateRequestStatus(requestId, status) {
    if (!requestId || !specialistStatusOptions.includes(status)) {
        showSpecialistToast(specialistElements.detailToast, "Choose a valid status.");
        return;
    }

    try {
        const payload = await fetchSpecialistJson(`/requests/${encodeURIComponent(requestId)}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status })
        });
        const updatedRequest = mergeSpecialistRequestUpdate(payload, { status });

        specialistState.currentRequest = updatedRequest;
        upsertSpecialistRequest(updatedRequest);
        renderRequestDetail(updatedRequest);
        showSpecialistToast(specialistElements.detailToast, "\u0421\u0442\u0430\u0442\u0443\u0441 \u043e\u0431\u043d\u043e\u0432\u043b\u0451\u043d");
    } catch (error) {
        showSpecialistToast(specialistElements.detailToast, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u0441\u0442\u0430\u0442\u0443\u0441. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 API \u0438 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451.");
    }
}

function renderReplyScreen(request) {
    const requestId = getRequestApiId(request);
    const savedDraft = getReplyDraft(requestId);
    const existingReply = getFirstString(request.reply, request.specialist_reply, request.specialistReply);
    const replyText = savedDraft || existingReply;
    const summary = createElement("section", "specialist-info-card specialist-summary-card");
    const summaryTop = createElement("div", "specialist-request-top");
    const card = createElement("section", "specialist-reply-card");
    const textarea = createElement("textarea", "");
    const counter = createElement("p", "specialist-reply-counter");
    const actions = createElement("div", "specialist-reply-actions");
    const sendButton = createElement("button", "specialist-primary-action", "Send reply");
    const draftButton = createElement("button", "specialist-outline-action", "Save draft");

    specialistState.currentRequest = request;
    showScreen("specialist-reply");
    hideSpecialistToast(specialistElements.replyToast);
    clearElement(specialistElements.replyContent);
    specialistElements.replyTitle.textContent = `Request ${formatRequestNumber(request)}`;
    specialistElements.replySubtitle.textContent = formatClientMeta(request);

    summaryTop.append(
        createElement("span", "specialist-request-number", formatRequestNumber(request)),
        createStatusChip(getRequestStatus(request))
    );
    summary.append(
        summaryTop,
        createElement("strong", "", getClientName(request)),
        createElement("p", "specialist-preview", truncateText(getConcernText(request), 130))
    );

    textarea.maxLength = 2000;
    textarea.rows = 9;
    textarea.placeholder = "Write your specialist reply...\nBe clear, kind and professional.";
    textarea.value = replyText;

    updateSpecialistReplyCounter(counter, textarea.value.length);
    textarea.addEventListener("input", () => updateSpecialistReplyCounter(counter, textarea.value.length));

    sendButton.type = "button";
    sendButton.disabled = !requestId;
    sendButton.prepend(createSvgUse("icon-send"));
    sendButton.addEventListener("click", () => sendSpecialistReply(requestId, textarea, counter));

    draftButton.type = "button";
    draftButton.prepend(createSvgUse("icon-edit"));
    draftButton.addEventListener("click", () => {
        saveReplyDraft(requestId, textarea.value);
        showSpecialistToast(specialistElements.replyToast, "Draft saved");
    });

    card.append(createSectionHeading("icon-edit", "Your reply"), textarea, counter);
    actions.append(sendButton, draftButton);
    specialistElements.replyContent.append(summary, card, actions);
}

async function sendSpecialistReply(requestId, textarea, counter) {
    const reply = String(textarea && textarea.value ? textarea.value : "").trim();

    if (!reply) {
        showSpecialistToast(specialistElements.replyToast, "Write a reply before sending.");
        return;
    }

    try {
        const payload = await fetchSpecialistJson(`/requests/${encodeURIComponent(requestId)}/reply`, {
            method: "POST",
            body: JSON.stringify({ reply })
        });
        const doneRequest = mergeSpecialistRequestUpdate(payload, { reply, status: "done" });

        localStorage.removeItem(getReplyDraftKey(requestId));
        textarea.value = "";
        updateSpecialistReplyCounter(counter, 0);
        specialistState.currentRequest = doneRequest;
        upsertSpecialistRequest(doneRequest);
        renderRequestDetail(doneRequest);
        showSpecialistToast(specialistElements.detailToast, "\u041e\u0442\u0432\u0435\u0442 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d \u043a\u043b\u0438\u0435\u043d\u0442\u0443");
    } catch (error) {
        showSpecialistToast(specialistElements.replyToast, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043e\u0442\u0432\u0435\u0442. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 API \u0438 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451.");
    }
}

function saveReplyDraft(requestId, text) {
    if (!requestId) {
        return;
    }

    localStorage.setItem(getReplyDraftKey(requestId), text);
}

function getReplyDraft(requestId) {
    if (!requestId) {
        return "";
    }

    return localStorage.getItem(getReplyDraftKey(requestId)) || "";
}

function getReplyDraftKey(requestId) {
    return `${specialistStorageKeys.draftPrefix}${requestId}`;
}

async function fetchSpecialistJson(path, options = {}) {
    const response = await fetch(`${getSpecialistApiUrl()}${path}`, {
        ...options,
        headers: createSpecialistFetchHeaders(options)
    });

    if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    return parseSpecialistJsonResponse(response);
}

function createSpecialistFetchHeaders(options = {}) {
    const headers = {
        Accept: "application/json",
        ...(options.headers || {})
    };
    const adminKey = specialistElements.adminKeyInput.value.trim();

    if (options.body) {
        headers["Content-Type"] = "application/json";
    }

    if (adminKey) {
        headers["X-Luma-Admin-Key"] = adminKey;
    }

    return headers;
}

async function parseSpecialistJsonResponse(response) {
    const text = await response.text();

    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        throw new Error(`Invalid JSON from API: ${getErrorMessage(error)}`);
    }
}

function getSpecialistApiUrl() {
    return (specialistElements.apiUrlInput.value.trim() || specialistDefaultApiUrl).replace(/\/+$/, "");
}

function renderSpecialistListState(type, errorMessage = "") {
    clearElement(specialistElements.list);
    clearElement(specialistElements.listState);
    specialistElements.listState.hidden = false;

    if (type === "loading") {
        specialistElements.listState.append(createSpecialistStateCard({
            title: "Loading requests...",
            subtitle: "Connecting to your local Luma API.",
            isLoading: true
        }));
        return;
    }

    if (type === "error") {
        specialistElements.listState.append(createSpecialistStateCard({
            title: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u044c\u0441\u044f \u043a API",
            subtitle: "\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435, \u0447\u0442\u043e backend \u0437\u0430\u043f\u0443\u0449\u0435\u043d: python -m uvicorn api:app --reload",
            actionText: "Try again",
            onAction: loadSpecialistRequests
        }));
        return;
    }

    specialistElements.listState.append(createSpecialistStateCard({
        title: "No requests yet",
        subtitle: "New client requests will appear here as soon as they are submitted."
    }));
}

function renderSpecialistDetailState(type) {
    clearElement(specialistElements.detailContent);
    specialistElements.detailTitle.textContent = type === "loading" ? "Loading request" : "Request";
    specialistElements.detailSubtitle.textContent = "";

    if (type === "loading") {
        specialistElements.detailContent.append(createSpecialistStateCard({
            title: "Loading request...",
            subtitle: "Getting the latest details from the local API.",
            isLoading: true
        }));
        return;
    }

    specialistElements.detailContent.append(createSpecialistStateCard({
        title: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u044c\u0441\u044f \u043a API",
        subtitle: "\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435, \u0447\u0442\u043e backend \u0437\u0430\u043f\u0443\u0449\u0435\u043d: python -m uvicorn api:app --reload",
        actionText: "Back to requests",
        onAction: showSpecialistDashboard
    }));
}

function createSpecialistStateCard({ title, subtitle, actionText, onAction, isLoading = false }) {
    const card = createElement("section", "specialist-state-card");
    const art = createElement("div", "specialist-empty-art");
    const sun = createElement("span", "specialist-empty-sun");
    const cloud = createElement("span", "specialist-empty-cloud");
    const titleElement = createElement("h2", "", title);
    const subtitleElement = createElement("p", "", subtitle);
    const dots = createElement("div", "specialist-state-dots");

    art.setAttribute("aria-hidden", "true");
    dots.setAttribute("aria-hidden", "true");
    dots.append(createElement("span", ""), createElement("span", ""), createElement("span", ""));
    art.append(sun, cloud);
    card.append(art, titleElement, subtitleElement);

    if (isLoading) {
        card.append(dots);
    }

    if (actionText && onAction) {
        const button = createElement("button", "specialist-secondary-action", actionText);

        button.type = "button";
        button.addEventListener("click", onAction);
        card.append(button);
    }

    return card;
}

function showSpecialistToast(element, message) {
    element.textContent = message;
    element.hidden = false;
}

function hideSpecialistToast(element) {
    element.hidden = true;
    element.textContent = "";
}

function extractRequestsFromPayload(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (payload && typeof payload === "object" && Array.isArray(payload.requests)) {
        return payload.requests;
    }

    throw new Error("Unexpected /requests payload. Expected an array or { requests: [...] }.");
}

function extractSingleRequestFromPayload(payload) {
    if (!payload || typeof payload !== "object") {
        return null;
    }

    if (payload.request && typeof payload.request === "object") {
        return payload.request;
    }

    if (payload.item && typeof payload.item === "object") {
        return payload.item;
    }

    if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
        return payload.data;
    }

    return payload;
}

function findSpecialistRequest(requestId) {
    return specialistState.requests.find((request) => String(getRequestApiId(request)) === String(requestId)) || null;
}

function upsertSpecialistRequest(request) {
    const requestId = getRequestApiId(request);

    if (!requestId) {
        return;
    }

    const index = specialistState.requests.findIndex((item) => String(getRequestApiId(item)) === String(requestId));

    if (index >= 0) {
        specialistState.requests[index] = request;
    } else {
        specialistState.requests.unshift(request);
    }
}

function mergeSpecialistRequestUpdate(payload, fallbackFields = {}) {
    const responseRequest = extractSingleRequestFromPayload(payload);

    return {
        ...(specialistState.currentRequest || {}),
        ...(responseRequest || {}),
        ...fallbackFields
    };
}

function getRequestApiId(request) {
    return getFirstValue(
        request && request.id,
        request && request.request_id,
        request && request.requestId,
        request && request.uuid
    );
}

function formatRequestNumber(request) {
    const explicitNumber = getFirstValue(
        request && request.request_number,
        request && request.requestNumber,
        request && request.public_id,
        request && request.publicId,
        request && request.number
    );

    if (explicitNumber) {
        const text = String(explicitNumber);

        if (text.startsWith("#")) {
            return text;
        }

        if (text.toUpperCase().includes("LUMA")) {
            return `#${text}`;
        }

        if (/^\d+$/.test(text)) {
            return `#LUMA-${text.padStart(4, "0")}`;
        }

        return `#${text}`;
    }

    const requestId = getRequestApiId(request);

    if (/^\d+$/.test(String(requestId))) {
        return `#LUMA-${String(requestId).padStart(4, "0")}`;
    }

    return requestId ? `#${requestId}` : "#LUMA-0000";
}

function getRequestStatus(request) {
    const rawStatus = getFirstString(request && request.status, request && request.state).toLowerCase();

    return specialistStatusOptions.includes(rawStatus) ? rawStatus : "new";
}

function createStatusChip(status) {
    const normalizedStatus = specialistStatusOptions.includes(status) ? status : "new";
    const chip = createElement("span", `specialist-status-chip specialist-status-chip--${normalizedStatus.replace("_", "-")}`, specialistStatusLabels[normalizedStatus]);

    return chip;
}

function getClientName(request) {
    return getFirstString(
        request && request.client_name,
        request && request.clientName,
        request && request.name,
        request && request.user_name,
        request && request.userName
    ) || "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e";
}

function formatClientMeta(request) {
    const parts = [formatAge(request), getLanguageText(request)].filter(Boolean);

    return parts.join(" / ");
}

function formatAge(request) {
    const age = getFirstValue(request && request.age, request && request.client_age, request && request.clientAge);

    if (!age) {
        return "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e";
    }

    return String(age).includes("yr") ? String(age) : `${age} yrs`;
}

function getLanguageText(request) {
    return getFirstString(
        request && request.language,
        request && request.lang,
        request && request.client_language,
        request && request.clientLanguage
    ) || "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e";
}

function getConcernText(request) {
    return getFirstString(
        request && request.problem,
        request && request.concern,
        request && request.client_concern,
        request && request.clientConcern,
        request && request.what_bothers,
        request && request.whatBothers,
        request && request.message
    ) || "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e";
}

function getGoalText(request) {
    return getFirstString(
        request && request.goal,
        request && request.desired_result,
        request && request.desiredResult,
        request && request.result,
        request && request.target_result,
        request && request.targetResult
    ) || "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e";
}

function formatCreatedAt(request) {
    const rawDate = getFirstString(
        request && request.created_at,
        request && request.createdAt,
        request && request.date_created,
        request && request.dateCreated,
        request && request.created
    );

    return formatDisplayDate(rawDate);
}

function formatDisplayDate(value) {
    const rawValue = getFirstString(value).trim();
    const lumaDatePattern = /^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/;

    if (!rawValue) {
        return "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e";
    }

    if (lumaDatePattern.test(rawValue)) {
        return rawValue;
    }

    const date = new Date(rawValue);

    if (Number.isNaN(date.getTime())) {
        return "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e";
    }

    return [
        padDatePart(date.getDate()),
        padDatePart(date.getMonth() + 1),
        date.getFullYear()
    ].join(".") + `, ${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function padDatePart(value) {
    return String(value).padStart(2, "0");
}

function getTelegramUserId(request) {
    return getFirstString(
        getTelegramProfile(request).id,
        getTelegramProfile(request).user_id,
        getTelegramProfile(request).userId,
        request && request.telegram_user_id,
        request && request.telegramUserId,
        request && request.telegram_id,
        request && request.telegramId,
        request && request.user_id,
        request && request.userId
    ) || "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e";
}

function getTelegramUsername(request) {
    const username = getFirstString(
        getTelegramProfile(request).username,
        request && request.telegram_username,
        request && request.telegramUsername
    );

    if (!username) {
        return "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e";
    }

    return username.startsWith("@") ? username : `@${username}`;
}

function getTelegramName(request) {
    const profile = getTelegramProfile(request);
    const firstName = getFirstString(profile.first_name, profile.firstName, request && request.telegram_first_name, request && request.telegramFirstName);
    const lastName = getFirstString(profile.last_name, profile.lastName, request && request.telegram_last_name, request && request.telegramLastName);
    const fullName = getFirstString(
        profile.full_name,
        profile.fullName,
        profile.name,
        request && request.telegram_name,
        request && request.telegramName,
        request && request.telegram_full_name,
        request && request.telegramFullName,
        [firstName, lastName].filter(Boolean).join(" ")
    );

    return fullName || "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e";
}

function getTelegramContactText(request) {
    const username = getTelegramUsername(request);
    const userId = getTelegramUserId(request);

    if (username !== "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e") {
        return username;
    }

    if (userId !== "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e") {
        return `Telegram ID: ${userId}`;
    }

    return "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e";
}

function getTelegramProfileLink(request) {
    const userId = getTelegramUserId(request);
    const profileUrl = getFirstString(
        getTelegramProfile(request).profile_url,
        getTelegramProfile(request).profileUrl,
        getTelegramProfile(request).url,
        request && request.telegram_profile_url,
        request && request.telegramProfileUrl,
        request && request.telegram_url,
        request && request.telegramUrl
    );

    if (userId === "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e") {
        return "";
    }

    return profileUrl || `tg://user?id=${encodeURIComponent(userId)}`;
}

function getTelegramProfile(request) {
    return getFirstObject(
        request && request.telegram_profile,
        request && request.telegramProfile,
        request && request.telegram
    );
}

function getFirstValue(...values) {
    return values.find((value) => value !== undefined && value !== null && value !== "");
}

function getFirstObject(...values) {
    return values.find((value) => value && typeof value === "object" && !Array.isArray(value)) || {};
}

function getFirstString(...values) {
    const value = getFirstValue(...values);

    return value === undefined || value === null ? "" : String(value);
}

function truncateText(text, maxLength) {
    const safeText = getFirstString(text) || "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e";

    if (safeText.length <= maxLength) {
        return safeText;
    }

    return `${safeText.slice(0, maxLength - 3).trim()}...`;
}

function getInitials(name) {
    const words = getFirstString(name).trim().split(/\s+/).filter(Boolean);

    if (!words.length) {
        return "?";
    }

    return words.slice(0, 2).map((word) => word[0].toUpperCase()).join("");
}

function createSectionHeading(iconId, text) {
    const heading = createElement("div", "specialist-section-heading");

    heading.append(createSvgUse(iconId), createElement("span", "", text));

    return heading;
}

function createDataRow(label, value) {
    const row = createElement("div", "specialist-data-row");

    row.append(createElement("span", "", label), createElement("strong", "", value || "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e"));

    return row;
}

function getErrorMessage(error) {
    if (error && typeof error.message === "string" && error.message) {
        return error.message;
    }

    return String(error || "unknown error");
}

function updateSpecialistReplyCounter(counter, length) {
    counter.textContent = `${length}/2000`;
}

function createElement(tagName, className = "", text = "") {
    const element = document.createElement(tagName);

    if (className) {
        element.className = className;
    }

    if (text) {
        element.textContent = text;
    }

    return element;
}

function createSvgUse(iconId) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");

    svg.classList.add("ui-icon");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    use.setAttribute("href", `#${iconId}`);
    svg.append(use);

    return svg;
}

function clearElement(element) {
    element.textContent = "";
}
