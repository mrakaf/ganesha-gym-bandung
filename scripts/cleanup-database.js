
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Membersihkan database...');

  // Hapus semua member kecuali "Demo Skripsi Ganesha"
  const deletedMembers = await prisma.member.deleteMany({
    where: {
      NOT: {
        name: 'Demo Skripsi Ganesha'
      }
    }
  });

  console.log(`✅ Dihapus ${deletedMembers.count} member`);
  console.log('✨ Database bersih!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
