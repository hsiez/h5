export type ReviewText = string | {
  text: string;
  entity:
    | { kind: "location"; name: string; city: string; latitude: number; longitude: number; zoom: number }
    | { kind: "image"; src: string; alt: string; caption: string; width: number; height: number };
};
export type ItemReview = { title: string; about: ReviewText[][]; pros: Array<string | ReviewText[]>; cons: Array<string | ReviewText[]> };

export const ITEM_REVIEWS: Record<string, ItemReview> = {
  Coat: {
    title: "Coverall chore coat",
    about: [
      ["this coat at ", { text: "Kapital", entity: { kind: "location", name: "Kapital Ginza", city: "Tokyo, Japan", latitude: 35.6715, longitude: 139.773, zoom: 14.5 } }, " on the last day of our Japan trip. It was the last one in stock, and I almost passed because the red was so far outside my usual palette. It has become my favorite piece in my closet—and a reliable conversation starter."],
      ["I proposed to my now-wife on that trip. It’s nice to carry that memory around."],
      ["It also brings a few things to mind: Caravaggio’s ", { text: "Saint Jerome Writing", entity: { kind: "image", src: "/loadout/caravaggio-saint-jerome-writing.png", alt: "Caravaggio's Saint Jerome Writing, with the saint in a red cloak writing beside a skull", caption: "Saint Jerome Writing · Caravaggio", width: 1456, height: 1039 } }, ", Carracci’s ", { text: "Fishing", entity: { kind: "image", src: "/loadout/carracci-fishing.jpeg", alt: "A close-up of the figure in a red coat in Annibale Carracci's Fishing, beside its ornate gold frame", caption: "Fishing · Annibale Carracci, c. 1585–1588", width: 1316, height: 1600 } }, ", and Edward Elric’s red coat. I loved Fullmetal Alchemist: Brotherhood."],
    ],
    pros: ["how soft the wool feels—some of the least scratchy I’ve worn.", "Snap buttons: more elegant than a zipper, quicker than regular buttons.", "Corduroy cuffs feel soft against my hands.", ["My favorite detail is the ", { text: "silk lining", entity: { kind: "image", src: "/loadout/coat-silk-lining.webp", alt: "The red coat opened to show its dark patterned silk lining near the collar", caption: "Coverall chore coat · silk lining", width: 1200, height: 1600 } }, " near the collar."]],
    cons: ["I wear it so often that the red now dictates the rest of my wardrobe."],
  },
  Jeans: {
    title: "Oni Kiraku super wide jeans",
    about: [["these 222-BKOL “Kiraku” super wide jeans in black olive in ", { text: "Ueno", entity: { kind: "location", name: "Ueno", city: "Tokyo, Japan", latitude: 35.71, longitude: 139.776, zoom: 13.5 } }, ". They’re my first pair of selvedge denim."]],
    pros: ["how light and flowy these feel, almost like pajama bottoms. So comfortable.", "The legs are wide, but the fit feels more structured around the hips and waist. I like that support in high-waisted pants.", "The earthy color works with the rest of my closet."],
    cons: ["the light fabric and wide cut make it harder to get the whiskers and stacks I’d hoped to develop."],
  },
  Loafers: {
    title: "Middle English loafers",
    about: [["these loafers while searching for a comfortable leather shoe. My friend John inspired the search—he wears his custom leather shoes everywhere. I’m looking for four things: a wide toe box, an asymmetrical shape, little to no drop, and soft, supple leather."], ["These Aurora loafers came close to what I was looking for."]],
    pros: ["almost everything about them, and Aurora’s customer service has been excellent."],
    cons: ["the toe box isn’t wide enough for me. I’d recommend them to someone with narrower feet, but I’m trading mine for Birkenstock Londons—not as cool-looking, unfortunately."],
  },
  Belt: {
    title: "Arcade braided belt",
    about: [["this belt in a hurry at Active Skate Shop during my sophomore year of college. That was almost ten years ago. It cost about $16."]],
    pros: ["having a functional item I don’t have to think about, at a low price. It has more than earned its keep. The store isn’t even open anymore. Can’t ask for much more."],
    cons: ["[Add what you don’t like here.]"],
  },
  Hat: {
    title: "Prototype cap",
    about: [["this cap as swag from Reforge, a company I worked for. This one is sentimental. I had such a good time there: a great team and plenty of room to grow."]],
    pros: ["that it reminds me work can be enjoyable—and that when it isn’t, I can change my environment. My friend Jarren made the caps, which makes this one even better."],
    cons: ["[Add what you don’t like here.]"],
  },
  Wallet: {
    title: "Slim card wallet",
    about: [["this wallet as a Christmas gift from my wife’s aunt. I don’t usually buy from big designer brands, but I started using it because I appreciated the gesture."]],
    pros: ["that it has done its job and held up well through about eight years in my everyday carry."],
    cons: ["it’s not an S-tier item. [Add what falls short here.]"],
  },
};
