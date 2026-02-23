import { Project, ProcessStatus, Unit } from '@/app/types'; // PartItem のインポートを削除
import { PartItem, Part } from '@prisma/client'; // Prisma から PartItem と Part をインポート
import { db } from '@/src/shared/lib/firebase';
import {
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    setDoc,
    addDoc,
    query,
    where,
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';

// Firestoreのデータコンバーター（Date型の復元など）
const dateConverter = (data: any): any => {
    if (!data) return data;
    const result = { ...data };
    // completed_atなどのTimestampをDateに戻す
    Object.keys(result).forEach(key => {
        if (result[key] instanceof Timestamp) {
            result[key] = result[key].toDate();
        }
    });
    return result;
};

export const mockStore = {
    getProjects: async (): Promise<Project[]> => {
        const snapshot = await getDocs(collection(db, 'projects'));
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...dateConverter(doc.data())
        })) as Project[];
    },

    getProject: async (id: string): Promise<Project | null> => {
        const docRef = doc(db, 'projects', id);
        const span = await getDoc(docRef);
        if (!span.exists()) return null;
        return { id: span.id, ...dateConverter(span.data()) } as Project;
    },

    getUnitsByProject: async (projectId: string): Promise<Unit[]> => {
        const q = query(collection(db, 'units'), where('project_id', '==', projectId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Unit[];
    },

    addUnit: async (projectId: string, name: string): Promise<Unit> => {
        const docRef = await addDoc(collection(db, 'units'), {
            project_id: projectId,
            name: name,
            description: ''
        });
        return {
            id: docRef.id,
            project_id: projectId,
            name: name
        } as Unit;
    },

    assignPartToUnit: async (partId: string, unitId: string | null): Promise<void> => {
        const docRef = doc(db, 'parts', partId);
        await updateDoc(docRef, {
            unit_id: unitId
        });
    },

    getParts: async (projectId?: string): Promise<Part[]> => {
        let q;
        if (projectId) {
            q = query(collection(db, 'parts'), where('project_id', '==', projectId));
        } else {
            q = collection(db, 'parts');
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: parseInt(doc.id), // id を number に変換
            ...dateConverter(doc.data())
        })) as Part[];
    },

    getPartItems: async (projectId?: string): Promise<PartItem[]> => {
        // プロジェクトID指定がある場合、まず対象のPartを取得
        let targetPartIds: number[] | null = null; // string から number に変更
        if (projectId) {
            const parts = await mockStore.getParts(projectId);
            targetPartIds = parts.map(p => p.id); // id は number
            if (targetPartIds.length === 0) return [];
        }

        const snapshot = await getDocs(collection(db, 'partItems'));
        const items = snapshot.docs.map(doc => ({
            id: parseInt(doc.id), // id を number に変換
            ...dateConverter(doc.data())
        })) as PartItem[];

        if (targetPartIds) {
            return items.filter(item => targetPartIds!.includes(item.partId)); // part_id を partId に変更
        }
        return items;
    },

    getPartItem: async (id: number): Promise<(PartItem & { part: Part }) | null> => { // id を number に変更, parts を part に変更
        const itemRef = doc(db, 'partItems', String(id)); // Firestore は ID を string で扱うため変換
        const itemSnap = await getDoc(itemRef);

        if (!itemSnap.exists()) return null;
        const itemData = { id: parseInt(itemSnap.id), ...dateConverter(itemSnap.data()) } as PartItem; // id を number に変換

        // 関連するPartを取得 (Prisma の Part.id も Int のため、id を number として渡す)
        const partRef = doc(db, 'parts', String(itemData.partId)); // part_id を partId に変更, String(id) に変換
        const partSnap = await getDoc(partRef);

        if (!partSnap.exists()) {
            throw new Error(`Part not found for item ${id}`);
        }
        const partData = { id: parseInt(partSnap.id), ...dateConverter(partSnap.data()) } as Part; // id を number に変換

        return { ...itemData, part: partData }; // parts を part に変更
    },

    updatePartItem: async (id: number, updates: Partial<PartItem>): Promise<void> => { // id を number に変更
        const docRef = doc(db, 'partItems', String(id)); // Firestore は ID を string で扱うため変換
        await updateDoc(docRef, updates);
    },

    updatePartItemStatus: async (id: number, newStatus: string): Promise<void> => { // id を number に変更
        const docRef = doc(db, 'partItems', String(id)); // Firestore は ID を string で扱うため変換
        await updateDoc(docRef, {
            status: newStatus,
            updatedAt: serverTimestamp() // updated_at を updatedAt に変更
        });
    },

    addPartItem: async (item: Omit<PartItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<PartItem> => { // createdAt と updatedAt を追加
        const docRef = await addDoc(collection(db, 'partItems'), item);
        return {
            id: parseInt(docRef.id), // id を number に変換
            createdAt: new Date(), // 仮の値
            updatedAt: new Date(), // 仮の値
            ...item
        } as PartItem;
    },

};