// Minimal headless Chrome/Edge driver over the DevTools protocol, with
// isolated browser contexts (separate cookies/localStorage = separate "devices").
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function findBrowser() {
  return [
    process.env.BROWSER_PATH,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].find((p) => p && existsSync(p));
}

function connect(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    }
  });
  const ready = new Promise((r) => ws.addEventListener("open", r, { once: true }));
  const send = (method, params = {}) =>
    new Promise((r) => {
      const i = ++id;
      pending.set(i, r);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  return { ws, ready, send };
}

export async function launch({ shotsDir }) {
  const path = findBrowser();
  if (!path) throw new Error("No Chrome/Edge found. Set BROWSER_PATH.");
  const port = 9600 + Math.floor(Math.random() * 300);
  const proc = spawn(
    path,
    ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "imar-verify-"))}`, "about:blank"],
    { stdio: "ignore" },
  );
  let version;
  for (let i = 0; i < 50 && !version; i++) {
    try {
      version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    } catch {
      await sleep(200);
    }
  }
  const browser = connect(version.webSocketDebuggerUrl);
  await browser.ready;

  /** A new page in a fresh, isolated context (its own cookies + storage). */
  async function newDevice(name) {
    const { result: ctx } = await browser.send("Target.createBrowserContext", { disposeOnDetach: true });
    const { result: target } = await browser.send("Target.createTarget", { url: "about:blank", browserContextId: ctx.browserContextId });
    const page = connect(`ws://127.0.0.1:${port}/devtools/page/${target.targetId}`);
    await page.ready;
    const { send } = page;
    await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
    await send("Page.enable");

    const evaluate = async (expression) =>
      (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
    const hydrated = `(() => { const el = document.querySelector("header") ?? document.body; return document.readyState === "complete" && Object.keys(el).some((k) => k.startsWith("__reactFiber")); })()`;
    const settle = async () => {
      await sleep(400);
      for (let i = 0; i < 80 && !(await evaluate(hydrated)); i++) await sleep(250);
      await sleep(300);
    };
    const api = {
      name,
      evaluate,
      settle,
      async go(url) {
        await send("Page.navigate", { url });
        await settle();
      },
      path: () => evaluate("location.pathname + location.search"),
      text: () => evaluate("document.body.innerText"),
      async waitFor(pred, timeout = 20000) {
        const t = Date.now();
        while (Date.now() - t < timeout) {
          if (await pred()) return true;
          await sleep(300);
        }
        return false;
      },
      async waitText(s, timeout) {
        // Case-insensitive: innerText applies CSS text-transform (buttons are uppercase).
        const want = s.toLowerCase();
        return api.waitFor(async () => ((await api.text()) ?? "").replace(/’/g, "'").toLowerCase().includes(want), timeout);
      },
      fill: (sel, value) =>
        evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false;
          const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
          el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`),
      click: (sel) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`),
      clickText: (sel, label) =>
        evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find(e => e.textContent.trim().startsWith(${JSON.stringify(label)}));
          if (!el) return false; el.click(); return true; })()`),
      /** Attach local files to an <input type=file> (CDP), firing its change event. */
      async setFiles(sel, files) {
        const { result: doc } = await send("DOM.getDocument", { depth: 0 });
        const { result: node } = await send("DOM.querySelector", { nodeId: doc.root.nodeId, selector: sel });
        if (!node?.nodeId) return false;
        await send("DOM.setFileInputFiles", { nodeId: node.nodeId, files });
        return true;
      },
      bagLabel: () => evaluate("document.querySelector('a[aria-label^=\"Bag\"]')?.getAttribute('aria-label')"),
      async shot(file) {
        mkdirSync(shotsDir, { recursive: true });
        const s = await send("Page.captureScreenshot", { format: "png" });
        writeFileSync(join(shotsDir, `${file}.png`), Buffer.from(s.result.data, "base64"));
      },
    };
    return api;
  }

  return {
    newDevice,
    close() {
      browser.ws.close();
      proc.kill();
    },
  };
}
