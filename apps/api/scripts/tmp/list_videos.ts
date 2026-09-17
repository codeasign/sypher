import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const videos = await prisma.video.findMany({ select: { id: true, slug: true, title: true, category: true, status: true, videoUrl: true, thumbnailUrl: true, authorId: true } });
  console.log(JSON.stringify(videos, null, 2));
  await prisma.$disconnect();
})();
