
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

/* =========================
   START
========================= */

window.onload = async () => {

    document.getElementById(
        "me"
    ).innerText =
    "Logged as: " + me;

    connectSocket();

    await loadUsers();

    setupInputEvents();

    await setOnline();
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

        (e) => {

            connected = false;

            console.log(
                "Socket Error",
                e
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

    stompClient.subscribe(

        "/topic/messages",

        (msg) => {

            const m =
            JSON.parse(msg.body);

            const validChat =

                (
                    m.from === me &&
                    m.to === selectedUser
                )

                ||

                (
                    m.from === selectedUser &&
                    m.to === me
                );

            if (!validChat)
                return;

            if (
                renderedMessages.has(
                    m.id
                )
            ) {
                return;
            }

            renderedMessages.add(
                m.id
            );

            renderMessage(m);

            smoothScrollBottom();
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

function sendTyping(status) {

    if (
        !selectedUser ||
        !connected
    ) return;

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
   USERS
========================= */

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

                        ${user
                            .charAt(0)
                            .toUpperCase()}

                    </div>

                    <div>

                        <div class="userName">
                            ${user}
                        </div>

                    </div>

                </div>
            `;

            box.appendChild(div);
        });

    } catch(e){

        console.log(
            "User Load Error",
            e
        );
    }
}

/* =========================
   OPEN CHAT
========================= */

async function openChat(user) {

    selectedUser = user;

    renderedMessages.clear();

    document.getElementById(
        "messages"
    ).innerHTML = "";

    document.getElementById(
        "chatWith"
    ).innerText = user;

    document.getElementById(
        "avatarBox"
    ).innerText =

    user.charAt(0)
    .toUpperCase();

    document.querySelector(
        ".chat"
    ).classList.add(
        "active"
    );

    if (
        window.innerWidth <= 700
    ) {

        document.querySelector(
            ".sidebar"
        ).style.display =
        "none";
    }

    await loadMessages();
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

    if (
        window.innerWidth <= 700
    ) {

        document.querySelector(
            ".sidebar"
        ).style.display =
        "block";
    }
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

        document.getElementById(
            "messages"
        ).innerHTML = "";

        data.forEach(m => {

            if (
                renderedMessages.has(
                    m.id
                )
            ) return;

            renderedMessages.add(
                m.id
            );

            renderMessage(m);
        });

        smoothScrollBottom();

    } catch(e){

        console.log(
            "Message Load Error",
            e
        );
    }
}

/* =========================
   SEND
========================= */

function send() {

    if (!connected) {

        alert(
            "Socket not connected"
        );

        return;
    }

    if (!selectedUser) {

        alert(
            "Select user"
        );

        return;
    }

    const input =
    document.getElementById(
        "msg"
    );

    const content =
    input.value.trim();

    if (!content)
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

    renderMessage(msg);

    smoothScrollBottom();

    stompClient.send(

        "/app/send",

        {},

        JSON.stringify(msg)
    );

    input.value = "";

    sendTyping(false);
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
   INPUT EVENTS
========================= */

function setupInputEvents() {

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
   SCROLL
========================= */

function smoothScrollBottom() {

    const box =
    document.getElementById(
        "messages"
    );

    setTimeout(() => {

        box.scrollTop =
        box.scrollHeight;

    },50);
}

