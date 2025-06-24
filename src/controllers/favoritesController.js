// src/controllers/favoritesController.js
const { db } = require("../drizzle/db");
const { userBarCollectionTable, barsTable } = require("../schema");
const { eq, and } = require("drizzle-orm");

const ANONYMOUS_USER_ID = 1;

// MODIFIED: getFavorites - 不再選擇 priceLevel
const getFavorites = async (req, res) => {
  const userId = req.query.userId || ANONYMOUS_USER_ID;

  try {
    const favorites = await db
      .select({
        id: userBarCollectionTable.id,
        barId: userBarCollectionTable.barId,
        userId: userBarCollectionTable.userId,
        folderId: userBarCollectionTable.folderId,
        createdAt: userBarCollectionTable.createdAt,
        name: barsTable.name,
        address: barsTable.address,
        latitude: barsTable.latitude,
        longitude: barsTable.longitude,
        imageUrl: barsTable.imageUrl,
        rating: barsTable.rating,
        reviews: barsTable.reviews,
        // 移除 priceLevel
        phone: barsTable.phone,
        website: barsTable.website,
        openingHoursText: barsTable.openingHoursText,
        tags: barsTable.tags,
        googlePlaceId: barsTable.googlePlaceId,
      })
      .from(userBarCollectionTable)
      .leftJoin(barsTable, eq(userBarCollectionTable.barId, barsTable.id))
      .where(eq(userBarCollectionTable.userId, userId));

    res.status(200).json({ favorites });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const addFavorite = async (req, res) => {
  const { barId } = req.body;
  const userId = req.body.userId || ANONYMOUS_USER_ID;

  if (!barId || !userId) {
    return res.status(400).json({ message: "Bar ID 和 User ID 為必填項目" });
  }

  try {
    const existingBarInBarsTable = await db
      .select()
      .from(barsTable)
      .where(eq(barsTable.id, barId))
      .limit(1);

    if (existingBarInBarsTable.length === 0) {
      return res.status(404).json({ message: "找不到對應的酒吧資訊，無法收藏。" });
    }

    const existingFavorite = await db
      .select()
      .from(userBarCollectionTable)
      .where(and(
        eq(userBarCollectionTable.userId, userId),
        eq(userBarCollectionTable.barId, barId)
      ));

    if (existingFavorite.length > 0) {
      return res.status(200).json({ message: "該酒吧已被收藏", favorite: existingFavorite[0] });
    }

    const [newFavorite] = await db
      .insert(userBarCollectionTable)
      .values({
        userId,
        barId,
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json({ message: "收藏成功", favorite: newFavorite });
  } catch (error) {
    console.error("Error adding favorite:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const removeFavorite = async (req, res) => {
  const { barId } = req.params;
  const userId = req.query.userId || ANONYMOUS_USER_ID;

  if (!barId || !userId) {
    return res.status(400).json({ message: "Bar ID 和 User ID 為必填項目" });
  }

  try {
    const deletedFavorites = await db
      .delete(userBarCollectionTable)
      .where(and(
        eq(userBarCollectionTable.userId, userId),
        eq(userBarCollectionTable.barId, barId)
      ))
      .returning();

    if (deletedFavorites.length === 0) {
      return res.status(404).json({ message: "未找到該收藏" });
    }

    res.status(200).json({ message: "收藏已移除" });
  } catch (error) {
    console.error("Error removing favorite:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

module.exports = { getFavorites, addFavorite, removeFavorite };