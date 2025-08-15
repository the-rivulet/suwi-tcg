import express from "express";
import { createServer } from 'node:http';
import { join } from 'node:path';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFile, writeFileSync } from "node:fs";
import { cardIDList } from "./clibrary.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express(), server = createServer(app), io = new Server(server);
app.get("/", (req, res) => {
    res.sendFile(join(__dirname, "..", "index.html"));
});
// Give the client access to some file, in the `javascript` directory by default
function serveStaticFile(filename) {
    app.get("/" + filename, (req, res) => {
        res.sendFile(join(__dirname, "..", filename));
    });
}
serveStaticFile("javascript/client.js");
serveStaticFile("javascript/cglobals.js");
serveStaticFile("javascript/cdecks.js");
serveStaticFile("javascript/clibrary.js");
serveStaticFile("javascript/cbattling.js");
serveStaticFile("assets/style.css");
serveStaticFile("assets/playmat.jpg");
for (let i of Object.keys(cardIDList)) {
    serveStaticFile(`assets/cards/${i}.png`);
}
let data = { accounts: {} };
let onlineUsers = [];
let loaded = false;
let activeBattles = {};
// Retrieve info from last load
readFile(join(__dirname, "..", "serverStorage", "accounts.json"), (err, result) => {
    if (err)
        throw err;
    data = JSON.parse(result.toString());
    loaded = true;
});
// Handle client stuff (this is the important part)
io.on("connection", socket => {
    let thisUser = ""; // this user's username
    console.log(`Socket ${socket.id} connected.`);
    // send them some helpful info, like the registered username list (so it can check if it's a new user or not)
    socket.emit("hello", loaded, Object.keys(data.accounts), onlineUsers);
    socket.on("login attempt", (aUsername, aPassword) => {
        // just assume that their info is ok :slugshrug:
        if (Object.keys(data.accounts).includes(aUsername)) {
            // old user!
            if (onlineUsers.includes(aUsername)) {
                socket.emit("login response", "already online", { username: aUsername, password: aPassword });
            }
            else if (data.accounts[aUsername].password == aPassword) {
                socket.emit("login response", "ok", data.accounts[aUsername]);
                console.log(`Socket ${socket.id} logged in as ${aUsername} with password ${aPassword}.`);
            }
            else {
                socket.emit("login response", "bad password", { username: aUsername, password: aPassword });
            }
        }
        else {
            // new user! give em some starting cards
            data.accounts[aUsername] = { username: aUsername, password: aPassword, decks: {}, collection: { "basicUnicorn1": 20, "basicUnicorn2": 3 } };
            // write their name into the file system
            writeFileSync(join(__dirname, "..", "serverStorage", "accounts.json"), JSON.stringify(data, undefined, 2));
            console.log(`Created a new account for ${aUsername} with password ${aPassword} on socket ${socket.id}.`);
            socket.emit("login response", "ok", data.accounts[aUsername]);
        }
    });
    socket.on("login done", (username) => {
        thisUser = username;
        onlineUsers.push(username);
        socket.join(username); // put em in their own little room!
        io.emit("online users update", onlineUsers);
    });
    socket.on("logout", (username) => {
        onlineUsers.splice(onlineUsers.indexOf(username), 1);
        socket.leave(username);
        console.log(`Socket ${socket.id} logged out of their account (${username}).`);
        io.emit("online users update", onlineUsers);
    });
    socket.on("save deck", (info) => {
        let overwritten = Object.keys(data.accounts[thisUser].decks).includes(info.name);
        // again, assume things are probably ok. overwrite the deck if it exists
        data.accounts[thisUser].decks[info.name] = info;
        // store their deck into the file system
        writeFileSync(join(__dirname, "..", "serverStorage", "accounts.json"), JSON.stringify(data, undefined, 2));
        console.log(`${thisUser} ${overwritten ? "updated" : "created"} a deck named ${info.name}.`);
        socket.emit("deck saved", info, overwritten);
    });
    socket.on("request user info", (otherUser) => {
        if (Object.keys(data.accounts).includes(otherUser)) {
            socket.emit("sent user info", true, { "username": otherUser, "decks": data.accounts[otherUser].decks });
        }
        else {
            socket.emit("sent user info", false, { "username": otherUser, "decks": {} });
        }
    });
    socket.on("request battle", (otherUser) => {
        console.log(thisUser + " wants to battle " + otherUser + ".");
        if (!onlineUsers.includes(otherUser))
            socket.emit("battle ready", "user isn't online");
        else if (!Object.keys(data.accounts).includes(otherUser))
            socket.emit("battle ready", "user doesn't exist");
        else if (activeBattles[otherUser])
            socket.emit("battle ready", "user is already battling");
        else if (Object.values(data.accounts[thisUser]?.decks).length == 0)
            socket.emit("battle ready", "you have no decks");
        else if (Object.values(data.accounts[otherUser]?.decks).length == 0)
            socket.emit("battle ready", "user has no decks");
        else {
            console.log(`${thisUser} is requesting a battle with ${otherUser}.`);
            activeBattles[thisUser] = otherUser;
            // the 1 second delay is so that I can quickly switch tabs to the other user (window.confirm doesn't fire if unfocused)
            setTimeout(() => { io.to(otherUser).emit("someone wants to battle you!", thisUser); }, 1000);
        }
    });
    socket.on("cancel battle request", () => {
        console.log(`${thisUser} canceled their request to ${activeBattles[thisUser]}.`);
        activeBattles[thisUser] = undefined;
    });
    socket.on("yeah I want to battle!", (sender) => {
        if (activeBattles[sender] != thisUser)
            return; // guess they canceled or disconnected...
        // ok here we go
        activeBattles[thisUser] = sender;
        socket.emit("battle ready", "ok", sender);
        io.to(sender).emit("battle ready", "ok", thisUser);
    });
    socket.on("disconnect", () => {
        console.log(`Socket ${socket.id} (${thisUser || "<anonymous user>"}) disconnected.`);
        if (thisUser) {
            // todo: actually stop the battle
            if (activeBattles[thisUser]) {
                console.log(`Canceled the battle between ${thisUser} and ${activeBattles[thisUser]} because ${thisUser} disconnected.`);
                activeBattles[activeBattles[thisUser]] = undefined;
                activeBattles[thisUser] = undefined;
            }
            onlineUsers.splice(onlineUsers.indexOf(thisUser), 1);
            io.emit("online users update", onlineUsers);
        }
    });
});
// Start the server!
let PORT = 3001;
server.listen(PORT, () => {
    console.log(`The server is running on port ${PORT}.`);
});
