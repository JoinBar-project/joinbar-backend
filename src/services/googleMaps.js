const axios = require("axios");
require("dotenv").config({ path: "../.env" });

const GOOGLE_PLACES_API_BASE_URL =
  "https://maps.googleapis.com/maps/api/place/textsearch/json";

const getBarsFromGoogleMaps = async (query, location, radius = 5000) => {
  try {
    const response = await axios.get(GOOGLE_PLACES_API_BASE_URL, {
      params: {
        query: query,
        location: `${location.lat},${location.lng}`,
        radius: radius,
        type: "bar",
        language: "zh-TW",
        key: process.env.VITE_Maps_API_KEY,
      },
      timeout: 2000,
    });

    if (
      response.data.status !== "OK" &&
      response.data.status !== "ZERO_RESULTS"
    ) {
      console.error("Google Places API Error Status:", response.data.status);
      console.error(
        "Google Places API Error Message:",
        response.data.error_message
      );
      throw new Error(
        `Google Places API returned status: ${response.data.status}`
      );
    }

    const barsData = response.data.results.map((place) => ({
      name: place.name,
      address: place.formatted_address || "",
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
    }));

    return barsData;
  } catch (error) {
    console.error(
      "Error fetching bars from Google Maps API with Axios:",
      error.response ? error.response.data : error.message
    );
    throw new Error("Failed to fetch bars from external Google Maps API.");
  }
};

module.exports = { getBarsFromGoogleMaps };
