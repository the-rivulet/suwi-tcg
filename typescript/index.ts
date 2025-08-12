import express from "express";
import { createServer } from 'node:http';
import { join } from 'node:path';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express(), server = createServer(app), io = new Server(server);
app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "..", "index.html"));
});

// Give the client access to some file, in the `javascript` directory by default
function serveStaticFile(filename: string, folder?: string) {
  app.get("/" + filename, (req, res) => {
    if(folder) res.sendFile(join(__dirname, "..", folder, filename));
    else res.sendFile(join(__dirname, filename));
  });
}
serveStaticFile("client.js");
serveStaticFile("style.css", "assets");

// Handle client stuff (this is the important part)
io.on("connection", socket => {
  console.log(socket.id + " connected");
  socket.broadcast.emit("anon join", socket.id);
  socket.on("disconnect", () => {
    console.log(socket.id + " disconnected");
  });
})

// Start the server!
server.listen(3001, () => {
  console.log("running! :3");
});