'use client';

import { PROCESSES } from '@/app/constants';
import Link from 'next/link';
import { useOptimistic, useState, useTransition } from 'react';
import { updatePartItemStatus } from '@/src/actions/update-status';
import { PartItem, Part } from '@prisma/client'; // Prisma から PartItem と Part をインポート
import prisma from '@/lib/db'; // 新しく作成したPrismaクライアントをインポート

interface ItemPageProps {
  params: {
    id: string;
  };
}

// サーバー側でデータを取得し、クライアントコンポーネントに渡すラッパー
export async function generateStaticParams() {
  const allItems = await prisma.partItem.findMany({
    select: { id: true },
  });
  return allItems.map(item => ({
    id: String(item.id), // id が number なので string に変換して params に渡す
  }));
}

export default function ItemPageClient({ data, projectId }: { data: (PartItem & { part: Part }), projectId: string }) { // parts を part に変更
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    data.status,
    (state, newStatus: string) => newStatus // ProcessStatus ではなく string を使用
  );
  const [isPending, startTransition] = useTransition();
  const [defectReason, setDefectReason] = useState('');

  const handleUpdateStatus = async (newStatus: string) => { // ProcessStatus ではなく string を使用
    startTransition(async () => {
      setOptimisticStatus(newStatus);
      try {
        await updatePartItemStatus(data.id, newStatus);
        // 成功した場合、optimisticState が確定される。サーバー側で再検証も行われる。
      } catch (error) {
        console.error('Failed to update status:', error);
        alert('ステータスの更新に失敗しました。');
        // エラー時は元の状態に戻すなどのリカバリー処理を検討
        setOptimisticStatus(data.status); // ロールバック
      }
    });
  };

  const handleReportDefect = async () => {
    if (!defectReason) {
      alert('不良理由を入力してください。');
      return;
    }
    startTransition(async () => {
      setOptimisticStatus('DEFECTIVE'); // 不良報告なのでDEFECTIVEに設定
      try {
        // updatePartItemStatus を呼び出し、必要に応じて別の不良報告アクションと連携
        await updatePartItemStatus(data.id, 'DEFECTIVE');
        // TODO: 不良報告時に新しいジョブを生成するロジックをここに追加または別のServer Actionで処理
        alert('不良を報告し、ステータスを更新しました。');
        setDefectReason('');
      } catch (error) {
        console.error('Failed to report defect:', error);
        alert('不良報告に失敗しました。');
        setOptimisticStatus(data.status); // ロールバック
      }
    });
  };

  return (
    <div className="p-8 max-w-2xl mx-auto bg-white shadow-lg rounded-xl mt-10 border border-gray-100">
      <Link href={`/project/${projectId}`} className="text-sm text-blue-600 hover:underline mb-6 inline-block font-bold">
        ← プロジェクト進捗に戻る
      </Link>

      <div className="flex justify-between items-start mb-6">
        <h1 className="text-3xl font-black text-gray-900">{data.part.partNumber}</h1> {/* parts.part_number を part.partNumber に変更 */}
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${optimisticStatus === 'DEFECTIVE' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
          ID: {data.id}
        </span>
      </div>

      {/* ステータス表示 */}
      <div className={`p-4 rounded-lg mb-8 border ${optimisticStatus === 'DEFECTIVE' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'}`}>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Current Status</p>
        <p className={`text-2xl font-black ${optimisticStatus === 'DEFECTIVE' ? 'text-red-700' : 'text-blue-800'}`}>
          {PROCESSES.find(p => p.key === optimisticStatus)?.name || optimisticStatus}
        </p>
      </div>

      <div className="space-y-10">
        {/* 1. 通常の工程更新 */}
        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase mb-3">工程を進める</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const next = formData.get('next') as string; // ProcessStatus ではなく string を使用
            handleUpdateStatus(next);
          }} className="flex gap-2">
            <select name="next" value={optimisticStatus} onChange={(e) => { /* use optimistic for display, action handles update */ }} className="flex-1 p-3 border rounded-lg font-bold" disabled={isPending}>
              {PROCESSES.map(proc => <option key={proc.key} value={proc.key}>{proc.name}</option>)}
            </select>
            <button type="submit" className="bg-gray-800 text-white px-6 py-3 rounded-lg font-bold hover:bg-black transition-colors" disabled={isPending}>
              {isPending ? '更新中...' : '更新'}
            </button>
          </form>
        </section>

        {/* 2. 不良報告セクション */}
        {optimisticStatus !== 'DEFECTIVE' && (
          <section className="p-6 border-2 border-red-200 rounded-2xl bg-red-50/50">
            <h2 className="text-lg font-black text-red-700 mb-2 flex items-center gap-2">
              ⚠️ 不良・再製作の報告
            </h2>
            <p className="text-sm text-red-600 mb-4 font-medium">
              この個体に欠陥がある場合、ここで報告します。この個体は「不良」として記録されます。
            </p>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleReportDefect();
            }} className="space-y-3">
              <input
                name="reason"
                value={defectReason}
                onChange={(e) => setDefectReason(e.target.value)}
                placeholder="不良理由（例：積層剥離、寸法誤差）"
                className="w-full p-3 border-2 border-red-100 rounded-xl focus:border-red-500 outline-none bg-white font-medium"
                required
                disabled={isPending}
              />
              <button type="submit" className={`w-full bg-red-600 text-white font-black py-4 rounded-xl hover:bg-red-700 transition-all shadow-lg active:scale-[0.98] ${isPending || !defectReason ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={isPending || !defectReason}>
                {isPending ? '処理中...' : '不良を確定'}
              </button>
            </form>
          </section>
        )}

        {/* 3. 完了処理 */}
        <section>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleUpdateStatus('ASSEMBLED');
          }}>
            <button type="submit" className="w-full border-2 border-green-600 text-green-600 font-black py-4 rounded-xl hover:bg-green-50 transition-colors" disabled={isPending}>
              {isPending ? '処理中...' : '組み込み完了（ストックから除外）'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export async function ItemPage(props: ItemPageProps) {
  const { id } = props.params;
  const data = await prisma.partItem.findUnique({
    where: { id: parseInt(id, 10) },
    include: { part: true },
  });
  
  if (!data) {
    return <div className="p-8">アイテムが見つかりませんでした</div>;
  }

  // Part の unitId が projectId に対応
  const projectId = String(data.part.unitId); // Part.unitId は Int なので String に変換

  return <ItemPageClient data={data} projectId={projectId} />;
}