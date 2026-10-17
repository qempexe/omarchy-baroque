// node tests/test_baroque.js
const fs = require("fs"), path = require("path"), assert = require("assert")
// loads one of the plugin's JavaScript files the way QML would: .pragma and .import
// lines out, the files it imports passed in by name
function load(file, names, deps) {
  const src = fs.readFileSync(path.join(__dirname, "../qml/js", file), "utf8")
    .replace(".pragma library", "").replace(/^\.import .*$/mg, "")
  const depNames = Object.keys(deps || {})
  return new Function(...depNames, src + "; return { " + names.join(", ") + " };")(...depNames.map(k => deps[k]))
}
const Parts = {
  Ends: load("parts/Ends.js", ["list", "byKey", "forms"]),
  Surfaces: load("parts/Surfaces.js", ["list", "byKey"]),
  Lines: load("parts/Lines.js", ["list", "byKey"]),
  Ornaments: load("parts/Ornaments.js", ["list", "byKey"])
}
const S = load("Shapes.js", ["layout", "thicknessFor", "sectionMargin", "edgeGapFor", "mergeSpans", "pillRoom", "pillSpacing", "fitSpacing"], { Ends: Parts.Ends })
let n = 0
function t(name, fn) { fn(); n++; console.log("  ok   " + name) }

const base = { shape: "islands", edgeGap: 6, sideGap: 10, padding: 6, pillGap: 4, radius: 8, ends: "rounded",
               slim: 0, hover: "fill", openMark: "fill", dividers: true, pillFit: false, attach: false,
               regions: "all", separators: "none", mergeGap: 4, centerMin: 0, mirrorSides: false,
               fullExtra: 0, fullInset: 8 }
const view = { length: 1000, thickness: 38, barSize: 26, edgeAtStart: true }
const slots = [
  { a: 16, len: 40, region: "left" }, { a: 56, len: 30, region: "left" },
  { a: 470, len: 60, region: "center" },
  { a: 900, len: 30, region: "right", hovered: true }, { a: 930, len: 54, region: "right", open: true },
  { a: 990, len: 0, region: "right" }              // hidden widget
]
const cfg = o => Object.assign({}, base, o)
const bases = r => r.shapes.filter(s => s.role === "base")

t("window grows for floating shapes only", () => {
  assert.strictEqual(S.thicknessFor(26, cfg({})), 38)
  assert.strictEqual(S.thicknessFor(26, cfg({ shape: "full" })), 26)
})
t("full is the whole window", () => {
  const r = S.layout({ length: 1000, thickness: 26, barSize: 26 }, slots, cfg({ shape: "full" }))
  const b = bases(r)[0]
  assert.deepStrictEqual([b.a, b.len, b.c, b.w, b.r], [0, 1000, 0, 26, 0])
  assert.strictEqual(r.dividers.length, 2)
})
t("one pill, inset from the sides", () => {
  const b = bases(S.layout(view, slots, cfg({ shape: "pill" })))
  assert.strictEqual(b.length, 1)
  assert.deepStrictEqual([b[0].a, b[0].len, b[0].c, b[0].w], [10, 980, 6, 26])
})
t("pill that fits the widgets", () => {
  const b = bases(S.layout(view, slots, cfg({ shape: "pill", pillFit: true })))
  assert.deepStrictEqual([b[0].a, b[0].a + b[0].len], [10, 990])
})
t("three islands", () => {
  const b = bases(S.layout(view, slots, cfg({})))
  assert.deepStrictEqual(b.map(s => [s.a, s.a + s.len]), [[10, 92], [464, 536], [894, 990]])
})
t("islands that touch merge", () => {
  const b = bases(S.layout(view, [{ a: 20, len: 100, region: "left" }, { a: 122, len: 50, region: "center" }], cfg({})))
  assert.strictEqual(b.length, 1)
})
t("a pill per widget, hidden ones skipped", () => {
  const b = bases(S.layout(view, slots, cfg({ shape: "widgets" })))
  assert.strictEqual(b.length, 5)
  // touching widgets: the pills shrink to keep the gap between them
  assert.deepStrictEqual([b[0].a, b[0].len], [16, 38])
})
t("widget pills get room around each widget, more for slanted ends", () => {
  const c = cfg({ shape: "widgets", pillRoom: 4, pillGap: 4, ends: "slant" })
  const room = S.pillRoom(c, 26)
  assert.strictEqual(room, 4 + 3)
  assert.strictEqual(S.pillSpacing(c, 26), 2 * room + 4)
  assert.strictEqual(S.pillSpacing(cfg({ shape: "islands" }), 26), 0)
  assert.strictEqual(S.pillRoom(cfg({ shape: "widgets", pillRoom: 4, ends: "rounded" }), 26), 4)
  // laid out the way the stock bar does once Baroque sets its spacing
  const sp = S.pillSpacing(c, 26)
  const spaced = [{ a: 100, len: 20, region: "left" }, { a: 120 + sp, len: 40, region: "left" }]
  const b = bases(S.layout(view, spaced, c))
  assert.deepStrictEqual([b[0].a, b[0].len], [100 - room, 20 + 2 * room])
  assert.strictEqual(b[1].a - (b[0].a + b[0].len), 4)
  // the hover mark covers the whole pill
  const h = S.layout(view, [Object.assign({}, spaced[0], { hovered: true }), spaced[1]], c).shapes.filter(s => s.role === "hover")[0]
  assert.deepStrictEqual([h.a, h.len], [b[0].a, b[0].len])
  // and the groups move in far enough for the first pill
  assert.ok(S.sectionMargin(c, 8, 26) >= 10 + room)
})
t("hover and open marks", () => {
  const r = S.layout(view, slots, cfg({}))
  assert.strictEqual(r.shapes.filter(s => s.role === "hover").length, 1)
  assert.strictEqual(r.shapes.filter(s => s.role === "open").length, 1)
  const off = S.layout(view, slots, cfg({ hover: "none", openMark: "none" }))
  assert.strictEqual(off.shapes.length, 3)
})
t("round ends", () => {
  assert.strictEqual(bases(S.layout(view, slots, cfg({ ends: "capsule" })))[0].r, 13)
  assert.strictEqual(bases(S.layout(view, slots, cfg({ ends: "square" })))[0].r, 0)
})
t("slimmer shapes stay centered", () => {
  const b = bases(S.layout(view, slots, cfg({ slim: 3 })))
  assert.deepStrictEqual([b[0].c, b[0].w], [9, 20])
})
t("attached shapes reach the screen edge", () => {
  const top = bases(S.layout(view, slots, cfg({ attach: true })))[0]
  assert.deepStrictEqual([top.c, top.w, top.attached], [0, 32, true])
  const bottom = bases(S.layout(Object.assign({}, view, { edgeAtStart: false }), slots, cfg({ attach: true })))[0]
  assert.deepStrictEqual([bottom.c, bottom.w], [6, 32])
})
t("only some groups", () => {
  assert.deepStrictEqual(bases(S.layout(view, slots, cfg({ regions: "sides" }))).map(s => s.region), ["left", "right"])
  assert.deepStrictEqual(bases(S.layout(view, slots, cfg({ regions: "center", shape: "widgets" }))).map(s => s.region), ["center"])
})
t("separators between neighbours of one group", () => {
  const r = S.layout(view, slots, cfg({ separators: "line" }))
  assert.deepStrictEqual(r.separators.map(s => s.a), [56, 930])
  assert.strictEqual(S.layout(view, slots, cfg({ separators: "line", shape: "widgets" })).separators.length, 0)
})
t("shapes are numbered for palette colors", () => {
  assert.deepStrictEqual(bases(S.layout(view, slots, cfg({}))).map(s => s.index), [0, 1, 2])
})
t("taller full width bar and room at its ends", () => {
  assert.strictEqual(S.thicknessFor(26, cfg({ shape: "full", fullExtra: 6 })), 32)
  assert.strictEqual(S.sectionMargin(cfg({ shape: "full", fullInset: 30 }), 8), 30)
})
t("a wider center island, still centered", () => {
  const b = bases(S.layout(view, slots, cfg({ centerMin: 200 })))
  assert.deepStrictEqual([b[1].a, b[1].a + b[1].len], [400, 600])
})
t("left and right the same width", () => {
  const b = bases(S.layout(view, slots, cfg({ mirrorSides: true })))
  assert.strictEqual(b[0].len, b[2].len)
  assert.strictEqual(b[0].a, 10); assert.strictEqual(b[2].a + b[2].len, 990)
})
t("join islands closer than", () => {
  const near = [{ a: 20, len: 100, region: "left" }, { a: 150, len: 50, region: "center" }]
  assert.strictEqual(bases(S.layout(view, near, cfg({ mergeGap: 4 }))).length, 2)
  assert.strictEqual(bases(S.layout(view, near, cfg({ mergeGap: 30 }))).length, 1)
})
t("widget pill spacing never runs the groups into each other", () => {
  const groups = { left: { sum: 300, n: 10 }, center: { sum: 200, n: 4 }, right: { sum: 300, n: 10 } }
  // plenty of room: what was asked
  assert.strictEqual(S.fitSpacing(10, 1920, 16, groups, 4, 10), 10)
  // a crowded bar: less, and the left group still ends before the center starts
  const sp = S.fitSpacing(40, 1100, 16, groups, 4, 10)
  assert.ok(sp >= 0 && sp < 40)
  const leftEnd = 16 + 300 + 9 * sp, centerStart = 550 - (200 + 3 * sp) / 2 - 4
  assert.ok(leftEnd + 10 <= centerStart + 1, leftEnd + " " + centerStart)
  // no room at all: none
  assert.strictEqual(S.fitSpacing(10, 700, 16, groups, 4, 10), 0)
  assert.strictEqual(S.fitSpacing(10, 0, 16, groups, 4, 10), 0)
  assert.strictEqual(S.fitSpacing(10, 1000, 16, { left: { sum: 100, n: 3 } }, 4, 10), 10)
})
t("the Scrolls ornament keeps the widgets clear of its curls, on any end", () => {
  for (const ends of ["rounded", "capsule", "square", "arrow"]) {
    const plain = bases(S.layout(view, slots, cfg({ ends })))[0]
    const curled = bases(S.layout(view, slots, cfg({ ends, ornaments: "scrolls" })))[0]
    assert.ok((curled.a + curled.len) - (plain.a + plain.len) >= 0, ends)
    assert.ok(S.sectionMargin(cfg({ ends, ornaments: "scrolls" }), 8, 26) >= S.sectionMargin(cfg({ ends: "rounded" }), 8, 26) + 16, ends)
    assert.ok(S.pillRoom(cfg({ shape: "widgets", ends, ornaments: "scrolls", pillRoom: 0 }), 26) >= 16, ends)
  }
  const plain = bases(S.layout(view, slots, cfg({ ends: "rounded" })))[0]
  const curled = bases(S.layout(view, slots, cfg({ ends: "rounded", ornaments: "scrolls" })))[0]
  assert.strictEqual((curled.a + curled.len) - (plain.a + plain.len), 16)
})
t("crowns and laurels also keep the widgets clear", () => {
  for (const ornaments of ["crown", "laurels"])
    assert.ok(S.pillRoom(cfg({ shape: "widgets", ends: "rounded", ornaments, pillRoom: 0 }), 26) >= 14, ornaments)
})
t("section margins", () => {
  assert.strictEqual(S.sectionMargin(cfg({ shape: "full" }), 8), 8)
  assert.strictEqual(S.sectionMargin(cfg({}), 8), 16)
  assert.strictEqual(S.sectionMargin(cfg({ shape: "widgets" }), 8), 12)
  assert.strictEqual(S.sectionMargin(cfg({ shape: "widgets", pillRoom: 4 }), 8, 26), 16)
})
t("odd input never throws", () => {
  assert.deepStrictEqual(S.layout(null, slots, cfg({})).shapes, [])
  assert.deepStrictEqual(S.layout(view, null, cfg({})).shapes.length, 0)
  assert.ok(S.layout(view, [{ a: NaN, len: 5 }, null, { a: "3", len: 9 }], cfg({ edgeGap: "x", sideGap: -5 })))
})
// settings
const Util = load("Util.js", ["toText"])
const Schema = load("Schema.js", ["groups", "defaults", "clean", "resolve", "isSetting", "presets", "presetFor", "cleanLook",
                                  "parseLook", "lookOf", "lookKeys", "itemFor", "cleanLookAll"], Object.assign({ Util }, Parts))
t("defaults resolve", () => {
  const c = Schema.resolve({})
  assert.strictEqual(c.shape, "islands"); assert.strictEqual(c.enabled, true); assert.strictEqual(c.edgeGap, 6)
})
t("odd values fall back", () => {
  const c = Schema.resolve({ shape: "blob", edgeGap: "999", radius: {}, enabled: "yes", accentColor: "red", barText: "<b>hi</b>" })
  assert.strictEqual(c.shape, "islands"); assert.strictEqual(c.edgeGap, 24); assert.strictEqual(c.radius, 10)
  assert.strictEqual(c.enabled, true); assert.strictEqual(c.accentColor, "#ff6a1f"); assert.strictEqual(c.barText, "bhi/b")
})
t("only real setting names", () => {
  assert.ok(Schema.isSetting("shape") && Schema.isSetting("customBg") && !Schema.isSetting("__proto__") && !Schema.isSetting("constructor"))
  assert.strictEqual(Schema.clean("toString", 1), undefined)
})
t("every shape setting the drawing reads exists", () => {
  const c = Schema.resolve({})
  for (const k of ["edgeGap", "sideGap", "padding", "pillGap", "pillFit", "slim", "radius", "ends", "hover", "openMark",
                   "dividers", "attach", "regions", "separators", "mergeGap", "centerMin", "mirrorSides", "fullExtra", "fullInset"])
    assert.ok(k in c, k)
})
t("every preset only sets real look keys, with valid values", () => {
  for (const p of Schema.presets) for (const k in p.set) {
    assert.ok(Schema.lookKeys.includes(k), p.key + " " + k)
    assert.deepStrictEqual(Schema.clean(k, p.set[k]), p.set[k], p.key + " " + k)
  }
})
t("saved looks are checked and padded", () => {
  const c = Schema.resolve({ savedLooks: [{ shape: "pill", windowWidth: 900, evil: 1, radius: "7" }, "junk", null] })
  assert.strictEqual(c.savedLooks.length, 20)
  assert.strictEqual(Schema.resolve({}).savedLooks.length, 20)
  assert.strictEqual(Schema.resolve({ savedLooks: new Array(40).fill({ shape: "pill" }) }).savedLooks.length, 20)
  assert.deepStrictEqual(c.savedLooks[0], { shape: "pill", radius: 7 })
  assert.strictEqual(c.savedLooks[1], null)
})
t("import takes only look keys", () => {
  assert.deepStrictEqual(Schema.parseLook('{"shape":"widgets","enabled":false,"barText":"x","__proto__":{"a":1}}'), { shape: "widgets" })
  assert.strictEqual(Schema.parseLook("not json"), null)
  assert.strictEqual(Schema.parseLook("x".repeat(20000)), null)
  assert.strictEqual(Schema.parseLook("{}"), null)
})
t("a look round trips", () => {
  const c = Schema.resolve({ shape: "pill", ends: "arrow" })
  const back = Schema.parseLook(JSON.stringify(Schema.lookOf(c)))
  assert.strictEqual(back.shape, "pill"); assert.strictEqual(back.ends, "arrow"); assert.ok(!("windowWidth" in back))
})
// the painter, against a canvas that only records calls
const Trace = load("Trace.js", ["trace", "walk"])
const Paint = load("Paint.js", ["paint", "endForm"], Object.assign({ Trace }, Parts))
function fakeCtx() {
  const calls = []
  const rec = name => (...a) => { for (const v of a) if (typeof v === "number" && !isFinite(v)) throw new Error(name + " got " + v); calls.push(name) }
  const ctx = { calls, createLinearGradient: () => ({ addColorStop: rec("stop") }), createRadialGradient: (...a) => { rec("radial")(...a); return { addColorStop: rec("stop") } } }
  for (const k of ["reset", "save", "restore", "translate", "transform", "setTransform", "beginPath", "moveTo", "lineTo", "arcTo",
                   "quadraticCurveTo", "closePath", "fill", "stroke", "clip", "fillRect", "arc", "scale", "rotate", "ellipse",
                   "bezierCurveTo", "rect"]) ctx[k] = rec(k)
  return ctx
}
t("painter draws every surface, line, ornament and end, both ways, without bad numbers", () => {
  const LINES = Schema.itemFor("lines").options, ORN = Schema.itemFor("ornaments").options
  let n = 0
  for (const surface of Schema.itemFor("surface").options)
    for (const ends of Schema.itemFor("ends").options)
      for (const edge of ["", "start", "end"])
        for (const vertical of [false, true])
         for (const dir of ["right", "left", "both"]) {
          const ctx = fakeCtx()
          const lines = LINES[n % LINES.length], ornament = ORN[(n >> 2) % ORN.length]; n++
          Paint.paint(ctx, { width: vertical ? 40 : 200, height: vertical ? 200 : 40, margin: 8, vertical, r: 8, ends, edge, dir,
                             concave: true, inner: "end", surface, lines, ornament, fill: "#000", fill2: "#fff", glass: true, line: "#fff",
                             lineWidth: 2, mark: "#f00", markWidth: 2, bracket: 6, shadow: "#000", shadowBlur: 8,
                             shadowShift: 3, flat: edge ? "" : "end", pattern: ["stripes", "dots", "grid", ""][ends.length % 4],
                             patternColor: "#fff", depth: vertical ? "raised" : "sunken", light: "#fff", dark: "#000",
                             cap: "both", capColor: "#f00", second: "#333",
                             lineGrad: dir === "left" ? [] : ["#f00", "#0f0", "#00f"], markGrad: dir === "both" ? ["#fff", "#000"] : [],
                             lineAngle: [0, 45, 90][ends.length % 3], frost: "rgba(255,255,255,0.3)", key: "#000",
                             railSide: ["windows", "edge", "both"][ends.length % 3] })
          if (surface !== "clear") assert.ok(ctx.calls.length > 3, surface + ends)
        }
  // and every line with every ornament
  for (const lines of LINES) for (const ornament of ORN) for (const vertical of [false, true]) {
    const ctx = fakeCtx()
    Paint.paint(ctx, { width: vertical ? 40 : 200, height: vertical ? 200 : 40, margin: 8, vertical, r: 6, ends: "rounded",
                       surface: "clear", lines, ornament, fill: "#000", line: "#fff", lineWidth: 2, mark: "#f00", markWidth: 2,
                       bracket: 6, inner: "end", frameColors: ["#fff", "#888", "#444", "#ccc"], lineGrad: ["#f00", "#00f"],
                       markGrad: ["#fff", "#000"], railSide: "both" })
    if (lines !== "none" || ornament !== "none") assert.ok(ctx.calls.length > 3, lines + " " + ornament)
  }
})
t("ends point the way you ask", () => {
  const P2 = Paint
  assert.deepStrictEqual([P2.endForm("arrow", "L", "right"), P2.endForm("arrow", "R", "right")], ["notch", "point"])
  assert.deepStrictEqual([P2.endForm("arrow", "L", "left"), P2.endForm("arrow", "R", "left")], ["point", "notch"])
  assert.deepStrictEqual([P2.endForm("arrow", "L", "both"), P2.endForm("arrow", "R", "both")], ["point", "point"])
  assert.deepStrictEqual([P2.endForm("slant", "L", "right"), P2.endForm("slant", "R", "right")], ["insetTop", "insetBottom"])
  assert.deepStrictEqual([P2.endForm("slant", "L", "both", "end"), P2.endForm("slant", "R", "both", "end")], ["insetBottom", "insetBottom"])
  assert.deepStrictEqual([P2.endForm("slant", "L", "both", "start"), P2.endForm("slant", "R", "both", "start")], ["insetTop", "insetTop"])
})
t("pointing away from or toward the middle", () => {
  for (const look of Schema.presets) if (look.set.pointing) assert.ok(Schema.itemFor("pointing").options.includes(look.set.pointing))
})
t("theme colors: palette and window border", () => {
  const th = fs.readFileSync(path.join(__dirname, "../qml/js/Theme.js"), "utf8").replace(".pragma library", "")
  const Th = new Function(th + "; return { parsePalette, parseBorder, sample };")()
  assert.deepStrictEqual(Th.parseBorder('local active_border_color = { colors = { "rgba(1ee9d6ee)", "rgba(fe4fb6ee)" }, angle = 45 }\nlocal inactive_border_color = "rgba(356e71aa)"'),
                         { colors: ["#1ee9d6", "#fe4fb6"], angle: 45 })
  assert.deepStrictEqual(Th.parseBorder("col.inactive_border = rgba(595959aa)\ncol.active_border = rgba(33ccffee) rgba(00ff99ee) 45deg"),
                         { colors: ["#33ccff", "#00ff99"], angle: 45 })
  assert.deepStrictEqual(Th.parseBorder("nothing here"), { colors: [], angle: 0 })
  assert.deepStrictEqual(Th.parseBorder(null).colors, [])
  assert.deepStrictEqual(Th.parsePalette('color1 = "#ff0000"\ncolor2 = "#00ff00"\ncolor3 = "javascript:1"\ncolor1 = "#ff0000"'), ["#ff0000", "#00ff00"])
  assert.strictEqual(Th.sample(["#000000", "#ffffff"], 0.5), "#808080")
  assert.strictEqual(Th.sample(["#112233"], 0.9), "#112233")
  assert.strictEqual(Th.sample([], 0.5), "")
})
// the parts catalogs: anyone adding an entry gets told here what is wrong with it
const FLAGS = {
  Ends: { form: "function", label: "string", pointing: "boolean", ears: "boolean", extraMargin: "boolean", room: "object", pad: "object",
          afterFill: "function", onTop: "function", about: "string" },
  Surfaces: { label: "string", about: "string", fill: "number", solid: "boolean", noFill: "boolean", noGradient: "boolean",
              noTexture: "boolean", noDepth: "boolean", leans: "boolean", ownShadow: "boolean",
              base: "function", fillStyle: "function", afterFill: "function", inside: "function", outside: "function" },
  Lines: { label: "string", about: "string", usesColor: "boolean", usesWidth: "boolean", glow: "boolean", draw: "function" },
  Ornaments: { label: "string", about: "string", draw: "function" }
}
const SETTING = { Ends: "ends", Surfaces: "surface", Lines: "lines", Ornaments: "ornaments" }
for (const kind in Parts) t("every entry in parts/" + kind + ".js is well formed and listed in settings", () => {
  const m = Parts[kind], seen = new Set()
  assert.ok(Array.isArray(m.list) && m.list.length > 0, kind + ": list is empty")
  for (const e of m.list) {
    const at = kind + " entry " + JSON.stringify(e.key)
    assert.ok(typeof e.key === "string" && /^[a-z][A-Za-z0-9]*$/.test(e.key), at + ": key should be a short camelCase word")
    assert.ok(!seen.has(e.key), at + ": key used twice"); seen.add(e.key)
    assert.ok(typeof e.label === "string" && e.label.length > 0 && e.label.length <= 14, at + ": label missing or longer than 14")
    for (const f in e) {
      if (f === "key") continue
      assert.ok(f in FLAGS[kind], at + ": unknown field " + f + " (a typo, or a new field the painter does not read)")
      assert.strictEqual(typeof e[f], FLAGS[kind][f], at + ": " + f + " should be a " + FLAGS[kind][f])
    }
    assert.strictEqual(m.byKey[e.key], e, at + ": missing from byKey")
  }
  assert.strictEqual(Object.keys(m.byKey).length, m.list.length, kind + ": byKey has entries that are not in list")
  // the settings tab shows exactly the catalog, in its order
  const it = Schema.itemFor(SETTING[kind])
  assert.deepStrictEqual(it.options, m.list.map(e => e.key), kind + ": settings options differ from the catalog")
  for (const e of m.list) assert.strictEqual(it.labels[e.key], e.label)
})
t("ends: every form names a real outline, and room and padding are sane", () => {
  for (const e of Parts.Ends.list) {
    assert.strictEqual(typeof e.form, "function", e.key + ": needs a form")
    for (const side of ["L", "R"]) for (const dir of ["right", "left", "both"]) for (const inner of ["start", "end"]) {
      const f = e.form(side, dir, inner)
      assert.ok(typeof f === "string" && typeof Parts.Ends.forms[f] === "function", e.key + " " + side + dir + inner + ": no outline called " + f)
    }
    if (e.room) for (const k in e.room) {
      assert.ok(k === "deep" || k === "thick", e.key + ": room takes deep or thick")
      assert.ok(e.room[k] > 0 && e.room[k] < 1, e.key + ": room is a part of the bar, between 0 and 1")
    }
  }
  // an outline is points from the bottom to the top of the left end, with a link
  // (null for a straight line, or a curve) between each two points
  for (const f in Parts.Ends.forms) for (const [rt, rb] of [[8, 8], [0, 8], [8, 0], [0, 0]]) {
    const o = Parts.Ends.forms[f](30, 200, rt, rb)
    assert.ok(o && Array.isArray(o.pts) && Array.isArray(o.links) && o.pts.length >= 2, f + ": should return { pts, links }")
    assert.strictEqual(o.links.length, o.pts.length - 1, f + ": needs one link between each two points")
    for (const pt of o.pts) assert.ok(pt.length === 2 && isFinite(pt[0]) && isFinite(pt[1]), f + ": bad point " + pt)
  }
})
t("surfaces: fill is between 0 and 1, and lines and ornaments say nothing when they are none", () => {
  for (const e of Parts.Surfaces.list) if ("fill" in e) assert.ok(e.fill >= 0 && e.fill <= 1, e.key)
  assert.ok(Parts.Lines.byKey.none && !Parts.Lines.byKey.none.draw, "lines needs a none that draws nothing")
  assert.ok(Parts.Ornaments.byKey.none && !Parts.Ornaments.byKey.none.draw, "ornaments needs a none that draws nothing")
  for (const k of ["Lines", "Ornaments"]) for (const e of Parts[k].list) if (e.key !== "none") assert.ok(e.draw, k + " " + e.key + ": needs draw")
})
t("every look only sets real settings to values they accept", () => {
  assert.strictEqual(Schema.presets.length, 32)
  for (const pr of Schema.presets) for (const k in pr.set) {
    assert.ok(Schema.isSetting(k), pr.key + " " + k)
    assert.deepStrictEqual(Schema.clean(k, pr.set[k]), pr.set[k], pr.key + " " + k)
  }
})
t("every condition names a real setting and real values", () => {
  function check(c, owner) {
    if (c.any) { assert.ok(c.any.length > 0, owner); c.any.forEach(x => check(x, owner)); return }
    const dep = Schema.itemFor(c.key)
    assert.ok(dep, owner + " -> " + c.key)
    const vals = c.is || c.not
    assert.ok(Array.isArray(vals) && vals.length > 0, owner)
    for (const v of vals) {
      if (dep.kind === "bool") assert.ok(v === "true" || v === "false", owner + " " + v)
      else if (dep.options) assert.ok(dep.options.indexOf(v) !== -1, owner + " -> " + c.key + " has no " + v)
    }
  }
  for (const g of Schema.groups) for (const it of g.items) for (const c of (it.when || [])) check(c, it.key)
})
t("settings from before the split come back as a surface, lines and ornaments", () => {
  const m = o => { const c = Schema.resolve(o); return [c.surface, c.lines, c.ornaments] }
  assert.deepStrictEqual(m({ surface: "glow", border: "accent" }), ["filled", "glow", "none"])
  assert.deepStrictEqual(m({ surface: "outline", border: "none" }), ["faint", "solid", "none"])
  assert.deepStrictEqual(m({ surface: "filled", border: "none" }), ["filled", "none", "none"])
  assert.deepStrictEqual(m({ surface: "filled", border: "accent", borderStyle: "double" }), ["filled", "double", "none"])
  assert.deepStrictEqual(m({ surface: "brackets" }), ["clear", "none", "brackets"])
  assert.deepStrictEqual(m({ surface: "filigree", border: "subtle" }), ["filled", "solid", "filigree"])
  assert.deepStrictEqual(m({ surface: "gilded" }), ["filled", "gilded", "none"])
  assert.deepStrictEqual(m({ surface: "underline" }), ["faint", "rail", "none"])
  assert.deepStrictEqual(m({ surface: "none" }), ["clear", "none", "none"])
  assert.deepStrictEqual(m({ surface: "marble", border: "text" }), ["marble", "solid", "none"])
  // Pixel is gone: it comes back as a solid surface
  assert.deepStrictEqual(m({ surface: "pixel", border: "accent" }), ["filled", "solid", "none"])
  assert.strictEqual(Schema.resolve({ surface: "pixel", lines: "neon" }).surface, "filled")
  // the old "none" outline color is gone, so it turns into a real color
  assert.strictEqual(Schema.resolve({ surface: "glow", border: "none" }).border, "accent")
  assert.strictEqual(Schema.resolve({ surface: "filled", border: "none" }).border, "subtle")
  // a line surface with the outline off still had a line, in the accent
  assert.deepStrictEqual(m({ surface: "dashed", border: "none" }), ["faint", "dashed", "none"])
  // once the new keys are there, nothing is changed again
  assert.deepStrictEqual(m({ surface: "velvet", lines: "neon", ornaments: "rosettes" }), ["velvet", "neon", "rosettes"])
  assert.deepStrictEqual(m({ surface: "glow", lines: "dotted" }), ["filled", "dotted", "none"])
  assert.ok(!("borderStyle" in Schema.resolve({ borderStyle: "double" })))
  // saved and imported looks too
  const look = Schema.cleanLook({ surface: "stitched", shape: "pill" })
  assert.deepStrictEqual([look.surface, look.lines, look.shape], ["filled", "stitched", "pill"])
  const imported = Schema.parseLook('{"surface":"studs","__proto__":{"x":1}}')
  assert.deepStrictEqual([imported.surface, imported.ornaments], ["filled", "studs"])
  const g = Schema.resolve({ surface: "gradline", border: "accent" })
  assert.deepStrictEqual([g.surface, g.lines, g.outlineGradient], ["faint", "solid", true])
})
t("painter ignores tiny or broken sizes", () => {
  const ctx = fakeCtx()
  Paint.paint(ctx, { width: 0, height: 10 })
  Paint.paint(ctx, { width: 10, height: 10, margin: 20 })
  Paint.paint(ctx, { width: "x", height: null })
  assert.ok(!ctx.calls.includes("fill"))
})
t("lines that walk round the outline follow every end, every way", () => {
  for (const ends of Schema.itemFor("ends").options) for (const dir of ["right", "left", "both"]) for (const vertical of [false, true]) {
    for (const lines of ["wavy", "sawtooth", "chain", "beads", "mat"]) {
      const ctx = fakeCtx()
      Paint.paint(ctx, { width: vertical ? 40 : 220, height: vertical ? 220 : 40, margin: 8, vertical, r: 8, ends, dir, inner: "end",
                         surface: "filled", lines, ornament: "none", fill: "#000", line: "#fff", lineWidth: 2, mark: "#f00", light: "#fff" })
      assert.ok(ctx.calls.filter(c => c === "stroke" || c === "fill").length > 1, ends + " " + dir + " " + lines + " drew nothing")
    }
  }
  const tri = Trace.trace(c => { c.beginPath(); c.moveTo(0, 0); c.lineTo(10, 0); c.lineTo(10, 10); c.closePath() })
  assert.ok(tri.pts.length === 3 && tri.cw)
  const ring = Trace.trace(c => { c.beginPath(); c.arc(50, 50, 20, 0, Math.PI * 2, false); c.closePath() })
  assert.ok(Math.abs(ring.len - 2 * Math.PI * 20) < 1.5)
})
t("new ends, lines and ornaments are there, and every end has its sentence", () => {
  for (const k of ["plaque", "oval", "stamp"]) assert.ok(Parts.Ends.byKey[k], k)
  for (const k of ["mat", "beads"]) assert.ok(Parts.Lines.byKey[k], k)
  for (const k of ["deco", "crown", "laurels"]) assert.ok(Parts.Ornaments.byKey[k], k)
  for (const e of Parts.Ends.list) assert.ok(typeof e.about === "string" && e.about.length > 10, e.key + " needs an about")
  const endsRow = Schema.itemFor("ends")
  assert.strictEqual(Object.keys(endsRow.abouts).length, Parts.Ends.list.length)
  assert.ok(endsRow.hint.length < 200, "the ends hint is short now: " + endsRow.hint.length)
})
t("old Scroll ends become round ends with the Scrolls ornament", () => {
  assert.ok(!Parts.Ends.byKey.scroll)
  const c = Schema.resolve({ ends: "scroll" })
  assert.strictEqual(c.ends, "capsule"); assert.strictEqual(c.ornaments, "scrolls")
  const kept = Schema.resolve({ ends: "scroll", ornaments: "rosettes" })
  assert.strictEqual(kept.ends, "capsule"); assert.strictEqual(kept.ornaments, "rosettes")
  const look = Schema.parseLook('{"ends":"scroll","surface":"damask"}')
  assert.strictEqual(look.ends, "capsule"); assert.strictEqual(look.ornaments, "scrolls")
  const v = Schema.presetFor("versailles")
  assert.strictEqual(v.set.ends, "capsule"); assert.strictEqual(v.set.ornaments, "scrolls")
})
t("one step undo and the click settings resolve and stay clean", () => {
  const c = Schema.resolve({ undoLook: { shape: "pill", ends: "nope", evil: "<x>" }, lastLook: "classic", rightClick: "x", middleClick: "look" })
  assert.strictEqual(c.undoLook.shape, "pill")
  assert.strictEqual(c.undoLook.ends, Schema.defaults.ends)
  assert.ok(!("evil" in c.undoLook))
  for (const k of Schema.lookKeys) assert.ok(k in c.undoLook, k)
  assert.strictEqual(c.lastLook, "classic")
  assert.strictEqual(c.rightClick, "shape"); assert.strictEqual(c.middleClick, "look")
  assert.strictEqual(Schema.resolve({ undoLook: [1, 2] }).undoLook, null)
  assert.strictEqual(Schema.resolve({}).undoLook, null)
  // undo and the last look never travel with an exported look
  assert.ok(!Schema.lookKeys.includes("undoLook") && !Schema.lookKeys.includes("lastLook"))
})
t("a gradient across the bar really fades", () => {
  const stops = []
  const ctx = fakeCtx()
  ctx.createLinearGradient = () => ({ addColorStop: (o, c) => stops.push([o, c]) })
  Paint.paint(ctx, { width: 200, height: 40, margin: 4, r: 6, ends: "rounded", surface: "filled", lines: "none", ornament: "none",
                     fill: "#000000", fill2: "#ffffff", gradAcross: true })
  const firstFill2 = stops.findIndex(s => s[1] === "#ffffff")
  assert.ok(firstFill2 > 0 && stops[firstFill2 - 1][0] < stops[firstFill2][0], JSON.stringify(stops))
})
console.log("\nALL OK (" + n + ")")
