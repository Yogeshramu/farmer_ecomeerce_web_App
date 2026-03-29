import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const password = await bcrypt.hash('password123', 10);

    // ── Pincode Locations ─────────────────────────────────────────────────────
    await prisma.pincodeLocation.createMany({
        data: [
            { pincode: '600001', latitude: 13.0827, longitude: 80.2707 },
            { pincode: '600017', latitude: 13.0405, longitude: 80.2337 },
            { pincode: '600020', latitude: 13.0067, longitude: 80.2570 },
            { pincode: '600048', latitude: 13.0358, longitude: 80.1750 },
            { pincode: '600078', latitude: 13.0350, longitude: 80.1850 },
            { pincode: '600096', latitude: 12.9249, longitude: 80.2319 },
            { pincode: '600119', latitude: 12.8680, longitude: 80.2280 },
            { pincode: '625001', latitude: 9.9252,  longitude: 78.1198 },
            { pincode: '641001', latitude: 11.0168, longitude: 76.9558 },
            { pincode: '641105', latitude: 10.9490, longitude: 76.9270 },
        ],
        skipDuplicates: true
    });
    console.log('✓ Pincodes seeded');

    // ── Farmers ───────────────────────────────────────────────────────────────
    const farmer1 = await prisma.user.upsert({
        where: { email: 'farmer@test.com' },
        update: {},
        create: {
            name: 'Ramesh Kumar',
            email: 'farmer@test.com',
            password,
            role: 'FARMER',
            mobile: '9876543210',
            pincode: '600001',
            address: 'No.12, Anna Nagar, Chennai',
            latitude: 13.0827,
            longitude: 80.2707
        }
    });

    const farmer2 = await prisma.user.upsert({
        where: { email: 'farmer2@test.com' },
        update: {},
        create: {
            name: 'Suresh Muthu',
            email: 'farmer2@test.com',
            password,
            role: 'FARMER',
            mobile: '9123456788',
            pincode: '625001',
            address: 'No.5, Madurai Main Road',
            latitude: 9.9252,
            longitude: 78.1198
        }
    });

    const farmer3 = await prisma.user.upsert({
        where: { email: 'farmer3@test.com' },
        update: {},
        create: {
            name: 'Murugan Selvam',
            email: 'farmer3@test.com',
            password,
            role: 'FARMER',
            mobile: '9988776655',
            pincode: '641001',
            address: 'Coimbatore North',
            latitude: 11.0168,
            longitude: 76.9558
        }
    });
    console.log('✓ Farmers seeded');

    // ── Consumers ─────────────────────────────────────────────────────────────
    const consumer1 = await prisma.user.upsert({
        where: { email: 'consumer@test.com' },
        update: {},
        create: {
            name: 'Anita Sharma',
            email: 'consumer@test.com',
            password,
            role: 'CONSUMER',
            mobile: '9123456789',
            pincode: '600017',
            address: 'T. Nagar, Chennai',
            latitude: 13.0405,
            longitude: 80.2337
        }
    });

    const consumer2 = await prisma.user.upsert({
        where: { email: 'consumer2@test.com' },
        update: {},
        create: {
            name: 'Priya Venkat',
            email: 'consumer2@test.com',
            password,
            role: 'CONSUMER',
            mobile: '9876501234',
            pincode: '600048',
            address: 'Porur, Chennai',
            latitude: 13.0358,
            longitude: 80.1750
        }
    });
    console.log('✓ Consumers seeded');

    // ── Crops — Farmer 1 (Chennai) ────────────────────────────────────────────
    const tomato = await prisma.crop.create({ data: { name: 'Tomato',   quantityKg: 80,  basePrice: 40, farmerPincode: '600001', farmerId: farmer1.id } });
    const potato = await prisma.crop.create({ data: { name: 'Potato',   quantityKg: 100, basePrice: 30, farmerPincode: '600001', farmerId: farmer1.id } });
    const onion  = await prisma.crop.create({ data: { name: 'Onion',    quantityKg: 60,  basePrice: 35, farmerPincode: '600001', farmerId: farmer1.id } });
    const pepper = await prisma.crop.create({ data: { name: 'Pepper',   quantityKg: 20,  basePrice: 80, farmerPincode: '600001', farmerId: farmer1.id } });
    const paddy  = await prisma.crop.create({ data: { name: 'Paddy',    quantityKg: 200, basePrice: 25, farmerPincode: '600001', farmerId: farmer1.id } });

    // ── Crops — Farmer 2 (Madurai) ────────────────────────────────────────────
    const carrot      = await prisma.crop.create({ data: { name: 'Carrot',      quantityKg: 60,  basePrice: 45, farmerPincode: '625001', farmerId: farmer2.id } });
    const cabbage     = await prisma.crop.create({ data: { name: 'Cabbage',     quantityKg: 40,  basePrice: 25, farmerPincode: '625001', farmerId: farmer2.id } });
    const cauliflower = await prisma.crop.create({ data: { name: 'Cauliflower', quantityKg: 30,  basePrice: 50, farmerPincode: '625001', farmerId: farmer2.id } });
    const brinjal     = await prisma.crop.create({ data: { name: 'Brinjal',     quantityKg: 45,  basePrice: 30, farmerPincode: '625001', farmerId: farmer2.id } });

    // ── Crops — Farmer 3 (Coimbatore) ─────────────────────────────────────────
    const mango      = await prisma.crop.create({ data: { name: 'Mango',       quantityKg: 150, basePrice: 60, farmerPincode: '641001', farmerId: farmer3.id } });
    const banana     = await prisma.crop.create({ data: { name: 'Banana',      quantityKg: 200, basePrice: 20, farmerPincode: '641001', farmerId: farmer3.id } });
    const sweetcorn  = await prisma.crop.create({ data: { name: 'Sweet Corn',  quantityKg: 80,  basePrice: 35, farmerPincode: '641001', farmerId: farmer3.id } });
    console.log('✓ Crops seeded');

    // ── Orders ────────────────────────────────────────────────────────────────
    // DELIVERED order — consumer1 from farmer1
    const order1 = await prisma.order.create({
        data: {
            consumerId: consumer1.id, farmerId: farmer1.id,
            status: 'DELIVERED', totalAmount: 2200, deliveryCharge: 50,
            deliveryTime: 'Morning', deliveryAddress: 'T. Nagar, Chennai',
            deliveryPincode: '600017', contactNumber: '9123456789',
            items: { create: [
                { cropId: tomato.id, quantity: 10, price: 40 },
                { cropId: potato.id, quantity: 20, price: 30 }
            ]}
        }
    });

    // DELIVERED order — consumer1 from farmer2
    const order2 = await prisma.order.create({
        data: {
            consumerId: consumer1.id, farmerId: farmer2.id,
            status: 'DELIVERED', totalAmount: 875, deliveryCharge: 120,
            deliveryTime: 'Evening', deliveryAddress: 'T. Nagar, Chennai',
            deliveryPincode: '600017', contactNumber: '9123456789',
            items: { create: [
                { cropId: carrot.id,  quantity: 5, price: 45 },
                { cropId: cabbage.id, quantity: 10, price: 25 },
                { cropId: brinjal.id, quantity: 8, price: 30 }
            ]}
        }
    });

    // DELIVERED order — consumer2 from farmer1
    const order3 = await prisma.order.create({
        data: {
            consumerId: consumer2.id, farmerId: farmer1.id,
            status: 'DELIVERED', totalAmount: 185, deliveryCharge: 47,
            deliveryTime: 'Morning', deliveryAddress: 'Porur, Chennai',
            deliveryPincode: '600048', contactNumber: '9876501234',
            items: { create: [
                { cropId: onion.id,  quantity: 3, price: 35 },
                { cropId: tomato.id, quantity: 1, price: 40 },
                { cropId: potato.id, quantity: 1, price: 30 }
            ]}
        }
    });

    // ACCEPTED order — consumer1 from farmer1 (active, ready for cluster)
    await prisma.order.create({
        data: {
            consumerId: consumer1.id, farmerId: farmer1.id,
            status: 'ACCEPTED', totalAmount: 400, deliveryCharge: 80,
            deliveryTime: 'Morning', deliveryAddress: 'Anna Nagar, Chennai',
            deliveryPincode: '600017', contactNumber: '9123456789',
            items: { create: [
                { cropId: pepper.id, quantity: 5, price: 80 }
            ]}
        }
    });

    // ACCEPTED order — consumer2 from farmer1 (same pincode for cluster demo)
    await prisma.order.create({
        data: {
            consumerId: consumer2.id, farmerId: farmer1.id,
            status: 'ACCEPTED', totalAmount: 350, deliveryCharge: 80,
            deliveryTime: 'Afternoon', deliveryAddress: 'Porur Main Road',
            deliveryPincode: '600048', contactNumber: '9876501234',
            items: { create: [
                { cropId: onion.id, quantity: 10, price: 35 }
            ]}
        }
    });

    // PLACED order — consumer2 from farmer2
    await prisma.order.create({
        data: {
            consumerId: consumer2.id, farmerId: farmer2.id,
            status: 'PLACED', totalAmount: 500, deliveryCharge: 150,
            deliveryTime: 'Evening', deliveryAddress: 'Porur, Chennai',
            deliveryPincode: '600048', contactNumber: '9876501234',
            items: { create: [
                { cropId: cauliflower.id, quantity: 10, price: 50 }
            ]}
        }
    });
    console.log('✓ Orders seeded');

    // ── Reviews ───────────────────────────────────────────────────────────────
    await prisma.review.create({
        data: {
            rating: 5, comment: 'Excellent quality tomatoes, very fresh! Highly recommend.',
            cropId: tomato.id, consumerId: consumer1.id, orderId: order1.id
        }
    });
    await prisma.review.create({
        data: {
            rating: 4, comment: 'Good carrots, well packed and delivered on time.',
            cropId: carrot.id, consumerId: consumer1.id, orderId: order2.id
        }
    });
    await prisma.review.create({
        data: {
            rating: 5, comment: 'Fresh onions, great price. Will order again!',
            cropId: onion.id, consumerId: consumer2.id, orderId: order3.id
        }
    });
    console.log('✓ Reviews seeded');

    // ── Contact Inquiries ─────────────────────────────────────────────────────
    await prisma.contactInquiry.create({
        data: {
            consumerId: consumer1.id, farmerId: farmer1.id, cropId: paddy.id,
            quantity: 500, proposedPrice: 22,
            message: 'Hi, I need 500kg of paddy for my rice mill. Can we negotiate the price?',
            deliveryAddress: 'T. Nagar, Chennai', contactNumber: '9123456789',
            status: 'PENDING'
        }
    });
    await prisma.contactInquiry.create({
        data: {
            consumerId: consumer2.id, farmerId: farmer2.id, cropId: cauliflower.id,
            quantity: 100, proposedPrice: 45,
            message: 'Looking for bulk cauliflower supply for my restaurant chain.',
            deliveryAddress: 'Porur, Chennai', contactNumber: '9876501234',
            status: 'PENDING'
        }
    });
    console.log('✓ Inquiries seeded');

    // ── Interview Questions ───────────────────────────────────────────────────
    await prisma.question.createMany({
        data: [
            { text: 'What is the name of your main crop?', order: 1 },
            { text: 'When do you expect to harvest?', order: 2 },
            { text: 'What is your expected yield in Kg?', order: 3 },
            { text: 'Do you use organic fertilizers?', order: 4 },
            { text: 'What is the current market price per Kg?', order: 5 },
        ],
        skipDuplicates: true
    });
    console.log('✓ Questions seeded');

    console.log('\n✅ Seed complete!');
    console.log('   Farmer 1  : farmer@test.com  / password123  (Chennai 600001)');
    console.log('   Farmer 2  : farmer2@test.com / password123  (Madurai 625001)');
    console.log('   Farmer 3  : farmer3@test.com / password123  (Coimbatore 641001)');
    console.log('   Consumer 1: consumer@test.com  / password123');
    console.log('   Consumer 2: consumer2@test.com / password123');
}

main()
    .then(async () => { await prisma.$disconnect(); })
    .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
