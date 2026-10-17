.pragma library
.import "Util.js" as Util
.import "parts/Ends.js" as Ends
.import "parts/Surfaces.js" as Surfaces
.import "parts/Lines.js" as Lines
.import "parts/Ornaments.js" as Ornaments

// Every setting Baroque has. The settings panel builds its rows from `groups`,
// and resolve() at the bottom turns settings.json into a full, checked config.
//
//   kind: enum (pick one), int (number), bool (on/off), string (text), palette (3 colors),
//         presets (buttons that set many things at once), looks (saved looks)
//   control: how an enum is shown: seg (buttons), tiles (little pictures), scheme, chips
//   when: the row is greyed out unless these other settings have these values

// custom color swatches: backgrounds, text colors, accents
var swatches = [
  "#141414", "#1d1510", "#1a1b26", "#282a36", "#2e3440", "#2d353b", "#1f1f28", "#3b2a1f",
  "#e0e0e0", "#eadbc8", "#ffffff", "#c0caf5", "#d8dee9", "#dcd7ba", "#f8f8f2", "#e0def4",
  "#d4a35a", "#c8925a", "#7aa2f7", "#cba6f7", "#a7c080", "#88c0d0", "#fabd2f", "#ff6a1f"
];

var floating = [{ key: "shape", is: ["pill", "islands", "widgets"] }];
var LOOK_SLOTS = 20;
function emptyLooks() { var out = []; for (var i = 0; i < LOOK_SLOTS; i++) out.push(null); return out; }

// ---------- the parts catalogs (parts/*.js) as settings ----------

function keysOf(mod) { var out = []; for (var i = 0; i < mod.list.length; i++) out.push(mod.list[i].key); return out; }
function labelsOf(mod) { var out = {}; for (var i = 0; i < mod.list.length; i++) out[mod.list[i].key] = mod.list[i].label; return out; }
// the keys whose entry has `flag` set to `value`
function keysWith(mod, flag, value) {
    var out = [];
    for (var i = 0; i < mod.list.length; i++) if (mod.list[i][flag] === value) out.push(mod.list[i].key);
    return out;
}
// "A, B and C"
function names(labels) {
    if (labels.length < 2) return labels.join("");
    return labels.slice(0, -1).join(", ") + " and " + labels[labels.length - 1];
}
function labelsFor(mod, keys) { var out = []; for (var i = 0; i < keys.length; i++) out.push(mod.byKey[keys[i]].label); return out; }
// the hint above a row of tiles: a short intro; the picked tile's own sentence is
// added by the row itself (see aboutsOf)
function hintOf(intro, mod) { return intro; }
// each entry's own sentence, by key
function aboutsOf(mod) {
    var out = {};
    for (var i = 0; i < mod.list.length; i++) if (mod.list[i].about) out[mod.list[i].key] = mod.list[i].about;
    return out;
}
var pointingEnds = keysWith(Ends, "pointing", true);
var leaningSurfaces = keysWith(Surfaces, "leans", true);

var groups = [
  {
    title: "Looks",
    items: [
      { key: "enabled", section: "Baroque", label: "Baroque on", kind: "bool", fallback: true,
        hint: "Off gives you the plain stock bar back, with all your settings kept." },
      { key: "preset", section: "Ready made", label: "Start from a look", kind: "presets",
        hint: "Sets the shape, surface, colors and details in one go. Change anything after, it's yours." },
      { key: "savedLooks", section: "Yours", label: "Your looks", kind: "looks", fallback: emptyLooks(),
        hint: "Twenty places to keep the bar as it is now and bring it back later. Save in a free place, or over one you no longer need." }
    ]
  },
  {
    title: "Shape",
    items: [
      { key: "shape", section: "Form", label: "Shape", kind: "enum", fallback: "islands", control: "tiles",
        options: ["full", "pill", "islands", "widgets"],
        labels: { full: "Full width", pill: "One pill", islands: "Islands", widgets: "Widget pills" },
        abouts: { full: "Full width runs edge to edge.", pill: "One pill floats as a single bar.",
                  islands: "Islands gives the left, center and right groups their own shape.",
                  widgets: "Widget pills puts every widget in a capsule of its own." },
        hint: "How the bar is split into shapes." },
      { key: "ends", section: "Form", label: "Ends", kind: "enum", fallback: "rounded", control: "tiles",
        options: keysOf(Ends), labels: labelsOf(Ends), abouts: aboutsOf(Ends),
        hint: "How the ends of every shape look. " + names(labelsFor(Ends, pointingEnds)) + " can point either way, set below.",
        when: floating },
      { key: "pointing", section: "Form", label: "Pointing", kind: "enum", fallback: "right", control: "tiles",
        options: ["right", "left", "both", "outward", "inward"],
        labels: { right: "Right", left: "Left", both: "Both ways", outward: "Outward", inward: "Inward" },
        hint: "Which way " + names(labelsFor(Ends, pointingEnds)).toLowerCase() + " ends point, and where " + names(labelsFor(Surfaces, leaningSurfaces)) + " lean. Outward points the left group left and the right group right, the middle both ways; Inward the opposite. On a side bar, right means down.",
        when: [{ any: [{ key: "ends", is: pointingEnds }, { key: "surface", is: leaningSurfaces }] }] },
      { key: "flatSide", section: "Form", label: "Square corners", kind: "enum", fallback: "none", control: "seg",
        options: ["none", "edge", "windows"],
        labels: { none: "None", edge: "Toward the edge", windows: "Toward the windows" },
        hint: "Keeps the corners on one side square, the other side stays round.",
        when: [{ key: "ends", is: ["rounded", "capsule"] }] },
      { key: "attach", section: "Form", label: "Stick to the screen edge", kind: "bool", fallback: false,
        hint: "The shapes hang from the edge of the screen like tabs instead of floating.", when: floating },
      { key: "concave", section: "Form", label: "Curved where they meet the edge", kind: "bool", fallback: true,
        hint: "Little inward curves where a tab meets the screen edge, so it flows out of it.",
        when: [{ key: "attach", is: ["true"] }] },
      { key: "regions", section: "Form", label: "Shapes behind", kind: "enum", fallback: "all", control: "seg",
        options: ["all", "sides", "center"],
        labels: { all: "Every group", sides: "Left and right", center: "Center only" },
        hint: "Which groups get a shape. The others float on their own.",
        when: [{ key: "shape", is: ["islands", "widgets"] }] },

      { key: "edgeGap", section: "Spacing", label: "Distance from the edge", kind: "int", fallback: 6, min: 0, max: 24, step: 1,
        hint: "Room between the screen edge and the shapes, in pixels. The bar grows by twice this.", when: floating },
      { key: "sideGap", section: "Spacing", label: "Distance from the sides", kind: "int", fallback: 10, min: 0, max: 80, step: 2,
        hint: "How far the shapes stay from the two ends of the bar.", when: floating },
      { key: "padding", section: "Spacing", label: "Room around the widgets", kind: "int", fallback: 6, min: 0, max: 24, step: 1,
        hint: "Extra space between the widgets and the edge of their pill or island.",
        when: [{ key: "shape", is: ["pill", "islands"] }] },
      { key: "pillRoom", section: "Spacing", label: "Room inside pills", kind: "int", fallback: 0, min: 0, max: 12, step: 1,
        hint: "A little space between a widget and the sides of its pill. When the bar is full, pills get less so the groups never run into each other.",
        when: [{ key: "shape", is: ["widgets"] }] },
      { key: "pillGap", section: "Spacing", label: "Gap between pills", kind: "int", fallback: 2, min: 0, max: 12, step: 1,
        hint: "Space between two widget pills.", when: [{ key: "shape", is: ["widgets"] }] },
      { key: "mergeGap", section: "Spacing", label: "Join islands closer than", kind: "int", fallback: 4, min: 0, max: 60, step: 2,
        hint: "Two islands nearer than this become one. 0 only joins islands that touch.",
        when: [{ key: "shape", is: ["islands"] }] },
      { key: "fullExtra", section: "Spacing", label: "Extra height", kind: "int", fallback: 0, min: 0, max: 16, step: 1,
        hint: "Makes a full width bar taller than the stock one, in pixels.", when: [{ key: "shape", is: ["full"] }] },
      { key: "fullInset", section: "Spacing", label: "Room at the ends", kind: "int", fallback: 8, min: 0, max: 80, step: 2,
        hint: "How far the left and right widgets sit from the ends of a full width bar.", when: [{ key: "shape", is: ["full"] }] },
      { key: "slim", section: "Spacing", label: "Slimmer shapes", kind: "int", fallback: 0, min: 0, max: 8, step: 1,
        hint: "Takes this many pixels off both sides of every shape.", when: floating },

      { key: "radius", section: "Size", label: "Roundness", kind: "int", fallback: 10, min: 0, max: 24, step: 2,
        hint: "0 is square, 24 is very round. Used by rounded ends.", when: [{ key: "ends", is: ["rounded"] }] },
      { key: "pillFit", section: "Size", label: "Pill hugs the widgets", kind: "bool", fallback: false,
        hint: "The pill only reaches from the first widget to the last one instead of across the whole bar.",
        when: [{ key: "shape", is: ["pill"] }] },
      { key: "centerMin", section: "Size", label: "Center island at least", kind: "int", fallback: 0, min: 0, max: 600, step: 20,
        hint: "A wider center island, in pixels, even when the widgets in it are small. 0 fits the widgets.",
        when: [{ key: "shape", is: ["islands"] }] },
      { key: "mirrorSides", section: "Size", label: "Left and right the same width", kind: "bool", fallback: false,
        hint: "The left and right islands both take the width of the longer one, for a balanced bar.",
        when: [{ key: "shape", is: ["islands"] }] }
    ]
  },
  {
    title: "Surface",
    items: [
      { key: "surface", section: "Fill", label: "Surface", kind: "enum", fallback: "filled", control: "tiles",
        options: keysOf(Surfaces), labels: labelsOf(Surfaces), abouts: aboutsOf(Surfaces),
        hint: hintOf("What the inside of every shape is made of.", Surfaces) },
      { key: "fill", section: "Fill", label: "Fill", kind: "enum", fallback: "solid", control: "seg",
        options: ["solid", "gradient", "glass"],
        labels: { solid: "Solid", gradient: "Gradient", glass: "Glass" },
        hint: "Gradient fades into a second color. Glass is see-through with a bright edge.",
        when: [{ key: "surface", not: keysWith(Surfaces, "noGradient", true) }] },
      { key: "gradientTo", section: "Fill", label: "Gradient into", kind: "enum", fallback: "accent", control: "seg",
        options: ["accent", "palette", "border", "lighter", "darker"],
        labels: { accent: "Accent", palette: "Next theme color", border: "Window border", lighter: "Lighter", darker: "Darker" },
        hint: "The color the gradient ends in.", when: [{ key: "fill", is: ["gradient"] }] },
      { key: "gradientAcross", section: "Fill", label: "Gradient across the bar", kind: "bool", fallback: false,
        hint: "Fade from the screen edge toward your windows instead of from one end to the other.",
        when: [{ key: "fill", is: ["gradient"] }] },
      { key: "pattern", section: "Fill", label: "Texture", kind: "enum", fallback: "none", control: "seg",
        options: ["none", "stripes", "dots", "grid"],
        labels: { none: "None", stripes: "Stripes", dots: "Dots", grid: "Grid" },
        hint: "A faint pattern inside every shape.",
        when: [{ key: "surface", not: keysWith(Surfaces, "noTexture", true) }] },
      { key: "depth", section: "Fill", label: "Depth", kind: "enum", fallback: "flat", control: "seg",
        options: ["flat", "raised", "sunken"],
        labels: { flat: "Flat", raised: "Raised", sunken: "Sunken" },
        hint: "A light and a dark edge inside the shape, so it looks pressed out or in.",
        when: [{ key: "surface", not: keysWith(Surfaces, "noDepth", true) }] },
      { key: "barOpacity", section: "Fill", label: "Opacity", kind: "int", fallback: 100, min: 0, max: 100, step: 5,
        hint: "How solid the shapes are." },
      { key: "barTint", section: "Fill", label: "Accent tint", kind: "int", fallback: 0, min: 0, max: 40, step: 2,
        hint: "How much of the accent color washes over the shapes." },

      { key: "shadow", section: "Shadow", label: "Shadow", kind: "enum", fallback: "soft", control: "seg",
        options: ["none", "soft", "strong"],
        labels: { none: "None", soft: "Soft", strong: "Strong" },
        hint: "A shadow around floating shapes. It needs a bit of distance from the edge to show.", when: floating },
      { key: "shadowColor", section: "Shadow", label: "Shadow color", kind: "enum", fallback: "dark", control: "seg",
        options: ["dark", "accent"],
        labels: { dark: "Dark", accent: "Accent glow" },
        hint: "Accent turns the shadow into a glow.", when: [{ key: "shadow", is: ["soft", "strong"] }] },
      { key: "shadowDir", section: "Shadow", label: "Shadow falls", kind: "enum", fallback: "around", control: "seg",
        options: ["around", "windows"],
        labels: { around: "All around", windows: "Toward the windows" },
        hint: "Toward the windows makes the shapes look like they float above them.", when: [{ key: "shadow", is: ["soft", "strong"] }] }
    ]
  },
  {
    title: "Lines",
    items: [
      { key: "lines", section: "Style", label: "Lines", kind: "enum", fallback: "solid", control: "tiles",
        options: keysOf(Lines), labels: labelsOf(Lines), abouts: aboutsOf(Lines),
        hint: hintOf("The edge of every shape, on top of any surface.", Lines) },
      { key: "border", section: "Color and width", label: "Line color", kind: "enum", fallback: "subtle", control: "seg",
        options: ["subtle", "text", "accent", "border"],
        labels: { subtle: "Subtle", text: "Text color", accent: "Accent", border: "Window border" },
        hint: "Window border draws the lines like your windows' border, with the same gradient and angle.",
        when: [{ key: "lines", not: keysWith(Lines, "usesColor", false) }] },
      { key: "borderWidth", section: "Color and width", label: "Line width", kind: "int", fallback: 1, min: 1, max: 4, step: 1,
        hint: "In pixels. Also the thickness of rails and brackets.",
        when: [{ any: [{ key: "lines", not: keysWith(Lines, "usesWidth", false) }, { key: "ornaments", is: ["brackets"] }] }] },
      { key: "railSide", section: "Color and width", label: "Rail on", kind: "enum", fallback: "windows", control: "seg",
        options: ["windows", "edge", "both"],
        labels: { windows: "The windows side", edge: "The edge side", both: "Both sides" },
        hint: "", when: [{ key: "lines", is: ["rail"] }] },
      { key: "outlineGradient", section: "Fade", label: "Gradient lines", kind: "bool", fallback: false,
        hint: "Fades every line, rail and bracket from its own color into a second one.",
        when: [{ any: [{ key: "lines", not: keysWith(Lines, "usesWidth", false) }, { key: "ornaments", is: ["brackets"] }] }] },
      { key: "outlineGradientTo", section: "Fade", label: "Fade into", kind: "enum", fallback: "lighter", control: "seg",
        options: ["lighter", "accent", "palette", "border"],
        labels: { lighter: "Lighter", accent: "Accent", palette: "Next theme color", border: "Window border" },
        hint: "Window border uses all the colors of your theme's window border.", when: [{ key: "outlineGradient", is: ["true"] }] },
      { key: "outlineGradientDir", section: "Fade", label: "Fade direction", kind: "enum", fallback: "along", control: "seg",
        options: ["along", "diagonal", "across", "theme"],
        labels: { along: "Along the bar", diagonal: "Diagonal", across: "Across", theme: "Like the window border" },
        hint: "Like the window border uses the same angle as your theme's window border.", when: [{ key: "outlineGradient", is: ["true"] }] }
    ]
  },
  {
    title: "Ornaments",
    items: [
      { key: "ornaments", section: "Style", label: "Ornaments", kind: "enum", fallback: "none", control: "tiles",
        options: keysOf(Ornaments), labels: labelsOf(Ornaments), abouts: aboutsOf(Ornaments),
        hint: hintOf("Decoration on top of the surface and the lines, in your accent color.", Ornaments) },
      { key: "bracket", section: "Details", label: "Bracket size", kind: "int", fallback: 7, min: 3, max: 16, step: 1,
        hint: "How long the corner marks are.", when: [{ key: "ornaments", is: ["brackets"] }] },
      { key: "accentCap", section: "Details", label: "Accent cap", kind: "enum", fallback: "none", control: "seg",
        options: ["none", "start", "end", "both"],
        labels: { none: "None", start: "At the start", end: "At the end", both: "Both ends" },
        hint: "A short accent bar at the ends of every shape.", when: floating }
    ]
  },
  {
    title: "Colors",
    items: [
      { key: "colorMode", section: "Scheme", label: "Colors", kind: "enum", fallback: "theme", control: "scheme",
        options: ["theme", "palette", "borders", "custom", "monochrome"],
        labels: { theme: "Follow theme", palette: "Theme palette", borders: "Window borders", custom: "Custom", monochrome: "Monochrome" },
        hint: "Follow theme matches your Omarchy theme live. Theme palette gives every shape its own color from the theme. Window borders takes the colors of your theme's window border, gradient and all, and spreads them along the bar. Custom lets you choose the background, text and accent. Monochrome removes every hue." },
      { key: "customColors", section: "Scheme", label: "Custom colors", kind: "palette",
        fallback: { customBg: "#141414", customFg: "#e0e0e0", accentColor: "#ff6a1f" },
        targets: [{ key: "customBg", label: "Background" }, { key: "customFg", label: "Text" }, { key: "accentColor", label: "Accent" }],
        presets: swatches,
        hint: "Background and accent color the bar shapes. Text colors this panel, and the widgets too when Widget text is set to My text color.",
        when: [{ key: "colorMode", is: ["custom"] }] },
      { key: "paletteUse", section: "Scheme", label: "Palette colors go to", kind: "enum", fallback: "accent", control: "seg",
        options: ["accent", "fill"],
        labels: { accent: "Outlines and marks", fill: "A tint of the fill" },
        hint: "Where each shape's own color shows.", when: [{ key: "colorMode", is: ["palette"] }] },

      { key: "widgetText", section: "Text", label: "Widget text", kind: "enum", fallback: "auto", control: "seg",
        options: ["auto", "theme", "custom"],
        labels: { auto: "Always readable", theme: "Theme", custom: "My text color" },
        hint: "The color of the text and icons in your bar. Always readable keeps your theme's color, and switches to black or white when your shapes are too light or too dark for it. My text color uses the Text color from Custom colors." },
      { key: "centerStyle", section: "Groups", label: "Center group", kind: "enum", fallback: "same", control: "seg",
        options: ["same", "tinted", "accent"],
        labels: { same: "Like the rest", tinted: "Tinted", accent: "Accent outline" },
        hint: "Makes the middle stand out a little.", when: [{ key: "shape", is: ["islands", "widgets"] }] },
      { key: "groupColors", section: "Groups", label: "A color per group", kind: "bool", fallback: false,
        hint: "Give the left, center and right groups an accent of their own, picked below." },
      { key: "groupPalette", section: "Groups", label: "Group colors", kind: "palette",
        fallback: { leftColor: "#7aa2f7", centerColor: "#d4a35a", rightColor: "#a7c080" },
        targets: [{ key: "leftColor", label: "Left" }, { key: "centerColor", label: "Center" }, { key: "rightColor", label: "Right" }],
        presets: swatches,
        hint: "Used for the lines, rails, ornaments and marks of each group.",
        when: [{ key: "groupColors", is: ["true"] }] }
    ]
  },
  {
    title: "Widgets",
    items: [
      { key: "hover", section: "Under the mouse", label: "Mark", kind: "enum", fallback: "fill", control: "seg",
        options: ["fill", "underline", "glow", "none"],
        labels: { fill: "Fill", underline: "Line", glow: "Glow", none: "Nothing" },
        hint: "How the widget under the mouse is marked." },
      { key: "hoverColor", section: "Under the mouse", label: "Color", kind: "enum", fallback: "text", control: "seg",
        options: ["text", "accent"],
        labels: { text: "Text color", accent: "Accent" },
        hint: "", when: [{ key: "hover", is: ["fill", "underline", "glow"] }] },

      { key: "openMark", section: "Open panel", label: "Mark", kind: "enum", fallback: "line", control: "seg",
        options: ["line", "fill", "dot", "glow", "none"],
        labels: { line: "Line", fill: "Fill", dot: "Dot", glow: "Glow", none: "Nothing" },
        hint: "How the widget whose panel is open is marked." },

      { key: "separators", section: "Between widgets", label: "Mark", kind: "enum", fallback: "none", control: "seg",
        options: ["none", "line", "dot", "slash"],
        labels: { none: "Nothing", line: "Line", dot: "Dot", slash: "Slash" },
        hint: "A small mark between two widgets of the same group.",
        when: [{ key: "shape", is: ["full", "pill", "islands"] }] },
      { key: "sepOpacity", section: "Between widgets", label: "Strength", kind: "int", fallback: 30, min: 10, max: 100, step: 5,
        hint: "How visible the marks are.", when: [{ key: "separators", is: ["line", "dot", "slash"] }, { key: "shape", is: ["full", "pill", "islands"] }] },
      { key: "dividers", section: "Between widgets", label: "Between groups", kind: "bool", fallback: false,
        hint: "Thin lines between the left, center and right groups of a full width bar or one pill.",
        when: [{ key: "shape", is: ["full", "pill"] }] },
      { key: "edgeLine", section: "Between widgets", label: "Accent line", kind: "bool", fallback: false,
        hint: "A thin accent line along the side of a full width bar that faces your windows.",
        when: [{ key: "shape", is: ["full"] }] }
    ]
  },
  {
    title: "Motion",
    items: [
      { key: "speed", section: "Movement", label: "Animation speed", kind: "int", fallback: 180, min: 0, max: 600, step: 20,
        hint: "Milliseconds the shapes take to follow the widgets. 0 turns animations off." },
      { key: "easing", section: "Movement", label: "Feel", kind: "enum", fallback: "smooth", control: "seg",
        options: ["smooth", "springy", "linear"],
        labels: { smooth: "Smooth", springy: "Springy", linear: "Linear" },
        hint: "Springy overshoots a little and settles.", when: [{ key: "speed", not: ["0"] }] },
      { key: "idleOpacity", section: "Resting", label: "Fade when not in use", kind: "int", fallback: 100, min: 20, max: 100, step: 5,
        hint: "The shapes fade to this much while the mouse is away from the bar, and come back when it's over it. 100 never fades." },
      { key: "fadeTime", section: "Resting", label: "Fade time", kind: "int", fallback: 300, min: 0, max: 1500, step: 50,
        hint: "Milliseconds the fade takes.", when: [{ key: "idleOpacity", not: ["100"] }] }
    ]
  },
  {
    title: "Screen",
    items: [
      { key: "corners", section: "Corners", label: "Round screen corners", kind: "bool", fallback: false,
        hint: "Rounds the corners of every screen, like a laptop display. Clicks go straight through them." },
      { key: "cornerWhich", section: "Corners", label: "Which corners", kind: "enum", fallback: "all", control: "seg",
        options: ["all", "top", "bottom"],
        labels: { all: "All four", top: "Top two", bottom: "Bottom two" },
        hint: "", when: [{ key: "corners", is: ["true"] }] },
      { key: "cornerSize", section: "Corners", label: "Corner size", kind: "int", fallback: 14, min: 4, max: 40, step: 2,
        hint: "Radius of the corners, in pixels.", when: [{ key: "corners", is: ["true"] }] },
      { key: "cornerColor", section: "Corners", label: "Corner color", kind: "enum", fallback: "black", control: "seg",
        options: ["black", "bar"],
        labels: { black: "Black", bar: "Bar color" },
        hint: "Black looks like the screen bezel. Bar color blends with the bar.",
        when: [{ key: "corners", is: ["true"] }] },

      { key: "screenFrame", section: "Frame", label: "Frame around the screen", kind: "bool", fallback: false,
        hint: "A thin line around the whole screen. Clicks go straight through it." },
      { key: "screenFrameWidth", section: "Frame", label: "Frame width", kind: "int", fallback: 2, min: 1, max: 8, step: 1,
        hint: "In pixels.", when: [{ key: "screenFrame", is: ["true"] }] },
      { key: "screenFrameColor", section: "Frame", label: "Frame color", kind: "enum", fallback: "accent", control: "seg",
        options: ["accent", "border", "bar", "black"],
        labels: { accent: "Accent", border: "Window border", bar: "Bar color", black: "Black" },
        hint: "", when: [{ key: "screenFrame", is: ["true"] }] }
    ]
  },
  {
    title: "Panel",
    items: [
      { key: "barButton", section: "Button", label: "Bar button", kind: "enum", fallback: "icon", control: "seg",
        options: ["icon", "text", "hidden"],
        labels: { icon: "Icon", text: "Text", hidden: "Hidden" },
        hint: "Hidden keeps Baroque working with no button. Open the settings with omarchy-shell io.github.qempexe.baroque settings." },
      { key: "barText", section: "Button", label: "Button text", kind: "string", fallback: "Baroque", maxLength: 12,
        presets: ["Baroque", "Bar", "Look"],
        hint: "Shown when the button shows text.", when: [{ key: "barButton", is: ["text"] }] },
      { key: "rightClick", section: "Button", label: "Right click", kind: "enum", fallback: "shape", control: "seg",
        options: ["shape", "look", "none"], labels: { shape: "Next shape", look: "Next look", none: "Nothing" },
        hint: "Next look goes through the ready made looks, one each click.", when: [{ key: "barButton", not: ["hidden"] }] },
      { key: "middleClick", section: "Button", label: "Middle click", kind: "enum", fallback: "toggle", control: "seg",
        options: ["toggle", "look", "none"], labels: { toggle: "On / off", look: "Next look", none: "Nothing" },
        hint: "On / off switches between Baroque and the stock bar.", when: [{ key: "barButton", not: ["hidden"] }] },

      { key: "openAs", section: "Window", label: "Open as", kind: "enum", fallback: "panel", control: "tiles",
        options: ["panel", "window"],
        labels: { panel: "Bar panel", window: "Own window" },
        hint: "Where the button opens the settings. You can always pop it out or dock it back from the header." },
      { key: "windowWidth", section: "Window", label: "Panel width", kind: "int", fallback: 580, min: 480, max: 1000, step: 20,
        hint: "How wide the panel opens." },
      { key: "windowHeight", section: "Window", label: "Panel height", kind: "int", fallback: 680, min: 460, max: 1000, step: 20,
        hint: "How tall the panel opens." },

      { key: "density", section: "Look", label: "Spacing", kind: "enum", fallback: "comfortable", control: "tiles",
        options: ["compact", "comfortable", "spacious"],
        labels: { compact: "Compact", comfortable: "Comfortable", spacious: "Spacious" },
        hint: "How much air there is between things in this panel." },
      { key: "cornerRadius", section: "Look", label: "Panel roundness", kind: "int", fallback: 6, min: 0, max: 20, step: 2,
        hint: "0 is square, 20 is very round." },
      { key: "frame", section: "Look", label: "Window outline", kind: "bool", fallback: false,
        hint: "Draw the panel edge in color instead of a plain neutral line." },
      { key: "frameGradient", section: "Look", label: "Outline gradient", kind: "bool", fallback: true,
        hint: "When your theme's window border is a gradient, the panel outline runs through all its colors, at the same angle.",
        when: [{ key: "frame", is: ["true"] }] },
      { key: "frameColor", section: "Look", label: "Outline color", kind: "enum", fallback: "accent", control: "seg",
        options: ["accent", "first", "middle", "last"],
        labels: { accent: "Accent", first: "Border's first", middle: "Border's middle", last: "Border's last" },
        hint: "The one color of the outline when it isn't a gradient. The border colors come from your theme's window border, and fall back to the accent when it has none.",
        when: [{ key: "frame", is: ["true"] }] },
      { key: "fontScale", section: "Look", label: "Text size", kind: "int", fallback: 100, min: 80, max: 150, step: 5, divisor: 100, decimals: 2,
        hint: "1 is normal, 1.25 is a quarter bigger." },
      { key: "surfaceTint", section: "Look", label: "Panel tint", kind: "int", fallback: 0, min: 0, max: 30, step: 1,
        hint: "How much of the accent color washes over the panel background." },
      { key: "opacity", section: "Look", label: "Panel opacity", kind: "int", fallback: 96, min: 50, max: 100, step: 2,
        hint: "Background of this panel." }
    ]
  }
];

// Settings kept in the file but never shown: which colors a ready made look brought
// along, so switching looks can hand them back without touching colors you chose;
// the last ready made look (for Next look); and the look before it, for one step undo.
var hiddenItems = [
  { key: "presetColors", kind: "enum", fallback: "", options: ["", "monochrome", "palette", "borders"] },
  { key: "lastLook", kind: "string", fallback: "", maxLength: 16 },
  { key: "undoLook", kind: "undo", fallback: null }
];

// ---------- ready made looks ----------
// Each one sets the look keys it names; everything else is left as it is.

var presets = [
  { key: "classic",  label: "Classic",  set: { shape: "full", surface: "filled", lines: "none", fill: "solid", border: "subtle", edgeLine: false, dividers: false, separators: "none", hover: "fill", openMark: "line", barOpacity: 100, barTint: 0 } },
  { key: "floating", label: "Floating", set: { shape: "pill", pillFit: false, ends: "rounded", radius: 12, attach: false, surface: "filled", lines: "solid", fill: "solid", border: "subtle", shadow: "soft", shadowColor: "dark", edgeGap: 6, sideGap: 12, separators: "none" } },
  { key: "islands",  label: "Islands",  set: { shape: "islands", ends: "rounded", radius: 10, attach: false, surface: "filled", lines: "solid", fill: "solid", border: "subtle", shadow: "soft", shadowColor: "dark", regions: "all", centerStyle: "same", edgeGap: 6, padding: 6 } },
  { key: "capsules", label: "Capsules", set: { shape: "widgets", ends: "capsule", attach: false, surface: "filled", lines: "none", fill: "solid", border: "subtle", shadow: "soft", shadowColor: "dark", pillGap: 2, regions: "all" } },
  { key: "tabs",     label: "Tabs",     set: { shape: "islands", ends: "rounded", radius: 12, attach: true, concave: true, surface: "filled", lines: "none", fill: "solid", border: "subtle", shadow: "none", edgeGap: 4, padding: 8 } },
  { key: "outline",  label: "Outline",  set: { shape: "islands", ends: "rounded", radius: 8, attach: false, surface: "faint", lines: "solid", border: "accent", borderWidth: 1, shadow: "none", fill: "solid", barOpacity: 100 } },
  { key: "rail",     label: "Rail",     set: { shape: "islands", ends: "square", attach: false, surface: "faint", lines: "rail", borderWidth: 2, shadow: "none", fill: "solid", barOpacity: 60 } },
  { key: "brackets", label: "Brackets", set: { shape: "islands", ends: "square", attach: false, surface: "clear", lines: "none", ornaments: "brackets", bracket: 7, borderWidth: 2, shadow: "none" } },
  { key: "neon",     label: "Neon",     set: { shape: "islands", ends: "capsule", attach: false, surface: "filled", lines: "glow", border: "accent", borderWidth: 1, shadow: "strong", shadowColor: "accent", fill: "solid", barOpacity: 70 } },
  { key: "hex",      label: "Hex",      set: { shape: "widgets", ends: "arrow", pointing: "both", attach: false, surface: "filled", lines: "none", fill: "solid", border: "subtle", shadow: "soft", shadowColor: "dark", pillGap: 2 } },
  { key: "ribbon",   label: "Ribbon",   set: { shape: "islands", ends: "ribbon", attach: false, surface: "filled", lines: "none", fill: "solid", border: "subtle", shadow: "soft", shadowColor: "dark", padding: 12 } },
  { key: "cut",      label: "Cut",      set: { shape: "islands", ends: "chamfer", attach: false, surface: "faint", lines: "solid", border: "accent", borderWidth: 1, shadow: "none", depth: "flat" } },
  { key: "leaf",     label: "Leaf",     set: { shape: "widgets", ends: "leaf", pointing: "outward", attach: false, surface: "filled", lines: "none", fill: "solid", border: "subtle", shadow: "soft", shadowColor: "dark", pillGap: 2 } },
  { key: "tickets",  label: "Tickets",  set: { shape: "widgets", ends: "scallop", attach: false, surface: "twotone", lines: "none", fill: "solid", border: "subtle", shadow: "soft", shadowColor: "dark", pillGap: 2 } },
  { key: "tags",     label: "Tags",     set: { shape: "islands", ends: "drop", pointing: "outward", attach: false, surface: "filled", lines: "inset", border: "accent", borderWidth: 1, shadow: "soft", shadowColor: "dark", padding: 10 } },
  { key: "lantern",  label: "Lantern",  set: { shape: "islands", ends: "capsule", attach: false, surface: "underglow", lines: "none", fill: "solid", border: "subtle", shadow: "none" } },
  { key: "aurora",   label: "Aurora",   set: { shape: "islands", ends: "capsule", attach: false, surface: "faint", lines: "solid", border: "border", borderWidth: 2, outlineGradient: true, outlineGradientTo: "border", outlineGradientDir: "theme", colorMode: "borders", fill: "gradient", gradientTo: "border", shadow: "soft", shadowColor: "accent" } },
  { key: "arrows",   label: "Arrows",   set: { shape: "islands", ends: "arrow", pointing: "outward", attach: false, surface: "filled", lines: "none", fill: "solid", border: "subtle", shadow: "soft", shadowColor: "dark", padding: 10, separators: "slash" } },
  { key: "slanted",  label: "Slanted",  set: { shape: "widgets", ends: "slant", pointing: "right", attach: false, surface: "filled", lines: "none", fill: "solid", border: "subtle", shadow: "none", pillGap: 2 } },
  { key: "paper",    label: "Paper",    set: { shape: "islands", ends: "rounded", radius: 14, attach: false, surface: "filled", lines: "none", fill: "solid", border: "subtle", shadow: "soft", shadowColor: "dark", centerStyle: "tinted", barTint: 6 } },
  { key: "glass",    label: "Glass",    set: { shape: "pill", ends: "capsule", attach: false, surface: "filled", lines: "solid", fill: "glass", border: "subtle", shadow: "soft", shadowColor: "dark", barOpacity: 80 } },
  { key: "chrome",   label: "Chrome",   set: { shape: "islands", ends: "capsule", attach: false, surface: "metal", lines: "solid", border: "subtle", borderWidth: 1, shadow: "soft", shadowColor: "dark" } },
  { key: "arcade",   label: "Arcade",   set: { shape: "widgets", ends: "castle", attach: false, surface: "crt", lines: "solid", border: "accent", borderWidth: 1, shadow: "none", pillGap: 2 } },
  { key: "comets",   label: "Comets",   set: { shape: "islands", ends: "slant", pointing: "outward", attach: false, surface: "comet", lines: "none", border: "subtle", shadow: "soft", shadowColor: "dark", padding: 10 } },
  { key: "jigsaw",   label: "Jigsaw",   set: { shape: "widgets", ends: "puzzle", attach: false, surface: "candy", lines: "none", border: "subtle", shadow: "soft", shadowColor: "dark", pillGap: 2 } },
  { key: "baroque",  label: "Baroque",  set: { shape: "islands", ends: "cartouche", attach: false, surface: "filled", lines: "gilded", ornaments: "rosettes", shadow: "strong", shadowColor: "dark", padding: 12 } },
  { key: "rococo",   label: "Rococo",   set: { shape: "widgets", ends: "fleur", attach: false, surface: "filled", lines: "none", ornaments: "filigree", border: "subtle", shadow: "soft", shadowColor: "dark", pillGap: 2 } },
  { key: "versailles", label: "Versailles", set: { shape: "pill", ends: "capsule", ornaments: "scrolls", attach: false, surface: "damask", lines: "solid", border: "subtle", shadow: "soft", shadowColor: "dark" } },
  { key: "opera",    label: "Opera",    set: { shape: "islands", ends: "cartouche", attach: false, surface: "velvet", lines: "solid", ornaments: "diamonds", border: "accent", borderWidth: 1, shadow: "soft", shadowColor: "dark", padding: 10 } },
  { key: "mono",     label: "Mono",     set: { shape: "islands", ends: "square", attach: false, surface: "filled", lines: "solid", border: "text", borderWidth: 1, shadow: "none", colorMode: "monochrome", fill: "solid" } },
  { key: "minimal",  label: "Minimal",  set: { shape: "full", surface: "clear", lines: "none", edgeLine: true, dividers: false, hover: "underline", openMark: "line", separators: "dot" } },
  { key: "rainbow",  label: "Rainbow",  set: { shape: "widgets", ends: "capsule", attach: false, surface: "faint", lines: "solid", border: "accent", colorMode: "palette", paletteUse: "accent", shadow: "none" } }
];

function presetFor(key) {
    for (var i = 0; i < presets.length; i++) if (presets[i].key === key) return presets[i];
    return null;
}

// ---------- defaults and lookups, worked out once from the groups above ----------

// The color picker row saves three keys (customBg, customFg, accentColor)
// instead of its own key, so those get remembered separately.
var colorKeys = {};
var defaults = {};
var itemByKey = {};

for (var g = 0; g < groups.length; g++) {
    var items = groups[g].items;
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        itemByKey[item.key] = item;
        if (item.kind === "presets") continue;          // buttons, nothing saved
        if (item.kind === "palette") {
            for (var t = 0; t < item.targets.length; t++) {
                var colorKey = item.targets[t].key;
                defaults[colorKey] = item.fallback[colorKey];
                colorKeys[colorKey] = item.fallback[colorKey];
            }
        } else {
            defaults[item.key] = item.fallback;
        }
    }
}

// the keys that make up a look: everything in the look groups, not the panel's own
// settings, not on/off and not the saved looks themselves
var lookKeys = [];
var lookGroups = ["Shape", "Surface", "Lines", "Ornaments", "Colors", "Widgets", "Motion", "Screen"];
for (var lg = 0; lg < groups.length; lg++) {
    if (lookGroups.indexOf(groups[lg].title) === -1) continue;
    var its = groups[lg].items;
    for (var li = 0; li < its.length; li++) {
        if (its[li].kind === "palette") {
            for (var lt = 0; lt < its[li].targets.length; lt++) lookKeys.push(its[li].targets[lt].key);
        } else lookKeys.push(its[li].key);
    }
}

for (var h = 0; h < hiddenItems.length; h++) {
    itemByKey[hiddenItems[h].key] = hiddenItems[h];
    defaults[hiddenItems[h].key] = hiddenItems[h].fallback;
}

// every key settings.json can hold (the palette row counts as its three colors)
var settingKeys = [];
for (var name in defaults) settingKeys.push(name);

function isSetting(key) {
    return settingKeys.indexOf(key) !== -1;
}

// the setting for a key, or null. Only real settings count:
// itemByKey["constructor"] is a function, not one of our items
function itemFor(key) {
    var item = itemByKey[key];
    if (item && typeof item === "object" && item.key === key) return item;
    return null;
}

// a number from a number or from text like "12", NaN for anything else
function parseNum(value) {
    if (typeof value === "number") return value;
    if (typeof value === "string" && /^-?[0-9]{1,15}(\.[0-9]+)?$/.test(value)) return parseFloat(value);
    return NaN;
}

// "#abc" or "#aabbcc"
function validHex(s) {
    return typeof s === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s);
}

// Checks one value against its setting. Anything weird gives the default back,
// so a hand-edited settings.json can't break the plugin.
// Unknown keys give undefined.
function clean(key, value) {
    if (typeof colorKeys[key] === "string") {
        if (validHex(value)) return value.toLowerCase();
        return colorKeys[key];
    }
    var item = itemFor(key);
    if (item === null) return undefined;
    if (value === null || value === undefined) return item.fallback;

    if (item.kind === "enum") {
        if (item.options.indexOf(Util.toText(value)) !== -1) return Util.toText(value);
        return item.fallback;
    }

    if (item.kind === "int") {
        var n = parseNum(value);
        if (!isFinite(n)) return item.fallback;
        n = Math.round(n);
        if (n < item.min) return item.min;
        if (n > item.max) return item.max;
        return n;
    }

    if (item.kind === "looks") return cleanLooks(value);
    if (item.kind === "undo") return typeof value === "object" && !Array.isArray(value) ? cleanLookAll(value) : null;

    if (item.kind === "bool") {
        if (value === true || value === "true") return true;
        if (value === false || value === "false") return false;
        return item.fallback;
    }

    // text: no control characters and no < >, so it always shows as plain text,
    // and not longer than allowed
    var text = Util.toText(value).replace(/[\u0000-\u001f\u007f<>]/g, "");
    if (item.maxLength) text = text.slice(0, item.maxLength);
    return text;
}

// Settings and looks from before the surface was split into a surface, lines and
// ornaments: each old surface becomes the three it was made of.
//   old surface -> [surface, lines ("*" = from the old outline), ornament]
var oldSurfaces = {
    filled: ["filled", "*", "none"], outline: ["faint", "*solid", "none"], glow: ["filled", "glow", "none"],
    neon: ["faint", "neon", "none"], underline: ["faint", "rail", "none"], brackets: ["clear", "none", "brackets"],
    studs: ["filled", "*", "studs"], dashed: ["faint", "dashed", "none"], dotted: ["faint", "dotted", "none"],
    stitched: ["filled", "stitched", "none"], inset: ["filled", "inset", "none"], gilded: ["filled", "gilded", "none"],
    filigree: ["filled", "*", "filigree"], glitch: ["filled", "glitch", "none"], shadow: ["shadow", "none", "none"],
    none: ["clear", "none", "none"], gradline: ["faint", "*solid", "none"], pixel: ["filled", "*", "none"]
};
function migrate(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
    // Scroll ends were round ends with the Scrolls ornament's curls: they are that now
    if (obj.ends === "scroll") {
        var sc = {};
        for (var sk in obj) if (sk !== "__proto__") sc[sk] = obj[sk];
        sc.ends = "capsule";
        if (sc.ornaments === undefined || sc.ornaments === "none") sc.ornaments = "scrolls";
        obj = sc;
    }
    var old = typeof obj.surface === "string" && oldSurfaces.hasOwnProperty(obj.surface) ? oldSurfaces[obj.surface] : null;
    var needsLines = obj.lines === undefined && (obj.surface !== undefined || obj.border !== undefined || obj.borderStyle !== undefined);
    if (!old && !needsLines && obj.border !== "none") return obj;
    var out = {};
    for (var k in obj) if (k !== "__proto__" && k !== "borderStyle") out[k] = obj[k];
    var wasNone = obj.border === "none";
    var fromOutline = wasNone ? "none" : (obj.borderStyle === "double" ? "double" : "solid");
    if (old) out.surface = old[0];
    if (needsLines) {
        var l = old ? old[1] : "*";
        // a surface that was a line always had one, in the accent if the outline was off
        if (l === "*solid") l = obj.borderStyle === "double" ? "double" : "solid";
        else if (l === "*") l = fromOutline;
        out.lines = l;
        if (old && old[2] !== "none" && out.ornaments === undefined) out.ornaments = old[2];
        if (obj.surface === "gradline" && out.outlineGradient === undefined) out.outlineGradient = true;
    }
    if (wasNone) out.border = old && old[1] !== "*" ? "accent" : "subtle";
    return out;
}

// Only the look keys of an object, each one checked. Used for saved looks,
// presets and imports, so none of them can carry anything else.
function cleanLook(obj) {
    var out = {};
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return out;
    obj = migrate(obj);
    for (var i = 0; i < lookKeys.length; i++) {
        var k = lookKeys[i];
        var v = obj[k];
        if (v === undefined || typeof v === "function" || (v !== null && typeof v === "object")) continue;
        out[k] = clean(k, v);
    }
    return out;
}

// a look with every key filled in (for the one step undo)
function cleanLookAll(obj) {
    var out = cleanLook(obj);
    for (var i = 0; i < lookKeys.length; i++) if (out[lookKeys[i]] === undefined) out[lookKeys[i]] = clean(lookKeys[i], undefined);
    return out;
}

// The saved looks: always LOOK_SLOTS places, each null or a checked look
function cleanLooks(value) {
    var out = [];
    for (var i = 0; i < LOOK_SLOTS; i++) {
        var v = Array.isArray(value) && i < value.length ? value[i] : null;
        var look = v ? cleanLook(v) : null;
        var any = false;
        for (var k in look) { any = true; break; }
        out.push(any ? look : null);
    }
    return out;
}

// A look written by `export`, read back by `import`. Text only, kept small.
function parseLook(text) {
    if (typeof text !== "string" || text.length === 0 || text.length > 16384) return null;
    var parsed = null;
    try { parsed = JSON.parse(text); } catch (e) { return null; }
    var look = cleanLook(parsed);
    for (var k in look) return look;
    return null;
}

// The current look out of a resolved config
function lookOf(cfg) {
    var out = {};
    for (var i = 0; i < lookKeys.length; i++) out[lookKeys[i]] = cfg[lookKeys[i]];
    return out;
}

// The whole saved file -> every setting, checked, with defaults filled in
function resolve(saved) {
    if (!saved) saved = {};
    saved = migrate(saved);
    var result = {};
    // only our own keys are read from the file
    for (var key in defaults) {
        var value = typeof saved === "object" ? saved[key] : undefined;
        if (typeof value === "function") value = undefined;
        result[key] = clean(key, value);
    }
    return result;
}
