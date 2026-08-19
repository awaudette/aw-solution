const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const fs = require('fs');

const envText = fs.readFileSync('.env.local', 'utf8');
const vars = {};
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (!m) continue;
  let val = m[2].trim();
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  vars[m[1]] = val;
}

const privateKey = vars.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n');

initializeApp({
  credential: cert({
    projectId: vars.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: vars.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey,
  }),
  storageBucket: vars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
});

const bucket = getStorage().bucket();

bucket.getFiles({ prefix: 'templates/' }).then(([files]) => {
  for (const f of files) {
    const name = f.metadata.name;
    const token = f.metadata.metadata?.firebaseStorageDownloadTokens;
    const url = token
      ? `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(name)}?alt=media&token=${token}`
      : 'NO_TOKEN';
    console.log(`${name} >>> ${url}`);
  }
}).catch(e => console.error('ERROR:', e.message));
