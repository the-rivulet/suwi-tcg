/* client globals... and some server globals */
export function gid(x) { return document.getElementById(x); }
export function hasBadChar(a) { return Array.from(a).find(x => '\\<>'.includes(x)); }
;
