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

export async function handler() {
  try {
    const snapshot = await db.collection("scores").get();

    const totals = {};

    snapshot.forEach(doc => {
      const data = doc.data();

      const username = data.username || "Unknown";
      const score = Number(data.score || 0);

      totals[username] = (totals[username] || 0) + score;
    });

    const leaderboard = Object.entries(totals)
      .map(([username, score]) => ({
        username,
        score
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(leaderboard)
    };

  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to load leaderboard"
      })
    };
  }
}
