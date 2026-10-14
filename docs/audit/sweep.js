/*
 * Weekflow audit sweep. Paste into the browser console on a running build (same origin), then:
 *
 *   await __sweep(["/demo/home", "/demo/tasks"], 375, { axe: true, scale: true, targets: true })
 *
 * For each url it loads the page in a hidden iframe of the given width and reports:
 *  - hscroll: horizontal overflow (and hscroll125 with scale: true, at 125% text)
 *  - dark / light: axe-core violations with the full default rule set (axe: true)
 *  - small: controls whose effective hit area is under 44px (targets: true)
 *  - title: the page title
 * Split long url lists into batches of about seven so each call stays under the tool time limit.
 */
window.__sweep = async function (urls, width, opts) {
  const axeSrc = await (await fetch("https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js")).text();
  const results = [];
  for (const url of urls) {
    const frame = document.createElement("iframe");
    frame.style.cssText = `position:fixed;left:-20000px;top:0;width:${width}px;height:900px;border:0`;
    document.body.appendChild(frame);
    await new Promise((res) => { frame.onload = res; frame.src = url; });
    await new Promise((r) => setTimeout(r, 1500));
    const win = frame.contentWindow, doc = frame.contentDocument;
    const style = doc.createElement("style");
    style.textContent = "*,*::before,*::after{transition:none!important;animation:none!important}";
    doc.head.appendChild(style);
    win.eval(axeSrc);
    const entry = { url, width, hscroll: doc.documentElement.scrollWidth > win.innerWidth, title: doc.title };
    if (opts.scale) {
      doc.documentElement.style.fontSize = "125%";
      await new Promise((r) => setTimeout(r, 200));
      entry.hscroll125 = doc.documentElement.scrollWidth > win.innerWidth;
      doc.documentElement.style.fontSize = "";
    }
    if (opts.axe) {
      for (const scheme of ["dark", "light"]) {
        doc.documentElement.classList.toggle("dark", scheme === "dark");
        await new Promise((r) => setTimeout(r, 120));
        const r = await win.axe.run(doc, { resultTypes: ["violations"] });
        entry[scheme] = r.violations.map((v) => `${v.id}:${v.nodes.length} ${v.nodes[0].target.join(" ").slice(0, 70)}`);
      }
    }
    if (opts.targets) {
      const small = [];
      doc.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=radio],[role=checkbox],[role=switch],summary').forEach((el) => {
        if (el.closest("[inert],[aria-hidden=true]") || el.closest(".sr-only")) return;
        let target = el;
        if (el.tagName === "INPUT" && el.labels && el.labels.length) target = el.labels[0];
        const rect = target.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const cs = win.getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none") return;
        if (el.tagName === "A" && cs.display === "inline" && el.parentElement && /^(P|LI|SPAN|DD)$/.test(el.parentElement.tagName)) return;
        let w = rect.width, h = rect.height;
        const pe = win.getComputedStyle(el, "::after");
        if (pe && pe.position === "absolute" && pe.content !== "none") {
          w = Math.max(w, parseFloat(pe.width) || 0);
          h = Math.max(h, parseFloat(pe.height) || 0);
        }
        if (el.getAttribute("role") === "switch") h = Math.max(h, rect.height + 28);
        if (w < 44 || h < 44) {
          small.push(`${el.tagName.toLowerCase()}${el.getAttribute("aria-label") ? `[${el.getAttribute("aria-label").slice(0, 26)}]` : ""}:${Math.round(w)}x${Math.round(h)} ${(el.textContent || "").trim().slice(0, 18)}`);
        }
      });
      entry.small = small;
    }
    results.push(entry);
    frame.remove();
  }
  return results;
};
