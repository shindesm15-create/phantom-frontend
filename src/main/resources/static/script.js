const API_BASE = "https://phantom-backend05-1.onrender.com";

/* =========================
   USER
========================= */

let me = localStorage.getItem("user");

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

let renderedMessages = new Set();

/* =========================
   START APP
========================= */

document.addEventListener("DOMContentLoaded", () => {

    let meBox = document.getElementById("me");

    if (meBox) {
        meBox.innerText = "Logged as: " + me;
    }

    connectSocket();

    setTimeout(() => {
        loadUsers();
    }, 1000);
});

/* =========================
   SOCKET
========================= */

function connectSocket() {

    try {

        let socket = new SockJS(API_BASE + "/chat");

        stompClient = Stomp.over(socket);

        stompClient.debug = null;

        stompClient.connect({}, () => {

            connected = true;

            console.log("Socket Connected");

            /* RECEIVE MESSAGE */

            stompClient.subscribe("/topic/messages", (msg) => {

                let m = JSON.parse(msg.body);

                let key =
                    m.id ||
                    `${m.from}_${m.to}_${m.content}_${m.timestamp}`;

                if (renderedMessages.has(key)) {
                    return;
                }

                renderedMessages.add(key);

                if (
                    (m.from === me && m.to === selectedUser) ||
                    (m.from === selectedUser && m.to === me)
                ) {
                    renderMessage(m);
                }
            });

            /* TYPING */

            stompClient.subscribe("/topic/typing", (msg) => {

                let data = JSON.parse(msg.body);

                let typingBox =
                    document.getElementById("typing");

                if (
                    typingBox &&
                    data.from === selectedUser &&
                    data.to === me
                ) {
                    typingBox.innerText =
                        data.isTyping
                        ? "typing..."
                        : "";
                }
            });

        }, (err) => {

            console.log("Socket Error:", err);
        });

    } catch (err) {

        console.log("Socket Failed:", err);
    }
}

/* =========================
   LOAD USERS
========================= */

async function loadUsers() {

    console.log("FUNCTION START");

    try {

        let response = await fetch(
            "https://phantom-backend05-1.onrender.com/users"
        );

        console.log("FETCH DONE");

        let users = await response.json();

        console.log("USERS =", users);

        let box = document.getElementById("users");

        box.innerHTML = "";

        users.forEach(username => {

            if (username === me) return;

            let div = document.createElement("div");

            div.className = "user";

            div.style.padding = "20px";

            div.style.color = "white";

            div.innerHTML = username;

            box.appendChild(div);
        });

    } catch (e) {

        console.log("ERROR =", e);

        alert(e);
    }
}

loadUsers();
/* =========================
   OPEN CHAT
========================= */

function openChat(username) {

    selectedUser = username;

    let chatBox = document.querySelector(".chat");

    if (chatBox) {
        chatBox.classList.add("active");
    }

    let chatWith =
        document.getElementById("chatWith");

    if (chatWith) {
        chatWith.innerText = username;
    }

    let avatar =
        document.getElementById("avatarBox");

    if (avatar) {
        avatar.innerText =
            username.charAt(0).toUpperCase();
    }

    loadMessages();

    let input = document.getElementById("msg");

    if (input) {
        input.focus();
    }
}

/* =========================
   CLOSE CHAT
========================= */

function closeChat() {

    let chatBox = document.querySelector(".chat");

    if (chatBox) {
        chatBox.classList.remove("active");
    }
}

/* =========================
   SEND MESSAGE
========================= */

function send() {

    let input = document.getElementById("msg");

    if (!input) return;

    let content = input.value.trim();

    if (!content) return;

    if (!selectedUser) return;

    if (!connected || !stompClient) {
        alert("Socket not connected");
        return;
    }

    let msg = {

        id: crypto.randomUUID(),

        from: me,

        to: selectedUser,

        content: content,

        timestamp: Date.now()
    };

    stompClient.send(
        "/app/send",
        {},
        JSON.stringify(msg)
    );

    input.value = "";

    sendTyping(false);
}

/* =========================
   ENTER + TYPING
========================= */

let msgInput = document.getElementById("msg");

if (msgInput) {

    msgInput.addEventListener("keypress", (e) => {

        if (e.key === "Enter") {
            send();
        }
    });

    msgInput.addEventListener("input", () => {

        sendTyping(true);

        clearTimeout(typingTimeout);

        typingTimeout = setTimeout(() => {
            sendTyping(false);
        }, 1000);
    });
}

/* =========================
   SEND TYPING
========================= */

function sendTyping(status) {

    if (!connected || !stompClient) return;

    if (!selectedUser) return;

    stompClient.send(
        "/app/typing",
        {},
        JSON.stringify({

            from: me,

            to: selectedUser,

            isTyping: status
        })
    );
}

/* =========================
   LOAD MESSAGES
========================= */

async function loadMessages() {

    if (!selectedUser) return;

    try {

        let res = await fetch(
            `${API_BASE}/messages?user1=${me}&user2=${selectedUser}`
        );

        let data = await res.json();

        let box =
            document.getElementById("messages");

        if (!box) return;

        box.innerHTML = "";

        renderedMessages.clear();

        data.forEach(m => {

            let key =
                m.id ||
                `${m.from}_${m.to}_${m.content}_${m.timestamp}`;

            renderedMessages.add(key);

            renderMessage(m);
        });

    } catch (err) {

        console.log("Load Messages Error:", err);
    }
}

/* =========================
   RENDER MESSAGE
========================= */

function renderMessage(m) {

    let box =
        document.getElementById("messages");

    if (!box) return;

    let mine = m.from === me;

    let time = "";

    if (m.timestamp) {

        let d = new Date(m.timestamp);

        time =
            d.getHours() +
            ":" +
            String(d.getMinutes()).padStart(2, "0");
    }

    box.innerHTML += `
        <div class="${mine ? "myMsg" : "otherMsg"}">

            <div>${m.content}</div>

            <div class="msgTime">
                ${time}
            </div>

        </div>
    `;

    box.scrollTop = box.scrollHeight;
}

/* =========================
   AUTO REFRESH USERS
========================= */

setInterval(() => {
    loadUsers();
}, 5000);

setTimeout(async () => {

    try {

        let res = await fetch(API_BASE + "/users");

        let users = await res.json();

        console.log("FORCE USERS:", users);

        let box = document.getElementById("users");

        box.innerHTML = "";

        users.forEach(username => {

            if (username === me) return;

            box.innerHTML += `
                <div class="user"
                     onclick="openChat('${username}')">

                    <div>
                        <b>${username}</b>
                    </div>

                </div>
            `;
        });

    } catch (e) {

        console.log("FINAL ERROR:", e);
    }

}, 2000);

setTimeout(() => {
    loadUsers();
}, 1000);