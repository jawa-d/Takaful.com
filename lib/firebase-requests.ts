import { RequestItem } from "@/types";
import { db } from "@/lib/firebase";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from "firebase/firestore";

const COLLECTION_NAME = "requests";

export const upsertRequestToFirestore = async (request: RequestItem) => {
  if (!db) return;
  await setDoc(doc(db, COLLECTION_NAME, request.id), request, { merge: true });
};

export const deleteRequestFromFirestore = async (requestId: string) => {
  if (!db) return;
  await deleteDoc(doc(db, COLLECTION_NAME, requestId));
};

export const subscribeRequestsFromFirestore = (onData: (requests: RequestItem[]) => void) => {
  if (!db) return () => undefined;

  const q = query(collection(db, COLLECTION_NAME), orderBy("updatedAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map((d) => d.data() as RequestItem);
    onData(requests);
  });
};
