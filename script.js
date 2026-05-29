const API_BASE =
"https://phantom-backend05-1.onrender.com";

/* =========================
   USER
========================= */

const me =
localStorage.getItem("user");

if (
    !me ||
    me === "null" ||
    me === "undefined"
) {

    window.location.href =
    "login.html";
}

/* =========================
   GLOBALS
========================= */

let selectedUser = "";

let stompClient = null;

let connected = false;

let typingTimeout = null;

let onlineUsers = [];

const renderedMessages =
new Set();

/* =========================
   START
========================= */

window.onload = async () => {

    const meBox =
    document.getElementById(
        "me"
    );

    if (meBox) {

        meBox.innerText =
        "Logged as: " + me;
    }

    try {

        await fetch(
            API_BASE + "/users"
        );

    } catch (e) {}

    await setOnline();

    connectSocket();

    await loadOnlineUsers();

    await loadUsers();

    setupInput();
};

/* =========================
   ONLINE
========================= */

async function setOnline() {

    try {

        await fetch(

            API_BASE +
            "/online?user=" + me,

            {
                method:"POST"
            }
        );

    } catch(e){}
}

function setOffline() {

    navigator.sendBeacon(

        API_BASE +
        "/offline?user=" + me
    );
}

window.addEventListener(

    "beforeunload",

    () => {

        setOffline();
    }
);

/* =========================
   SOCKET
========================= */

function connectSocket() {

    const socket =

    new SockJS(
        API_BASE + "/chat"
    );

    stompClient =
    Stomp.over(socket);

    stompClient.debug = null;

    stompClient.connect(

        {},

        () => {

            connected = true;

            console.log(
                "Socket Connected"
            );

            subscribeMessages();

            subscribeTyping();
        },

        () => {

            connected = false;

            setTimeout(() => {

                connectSocket();

            },3000);
        }
    );
}

/* =========================
   RECEIVE MESSAGE
========================= */

function subscribeMessages() {

    stompClient.subscribe(

        "/topic/messages",

        (msg) => {

            const m =
            JSON.parse(msg.body);

            const key =

                m.id ||

                `${m.from}_${m.to}_${m.content}_${m.timestamp}`;

            if (
                renderedMessages.has(key)
            ) {
                return;
            }

            renderedMessages.add(key);

            const currentChat =

                (
                    m.from === me &&
                    m.to === selectedUser
                )

                ||

                (
                    m.from === selectedUser &&
                    m.to === me
                );

            if (!currentChat)
                return;

            renderMessage(m);

            smoothBottom();
        }
    );
}

/* =========================
   TYPING
========================= */

function subscribeTyping() {

    stompClient.subscribe(

        "/topic/typing",

        (msg) => {

            const data =
            JSON.parse(msg.body);

            const typing =
            document.getElementById(
                "typing"
            );

            if (

                data.from === selectedUser &&

                data.to === me
            ) {

                typing.innerText =

                    data.isTyping
                    ? "typing..."
                    : "";
            }
        }
    );
}

/* =========================
   USERS
========================= */

async function loadOnlineUsers() {

    try {

        const res =
        await fetch(
            API_BASE +
            "/online-users"
        );

        onlineUsers =
        await res.json();

    } catch(e){}
}

async function loadUsers() {

    try {

        const res =
        await fetch(
            API_BASE + "/users"
        );

        const users =
        await res.json();

        const box =
        document.getElementById(
            "users"
        );

        box.innerHTML = "";

        users.forEach(user => {

            if (user === me)
                return;

            const online =

            onlineUsers.includes(
                user
            );

            const div =
            document.createElement(
                "div"
            );

            div.className =
            "user";

            div.onclick = () => {

                openChat(user);
            };

            div.innerHTML = `

                <div>

                    ${user}

                </div>

                <div style="
                    width:10px;
                    height:10px;
                    border-radius:50%;
                    background:
                    ${online ? '#4ade80' : '#777'};
                "></div>
            `;

            box.appendChild(div);
        });

    } catch(e){}
}

/* =========================
   OPEN CHAT
========================= */

async function openChat(user) {

    selectedUser = user;

    renderedMessages.clear();

    document.getElementById(
        "chatWith"
    ).innerText = user;

    document.getElementById(
        "avatarBox"
    ).innerText =

    user.charAt(0)
    .toUpperCase();

    updateChatStatus();

    const box =
    document.getElementById(
        "messages"
    );

    box.innerHTML = "";

    await loadMessages();

    document.querySelector(
        ".chat"
    ).classList.add(
        "active"
    );

    if (
        window.innerWidth < 700
    ) {

        document.querySelector(
            ".sidebar"
        ).style.display =
        "none";
    }
}

/* =========================
   STATUS
========================= */

function updateChatStatus() {

    const status =
    document.querySelector(
        ".chatInfo p"
    );

    if (!selectedUser)
        return;

    const online =

    onlineUsers.includes(
        selectedUser
    );

    status.innerText =

        online
        ? "online"
        : "offline";

    status.style.color =

        online
        ? "#4ade80"
        : "#aaa";
}

/* =========================
   CLOSE CHAT
========================= */

function closeChat() {

    document.querySelector(
        ".chat"
    ).classList.remove(
        "active"
    );

    document.querySelector(
        ".sidebar"
    ).style.display =
    "block";
}

/* =========================
   SEND
========================= */

function send() {

    const input =
    document.getElementById(
        "msg"
    );

    const content =
    input.value.trim();

    if (!content)
        return;

    if (!selectedUser)
        return;

    const msg = {

        id:
        crypto.randomUUID(),

        from: me,

        to: selectedUser,

        content: content,

        timestamp:
        Date.now()
    };

    renderedMessages.add(
        msg.id
    );

    stompClient.send(

        "/app/send",

        {},

        JSON.stringify(msg)
    );

    renderMessage(msg);

    smoothBottom();

    input.value = "";

    sendTyping(false);
}

/* =========================
   LOAD MESSAGES
========================= */

async function loadMessages() {

    try {

        const res = await fetch(

            `${API_BASE}/messages?user1=${me}&user2=${selectedUser}`
        );

        const data =
        await res.json();

        data.forEach(m => {

            const key =

                m.id ||

                `${m.from}_${m.to}_${m.content}_${m.timestamp}`;

            if (
                renderedMessages.has(key)
            ) {
                return;
            }

            renderedMessages.add(key);

            renderMessage(m);
        });

        smoothBottom();

    } catch(e){

        console.log(e);
    }
}

/* =========================
   RENDER
========================= */

function renderMessage(m) {

    const box =
    document.getElementById(
        "messages"
    );

    const mine =
    m.from === me;

    const div =
    document.createElement(
        "div"
    );

    div.className =

        mine
        ? "myMsg"
        : "otherMsg";

    let time = "";

    if (m.timestamp) {

        const d =
        new Date(m.timestamp);

        time =

            d.getHours() +

            ":" +

            String(
                d.getMinutes()
            ).padStart(2,"0");
    }

    div.innerHTML = `

        <div>

            ${m.content}

        </div>

        <div class="msgTime">

            ${time}

        </div>
    `;

    box.appendChild(div);
}

/* =========================
   INPUT
========================= */

function setupInput() {

    const input =
    document.getElementById(
        "msg"
    );

    input.addEventListener(

        "keypress",

        (e) => {

            if (
                e.key === "Enter"
            ) {

                send();
            }
        }
    );

    input.addEventListener(

        "input",

        () => {

            sendTyping(true);

            clearTimeout(
                typingTimeout
            );

            typingTimeout =

            setTimeout(() => {

                sendTyping(false);

            },1000);
        }
    );
}

/* =========================
   SEND TYPING
========================= */

function sendTyping(status) {

    if (
        !connected ||
        !selectedUser
    ) {
        return;
    }

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
   SCROLL
========================= */

function smoothBottom() {

    const box =
    document.getElementById(
        "messages"
    );

    requestAnimationFrame(() => {

        box.scrollTop =
        box.scrollHeight;
    });
}

/* =========================
   AUTO REFRESH
========================= */

setInterval(

    async () => {

        await loadOnlineUsers();

        await loadUsers();

        updateChatStatus();

    },

    4000
);
