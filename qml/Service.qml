import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import "js/Schema.js" as Schema
import "js/Util.js" as Util
import "js/Theme.js" as Theme
import "js/parts/Surfaces.js" as Surfaces
import "core"

// the always-loaded part: settings, colors and ipc.
// every Baroque button on every screen reads from here, so they all draw the same bar
Item {
    id: root

    visible: false

    property var shell: null
    property var manifest: null

    readonly property string pluginId: "io.github.qempexe.baroque"

    // settings
    SettingsStore { id: settingsStore }
    property alias store: settingsStore
    readonly property var cfg: Schema.resolve(settingsStore.values)

    function setValue(key, value) {
        var v = Schema.clean(key, value)
        if (v === undefined) return
        // picking colors yourself makes them yours, a look won't take them back
        if (key === "colorMode" && root.cfg.presetColors !== "") settingsStore.setMany({ colorMode: v, presetColors: "" })
        else settingsStore.set(key, v)
    }

    UiState {
        id: ux
        store: settingsStore
        cfg: root.cfg
        barFg: Color.bar.text
        barBg: Color.bar.background
        themeAccent: Color.accent
        themeUrgent: Color.urgent
        fontName: Style.font.family
        themePalette: root.themePalette
        borderColors: root.borderColors
        borderAngle: root.borderAngle
    }
    property alias ui: ux

    // ---- looks -------------------------------------------------------------------------

    // reset everything except your saved looks
    function resetAll() {
        var next = {}
        for (var k in Schema.defaults) next[k] = Schema.defaults[k]
        next.savedLooks = root.cfg.savedLooks
        settingsStore.resetAll(next)
    }

    function applyPreset(key) {
        var p = Schema.presetFor(Util.toText(key))
        if (!p) return false
        // a look starts from the defaults, so nothing from the last one lingers.
        // your colors, the screen corners and the animation speed stay yours
        var keep = ["colorMode", "customBg", "customFg", "accentColor", "paletteUse", "widgetText",
                    "groupColors", "leftColor", "centerColor", "rightColor",
                    "speed", "easing", "idleOpacity", "fadeTime",
                    "corners", "cornerWhich", "cornerSize", "cornerColor",
                    "screenFrame", "screenFrameWidth", "screenFrameColor"]
        var look = {}
        for (var i = 0; i < Schema.lookKeys.length; i++) {
            var k = Schema.lookKeys[i]
            look[k] = keep.indexOf(k) !== -1 ? root.cfg[k] : Schema.defaults[k]
        }
        // colors a look brought along (Mono, Rainbow, Aurora) go when you switch to the
        // next one. Colors you picked yourself stay
        if (root.cfg.presetColors !== "" && look.colorMode === root.cfg.presetColors) look.colorMode = "theme"
        var set = Schema.cleanLook(p.set)
        for (var key in set) look[key] = set[key]
        look.presetColors = set.colorMode !== undefined ? set.colorMode : ""
        look.undoLook = Schema.lookOf(root.cfg)
        look.lastLook = p.key
        look.enabled = true
        settingsStore.setMany(look)
        return true
    }
    // the ready made look after the last one picked
    function nextLook() {
        var i = -1
        for (var k = 0; k < Schema.presets.length; k++) if (Schema.presets[k].key === root.cfg.lastLook) i = k
        root.applyPreset(Schema.presets[(i + 1) % Schema.presets.length].key)
        return root.cfg.lastLook
    }
    // one step back: the bar as it was before the last look was picked, loaded or imported
    readonly property bool canUndo: root.cfg.undoLook !== null
    function undoLook() {
        if (!root.cfg.undoLook) return false
        var look = Schema.cleanLookAll(root.cfg.undoLook)
        look.undoLook = null
        look.lastLook = ""
        settingsStore.setMany(look)
        return true
    }

    function slotOk(i) { return typeof i === "number" && i >= 0 && i < Schema.LOOK_SLOTS && Math.round(i) === i }

    function saveLook(i) {
        if (!slotOk(i)) return false
        var looks = root.cfg.savedLooks.slice()
        looks[i] = Schema.lookOf(root.cfg)
        root.setValue("savedLooks", looks)
        return true
    }
    // the first free place, or -1 when all are taken
    function freeLook() {
        for (var i = 0; i < Schema.LOOK_SLOTS; i++) if (!root.cfg.savedLooks[i]) return i
        return -1
    }
    function saveFreeLook() {
        var i = root.freeLook()
        return i >= 0 && root.saveLook(i) ? i : -1
    }
    function loadLook(i) {
        if (!slotOk(i) || !root.cfg.savedLooks[i]) return false
        var look = Schema.cleanLook(root.cfg.savedLooks[i])
        look.undoLook = Schema.lookOf(root.cfg)
        look.enabled = true
        settingsStore.setMany(look)
        return true
    }
    function clearLook(i) {
        if (!slotOk(i)) return false
        var looks = root.cfg.savedLooks.slice()
        looks[i] = null
        root.setValue("savedLooks", looks)
        return true
    }

    function exportLook() { return JSON.stringify(Schema.lookOf(root.cfg)) }
    function importLook(text) {
        var look = Schema.parseLook(text)
        if (!look) return false
        look.undoLook = Schema.lookOf(root.cfg)
        settingsStore.setMany(look)
        return true
    }

    // ---- the theme's palette, for "Theme palette" colors ----------------------------------

    // colors.toml of the current theme: color1 … color6 and their bright versions
    property var themePalette: []
    FileView {
        id: paletteFile
        path: Color.currentThemePath ? Color.currentThemePath + "/colors.toml" : ""
        watchChanges: true
        onFileChanged: reload()
        onLoaded: {
            var t = ""
            try { t = typeof text === "function" ? text() : text } catch (e) { t = "" }
            root.themePalette = Theme.parsePalette(t)
        }
        onLoadFailed: { root.themePalette = []; root.retryTheme() }
    }

    // A theme switch replaces the theme folder, so for a moment the files are gone
    // and the watch can lose track of them. Read them again shortly after a failed
    // read, and whenever the theme's colors change.
    // a few tries after a failed read, so a theme without these files isn't read forever
    property int themeTries: 0
    function retryTheme() { if (root.themeTries < 3) { root.themeTries++; themeRetry.restart() } }
    Timer {
        id: themeRetry
        interval: 800
        onTriggered: { paletteFile.reload(); borderLua.reload(); borderConf.reload() }
    }
    Connections {
        target: Color
        ignoreUnknownSignals: true
        function onAccentChanged() { root.themeTries = 0; themeRetry.restart() }
        function onBackgroundChanged() { root.themeTries = 0; themeRetry.restart() }
    }

    // ---- the bar's text color ----------------------------------------------------------
    //
    // Stock widgets draw their text in the theme's bar text color. On light custom
    // shapes that can become unreadable, so Baroque can set that color for the bar.
    // It's given back (as a live binding to the theme) whenever it isn't needed.

    function lum(c) { return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b }
    // the theme's own bar text color, worked out the way the theme does it
    // (never read back from Color.bar.text, which Baroque may have changed)
    function themeText() {
        try { if (typeof Color.pick === "function") return Color.pick("bar.text", Color.foreground) } catch (e) { }
        return Color.foreground
    }
    readonly property color themeBarText: root.themeText()
    // the color the shapes mostly show, when they show a solid surface at all
    readonly property bool solidShapes: root.cfg.enabled && root.cfg.barOpacity >= 50
        && (Surfaces.byKey[root.cfg.surface] || Surfaces.byKey.filled).solid !== false
    readonly property color shapeColor: ux.surface
    readonly property string barTextMode: {
        if (!root.cfg.enabled || root.stockTransparent) return "theme"
        if (root.cfg.widgetText === "custom") return "custom"
        if (root.cfg.widgetText === "auto" && root.solidShapes
                && Math.abs(root.lum(root.themeBarText) - root.lum(root.shapeColor)) < 0.4) return "auto"
        return "theme"
    }
    readonly property color barTextColor: root.barTextMode === "custom" ? Qt.color(root.cfg.customFg)
        : root.barTextMode === "auto" ? ux.contrast(root.shapeColor) : root.themeBarText
    property bool barTextOwned: false

    function applyBarText() {
        try {
            if (root.barTextMode === "theme") {
                if (!root.barTextOwned) return
                Color.bar.text = Qt.binding(function() { return root.themeText() })
                root.barTextOwned = false
                return
            }
            if (!root.barTextOwned || !Qt.colorEqual(Color.bar.text, root.barTextColor)) Color.bar.text = root.barTextColor
            root.barTextOwned = true
        } catch (e) { }
    }
    onBarTextModeChanged: Qt.callLater(root.applyBarText)
    onBarTextColorChanged: Qt.callLater(root.applyBarText)
    Component.onCompleted: Qt.callLater(root.applyBarText)
    Component.onDestruction: {
        if (root.barTextOwned) {
            try { Color.bar.text = root.themeText() } catch (e) { }
        }
    }

    // ---- the theme's window border ----------------------------------------------------
    //
    // Omarchy themes color the active window border, often as a gradient:
    //   hyprland.lua:   local active_border_color = { colors = { "rgba(1ee9d6ee)", "rgba(fe4fb6ee)" }, angle = 45 }
    //   hyprland.conf:  col.active_border = rgba(33ccffee) rgba(00ff99ee) 45deg
    // Only the colors (as #rrggbb) and the angle are taken; nothing in the file is run.

    // hyprland.lua wins over hyprland.conf when a theme has both
    property var luaBorder: ({ colors: [], angle: 0 })
    property var confBorder: ({ colors: [], angle: 0 })
    property bool luaMissing: false
    readonly property var borderColors: luaBorder.colors.length > 0 ? luaBorder.colors : confBorder.colors   // ["#1ee9d6", "#fe4fb6"] or []
    readonly property real borderAngle: luaBorder.colors.length > 0 ? luaBorder.angle : confBorder.angle

    function fileText(fv) {
        try { var t = typeof fv.text === "function" ? fv.text() : fv.text; return typeof t === "string" ? t : "" } catch (e) { return "" }
    }
    FileView {
        id: borderLua
        path: Color.currentThemePath ? Color.currentThemePath + "/hyprland.lua" : ""
        watchChanges: true
        onFileChanged: reload()
        onLoaded: { root.luaMissing = false; root.luaBorder = Theme.parseBorder(root.fileText(borderLua)) }
        onLoadFailed: { root.luaBorder = ({ colors: [], angle: 0 }); root.luaMissing = true; if (root.confBorder.colors.length === 0) root.retryTheme() }
    }
    FileView {
        id: borderConf
        // only looked at when the theme has no hyprland.lua
        path: Color.currentThemePath && root.luaMissing ? Color.currentThemePath + "/hyprland.conf" : ""
        watchChanges: true
        onFileChanged: reload()
        onPathChanged: if (path === "") root.confBorder = ({ colors: [], angle: 0 })
        onLoaded: root.confBorder = Theme.parseBorder(root.fileText(borderConf))
        onLoadFailed: root.confBorder = ({ colors: [], angle: 0 })
    }

    // ---- screen corners ---------------------------------------------------------------

    // made only when asked for, so nothing extra runs otherwise
    Loader {
        active: root.cfg.corners === true || root.cfg.screenFrame === true
        source: "screen/Corners.qml"
        onLoaded: item.svc = root
        onStatusChanged: if (status === Loader.Error) console.warn("Baroque: screen corners could not load")
    }

    // what the screens report back (see Decorator.qml)
    property var reports: ({})          // screen name -> "ok" | "lost"
    property bool stockTransparent: false
    readonly property int screens: {
        var seen = []
        for (var k in root.reports) {
            if (root.reports[k] !== "ok") continue
            var screen = k.split("#")[0]
            if (seen.indexOf(screen) === -1) seen.push(screen)
        }
        return seen.length
    }
    readonly property string status: {
        var any = false
        for (var k in root.reports) {
            any = true
            if (root.reports[k] === "ok") return "ok"
        }
        return any ? "lost" : ""
    }

    property int reportCount: 0
    function newReportKey(screenName) {
        root.reportCount++
        return (typeof screenName === "string" && screenName !== "" ? screenName : "screen") + "#" + root.reportCount
    }
    // screens Baroque draws on: each button counts once, several on one screen once too
    function report(key, state) {
        var name = typeof key === "string" && key !== "" ? key : "screen"
        if (root.reports[name] === state) return
        var next = {}
        for (var k in root.reports) next[k] = root.reports[k]
        if (state === "") delete next[name]
        else next[name] = state
        root.reports = next
    }

    // Giving the bar window back to the stock bar (see deco/Decorator.qml). The bindings
    // are made here because this service stays loaded: a binding made by a bar button
    // that is being removed would stop working with it.
    function giveBackWindow(w, clear) {
        try { w.color = clear ? "transparent" : Qt.binding(function() { return Color.bar.background }) } catch (e) { }
        try { w.implicitHeight = Qt.binding(function() { return Style.bar.sizeHorizontal }) } catch (e2) { }
        try { w.implicitWidth = Qt.binding(function() { return Style.bar.sizeVertical }) } catch (e3) { }
    }
    function giveBackMargins(a) {
        try {
            a.leftMargin = Qt.binding(function() { return Style.space(8) })
            a.rightMargin = Qt.binding(function() { return Style.space(8) })
            a.topMargin = Qt.binding(function() { return Style.space(8) })
            a.bottomMargin = Qt.binding(function() { return Style.space(8) })
        } catch (e) { }
    }

    // the stock bar's own "transparent" switch: turned off through its ipc
    function stockOpaque() {
        if (root.stockTransparent && !opaqueProc.running) opaqueProc.running = true
    }
    Process {
        id: opaqueProc
        command: ["omarchy-shell", "shell", "toggleBarTransparency"]
    }

    // a shape by name, or the next one
    function useShape(name) {
        var shapes = Schema.itemFor("shape").options
        if (shapes.indexOf(name) === -1) return false
        root.setValue("shape", name)
        if (!root.cfg.enabled) root.setValue("enabled", true)
        return true
    }
    function nextShape() {
        var shapes = Schema.itemFor("shape").options
        var i = shapes.indexOf(root.cfg.shape)
        root.useShape(shapes[(i + 1) % shapes.length])
    }

    // ipc: omarchy-shell io.github.qempexe.baroque <function>
    IpcHandler {
        target: root.pluginId

        function settings(): string { root.ui.tabRequested("settings", true); return "ok" }
        function toggle(): string { root.setValue("enabled", !root.cfg.enabled); return root.cfg.enabled ? "on" : "off" }
        function enable(): string { root.setValue("enabled", true); return "on" }
        function disable(): string { root.setValue("enabled", false); return "off" }
        function shape(name: string): string { return root.useShape(name) ? name : "unknown shape, try: full pill islands widgets" }
        function next(): string { root.nextShape(); return root.cfg.shape }
        function preset(name: string): string { return root.applyPreset(name) ? name : "unknown look" }
        function nextLook(): string { return root.nextLook() }
        function undo(): string { return root.undoLook() ? "ok" : "nothing to undo" }
        function save(slot: int): string { return root.saveLook(slot - 1) ? "saved in " + slot : "places are 1 to " + Schema.LOOK_SLOTS }
        function saveNew(): string { var i = root.saveFreeLook(); return i >= 0 ? "saved in " + (i + 1) : "all " + Schema.LOOK_SLOTS + " places are taken" }
        function load(slot: int): string { return root.loadLook(slot - 1) ? "loaded " + slot : "nothing saved there" }
        function exportLook(): string { return root.exportLook() }
        function importLook(json: string): string { return root.importLook(json) ? "ok" : "not a Baroque look" }
        function frame(): string { root.setValue("screenFrame", !root.cfg.screenFrame); return root.cfg.screenFrame ? "on" : "off" }
        function corners(): string { root.setValue("corners", !root.cfg.corners); return root.cfg.corners ? "on" : "off" }
        function status(): string {
            return JSON.stringify({ enabled: root.cfg.enabled, shape: root.cfg.shape, status: root.status, screens: root.screens })
        }
    }
}
