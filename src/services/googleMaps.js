const axios = require("axios");
require("dotenv").config({ path: "../.env" });

// 新增輔助函數：從 Google Place Details API 獲取詳細資訊
async function getPlaceDetailsFromGoogleApi(placeId) {
    try {
        const response = await axios.get(GOOGLE_PLACES_DETAILS_API_BASE_URL, {
            params: {
                place_id: placeId,
                fields: "name,formatted_address,geometry/location,rating,user_ratings_total,opening_hours,types,international_phone_number,website,price_level,photos", // 保持 price_level 查詢，但不在返回中
                language: "zh-TW",
                key: process.env.VITE_Maps_API_KEY,
            },
            timeout: 2000,
        });

        if (response.data.status !== "OK") {
            console.error("Google Place Details API Error Status:", response.data.status, "Place ID:", placeId);
            return null;
        }

        const detail = response.data.result;
        if (!detail) return null;

        const openingHoursText = detail.opening_hours?.weekday_text ? detail.opening_hours.weekday_text.join('\n') : null;

        return {
            place_id: placeId,
            name: detail.name,
            address: detail.formatted_address || "",
            latitude: detail.geometry?.location?.lat || null,
            longitude: detail.geometry?.location?.lng || null,
            imageUrl: detail.photos && detail.photos.length > 0
                ? detail.photos[0].getUrl({ maxWidth: 400, maxHeight: 400 })
                : null,
            rating: detail.rating || null,
            reviews: detail.user_ratings_total || null,
            // 移除 priceLevel 相關的返回
            phone: detail.international_phone_number || null,
            website: detail.website || null,
            openingHoursText: openingHoursText,
            tags: detail.types || [],
        };
    } catch (error) {
        console.error("Error fetching place details from Google Maps API:", error.response ? error.response.data : error.message);
        throw new Error("Failed to fetch place details from Google Maps API.");
    }
}

// MODIFIED: getBarsFromGoogleMaps - 現在會先 textsearch，然後對每個結果調用 Place Details API
const getBarsFromGoogleMaps = async (query, location, radius = 5000) => {
  try {
    const textSearchResponse = await axios.get(GOOGLE_PLACES_TEXTSEARCH_API_BASE_URL, {
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
      textSearchResponse.data.status !== "OK" &&
      textSearchResponse.data.status !== "ZERO_RESULTS"
    ) {
      console.error("Google Places TextSearch API Error Status:", textSearchResponse.data.status);
      console.error(
        "Google Places TextSearch API Error Message:",
        textSearchResponse.data.error_message
      );
      throw new Error(
        `Google Places TextSearch API returned status: ${textSearchResponse.data.status}`
      );
    }

    const placeIds = textSearchResponse.data.results.map(place => place.place_id);

    const detailPromises = placeIds.map(placeId => getPlaceDetailsFromGoogleApi(placeId));
    const detailedBars = await Promise.all(detailPromises);

    return detailedBars.filter(bar => bar !== null);

  } catch (error) {
    console.error(
      "Error in getBarsFromGoogleMaps (overall):",
      error.response ? error.response.data : error.message
    );
    throw new Error("Failed to fetch bars from Google Maps API.");
  }
};

module.exports = { getBarsFromGoogleMaps, getPlaceDetailsFromGoogleApi };