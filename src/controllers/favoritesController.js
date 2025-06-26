// src/controllers/favoritesController.js
const db = require("../config/db");
const {
  userBarCollectionTable,
  barsTable,
  userBarFoldersTable,
} = require("../models/schema"); // 確保引入 userBarFoldersTable
const { eq, and } = require("drizzle-orm");
const { syncBarFromGoogle } = require("./barController");
const { getPlaceDetailsFromGoogleApi } = require("../services/googleMaps");

const ANONYMOUS_USER_ID = 1;

// 獲取收藏列表（結合資料庫和 Google API 資料）
const getFavorites = async (req, res) => {
  const userId = req.query.userId || ANONYMOUS_USER_ID;

  try {
    // 從資料庫獲取收藏的基本資訊
    const favorites = await db
      .select({
        id: userBarCollectionTable.id,
        barId: userBarCollectionTable.barId,
        userId: userBarCollectionTable.userId,
        folderId: userBarCollectionTable.folderId,
        createdAt: userBarCollectionTable.createdAt,
        googlePlaceId: barsTable.googlePlaceId,
        name: barsTable.name,
        address: barsTable.address,
        latitude: barsTable.latitude,
        longitude: barsTable.longitude,
      })
      .from(userBarCollectionTable)
      .leftJoin(barsTable, eq(userBarCollectionTable.barId, barsTable.id))
      .where(eq(userBarCollectionTable.userId, userId));

    // 批次從 Google API 獲取即時資料
    const detailPromises = favorites.map(async (fav) => {
      if (fav.googlePlaceId) {
        try {
          const googleData = await getPlaceDetailsFromGoogleApi(
            fav.googlePlaceId
          );
          return {
            ...fav,
            // 合併 Google API 的即時資料
            imageUrl: googleData?.imageUrl,
            rating: googleData?.rating,
            reviews: googleData?.reviews,
            website: googleData?.website,
            openingHoursText: googleData?.openingHoursText,
            tags: googleData?.tags || [],
          };
        } catch (error) {
          console.error(
            `Failed to fetch details for ${fav.googlePlaceId}:`,
            error
          );
          return fav; // 如果 API 失敗，返回基本資料
        }
      }
      return fav;
    });

    const favoritesWithDetails = await Promise.all(detailPromises);

    res.status(200).json({ favorites: favoritesWithDetails });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// 新增收藏
const addFavorite = async (req, res) => {
  const { barId, googlePlaceId, barData, folderId } = req.body; // 從 req.body 解構 folderId
  const userId = req.body.userId || ANONYMOUS_USER_ID;

  try {
    let finalBarId = barId;

    // 如果只有 googlePlaceId，需要先同步到資料庫
    if (!barId && googlePlaceId) {
      const existingBar = await db
        .select()
        .from(barsTable)
        .where(eq(barsTable.googlePlaceId, googlePlaceId))
        .limit(1);

      if (existingBar.length > 0) {
        finalBarId = existingBar[0].id;
      } else if (barData) {
        // 準備同步資料（只包含 schema 中有的欄位）
        const syncData = {
          place_id: googlePlaceId,
          name: barData.name,
          address: barData.address,
          latitude: barData.latitude,
          longitude: barData.longitude,
        };

        const syncedBar = await syncBarFromGoogle(syncData);
        if (syncedBar) {
          finalBarId = syncedBar.id;
        } else {
          return res.status(500).json({ message: "無法同步酒吧資料" });
        }
      } else {
        return res.status(400).json({ message: "缺少酒吧資料" });
      }
    }

    if (!finalBarId) {
      return res.status(400).json({ message: "無法確定酒吧 ID" });
    }

    // 檢查是否已經收藏
    const existingFavorite = await db
      .select()
      .from(userBarCollectionTable)
      .where(
        and(
          eq(userBarCollectionTable.userId, userId),
          eq(userBarCollectionTable.barId, finalBarId)
        )
      )
      .limit(1);

    if (existingFavorite.length > 0) {
      return res.status(200).json({
        message: "該酒吧已被收藏",
        favorite: existingFavorite[0],
        alreadyFavorited: true,
      });
    }

    // 新增收藏
    const [newFavorite] = await db
      .insert(userBarCollectionTable)
      .values({
        userId,
        barId: finalBarId,
        folderId: folderId || null, // 確保 folderId 要麼來自請求，要麼是 null
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json({
      message: "收藏成功",
      favorite: newFavorite,
    });
  } catch (error) {
    console.error("Error adding favorite:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// 移除收藏
const removeFavorite = async (req, res) => {
  const { barId } = req.params;
  const userId = req.query.userId || ANONYMOUS_USER_ID;

  if (!barId) {
    return res.status(400).json({ message: "Bar ID 為必填項目" });
  }

  try {
    const deletedFavorites = await db
      .delete(userBarCollectionTable)
      .where(
        and(
          eq(userBarCollectionTable.userId, userId),
          eq(userBarCollectionTable.barId, parseInt(barId))
        )
      )
      .returning();

    if (deletedFavorites.length === 0) {
      return res.status(404).json({ message: "未找到該收藏" });
    }

    res.status(200).json({ message: "收藏已移除" });
  } catch (error) {
    console.error("Error removing favorite:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// 新增 updateFavorite 函數
const updateFavorite = async (req, res) => {
  const { collectionId } = req.params; // 從路由參數獲取收藏 ID
  const userId = req.body.userId || ANONYMOUS_USER_ID; // 或從身份驗證獲取
  const { folderId } = req.body; // 獲取要更新的欄位，例如 folderId

  if (!collectionId) {
    return res.status(400).json({ message: "收藏 ID 為必填項目" });
  }

  try {
    // 檢查收藏是否存在且屬於該用戶
    const existingFavorite = await db
      .select()
      .from(userBarCollectionTable)
      .where(
        and(
          eq(userBarCollectionTable.id, parseInt(collectionId)), // 確保 ID 是整數
          eq(userBarCollectionTable.userId, userId)
        )
      )
      .limit(1);

    if (existingFavorite.length === 0) {
      return res.status(404).json({ message: "未找到該收藏或您無權修改" });
    }

    // 構建更新對象
    const updateData = {};
    if (folderId !== undefined) {
      // 只有當 folderId 被明確提供時才更新
      // 檢查提供的 folderId 是否存在於 userBarFoldersTable 中
      if (folderId !== null) {
        // 如果 folderId 不為 null，則驗證其存在性
        const existingFolder = await db
          .select()
          .from(userBarFoldersTable)
          .where(
            and(
              eq(userBarFoldersTable.id, folderId),
              eq(userBarFoldersTable.userId, userId) // 確保是該用戶的資料夾
            )
          )
          .limit(1);

        if (existingFolder.length === 0) {
          return res
            .status(400)
            .json({ message: "提供的資料夾 ID 不存在或不屬於該用戶" });
        }
      }
      updateData.folderId = folderId;
    }
    // 如果還有其他可更新的欄位，也可以在這裡添加

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "沒有提供要更新的內容" });
    }

    // 執行更新
    const [updatedFavorite] = await db
      .update(userBarCollectionTable)
      .set({
        ...updateData,
        updatedAt: new Date(), // 更新更新時間
      })
      .where(eq(userBarCollectionTable.id, parseInt(collectionId)))
      .returning();

    res
      .status(200)
      .json({ message: "收藏更新成功", favorite: updatedFavorite });
  } catch (error) {
    console.error("Error updating favorite:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

module.exports = { getFavorites, addFavorite, removeFavorite, updateFavorite };
