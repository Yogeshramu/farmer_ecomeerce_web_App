import Redis from 'ioredis';

// Redis client — gracefully disabled if not available
let redis: Redis | null = null;
try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
    });
    redis.on('error', () => { redis = null; });
} catch {
    redis = null;
}

async function cacheGet(key: string): Promise<string | null> {
    try { return await redis?.get(key) ?? null; } catch { return null; }
}

async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
    try { await redis?.set(key, value, 'EX', ttlSeconds); } catch { /* silent */ }
}

// Pincode → coordinates via Nominatim (cached 30 days — pincodes don't move)
async function getPincodeCoordinates(pincode: string): Promise<{ lat: number; lng: number } | null> {
    const cacheKey = `pincode:${pincode}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return JSON.parse(cached);

    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json&limit=1`,
            { headers: { 'User-Agent': 'FarmDirect/1.0' } }
        );
        if (!res.ok) return null;
        const data = await res.json();

        if (data?.length) {
            const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            await cacheSet(cacheKey, JSON.stringify(coords), 60 * 60 * 24 * 30); // 30 days
            return coords;
        }

        // Fallback: India Post API → locality name → Nominatim
        const ipRes = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        if (!ipRes.ok) return null;
        const ipData = await ipRes.json();
        if (!ipData?.[0] || ipData[0].Status !== 'Success' || !ipData[0].PostOffice?.length) return null;

        const po = ipData[0].PostOffice[0];
        const query = encodeURIComponent(`${po.Name}, ${po.District}, ${po.State}, India`);
        const fallbackRes = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
            { headers: { 'User-Agent': 'FarmDirect/1.0' } }
        );
        if (!fallbackRes.ok) return null;
        const fallbackData = await fallbackRes.json();
        if (!fallbackData?.length) return null;

        const coords = { lat: parseFloat(fallbackData[0].lat), lng: parseFloat(fallbackData[0].lon) };
        await cacheSet(cacheKey, JSON.stringify(coords), 60 * 60 * 24 * 30);
        return coords;
    } catch (error) {
        console.error(`Pincode ${pincode} lookup error:`, error);
        return null;
    }
}

// Road distance via OSRM (cached 7 days)
async function getRoadDistance(lat1: number, lon1: number, lat2: number, lon2: number): Promise<number | null> {
    const cacheKey = `dist:${lat1.toFixed(4)},${lon1.toFixed(4)};${lat2.toFixed(4)},${lon2.toFixed(4)}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return parseFloat(cached);

    // Google Distance Matrix (exact road km, $200 free/month)
    const googleKey = process.env.GOOGLE_MAPS_API_KEY;
    if (googleKey) {
        try {
            const res = await fetch(
                `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat1},${lon1}&destinations=${lat2},${lon2}&mode=driving&key=${googleKey}`
            );
            if (res.ok) {
                const data = await res.json();
                const element = data.rows?.[0]?.elements?.[0];
                if (element?.status === 'OK') {
                    const km = element.distance.value / 1000;
                    await cacheSet(cacheKey, km.toString(), 60 * 60 * 24 * 7);
                    return km;
                }
            }
        } catch { /* fall through to OSRM */ }
    }

    // Fallback: OSRM (free, no key, OpenStreetMap road data)
    try {
        const res = await fetch(
            `http://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`
        );
        if (!res.ok) return null;
        const data = await res.json();
        if (data.code !== 'Ok' || !data.routes?.length) return null;
        const km = data.routes[0].distance / 1000;
        await cacheSet(cacheKey, km.toString(), 60 * 60 * 24 * 7);
        return km;
    } catch {
        return null;
    }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function calculateDeliveryCharge(farmerPincode: string, consumerPincode: string): Promise<{ charge: number; distance: number }> {
    if (!/^\d{6}$/.test(farmerPincode) || !/^\d{6}$/.test(consumerPincode)) {
        return { charge: 100, distance: 10 };
    }

    const [farmerCoords, consumerCoords] = await Promise.all([
        getPincodeCoordinates(farmerPincode),
        getPincodeCoordinates(consumerPincode),
    ]);

    if (!farmerCoords || !consumerCoords) {
        return { charge: 100, distance: 10 };
    }

    const roadDistance = await getRoadDistance(farmerCoords.lat, farmerCoords.lng, consumerCoords.lat, consumerCoords.lng);
    const distanceKm = roadDistance ?? haversineDistance(farmerCoords.lat, farmerCoords.lng, consumerCoords.lat, consumerCoords.lng);

    // Free for first 5km. After that: base fare + per-km charge.
    const charge = distanceKm <= 5 ? 0 : Math.round(30 + (distanceKm - 5) * 5);
    return { charge, distance: distanceKm };
}
