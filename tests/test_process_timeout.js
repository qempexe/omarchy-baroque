// Exercise the process-group timeout wrapper used by the QML Process objects.
const assert = require("assert")
const fs = require("fs")
const { spawn } = require("child_process")
const os = require("os")
const path = require("path")

const settings = fs.readFileSync(path.join(__dirname, "../qml/core/SettingsStore.qml"), "utf8")
const service = fs.readFileSync(path.join(__dirname, "../qml/Service.qml"), "utf8")
assert.match(settings, /mkdir\.signal\(15\)/)
assert.match(settings, /root\.dirFailed = !root\.dirReady/)
assert.match(service, /opaqueProc\.signal\(15\)/)
assert.doesNotMatch(settings + service, /\.(?:kill)\(\)/)

const pidFile = path.join(os.tmpdir(), `baroque-timeout-${process.pid}`)
const wrapper = 'trap \'trap "" TERM; kill -TERM -- -$$; sleep 1; kill -KILL -- -$$\' TERM; sh -c \'echo $$ > "$1"; exec sleep 30\' sh "$1" & wait $!'
const proc = spawn("setsid", ["sh", "-c", wrapper, "sh", pidFile], { stdio: "ignore" })
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const gone = pid => {
  try {
    process.kill(pid, 0)
    const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8")
    return stat.split(" ")[2] === "Z"
  } catch (_) { return true }
}

;(async () => {
  try {
    for (let i = 0; i < 100 && !fs.existsSync(pidFile); i++) await wait(10)
    assert.ok(fs.existsSync(pidFile), "stalled helper started")
    const childPid = Number(fs.readFileSync(pidFile, "utf8"))
    process.kill(-proc.pid, "SIGTERM")
    const code = await new Promise(resolve => proc.once("exit", (c, signal) => resolve({ c, signal })))
    assert.ok(code.c !== null || code.signal, "wrapper exited after timeout signal")
    for (let i = 0; i < 100 && !gone(childPid); i++) await wait(10)
    assert.ok(gone(childPid), "stalled descendant was terminated")
    console.log("  ok   stalled helper timeout exits and cleans up its descendant")
  } finally {
    try { fs.unlinkSync(pidFile) } catch (_) { }
    try { process.kill(-proc.pid, "SIGKILL") } catch (_) { }
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
