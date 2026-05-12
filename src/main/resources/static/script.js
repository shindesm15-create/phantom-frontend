const API_BASE =
    "https://phantom-backend05-1.onrender.com";

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

window.onload = () => {

    let meBox =
        document.getElementById("me");

    if (meBox) {
        meBox.innerText =
            "Logged as: " + me;
    }

    connectSocket();

    loadUsers();
};

/* =========================
   SOCKET
========================= */

function connectSocket() {

    try {

        console.log("CONNECTING SOCKET...");

        const socket =
            new SockJS(
                API_BASE + "/chat"
            );

        stompClient =
            Stomp.over(socket);

        stompClient.debug = null;

        stompClient.connect(
            {},
            function () {

                connected = true;

                console.log(
                    "SOCKET CONNECTED"
                );

                /* RECEIVE MESSAGE */

                stompClient.subscribe(
                    "/topic/messages",
                    function (msg) {

                        let m =
                            JSON.parse(msg.body);

                        let key =
                            m.id ||
                            `${m.from}_${m.to}_${m.content}_${m.timestamp}`;

                        if (
                            renderedMessages.has(key)
                        ) {
                            return;
                        }

                        renderedMessages.add(key);

                        if (
                            (m.from === me &&
                             m.to === selectedUser)
                            ||
                            (m.from === selectedUser &&
                             m.to === me)
                        ) {

                            renderMessage(m);
                        }
                    }
                );

                /* TYPING */

                stompClient.subscribe(
                    "/topic/typing",
                    function (msg) {

                        let data =
                            JSON.parse(msg.body);

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
                    }
                );
            },

            function (error) {

                connected = false;

                console.log(
                    "SOCKET FAILED:",
                    error
                );

                /* AUTO RETRY */

                setTimeout(() => {

                    connectSocket();

                }, 3000);
            }
        );

    } catch (e) {

        console.log(
            "SOCKET ERROR:",
            e
        );

        setTimeout(() => {

            connectSocket();

        }, 3000);
    }
}

      
/* =========================
   LOAD USERS
========================= */

async function loadUsers() {

    try {

        let response =
            await fetch(
                API_BASE + "/users"
            );

        let users =
            await response.json();

        console.log("USERS:", users);

        let box =
            document.getElementById("users");

        if (!box) return;

        box.innerHTML = "";

        users.forEach(username => {

            if (username === me) return;

            let div =
                document.createElement("div");

            div.className = "user";

            div.style.cursor = "pointer";

           div.innerHTML = `

    <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        width:100%;
    ">

        <div>
            <b>${username}</b>

            <div style="
                font-size:12px;
                color:#4ade80;
                margin-top:4px;
            ">
                online
            </div>
        </div>

        <div style="
            width:10px;
            height:10px;
            border-radius:50%;
            background:#4ade80;
            box-shadow:0 0 10px #4ade80;
        "></div>

    </div>
`;

            /* IMPORTANT */

            div.onclick = () => {
                openChat(username);
            };

            box.appendChild(div);
        });

    } catch (e) {

        console.log(
            "LOAD USERS ERROR:",
            e
        );
    }
}

/* =========================
   OPEN CHAT
========================= */

function openChat(username) {

    console.log(
        "OPEN CHAT:",
        username
    );

    selectedUser = username;

    let chatWith =
        document.getElementById("chatWith");

    if (chatWith) {
        chatWith.innerText = username;
    }

    let avatar =
        document.getElementById("avatarBox");

    if (avatar) {

        avatar.innerText =
            username.charAt(0)
            .toUpperCase();
    }

    let chat =
        document.querySelector(".chat");

    if (chat) {
        chat.classList.add("active");
    }

    loadMessages();

    let msgInput =
        document.getElementById("msg");

    if (msgInput) {
        msgInput.focus();
    }
}

/* =========================
   CLOSE CHAT
========================= */

function closeChat() {

    let chat =
        document.querySelector(".chat");

    if (chat) {
        chat.classList.remove("active");
    }
}

/* =========================
   SEND MESSAGE
========================= */

function send() {

    let input =
        document.getElementById("msg");

    if (!input) return;

    let content =
        input.value.trim();

    if (!content) return;

    if (!selectedUser) {

        alert("Select user");

        return;
    }

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
   INPUT EVENTS
========================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        let msgInput =
            document.getElementById("msg");

        if (!msgInput) return;

        msgInput.addEventListener(
            "keypress",
            (e) => {

                if (e.key === "Enter") {
                    send();
                }
            }
        );

        msgInput.addEventListener(
            "input",
            () => {

                sendTyping(true);

                clearTimeout(
                    typingTimeout
                );

                typingTimeout =
                    setTimeout(() => {

                        sendTyping(false);

                    }, 1000);
            }
        );
    }
);

/* =========================
   SEND TYPING
========================= */

function sendTyping(status) {

    if (!selectedUser) return;

    if (!connected || !stompClient)
        return;

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

        let response =
            await fetch(
                `${API_BASE}/messages?user1=${me}&user2=${selectedUser}`
            );

        let data =
            await response.json();

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

    } catch (e) {

        console.log(
            "LOAD MESSAGE ERROR:",
            e
        );
    }
}

/* =========================
   RENDER MESSAGE
========================= */

function renderMessage(m) {

    let box =
        document.getElementById("messages");

    if (!box) return;

    let mine =
        m.from === me;

    let time = "";

    if (m.timestamp) {

        let d =
            new Date(m.timestamp);

        time =
            d.getHours() +
            ":" +
            String(d.getMinutes())
            .padStart(2, "0");
    }

    box.innerHTML += `

        <div class="${
            mine
            ? "myMsg"
            : "otherMsg"
        }">

            <div>${m.content}</div>

            <div class="msgTime">
                ${time}
            </div>

        </div>
    `;

    box.scrollTop =
        box.scrollHeight;
}

/* =========================
   AUTO REFRESH USERS
========================= */

setInterval(() => {

    loadUsers();

}, 5000);