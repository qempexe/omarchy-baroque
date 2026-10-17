import QtQuick
import "../js/Paint.js" as Paint
import "../js/parts/Surfaces.js" as Surfaces
import "../js/parts/Ends.js" as Ends

// the little picture on a settings tile
Item {
    id: root

    property var ui: null
    property string key: ""
    property string opt: ""
    property bool on: false

    width: 72
    height: 44

    readonly property color ink: on ? ui.accent : ui.tint(0.55)
    readonly property color soft: on ? ui.accentTint(0.40) : ui.tint(0.20)

    // shape: the top of a screen with the bar drawn the way that shape draws it
    Item {
        visible: root.key === "shape"
        anchors.fill: parent

        Rectangle {   // the screen
            anchors.fill: parent
            radius: 4
            color: ui.tint(0.05)
            border.width: 1
            border.color: ui.tint(0.10)
        }

        // where the widgets sit: [start, width] as parts of the bar
        readonly property var groups: [[0.06, 0.24], [0.40, 0.20], [0.70, 0.24]]
        readonly property var widgets: [[0.06, 0.10], [0.18, 0.10], [0.42, 0.16], [0.70, 0.10], [0.82, 0.12]]

        Rectangle {   // full width
            visible: root.opt === "full"
            x: 1; y: 1; width: parent.width - 2; height: 11
            radius: 3
            color: root.soft
        }
        Rectangle {   // one pill
            visible: root.opt === "pill"
            x: 5; y: 4; width: parent.width - 10; height: 9
            radius: 4.5
            color: root.soft
        }
        Repeater {    // islands
            model: root.opt === "islands" ? parent.groups : []
            delegate: Rectangle {
                x: parent.width * modelData[0]; y: 4
                width: parent.width * modelData[1]; height: 9
                radius: 4.5
                color: root.soft
            }
        }
        Repeater {    // widget pills
            model: root.opt === "widgets" ? parent.widgets : []
            delegate: Rectangle {
                x: parent.width * modelData[0]; y: 4
                width: parent.width * modelData[1]; height: 9
                radius: 4.5
                color: root.soft
            }
        }
        Repeater {    // the widgets themselves, same in every picture
            model: parent.widgets
            delegate: Rectangle {
                x: parent.width * (modelData[0] + modelData[1] / 2) - 2
                y: root.opt === "full" ? 5 : 7
                width: 4; height: 3; radius: 1.5
                color: root.ink
            }
        }
        Rectangle {   // a window under the bar
            x: 8; y: 18; width: parent.width - 16; height: parent.height - 24
            radius: 3
            color: ui.tint(0.07)
        }
    }

    // ends and surface: one shape drawn the real way
    Canvas {
        visible: ["ends", "surface", "lines", "ornaments", "pointing"].indexOf(root.key) !== -1
        anchors.centerIn: parent
        width: 64
        height: 26
        readonly property string opt: root.opt
        readonly property bool active: root.on
        readonly property color ac: root.ui ? root.ui.accent : "white"
        // the ends tiles follow the current pointing, the pointing tiles the current ends
        readonly property string pointing: root.ui ? root.ui.cfgSafe.pointing : "right"
        readonly property string endsNow: root.ui ? root.ui.cfgSafe.ends : "arrow"
        onPointingChanged: requestPaint()
        onEndsNowChanged: requestPaint()
        onOptChanged: requestPaint()
        onActiveChanged: requestPaint()
        onAcChanged: requestPaint()
        Component.onCompleted: requestPaint()
        function part(key) { return Surfaces.byKey[key] || Surfaces.byKey.filled }
        function fillOf(key) { var f = part(key).fill; return typeof f === "number" ? f : 1 }
        function ownShadow(key) { return part(key).ownShadow === true }
        function noFill(key) { return part(key).noFill === true }
        onPaint: {
            var ctx = getContext("2d")
            ctx.reset()
            var ink = root.ink, soft = root.soft
            if (root.key === "pointing") {
                // the left and the right group, pointing the way this option makes them
                var kind = Ends.byKey[endsNow] && Ends.byKey[endsNow].pointing ? endsNow : "arrow"
                var o = root.opt
                var dl = o === "outward" ? "left" : (o === "inward" ? "right" : o)
                var dr = o === "outward" ? "right" : (o === "inward" ? "left" : o)
                var two = o === "outward" || o === "inward"
                var parts = two ? [[0, 31, dl], [33, 31, dr]] : [[6, 52, o]]
                for (var i = 0; i < parts.length; i++)
                    Paint.paint(ctx, { keep: true, ox: parts[i][0], oy: 0, width: parts[i][1], height: height, margin: 4,
                                       r: 0, ends: kind, dir: parts[i][2], edge: "", inner: "end", surface: "filled",
                                       fill: soft, fill2: "", line: "", lineWidth: 0 })
                return
            }
            var isEnds = root.key === "ends"
            // each tile shows only its own part: a surface with no lines, lines over a
            // faint surface, an ornament on a plain one
            var surface = root.key === "surface" ? root.opt : (root.key === "lines" ? "faint" : "filled")
            var lines = root.key === "lines" ? root.opt : "none"
            var orn = root.key === "ornaments" ? root.opt : "none"
            Paint.paint(ctx, {
                keep: true, ox: 0, oy: 0, width: width, height: height, margin: 4,
                r: isEnds ? (root.opt === "capsule" ? 9 : (root.opt === "square" ? 0 : 5)) : 5,
                ends: isEnds ? root.opt : "rounded", edge: "", inner: "end",
                dir: pointing === "outward" || pointing === "inward" ? "right" : pointing,
                surface: surface, lines: lines, ornament: orn,
                // a see-through surface shows faintly, the rest in the tile's color
                fill: fillOf(surface) < 0.2 ? Qt.rgba(soft.r, soft.g, soft.b, 0.2)
                    : (fillOf(surface) < 1 ? Qt.rgba(soft.r, soft.g, soft.b, 0.5) : soft),
                fill2: "",
                line: lines !== "none" ? ink : "",
                lineWidth: lines !== "none" ? 1.5 : 0,
                frost: Qt.rgba(1, 1, 1, 0.22), key: Qt.rgba(soft.r * 0.55, soft.g * 0.55, soft.b * 0.55, 1),
                light: Qt.rgba(1, 1, 1, 0.22), dark: Qt.rgba(0, 0, 0, 0.35), patternColor: Qt.rgba(ink.r, ink.g, ink.b, 0.12),
                splitColor: Qt.rgba(ink.r, ink.g, ink.b, 0.55), head: ink,
                frameColors: [Qt.rgba(ink.r * 0.45 + 0.55, ink.g * 0.45 + 0.55, ink.b * 0.45 + 0.55, 1).toString(), ink.toString(),
                              Qt.rgba(ink.r * 0.55, ink.g * 0.55, ink.b * 0.55, 1).toString(),
                              Qt.rgba(ink.r * 0.7 + 0.3, ink.g * 0.7 + 0.3, ink.b * 0.7 + 0.3, 1).toString()], velvetSheen: Qt.rgba(soft.r * 0.6 + ink.r * 0.4, soft.g * 0.6 + ink.g * 0.4, soft.b * 0.6 + ink.b * 0.4, 1),
                metal: [Qt.rgba(1, 1, 1, 0.5).toString(), soft.toString(), Qt.rgba(soft.r * 0.6, soft.g * 0.6, soft.b * 0.6, 1).toString(),
                        Qt.rgba(1, 1, 1, 0.3).toString()],
                second: Qt.rgba(ink.r, ink.g, ink.b, 0.55), railSide: "windows",
                mark: ink, markWidth: 2, bracket: 6,
                shadow: lines === "glow" || lines === "neon" ? ink : (ownShadow(surface) ? Qt.rgba(0, 0, 0, 0.8) : ""),
                shadowBlur: lines === "glow" || lines === "neon" ? 6 : (ownShadow(surface) ? 7 : 0)
            })
            if ((root.key === "surface" && noFill(surface)) || (root.key !== "surface" && root.opt === "none" && !isEnds)) {
                ctx.fillStyle = Qt.rgba(ink.r, ink.g, ink.b, 0.5)
                for (var i = 0; i < 3; i++) ctx.fillRect(14 + i * 14, 12, 6, 2)
            }
        }
    }

    // spacing
    Row {
        visible: root.key === "density"
        anchors.centerIn: parent
        spacing: root.opt === "compact" ? 2 : (root.opt === "spacious" ? 9 : 5)
        Repeater { model: 4; Rectangle { width: 9; height: 2; radius: 1; y: 16; color: root.ink } }
    }

    // open as
    Item {
        visible: root.key === "openAs"
        anchors.fill: parent
        Rectangle { x: 6; y: 6; width: 60; height: 5; radius: 2; color: root.soft }
        Rectangle {
            x: root.opt === "panel" ? 12 : 22
            y: root.opt === "panel" ? 12 : 16
            width: 28; height: 22; radius: 3
            color: root.ink
        }
    }
}
