// @ts-expect-error
import { io } from "https://cdn.socket.io/4.8.1/socket.io.esm.min.js";
alert("Hello world!");
let socket = io();
socket.on("anon join", (id) => {
    alert("Woah! An wild '" + id + "' appeared!");
});
