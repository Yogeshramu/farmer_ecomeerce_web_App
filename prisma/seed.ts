import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Seed script to populate the database with initial data
 * Run: npx ts-node --compiler-options '{"module":"commonjs"}' prisma/seed.ts
 * 
 * Seeds:
 * - Pincode locations (Chennai area)
 * - Test users (farmer@test.com / consumer@test.com, password: password123)
 * - Sample crops (Tomato, Potato, Onion)
 * - Sample order history
 * - Interview questions
 */
async function main() {
    // Seed Pincode Locations (Chennai Examples)
    await prisma.pincodeLocation.createMany({
        data: [
            { pincode: '600001', latitude: 13.0827, longitude: 80.2707 }, // North Chennai
            { pincode: '600017', latitude: 13.0405, longitude: 80.2337 }, // T. Nagar
            { pincode: '600020', latitude: 13.0067, longitude: 80.2570 }, // Adyar
            { pincode: '600096', latitude: 12.9249, longitude: 80.2319 }, // Perungudi
            { pincode: '600119', latitude: 12.8680, longitude: 80.2280 }, // Sholinganallur
        ],
        skipDuplicates: true
    });

    console.log('Seeded pincodes');

    // Seed Users
    const password = await bcrypt.hash('password123', 10);

    // Farmer
    await prisma.user.upsert({
        where: { email: 'farmer@test.com' },
        update: {},
        create: {
            name: 'Ramesh Farmer',
            email: 'farmer@test.com',
            password,
            role: 'FARMER',
            mobile: '9876543210',
            pincode: '600001',
            latitude: 13.0827,
            longitude: 80.2707
        }
    });

    // Consumer
    await prisma.user.upsert({
        where: { email: 'consumer@test.com' },
        update: {},
        create: {
            name: 'Anita Consumer',
            email: 'consumer@test.com',
            password,
            role: 'CONSUMER',
            mobile: '9123456789',
            pincode: '600017',
            latitude: 13.0405,
            longitude: 80.2337
        }
    });

    console.log('Seeded users: farmer@test.com / consumer@test.com');

    // Get farmer and consumer
    const farmer = await prisma.user.findUnique({ where: { email: 'farmer@test.com' } });
    const consumer = await prisma.user.findUnique({ where: { email: 'consumer@test.com' } });

    // Seed Crops
    const tomato = await prisma.crop.create({
        data: {
            name: 'Tomato',
            quantityKg: 50,
            basePrice: 40,
            farmerPincode: '600001',
            farmerId: farmer!.id
        }
    });

    const potato = await prisma.crop.create({
        data: {
            name: 'Potato',
            quantityKg: 100,
            basePrice: 30,
            farmerPincode: '600001',
            farmerId: farmer!.id
        }
    });

    const onion = await prisma.crop.create({
        data: {
            name: 'Onion',
            quantityKg: 75,
            basePrice: 35,
            farmerPincode: '600001',
            farmerId: farmer!.id
        }
    });

    console.log('Seeded crops');

    // Seed Order with Order History
    const order = await prisma.order.create({
        data: {
            consumerId: consumer!.id,
            farmerId: farmer!.id,
            status: 'DELIVERED',
            totalAmount: 2200,
            deliveryCharge: 50,
            deliveryTime: 'Morning',
            deliveryAddress: 'T. Nagar, Chennai',
            deliveryPincode: '600017',
            items: {
                create: [
                    { cropId: tomato.id, quantity: 10, price: 40 },
                    { cropId: potato.id, quantity: 20, price: 30 }
                ]
            }
        }
    });

    console.log('Seeded order history');

    // Seed Questions
    await prisma.question.createMany({
        data: [
            { text: "What is the name of your main crop?", order: 1 },
            { text: "When do you expect to harvest?", order: 2 },
            { text: "What is your expected yield in Kg?", order: 3 },
            { text: "Do you use organic fertilizers?", order: 4 }
        ],
        skipDuplicates: true
    });
    console.log('Seeded interview questions');
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
