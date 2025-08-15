import { Socket } from "socket.io-client";
import { gid } from "./cglobals.js";

enum BattleState {
  NotBattling,
  RequestingBattle,
  StartingBattle
}
let currentState = BattleState.NotBattling;
let opponent = "";
let battleSocket: Socket; // so I don't have to pass it around everywhere. technically a waste of memory but who cares it's probably a shallow copy anyway

export function requestBattle(socket: Socket, targetUser: string) {
  if(currentState != BattleState.NotBattling) {
    alert("you cannot request a battle while you are already in one");
    return;
  }
  battleSocket = socket;
  opponent = targetUser;
  / B A T T L E   T I M E !! /
  gid("window-user").style.top = "-100%";
  gid("window-battle").style.top = "0%";
  gid("centertext").textContent = "waiting for opponent... (press [>>] to leave)";
  currentState = BattleState.RequestingBattle;
  socket.emit("request battle", targetUser);
}
gid("pass").onclick = () => {
  if(currentState == BattleState.RequestingBattle) {
    battleSocket.emit("cancel battle request", opponent);
  }
}

export function beginBattle(socket: Socket, targetUser: string) {
  // may not need to provide them again, but whatever ~
  battleSocket = socket;
  opponent = targetUser;
  currentState = BattleState.StartingBattle;
  gid("centertext").textContent = "woah! battling! so cool :3";
}