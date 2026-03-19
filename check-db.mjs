import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Checking database...\n');
    
    // Check Users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mobile: true,
        pincode: true,
      }
    });
    console.log(`👥 Users (${users.length}):`);
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
    });
    
    // Check Crops
    const crops = await prisma.crop.findMany({
      include: {
        farmer: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });
    console.log(`\n🌾 Crops (${crops.length}):`);
    crops.forEach(crop => {
      console.log(`  - ${crop.name}: ${crop.quantityKg}kg @ ₹${crop.basePrice}/kg (Farmer: ${crop.farmer.name})`);
    });
    
    // Check Orders
    const orders = await prisma.order.findMany({
      include: {
        consumer: {
          select: { name: true }
        },
        farmer: {
          select: { name: true }
        },
        items: {
          include: {
            crop: {
              select: { name: true }
            }
          }
        }
      }
    });
    console.log(`\n📦 Orders (${orders.length}):`);
    orders.forEach(order => {
      console.log(`  - Order ${order.id.substring(0, 8)}: ${order.consumer.name} → ${order.farmer.name}`);
      console.log(`    Status: ${order.status}, Total: ₹${order.totalAmount}`);
      order.items.forEach(item => {
        console.log(`    - ${item.crop.name}: ${item.quantity}kg @ ₹${item.price}`);
      });
    });
    
    // Check Questions
    const questions = await prisma.question.findMany({
      include: {
        _count: {
          select: { answers: true }
        }
      },
      orderBy: { order: 'asc' }
    });
    console.log(`\n❓ Questions (${questions.length}):`);
    questions.forEach(q => {
      console.log(`  ${q.order}. ${q.text} (${q._count.answers} answers)`);
    });
    
    // Check Pincodes
    const pincodes = await prisma.pincodeLocation.count();
    console.log(`\n📍 Pincode Locations: ${pincodes}`);
    
    console.log('\n✅ Database check complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
