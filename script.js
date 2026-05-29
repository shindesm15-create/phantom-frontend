const API_BASE =
"https://phantom-backend05-1.onrender.com";

/* =========================
   USER
========================= */

const me =
localStorage.getItem("user");

if (!me) {

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

let subscribed = false;

/* PREVENT DUPLICATES */

const renderedMessages =
new Set();

/* =========================
   START
========================= */

window.onload = async () => {

    document.getElementById(
        "me"
    ).innerText =
    "Logged as: " + me;

    await setOnline();

    connectSocket();

    await refreshUsers();

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

document.addEventListener(

    "visibilitychange",

    async () => {

        if (document.hidden) {

            setOffline();

        } else {

            await setOnline();

            await refreshUsers();
        }
    }
);

/* =========================
   SOCKET
========================= */

function connectSocket() {

    if (connected)
        return;

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

            if (!subscribed) {

                subscribeMessages();

                subscribeTyping();

                subscribed = true;
            }
        },

        () => {

            connected = false;

            subscribed = false;

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
                `${m.from}_${m.timestamp}`;

            /* BLOCK DUPLICATE */

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

                if (data.isTyping) {

                    typing.innerText =
                    "typing...";

                } else {

                    typing.innerText =
                    "";
                }
            }
        }
    );
}

/* =========================
   USERS
========================= */

async function refreshUsers() {

    await loadOnlineUsers();

    await loadUsers();

    updateChatStatus();
}

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
                    ${online ? '#4ade80' : '#666'};
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

    document.getElementById(
        "messages"
    ).innerHTML = "";

    updateChatStatus();

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

    if (!selectedUser)
        return;

    const online =

    onlineUsers.includes(
        selectedUser
    );

    const status =
    document.querySelector(
        ".chatInfo p"
    );

    status.innerText =

        online
        ? "online"
        : "offline";

    status.style.color =

        online
        ? "#4ade80"
        : "#999";
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

    /* SAVE BEFORE SEND */

    renderedMessages.add(
        msg.id
    );

    /* RENDER ONLY ONCE */

    renderMessage(msg);

    smoothBottom();

    stompClient.send(

        "/app/send",

        {},

        JSON.stringify(msg)
    );

    input.value = "";

    sendTyping(false);
}

/* =========================
   LOAD OLD MESSAGES
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
                `${m.from}_${m.timestamp}`;

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

    const div =
    document.createElement(
        "div"
    );

    div.className =

        m.from === me
        ? "myMsg"
        : "otherMsg";

    const d =
    new Date(m.timestamp);

    const time =

        d.getHours() +

        ":" +

        String(
            d.getMinutes()
        ).padStart(2,"0");

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

    setTimeout(() => {

        box.scrollTop =
        box.scrollHeight;

    },50);
}

/* =========================
   AUTO REFRESH
========================= */

setInterval(

    async () => {

        if (!document.hidden) {

            await refreshUsers();
        }

    },

    3000
);
