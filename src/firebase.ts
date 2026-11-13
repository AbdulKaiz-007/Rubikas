import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate live connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export type AllowedContentType =
  | 'digit'
  | 'letter'
  | 'number'
  | 'word'
  | 'math_expression'
  | 'sentence'
  | 'document';

export type AllowedPipeline =
  | 'CUSTOM_TENSORFLOW_CNN'
  | 'CLOUD_VISION_FALLBACK'
  | 'GOOGLE_CLOUD_VISION_REST_API';

export interface UserProfileRecord {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  preferredLanguage: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ScanRecord {
  id: string;
  ownerId: string;
  detectedText: string;
  contentType: AllowedContentType;
  confidence: number;
  pipeline: AllowedPipeline;
  mathEvaluated?: string;
  translatedText?: string;
  targetLanguage?: string;
  notes?: string;
  thumbnailDataUrl?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

const VALID_CONTENT_TYPES = new Set<AllowedContentType>([
  'digit',
  'letter',
  'number',
  'word',
  'math_expression',
  'sentence',
  'document',
]);

export function normalizeContentType(raw?: string): AllowedContentType {
  if (raw && VALID_CONTENT_TYPES.has(raw as AllowedContentType)) {
    return raw as AllowedContentType;
  }
  return 'word';
}

export function normalizePipeline(raw?: string): AllowedPipeline {
  if (raw === 'CUSTOM_TENSORFLOW_CNN') return 'CUSTOM_TENSORFLOW_CNN';
  if (raw === 'GOOGLE_CLOUD_VISION_REST_API') return 'GOOGLE_CLOUD_VISION_REST_API';
  return 'CLOUD_VISION_FALLBACK';
}

export async function ensureUserProfile(user: {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}): Promise<UserProfileRecord> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);

  let existingSnap;
  try {
    existingSnap = await getDocFromServer(ref);
  } catch (err) {
    // Document may not exist yet or permission check; check carefully
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.GET, path);
    }
    existingSnap = null;
  }

  const displayName = (user.displayName || user.email?.split('@')[0] || 'Digit AIpro User').slice(0, 100);
  const email = (user.email || 'user@example.com').slice(0, 200);
  const photoURL = user.photoURL ? user.photoURL.slice(0, 500) : undefined;

  if (existingSnap && existingSnap.exists()) {
    const data = existingSnap.data() as UserProfileRecord;
    const updatePayload: Record<string, unknown> = {
      displayName,
      preferredLanguage: (data.preferredLanguage || 'es').slice(0, 16),
      updatedAt: serverTimestamp(),
    };
    if (photoURL) {
      updatePayload.photoURL = photoURL;
    }
    try {
      await updateDoc(ref, updatePayload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
    return {
      ...data,
      displayName,
      photoURL: photoURL || data.photoURL,
    };
  }

  const createPayload: Record<string, unknown> = {
    uid: user.uid,
    displayName,
    email,
    preferredLanguage: 'es',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (photoURL) {
    createPayload.photoURL = photoURL;
  }

  try {
    await setDoc(ref, createPayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }

  return {
    uid: user.uid,
    displayName,
    email,
    photoURL,
    preferredLanguage: 'es',
  };
}

export async function updatePreferredLanguage(uid: string, lang: string): Promise<void> {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  try {
    await updateDoc(ref, {
      preferredLanguage: lang.slice(0, 16),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export interface SaveScanInput {
  detectedText: string;
  contentType?: string;
  confidence: number;
  pipeline: string;
  mathEvaluated?: string | null;
  translatedText?: string | null;
  targetLanguage?: string | null;
  notes?: string;
  thumbnailDataUrl?: string | null;
}

export async function saveScanToFirestore(uid: string, input: SaveScanInput): Promise<string> {
  const scanId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const path = `users/${uid}/scans/${scanId}`;
  const ref = doc(db, 'users', uid, 'scans', scanId);

  const detectedText = input.detectedText.trim().slice(0, 2000);
  if (!detectedText) {
    throw new Error('Cannot save an empty recognition result.');
  }

  const confidence = Math.max(0, Math.min(1, Number(input.confidence) || 0));
  const payload: Record<string, unknown> = {
    ownerId: uid,
    detectedText,
    contentType: normalizeContentType(input.contentType),
    confidence,
    pipeline: normalizePipeline(input.pipeline),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (input.mathEvaluated && input.mathEvaluated.trim()) {
    payload.mathEvaluated = input.mathEvaluated.trim().slice(0, 200);
  }
  if (input.translatedText && input.translatedText.trim()) {
    payload.translatedText = input.translatedText.trim().slice(0, 2000);
  }
  if (input.targetLanguage && input.targetLanguage.trim()) {
    payload.targetLanguage = input.targetLanguage.trim().slice(0, 16);
  }
  if (input.notes && input.notes.trim()) {
    payload.notes = input.notes.trim().slice(0, 500);
  }
  if (input.thumbnailDataUrl && input.thumbnailDataUrl.length <= 60000) {
    payload.thumbnailDataUrl = input.thumbnailDataUrl;
  }

  try {
    await setDoc(ref, payload);
    return scanId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateScanRecord(
  uid: string,
  scanId: string,
  updates: { notes?: string; translatedText?: string; targetLanguage?: string }
): Promise<void> {
  const path = `users/${uid}/scans/${scanId}`;
  const ref = doc(db, 'users', uid, 'scans', scanId);

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (updates.notes !== undefined) {
    payload.notes = updates.notes.trim().slice(0, 500);
  }
  if (updates.translatedText !== undefined) {
    payload.translatedText = updates.translatedText.trim().slice(0, 2000);
  }
  if (updates.targetLanguage !== undefined) {
    payload.targetLanguage = updates.targetLanguage.trim().slice(0, 16);
  }

  try {
    await updateDoc(ref, payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteScanRecord(uid: string, scanId: string): Promise<void> {
  const path = `users/${uid}/scans/${scanId}`;
  const ref = doc(db, 'users', uid, 'scans', scanId);
  try {
    await deleteDoc(ref);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function subscribeUserScans(
  uid: string,
  onData: (scans: ScanRecord[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = `users/${uid}/scans`;
  const q = query(
    collection(db, 'users', uid, 'scans'),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(60)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: ScanRecord[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ScanRecord, 'id'>),
      }));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}
