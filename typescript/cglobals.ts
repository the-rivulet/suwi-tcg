/* client globals */

export function gid<T extends HTMLElement = HTMLElement>(x: string) { return document.getElementById(x) as T; }