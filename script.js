const API_BASE = "https://phantom-backend05-1.onrender.com";

/* =========================
   USER
========================= */

const me = localStorage.getItem("user");

if (!me) {
    window.location.href = "login.html";
}

/* =========================
   GLOBAL STATE
========================= */

let selectedUser = "";
let stompClient = null;
let connected = false;

let typingTimeout = null;

let onlineUsers = [];
const renderedMessages = new Set();

let messageSub = null;
let typingSub = null;

/* =========================
   AVATAR FIX (IMPORTANT)
========================= */

function getAvatar(user) {

    if (!user) return "?";

    const chars = [...user.trim()];
    const emojiRegex = /\p{Extended_Pictographic}/u;

    if (chars.length && emojiRegex.test(chars[0])) {
        return chars[0];
    }

    return chars[0].toUpperCase();
}

/* =========================
   INIT
========================= */

window.onload = async () => {

    document.getElementById("me").innerText = "Logged as: " + me;

    await setOnline();
    connectSocket();

    await loadOnlineUsers();
    await loadUsers();

    setupInputEvents();

    setInterval(syncData, 4000);
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

window.addEventListener("beforeunload", setOffline);

/* =========================
   SOCKET
========================= */

function connectSocket() {

    const socket = new SockJS(API_BASE + "/ws");
    stompClient = Stomp.over(socket);
    stompClient.debug = null;

    stompClient.connect({}, () => {

        connected = true;

        subscribeMessages();
        subscribeTyping();

    }, () => {

        connected = false;
        setTimeout(connectSocket, 3000);
    });
}

/* =========================
   MESSAGES SOCKET
========================= */

function subscribeMessages() {

    if (messageSub) messageSub.unsubscribe();

    messageSub = stompClient.subscribe("/topic/messages", (msg) => {

        const m = JSON.parse(msg.body);

        if (!selectedUser) return;

        const valid =
            (m.from === me && m.to === selectedUser) ||
            (m.from === selectedUser && m.to === me);

        if (!valid) return;

        const key = m.id || `${m.from}_${m.timestamp}`;

        if (renderedMessages.has(key)) return;

        renderedMessages.add(key);

        renderMessage(m);
        scrollBottom();
    });
}

/* =========================
   TYPING SOCKET
========================= */

function subscribeTyping() {

    if (typingSub) typingSub.unsubscribe();

    typingSub = stompClient.subscribe("/topic/typing", (msg) => {

        const d = JSON.parse(msg.body);

        const box = document.getElementById("typing");

        if (!box) return;

        if (d.from === selectedUser && d.to === me) {
            box.innerText = d.isTyping ? "typing..." : "";
        }
    });
}

/* =========================
   LOAD USERS
========================= */

async function loadUsers() {

    try {

        const res = await fetch(API_BASE + "/api/users");
        const users = await res.json();

        const box = document.getElementById("users");
        box.innerHTML = "";

        users.forEach(u => {

            if (!u || u === me) return;

            const online = onlineUsers.includes(u);

            const div = document.createElement("div");
            div.className = "user";

            div.onclick = () => openChat(u);

            div.innerHTML = `
                <div class="userRow">

                    <div class="snapAvatar">
                        ${getAvatar(u)}
                    </div>

                    <div>
                        <div class="userName">${u}</div>
                        <div class="userStatus" style="color:${online ? '#4ade80' : '#888'}">
                            ${online ? "online" : "offline"}
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
   ONLINE USERS
========================= */

async function loadOnlineUsers() {

    try {
        const res = await fetch(API_BASE + "/api/online-users");
        onlineUsers = await res.json();
    } catch (e) {
        onlineUsers = [];
    }
}

/* =========================
   SYNC
========================= */

async function syncData() {

    if (document.hidden) return;

    await loadOnlineUsers();
    await loadUsers();
    updateChatStatus();
}

/* =========================
   OPEN CHAT
========================= */

async function openChat(user) {

    selectedUser = user;
    renderedMessages.clear();

    document.getElementById("chatWith").innerText = user;
    document.getElementById("messages").innerHTML = "";

    updateChatStatus();

    await loadMessages();

    if (window.innerWidth <= 700) {
        document.querySelector(".sidebar").style.display = "none";
        document.querySelector(".chat").classList.add("active");
    }
}

/* =========================
   CLOSE CHAT
========================= */

function closeChat() {

    if (window.innerWidth <= 700) {
        document.querySelector(".sidebar").style.display = "block";
        document.querySelector(".chat").classList.remove("active");
    }
}

/* =========================
   STATUS FIX (NO 💀 BUG)
========================= */

function updateChatStatus() {

    if (!selectedUser) return;

    const online = onlineUsers.includes(selectedUser);

    document.getElementById("chatStatus").innerText =
        online ? "online" : "offline";

    document.getElementById("chatStatus").style.color =
        online ? "#4ade80" : "#888";

    document.getElementById("avatarBox").innerText =
        getAvatar(selectedUser);
}

/* =========================
   LOAD MESSAGES
========================= */

async function loadMessages() {

    try {

        const res = await fetch(
            `${API_BASE}/api/messages?user1=${me}&user2=${selectedUser}`
        );

        const data = await res.json();

        data.forEach(renderMessage);

        scrollBottom();

    } catch (e) {
        console.log("message load error", e);
    }
}

/* =========================
   SEND MESSAGE (TEXT + IMAGE)
========================= */

function send() {

    const input = document.getElementById("msg");
    const file = document.getElementById("imageInput");

    if (!selectedUser || !connected) return;

    // IMAGE
    if (file.files.length > 0) {

        const reader = new FileReader();

        reader.onload = () => {

            sendMessage({
                id: crypto.randomUUID(),
                from: me,
                to: selectedUser,
                type: "image",
                content: reader.result,
                timestamp: Date.now()
            });
        };

        reader.readAsDataURL(file.files[0]);
        file.value = "";
        return;
    }

    // TEXT
    const text = input.value.trim();
    if (!text) return;

    sendMessage({
        id: crypto.randomUUID(),
        from: me,
        to: selectedUser,
        type: "text",
        content: text,
        timestamp: Date.now()
    });

    input.value = "";
}

/* =========================
   SEND SOCKET
========================= */

function sendMessage(msg) {

    renderedMessages.add(msg.id);

    renderMessage(msg);
    scrollBottom();

    stompClient.send("/app/send", {}, JSON.stringify(msg));
}

/* =========================
   INPUT EVENTS
========================= */

function setupInputEvents() {

    const input = document.getElementById("msg");

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") send();
    });

    input.addEventListener("input", () => {

        sendTyping(true);

        clearTimeout(typingTimeout);

        typingTimeout = setTimeout(() => {
            sendTyping(false);
        }, 1000);
    });
}

/* =========================
   TYPING
========================= */

function sendTyping(status) {

    if (!connected || !selectedUser) return;

    stompClient.send("/app/typing", {}, JSON.stringify({
        from: me,
        to: selectedUser,
        isTyping: status
    }));
}

/* =========================
   RENDER MESSAGE (FIX TIME)
========================= */

function renderMessage(m) {

    const box = document.getElementById("messages");

    const div = document.createElement("div");

    const mine = m.from === me;

    div.className = mine ? "myMsg" : "otherMsg";

    let time = "";

    if (m.timestamp) {
        const d = new Date(m.timestamp);
        const h = d.getHours();
        const min = String(d.getMinutes()).padStart(2, "0");
        time = `${h}:${min}`;
    }

    let content = "";

    if (m.type === "image") {
        content = `
            <img class="chatImage" src="${m.content}" />
            <div class="msgTime">${time}</div>
        `;
    } else {
        content = `
            <div>${m.content}</div>
            <div class="msgTime">${time}</div>
        `;
    }

    div.innerHTML = content;

    box.appendChild(div);
}

/* =========================
   SCROLL FIX
========================= */

function scrollBottom() {

    const box = document.getElementById("messages");

    setTimeout(() => {
        box.scrollTop = box.scrollHeight;
    }, 80);
}
