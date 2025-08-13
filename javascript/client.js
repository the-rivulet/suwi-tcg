/* main client file */
// @ts-expect-error
import { io } from "https://cdn.socket.io/4.8.1/socket.io.esm.min.js";
import { gid } from "./cglobals.js";
// just to have a nice loading screen and make sure the js is workin'
function whenLoaded() {
    document.body.style.background = "#011";
    document.body.style.opacity = "1";
    gid("noclicky").style.display = "none";
    // run this main loop to keep track of the input fields as the user types
    // might be used for other stuff in the future too
    setInterval(() => {
        let problem = false, newUser = false;
        let uVal = gid("login-username").value, uInfo = gid("login-userinfo");
        if (uVal.length == 0) {
            uInfo.style.color = "#aaa";
            uInfo.textContent = "enter a new username to create an account";
            problem = true;
        }
        else if (Array.from(uVal).find(x => x == '"' || "'`\\<>".includes(x))) {
            uInfo.style.color = "red";
            uInfo.textContent = "please don't put " + Array.from(uVal).find(x => x == '"' || "'`\\<>".includes(x)) + " in your username";
            problem = true;
        }
        else if (uVal.length < 4) {
            uInfo.style.color = "red";
            uInfo.textContent = "usernames should have at least 4 characters";
            problem = true;
        }
        else if (usernames.includes(uVal)) {
            uInfo.style.color = "lime";
            uInfo.textContent = "hi again " + uVal.slice(0, 20) + " :3";
        }
        else {
            uInfo.style.color = "lime";
            uInfo.textContent = "welcome, " + uVal.slice(0, 20) + "!";
            newUser = true;
        }
        let pVal = gid("login-password").value, pInfo = gid("login-passinfo");
        if (pVal != pwdError)
            pwdError = "";
        if (uVal.length > 0 && pVal.length == 0) {
            pInfo.style.color = "#aaa";
            pInfo.textContent = "you need a password to log in or sign up";
            problem = true;
        }
        else if (pVal.length == 0) {
            pInfo.style.color = "#aaa";
            pInfo.textContent = "please don't use your real password";
            problem = true;
        }
        else if (Array.from(pVal).find(x => x == '"' || "'`\\<>".includes(x))) {
            pInfo.style.color = "red";
            pInfo.textContent = "please don't put " + Array.from(pVal).find(x => x == '"' || "'`\\".includes(x)) + " in your password";
            problem = true;
        }
        else if (pVal.length < 4) {
            pInfo.style.color = "red";
            pInfo.textContent = "passwords should have at least 4 characters";
            problem = true;
        }
        else if (pVal == pwdError) {
            pInfo.style.color = "red";
            pInfo.textContent = "incorrect password... sorry about that";
        }
        else if (usernames.includes(uVal)) {
            pInfo.style.color = "lime";
            pInfo.textContent = "hopefully you still remember it";
        }
        else {
            pInfo.style.color = "lime";
            pInfo.textContent = "don't use this password for other websites!";
        }
        let btn = gid("login-submit");
        btn.disabled = problem;
        btn.textContent = newUser ? "sign up" : "log in";
    }, 20); // 50 fps should be enough
}
function updateOnlineUsers(onlineUsers) {
    gid("onlineusers-list").innerHTML = onlineUsers.map(x => `<div class="online-user${x == activeUser ? " online-active" : ""}">${x}</div>`).join("");
}
let socket = io(), loaded = false;
let usernames = [], pwdError = "";
let activeUser = "";
socket.on("hello", (ready, unames, onlineUsers) => {
    if (!ready) {
        alert("oh no! seems like the server isn't ready yet. try reloading in a couple seconds?");
        return;
    }
    usernames = unames;
    updateOnlineUsers(onlineUsers);
    loaded = true;
    whenLoaded(); // yay!
});
socket.on("online users update", (onlineUsers) => {
    updateOnlineUsers(onlineUsers);
});
gid("login-submit").onclick = function () {
    if (!loaded)
        return;
    if (gid("login-submit").disabled)
        return;
    // ^^ hopefully that shouldn't be able to happen anyway
    socket.emit("login attempt", gid("login-username").value, gid("login-password").value);
    alert("ok...");
};
socket.on("login response", (ok, isNewUser, uname, pwd) => {
    if (ok) {
        gid("prelogin").style.display = "none";
        gid("postlogin").style.display = "block";
        gid("login-username").value = "";
        gid("login-password").value = "";
        gid("activeusername").textContent = uname;
        activeUser = uname;
        gid("login").style.height = "20%";
        socket.emit("login done", uname);
    }
    else {
        // bad password
        pwdError = pwd;
    }
});
gid("logout").onclick = function () {
    gid("prelogin").style.display = "block";
    gid("postlogin").style.display = "none";
    gid("login").style.height = "30%";
    socket.emit("logout", activeUser);
    activeUser = "";
};
