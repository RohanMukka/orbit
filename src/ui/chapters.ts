export interface Chapter {
  index: string
  label: string
  title: string
  body: string
  note?: string
}

export const CHAPTERS: Chapter[] = [
  {
    index: '01',
    label: 'Reveal',
    title: 'There is no model file.',
    body:
      'ORBIT is a hypercar that exists only while this page is open. No .glb, no .fbx, nothing downloaded — the whole car is generated in your browser the moment you arrive, out of four curves and a page of maths.',
    note: 'Scroll to build it',
  },
  {
    index: '02',
    label: 'Form',
    title: 'Four curves make a car.',
    body:
      'A half-width curve, a roofline, a floor, and a blend that decides how square each cross-section is. Sweep 264 superelliptic sections along those curves and you have a body. The wheel arches are not modelled — they are subtracted, analytically, by pushing the lower shell onto a circle at each axle.',
  },
  {
    index: '03',
    label: 'Light',
    title: 'Light is the only draughtsman.',
    body:
      'Nothing here is a texture. The car is read entirely through reflection: six softboxes drawn in code, streaking down the flanks and breaking exactly where the surface does. Watch the highlight travel — that is the shape telling you about itself.',
  },
  {
    index: '04',
    label: 'Finish',
    title: 'Pick a skin.',
    body:
      'Paint is physical, not decorative: metallic flake in the sheen layer, a clearcoat lobe on top, six factory finishes and three wheel treatments. Change anything — the car was never baked, so nothing has to be re-baked.',
  },
  {
    index: '05',
    label: 'Night',
    title: 'Then take it out.',
    body:
      'Kill the studio, wake the blades, and the same geometry becomes a different car. Headlights, a full-width tail bar, and the road coming at you — all from the file you are already reading.',
  },
]
