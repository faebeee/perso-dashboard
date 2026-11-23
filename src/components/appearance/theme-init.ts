/**
 * Appearance basics shared with the inline boot script.
 * No imports: vite.config.ts reads this file.
 */

/** localStorage key for light / dark / system. */
export const COLOR_MODE_STORAGE_KEY = "theme";
/** localStorage key for the theme (Default, Technical…). */
export const APPEARANCE_STORAGE_KEY = "appearance";

export const APPEARANCE_IDS = [
	"default",
	"technical",
	"business",
	"dot",
] as const;
export type AppearanceId = (typeof APPEARANCE_IDS)[number];

/**
 * Inline script injected into index.html: applies the stored mode and
 * theme before first paint, so there's no flash of the wrong look.
 */
export const themeInitScript = `(function(){try{var d=document.documentElement;var t=localStorage.getItem("${COLOR_MODE_STORAGE_KEY}");d.classList.toggle("dark",t==="dark"||((!t||t==="system")&&matchMedia("(prefers-color-scheme: dark)").matches));var a=localStorage.getItem("${APPEARANCE_STORAGE_KEY}");if(${JSON.stringify(APPEARANCE_IDS)}.indexOf(a)>0)d.dataset.theme=a}catch(e){}})()`;
