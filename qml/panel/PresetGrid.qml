import QtQuick
import QtQuick.Layouts
import "../js/Schema.js" as Schema
import "../js/Paint.js" as Paint
import "../js/parts/Surfaces.js" as Surfaces
import "../controls"

// "Start from a look": a tile per ready made look, each with a tiny bar drawn the
// way that look draws it. Clicking one sets everything it names at once.
ColumnLayout {
    id: root

    property var svc: null
    readonly property var ui: svc ? svc.ui : null
    property string label: ""
    property string hint: ""
    spacing: ui.px(10)

    // is this look what the bar shows right now?
    function current(p) {
        if (!root.svc) return false
        var c = root.svc.cfg
        for (var k in p.set) if (c[k] !== p.set[k]) return false
        return true
    }

    // a see-through surface (Faint) shows faintly in the little pictures too
    function faintFill(key) {
        var e = Surfaces.byKey[key]
        return e !== undefined && typeof e.fill === "number" && e.fill < 0.2 && e.noFill !== true
    }

    RowLayout {
        Layout.fillWidth: true
        Txt { ui: root.ui; Layout.fillWidth: true; text: root.label; font.pixelSize: ui.fs(12); font.weight: Font.DemiBold }
        Btn {
            ui: root.ui
            visible: root.svc !== null && root.svc.canUndo
            text: "Undo the last look"
            onClicked: root.svc.undoLook()
        }
    }
    Txt {
        ui: root.ui
        Layout.fillWidth: true
        visible: root.hint !== ""
        text: root.hint
        wrapMode: Text.WordWrap
        font.pixelSize: ui.fs(10)
        opacity: 0.55
    }

    GridLayout {
        Layout.fillWidth: true
        columns: 4
        columnSpacing: ui.px(8)
        rowSpacing: ui.px(8)

        Repeater {
            model: Schema.presets
            delegate: Rectangle {
                id: tile
                required property var modelData
                readonly property bool on: root.current(modelData)
                Layout.fillWidth: true
                Layout.preferredWidth: 1
                Layout.preferredHeight: ui.px(62)
                radius: ui.r(1.4)
                color: on ? ui.accentTint(0.16) : ui.tint(area.containsMouse ? 0.09 : 0.04)
                border.width: on ? 1.5 : 1
                border.color: on ? ui.accent : ui.tint(0.08)

                Canvas {
                    id: art
                    anchors.horizontalCenter: parent.horizontalCenter
                    y: ui.px(8)
                    width: 76
                    height: 26
                    readonly property var look: tile.modelData.set
                    readonly property color bg: root.ui ? root.ui.surface : "black"
                    readonly property color ac: root.ui ? root.ui.accent : "white"
                    readonly property color fg: root.ui ? root.ui.fg : "white"
                    onBgChanged: requestPaint()
                    onAcChanged: requestPaint()
                    Component.onCompleted: requestPaint()
                    onPaint: {
                        var ctx = getContext("2d")
                        ctx.reset()
                        // the desktop and a window under the bar
                        ctx.fillStyle = Qt.rgba(fg.r, fg.g, fg.b, 0.05)
                        ctx.fillRect(0, 0, width, height)
                        ctx.fillStyle = Qt.rgba(fg.r, fg.g, fg.b, 0.07)
                        ctx.fillRect(6, 15, width - 12, height - 17)

                        var shape = look.shape || "islands"
                        var spans = shape === "full" ? [[0, 76]] : shape === "pill" ? [[4, 68]]
                                  : shape === "islands" ? [[4, 18], [29, 18], [54, 18]]
                                  : [[4, 9], [15, 9], [30, 16], [51, 9], [62, 10]]
                        var surface = look.surface || "filled"
                        var attached = look.attach === true && shape !== "full"
                        var th = shape === "full" ? 10 : 8
                        var top = shape === "full" || attached ? 0 : 3
                        var h = attached ? 11 : th
                        var mono = look.colorMode === "monochrome"
                        var base = mono ? Qt.rgba(0.15, 0.15, 0.15, 1) : bg
                        var mark = mono ? fg : ac
                        var palette = root.svc && root.svc.themePalette ? root.svc.themePalette : []
                        for (var i = 0; i < spans.length; i++) {
                            var mine = look.colorMode === "palette" && palette.length > 0 ? Qt.color(palette[i % palette.length]) : mark
                            var lines = look.lines || "none"
                            // subtle lines are too faint to see this small, so they show as none
                            var lw = lines !== "none" && (lines !== "solid" || look.border !== "subtle") ? 1 : 0
                            Paint.paint(ctx, {
                                keep: true, ox: spans[i][0] - 2, oy: top - (attached ? 0 : 2),
                                width: spans[i][1] + 4, height: h + (attached ? 2 : 4), margin: 2,
                                r: look.ends === "capsule" ? 6 : ((look.ends || "rounded") === "rounded" ? 3 : 0),
                                ends: shape === "full" ? "square" : (look.ends || "rounded"),
                                dir: look.pointing === "outward" ? (i === 0 ? "left" : (i === spans.length - 1 ? "right" : "both"))
                                   : look.pointing === "inward" ? (i === 0 ? "right" : (i === spans.length - 1 ? "left" : "both"))
                                   : (look.pointing || "right"),
                                edge: attached ? "start" : "", concave: attached && look.concave !== false,
                                inner: "end", surface: surface, lines: lw > 0 || lines === "rail" || lines === "gilded" || lines === "glitch" ? lines : "none",
                                ornament: look.ornaments || "none",
                                fill: Qt.rgba(base.r, base.g, base.b, faintFill(surface) ? 0.25 : (look.fill === "glass" ? 0.6 : 1)).toString(),
                                fill2: look.fill === "gradient" ? Qt.rgba((base.r + mine.r) / 2, (base.g + mine.g) / 2, (base.b + mine.b) / 2, 1).toString() : "",
                                line: lw > 0 ? Qt.rgba(mine.r, mine.g, mine.b, 0.85).toString() : "", lineWidth: lw,
                                mark: Qt.rgba(mine.r, mine.g, mine.b, 1).toString(), markWidth: 1, bracket: 3,
                                lineGrad: look.outlineGradient && lw > 0 ? [Qt.rgba(mine.r, mine.g, mine.b, 0.9).toString(),
                                          Qt.rgba(mine.r * 0.45 + 0.55, mine.g * 0.45 + 0.55, mine.b * 0.45 + 0.55, 1).toString()] : [],
                                lineAngle: 0,
                                second: Qt.rgba((base.r + mine.r) / 2, (base.g + mine.g) / 2, (base.b + mine.b) / 2, 1).toString(),
                                splitColor: Qt.rgba((base.r + mine.r) / 2, (base.g + mine.g) / 2, (base.b + mine.b) / 2, 1).toString(),
                                head: Qt.rgba(mine.r, mine.g, mine.b, 1).toString(),
                                frameColors: [Qt.rgba(mine.r * 0.45 + 0.55, mine.g * 0.45 + 0.55, mine.b * 0.45 + 0.55, 1).toString(),
                                              Qt.rgba(mine.r, mine.g, mine.b, 1).toString(),
                                              Qt.rgba(mine.r * 0.55, mine.g * 0.55, mine.b * 0.55, 1).toString(),
                                              Qt.rgba(mine.r * 0.7 + 0.3, mine.g * 0.7 + 0.3, mine.b * 0.7 + 0.3, 1).toString()],
                                velvetSheen: Qt.rgba(base.r * 0.7 + mine.r * 0.3, base.g * 0.7 + mine.g * 0.3, base.b * 0.7 + mine.b * 0.3, 1).toString(),
                                light: "rgba(255,255,255,0.25)", dark: "rgba(0,0,0,0.35)",
                                metal: [Qt.rgba(base.r * 0.5 + 0.5, base.g * 0.5 + 0.5, base.b * 0.5 + 0.5, 1).toString(), base.toString(),
                                        Qt.rgba(base.r * 0.6, base.g * 0.6, base.b * 0.6, 1).toString(),
                                        Qt.rgba(base.r * 0.8 + 0.2, base.g * 0.8 + 0.2, base.b * 0.8 + 0.2, 1).toString()]
                            })
                        }
                        if (look.edgeLine) {
                            ctx.fillStyle = Qt.rgba(ac.r, ac.g, ac.b, 1)
                            ctx.fillRect(0, 9, width, 1)
                        }
                    }
                }
                Txt {
                    ui: root.ui
                    anchors.horizontalCenter: parent.horizontalCenter
                    anchors.bottom: parent.bottom
                    anchors.bottomMargin: ui.px(7)
                    text: tile.modelData.label
                    font.pixelSize: ui.fs(10)
                    font.weight: tile.on ? Font.DemiBold : Font.Normal
                    opacity: tile.on ? 1 : 0.75
                }
                MouseArea {
                    id: area
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: root.svc.applyPreset(tile.modelData.key)
                }
            }
        }
    }
}
