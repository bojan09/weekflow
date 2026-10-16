import { BACKGROUND_IDS } from "@/theme/backgrounds";
import { ACCENT_IDS } from "@/theme/generated/palettes";
import { DEFAULT_ACCENT } from "@/theme/palettes";

export const PREFS_STORAGE_KEY = "weekflow:prefs";

/**
 * Inline script that runs while the HTML is parsed, before first paint, so the
 * saved theme/accent/background are applied without a flash. Every value read
 * from storage is checked against an allow-list before it touches the DOM.
 * Kept in sync with applyPrefs() (covered by a test).
 */
export function bootScript(): string {
  return `(function(){try{
var d=document.documentElement;
var raw=localStorage.getItem(${JSON.stringify(PREFS_STORAGE_KEY)});
var s=raw?JSON.parse(raw):null;
var p=(s&&s.state&&s.state.prefs)||{};
var a=p.appearance||{};var x=p.accessibility||{};
function pick(v,list,fb){return list.indexOf(v)>-1?v:fb}
var theme=pick(a.theme,["light","dark","system"],"system");
var dark=theme==="dark"||(theme==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
d.classList.toggle("dark",dark);
d.setAttribute("data-accent",pick(a.accent,${JSON.stringify(ACCENT_IDS)},${JSON.stringify(DEFAULT_ACCENT)}));
d.setAttribute("data-bg",pick(a.background,${JSON.stringify(BACKGROUND_IDS)},"default"));
d.setAttribute("data-density",pick(a.density,["comfortable","compact"],"comfortable"));
d.setAttribute("data-glass",pick(a.glass,["off","subtle","frosted"],"off"));
d.setAttribute("data-sidebar",pick(a.sidebar,["navy","light","accent","theme"],"navy"));
d.setAttribute("data-motion",pick(x.motion,["system","reduce","full"],"system"));
d.style.fontSize=pick(x.textScale,[100,110,125],100)+"%";
}catch(e){}})();`;
}
