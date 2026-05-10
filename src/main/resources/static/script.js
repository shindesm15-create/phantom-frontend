const API_BASE = "https://phantom-backend05-1.onrender.com";

let me = localStorage.getItem("user");
let selectedUser = "";

let stompClient = null;
let connected = false;

let messageSet = new Set();
let messageMap = new Map();

let typingTimeout = null;

/* ================= LOGIN CHECK ================= */

if (!me) {
    window.location.href = "login.html";
}

document.getElementById("me").innerText = "Logged as: " + me;

/* ================= SOCKET ================= */

function connectSocket() {

    if (connected) return;

    let socket = new SockJS(API_BASE + "/chat");
    stompClient = Stomp.over(socket);

    stompClient.connect({}, () => {

        connected = true;

        /* ================= MESSAGES ================= */

        stompClient.subscribe("/topic/messages", (msg) => {

            let m = JSON.parse(msg.body);

            let key = m.id 
                ? m.id 
                : `${m.from}_${m.to}_${m.content}_${Math.floor(m.timestamp / 1000)}`;

            if (messageSet.has(key)) return;

            messageSet.add(key);
            messageMap.set(key, true);

            if (messageSet.size > 1000) {
                messageSet.clear();
                messageMap.clear();
            }

            if (
                (m.from === me && m.to === selectedUser) ||
                (m.from === selectedUser && m.to === me)
            ) {
                renderMessage(m);
            }
        });

        /* ================= TYPING ================= */

        stompClient.subscribe("/topic/typing", (msg) => {

            let data = JSON.parse(msg.body);

            let box = document.getElementById("typing");

            if (box && data.from === selectedUser && data.to === me) {
                box.innerText = data.isTyping ? "typing..." : "";
            }
        });

        loadUsers();
    });
}

connectSocket();

/* ================= USERS ================= */

async function loadUsers() {

    let users = await (await fetch(`${API_BASE}/users`)).json();

    let box = document.getElementById("users");
    box.innerHTML = "";

    users.forEach(u => {

        if (u !== me) {

            let first = u.charAt(0).toUpperCase();

            box.innerHTML += `
                <div class="user" onclick="openChat('${u}')">
                    <div><b>${u}</b></div>
                    <div style="width:28px;height:28px;border-radius:50%;
                    background:#a855f7;display:flex;justify-content:center;
                    align-items:center;font-size:12px;">
                        ${first}
                    </div>
                </div>
            `;
        }
    });
}

/* ================= CHAT OPEN ================= */

function openChat(u) {

    selectedUser = u;

    document.getElementById("chatWith").innerText = u;

    document.querySelector(".chat").classList.add("active");

    loadMessages();

    document.getElementById("msg").focus();
}

/* ================= CLOSE CHAT ================= */

function closeChat() {
    document.querySelector(".chat").classList.remove("active");
}

/* ================= SEND MESSAGE ================= */

function send() {

    let input = document.getElementById("msg");
    let content = input.value.trim();

    if (!content || !selectedUser) return;

    if (!stompClient || !connected) return;

    let msg = {
        from: me,
        to: selectedUser,
        content: content,
        timestamp: Date.now(),
        id: crypto.randomUUID()
    };

    stompClient.send("/app/send", {}, JSON.stringify(msg));

    input.value = "";
    sendTyping(false);
}

/* ENTER SEND */
document.getElementById("msg").addEventListener("keypress", (e) => {
    if (e.key === "Enter") send();
});

/* ================= TYPING ================= */

document.getElementById("msg").addEventListener("input", () => {

    sendTyping(true);

    clearTimeout(typingTimeout);

    typingTimeout = setTimeout(() => {
        sendTyping(false);
    }, 1000);
});

function sendTyping(status) {

    if (!selectedUser || !stompClient || !connected) return;

    stompClient.send("/app/typing", {}, JSON.stringify({
        from: me,
        to: selectedUser,
        isTyping: status
    }));
}

/* ================= LOAD MESSAGES ================= */

async function loadMessages() {

    if (!selectedUser) return;

    let res = await fetch(
        `${API_BASE}/messages?user1=${me}&user2=${selectedUser}`
    );

    let data = await res.json();

    let box = document.getElementById("messages");
    box.innerHTML = "";

    data.forEach(renderMessage);
}

/* ================= RENDER MESSAGE ================= */

function renderMessage(m) {

    let box = document.getElementById("messages");

    let mine = m.from === me;

    let time = "";

    if (m.timestamp) {
        let d = new Date(m.timestamp);
        time = `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
    }

    box.innerHTML += `
        <div class="${mine ? 'myMsg' : 'otherMsg'}">
            <div>${m.content}</div>
            <div class="msgTime">${time}</div>
        </div>
    `;

    box.scrollTop = box.scrollHeight;
}

/* ================= AUTO REFRESH USERS ================= */

setInterval(loadUsers, 4000);