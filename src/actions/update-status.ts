import { PrismaClient } from '@prisma/client';

// Prismaクライアントは遅延初期化する
let prisma: PrismaClient | null = null;

const getPrismaInstance = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
};

export async function updatePartItemStatus(
  partItemId: string,
  newStatus: string,
  client?: PrismaClient
) {
  const dbClient = client || getPrismaInstance();

  try {
    const updatedPartItem = await dbClient.$transaction(async (tx) => {
      const existingPartItem = await tx.partItem.findUnique({
        where: { id: partItemId },
      });

      if (!existingPartItem) {
        throw new Error('PartItem not found');
      }

      const updated = await tx.partItem.update({
        where: { id: partItemId },
        data: { status: newStatus },
      });

      await tx.statusHistory.create({
        data: {
          partItemId: partItemId,
          status: newStatus,
        },
      });
      return updated;
    });
    return updatedPartItem;
  } catch (error) {
    console.error('Failed to update PartItem status:', error);
    throw error; // エラーを再スローして呼び出し元に伝える
  }
}
