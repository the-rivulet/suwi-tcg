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
serveStaticFile("assets/style.css");
for (let i of Object.keys(cardIDList)) {
    serveStaticFile(`assets/cards/${i}.png`);
}
let data = { accounts: {} };
let onlineUsers = [];
let loaded = false;
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
    console.log(socket.id + " connected");
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
            socket.emit("login response", "ok", data.accounts[aUsername]);
        }
    });
    socket.on("login done", (username) => {
        thisUser = username;
        onlineUsers.push(username);
        io.emit("online users update", onlineUsers);
    });
    socket.on("logout", (username) => {
        onlineUsers.splice(onlineUsers.indexOf(username), 1);
        io.emit("online users update", onlineUsers);
    });
    socket.on("save deck", (info) => {
        let overwritten = Object.keys(data.accounts[thisUser].decks).includes(info.name);
        // again, assume things are probably ok. overwrite the deck if it exists
        data.accounts[thisUser].decks[info.name] = info;
        // store their deck into the file system
        writeFileSync(join(__dirname, "..", "serverStorage", "accounts.json"), JSON.stringify(data, undefined, 2));
        socket.emit("deck saved", info, overwritten);
    });
    socket.on("disconnect", () => {
        console.log(`${socket.id} (${thisUser || "<anonymous user>"}) disconnected`);
        if (thisUser) {
            onlineUsers.splice(onlineUsers.indexOf(thisUser), 1);
            io.emit("online users update", onlineUsers);
        }
    });
});
// Start the server!
server.listen(3001, () => {
    console.log("running! :3");
});
