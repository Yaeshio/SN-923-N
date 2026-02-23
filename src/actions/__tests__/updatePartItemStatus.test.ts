import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../../../tests/helpers/prisma-mock';

// @/lib/db をモック化
vi.mock('@/lib/db', () => ({
  __esModule: true,
  default: prismaMock,
}));

import { updatePartItemStatus } from '../update-status';

describe('updatePartItemStatus', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    vi.clearAllMocks();
  });

  it('有効なpartItemIdとnewStatusを渡すと、DBが更新されること', async () => {
    const partItemId = 1; // number に変更
    const newStatus = 'PRINTING';

    const mockPartItem = {
      id: partItemId,
      status: newStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
      partId: 1, // number に変更
      boxId: null, // 追加
      serialNumber: 'SN-001', // 追加
    };

    prismaMock.partItem.findUnique.mockResolvedValue(mockPartItem);
    prismaMock.partItem.update.mockResolvedValue(mockPartItem);

    await updatePartItemStatus(partItemId, newStatus);

    expect(prismaMock.partItem.update).toHaveBeenCalledWith({
      where: { id: partItemId },
      data: { status: newStatus },
    });
  });

  it('存在しないpartItemIdの場合はエラーを投げること', async () => {
    const partItemId = 999; // number に変更
    const newStatus = 'DELIVERED';

    prismaMock.partItem.findUnique.mockResolvedValue(null);

    await expect(
      updatePartItemStatus(partItemId, newStatus)
    ).rejects.toThrow('PartItem not found');
  });
});
