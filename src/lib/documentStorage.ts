// IndexedDB storage for large documents (PDFs) that exceed localStorage limits

const DB_NAME = 'farmcalc-docs';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

interface StoredDocument {
  productId: string;
  type: 'label' | 'sds';
  data: string;  // base64
  fileName?: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: ['productId', 'type'] });
        store.createIndex('productId', 'productId', { unique: false });
      }
    };
  });
  
  return dbPromise;
}

export async function saveDocument(
  productId: string, 
  type: 'label' | 'sds', 
  data: string, 
  fileName?: string
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    const doc: StoredDocument = { productId, type, data, fileName };
    const request = store.put(doc);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getDocument(
  productId: string, 
  type: 'label' | 'sds'
): Promise<{ data: string; fileName?: string } | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    
    const request = store.get([productId, type]);
    
    request.onsuccess = () => {
      const result = request.result as StoredDocument | undefined;
      if (result) {
        resolve({ data: result.data, fileName: result.fileName });
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteDocument(productId: string, type: 'label' | 'sds'): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    const request = store.delete([productId, type]);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteAllDocumentsForProduct(productId: string): Promise<void> {
  await Promise.all([
    deleteDocument(productId, 'label'),
    deleteDocument(productId, 'sds'),
  ]);
}
