import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
