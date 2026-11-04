import QtQuick
import QtQuick.Layouts
import Quickshell
import "../controls"

// The About tab: the logo, the version and a link to the other plugins, in the middle of the tab.
Item {
    id: root

    property var ui: null
    property var svc: null

    readonly property string version: svc && svc.version ? String(svc.version) : ""
    readonly property string moreUrl: "https://github.com/qempexe?tab=repositories&q=omarchy"
    // the height to center in: the whole tab when About is the only thing on show
    property real fill: 0

    implicitHeight: Math.max(block.implicitHeight, fill)

    ColumnLayout {
        id: block
        anchors.centerIn: parent
        spacing: ui.px(6)

        Image {
            Layout.alignment: Qt.AlignHCenter
            Layout.topMargin: ui.px(24)
            Layout.preferredWidth: ui.px(96)
            Layout.preferredHeight: ui.px(96)
            // the light logo on a dark panel, the dark one on a light panel
            source: Qt.resolvedUrl(root.ui.lightSurface ? "../../assets/logo-dark.png" : "../../assets/logo.png")
            sourceSize.width: 192
            sourceSize.height: 192
            smooth: true
            mipmap: true
        }

        Txt {
            ui: root.ui
            Layout.alignment: Qt.AlignHCenter
            Layout.topMargin: ui.px(8)
            text: "BAROQUE"
            font.pixelSize: ui.fs(19)
            font.weight: Font.DemiBold
            font.letterSpacing: 4
        }

        Txt {
            ui: root.ui
            Layout.alignment: Qt.AlignHCenter
            visible: root.version !== ""
            text: "Version " + root.version
            color: ui.accent
            font.pixelSize: ui.fs(11)
            font.letterSpacing: 1.5
        }

        Row {
            Layout.alignment: Qt.AlignHCenter
            Layout.topMargin: ui.px(12)
            Txt { ui: root.ui; text: "made with "; opacity: 0.75; font.pixelSize: ui.fs(12) }
            Text {   // the system font: the panel's font draws the heart as an outline
                textFormat: Text.PlainText
                text: "♥"
                color: ui.accent
                font.pixelSize: ui.fs(13)
                anchors.verticalCenter: parent.verticalCenter
            }
            Txt { ui: root.ui; text: " by qempexe"; opacity: 0.75; font.pixelSize: ui.fs(12) }
        }

        Rectangle {
            Layout.alignment: Qt.AlignHCenter
            Layout.topMargin: ui.px(10)
            Layout.bottomMargin: ui.px(24)
            implicitWidth: moreText.implicitWidth + ui.px(28)
            implicitHeight: ui.px(30)
            radius: ui.r(1.5)
            color: moreArea.containsMouse ? ui.accentTint(0.22) : ui.tint(0.07)
            border.width: 1
            border.color: ui.accentTint(moreArea.containsMouse ? 0.8 : 0.35)
            Behavior on color { enabled: ui.animations; ColorAnimation { duration: 100 } }

            Txt {
                id: moreText
                ui: root.ui
                anchors.centerIn: parent
                text: "Check out my other plugins ↗"
                font.pixelSize: ui.fs(11)
            }
            MouseArea {
                id: moreArea
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: Quickshell.execDetached(["xdg-open", root.moreUrl])
            }
        }
    }
}
