/* client globals... and some server globals */

export function gid<T extends HTMLElement = HTMLElement>(x: string) { return document.getElementById(x) as T; }
export function hasBadChar(a: string) { return Array.from(a).find(x => '\\<>'.includes(x)) };

export type DeckInfo = {
  "name": string,
  "cards": Record<string, number> // the IDs and amounts of the cards
}
export type AccountInfo = {
  "username": string,
  "password": string,
  "decks": Record<string, DeckInfo>,
  "collection": Record<string, number>
}
export type DataInfo = {
  "accounts": Record<string, AccountInfo>
}