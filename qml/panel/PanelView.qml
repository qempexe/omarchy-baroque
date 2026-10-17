import QtQuick
import QtQuick.Layouts
import "../controls"

// the whole panel: header, the settings, footer.
// used by both the docked popup and the popped out window
Item {
    id: view

    property var svc: null
    property bool shown: false
    readonly property var ui: svc ? svc.ui : null
    readonly property var cfg: svc ? svc.cfg : null
    clip: true

    // popped out there's no shortcut for esc, so handle it here
    Keys.onEscapePressed: function(e) {
        if (ui.popped) { ui.closeRequested(); e.accepted = true }
        else e.accepted = false
    }

    readonly property var shapeNames: ({ full: "Full width", pill: "One pill", islands: "Islands", widgets: "Widget pills" })

    // background
    Rectangle {
        anchors.fill: parent
        radius: ui.r(3)
        color: ui.panelColor
    }
    Rectangle {   // optional accent wash (Panel tint, 0 by default)
        anchors.fill: parent
        radius: ui.r(3)
        visible: ui.tintPct > 0
        color: ui.accentTint(ui.tintPct / 100)
    }
    Rectangle {   // edge: a plain neutral line, or one color if "Window outline" is on
        anchors.fill: parent
        radius: ui.r(3)
        color: "transparent"
        visible: !ui.frameGradientOn
        border.width: 1
        border.color: ui.frameOn ? ui.frameColor : ui.tint(0.14)
        opacity: ui.frameOn ? 0.8 : 1
    }
    Canvas {      // edge in the theme's window border gradient, at its angle
        id: frameCanvas
        anchors.fill: parent
        visible: ui.frameGradientOn
        opacity: 0.85
        readonly property var stops: ui.borderColors
        readonly property real angle: ui.borderAngle
        readonly property real rad: ui.r(3)
        onStopsChanged: requestPaint()
        onAngleChanged: requestPaint()
        onRadChanged: requestPaint()
        onWidthChanged: requestPaint()
        onHeightChanged: requestPaint()
        onVisibleChanged: if (visible) requestPaint()
        onPaint: {
            var ctx = getContext("2d")
            ctx.reset()
            var n = stops.length
            if (!visible || n < 2 || width < 4 || height < 4) return
            var a = angle * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a)
            var half = (Math.abs(dx) * width + Math.abs(dy) * height) / 2
            var g = ctx.createLinearGradient(width / 2 - dx * half, height / 2 - dy * half, width / 2 + dx * half, height / 2 + dy * half)
            for (var i = 0; i < n; i++) g.addColorStop(i / (n - 1), stops[i])
            var r = Math.max(0, Math.min(rad, width / 2, height / 2)), x = 0.5, y = 0.5, w = width - 1, h = height - 1
            ctx.strokeStyle = g
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(x + r, y)
            ctx.arcTo(x + w, y, x + w, y + h, r)
            ctx.arcTo(x + w, y + h, x, y + h, r)
            ctx.arcTo(x, y + h, x, y, r)
            ctx.arcTo(x, y, x + w, y, r)
            ctx.closePath()
            ctx.stroke()
        }
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: ui.px(14)
        spacing: ui.px(12)

        // header
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: headerRow.implicitHeight + ui.px(24)
            radius: ui.r(2.5)
            color: ui.tint(0.05)
            border.width: 1
            border.color: ui.tint(0.08)

            RowLayout {
                id: headerRow
                anchors.fill: parent
                anchors.margins: ui.px(12)
                spacing: ui.px(10)

                Rectangle {   // badge: a tiny bar of three islands
                    Layout.alignment: Qt.AlignVCenter
                    implicitWidth: ui.px(30); implicitHeight: ui.px(30)
                    radius: ui.r(1.5)
                    color: ui.accentTint(0.18)
                    border.width: 1
                    border.color: ui.tint(0.08)
                    Row {
                        anchors.horizontalCenter: parent.horizontalCenter
                        y: ui.px(8)
                        spacing: 2
                        Repeater {
                            model: [5, 7, 5]
                            Rectangle { width: modelData; height: 4; radius: 2; color: index === 1 ? ui.accent : ui.tint(0.55) }
                        }
                    }
                    Rectangle {   // the line under the dots
                        anchors.horizontalCenter: parent.horizontalCenter
                        y: ui.px(19)
                        width: parent.width - ui.px(12); height: 1.5; radius: 1
                        color: ui.tint(0.3)
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    Layout.minimumWidth: 0
                    Layout.alignment: Qt.AlignVCenter
                    spacing: 2
                    Txt {
                        ui: view.ui
                        Layout.fillWidth: true
                        text: "Baroque"
                        font.pixelSize: ui.fs(13)
                        font.weight: Font.DemiBold
                        elide: Text.ElideRight
                    }
                    Txt {
                        ui: view.ui
                        Layout.fillWidth: true
                        font.pixelSize: ui.fs(11)
                        opacity: 0.6
                        elide: Text.ElideRight
                        text: !view.cfg ? "Starting…"
                            : !view.cfg.enabled ? "Off · the stock bar shows as it is"
                            : view.svc.status === "lost" ? "Can't find the bar's layout · showing the stock bar"
                            : view.svc.screens === 0 ? (view.shapeNames[view.cfg.shape] || "") + " · put Baroque on your bar to see it"
                            : (view.shapeNames[view.cfg.shape] || "") + " · on " + view.svc.screens + (view.svc.screens === 1 ? " screen" : " screens")
                    }
                }

                Btn {
                    ui: view.ui
                    Layout.alignment: Qt.AlignVCenter
                    kind: view.cfg && view.cfg.enabled ? "primary" : "normal"
                    text: view.cfg && view.cfg.enabled ? "On" : "Off"
                    onClicked: view.svc.setValue("enabled", !view.cfg.enabled)
                }
                Btn {
                    ui: view.ui
                    Layout.alignment: Qt.AlignVCenter
                    kind: settingsView.confirmReset ? "primary" : "normal"
                    text: settingsView.confirmReset ? "Really reset?" : "Reset all"
                    onClicked: settingsView.resetAll()
                }
                Btn {
                    ui: view.ui
                    Layout.alignment: Qt.AlignVCenter
                    text: ui.popped ? "Dock" : "Pop out"
                    onClicked: ui.popped ? ui.dockRequested() : ui.popOutRequested()
                }
                Btn { ui: view.ui; Layout.alignment: Qt.AlignVCenter; text: "×"; implicitWidth: ui.px(24); onClicked: ui.closeRequested() }
            }
        }

        // a heads-up when the stock bar is set to see-through: its widgets then
        // pick their text color for the wallpaper, not for the shapes
        Rectangle {
            Layout.fillWidth: true
            visible: view.svc !== null && view.svc.stockTransparent && view.cfg.enabled
            implicitHeight: warnRow.implicitHeight + ui.px(16)
            radius: ui.r(2)
            color: ui.accentTint(0.10)
            border.width: 1
            border.color: ui.accentTint(0.35)
            RowLayout {
                id: warnRow
                anchors.fill: parent
                anchors.margins: ui.px(8)
                spacing: ui.px(8)
                Txt {
                    ui: view.ui
                    Layout.fillWidth: true
                    wrapMode: Text.WordWrap
                    font.pixelSize: ui.fs(11)
                    text: "Your bar is set to transparent, so the widgets choose their text color for the wallpaper. Turn it off so they match the shapes."
                }
                Btn {
                    ui: view.ui
                    text: "Turn off"
                    onClicked: view.svc.stockOpaque()
                }
            }
        }

        // content
        Rectangle {
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.minimumHeight: 0
            radius: ui.r(2.5)
            color: ui.tint(0.035)
            border.width: 1
            border.color: ui.tint(0.07)
            clip: true

            SettingsView {
                id: settingsView
                objectName: "settingsView"
                anchors.fill: parent
                anchors.margins: ui.px(10)
                svc: view.svc
            }
        }

        // footer
        RowLayout {
            Layout.fillWidth: true
            spacing: ui.px(8)

            Rectangle {
                implicitWidth: escLabel.implicitWidth + ui.px(12)
                implicitHeight: ui.px(18)
                radius: ui.r(1)
                color: ui.tint(0.08)
                Txt { id: escLabel; ui: view.ui; anchors.centerIn: parent; text: "Esc"; font.pixelSize: ui.fs(10); opacity: 0.75 }
            }
            Txt { ui: view.ui; text: "close"; font.pixelSize: ui.fs(10); opacity: 0.45 }

            Txt {
                ui: view.ui
                Layout.fillWidth: true
                elide: Text.ElideRight
                font.pixelSize: ui.fs(10)
                opacity: 0.45
                text: settingsView.changed === 0 ? "All defaults"
                    : settingsView.changed === 1 ? "1 setting changed" : settingsView.changed + " settings changed"
            }
            Txt { ui: view.ui; text: "Alt+← →  groups  ·  changes show right away"; font.pixelSize: ui.fs(10); opacity: 0.45 }
        }
    }
}
