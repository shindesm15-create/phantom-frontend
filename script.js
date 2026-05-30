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

const renderedMessages =
new Set();
let messageSubscription = null;
let typingSubscription = null;

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

    await setOnline();

    connectSocket();

    await loadOnlineUsers();

    await loadUsers();

    setupInputEvents();
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
   VISIBILITY
========================= */

document.addEventListener(

    "visibilitychange",

    async () => {

        if (document.hidden) {

            setOffline();

        } else {

            await setOnline();

            await loadOnlineUsers();

            await loadUsers();

            updateChatStatus();
        }
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

            console.log(
                "Socket Disconnected"
            );

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

    if (messageSubscription) {
        messageSubscription.unsubscribe();
    }

    messageSubscription = stompClient.subscribe(

        "/topic/messages",

        (msg) => {

            const m =
            JSON.parse(msg.body);

            /* MY MESSAGE ALREADY SHOWN IN send() */

            if (m.from === me) {
                return;
            }

            /* ONLY SHOW CURRENT CHAT */

            if (
                m.from !== selectedUser ||
                m.to !== me
            ) {
                return;
            }

            const key =
                m.id ||
                `${m.from}_${m.content}_${m.timestamp}`;

            if (
                renderedMessages.has(key)
            ) {
                return;
            }

            renderedMessages.add(key);

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
        typingSubscription.unsubscribe();
    }

    typingSubscription = stompClient.subscribe(

        "/topic/typing",

        (msg) => {

            const data =
            JSON.parse(msg.body);

            const typingBox =
            document.getElementById(
                "typing"
            );

            if (!typingBox)
                return;

            if (
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

        if (!box)
            return;

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

                <div class="userRow">

                    <div class="snapAvatar">

                        ${
                            online
                            ? "💀"
                            : user
                              .charAt(0)
                              .toUpperCase()
                        }

                    </div>

                    <div>

                        <div class="userName">
                            ${user}
                        </div>

                        <div class="userStatus"
                        style="
                            color:
                            ${
                                online
                                ? "#4ade80"
                                : "#888"
                            };
                        ">

                            ${
                                online
                                ? "online"
                                : "offline"
                            }

                        </div>

                    </div>

                </div>
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
    ).innerText = "💀";

    document.getElementById(
        "messages"
    ).innerHTML = "";

    updateChatStatus();

    await loadMessages();

    if (
        window.innerWidth <= 700
    ) {

        document.querySelector(
            ".sidebar"
        ).style.display =
        "none";

        const chat =

        document.querySelector(
            ".chat"
        );

        chat.style.display =
        "flex";

        chat.classList.add(
            "active"
        );
    }
}

/* =========================
   CLOSE CHAT
========================= */

function closeChat() {

    if (
        window.innerWidth <= 700
    ) {

        document.querySelector(
            ".chat"
        ).style.display =
        "none";

        document.querySelector(
            ".sidebar"
        ).style.display =
        "block";
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

    const statusBox =

    document.getElementById(
        "chatStatus"
    );

    const avatarBox =

    document.getElementById(
        "avatarBox"
    );

    statusBox.innerText =

        online
        ? "online"
        : "offline";

    statusBox.style.color =

        online
        ? "#4ade80"
        : "#888";

    /* SNAPCHAT STYLE */

    avatarBox.innerText =

        online
        ? "💀"
        : selectedUser
          .charAt(0)
          .toUpperCase();
}


/* =========================
   SEND
========================= */

function send() {

    const input =
    document.getElementById(
        "msg"
    );

    if (!input)
        return;

    const content =
    input.value.trim();

    if (!content)
        return;

    if (!selectedUser)
        return;

    if (!connected)
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

    /* SAVE BEFORE SOCKET */

    renderedMessages.add(
        msg.id
    );

    /* SHOW LOCAL */

    renderMessage(msg);

    smoothScrollBottom();

    /* SEND */

    stompClient.send(

        "/app/send",

        {},

        JSON.stringify(msg)
    );

    input.value = "";

    sendTyping(false);
}


/* =========================
   SEND TYPING
========================= */

function sendTyping(status) {

    if (
        !selectedUser ||
        !connected
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
   INPUT EVENTS
========================= */

function setupInputEvents() {

    const input =

    document.getElementById(
        "msg"
    );

    if (!input)
        return;

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

                `${m.from}_${m.content}_${m.timestamp}`;

            if (
                renderedMessages.has(key)
            ) {
                return;
            }

            renderedMessages.add(key);

            renderMessage(m);
        });

        smoothScrollBottom();

    } catch(e){

        console.log(
            "Load message error",
            e
        );
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

    if (!box) return;

    const key =
        m.id ||
        `${m.from}_${m.content}_${m.timestamp}`;

    /* PREVENT DUPLICATE HTML */

    if (
        document.getElementById(
            "msg_" + key
        )
    ) {
        return;
    }

    const mine =
    m.from === me;

    const div =
    document.createElement(
        "div"
    );

    div.id =
    "msg_" + key;

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
            ).padStart(2, "0");
    }

    div.innerHTML = `
        <div>${m.content}</div>
        <div class="msgTime">${time}</div>
    `;

    box.appendChild(div);
}

/* =========================
   SCROLL
========================= */

function smoothScrollBottom() {

    const box =

    document.getElementById(
        "messages"
    );

    if (!box)
        return;

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

            await loadOnlineUsers();

            await loadUsers();

            updateChatStatus();
        }

    },

    3000
);   
