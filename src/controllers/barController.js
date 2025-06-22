// src/controllers/barController.js
const { getBarsFromGoogleMaps } = require('../services/googleMaps');
const { db } = require('../drizzle/db');
const { barsTable } = require('../schema');
const { eq } = require('drizzle-orm');

async function saveOrUpdateBar(barData) {
    const { googlePlaceId, name, address, latitude, longitude, phone } = barData;
    try {
        const existingBar = await db
            .select()
            .from(barsTable)
            .where(eq(barsTable.googlePlaceId, googlePlaceId))
            .limit(1);

        if (existingBar.length > 0) {
            await db.update(barsTable)
                .set({
                    name,
                    address,
                    latitude,
                    longitude,
                    phone,
                    updatedAt: new Date(),
                })
                .where(eq(barsTable.googlePlaceId, googlePlaceId));
        } else {
            await db.insert(barsTable).values({
                googlePlaceId,
                name,
                address,
                latitude,
                longitude,
                phone,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
        const [updatedOrInsertedBar] = await db.select().from(barsTable).where(eq(barsTable.googlePlaceId, googlePlaceId)).limit(1);
        return updatedOrInsertedBar;

    } catch (err) {
        console.error("Error saving/updating bar in DB:", err);
        throw err;
    }
}

const getBars = async (req, res) => {
    try {
        const cachedBars = await db
            .select({
                barId: barsTable.googlePlaceId,
                barName: barsTable.name,
                address: barsTable.address,
            })
            .from(barsTable)
            .orderBy(barsTable.name);

        if (cachedBars.length > 0) {
            return res.json({ bars: cachedBars });
        }

        const location = { lat: 24.986064, lng: 121.536762 };
        const query = '酒吧';

        const googleBars = await getBarsFromGoogleMaps(query, location);

        await Promise.allSettled(googleBars.map(bar => saveOrUpdateBar(bar)));

        res.json({
            bars: googleBars.map(b => ({
                barId: b.googlePlaceId,
                barName: b.name,
                address: b.address
            }))
        });

    } catch (error) {
        console.error('Error in getBars controller:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

module.exports = { getBars };