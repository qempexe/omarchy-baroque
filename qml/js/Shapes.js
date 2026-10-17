.pragma library
.import "parts/Ends.js" as Ends

// Where Baroque draws its shapes. Plain functions, no QML, so they can be tested.
//
// Everything is measured along the bar ("a", "len") and across it ("c", "w"),
// so the same code works for a bar at the top, the bottom or either side.
//
//   view:  { length, thickness, barSize, edgeAtStart }
//          edgeAtStart: the screen edge is at c = 0 (top and left bars)
//   slots: [{ a, len, region, hovered, open }]   every visible widget
//   cfg:   the resolved settings (see Schema.js)
//
// layout() returns
//   shapes:     { a, len, c, w, r, role, region, index, attached }
//               role "base" (the background), "hover" or "open"
//   dividers:   thin lines between the left, center and right groups
//   separators: small marks between two widgets of the same group

var SHAPES = ["full", "pill", "islands", "widgets"];

function clamp(n, lo, hi) {
    if (typeof n !== "number" || !isFinite(n)) return lo;
    return Math.max(lo, Math.min(hi, n));
}

function floating(cfg) { return !!cfg && cfg.shape !== "full"; }

// how much bigger the window gets so floating shapes have room around them
function edgeGapFor(cfg) {
    if (!floating(cfg)) return 0;
    return clamp(cfg.edgeGap, 0, 30);
}

// the window thickness Baroque asks for
function thicknessFor(barSize, cfg) {
    if (cfg && cfg.shape === "full") return barSize + clamp(cfg.fullExtra, 0, 16);
    return barSize + 2 * edgeGapFor(cfg);
}

// how far the left and right widget groups sit from the ends of the bar
// widget pills: how far an end cuts into its pill, for a pill w thick.
// Slants and points cut in by about half their depth at the widget's middle,
// notches and waves a little more
function endRoom(ends, w) {
    var e = Ends.byKey[ends];
    return e && e.room ? share(e.room, w) : 0;
}

// a share of how deep ends go ({ deep: f }) or of the shape's thickness ({ thick: f })
function share(spec, w) {
    if (spec.thick !== undefined) return Math.round(w * spec.thick);
    return Math.round(Math.min(w * 0.5, 40) * (spec.deep || 0));
}

// extra room inside islands and pills that some ends ask for
function endPad(ends, w) {
    var e = Ends.byKey[ends];
    return e && e.pad ? share(e.pad, w) : 0;
}

// ornaments that sit inside each end (Scrolls, Crown, Laurels): the widgets move in
// to clear them, whatever the ends are. A share of the shape's thickness
var ORNAMENT_ROOM = { scrolls: 0.62, crown: 0.72, laurels: 0.55 };
function curlRoom(cfg, w) {
    var k = cfg ? ORNAMENT_ROOM[cfg.ornaments] : undefined;
    return typeof k === "number" ? share({ thick: k }, w) : 0;
}

// widget pills: how far each pill reaches past its widget on both sides, so
// neither its ends nor its outline ever touch what's inside
function pillRoom(cfg, barSize) {
    if (!cfg || cfg.shape !== "widgets") return 0;
    var slim = clamp(cfg.slim, 0, Math.floor(barSize / 2) - 2);
    var w = Math.max(2, barSize - 2 * slim);
    return Math.round(clamp(cfg.pillRoom, 0, 12) + Math.max(endRoom(cfg.ends, w), curlRoom(cfg, w)));
}

// widget pills: the room the stock bar leaves between two widgets, so two
// pills sit exactly "Gap between pills" apart
function pillSpacing(cfg, barSize) {
    if (!cfg || cfg.shape !== "widgets") return 0;
    return 2 * pillRoom(cfg, barSize) + clamp(cfg.pillGap, 0, 12);
}

// widget pills: the widest spacing up to `want` that still leaves the left and
// right groups clear of the center one (and of each other). groups holds the
// summed widget lengths and counts per region; margin is where the end groups
// start; reach is how far a pill sticks out past its widget
function fitSpacing(want, length, margin, groups, reach, minGap) {
    if (!(want > 0) || !(length > 0) || !groups) return 0;
    function g(k) { var v = groups[k]; return v && v.n > 0 ? v : { sum: 0, n: 0 }; }
    var L = g("left"), C = g("center"), R = g("right");
    var best = want;
    // a + b * sp <= c - d * sp
    function cap(a, b, c, d) {
        if (b + d <= 0) return a <= c ? want : -1;
        return Math.floor((c - a) / (b + d));
    }
    if (C.n > 0) {
        var cHalf = C.sum / 2 + reach, cGaps = Math.max(0, C.n - 1) / 2;
        if (L.n > 0) best = Math.min(best, cap(margin + L.sum + reach + minGap, Math.max(0, L.n - 1), length / 2 - cHalf, cGaps));
        if (R.n > 0) best = Math.min(best, cap(margin + R.sum + reach + minGap, Math.max(0, R.n - 1), length / 2 - cHalf, cGaps));
    } else if (L.n > 0 && R.n > 0) {
        best = Math.min(best, cap(2 * margin + L.sum + R.sum + 2 * reach + minGap, Math.max(0, L.n - 1) + Math.max(0, R.n - 1), length, 0));
    }
    return Math.max(0, Math.min(want, best));
}

function sectionMargin(cfg, normal, barSize) {
    if (!cfg) return normal;
    // full width: the stock spacing unless you changed "Room at the ends"
    if (cfg.shape === "full") return cfg.fullInset === 8 || typeof cfg.fullInset !== "number" ? normal : clamp(cfg.fullInset, 0, 200);
    var side = clamp(cfg.sideGap, 0, 200);
    // widget pills reach past their first and last widget
    if (cfg.shape === "widgets") return side + pillRoom(cfg, barSize > 0 ? barSize : 26) + 2;
    var extra = clamp(cfg.padding, 0, 40);
    var thick = barSize > 0 ? barSize : 26;
    extra += Math.max(endPad(cfg.ends, thick), curlRoom(cfg, thick));
    // pointed and slanted ends, and curls, need a little more room
    var e = Ends.byKey[cfg.ends];
    if ((e && e.extraMargin) || curlRoom(cfg, thick) > 0) extra += 6;
    return side + extra;
}

// roundness for a shape that is w thick
function radiusFor(cfg, w) {
    if (cfg.ends === "capsule") return w / 2;
    if (cfg.ends !== "rounded") return 0;
    return Math.min(clamp(cfg.radius, 0, 40), w / 2);
}

// across the bar: where the shapes start and how thick they are.
// attached shapes reach all the way to the screen edge
function across(view, cfg) {
    if (!floating(cfg)) return { c: 0, w: view.thickness };
    var gap = (view.thickness - view.barSize) / 2;
    var slim = clamp(cfg.slim, 0, Math.floor(view.barSize / 2) - 2);
    var c = gap + slim, w = Math.max(2, view.barSize - 2 * slim);
    if (cfg.attach) {
        if (view.edgeAtStart) { w = c + w; c = 0; }
        else w = view.thickness - c;
    }
    return { c: c, w: w };
}

// visible widgets only, in bar order
function usable(slots) {
    var out = [];
    if (!slots) return out;
    for (var i = 0; i < slots.length; i++) {
        var s = slots[i];
        if (s && typeof s.a === "number" && isFinite(s.a) && typeof s.len === "number" && s.len >= 2) out.push(s);
    }
    out.sort(function(x, y) { return x.a - y.a; });
    return out;
}

function regionOf(s) {
    return s.region === "left" || s.region === "right" ? s.region : "center";
}

// which groups get a shape: all of them, only the two ends, or only the middle
function wanted(cfg, region) {
    if (cfg.regions === "sides") return region !== "center";
    if (cfg.regions === "center") return region === "center";
    return true;
}

// the start and end of each region: { left: {a, b}, center: ..., right: ... }
function regions(slots) {
    var out = {};
    for (var i = 0; i < slots.length; i++) {
        var s = slots[i];
        var key = regionOf(s);
        var end = s.a + s.len;
        if (!out[key]) out[key] = { a: s.a, b: end };
        else { out[key].a = Math.min(out[key].a, s.a); out[key].b = Math.max(out[key].b, end); }
    }
    return out;
}

// islands that touch or overlap become one (it keeps the first group's name)
function mergeSpans(spans, minGap) {
    spans.sort(function(x, y) { return x.a - y.a; });
    var out = [];
    for (var i = 0; i < spans.length; i++) {
        var last = out.length > 0 ? out[out.length - 1] : null;
        if (last && spans[i].a <= last.b + minGap) {
            last.b = Math.max(last.b, spans[i].b);
            if (spans[i].region === "center") last.region = "center";
        } else out.push({ a: spans[i].a, b: spans[i].b, region: spans[i].region });
    }
    return out;
}

function layout(view, slotsIn, cfg) {
    var result = { shapes: [], dividers: [], separators: [] };
    if (!view || !cfg || !(view.length > 0) || !(view.thickness > 0)) return result;

    var slots = usable(slotsIn);
    var x = across(view, cfg);
    var r = radiusFor(cfg, x.w);
    var side = floating(cfg) ? clamp(cfg.sideGap, 0, view.length / 3) : 0;
    var pad = clamp(cfg.padding, 0, 40) + Math.max(endPad(cfg.ends, x.w), curlRoom(cfg, x.w));
    var lo = side, hi = view.length - side;
    var count = 0;

    function add(a, b, role, region) {
        a = Math.max(lo, a);
        b = Math.min(hi, b);
        if (b - a < 2) return;
        var base = role === "base";
        result.shapes.push({
            a: a, len: b - a, c: base ? x.c : x.c, w: x.w, r: r, role: role,
            region: region, index: base ? count++ : -1, attached: !!cfg.attach && floating(cfg)
        });
    }

    var reg = regions(slots);

    if (cfg.shape === "full") {
        result.shapes.push({ a: 0, len: view.length, c: 0, w: view.thickness, r: 0, role: "base",
                             region: "all", index: count++, attached: false });
    } else if (cfg.shape === "pill") {
        if (cfg.pillFit && slots.length > 0)
            add(slots[0].a - pad, slots[slots.length - 1].a + slots[slots.length - 1].len + pad, "base", "all");
        else add(lo, hi, "base", "all");
    } else if (cfg.shape === "islands") {
        var spans = [];
        var keys = ["left", "center", "right"];
        var box = {};
        for (var k = 0; k < keys.length; k++) {
            var g = reg[keys[k]];
            if (g) box[keys[k]] = { a: g.a - pad, b: g.b + pad, region: keys[k] };
        }
        // a wider center island, still centered on its widgets
        var minC = clamp(cfg.centerMin, 0, view.length);
        if (box.center && box.center.b - box.center.a < minC) {
            var mid = (box.center.a + box.center.b) / 2;
            box.center.a = mid - minC / 2; box.center.b = mid + minC / 2;
        }
        // left and right just as wide: each grows toward the middle
        if (cfg.mirrorSides && box.left && box.right) {
            var wide = Math.max(box.left.b - box.left.a, box.right.b - box.right.a);
            box.left.b = box.left.a + wide;
            box.right.a = box.right.b - wide;
        }
        for (var k2 = 0; k2 < keys.length; k2++)
            if (box[keys[k2]] && wanted(cfg, keys[k2])) spans.push(box[keys[k2]]);
        var merged = mergeSpans(spans, clamp(cfg.mergeGap, 0, 60));
        for (var m = 0; m < merged.length; m++) add(merged[m].a, merged[m].b, "base", merged[m].region);
    } else {
        // the stock bar leaves pillSpacing between widgets, so each pill can reach
        // pillRoom past its widget; when it doesn't (yet), pills shrink to keep the gap
        var room = pillRoom(cfg, view.barSize);
        var gap = clamp(cfg.pillGap, 0, 12);
        for (var i = 0; i < slots.length; i++) {
            var rg = regionOf(slots[i]);
            if (!wanted(cfg, rg)) continue;
            var a0 = slots[i].a - room, b0 = slots[i].a + slots[i].len + room;
            if (i > 0) a0 = Math.max(a0, (slots[i - 1].a + slots[i - 1].len + slots[i].a + gap) / 2);
            if (i + 1 < slots.length) b0 = Math.min(b0, (slots[i].a + slots[i].len + slots[i + 1].a - gap) / 2);
            add(a0, b0, "base", rg);
        }
    }

    // hover and open panel marks sit on the widget itself
    // on widget pills they cover the whole pill
    var reach = cfg.shape === "widgets" ? pillRoom(cfg, view.barSize) : -2;
    for (var j = 0; j < slots.length; j++) {
        var s = slots[j];
        var ma = s.a - reach, mb = s.a + s.len + reach;
        if (cfg.shape === "widgets") {
            var g2 = clamp(cfg.pillGap, 0, 12);
            if (j > 0) ma = Math.max(ma, (slots[j - 1].a + slots[j - 1].len + s.a + g2) / 2);
            if (j + 1 < slots.length) mb = Math.min(mb, (s.a + s.len + slots[j + 1].a - g2) / 2);
        }
        if (s.open && cfg.openMark !== "none") add(ma, mb, "open", regionOf(s));
        else if (s.hovered && cfg.hover !== "none") add(ma, mb, "hover", regionOf(s));
    }

    // dividers between the groups, on one long shape only
    var oneLong = cfg.shape === "full" || (cfg.shape === "pill" && !cfg.pillFit);
    if (cfg.dividers && oneLong) {
        var order = [];
        if (reg.left) order.push(reg.left);
        if (reg.center) order.push(reg.center);
        if (reg.right) order.push(reg.right);
        for (var d = 1; d < order.length; d++) {
            var gapStart = order[d - 1].b, gapEnd = order[d].a;
            if (gapEnd - gapStart < 16) continue;
            var dl = Math.round(x.w * 0.5);
            result.dividers.push({ a: Math.round((gapStart + gapEnd) / 2), c: x.c + (x.w - dl) / 2, w: dl });
        }
    }

    // separators between two widgets of the same group (not between pills, they have gaps)
    if (cfg.separators && cfg.separators !== "none" && cfg.shape !== "widgets") {
        var sl = Math.round(x.w * 0.4);
        for (var q = 1; q < slots.length; q++) {
            var prev = slots[q - 1], cur = slots[q];
            if (regionOf(prev) !== regionOf(cur)) continue;
            if (cur.a - (prev.a + prev.len) > 6) continue;     // not neighbours
            result.separators.push({ a: Math.round(cur.a), c: x.c + (x.w - sl) / 2, w: sl });
        }
    }
    return result;
}
