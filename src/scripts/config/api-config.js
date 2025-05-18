const API_CONFIG = {
  BASE_URL: "https://story-api.dicoding.dev/v1",
  ENDPOINTS: {
    REGISTER: "/register",
    LOGIN: "/login",
    STORIES: "/stories",
    GUEST_STORY: "/stories/guest",
    NOTIFICATIONS_SUBSCRIBE: "/notifications/subscribe",
  },
  DEFAULT_HEADERS: {
    "Content-Type": "application/json",
  },
  MAP: {
    DEFAULT_CENTER: [-6.2088, 106.8456],
    DEFAULT_ZOOM: 13,
    TILE_LAYER: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    ATTRIBUTION:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    SECONDARY_TILE_LAYER: {
      name: "Satellite",
      url: "https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
      attribution: "&copy; Google Maps",
      maxZoom: 20,
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
    },
  },
  WEB_PUSH: {
    VAPID_PUBLIC_KEY:
      "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk",
  },
};

export default API_CONFIG;
