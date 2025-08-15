/* main client file */

// @ts-expect-error (import jank)
import { io } from "https://cdn.socket.io/4.8.1/socket.io.esm.min.js";
import type { Socket } from "socket.io-client";
import { gid, AccountInfo, DeckInfo, hasBadChar, AccountPublicInfo } from "./cglobals.js";
import { cardByID } from "./clibrary.js";
import { SuwiCollectionCard } from "./cdecks.js";
import { beginBattle, requestBattle } from "./cbattling.js";

// just to have a nice loading screen and make sure the js is workin'
function whenLoaded() {
  gid("window-core").style.opacity = "1";
  gid("noclicky").style.display = "none";
  // run this main loop to keep track of the input fields as the user types
  // might be used for other stuff in the future too
  setInterval(() => {
    let problem = false;
    let uVal = gid<HTMLInputElement>("login-username").value, uInfo = gid("login-userinfo");
    if(uVal.length == 0) {
      uInfo.style.color = "#aaa";
      uInfo.textContent = "enter a new username to create an account";
      problem = true;
    } else if(hasBadChar(uVal)) {
      uInfo.style.color = "red";
      uInfo.textContent = "please don't put " + hasBadChar(uVal) + " in your username";
      problem = true;
    } else if(uVal.length < 4) {
      uInfo.style.color = "red";
      uInfo.textContent = "usernames should have at least 4 characters";
      problem = true;
    } else if(usernames.includes(uVal)) {
      uInfo.style.color = "lime";
      uInfo.textContent = "hi again " + uVal.slice(0, 20) + " :3";
    } else {
      uInfo.style.color = "lime";
      uInfo.textContent = "welcome, " + uVal.slice(0, 20) + "!";
    }
    let pVal = gid<HTMLInputElement>("login-password").value, pInfo = gid("login-passinfo");
    if(pVal != pwdError) pwdError = "";
    if(uVal.length > 0 && pVal.length == 0) {
      pInfo.style.color = "#aaa";
      pInfo.textContent = "you need a password to log in or sign up";
      problem = true;
    } else if(pVal.length == 0) {
      pInfo.style.color = "#aaa";
      pInfo.textContent = "please don't use your real password";
      problem = true;
    } else if(hasBadChar(pVal)) {
      pInfo.style.color = "red";
      pInfo.textContent = "please don't put " + hasBadChar(pVal) + " in your password";
      problem = true;
    } else if(pVal.length < 4) {
      pInfo.style.color = "red";
      pInfo.textContent = "passwords should have at least 4 characters";
      problem = true;
    } else if(pVal == pwdError) {
      pInfo.style.color = "red";
      pInfo.textContent = "incorrect password... sorry about that";
    } else if(usernames.includes(uVal)) {
      pInfo.style.color = "lime";
      pInfo.textContent = "hopefully you still remember it";
    } else if(pVal.startsWith(" ")) {
      pInfo.style.color = "rgb(200, 255, 0)";
      pInfo.textContent = "do you really want it to start with a space?";
    } else if(pVal.endsWith(" ")) {
      pInfo.style.color = "rgb(200, 255, 0)";
      pInfo.textContent = "do you really want it to end with a space?";
    } else {
      pInfo.style.color = "lime";
      pInfo.textContent = "don't use this password for other websites!";
    }
    let btn = gid<HTMLButtonElement>("login-submit");
    btn.disabled = problem;
    btn.textContent = usernames.includes(uVal) ? "log in" : "sign up";

    // also do a similar thing with the save deck window
    let sd = gid<HTMLButtonElement>("savedeck"), sdi = gid("savedeck-info"), dn = gid<HTMLInputElement>("deckname").value, total = Object.keys(elsInDeck).reduce((tot, x) => (elsInDeck[x]?.qty ?? 0) + tot, 0);
    if(total == 0) {
      sdi.style.color = "#aaa";
      sdi.textContent = "needs some cards!";
      problem = true;
    } else if(total < 7) {
      sdi.style.color = "red";
      sdi.textContent = "too small (" + total + "/7)";
      problem = true;
    } else if(hasBadChar(dn)) {
      sdi.style.color = "red";
      sdi.textContent = "can't use " + hasBadChar(dn) + " in name";
      problem = true;
    } else if(Object.keys(elsInDeck).includes("void")) {
      sdi.style.color = "red";
      sdi.textContent = "what is that card?";
      problem = true;
    } else if(Object.keys(activeUser ? activeUser.decks : {}).includes(dn)) {
      sdi.style.color = "lime";
      sdi.textContent = "deck looks ok!";
      problem = false;
    } else {
      sdi.style.color = "lime";
      sdi.textContent = "cool new deck :3";
      problem = false;
    }
    sd.disabled = problem;
    sd.textContent = (Object.keys(activeUser ? activeUser.decks : {}).includes(dn)) ? "save" : "create";

    // ok this one might be bad for performance... check constantly to see whether the import field is okay or not
    problem = false;
    if(gid<HTMLInputElement>("deckimporter").value.length) {
      try {
        let thing = JSON.parse(gid<HTMLInputElement>("deckimporter").value);
        if(typeof thing != "object" || !thing.name || typeof thing.name != "string" || !thing.cards || typeof thing.cards != "object" || Object.values(thing.cards).find((x: any) => typeof x != "number")) problem = true;
      } catch(e) {
        problem = true;
      }
    }
    gid("newdeck").textContent = (gid<HTMLInputElement>("deckimporter").value.length) ? "+ import deck" : "+ create new deck";
    gid<HTMLButtonElement>("newdeck").disabled = problem;
  }, 25); // 40 fps should be enough
}

let onlineUsers: string[] = [];
function updateOnlineUsers(users: string[]) {
  onlineUsers = users;
  gid("onlineusers-list").innerHTML = "";
  for(let i of onlineUsers) {
    let el = document.createElement("div");
    el.classList.add("online-user");
    if(i == activeUser?.username) el.classList.add("online-active");
    el.textContent = i;
    el.onclick = function() {
      socket.emit("request user info", i);
    }
    gid("onlineusers-list").appendChild(el);
  }
}

let socket: Socket = io(), loaded = false;
let usernames: string[] = [], pwdError = "";
let activeUser: AccountInfo;
socket.on("hello", (ready: boolean, unames: string[], onlineUsers: string[]) => {
  if(!ready) {
    alert("oh no! seems like the server isn't ready yet. try reloading in a couple seconds?");
    return;
  }
  usernames = unames;
  updateOnlineUsers(onlineUsers);
  loaded = true;
  whenLoaded(); // yay!
});
socket.on("online users update", (onlineUsers: string[]) => {
  updateOnlineUsers(onlineUsers);
});

gid("login-submit").onclick = function() {
  if(!loaded) return;
  if(gid<HTMLButtonElement>("login-submit").disabled) return;
  // ^^ hopefully that shouldn't be able to happen anyway
  socket.emit("login attempt", gid<HTMLInputElement>("login-username").value, gid<HTMLInputElement>("login-password").value);
}
socket.on("login response", (status: string, user: AccountInfo) => {
  if(status == "ok") {
    gid("prelogin").style.display = "none";
    gid("postlogin").style.display = "block";
    gid<HTMLInputElement>("login-username").value = "";
    gid<HTMLInputElement>("login-password").value = "";
    gid("activeusername").textContent = user.username;
    activeUser = user;
    for(let i in user.decks) {
      let el = document.createElement("div");
      el.classList.add("decklist-item");
      el.textContent = i;
      gid("decklist").appendChild(el);
      el.onclick = () => loadDeckView(user.decks[i]);
    }
    socket.emit("login done", user.username);
  } else if(status == "bad password") {
    pwdError = user.password;
  } else if(status == "already online") {
    alert("you're already signed in elsewhere... log out of that session and try again?");
  }
});

gid("logout").onclick = function() {
  gid("prelogin").style.display = "block";
  gid("postlogin").style.display = "none";
  socket.emit("logout", activeUser);
  activeUser = undefined;
}

let elsInDeck: Record<string, SuwiCollectionCard> = {}, elsInCollection: Record<string, SuwiCollectionCard> = {}; // also used for deck editing
function loadDeckView(deckToImport: DeckInfo = {"name": "new deck", "cards": {}}) {
  // first make sure that I can actually load it!
  let canImport = true;
  for(let i in deckToImport.cards) {
    console.log((activeUser.collection[i] ?? 0) + " " + deckToImport.cards[i]);
    if((activeUser.collection[i] ?? 0) < deckToImport.cards[i]) {
      if(canImport) navigator.clipboard.writeText(JSON.stringify(deckToImport));
      canImport = false;
      let missingCard = new (cardByID(i))().name;
      alert("Not enough " + missingCard + " in your collection! The deck needs " + deckToImport.cards[i] + " but " + (activeUser.collection[i] ? "you only have " + activeUser.collection[i] : "you don't have any") + ". so sad.\nI copied the full decklist to your clipboard, maybe save it somewhere?");
      deckToImport.cards[i] = (activeUser.collection[i] ?? 0);
    }
  }
  gid("window-core").style.top = "-100%";
  gid("window-user").style.top = "-100%";
  gid("window-deckeditor").style.top = "0%";
  gid<HTMLInputElement>("deckname").value = deckToImport.name;
  // put the cards in!
  for(let i of Object.keys(activeUser.collection)) {
    if(activeUser.collection[i] == 0) continue;
    let card = new SuwiCollectionCard(cardByID(i), activeUser.collection[i] - (deckToImport.cards[i] ?? 0));
    let cardEl = card.makeElement();
    gid("in-collection").appendChild(cardEl);
    elsInCollection[card.card.id] = card;
    cardEl.onclick = function() {
      if(card.qty == 0) return; // this shouldn't really happen but whatever
      // Add it to the deck!
      card.qty--;
      card.updateElement();
      if(elsInDeck[card.card.id]) {
        elsInDeck[card.card.id].qty++;
        elsInDeck[card.card.id].updateElement();
      } else {
        let card2 = new SuwiCollectionCard(cardByID(i), 1);
        let cardEl2 = card2.makeElement();
        gid("in-deck").appendChild(cardEl2);
        elsInDeck[card2.card.id] = card2;
        cardEl2.onclick = function() {
          if(card2.qty == 0) return;
          card2.qty--;
          card2.updateElement();
          card.qty++;
          card.updateElement();
          // remove it from the deck if the quantity is now 0
          if(card2.qty == 0) {
            cardEl2.remove();
            elsInDeck[card2.card.id] = undefined;
          }
        }
      }
    }
  }
  // and for the preloaded cards if any...
  for(let i in deckToImport.cards) {
    if(deckToImport.cards[i] == 0) continue;
    let card2 = new SuwiCollectionCard(cardByID(i), deckToImport.cards[i]);
    let cardEl2 = card2.makeElement();
    gid("in-deck").appendChild(cardEl2);
    elsInDeck[card2.card.id] = card2;
    cardEl2.onclick = function() {
      if(card2.qty == 0) return; // this shouldn't really happen but whatever
      card2.qty--;
      card2.updateElement();
      if(elsInCollection[card2.card.id]) {
        elsInCollection[card2.card.id].qty++;
        elsInCollection[card2.card.id].updateElement();
      }
      if(card2.qty == 0) {
        cardEl2.remove();
        elsInDeck[card2.card.id] = undefined;
      }
    }
  }
}
gid("newdeck").onclick = () => {
  if(gid<HTMLInputElement>("deckimporter").value.length) {
    try {
      let thing = JSON.parse(gid<HTMLInputElement>("deckimporter").value);
      if(typeof thing != "object") alert("tried to load something that isn't an object D:");
      else if(!thing.name) alert("deck is missing a name D:");
      else if(typeof thing.name != "string") alert("'name' field isn't a string D:");
      else if(!thing.cards) alert("deck doesn't have any cards D:");
      else if(typeof thing.cards != "object") alert("'cards' field isn't an object D:");
      else if(Object.values(thing.cards).find((x: any) => typeof x != "number")) { alert("expected a number for card quantity, but got " + Object.values(thing.cards).find((x: any) => typeof x != "number")); }
      else loadDeckView(thing);
    } catch(e) {
      alert("error while loading imported deck: " + e);
    }
  }
  else loadDeckView();
}

gid("savedeck").onclick = function() {
  let deckInfo: DeckInfo = {name: gid<HTMLInputElement>("deckname").value, cards: {}};
  for(let i in elsInDeck) { if(elsInDeck[i]) deckInfo.cards[i] = elsInDeck[i].qty; }
  socket.emit("save deck", deckInfo);
};
gid("copydeck").onclick = function() {
  // send it to the clipboard
  let deckInfo: DeckInfo = {name: gid<HTMLInputElement>("deckname").value, cards: {}};
  for(let i in elsInDeck) { if(elsInDeck[i]) deckInfo.cards[i] = elsInDeck[i].qty; }
  let str = JSON.stringify(deckInfo);
  navigator.clipboard.writeText(str).then(() => {
    gid("copydeck-info").style.color = "lime";
    gid("copydeck-info").textContent = "wrote " + (str.length < 1000 ? str.length+" B" : (str.length/1000).toFixed(1)+" kB");
  }, () => {
    gid("copydeck-info").style.color = "red";
    gid("copydeck-info").textContent = "export failed...";
  });
};
gid("discarddeck").onclick = function() {
  gid("window-core").style.top = "0%";
  gid("window-deckeditor").style.top = "-100%";
  gid("in-deck").innerHTML = "";
  gid("in-collection").innerHTML = "";
  elsInDeck = {};
  elsInCollection = {};
};
socket.on("deck saved", (info: DeckInfo, overwritten: boolean) => {
  gid("window-core").style.top = "0%";
  gid("window-deckeditor").style.top = "-100%";
  gid("in-deck").innerHTML = "";
  gid("in-collection").innerHTML = "";
  elsInDeck = {};
  elsInCollection = {};
  if(!overwritten) {
    let el = document.createElement("div");
    el.classList.add("decklist-item");
    el.textContent = info.name;
    gid("decklist").appendChild(el);
    activeUser.decks[info.name] = info;
    el.onclick = () => loadDeckView(activeUser.decks[info.name]);
  }
});

gid("goback").onclick = () => {
  gid("window-user").style.top = "-100%";
  gid("window-core").style.top = "0%";
};

socket.on("sent user info", (ok: boolean, info: AccountPublicInfo) => {
  if(!ok) return;
  gid("window-core").style.top = "-100%";
  gid("window-user").style.top = "0%";
  gid("viewed-name").textContent = info.username;
  gid("decklist2").textContent = "";
  for(let i in info.decks) {
    let el = document.createElement("div");
    el.classList.add("decklist-item");
    el.textContent = i;
    gid("decklist2").appendChild(el);
    el.onclick = () => {
      loadDeckView(info.decks[i]);
    }
  }
  gid<HTMLButtonElement>("battle").disabled = (!onlineUsers.includes(info.username) || info.username == activeUser?.username || Object.values(activeUser?.decks).length == 0 || Object.values(info.decks).length == 0);
  gid<HTMLButtonElement>("battle").onclick = () => {
    requestBattle(socket, info.username);
  };
});
socket.on("someone wants to battle you!", (sender: string) => {
  let response = confirm(sender + " wants to battle you! is that ok?");
  if(response) {
    gid("window-core").style.top = "-100%";
    gid("window-deckeditor").style.top = "-100%";
    gid("window-user").style.top = "-100%";
    gid("window-battle").style.top = "0%";
    socket.emit("yeah I want to battle!", sender);
  }
});
socket.on("battle ready", (status: string, opponent?: string) => {
  if(status == "ok") {
    beginBattle(socket, opponent);
  } else {
    gid("window-battle").style.top = "-100%";
    gid("window-core").style.top = "0%";
    alert("problem while requesting battle: " + status);
  }
});