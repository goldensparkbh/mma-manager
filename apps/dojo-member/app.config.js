/** Expo config — Google Maps keys for react-native-maps (no config plugin needed). */
import appJson from "./app.json";

const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  "";

// Local Expo dev → localhost API (with lat/lng). EAS builds use EXPO_PUBLIC_API_URL from eas.json.
const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  (process.env.EAS_BUILD === "true"
    ? appJson.expo.extra?.apiUrl
    : "http://localhost:3000");

export default {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      apiUrl,
    },
    ios: {
      ...appJson.expo.ios,
      config: {
        ...appJson.expo.ios?.config,
        googleMapsApiKey,
      },
    },
    android: {
      ...appJson.expo.android,
      config: {
        ...appJson.expo.android?.config,
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
  },
};
