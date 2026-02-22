import { beforeEach } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import type { PrismaClient } from '@prisma/client'

// モックPrismaクライアントを定義
export const prismaMock = mockDeep<PrismaClient>()

// $transactionをモック実装：コールバック関数にトランザクションコンテキストを渡す
prismaMock.$transaction.mockImplementation((cb: any) => {
  return Promise.resolve(typeof cb === 'function' ? cb(prismaMock) : cb)
})

beforeEach(() => {
  mockReset(prismaMock)
  // リセット後、$transactionの実装を再度設定
  prismaMock.$transaction.mockImplementation((cb: any) => {
    return Promise.resolve(typeof cb === 'function' ? cb(prismaMock) : cb)
  })
})
