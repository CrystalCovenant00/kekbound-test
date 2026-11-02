// Avatar base riders. All bases share ONE canvas, pose and silhouette (docs/AVATARS.md, decision #38).
// seat = the point that rests on the bot's rider.seat (underside of the shorts), in avatar-canvas px.
// seatedHeight = seat y minus the top of the head, used to scale to the bot's rider.height.
window.AVATAR_DATA = {
  base: "../../assets/avatars/base/",
  canvas: [1254, 1254],
  seat: [560, 905],        // underside of the shorts (legacy full-body seat)
  seatedHeight: 820,
  // Waist-up riding (decision #39): the avatar's WAIST sits on the bot's rider.seat; nothing below clipY is ever drawn.
  anchor: [560, 810],
  clipY: 826,
  bases: {
    human_m: { gender: "male", label: "Human (M)",     img: "human_m.png" },
    human_f: { gender: "female", label: "Human (F)",     img: "human_f.png" },
    frog_m:  { gender: "male", label: "Frog-folk (M)", img: "frog_m.png" },
    frog_f:  { gender: "female", label: "Frog-folk (F)", img: "frog_f.png" },
  },
  // Equipment layers: same 1254x1254 canvas as the bases, so any item stacks on any base (decision #38).
  // Paths are relative to itemsBase. Draw order: base -> body -> head.
  itemsBase: "../../assets/avatars/items/",
  items: {
    body: { o1: { label: "Adventurer tunic", img: "body/o1-adventurer-tunic.png", gender: "any" } },
    head: { h1: { label: "Short hair", img: "head/h1-short-hair.png", gender: "any" },
            h2: { label: "Long hair",  img: "head/h2-long-hair.png",  gender: "any" } },
  },
};
