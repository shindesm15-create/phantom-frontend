const API_BASE = "https://phantom-backend05-1.onrender.com";

/* =========================
   USER
========================= */

const me = localStorage.getItem("user");

if (!me) {
    window.location.href = "login.html";
}

/* =========================
   GLOBALS
========================= */

let selectedUser = "";
let stompClient = null;
let connected = false;
let typingTimeout = null;

let onlineUsers = [];

const renderedMessages = new Set();

let messageSubscription = null;
let typingSubscription = null;

/* =========================
   AVATAR
========================= */

function getAvatar(user) {

    const emojiRegex = /\p{Extended_Pictographic}/u;
    const chars = [...user.trim()];

    if (chars.length && emojiRegex.test(chars[0])) {
        return chars[0];
    }

    return chars[0]?.toUpperCase() || "?";
}

/* =========================
   START
========================= */

window.onload = async () => {

    const meBox = document.getElementById("me");
    if (meBox) meBox.innerText = "Logged as: " + me;

    await setOnline();

    connectSocket();

    await loadOnlineUsers();
    await loadUsers();

    setupInputEvents();

    // 🔥 auto refresh online users
    setInterval(async () => {
        await loadOnlineUsers();
        await loadUsers();
    }, 5000);
};

/* =========================
   ONLINE STATUS
========================= */

async function setOnline() {
    try {
        await fetch(API_BASE + "/api/online?user=" + me, {
            method: "POST"
        });
    } catch (e) {}
}

function setOffline() {
    navigator.sendBeacon(API_BASE + "/api/offline?user=" + me);
}

window.addEventListener("beforeunload", () => {
    setOffline();
});

document.addEventListener("visibilitychange", async () => {
    if (document.hidden) {
        setOffline();
    } else {
        await setOnline();
        await loadOnlineUsers();
        await loadUsers();
        updateChatStatus();
    }
});

/* =========================
   SOCKET CONNECTION
========================= */

function connectSocket() {

    const socket = new SockJS(API_BASE + "/ws");
    stompClient = Stomp.over(socket);

    stompClient.debug = null;

    stompClient.connect(
        {},
        () => {
            connected = true;
            console.log("Socket Connected");

            subscribeMessages();
            subscribeTyping();
        },
        () => {
            connected = false;
            console.log("Socket Disconnected");

            // prevent duplicate connections
            if (stompClient) {
                try {
                    stompClient.disconnect(() => {});
                } catch (e) {}
                stompClient = null;
            }

            setTimeout(connectSocket, 3000);
        }
    );
}

/* =========================
   MESSAGES
========================= */

function subscribeMessages() {

    if (messageSubscription) {
        try {
            messageSubscription.unsubscribe();
        } catch (e) {}
    }

    messageSubscription = stompClient.subscribe(
        "/topic/messages",
        (msg) => {

            const m = JSON.parse(msg.body);

            if (m.from === me) return;

            if (!selectedUser) return;

            if (m.from !== selectedUser || m.to !== me) return;

            const key = m.id || `${m.from}_${m.content}_${m.timestamp}`;

            if (renderedMessages.has(key)) return;

            renderedMessages.add(key);

            if (renderedMessages.size > 500) {
                renderedMessages.clear();
            }

            renderMessage(m);
            smoothScrollBottom();
        }
    );
}

/* =========================
   TYPING
========================= */

function subscribeTyping() {

    if (typingSubscription) {
        try {
            typingSubscription.unsubscribe();
        } catch (e) {}
    }

    typingSubscription = stompClient.subscribe(
        "/topic/typing",
        (msg) => {

            const data = JSON.parse(msg.body);

            const typingBox = document.getElementById("typing");
            if (!typingBox) return;

            if (
                data.from === selectedUser &&
                data.to === me
            ) {
                typingBox.innerText = data.isTyping ? "typing..." : "";
            }
        }
    );
}

/* =========================
   USERS
========================= */

async function loadOnlineUsers() {

    try {
        const res = await fetch(API_BASE + "/api/online-users");
        onlineUsers = await res.json();
    } catch (e) {
        onlineUsers = [];
    }
}

async function loadUsers() {

    try {
        const res = await fetch(API_BASE + "/api/users"); // FIXED
        const users = await res.json();

        const box = document.getElementById("users");
        if (!box) return;

        box.innerHTML = "";

        users.forEach(user => {

            if (!user || user === me) return;

            const online = onlineUsers.includes(user);

            const div = document.createElement("div");
            div.className = "user";

            div.onclick = () => openChat(user);

            div.innerHTML = `
                <div class="userRow">

                    <div class="snapAvatar">
                        ${online ? "💀" : getAvatar(user)}
                    </div>

                    <div>

                        <div class="userName">
                            ${user}
                        </div>

                        <div class="userStatus"
                             style="color:${online ? '#4ade80' : '#888'}">

                            ${online ? 'online' : 'offline'}

                        </div>

                    </div>

                </div>
            `;

            box.appendChild(div);
        });

    } catch (e) {
        console.error("loadUsers error", e);
    }
}

/* =========================
   CHAT OPEN
========================= */

async function openChat(user) {

    selectedUser = user;

    renderedMessages.clear();

    const chatWith = document.getElementById("chatWith");
    if (chatWith) chatWith.innerText = user;

    const messagesBox = document.getElementById("messages");
    if (messagesBox) messagesBox.innerHTML = "";

    updateChatStatus();

    await loadMessages();

    if (window.innerWidth <= 700) {

        document.querySelector(".sidebar").style.display = "none";

        const chat = document.querySelector(".chat");
        chat.style.display = "flex";
        chat.classList.add("active");
    }
}

/* =========================
   CHAT CLOSE
========================= */

function closeChat() {

    if (window.innerWidth <= 700) {
        document.querySelector(".chat").style.display = "none";
        document.querySelector(".sidebar").style.display = "block";
    }
}

/* =========================
   STATUS UPDATE
========================= */

function updateChatStatus() {

    if (!selectedUser) return;

    const online = onlineUsers.includes(selectedUser);

    const statusBox = document.getElementById("chatStatus");
    const avatarBox = document.getElementById("avatarBox");

    if (statusBox) {
        statusBox.innerText = online ? "online" : "offline";
        statusBox.style.color = online ? "#4ade80" : "#888";
    }

    if (avatarBox) {
        avatarBox.innerText = online ? "💀" : getAvatar(selectedUser);
    }
}

/* =========================
   REQUIRED PLACEHOLDERS
========================= */

// You already have these in your project
// (kept here to avoid errors)

function setupInputEvents() {}
function renderMessage(m) {}
function smoothScrollBottom() {}
function loadMessages() {}
