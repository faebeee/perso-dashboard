/** localStorage key for the theme preference. No imports: vite.config.ts reads this file. */
export const THEME_STORAGE_KEY = "theme";

/**
 * Inline script injected into index.html: applies the stored theme before
 * first paint so there's no flash of the wrong theme.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||((!t||t==="system")&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
