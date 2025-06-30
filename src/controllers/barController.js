const { getBarsFromGoogleMaps } = require('../services/googleMaps');
const db = require('../config/db');
const { barsTable } = require('../models/schema');
const { eq, and } = require('drizzle-orm');
const { dayjs, tz } = require('../utils/dateFormatter');

async function syncBarFromGoogle(barData) {
  const { name, address, latitude, longitude, placeId, place_id, googlePlaceId } = barData;
  const realPlaceId = placeId || place_id || googlePlaceId;
  if (!realPlaceId || !realPlaceId.startsWith('ChIJ')) {
    // placeId 不合法，直接 return null
    return null;
  }
  try {
    const existingBar = await db
      .select()
      .from(barsTable)
      .where(eq(barsTable.googlePlaceId, realPlaceId))
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
          updatedAt: dayjs().tz(tz).toDate(),
        })
        .where(eq(barsTable.id, existingBar[0].id))
        .returning();
    } else {
      const now = dayjs().tz(tz).toDate();
      
      [resultBar] = await db
        .insert(barsTable)
        .values({
          googlePlaceId: realPlaceId || `google_${Date.now()}`,
          name,
          address,
          latitude,
          longitude,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
    }
    return resultBar;
  } catch (err) {
    console.error('Error syncing bar from Google to DB:', err);
    throw err;
  }
}

// MODIFIED: getBars - 不再選擇 priceLevel 和 priceRange
const getBars = async (req, res) => {
  try {
    const location = { lat: 24.986064, lng: 121.536762 };
    const query = '酒吧';

    // 先嘗試從 Google Maps 獲取資料，但如果失敗不影響整體流程
    let googleBars = [];
    try {
      googleBars = await getBarsFromGoogleMaps(query, location);
      await Promise.allSettled(googleBars.map((bar) => syncBarFromGoogle(bar)));
    } catch (googleError) {
      console.error('Google Maps API error:', googleError);
      // 繼續執行，不中斷流程
    }

    const finalBars = await db
      .select({
        id: barsTable.id,
        googlePlaceId: barsTable.googlePlaceId,
        name: barsTable.name,
        address: barsTable.address,
        latitude: barsTable.latitude,
        longitude: barsTable.longitude,
        createdAt: barsTable.createdAt,
        updatedAt: barsTable.updatedAt,
      })
      .from(barsTable)
      .where(inArray(barsTable.id, syncedBarIds))
      .orderBy(barsTable.name);

    if (finalBars.length === 0) {
      return res.status(404).json({ message: '目前沒有可用的酒吧資訊' });
    }

    res.json({ bars: finalBars });
  } catch (error) {
    console.error('Error in getBars controller:', error);
    res
      .status(500)
      .json({ message: 'Internal server error', error: error.message });
  }
};

const createBar = async (req, res) => {
  const { name, address, latitude, longitude, googlePlaceId } = req.body;

  if (!name || !address) {
    return res.status(400).json({ message: '酒吧名稱和地址為必填項目' });
  }

  try {
    const now = dayjs().tz(tz).toDate();
    
    const [newBar] = await db
      .insert(barsTable)
      .values({
        googlePlaceId: googlePlaceId || `manual_${Date.now()}`,
        name,
        address,
        latitude: latitude ? String(latitude) : null,
        longitude: longitude ? String(longitude) : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

      console.log('原始時間:', newBar.createdAt);
      console.log('格式化後:', dayjs(newBar.createdAt).tz(tz).format('YYYY-MM-DD HH:mm:ss'));

    res.status(201).json({ message: '酒吧新增成功', bar: newBar });
  } catch (error) {
    console.error('Error creating bar:', error);
    res
      .status(500)
      .json({ message: 'Internal server error', error: error.message });
  }
};

module.exports = {
  getBars,
  createBar,
  syncBarFromGoogle,
};