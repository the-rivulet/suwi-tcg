/* card library */
import { SuwiCard, SuwiType } from "./cdecks.js";
export let cardIDList = {};
export function cardByID(id) {
    // fall back on creating a void card if I can't find it
    // @ts-expect-error (This should never actually return SuwiCard itself.)
    return cardIDList[id] ?? VoidCard;
}
export class VoidCard extends SuwiCard {
    id = "void";
    name = "Unidentified Card";
    type = SuwiType.Instant;
}
export class BasicUnicorn1Card extends SuwiCard {
    id = "basicUnicorn1";
    name = "Nova";
    type = SuwiType.BasicSoki;
}
export class BasicUnicorn2Card extends SuwiCard {
    id = "basicUnicorn2";
    name = "Azalea";
    type = SuwiType.BasicSoki;
}
// add em to the list
for (let I of [VoidCard, BasicUnicorn1Card, BasicUnicorn2Card]) {
    cardIDList[new I().id] = I;
}
