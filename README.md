# ORBIT

**A hypercar with no model file.**

**[Live → orbit-nine-gray.vercel.app](https://orbit-nine-gray.vercel.app/)**

ORBIT is a single-page 3D experience built for the
[3D Websites Hackathon](https://3d-websites-hackathon.devpost.com/). The car you
scroll through does not exist as a `.glb`, `.fbx`, `.obj` or any other asset. It
is generated in your browser, at load, out of four silhouette curves and a page
of maths — and so is the studio it sits in.

Nothing is downloaded to draw it: no geometry, no textures, no HDRI, no
matcaps. The whole car ships as a few kilobytes of arithmetic.

---

## The idea

Every "3D car website" starts the same way: someone buys or downloads a model,
loads it, and lights it. The model is the work; the site is the wrapper.

ORBIT inverts that. The car *is* the code, so the page can do things a loaded
model cannot:

- **Change shape, not just colour.** The body is re-derived from its curves, so
  the same page can hand you the clay study, the wireframe it was lofted from,
  and the finished render — of the same surface, not three exported versions.
- **Weigh nothing.** No asset pipeline, no LFS, no CDN, no licence.
- **Explain itself.** The site's five chapters walk you through how its own
  subject was built, ending with the car driving off in the dark.

## How the body is made

The shell is a **lofted surface**: 264 cross-sections swept along the car's
length, each one a superellipse whose width, roofline, floor and squareness come
from a monotone cubic spline (`src/car/curve.ts`). Four curves do the work:

| Curve | What it controls |
| --- | --- |
| `halfWidth` | plan view — rear haunches, coke-bottle waist, front wings |
| `roof` | the profile from Kamm tail over the cabin down to the nose |
| `floor` | the underbody, splitter lip and diffuser exit |
| `waist` | the height of the widest point, i.e. the shoulder line |

Three more passes turn that tube into something car-shaped:

- **Crown** (`crown`) drops the centre of the upper surface below the fender
  crowns, so the bonnet sits *between* two wings instead of over them. Without
  it a single roofline can only ever give you a pontoon body.
- **Tumblehome** pulls the glasshouse inboard above the shoulder, hardest across
  the cabin — the difference between a car and a bar of soap.
- **Wheel arches** are not modelled. They are subtracted: any point on the lower
  shell is pushed up onto a circle centred on the axle, blended by how far
  outboard it sits and faded towards the ends of the arch so it flows into the
  sill.

Materials are assigned in **parameter space**, not world space — the canopy and
the side intakes are angular bands in `(u, θ)`, so their edges follow the
triangle grid instead of tearing across it. Where a boundary still steps between
quads, a trim tube traced along the true curve covers it, which is also just…
what a window seal is.

## The studio

Also code. Six `Lightformer` rectangles inside a procedural environment map do
all the shading — the long highlight streaks down the flanks are those strips
reflecting in the clearcoat, breaking exactly where the surface breaks. The
backdrop is a two-stop gradient shader on a sphere; the floor is a blurred
reflector. When the lights go out in chapter 05 the studio dims to 22 % and the
car's own blades take over.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in dist/
```

Query parameters, useful for grabbing stills:

- `?view=render|clay|wire` — pin the surface mode
- `?cam=px,py,pz,tx,ty,tz,fov` — pin the camera

## Built with

three.js · react-three-fiber · drei · postprocessing · vite

## Controls

Scroll moves through the five chapters. The configurator offers six paints,
three finishes, three wheel treatments, the clay and blueprint views, and the
lights. Pointer movement parallaxes the camera.
