import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../../../tests/helpers/prisma-mock';

// @prisma/client をモック化（実装ファイルがロードされる前に）
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => prismaMock),
}));

import { updatePartItemStatus } from '../update-status';

describe('updatePartItemStatus', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    vi.clearAllMocks();
  });

  it('有効なpartItemIdとnewStatusを渡すと、DBが更新されること', async () => {
    const partItemId = 'test-part-item-id';
    const newStatus = 'PRINTING';

    const mockPartItem = {
      id: partItemId,
      status: newStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
      partId: 'part-id-1',
      purchaseOrderId: 'po-id-1',
    };

    prismaMock.partItem.findUnique.mockResolvedValue(mockPartItem);
    prismaMock.partItem.update.mockResolvedValue(mockPartItem);
    prismaMock.statusHistory.create.mockResolvedValue({
      id: 'status-history-id-1',
      partItemId: partItemId,
      status: newStatus,
      createdAt: new Date(),
    });

    // モック化されたクライアントを渡す
    await updatePartItemStatus(partItemId, newStatus, prismaMock as any);

    expect(prismaMock.partItem.update).toHaveBeenCalledWith({
      where: { id: partItemId },
      data: { status: newStatus },
    });
  });

  it('更新成功時、操作履歴としてStatusHistoryテーブルにレコードが作成されること', async () => {
    const partItemId = 'test-part-item-id-2';
    const newStatus = 'IN_PRODUCTION';

    const mockPartItem = {
      id: partItemId,
      status: newStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
      partId: 'part-id-2',
      purchaseOrderId: 'po-id-2',
    };

    prismaMock.partItem.findUnique.mockResolvedValue(mockPartItem);
    prismaMock.partItem.update.mockResolvedValue(mockPartItem);
    prismaMock.statusHistory.create.mockResolvedValue({
      id: 'status-history-id-2',
      partItemId: partItemId,
      status: newStatus,
      createdAt: new Date(),
    });

    // モック化されたクライアントを渡す
    await updatePartItemStatus(partItemId, newStatus, prismaMock as any);

    expect(prismaMock.statusHistory.create).toHaveBeenCalledWith({
      data: {
        partItemId: partItemId,
        status: newStatus,
      },
    });
  });

  it('存在しないpartItemIdの場合はエラーを投げること', async () => {
    const partItemId = 'nonexistent-id';
    const newStatus = 'DELIVERED';

    prismaMock.partItem.findUnique.mockResolvedValue(null);

    await expect(
      updatePartItemStatus(partItemId, newStatus, prismaMock as any)
    ).rejects.toThrow('PartItem not found');
  });
});
