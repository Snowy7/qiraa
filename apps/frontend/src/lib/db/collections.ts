import { db } from "./index";

export async function createCollection(data: {
  name: string;
  color: string;
}): Promise<string> {
  const now = Date.now();
  const last = await db.collections.orderBy("sortOrder").last();
  const id = crypto.randomUUID();
  await db.collections.add({
    id,
    name: data.name,
    color: data.color,
    sortOrder: (last?.sortOrder ?? -1) + 1,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function deleteCollection(id: string): Promise<void> {
  await db.transaction("rw", db.collections, db.bookmarks, async () => {
    await db.bookmarks.where("collectionId").equals(id).delete();
    await db.collections.delete(id);
  });
}
