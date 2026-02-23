import prisma from '@/lib/db';
import { PrismaClient } from '@prisma/client';

export async function updatePartItemStatus(
  partItemId: number,
  newStatus: string,
  client?: PrismaClient // Remove this if not used for testing or specific transactions
) {
  const dbClient = client || prisma; // Use shared prisma instance

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

      // Removed statusHistory.create as StatusHistory model does not exist.

      return updated;
    });
    return updatedPartItem;
  } catch (error) {
    console.error('Failed to update PartItem status:', error);
    throw error; // エラーを再スローして呼び出し元に伝える
  }
}

