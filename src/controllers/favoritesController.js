const db = require('../config/db');
const {
  userBarCollectionTable,
  barsTable,
  userBarFoldersTable,
} = require('../models/schema');
const { eq, and } = require('drizzle-orm');
const { syncBarFromGoogle } = require('./barController');
const { getPlaceDetailsFromGoogleApi } = require('../services/googleMaps');

const ANONYMOUS_USER_ID = 1;

// 獲取收藏列表
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
          return fav;
        }
      }
      return fav;
    });

    const favoritesWithDetails = await Promise.all(detailPromises);

    res.status(200).json({ favorites: favoritesWithDetails });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res
      .status(500)
      .json({ message: 'Internal server error', error: error.message });
  }
};

// 收藏處理
const toggleFavorite = async (req, res) => {
  const { barId } = req.params;
  const { isFavorite, googlePlaceId, barData, folderId } = req.body;
  const userId = req.body.userId || ANONYMOUS_USER_ID;

  if (typeof isFavorite !== 'boolean') {
    return res.status(400).json({ message: 'isFavorite 必須是布林值' });
  }

  try {
    let finalBarId = parseInt(barId);
    d;
    if (isNaN(finalBarId) || barId === 'google') {
      if (!googlePlaceId) {
        return res.status(400).json({ message: '需要提供 googlePlaceId' });
      }

      const existingBar = await db
        .select()
        .from(barsTable)
        .where(eq(barsTable.googlePlaceId, googlePlaceId))
        .limit(1);

      if (existingBar.length > 0) {
        finalBarId = existingBar[0].id;
      } else if (isFavorite && barData) {
        const syncData = {
          place_id: googlePlaceId,
          name: barData.name,
          address: barData.address,
          latitude: barData.latitude,
          longitude: barData.longitude,
          imageUrl: barData.imageUrl,
          rating: barData.rating,
          reviews: barData.reviews,
          website: barData.website,
          openingHoursText: barData.openingHoursText,
          tags: barData.tags,
        };

        const syncedBar = await syncBarFromGoogle(syncData);
        if (syncedBar) {
          finalBarId = syncedBar.id;
        } else {
          return res.status(500).json({ message: '無法同步酒吧資料' });
        }
      } else if (isFavorite) {
        return res.status(400).json({ message: '缺少酒吧資料' });
      } else {
        return res.status(200).json({
          message: '該酒吧未被收藏',
          isFavorite: false,
        });
      }
    }

    // 檢查收藏狀態
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

    if (isFavorite) {
      // 新增收藏
      if (existingFavorite.length > 0) {
        if (
          folderId !== undefined &&
          folderId !== existingFavorite[0].folderId
        ) {
          if (folderId !== null) {
            const existingFolder = await db
              .select()
              .from(userBarFoldersTable)
              .where(
                and(
                  eq(userBarFoldersTable.id, folderId),
                  eq(userBarFoldersTable.userId, userId)
                )
              )
              .limit(1);

            if (existingFolder.length === 0) {
              return res
                .status(400)
                .json({ message: '提供的資料夾 ID 不存在或不屬於該用戶' });
            }
          }

          const [updatedFavorite] = await db
            .update(userBarCollectionTable)
            .set({
              folderId: folderId,
            })
            .where(eq(userBarCollectionTable.id, existingFavorite[0].id))
            .returning();

          return res.status(200).json({
            message: '收藏資料夾已更新',
            favorite: updatedFavorite,
            isFavorite: true,
          });
        }

        return res.status(200).json({
          message: '該酒吧已被收藏',
          favorite: existingFavorite[0],
          isFavorite: true,
        });
      }

      if (folderId !== null && folderId !== undefined) {
        const existingFolder = await db
          .select()
          .from(userBarFoldersTable)
          .where(
            and(
              eq(userBarFoldersTable.id, folderId),
              eq(userBarFoldersTable.userId, userId)
            )
          )
          .limit(1);

        if (existingFolder.length === 0) {
          return res
            .status(400)
            .json({ message: '提供的資料夾 ID 不存在或不屬於該用戶' });
        }
      }

      // 新增收藏
      const [newFavorite] = await db
        .insert(userBarCollectionTable)
        .values({
          userId,
          barId: finalBarId,
          folderId: folderId || null,
          createdAt: new Date(),
        })
        .returning();

      res.status(201).json({
        message: '收藏成功',
        favorite: newFavorite,
        isFavorite: true,
      });
    } else {
      // 移除收藏
      if (existingFavorite.length === 0) {
        return res.status(200).json({
          message: '該酒吧未被收藏',
          isFavorite: false,
        });
      }

      await db
        .delete(userBarCollectionTable)
        .where(
          and(
            eq(userBarCollectionTable.userId, userId),
            eq(userBarCollectionTable.barId, finalBarId)
          )
        );

      res.status(200).json({
        message: '收藏已移除',
        isFavorite: false,
      });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res
      .status(500)
      .json({ message: 'Internal server error', error: error.message });
  }
};

const checkFavoriteStatus = async (req, res) => {
  const { barId } = req.params;
  const userId = req.query.userId || ANONYMOUS_USER_ID;

  try {
    let finalBarId = parseInt(barId);

    if (isNaN(finalBarId) && req.query.googlePlaceId) {
      const existingBar = await db
        .select()
        .from(barsTable)
        .where(eq(barsTable.googlePlaceId, req.query.googlePlaceId))
        .limit(1);

      if (existingBar.length === 0) {
        return res.status(200).json({ isFavorite: false });
      }

      finalBarId = existingBar[0].id;
    }

    if (isNaN(finalBarId)) {
      return res.status(400).json({ message: '無效的酒吧 ID' });
    }

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

    res.status(200).json({
      isFavorite: existingFavorite.length > 0,
      favorite: existingFavorite[0] || null,
    });
  } catch (error) {
    console.error('Error checking favorite status:', error);
    res
      .status(500)
      .json({ message: 'Internal server error', error: error.message });
  }
};

module.exports = {
  getFavorites,
  toggleFavorite,
  checkFavoriteStatus,
};
