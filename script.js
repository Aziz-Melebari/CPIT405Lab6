// ---------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------
// Cookies are not saved by browsers when a page is opened straight from disk
// (file://). If that happens, fall back to an in-memory store so the page still
// works for a demo; run it from a local server (e.g. VS Code Live Server or
// `python3 -m http.server`) to get real, persistent cookies.
const COOKIE_DAYS = 365;
const memoryStore = {};
let cookiesWork = false;

function setCookie(name, value, days = COOKIE_DAYS) {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie =
        `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
    memoryStore[name] = value;
}

function getCookie(name) {
    if (cookiesWork) {
        const pair = document.cookie
            .split("; ")
            .find(item => item.startsWith(name + "="));
        return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
    }
    return name in memoryStore ? memoryStore[name] : null;
}

function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
    delete memoryStore[name];
}

// Detect whether the browser really keeps cookies for this page.
(function detectCookieSupport() {
    document.cookie = "cookie_test=1; path=/; SameSite=Lax";
    cookiesWork = document.cookie.includes("cookie_test=1");
    document.cookie = "cookie_test=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
})();

// ---------------------------------------------------------------
// State
// ---------------------------------------------------------------
// There is no server, so the totals start from a baseline and the user's own
// vote (kept in a cookie) is added on top of it.
const BASE_LIKES = 100;
const BASE_DISLIKES = 20;

let likes = BASE_LIKES;
let dislikes = BASE_DISLIKES;
let userVote = null;   // "like", "dislike" or null (kept in the "vote" cookie)
let comments = [];     // array of comment objects (kept in the "comments" cookie)

// ---------------------------------------------------------------
// Element references
// ---------------------------------------------------------------
const likeBtn = document.getElementById("like-btn");
const dislikeBtn = document.getElementById("dislike-btn");
const likeCount = document.getElementById("like-count");
const dislikeCount = document.getElementById("dislike-count");
const voteStatus = document.getElementById("vote-status");
const commentInput = document.getElementById("comment-input");
const submitBtn = document.getElementById("submit-btn");
const resetBtn = document.getElementById("reset-btn");
const messageBox = document.getElementById("message");
const commentsList = document.getElementById("comments-list");

// ---------------------------------------------------------------
// UI
// ---------------------------------------------------------------
let messageTimer = null;

function showMessage(text, isError = false) {
    messageBox.textContent = text;
    messageBox.classList.toggle("error", isError);
    messageBox.classList.add("show");
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => messageBox.classList.remove("show"), 3500);
}

function renderComments() {
    commentsList.replaceChildren();
    comments.forEach(item => {
        const li = document.createElement("li");
        const meta = document.createElement("span");
        meta.className = "meta";
        meta.textContent = `Your comment${item.vote ? " (" + item.vote + "d)" : ""}`;
        const text = document.createElement("span");
        text.textContent = item.text;   // textContent keeps user input safe from HTML injection
        li.append(meta, text);
        commentsList.appendChild(li);
    });
}

function updateUI() {
    likeCount.textContent = likes;
    dislikeCount.textContent = dislikes;

    const voted = userVote !== null;
    likeBtn.disabled = voted;
    dislikeBtn.disabled = voted;
    likeBtn.classList.toggle("chosen", userVote === "like");
    dislikeBtn.classList.toggle("chosen", userVote === "dislike");
    voteStatus.textContent = voted
        ? `You ${userVote}d this. Press Clear to vote again.`
        : "";

    const commented = comments.length > 0;
    commentInput.disabled = commented;
    submitBtn.disabled = commented;
    commentInput.placeholder = commented
        ? "You already commented. Press Clear to comment again."
        : "Write a comment...";

    renderComments();
}

function animate(button) {
    button.classList.remove("pop");
    void button.offsetWidth;        // restart the animation
    button.classList.add("pop");
}

// ---------------------------------------------------------------
// Load saved state from cookies
// ---------------------------------------------------------------
function loadState() {
    const savedVote = getCookie("vote");
    if (savedVote === "like") {
        userVote = "like";
        likes = BASE_LIKES + 1;
    } else if (savedVote === "dislike") {
        userVote = "dislike";
        dislikes = BASE_DISLIKES + 1;
    }

    try {
        const savedComments = JSON.parse(getCookie("comments") || "[]");
        comments = Array.isArray(savedComments) ? savedComments : [];
    } catch (error) {
        comments = [];   // corrupted cookie -> start clean
    }
}

// ---------------------------------------------------------------
// Voting
// ---------------------------------------------------------------
function vote(choice) {
    if (userVote !== null || getCookie("vote")) {
        showMessage("You have already voted.", true);
        return;
    }
    userVote = choice;
    if (choice === "like") likes++;
    else dislikes++;

    setCookie("vote", choice);
    updateUI();
    animate(choice === "like" ? likeBtn : dislikeBtn);
}

likeBtn.addEventListener("click", () => vote("like"));
dislikeBtn.addEventListener("click", () => vote("dislike"));

// ---------------------------------------------------------------
// Comments
// ---------------------------------------------------------------
submitBtn.addEventListener("click", () => {
    if (comments.length > 0 || getCookie("comments")) {
        showMessage("You have already commented.", true);
        return;
    }
    const text = commentInput.value.trim();
    if (!text) {
        showMessage("Please write a comment first.", true);
        return;
    }

    comments.push({ text, vote: userVote });
    setCookie("comments", JSON.stringify(comments));
    commentInput.value = "";          // clear the input after submitting
    updateUI();
    showMessage("Thanks for your comment!");
});

// ---------------------------------------------------------------
// Reset (the "Clear" button): remove the vote and the comment
// ---------------------------------------------------------------
resetBtn.addEventListener("click", () => {
    deleteCookie("vote");
    deleteCookie("comments");

    userVote = null;
    comments = [];
    likes = BASE_LIKES;
    dislikes = BASE_DISLIKES;
    commentInput.value = "";

    updateUI();
    showMessage("Your vote and comment were cleared. You can vote again.");
});

// ---------------------------------------------------------------
// Init
// ---------------------------------------------------------------
loadState();
updateUI();
if (!cookiesWork) {
    console.warn("Cookies are not available (file:// page?). Using temporary in-memory storage.");
}
