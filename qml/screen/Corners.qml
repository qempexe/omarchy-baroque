import QtQuick
import Quickshell
import Quickshell.Wayland
import qs.Commons

// Rounded screen corners and a frame around the screen.
// Corners: a small window in each corner, painting the area outside a quarter circle.
// Frame: a thin window along each edge.
// They all sit above everything, take no space and no clicks (empty input region).
Item {
    id: root

    property var svc: null
    readonly property var cfg: svc ? svc.cfg : null
    readonly property int size: cfg ? Math.max(4, Math.min(40, cfg.cornerSize)) : 14
    readonly property color paint: cfg && cfg.cornerColor === "bar" ? Color.bar.background : "black"
    readonly property bool cornersOn: cfg !== null && cfg.corners === true
    readonly property var cornerList: !cfg ? [] : cfg.cornerWhich === "top" ? ["tl", "tr"]
        : cfg.cornerWhich === "bottom" ? ["bl", "br"] : ["tl", "tr", "bl", "br"]
    readonly property bool frameOn: cfg !== null && cfg.screenFrame === true
    readonly property var borders: svc && svc.borderColors ? svc.borderColors : []
    readonly property bool frameGradient: cfg !== null && cfg.screenFrameColor === "border" && borders.length > 0
    readonly property color borderFirst: borders.length > 0 ? borders[0] : "black"
    readonly property color borderLast: borders.length > 0 ? borders[borders.length - 1] : "black"
    readonly property int frameWidth: cfg ? Math.max(1, Math.min(8, cfg.screenFrameWidth)) : 2
    readonly property color frameColor: !cfg ? "black"
        : cfg.screenFrameColor === "accent" || cfg.screenFrameColor === "border" ? (svc && svc.ui ? svc.ui.accent : Color.accent)
        : cfg.screenFrameColor === "bar" ? Color.bar.background : "black"

    Variants {
        model: Quickshell.screens

        delegate: Component {
            Scope {
                id: perScreen
                required property var modelData

                // the frame: one thin window per edge
                Variants {
                    model: root.frameOn ? ["top", "bottom", "left", "right"] : []
                    delegate: Component { PanelWindow {
                        id: edge
                        required property var modelData
                        screen: perScreen.modelData
                        anchors {
                            top: edge.modelData !== "bottom"
                            bottom: edge.modelData !== "top"
                            left: edge.modelData !== "right"
                            right: edge.modelData !== "left"
                        }
                        implicitWidth: root.frameWidth
                        implicitHeight: root.frameWidth
                        color: root.frameGradient ? "transparent" : root.frameColor
                        // "Window border": the theme's border gradient, running around the screen
                        Rectangle {
                            anchors.fill: parent
                            visible: root.frameGradient
                            gradient: Gradient {
                                orientation: edge.modelData === "top" || edge.modelData === "bottom" ? Gradient.Horizontal : Gradient.Vertical
                                GradientStop { position: 0; color: root.borderFirst }
                                GradientStop { position: 1; color: root.borderLast }
                            }
                        }
                        exclusionMode: ExclusionMode.Ignore
                        WlrLayershell.namespace: "baroque-frame"
                        WlrLayershell.layer: WlrLayer.Overlay
                        WlrLayershell.keyboardFocus: WlrKeyboardFocus.None
                        mask: Region {}
                    } }
                }

                Variants {
                    model: root.cornersOn ? root.cornerList : []
                    delegate: Component { PanelWindow {
                        id: corner
                        required property var modelData
                        screen: perScreen.modelData
                        anchors {
                            top: corner.modelData === "tl" || corner.modelData === "tr"
                            bottom: corner.modelData === "bl" || corner.modelData === "br"
                            left: corner.modelData === "tl" || corner.modelData === "bl"
                            right: corner.modelData === "tr" || corner.modelData === "br"
                        }
                        implicitWidth: root.size
                        implicitHeight: root.size
                        color: "transparent"
                        exclusionMode: ExclusionMode.Ignore
                        WlrLayershell.namespace: "baroque-corners"
                        WlrLayershell.layer: WlrLayer.Overlay
                        WlrLayershell.keyboardFocus: WlrKeyboardFocus.None
                        mask: Region {}

                        Canvas {
                            anchors.fill: parent
                            readonly property color c: root.paint
                            readonly property int s: root.size
                            onCChanged: requestPaint()
                            onSChanged: requestPaint()
                            onPaint: {
                                var ctx = getContext("2d")
                                ctx.reset()
                                var n = s
                                // fill the square, then cut out a circle centered on the
                                // square's inner corner: what's left is the rounded corner
                                var ox = corner.modelData === "tl" || corner.modelData === "bl" ? n : 0
                                var oy = corner.modelData === "tl" || corner.modelData === "tr" ? n : 0
                                ctx.fillStyle = Qt.rgba(c.r, c.g, c.b, 1)
                                ctx.fillRect(0, 0, n, n)
                                ctx.globalCompositeOperation = "destination-out"
                                ctx.beginPath()
                                ctx.arc(ox, oy, n, 0, Math.PI * 2, false)
                                ctx.fill()
                                ctx.globalCompositeOperation = "source-over"
                            }
                        }
                    } }
                }
            }
        }
    }
}
