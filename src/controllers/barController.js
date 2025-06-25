// src/controllers/barController.js
const {
  getBarsFromGoogleMaps,
  getPlaceDetailsFromGoogleApi,
} = require("../services/googleMaps");
const db = require("../config/db");
const { barsTable, userBarCollectionTable } = require("../models/schema");
const { eq, and, inArray, sql } = require("drizzle-orm");

// 移除 formatPriceRange 輔助函數，因為不再處理價格相關顯示

// MODIFIED: syncBarFromGoogle - 不再處理 priceLevel
async function syncBarFromGoogle(barData) {
  const {
    place_id,
    name,
    address,
    latitude,
    longitude,
    imageUrl,
    rating,
    reviews,
    website,
    openingHoursText,
    tags,
  } = barData;

  if (!place_id) {
    console.error("Missing place_id for bar synchronization.");
    return null;
  }

  try {
    const existingBar = await db
      .select()
      .from(barsTable)
      .where(eq(barsTable.googlePlaceId, place_id))
      .limit(1);

    let resultBar;
    if (existingBar.length > 0) {
      [resultBar] = await db
        .update(barsTable)
        .set({
          name,
          address,
          latitude,
          longitude,
          imageUrl,
          rating,
          reviews,
          // 移除 priceLevel
          phone,
          website,
          openingHoursText,
          tags,
          updatedAt: new Date(),
        })
        .where(eq(barsTable.id, existingBar[0].id))
        .returning();
    } else {
      [resultBar] = await db
        .insert(barsTable)
        .values({
          googlePlaceId: place_id,
          name,
          address,
          latitude,
          longitude,
          imageUrl,
          rating,
          reviews,
          website,
          openingHoursText,
          tags,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
    }
    return resultBar;
  } catch (err) {
    console.error("Error syncing bar from Google to DB:", err);
    throw err;
  }
}

// MODIFIED: getBars - 不再選擇 priceLevel 和 priceRange
const getBars = async (req, res) => {
  try {
    const location = { lat: 24.986064, lng: 121.536762 };
    const query = req.query.query || "酒吧";

    const googleDetailedBars = await getBarsFromGoogleMaps(query, location);

    const syncPromises = googleDetailedBars.map((bar) =>
      syncBarFromGoogle(bar)
    );
    const syncResults = await Promise.allSettled(syncPromises);

    const syncedBarIds = syncResults
      .filter((result) => result.status === "fulfilled" && result.value)
      .map((result) => result.value.id);

    if (syncedBarIds.length === 0) {
      return res
        .status(404)
        .json({ message: "沒有酒吧數據可供顯示或同步失敗。" });
    }

    const finalBars = await db
      .select({
        id: barsTable.id,
        googlePlaceId: barsTable.googlePlaceId,
        name: barsTable.name,
        address: barsTable.address,
        latitude: barsTable.latitude,
        longitude: barsTable.longitude,
        imageUrl: barsTable.imageUrl,
        rating: barsTable.rating,
        reviews: barsTable.reviews,
        website: barsTable.website,
        openingHoursText: barsTable.openingHoursText,
        tags: barsTable.tags,
      })
      .from(barsTable)
      .where(inArray(barsTable.id, syncedBarIds))
      .orderBy(barsTable.name);

    if (finalBars.length === 0) {
      return res.status(404).json({ message: "目前沒有可用的酒吧資訊" });
    }

    res.json({ bars: finalBars });
  } catch (error) {
    console.error("Error in getBars controller:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// MODIFIED: createBar - 不再處理 priceLevel
const createBar = async (req, res) => {
  const {
    googlePlaceId,
    name,
    address,
    latitude,
    longitude,
    imageUrl,
    rating,
    reviews,
    website,
    openingHoursText,
    tags,
  } = req.body;

  if (!name || !address || !googlePlaceId) {
    return res
      .status(400)
      .json({ message: "酒吧名稱、地址和 Google Place ID 為必填項目" });
  }

  try {
    const existingBar = await db
      .select()
      .from(barsTable)
      .where(eq(barsTable.googlePlaceId, googlePlaceId))
      .limit(1);

    if (existingBar.length > 0) {
      return res.status(409).json({
        message: "該 Google Place ID 的酒吧已存在",
        bar: existingBar[0],
      });
    }

    const [newBar] = await db
      .insert(barsTable)
      .values({
        googlePlaceId,
        name,
        address,
        latitude,
        longitude,
        imageUrl,
        rating,
        reviews,
        website,
        openingHoursText,
        tags,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json({ message: "酒吧新增成功", bar: newBar });
  } catch (error) {
    console.error("Error creating bar:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

module.exports = { getBars, createBar, syncBarFromGoogle };
