import QtQuick
import Quickshell
import qs.Commons
import qs.Ui
import "deco"

// bar button + the shapes behind the bar.
// left click = settings, right click = next shape, middle click = Baroque on / off.
// all state lives in the service so every screen draws the same thing
BarWidget {
    id: root

    moduleName: "io.github.qempexe.baroque"

    // service can show up a bit after the bar, so keep asking
    property var svc: null
    function lookup() {
        if (svc) return
        try {
            if (bar && bar.shell && typeof bar.shell.serviceFor === "function")
                svc = bar.shell.serviceFor(moduleName)
        } catch (e) { svc = null }
    }
    onBarChanged: { lookup(); injectPanel() }
    onSvcChanged: injectPanel()
    Timer {
        interval: 250
        repeat: true
        running: root.svc === null
        onTriggered: root.lookup()
    }

    readonly property var ux: svc ? svc.ui : null
    readonly property var cfg: svc ? svc.cfg : null

    // button: an icon, your text, or nothing at all (the shapes still draw)
    visible: !cfg || cfg.barButton !== "hidden"
    readonly property string label: !cfg ? "󰕮" : (cfg.barButton === "text" ? (cfg.barText.trim() !== "" ? cfg.barText : "Baroque") : "󰕮")
    readonly property var shapeNames: ({ full: "Full width", pill: "One pill", islands: "Islands", widgets: "Widget pills" })
    readonly property string tooltip: !cfg ? "Baroque"
        : "Baroque: " + (cfg.enabled ? shapeNames[cfg.shape] : "off")
          + "\nLeft click settings" + root.clickTip("right", cfg.rightClick) + root.clickTip("middle", cfg.middleClick)
    function clickTip(which, what) {
        var name = { shape: "next shape", look: "next look", toggle: "on/off" }[what]
        return name ? " · " + which + " click " + name : ""
    }

    // panel / popped out window
    property bool userPicked: false
    readonly property bool popped: ux ? ux.popped : false

    readonly property bool panelOpened: panelLoader.item ? panelLoader.item.opened === true : false
    readonly property bool windowShown: windowLoader.item ? windowLoader.item.visible === true : false
    readonly property bool opened: panelOpened

    function setPopped(v) { if (ux) ux.popped = v }

    // "open as" wins until someone uses pop out / dock in the header
    function chooseMode() {
        if (userPicked || !cfg) return
        var want = cfg.openAs === "window"
        if (want === popped) return
        if (windowShown) hideWindow()
        if (panelOpened) closePanel()
        setPopped(want)
    }

    property bool windowRequested: false
    function showWindow() {
        windowRequested = true
        if (windowLoader.item) windowLoader.item.visible = true
    }
    function hideWindow() {
        if (windowLoader.item) windowLoader.item.visible = false
        windowRequested = false
    }

    // hyprland closed it on us -> forget it so the next click makes a new one
    Connections {
        target: windowLoader.item
        ignoreUnknownSignals: true
        function onVisibleChanged() {
            if (windowLoader.item && !windowLoader.item.visible && root.windowRequested)
                root.windowRequested = false
        }
    }

    // panel failed to show? open it as a window instead of doing nothing (reason goes to the log)
    property bool wantPanel: false
    function fallbackToWindow(reason) {
        console.warn("Baroque: " + reason + "; opening as a window instead")
        wantPanel = false
        panelCheck.stop()
        setPopped(true)
        showWindow()
    }

    function openPanel() {
        if (panelLoader.status === Loader.Error || !panelLoader.item) {
            fallbackToWindow("Panel.qml is not loaded (status " + panelLoader.status + ")")
            return
        }
        injectPanel()
        wantPanel = true
        panelLoader.item.open()
        panelCheck.restart()
    }
    function closePanel() {
        wantPanel = false
        panelCheck.stop()
        if (panelLoader.item) panelLoader.item.close()
    }

    function open() {
        if (!svc) { lookup(); if (!svc) return }
        chooseMode()
        if (popped) showWindow()
        else openPanel()
    }
    function close() {
        closePanel()
        hideWindow()
    }
    function toggle() {
        if (!svc) { lookup(); if (!svc) return }
        if (ux) ux.host = root
        chooseMode()
        if (popped) {
            if (windowShown) hideWindow()
            else showWindow()
        } else if (panelOpened) {
            closePanel()
        } else if (!(panelLoader.item && panelLoader.item.justClosedByGrab === true)) {
            openPanel()
        }
    }
    function popOut() {
        userPicked = true
        setPopped(true)
        closePanel()
        showWindow()
    }
    function dock() {
        userPicked = true
        hideWindow()
        setPopped(false)
        Qt.callLater(root.openPanel)
    }
    function showTab(name) {
        if (ux) ux.tabName = name
        if (!opened && !windowShown) open()
    }

    onPanelOpenedChanged: if (panelOpened) { wantPanel = false; panelCheck.stop() }

    Timer {
        id: panelCheck
        interval: 600
        onTriggered: if (root.wantPanel && !root.panelOpened && !root.popped)
            root.fallbackToWindow("the panel did not open")
    }

    // header buttons -> whichever bar button owns the panel
    Connections {
        target: root.ux
        ignoreUnknownSignals: true
        function onPopOutRequested() { if (root.panelOpened || root.windowShown) root.popOut() }
        function onDockRequested() { if (root.panelOpened || root.windowShown) root.dock() }
        function onCloseRequested() { root.close() }
        // first button to hear it takes it, so several bars don't all open a panel
        function onTabRequested(name, toggle) {
            if (!root.ux.host) root.ux.host = root
            if (root.ux.host !== root) return
            var shown = root.panelOpened || root.windowShown
            if (toggle && shown && root.ux.tabName === name) root.close()
            else root.showTab(name)
        }
    }

    function injectPanel() {
        if (!panelLoader.item) return
        panelLoader.item.bar = root.bar
        panelLoader.item.anchorItem = button
        panelLoader.item.hostWidget = root
        panelLoader.item.svc = root.svc
    }

    implicitWidth: button.implicitWidth
    implicitHeight: button.implicitHeight

    Loader {
        id: panelLoader
        active: true
        source: Qt.resolvedUrl("panel/Panel.qml")
        onLoaded: {
            root.injectPanel()
            Qt.callLater(root.injectPanel)
        }
        onStatusChanged: if (status === Loader.Error)
            console.warn("Baroque: Panel.qml failed to load; check the shell log for the QML error")
    }

    Loader {
        id: windowLoader
        active: root.windowRequested
        source: Qt.resolvedUrl("panel/PopoutWindow.qml")
        onLoaded: {
            item.svc = root.svc
            item.visible = root.windowRequested
        }
        onStatusChanged: if (status === Loader.Error)
            console.warn("Baroque: PopoutWindow.qml failed to load; check the shell log for the QML error")
    }

    // what a right or a middle click does, from the Panel settings
    function act(what) {
        if (!root.svc) return
        if (what === "shape") root.svc.nextShape()
        else if (what === "look") root.svc.nextLook()
        else if (what === "toggle") root.svc.setValue("enabled", !root.cfg.enabled)
    }

    // the shapes, for the bar window this button is in
    Decorator {
        anchorItem: root
        bar: root.bar
        svc: root.svc
    }

    WidgetButton {
        id: button
        anchors.fill: parent
        bar: root.bar
        text: root.label
        tooltipText: root.tooltip
        onPressed: function(buttonCode) {
            if (buttonCode === Qt.LeftButton) root.toggle()
            else if (buttonCode === Qt.RightButton && root.svc) root.act(root.cfg.rightClick)
            else if (buttonCode === Qt.MiddleButton && root.svc) root.act(root.cfg.middleClick)
        }
    }
}
