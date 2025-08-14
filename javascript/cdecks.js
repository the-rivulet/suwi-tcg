/* decks n stuff */
export var SuwiType;
(function (SuwiType) {
    SuwiType["Instant"] = "instant";
    SuwiType["Downgrade"] = "downgrade";
    SuwiType["Upgrade"] = "upgrade";
    SuwiType["Magic"] = "magic";
    SuwiType["MagicalSoki"] = "magical unicorn";
    SuwiType["BasicSoki"] = "basic unicorn";
    SuwiType["BabySoki"] = "baby unicorn";
})(SuwiType || (SuwiType = {}));
export function isSoki(type) { return [SuwiType.BabySoki, SuwiType.BasicSoki, SuwiType.MagicalSoki].includes(type); }
export let colorByType = {
    [SuwiType.Instant]: "red",
    [SuwiType.Downgrade]: "orange",
    [SuwiType.Upgrade]: "yellow",
    [SuwiType.Magic]: "lime",
    [SuwiType.MagicalSoki]: "teal",
    [SuwiType.BasicSoki]: "purple",
    [SuwiType.BabySoki]: "magenta"
};
export class SuwiCard {
    element;
    makeElement() {
        if (this.element)
            this.element.remove();
        this.element = document.createElement("div");
        this.element.classList.add("suwicard");
        let image = document.createElement("img");
        image.src = "assets/cards/" + this.id + ".png";
        image.classList.add("suwiimage");
        this.element.appendChild(image);
        this.element.innerHTML += `<div class="suwititle" color="${colorByType[this.type]}">${this.name}</div>`;
        return this.element;
    }
}
/** Keeps track of a group of SuwiCards in your collection! */
export class SuwiCollectionCard {
    card;
    qty = 1;
    constructor(card, qty) {
        if (typeof card == "function")
            this.card = new card();
        else
            this.card = card;
        this.qty = qty;
    }
    makeElement() {
        this.card.makeElement();
        this.updateElement();
        return this.card.element;
    }
    updateElement() {
        Array.from(this.card.element.children).find(x => x.classList.contains("suwititle")).innerHTML = this.card.name + " × " + this.qty;
        if (this.qty == 0)
            this.card.element.classList.add("unavailable");
        else
            this.card.element.classList.remove("unavailable");
        return this.card.element;
    }
}
