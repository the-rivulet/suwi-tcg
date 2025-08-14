/* decks n stuff */

export enum SuwiType {
  Instant = "instant",
  Downgrade = "downgrade",
  Upgrade = "upgrade",
  Magic = "magic",
  MagicalSoki = "magical unicorn",
  BasicSoki = "basic unicorn",
  BabySoki = "baby unicorn"
}
export function isSoki(type: SuwiType) { return [SuwiType.BabySoki, SuwiType.BasicSoki, SuwiType.MagicalSoki].includes(type); }
export let colorByType: Record<SuwiType, string> = {
  // yeah they're really pastel so what
  [SuwiType.Instant]: "#faa",
  [SuwiType.Downgrade]: "#fca",
  [SuwiType.Upgrade]: "#ffa",
  [SuwiType.Magic]: "#afa",
  [SuwiType.MagicalSoki]: "#aaf",
  [SuwiType.BasicSoki]: "#caf",
  [SuwiType.BabySoki]: "#faf"
}

export abstract class SuwiCard {
  abstract id: string;
  abstract name: string;
  abstract type: SuwiType;
  element: HTMLElement;
  makeElement() {
    if(this.element) this.element.remove();
    this.element = document.createElement("div");
    this.element.classList.add("suwicard");
    let image = document.createElement("img");
    image.src = "assets/cards/" + this.id + ".png";
    image.classList.add("suwiimage");
    this.element.appendChild(image);
    this.element.innerHTML += `<div class="suwititle" style="color: ${colorByType[this.type]}">${this.name}</div>`;
    return this.element;
  }
}

/** Keeps track of a group of SuwiCards in your collection! */
export class SuwiCollectionCard {
  card: SuwiCard;
  qty = 1;
  constructor(card: SuwiCard | (new () => SuwiCard), qty: number) {
    if(typeof card == "function") this.card = new card();
    else this.card = card;
    this.qty = qty;
  }
  makeElement() {
    this.card.makeElement();
    this.updateElement();
    return this.card.element;
  }
  updateElement() {
    Array.from(this.card.element.children).find(x => x.classList.contains("suwititle")).innerHTML = this.card.name + " × " + this.qty;
    if(this.qty == 0) this.card.element.classList.add("unavailable");
    else this.card.element.classList.remove("unavailable");
    return this.card.element;
  }
}