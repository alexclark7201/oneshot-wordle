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

  try {

    const todayKey = getTodayKey();

    const doc = await db
      .collection("games")
      .doc(todayKey)
      .get();

    if (!doc.exists) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          solved: false
        })
      };
    }

    const game = doc.data();

    return {
  statusCode: 200,
  body: JSON.stringify({
    solved: game.solved || false,
    winner: game.winner || null,
    answer: game.word || null,
    test: "GAME_STATUS_V2"
  })
};

  } catch (err) {

    console.error(err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        solved: false
      })
    };

  }

}
