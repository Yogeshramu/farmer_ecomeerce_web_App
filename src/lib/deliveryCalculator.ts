// Simple pincode distance calculator (simulated)
// In production, use Google Maps Distance Matrix API or similar

const PINCODE_COORDS: Record<string, { lat: number; lng: number }> = {
    '600001': { lat: 13.0827, lng: 80.2707 }, // Chennai
    '600002': { lat: 13.0878, lng: 80.2785 },
    '600003': { lat: 13.0732, lng: 80.2609 },
    '110001': { lat: 28.6139, lng: 77.2090 }, // Delhi
    '400001': { lat: 18.9388, lng: 72.8354 }, // Mumbai
    '560001': { lat: 12.9716, lng: 77.5946 }, // Bangalore
};

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

export function calculateDeliveryCharge(farmerPincode: string, consumerPincode: string): number {
    // Get coordinates for both pincodes
    const farmerCoords = PINCODE_COORDS[farmerPincode];
    const consumerCoords = PINCODE_COORDS[consumerPincode];

    // If either pincode is not in our database, use default charge
    if (!farmerCoords || !consumerCoords) {
        // Estimate based on pincode difference
        const diff = Math.abs(parseInt(farmerPincode) - parseInt(consumerPincode));
        const estimatedKm = Math.min(diff / 100, 50); // Cap at 50km
        return Math.round(estimatedKm * 10); // ₹10 per km
    }

    // Calculate actual distance
    const distanceKm = calculateDistance(
        farmerCoords.lat,
        farmerCoords.lng,
        consumerCoords.lat,
        consumerCoords.lng
    );

    // ₹10 per km, minimum ₹20
    const charge = Math.max(Math.round(distanceKm * 10), 20);
    return charge;
}
