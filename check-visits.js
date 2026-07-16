const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Checking Wanda\'s data...');
  
  // Cari member bernama Wanda
  const wandaMember = await prisma.member.findFirst({
    where: {
      name: { contains: 'Wanda', mode: 'insensitive' }
    },
    include: { visits: true, payments: true }
  });
  
  console.log('Wanda member data:', wandaMember);
  
  if (wandaMember) {
    console.log('\nWanda\'s visits:');
    console.log(wandaMember.visits);
    
    console.log('\nWanda\'s payments:');
    console.log(wandaMember.payments);
    
    // Jika ada visit yang belum CHECKED_IN, pastikan statusnya PENDING
    const pendingVisits = wandaMember.visits.filter(v => v.checkInStatus !== 'CHECKED_IN');
    if (pendingVisits.length > 0) {
      console.log('\nFound', pendingVisits.length, 'pending visits');
    } else {
      console.log('\nNo pending visits found! Creating a new one...');
      const newVisit = await prisma.visit.create({
        data: {
          memberId: wandaMember.id,
          checkInStatus: 'PENDING',
          notes: 'Visit created for QR check-in'
        }
      });
      console.log('Created new visit:', newVisit);
    }
  } else {
    console.log('Wanda not found in members!');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
