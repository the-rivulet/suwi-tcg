import express from "express";
import { createServer } from 'node:http';
import { join } from 'node:path';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFile, writeFileSync } from "node:fs";
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
serveStaticFile("assets/style.css");
let data = { accounts: [] };
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
    socket.emit("hello", loaded, data.accounts.map(x => x.username), onlineUsers);
    socket.on("login attempt", (aUsername, aPassword) => {
        // just assume that their info is ok :slugshrug:
        if (data.accounts.map(x => x.username).includes(aUsername)) {
            // old user!
            if (data.accounts.find(x => x.username == aUsername).password == aPassword) {
                socket.emit("login response", true, false, aUsername, aPassword);
            }
            else {
                socket.emit("login response", false, false, aUsername, aPassword);
            }
        }
        else {
            // new user!
            data.accounts.push({ username: aUsername, password: aPassword });
            // write their name into the file system
            writeFileSync(join(__dirname, "..", "serverStorage", "accounts.json"), JSON.stringify(data, undefined, 2));
            socket.emit("login response", true, true, aUsername, aPassword);
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
    socket.on("disconnect", () => {
        console.log(`${socket.id}(${thisUser || "anonymous"}) disconnected`);
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
