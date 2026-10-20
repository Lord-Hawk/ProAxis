/* The ONLY thing to edit in the web app: paste the "Web app URL" you get when you deploy backend/Code.gs. */
window.PROAXIS_CONFIG = {
  API_URL: "PASTE_WEB_APP_URL_HERE",
  OFFLINE_GRACE_DAYS: 3,      // the app opens without internet if it was verified this recently
  REFRESH_SECS: 150           // how often the lists (markets, counters, products ...) are re-read while the app is open
};
