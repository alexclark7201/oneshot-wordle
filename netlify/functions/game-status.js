import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    })
  });
}

const db = admin.firestore();

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export async function handler() {

  const todayKey = getTodayKey();

  const snapshot = await db.collection("games").get();

  const docs = [];

  snapshot.forEach(doc => {
    docs.push({
      id: doc.id,
      ...doc.data()
    });
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      todayKey,
      docs
    })
  };

}
