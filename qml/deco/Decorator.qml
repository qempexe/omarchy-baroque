import QtQuick
import QtQuick.Effects
import qs.Commons
import "../js/Shapes.js" as Shapes
import "../js/Paint.js" as Paint
import "../js/Theme.js" as Theme
import "../js/parts/Surfaces.js" as Surfaces
import "../js/parts/Lines.js" as Lines

// Draws Baroque's shapes behind the stock bar's widgets, on the bar window this
// widget lives in.
//
// The stock bar has no setting for any of this, so Baroque works from the outside:
//   - the bar window's own background is made clear (Baroque draws its own),
//   - the window gets a little thicker so floating shapes have room around them,
//   - the left and right widget groups move in from the ends to sit inside their shape,
//   - a layer with the shapes is put under the widgets, and follows them as they change.
// Every one of these is undone when Baroque is switched off or taken off the bar.
// If the bar isn't built the way Baroque expects, it touches nothing and reports "lost".
Item {
    id: deco

    property var anchorItem: null       // the Baroque widget, somewhere inside the bar window
    property var bar: null              // the bar handle the shell gives widgets
    property var svc: null
    readonly property var cfg: svc ? svc.cfg : null
    readonly property var ui: svc ? svc.ui : null
    readonly property bool wanted: cfg !== null && cfg.enabled === true

    visible: false

    // ---- the bar window --------------------------------------------------------------

    property var win: null              // the shell's window object
    property var content: null          // its root item, where the widgets live
    property var drawing: null          // our shapes layer, inside `content`
    property bool applied: false        // window color / size / margins are ours right now
    property string attachState: ""     // "ok" | "lost"
    property bool barHidden: false
    property bool inUse: false          // the mouse is on a widget, or a panel is open

    // what the bar handle tells us, with a fallback for each in case a newer shell
    // hands widgets less: the window's own shape and the theme's sizes
    readonly property bool vertical: {
        if (bar && typeof bar.vertical === "boolean") return bar.vertical
        return content ? content.height > content.width : false
    }
    readonly property string position: {
        if (bar && ["top", "bottom", "left", "right"].indexOf(bar.position) !== -1) return bar.position
        try {
            var a = win.anchors
            if (vertical) return a.right && !a.left ? "right" : "left"
            return a.bottom && !a.top ? "bottom" : "top"
        } catch (e) { return vertical ? "left" : "top" }
    }
    readonly property int barSize: {
        if (bar && typeof bar.barSize === "number" && bar.barSize > 0) return bar.barSize
        return vertical ? Style.bar.sizeVertical : Style.bar.sizeHorizontal
    }
    readonly property bool edgeAtStart: position === "top" || position === "left"
    readonly property real normalMargin: Style.space(8)

    function findWindow() {
        var item = deco.anchorItem
        if (!item) return false
        var w = null, c = null
        try {
            if (item.QsWindow) { w = item.QsWindow.window; c = item.QsWindow.contentItem }
        } catch (e) { w = null; c = null }
        if (!w || !c) {
            try { w = item.Window.window; c = item.Window.contentItem } catch (e2) { w = null; c = null }
        }
        deco.win = w
        deco.content = c
        return w !== null && c !== null
    }

    // a bar slot: the stock bar wraps every widget in one of these
    function isSlot(it) {
        return it && typeof it.moduleName === "string" && typeof it.region === "string" && ("activeItem" in it)
    }
    // the left / right groups: loaders that carry a region and a list of entries
    function isSection(it) {
        return it && typeof it.region === "string" && ("entries" in it) && !isSlot(it)
            && (it.region === "left" || it.region === "right")
    }

    // any list of widgets, the center one too
    function isList(it) {
        return it && typeof it.region === "string" && ("entries" in it) && !isSlot(it)
    }

    // walks the window's items once, collecting slots, the two end sections and
    // every list of widgets
    function collect() {
        var out = { slots: [], sections: [], lists: [] }
        if (!deco.content) return out
        var stack = [{ it: deco.content, depth: 0 }]
        var seen = 0
        while (stack.length > 0 && seen < 4000) {
            var top = stack.pop()
            var it = top.it
            seen++
            if (!it || it === deco.drawing) continue
            if (isSlot(it)) { out.slots.push(it); continue }
            if (isSection(it)) out.sections.push(it)
            if (isList(it)) out.lists.push(it)
            if (top.depth > 14) continue
            var kids = it.children
            if (!kids) continue
            for (var i = 0; i < kids.length; i++) stack.push({ it: kids[i], depth: top.depth + 1 })
        }
        return out
    }

    // ---- taking over and giving back ---------------------------------------------------

    function setIfDifferent(obj, key, value) {
        try { if (obj[key] !== value) obj[key] = value } catch (e) { }
    }

    function applyWindow(found) {
        var w = deco.win
        // a hidden bar parks itself one bar size past the edge: keep the window
        // that size then, so no strip of it is left on screen
        var thick = deco.barHidden ? deco.barSize : Shapes.thicknessFor(deco.barSize, deco.cfg)
        try { if (w.color.a !== 0) w.color = "transparent" } catch (e) { }
        if (deco.vertical) setIfDifferent(w, "implicitWidth", thick)
        else setIfDifferent(w, "implicitHeight", thick)

        var m = Shapes.sectionMargin(deco.cfg, deco.normalMargin, deco.barSize)
        // widget pills: room between the widgets for each pill's sides and the gap
        var spacing = Shapes.pillSpacing(deco.cfg, deco.barSize)
        if (spacing > 0) spacing = fitSpacing(found, spacing, m)
        for (var i = 0; i < found.sections.length; i++) {
            var s = found.sections[i]
            var side = s.region === "left" ? (deco.vertical ? "topMargin" : "leftMargin")
                                           : (deco.vertical ? "bottomMargin" : "rightMargin")
            setIfDifferent(s.anchors, side, m)
        }
        for (var j = 0; j < found.lists.length; j++) {
            var row = found.lists[j].item
            if (row && typeof row.spacing === "number") setIfDifferent(row, "spacing", spacing)
        }
        deco.applied = true
    }

    // widget pills: never so much room that a group runs into the next one
    function fitSpacing(found, want, margin) {
        var groups = { left: { sum: 0, n: 0 }, center: { sum: 0, n: 0 }, right: { sum: 0, n: 0 } }
        for (var i = 0; i < found.slots.length; i++) {
            var s = found.slots[i]
            var g = groups[s.region]
            if (!g || !s.visible) continue
            var len = lengthOf(s)
            if (len > 0) { g.sum += len; g.n++ }
        }
        var length = deco.content ? (deco.vertical ? deco.content.height : deco.content.width) : 0
        return Shapes.fitSpacing(want, length, margin, groups, Shapes.pillRoom(deco.cfg, deco.barSize),
                                 Math.max(8, deco.cfg.pillGap + 6))
    }

    // puts back what the stock bar had: bindings to the same values it uses.
    // the bindings are made by the service, which outlives this widget. If the
    // service is already gone (the plugin is being removed), plain values go back
    function restore() {
        unwatch()
        deco.cache = null
        if (deco.drawing) { deco.drawing.destroy(); deco.drawing = null }
        if (!deco.applied) return
        deco.applied = false
        var clear = deco.bar && deco.bar.transparent === true
        var found = collect()
        // the stock bar lays its widgets out with no spacing
        for (var k = 0; k < found.lists.length; k++) {
            var row = found.lists[k].item
            if (row && typeof row.spacing === "number") setIfDifferent(row, "spacing", 0)
        }
        if (deco.svc && typeof deco.svc.giveBackWindow === "function") {
            if (deco.win) deco.svc.giveBackWindow(deco.win, clear)
            for (var i = 0; i < found.sections.length; i++) deco.svc.giveBackMargins(found.sections[i].anchors)
            return
        }
        var w = deco.win
        if (w) {
            try { w.color = clear ? "transparent" : Color.bar.background } catch (e) { }
            try { w.implicitHeight = Style.bar.sizeHorizontal } catch (e2) { }
            try { w.implicitWidth = Style.bar.sizeVertical } catch (e3) { }
        }
        for (var j = 0; j < found.sections.length; j++) {
            var a = found.sections[j].anchors
            try {
                a.leftMargin = deco.normalMargin; a.rightMargin = deco.normalMargin
                a.topMargin = deco.normalMargin; a.bottomMargin = deco.normalMargin
            } catch (e4) { }
        }
    }

    // ---- reading the widgets ----------------------------------------------------------

    property string lastKey: ""

    // The system tray keeps room for its drawer even while the drawer is shut: an
    // empty stretch before the arrow, where the hidden icons slide in on hover.
    // Nothing is drawn there, so neither is a shape: only what the drawer shows
    // counts. A tray that grows with its drawer has no such room, and keeps all of it.
    function trayIn(s) {
        var w = s ? s.activeItem : null
        if (!w || w.moduleName !== "omarchy.tray") return null
        if (typeof w.drawerExtent !== "number" || typeof w.revealExtent !== "number") return null
        return w
    }
    function trayRoom(s) {
        var w = trayIn(s)
        if (!w) return 0
        var kids = w.children || []
        for (var i = 0; i < kids.length; i++) {
            var it = kids[i] ? kids[i].item : null
            if (it && (typeof it.drawerBlockWidth === "number" || typeof it.drawerBlockHeight === "number")) {
                var block = deco.vertical ? it.drawerBlockHeight : it.drawerBlockWidth
                return block > 0 ? Math.max(0, w.drawerExtent - w.revealExtent) : 0
            }
        }
        return 0
    }
    // how long a slot is along the bar, without the room nothing is drawn in
    function lengthOf(s) {
        return Math.max(0, (deco.vertical ? s.height : s.width) - trayRoom(s))
    }

    function measure(found) {
        var slots = []
        for (var i = 0; i < found.slots.length; i++) {
            var s = found.slots[i]
            if (!s.visible || s.width <= 0 || s.height <= 0) continue
            var len = lengthOf(s)
            if (len <= 0) continue
            var p = s.mapToItem(deco.content, 0, 0)
            var lead = (deco.vertical ? s.height : s.width) - len
            slots.push({
                a: (deco.vertical ? p.y : p.x) + lead,
                len: len,
                region: s.region,
                hovered: s.hovered === true,
                open: s.panelOpen === true
            })
        }
        return slots
    }

    function hidden() {
        // the stock bar parks itself past the screen edge when hidden
        try {
            var m = deco.win.margins
            return m.top < 0 || m.bottom < 0 || m.left < 0 || m.right < 0
        } catch (e) { return false }
    }

    // the bar's items are walked again only now and then, or when one went away;
    // in between, the slots found last time are measured
    property var cache: null
    property int ticks: 0
    function cached() {
        deco.ticks++
        var c = deco.cache
        var stale = !c || deco.ticks % 12 === 0
        if (!stale) {
            for (var i = 0; i < c.slots.length; i++)
                if (!c.slots[i] || !c.slots[i].parent) { stale = true; break }
        }
        if (stale) { c = collect(); watch(c); deco.cache = c }
        return c
    }

    // widgets that change size, get hovered or open a panel redraw right away
    // instead of on the next tick
    property var watched: []
    property bool poked: false
    // false once this button is going away: a late signal or a queued redraw
    // must not reach it then
    property bool alive: true
    function poke() {
        if (deco.alive !== true || deco.poked) return
        deco.poked = true
        Qt.callLater(function() {
            if (deco.alive !== true) return
            deco.poked = false
            deco.refresh()
        })
    }
    function watch(found) {
        unwatch()
        var list = []
        for (var i = 0; i < found.slots.length; i++) {
            var s = found.slots[i]
            try {
                s.widthChanged.connect(deco.poke); s.heightChanged.connect(deco.poke)
                s.xChanged.connect(deco.poke); s.yChanged.connect(deco.poke)
                s.visibleChanged.connect(deco.poke)
                if (s.hoveredChanged) s.hoveredChanged.connect(deco.poke)
                if (s.panelOpenChanged) s.panelOpenChanged.connect(deco.poke)
                var t = trayIn(s)
                if (t) t.revealExtentChanged.connect(deco.poke)
                list.push(s)
            } catch (e) { }
        }
        deco.watched = list
    }
    function unwatch() {
        var list = deco.watched
        for (var i = 0; i < list.length; i++) {
            var s = list[i]
            try {
                s.widthChanged.disconnect(deco.poke); s.heightChanged.disconnect(deco.poke)
                s.xChanged.disconnect(deco.poke); s.yChanged.disconnect(deco.poke)
                s.visibleChanged.disconnect(deco.poke)
                if (s.hoveredChanged) s.hoveredChanged.disconnect(deco.poke)
                if (s.panelOpenChanged) s.panelOpenChanged.disconnect(deco.poke)
                var t = trayIn(s)
                if (t) t.revealExtentChanged.disconnect(deco.poke)
            } catch (e) { }
        }
        deco.watched = []
    }

    function refresh() {
        deco.barHidden = deco.win ? hidden() : false
        if (!deco.wanted) {
            restore()
            setState("")
            return
        }
        if (!deco.content && !findWindow()) { setState("lost"); return }
        var found = cached()
        // nothing that looks like the stock bar: leave it alone
        if (found.slots.length === 0) { deco.cache = null; restore(); setState("lost"); return }

        applyWindow(found)
        if (!deco.drawing) deco.drawing = layerComponent.createObject(deco.content, { z: -1000 })
        setState("ok")

        var view = {
            length: deco.vertical ? deco.content.height : deco.content.width,
            thickness: deco.vertical ? deco.content.width : deco.content.height,
            barSize: deco.barSize,
            edgeAtStart: deco.edgeAtStart
        }
        var slots = measure(found)
        var busy = false
        for (var q = 0; q < slots.length; q++) if (slots[q].hovered || slots[q].open) busy = true
        deco.inUse = busy
        // the stock bar's own transparency, checked every time (it can change on its own)
        if (deco.svc && deco.bar && typeof deco.bar.transparent === "boolean"
                && deco.svc.stockTransparent !== deco.bar.transparent)
            deco.svc.stockTransparent = deco.bar.transparent

        var out = Shapes.layout(view, slots, deco.cfg)
        var key = JSON.stringify(out) + "|" + deco.vertical + deco.position
        if (key === deco.lastKey) return
        deco.lastKey = key
        sync(baseModel, out.shapes.filter(function(s) { return s.role === "base" }))
        sync(markModel, out.shapes.filter(function(s) { return s.role !== "base" }))
        sync(dividerModel, out.dividers)
        sync(separatorModel, out.separators)
    }

    // each Baroque button reports under its own name, so an old one going away while
    // its replacement is already there can't wipe the new one's report
    property string reportKey: ""
    function setState(s) {
        if (deco.attachState === s) return
        deco.attachState = s
        if (!deco.svc) return
        if (deco.reportKey === "") deco.reportKey = deco.svc.newReportKey(screenName())
        deco.svc.report(deco.reportKey, s)
    }
    function screenName() {
        try { if (deco.win && deco.win.screen && deco.win.screen.name) return deco.win.screen.name } catch (e) { }
        return "screen"
    }

    // the models are updated in place so the shapes glide instead of jumping
    function sync(model, list) {
        for (var i = 0; i < list.length; i++) {
            var it = list[i]
            var row = {
                a: it.a, len: it.len !== undefined ? it.len : 0,
                c: it.c, w: it.w, r: it.r !== undefined ? it.r : 0,
                role: it.role !== undefined ? it.role : "mark",
                region: it.region !== undefined ? it.region : "all",
                pidx: it.index !== undefined ? it.index : -1,
                attached: it.attached === true
            }
            if (i >= model.count) { model.append(row); continue }
            // only what changed, so nothing repaints for nothing
            var old = model.get(i)
            for (var k in row) if (old[k] !== row[k]) model.setProperty(i, k, row[k])
        }
        if (model.count > list.length) model.remove(list.length, model.count - list.length)
    }

    ListModel { id: baseModel }
    ListModel { id: markModel }
    ListModel { id: dividerModel }
    ListModel { id: separatorModel }

    // follows the widgets: cheap, and catches every way the bar can change
    Timer {
        interval: 400
        repeat: true
        running: deco.anchorItem !== null
        triggeredOnStart: true
        onTriggered: deco.refresh()
    }
    onCfgChanged: { deco.lastKey = ""; deco.poke() }
    onVerticalChanged: { deco.lastKey = ""; deco.poke() }

    // a screen that goes away (or a button taken off the bar) stops counting
    Component.onDestruction: {
        deco.alive = false
        restore()
        try { if (deco.svc && deco.reportKey !== "") deco.svc.report(deco.reportKey, "") } catch (e) { }
    }

    // ---- colors ----------------------------------------------------------------------

    function mix(a, b, t) {
        return Qt.rgba(a.r * (1 - t) + b.r * t, a.g * (1 - t) + b.g * t, a.b * (1 - t) + b.b * t, 1)
    }
    function css(c, alpha) {
        var a = Math.max(0, Math.min(1, alpha))
        return "rgba(" + Math.round(c.r * 255) + "," + Math.round(c.g * 255) + "," + Math.round(c.b * 255) + "," + a.toFixed(3) + ")"
    }
    readonly property color accent: ui ? ui.accent : "white"
    readonly property color surfaceColor: ui ? ui.surface : "black"
    readonly property var palette: svc && svc.themePalette ? svc.themePalette : []

    // each shape's own color: the accent, or a color from the theme's palette
    // the theme's window border colors (or the accent when it has none)
    readonly property var borderColors: svc && svc.borderColors && svc.borderColors.length > 0 ? svc.borderColors : []
    readonly property real borderAngle: svc ? svc.borderAngle : 0
    // the border color at a place along the bar, t from 0 (start) to 1 (end)
    function borderAt(t) {
        if (deco.borderColors.length === 0) return deco.accent
        return Qt.color(Theme.sample(deco.borderColors, t))
    }
    // where a shape sits along the bar, 0 to 1
    function along(a, len) {
        var total = deco.content ? (deco.vertical ? deco.content.height : deco.content.width) : 0
        return total > 0 ? Math.max(0, Math.min(1, (a + len / 2) / total)) : 0.5
    }

    function accentFor(index, region, t) {
        if (cfg && cfg.colorMode === "borders") return borderAt(typeof t === "number" ? t : 0.5)
        if (cfg && cfg.groupColors) {
            if (region === "left") return Qt.color(cfg.leftColor)
            if (region === "center") return Qt.color(cfg.centerColor)
            if (region === "right") return Qt.color(cfg.rightColor)
        }
        if (cfg && cfg.colorMode === "palette" && deco.palette.length > 0 && index >= 0)
            return Qt.color(deco.palette[index % deco.palette.length])
        return deco.accent
    }
    function borderGradCss(alpha) {
        var out = []
        var list = deco.borderColors.length > 0 ? deco.borderColors : []
        for (var i = 0; i < list.length; i++) out.push(css(Qt.color(list[i]), alpha))
        return out
    }
    function nextPaletteColor(index) {
        if (deco.palette.length > 0 && index >= 0) return Qt.color(deco.palette[(index + 1) % deco.palette.length])
        return deco.accent
    }
    // which way slanted, arrow, leaf and stepped ends point for a group
    function dirFor(region) {
        var p = cfg ? cfg.pointing : "right"
        if (p === "outward") return region === "left" ? "left" : (region === "right" ? "right" : "both")
        if (p === "inward") return region === "left" ? "right" : (region === "right" ? "left" : "both")
        return p === "left" || p === "both" ? p : "right"
    }
    readonly property int easingType: !cfg ? Easing.OutCubic
        : cfg.easing === "springy" ? Easing.OutBack : (cfg.easing === "linear" ? Easing.Linear : Easing.OutCubic)

    readonly property int speed: ui && ui.animations ? ui.speed : 0
    // which side faces the windows: away from the screen edge
    readonly property string innerSide: edgeAtStart ? "end" : "start"
    readonly property int margin: 16

    // everything a shape's canvas needs to paint itself
    function paramsFor(index, region, wPx, hPx, r, attached, t) {
        var c = deco.cfg
        if (!c) return { width: 0, height: 0 }
        var mine = accentFor(index, region, t)
        var palFill = c.colorMode === "palette" && c.paletteUse === "fill"
        var tint = c.barTint / 100 + (palFill ? 0.22 : 0) + (region === "center" && c.centerStyle === "tinted" ? 0.18 : 0)
        var base = mix(deco.surfaceColor, palFill ? mine : deco.accent, Math.min(0.6, tint))
        var surf = c.surface
        var lines = c.lines
        // how much of the fill each surface shows
        var S = Surfaces.byKey[surf] || Surfaces.byKey.filled
        var k = typeof S.fill === "number" ? S.fill : 1
        if (c.fill === "glass") k *= 0.55
        var alpha = k * c.barOpacity / 100
        // the window border gradient: the fill runs from its first color to its last
        var borderFill = c.gradientTo === "border" && c.fill === "gradient"
        var fillFrom = borderFill ? mix(base, borderAt(0), 0.35) : base
        var target = borderFill ? mix(base, borderAt(1), 0.35)
                   : c.gradientTo === "palette" ? mix(base, nextPaletteColor(index), 0.55)
                   : c.gradientTo === "lighter" ? mix(base, Qt.rgba(1, 1, 1, 1), 0.2)
                   : c.gradientTo === "darker" ? mix(base, Qt.rgba(0, 0, 0, 1), 0.35)
                   : mix(base, mine, 0.45)

        // lines: the edge of the shape, in the line color. An accented center gets
        // an accent line even when the others have none
        var lw = 0
        var lineBase = mine, lineAlpha = 0.85
        var border = c.border
        if (region === "center" && c.centerStyle === "accent") {
            border = "accent"
            if (lines === "none") lines = "solid"
        }
        var Ln = Lines.byKey[lines] || Lines.byKey.none
        var wantsLine = Ln.usesColor !== false
        if (wantsLine) {
            lw = c.borderWidth
            if (border === "text") { lineBase = Color.bar.text; lineAlpha = 0.55 }
            else if (border === "subtle") { lineBase = ui ? ui.fg : Qt.rgba(1, 1, 1, 1); lineAlpha = 0.16 }
            else { lineBase = mine; lineAlpha = 0.85 }          // accent and window border
        }
        var lineColor = wantsLine ? css(lineBase, lineAlpha) : ""

        // gradient outline: from the line's own color into a second one, or the window
        // border's colors. Rails and brackets fade the same way
        var gradOn = c.outlineGradient === true
        var gradAngle = c.outlineGradientDir === "across" ? 90 : c.outlineGradientDir === "diagonal" ? 45
                      : c.outlineGradientDir === "theme" ? deco.borderAngle : 0
        function fadeFrom(from, alpha) {
            if (c.outlineGradientTo === "border" && deco.borderColors.length > 0) return deco.borderGradCss(Math.max(alpha, 0.6))
            var to = c.outlineGradientTo === "accent" ? mine
                   : c.outlineGradientTo === "palette" ? nextPaletteColor(index)
                   : mix(from, Qt.rgba(1, 1, 1, 1), 0.55)
            return [css(from, alpha), css(to, Math.max(alpha, 0.6))]
        }
        var lineGrad = []
        if (lw > 0 && border === "border" && deco.borderColors.length > 1 && !gradOn) lineGrad = deco.borderGradCss(0.9)
        else if (lw > 0 && gradOn) lineGrad = fadeFrom(lineBase, lineAlpha)
        var markGrad = gradOn ? fadeFrom(mine, 0.9) : []
        var lineAngleNow = gradOn ? gradAngle : deco.borderAngle

        // shadow or glow
        var blur = 0, shadow = "", shadowQ = Qt.rgba(0, 0, 0, 0)
        function setShadow(col, a, b) { blur = b; shadow = css(col, a); shadowQ = Qt.rgba(col.r, col.g, col.b, a) }
        if (Shapes.floating(c) && c.shadow !== "none") {
            if (c.shadowColor === "accent") setShadow(mine, c.shadow === "strong" ? 0.8 : 0.55, c.shadow === "strong" ? 14 : 8)
            else setShadow(Qt.rgba(0, 0, 0, 1), c.shadow === "strong" ? 0.55 : 0.35, c.shadow === "strong" ? 14 : 8)
        }
        if (Ln.glow === true && blur === 0) setShadow(mine, 0.5, 8)
        // the shadow surface is nothing but a shadow, so it always has one
        if (S.ownShadow === true && blur === 0) setShadow(Qt.rgba(0, 0, 0, 1), 0.5, 10)

        var edgeSide = deco.edgeAtStart ? "start" : "end"
        var windowSide = deco.edgeAtStart ? "end" : "start"
        var flat = c.flatSide === "edge" ? edgeSide : (c.flatSide === "windows" ? windowSide : "")
        var fg = ui ? ui.fg : Qt.rgba(1, 1, 1, 1)
        // on a light shape, highlights go white and shadows soften
        var lightBase = 0.299 * base.r + 0.587 * base.g + 0.114 * base.b > 0.6
        var dense = S.noDepth !== true

        return {
            width: wPx, height: hPx, margin: deco.margin, vertical: deco.vertical,
            dir: dirFor(region),
            flat: c.shape === "full" ? "" : flat,
            pattern: dense && c.pattern !== "none" ? c.pattern : "", patternColor: css(fg, 0.07),
            depth: dense && c.depth !== "flat" ? c.depth : "",
            light: lightBase ? css(Qt.rgba(1, 1, 1, 1), 0.7) : css(Qt.rgba(1, 1, 1, 1), 0.16),
            dark: lightBase ? css(Qt.rgba(0, 0, 0, 1), 0.18) : css(Qt.rgba(0, 0, 0, 1), 0.35),
            cap: Shapes.floating(c) && c.accentCap !== "none" && S.noFill !== true ? c.accentCap : "", capColor: css(mine, 0.9),
            shadowShift: c.shadowDir === "windows" ? (deco.edgeAtStart ? 3 : -3) : 0,
            r: r, ends: c.shape === "full" ? "square" : c.ends,
            edge: attached ? (deco.edgeAtStart ? "start" : "end") : "",
            concave: attached && c.concave, inner: deco.innerSide,
            surface: surf, lines: lines, ownShadow: S.ownShadow === true,
            ornament: c.shape === "full" && c.ornaments === "brackets" ? "none" : c.ornaments,
            fill: css(fillFrom, alpha),
            lineGrad: lineGrad, markGrad: markGrad,
            lineAngle: lineAngleNow,
            fill2: c.fill === "gradient" ? css(target, alpha) : "",
            gradAcross: c.gradientAcross,
            glass: c.fill === "glass", glassColor: lightBase ? css(Qt.rgba(1, 1, 1, 1), 0.8) : (ui ? css(ui.fg, 0.22) : ""),
            line: lineColor, lineWidth: lw,
            mark: css(mine, 0.9), markWidth: Math.max(1, c.borderWidth), bracket: c.bracket,
            second: css(mix(base, mine, 0.28), alpha),
            splitColor: css(mix(base, mine, 0.5), alpha),
            // a gilded frame in the shape's own color: a bright shine, the color, a dark crease
            frameColors: [css(mix(mine, Qt.rgba(1, 1, 1, 1), 0.55), 1), css(mine, 1),
                          css(mix(mine, Qt.rgba(0, 0, 0, 1), 0.45), 1), css(mix(mine, Qt.rgba(1, 1, 1, 1), 0.3), 1)],
            velvetSheen: css(mix(base, lightBase ? Qt.rgba(1, 1, 1, 1) : mine, lightBase ? 0.35 : 0.3), alpha),
            head: css(mix(base, mine, 0.7), Math.max(alpha, 0.85)),
            metal: [css(mix(base, Qt.rgba(1, 1, 1, 1), lightBase ? 0.5 : 0.22), alpha), css(base, alpha),
                    css(mix(base, Qt.rgba(0, 0, 0, 1), lightBase ? 0.12 : 0.3), alpha),
                    css(mix(base, Qt.rgba(1, 1, 1, 1), lightBase ? 0.25 : 0.1), alpha)],
            frost: css(lightBase ? Qt.rgba(1, 1, 1, 1) : mix(base, Qt.rgba(1, 1, 1, 1), 0.35), lightBase ? 0.55 : 0.32 * c.barOpacity / 100),
            // the side of a keycap: darker on a light bar, toward your color on a dark one
            key: css(lightBase ? mix(base, Qt.rgba(0, 0, 0, 1), 0.4) : mix(base, mine, 0.55), Math.max(alpha, 0.6)),
            railSide: c.railSide,
            shadow: shadow, shadowBlur: blur, shadowQ: shadowQ
        }
    }

    // ---- drawing -----------------------------------------------------------------------

    Component {
        id: layerComponent

        Item {
            id: layerRoot
            anchors.fill: parent
            visible: deco.wanted && !deco.barHidden
            // fades while the bar isn't in use, if you asked for that. The mouse anywhere
            // over the bar counts, not only over a widget
            opacity: deco.cfg && !deco.inUse && !barHover.hovered ? deco.cfg.idleOpacity / 100 : 1
            HoverHandler { id: barHover }
            Behavior on opacity { NumberAnimation { duration: deco.cfg ? deco.cfg.fadeTime : 300; easing.type: Easing.InOutQuad } }

            // the shapes: one canvas each, a bit bigger than the shape for its shadow
            Repeater {
                model: baseModel
                delegate: Item {
                    id: shapeItem
                    required property real a
                    required property real len
                    required property real c
                    required property real w
                    required property real r
                    required property string region
                    required property int pidx
                    required property bool attached

                    // the canvas rect, along and across, before the flip for side bars
                    readonly property real m: deco.margin
                    readonly property bool edgeStart: attached && deco.edgeAtStart
                    readonly property bool edgeEnd: attached && !deco.edgeAtStart
                    readonly property real ca: a - m
                    readonly property real cl: len + 2 * m
                    readonly property real cc: c - (edgeStart ? 0 : m)
                    readonly property real cw: w + (edgeStart ? 0 : m) + (edgeEnd ? 0 : m)

                    // the shape is painted once at its final size and only its position
                    // glides, so a moving bar never repaints every frame
                    x: deco.vertical ? cc : ca
                    y: deco.vertical ? ca : cc
                    width: deco.vertical ? cw : cl
                    height: deco.vertical ? cl : cw
                    Behavior on x { enabled: deco.speed > 0; NumberAnimation { duration: deco.speed; easing.type: deco.easingType } }
                    Behavior on y { enabled: deco.speed > 0; NumberAnimation { duration: deco.speed; easing.type: deco.easingType } }

                    Canvas {
                        id: canvas
                        anchors.fill: parent
                        renderStrategy: Canvas.Cooperative
                        readonly property var params: deco.paramsFor(shapeItem.pidx, shapeItem.region,
                                                                     Math.round(width), Math.round(height),
                                                                     shapeItem.r, shapeItem.attached,
                                                                     deco.along(shapeItem.a, shapeItem.len))
                        // blurring on the canvas is slow, so the shadow is left to the
                        // graphics card. Only "Only a shadow" needs the canvas to do it
                        readonly property bool gpuShadow: params.shadowBlur > 0 && !params.ownShadow
                        readonly property var drawn: {
                            if (!gpuShadow) return params
                            var q = {}
                            for (var k in params) q[k] = params[k]
                            q.shadowBlur = 0
                            return q
                        }
                        onDrawnChanged: requestPaint()
                        onPaint: Paint.paint(getContext("2d"), drawn)

                        layer.enabled: gpuShadow
                        layer.effect: MultiEffect {
                            shadowEnabled: true
                            blurMax: 32
                            shadowBlur: Math.min(1, canvas.params.shadowBlur / 14)
                            shadowColor: canvas.params.shadowQ
                            shadowHorizontalOffset: deco.vertical ? (canvas.params.shadowShift || 0) : 0
                            shadowVerticalOffset: deco.vertical ? 0 : (canvas.params.shadowShift || 0)
                            autoPaddingEnabled: true
                        }
                    }
                }
            }

            // the accent line along the side of a full width bar that faces the windows.
            // z keeps it and the marks below above the shapes, which a Repeater adds last
            Rectangle {
                z: 2
                visible: deco.cfg !== null && deco.cfg.shape === "full" && deco.cfg.edgeLine
                x: deco.vertical ? (deco.innerSide === "end" ? parent.width - 2 : 0) : 0
                y: deco.vertical ? 0 : (deco.innerSide === "end" ? parent.height - 2 : 0)
                width: deco.vertical ? 2 : parent.width
                height: deco.vertical ? parent.height : 2
                color: deco.accent
            }

            // dividers between groups
            Repeater {
                model: dividerModel
                delegate: Rectangle {
                    z: 2
                    required property real a
                    required property real c
                    required property real w
                    x: deco.vertical ? c : a
                    y: deco.vertical ? a : c
                    width: deco.vertical ? w : 1
                    height: deco.vertical ? 1 : w
                    color: deco.ui ? deco.ui.tint(0.22) : "white"
                }
            }

            // separators between widgets
            Repeater {
                model: separatorModel
                delegate: Item {
                    id: sep
                    z: 2
                    required property real a
                    required property real c
                    required property real w
                    readonly property string kind: deco.cfg ? deco.cfg.separators : "none"
                    x: deco.vertical ? c : a - 4
                    y: deco.vertical ? a - 4 : c
                    width: deco.vertical ? w : 8
                    height: deco.vertical ? 8 : w
                    Rectangle {
                        visible: sep.kind === "line" || sep.kind === "slash"
                        anchors.centerIn: parent
                        width: deco.vertical ? parent.width : 1
                        height: deco.vertical ? 1 : parent.height
                        rotation: sep.kind === "slash" ? 20 : 0
                        antialiasing: true
                        color: deco.ui ? deco.ui.tint(deco.cfg.sepOpacity / 100) : "white"
                    }
                    Rectangle {
                        visible: sep.kind === "dot"
                        anchors.centerIn: parent
                        width: 3; height: 3; radius: 1.5
                        color: deco.ui ? deco.ui.tint(Math.min(1, deco.cfg.sepOpacity / 100 + 0.1)) : "white"
                    }
                }
            }

            // hover and open panel marks
            Repeater {
                model: markModel
                delegate: Item {
                    id: mark
                    z: 3
                    required property real a
                    required property real len
                    required property real c
                    required property real w
                    required property real r
                    required property string role
                    required property string region
                    readonly property string style: !deco.cfg ? "none" : (role === "open" ? deco.cfg.openMark : deco.cfg.hover)
                    readonly property color tone: role === "open" || (deco.cfg && deco.cfg.hoverColor === "accent")
                        ? deco.accentFor(-1, region, deco.along(a, len)) : (deco.ui ? deco.ui.fg : "white")
                    x: deco.vertical ? c : a
                    y: deco.vertical ? a : c
                    width: deco.vertical ? w : len
                    height: deco.vertical ? len : w
                    Behavior on x { enabled: deco.speed > 0; NumberAnimation { duration: deco.speed * 0.7; easing.type: deco.easingType } }
                    Behavior on width { enabled: deco.speed > 0; NumberAnimation { duration: deco.speed * 0.7; easing.type: deco.easingType } }
                    Behavior on y { enabled: deco.speed > 0; NumberAnimation { duration: deco.speed * 0.7; easing.type: deco.easingType } }
                    Behavior on height { enabled: deco.speed > 0; NumberAnimation { duration: deco.speed * 0.7; easing.type: deco.easingType } }

                    Rectangle {   // fill
                        anchors.fill: parent
                        visible: mark.style === "fill"
                        radius: mark.r
                        color: Qt.rgba(mark.tone.r, mark.tone.g, mark.tone.b, mark.role === "open" ? 0.24 : 0.09)
                    }
                    Rectangle {   // glow: a soft ring
                        anchors.fill: parent
                        visible: mark.style === "glow"
                        radius: mark.r
                        color: Qt.rgba(mark.tone.r, mark.tone.g, mark.tone.b, 0.10)
                        border.width: 1
                        border.color: Qt.rgba(mark.tone.r, mark.tone.g, mark.tone.b, mark.role === "open" ? 0.8 : 0.4)
                    }
                    Rectangle {   // line, on the side facing the windows
                        visible: mark.style === "line" || mark.style === "underline"
                        readonly property real thick: 2
                        readonly property real along: deco.vertical ? parent.height * 0.5 : parent.width * 0.5
                        x: deco.vertical ? (deco.innerSide === "end" ? parent.width - thick - 1 : 1) : (parent.width - along) / 2
                        y: deco.vertical ? (parent.height - along) / 2 : (deco.innerSide === "end" ? parent.height - thick - 1 : 1)
                        width: deco.vertical ? thick : along
                        height: deco.vertical ? along : thick
                        radius: 1
                        color: Qt.rgba(mark.tone.r, mark.tone.g, mark.tone.b, mark.role === "open" ? 1 : 0.6)
                    }
                    Rectangle {   // dot, on the side facing the windows
                        visible: mark.style === "dot"
                        width: 4; height: 4; radius: 2
                        x: deco.vertical ? (deco.innerSide === "end" ? parent.width - 6 : 2) : (parent.width - 4) / 2
                        y: deco.vertical ? (parent.height - 4) / 2 : (deco.innerSide === "end" ? parent.height - 6 : 2)
                        color: mark.tone
                    }
                }
            }
        }
    }
}
