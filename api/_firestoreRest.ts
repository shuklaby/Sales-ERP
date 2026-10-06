import fs from 'fs';
import path from 'path';

let cachedConfig: any = null;

export function getFirebaseConfig() {
  if (cachedConfig) return cachedConfig;

  let cfg = {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0351963882',
    apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDt2X0Y79bLa5X7A3_SoYqMyKciG9G3ruY',
    firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-4bb65925-92be-44b8-8a44-7de3a116a99d',
  };

  try {
    const rootCfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(rootCfgPath)) {
      const fileData = JSON.parse(fs.readFileSync(rootCfgPath, 'utf-8'));
      cfg = { ...cfg, ...fileData };
    }
  } catch {}

  cachedConfig = cfg;
  return cfg;
}

export function fromFirestoreFields(fields: any): any {
  if (!fields || typeof fields !== 'object') return {};
  const res: any = {};
  for (const key of Object.keys(fields)) {
    const val = fields[key];
    if (val === undefined || val === null) continue;
    if ('stringValue' in val) res[key] = val.stringValue;
    else if ('doubleValue' in val) res[key] = Number(val.doubleValue);
    else if ('integerValue' in val) res[key] = Number(val.integerValue);
    else if ('booleanValue' in val) res[key] = Boolean(val.booleanValue);
    else if ('nullValue' in val) res[key] = null;
    else if ('mapValue' in val) res[key] = fromFirestoreFields(val.mapValue?.fields || {});
    else if ('arrayValue' in val) {
      const arr = val.arrayValue?.values || [];
      res[key] = arr.map((item: any) => {
        if ('stringValue' in item) return item.stringValue;
        if ('doubleValue' in item) return Number(item.doubleValue);
        if ('integerValue' in item) return Number(item.integerValue);
        if ('booleanValue' in item) return Boolean(item.booleanValue);
        if ('mapValue' in item) return fromFirestoreFields(item.mapValue?.fields || {});
        return item;
      });
    }
  }
  return res;
}

export function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(toFirestoreValue),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: any = {};
    for (const k of Object.keys(val)) {
      fields[k] = toFirestoreValue(val[k]);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export async function findProposalInFirestore(
  identifier?: string,
  proposalNumber?: string
): Promise<{ id: string; data: any; rawDoc: any } | null> {
  const cfg = getFirebaseConfig();
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents`;

  // 1. Try direct doc fetch by ID
  if (identifier) {
    try {
      const res = await fetch(`${baseUrl}/proposals/${encodeURIComponent(identifier)}?key=${cfg.apiKey}`);
      if (res.ok) {
        const raw = await res.json();
        const data = fromFirestoreFields(raw.fields);
        data.id = identifier;
        return { id: identifier, data, rawDoc: raw };
      }
    } catch (e) {
      console.warn('[Firestore REST] Direct ID lookup error:', e);
    }
  }

  // 2. Try query by viewToken
  if (identifier) {
    try {
      const qRes = await fetch(`${baseUrl}:runQuery?key=${cfg.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'proposals' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'viewToken' },
                op: 'EQUAL',
                value: { stringValue: identifier },
              },
            },
            limit: 1,
          },
        }),
      });
      if (qRes.ok) {
        const list = await qRes.json();
        if (Array.isArray(list) && list[0]?.document) {
          const docItem = list[0].document;
          const docId = docItem.name.split('/').pop() || '';
          const data = fromFirestoreFields(docItem.fields);
          data.id = docId;
          return { id: docId, data, rawDoc: docItem };
        }
      }
    } catch (e) {
      console.warn('[Firestore REST] viewToken query error:', e);
    }
  }

  // 3. Try query by proposalNumber
  const targetNum = proposalNumber || identifier;
  if (targetNum) {
    try {
      const qRes = await fetch(`${baseUrl}:runQuery?key=${cfg.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'proposals' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'proposalNumber' },
                op: 'EQUAL',
                value: { stringValue: targetNum },
              },
            },
            limit: 1,
          },
        }),
      });
      if (qRes.ok) {
        const list = await qRes.json();
        if (Array.isArray(list) && list[0]?.document) {
          const docItem = list[0].document;
          const docId = docItem.name.split('/').pop() || '';
          const data = fromFirestoreFields(docItem.fields);
          data.id = docId;
          return { id: docId, data, rawDoc: docItem };
        }
      }
    } catch (e) {
      console.warn('[Firestore REST] proposalNumber query error:', e);
    }
  }

  return null;
}

export async function patchProposalInFirestore(
  proposalId: string,
  updateData: Record<string, any>
): Promise<boolean> {
  const cfg = getFirebaseConfig();
  const keys = Object.keys(updateData);
  if (keys.length === 0) return true;

  const updateMask = keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents/proposals/${encodeURIComponent(proposalId)}?${updateMask}&key=${cfg.apiKey}`;

  const fields: any = {};
  for (const k of keys) {
    fields[k] = toFirestoreValue(updateData[k]);
  }

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn('[Firestore REST] Patch proposal error:', res.status, errData);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Firestore REST] Patch exception:', err);
    return false;
  }
}

export async function createDocumentInFirestore(
  collectionName: string,
  docId: string,
  data: Record<string, any>
): Promise<boolean> {
  const cfg = getFirebaseConfig();
  const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents/${encodeURIComponent(collectionName)}?documentId=${encodeURIComponent(docId)}&key=${cfg.apiKey}`;

  const fields: any = {};
  for (const k of Object.keys(data)) {
    fields[k] = toFirestoreValue(data[k]);
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn(`[Firestore REST] Create in ${collectionName} error:`, res.status, errData);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[Firestore REST] Create in ${collectionName} exception:`, err);
    return false;
  }
}
