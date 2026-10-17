# Adding an end, a surface, a line or an ornament

Every kind of end, surface, line and ornament is one entry in a list, in its own
file:

```
qml/js/parts/
├── Ends.js        the ends of a shape (Rounded, Arrows, Cartouche, ...)
├── Surfaces.js    what the inside is made of (Solid, Marble, Stained glass, ...)
├── Lines.js       the edge (Solid, Double, Rope, ...)
└── Ornaments.js   decoration on top (Studs, Rosettes, Scrolls, ...)
```

Add your entry to the `list` in the right file and that's it. The settings tile,
its picture, the saved value, the hint text and the drawing all come from the
entry. You don't touch the painter, the settings or the panel.

The order of `list` is the order of the tiles. Add new ones at the end unless
there is a good reason to put them somewhere else, so the tiles people know stay
where they are.

## Steps

1. Add the entry (templates below).
2. Run the tests: `node tests/test_baroque.js`. They check every entry: a unique
   key, a label, no unknown or mistyped fields, and that it draws on every side
   of the screen, pointing every way, with no bad numbers.
3. Try it on your bar: copy the plugin to
   `~/.config/omarchy/plugins/io.github.qempexe.baroque`, run
   `omarchy restart shell` and pick your tile in settings. Look at it on a dark
   and a light theme, as a pill, as islands and attached to the screen edge,
   and with the bar on the left or the right.
4. If the README counts the kinds ("Thirty-two", "Lines (22)", "30 × 22 × 18"),
   update the number.

## Rules

- `key` is what gets saved in people's settings. It is one camelCase word and
  never changes once released. A label can change; a key can't.
- `label` is the name on the tile: short, at most 14 characters.
- `about` is one short sentence for the hint under the tiles, like
  `"Rope twists."`. It shows while your tile is the one picked. Every end has one;
  for a line or an ornament leave it out if the label says it all.
- Draw with the colors you are given (below). Don't write colors of your own
  except black or white with some alpha for shine and shade, so the shape follows
  every theme.
- Draw for a horizontal bar only. For a bar on the left or the right the canvas
  is flipped before you draw, so the same code works there.
- Keep it cheap. The shape is drawn again when the bar changes size. No loops
  over every pixel; a few hundred path calls is fine.
- No randomness: use `g.seed` and `g.hash(n)` so the same bar looks the same
  every time it is drawn.
- JavaScript here is plain ES5 (`var`, `function`), no `String()`, `Number()`,
  or `Object.` calls.

## What you are given: `g`

Every drawing hook gets one object, `g`. The shape is drawn along x and across y.

| field | what it is |
| --- | --- |
| `ctx` | the Canvas 2D context |
| `p` | everything the bar passed in (colors, settings), see the top of `Paint.js` |
| `x0`, `x1` | where the shape starts and ends, along |
| `y0`, `y1` | its top and bottom, across |
| `L`, `T` | its length and thickness |
| `r` | the corner radius |
| `vertical` | true when the bar is on the left or the right (already flipped for you) |
| `inner` | `"start"` or `"end"`: the side that faces the windows (`"end"` is the bottom on a top bar) |
| `edge` | `"start"`, `"end"` or `""`: the side that touches the screen edge, when attached |
| `dir` | `"right"`, `"left"` or `"both"`: which way pointing ends point |
| `ends`, `surface`, `lines`, `orn` | the keys that are on |
| `ink` | the accent color, or the line color, or `""` |
| `tone` | `ink`, or a soft white when there is none: safe to always use |
| `seed` | a number that stays the same for the same bar |
| `num(v, fallback)` | `v` if it is a real number, otherwise `fallback` |
| `hash(n)` | a steady pseudo-random number from 0 to 1 for `n` |
| `outline(x, y, l, t, r)` | puts the path of the shape on `ctx` (with the current ends); `fill()`, `stroke()` or `clip()` it |
| `volute(cx, cy, rmax, side, color)` | draws a baroque spiral |
| `texture(kind, color, x, y, l, t)` | stripes, dots or grid over a box |
| `along(inset, step, fn)` | walks all the way round the shape, ends included, `inset` pixels in: `fn(x, y, tx, ty, nx, ny, i, n)` at `n` points about `step` apart, with the way the outline runs and the way inward (Wavy, Chain, Beads) |
| `trace(inset)`, `walkTrace(tr, step, fn)` | the same in two steps, when you need the length first (`tr.len`) |

Lines also get `lw` (the line width, 0 when off), `lwN` (at least 1),
`lineStyle` (the line color, or a gradient when the outline fades), and `side0`,
`side1` (where lines along the long sides start and stop, clear of the ends).

Lines and ornaments get `mw` (the accent thickness) and `markStyle` (the accent
color, or a gradient).

The colors you will want most from `p`:

| | |
| --- | --- |
| `p.fill` | the shape's color (with its opacity) |
| `p.fill2` | the second gradient color, or `""` |
| `p.line` | the line color |
| `p.mark` | the accent |
| `p.light`, `p.dark` | a light and a dark tone that suit the bar |
| `p.second` | the shape's color mixed toward the accent |

If your surface needs a color that isn't there, add it where the bar builds `p`,
in `qml/deco/Decorator.qml` (look for `velvetSheen`: a color made from the
shape's color and the accent), and fall back to doing nothing when it is missing,
the way Velvet does.

## A surface

In `Surfaces.js`. All hooks are optional; an entry with none is a plain fill.

```js
{ key: "linen", label: "Linen", about: "Linen has a fine weave.",
  // details clipped to the shape, drawn after the fill
  inside: function (g) {
      var ctx = g.ctx;
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var x = g.x0; x < g.x1; x += 3) { ctx.moveTo(x, g.y0); ctx.lineTo(x, g.y1); }
      for (var y = g.y0; y < g.y1; y += 3) { ctx.moveTo(g.x0, y); ctx.lineTo(g.x1, y); }
      ctx.stroke();
  } },
```

The hooks, in the order they run:

| hook | when |
| --- | --- |
| `base(g)` | before the fill. May move `g.y0`, `g.T`, `g.y1` (Keycap stands on its side) |
| `fillStyle(g, style)` | returns what the shape is filled with: a color or a gradient (Velvet, Metal) |
| `afterFill(g)` | right after the fill, not clipped |
| `inside(g)` | clipped to the shape |
| `outside(g)` | not clipped, after `inside` |

The flags:

| flag | |
| --- | --- |
| `fill: 0.3` | how much of the fill color shows, 0 to 1 |
| `solid: false` | the shape doesn't hide what's behind it (keeps the bar's text color) |
| `noFill: true` | nothing is filled at all |
| `noGradient: true` | it makes its own shading, so the Fill setting (gradient, glass) is greyed out |
| `noTexture: true` | the Texture setting is greyed out for it |
| `noDepth: true` | the Depth setting is greyed out, and texture and depth are never drawn on it |
| `leans: true` | it follows the Pointing setting |
| `ownShadow: true` | it draws its own shadow on the canvas |

## A line

In `Lines.js`. One hook, `draw(g)`, run after the surface.

```js
{ key: "dashes", label: "Dashes", about: "Dashes run along the long sides.",
  draw: function (g) {
      if (g.lw <= 0) return;
      var ctx = g.ctx;
      ctx.strokeStyle = g.lineStyle;
      ctx.lineWidth = g.lwN;
      ctx.beginPath();
      for (var x = g.side0; x + 6 <= g.side1; x += 10) {
          ctx.moveTo(x, g.y0 + g.lwN / 2); ctx.lineTo(x + 6, g.y0 + g.lwN / 2);
          ctx.moveTo(x, g.y1 - g.lwN / 2); ctx.lineTo(x + 6, g.y1 - g.lwN / 2);
      }
      ctx.stroke();
  } },
```

To follow the whole outline instead, `g.outline(g.x0, g.y0, g.L, g.T, g.r)` then
`ctx.stroke()`. To put something at points all the way round, ends included,
use `g.along(inset, step, fn)`.

The flags:

| flag | |
| --- | --- |
| `usesColor: false` | it draws in the accent, not the line color: the line color setting is greyed out |
| `usesWidth: false` | it ignores the line width: that setting is greyed out |
| `glow: true` | the shape gets a soft glow in the accent when it has no shadow |

## An ornament

In `Ornaments.js`. One hook, `draw(g)`, run last, on top of everything.

```js
{ key: "dots", label: "Dots", about: "Dots sit at both ends.",
  draw: function (g) {
      var ctx = g.ctx, d = Math.max(1.5, g.mw), cy = (g.y0 + g.y1) / 2;
      ctx.fillStyle = g.markStyle || g.tone;
      ctx.beginPath();
      ctx.arc(g.x0 + g.T * 0.5, cy, d, 0, Math.PI * 2);
      ctx.arc(g.x1 - g.T * 0.5, cy, d, 0, Math.PI * 2);
      ctx.fill();
  } },
```

Keep ornaments inside the shape or close to it: the canvas has only
`p.margin` pixels of room around it.

## An end

In `Ends.js`. An end is an outline, written for the LEFT end of the shape and
measured inward from it: `u` is how far into the shape, `v` is 0 at the top and `T`
at the bottom. Points go from the bottom up. The right end is the same outline,
mirrored, so you only write one.

First the outline, in `forms`:

```js
// a step in the middle
step: function (T, L, rt, rb) {
    var s = sizes(T, L).s;
    return { pts: [[s, T], [s, T * 0.65], [0, T * 0.65], [0, T * 0.35], [s, T * 0.35], [s, 0]],
             links: [null, null, null, null, null] };
},
```

`pts` is the list of `[u, v]` points; `links` has one entry between each two
points: `null` for a straight line, `{ arc: [u, v], r: 4 }` for a round corner at
that point, or `{ q: [u, v] }` for a curve pulled toward it. `rt` and `rb` are the
top and bottom corner radius, 0 where the shape is square or touches the screen
edge. `sizes(T, L)` gives the depths most forms use, so a new end matches the
others.

Then the entry, in `list`:

```js
{ key: "step", label: "Step", form: fixed("step"), room: { deep: 0.3 }, extraMargin: true },
```

`form(side, dir, inner)` picks the outline for one end: `fixed("step")` uses the
same one everywhere. An end that points uses `pointing: true` and a form that
picks by side and direction, like Arrows:

```js
form: function (side, dir) { return pointed("point", "notch", side, dir); }
```

The other fields:

| field | |
| --- | --- |
| `room: { deep: 0.3 }` | widget pills reach past their widget by this share of how deep ends go, so the end never cuts into it. Or `{ thick: 0.1 }`, a share of the thickness |
| `extraMargin: true` | the groups move in a little more for it |
| `pad: { thick: 0.6 }` | extra room inside islands and pills, for ends that draw something inside themselves |
| `ears: true` | attached shapes get curved ears where they meet the screen edge (only for ends that are square on the edge side) |
| `afterFill(g)` | extra drawing right after the fill (Folded corner) |
| `onTop(g)` | extra drawing on top of everything |

## Tests

```bash
node tests/test_baroque.js
```

They need nothing but node. If a test names your entry, it tells you what is
wrong with it.
