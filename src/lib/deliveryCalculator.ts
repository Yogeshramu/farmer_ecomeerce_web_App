// Pincode to coordinates using external API

async function getPincodeCoordinates(pincode: string): Promise<{ lat: number; lng: number } | null> {
    try {
        console.log(`Looking up coordinates for pincode: ${pincode}`);
        // Using Zippopotam.us (free, provides coordinates for India)
        const response = await fetch(`https://api.zippopotam.us/in/${pincode}`);

        if (!response.ok) {
            console.log(`Zippopotam API lookup failed for ${pincode}: ${response.status}`);
            return null;
        }

        const data = await response.json();

        if (data.places && data.places.length > 0) {
            const place = data.places[0];
            const coords = {
                lat: parseFloat(place.latitude),
                lng: parseFloat(place.longitude)
            };
            console.log(`Pincode ${pincode} coordinates:`, coords);
            return coords;
        }

        console.log(`Pincode ${pincode} not found in Zippopotam`);
        return null;
    } catch (error) {
        console.error(`Pincode ${pincode} API error:`, error);
        return null;
    }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
}

export async function calculateDeliveryCharge(farmerPincode: string, consumerPincode: string): Promise<{ charge: number; distance: number }> {
    console.log(`Calculating delivery charge from ${farmerPincode} to ${consumerPincode}`);

    // Validate Indian pincodes (6 digits)
    if (!/^\d{6}$/.test(farmerPincode) || !/^\d{6}$/.test(consumerPincode)) {
        console.log('Invalid pincode format');
        return { charge: 100, distance: 10 }; // Default
    }

    // Get coordinates for both pincodes
    const [farmerCoords, consumerCoords] = await Promise.all([
        getPincodeCoordinates(farmerPincode),
        getPincodeCoordinates(consumerPincode)
    ]);

    // If either pincode lookup fails, estimate based on pincode difference
    if (!farmerCoords || !consumerCoords) {
        console.log('Using fallback estimation');
        const diff = Math.abs(parseInt(farmerPincode) - parseInt(consumerPincode));
        const estimatedKm = diff / 100; // Remove cap, let it be dynamic
        console.log(`Estimated distance: ${estimatedKm} km, charge: ₹${Math.round(estimatedKm * 10)}`);
        return { charge: Math.round(estimatedKm * 10), distance: estimatedKm }; // ₹10 per km
    }

    // Calculate actual distance using Haversine formula
    const distanceKm = calculateDistance(
        farmerCoords.lat,
        farmerCoords.lng,
        consumerCoords.lat,
        consumerCoords.lng
    );

    console.log(`Actual distance: ${distanceKm} km, charge: ₹${Math.round(distanceKm * 10)}`);

    // ₹10 per km (e.g., 150 km = ₹1,500)
    const charge = Math.round(distanceKm * 10);
    return { charge, distance: distanceKm };
}
