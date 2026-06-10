import admin from "firebase-admin";

// ===============================
// FIREBASE INIT (SAFE FOR NETLIFY)
// ===============================

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
    })
  });
}

const db = admin.firestore();

// ===============================
// WORD LIST
// ===============================

const WORDS = [
  "apple","crane","smile","grape","flame",
  "brick","stone","plant","train","light",
  "river","sound","crown","sharp","brave",
  "cloud","ocean","storm","beach","music"
];

// ===============================
// DAILY WORD
// ===============================

function getDailyWord() {
  const d = new Date();

  const seed =
    d.getFullYear() * 10000 +
    (d.getMonth() + 1) * 100 +
    d.getDate();

  return WORDS[seed % WORDS.length];
}

// ===============================
// DATE KEY
// ===============================

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// ===============================
// EVALUATION ENGINE
// ===============================

function evaluate(guess, word) {
  const result = Array(5).fill("absent");

  const w = word.split("");
  const g = guess.split("");

  for (let i = 0; i < 5; i++) {
    if (g[i] === w[i]) {
      result[i] = "correct";
      w[i] = null;
      g[i] = null;
    }
  }

  for (let i = 0; i < 5; i++) {
    if (!g[i]) continue;

    const idx = w.indexOf(g[i]);
    if (idx !== -1) {
      result[i] = "present";
      w[idx] = null;
    }
  }

  return result;
}

// ===============================
// SCORING
// ===============================

function calculateScore(evaluation, isCorrect) {
  let score = 0;

  for (const e of evaluation) {
    if (e === "correct") score += 5;
    if (e === "present") score += 1;
  }

  if (isCorrect) score += 50;

  return score;
}

// ===============================
// RESPONSE HELPER
// ===============================

function json(body) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(body)
  };
}

// ===============================
// USER SYSTEM
// ===============================

async function getOrCreateUser(email) {
  const username = email.split("@")[0];

  const snap = await db
    .collection("users")
    .where("username", "==", username)
    .get();

  if (!snap.empty) {
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  const ref = await db.collection("users").add({
    username,
    phone: email,
    createdAt: Date.now()
  });

  return {
    id: ref.id,
    username
  };
}

// ===============================
// GAME STATE
// ===============================

async function getOrCreateGame(dateKey, word) {
  const ref = db.collection("games").doc(dateKey);
  const doc = await ref.get();

  if (doc.exists) return doc.data();

  const game = {
    date: dateKey,
    word,
    solved: false,
    winner: null
  };

  await ref.set(game);
  return game;
}

async function lockGame(dateKey, winner) {
  await db.collection("games").doc(dateKey).update({
    solved: true,
    winner,
    solvedAt: Date.now()
  });
}

// ===============================
// HANDLER
// ===============================

export async function handler(event) {
  try {
    const { guess, email } = JSON.parse(event.body || "{}");

    if (!guess || guess.length !== 5 || !email) {
      return json({
        evaluation: null,
        score: 0,
        isCorrect: false,
        gameLocked: false,
        message: "Enter email + 5-letter word."
      });
    }

    const word = getDailyWord();
    const todayKey = getTodayKey();

    const game = await getOrCreateGame(todayKey, word);

    const cleanGuess = guess.toLowerCase();

    const evaluation = evaluate(cleanGuess, word);
    const isCorrect = cleanGuess === word;
    const score = calculateScore(evaluation, isCorrect);

    const user = await getOrCreateUser(email);

    await db.collection("scores").add({
      userId: user.id,
      username: user.username,
      score,
      createdAt: Date.now()
    });

    if (game.solved) {
      return json({
        evaluation,
        score,
        isCorrect,
        gameLocked: true,
        winner: game.winner,
        message: `Already solved today by ${game.winner}`
      });
    }

    if (isCorrect) {
      await lockGame(todayKey, user.username);
    }

    return json({
      evaluation,
      score,
      isCorrect,
      gameLocked: isCorrect,
      winner: isCorrect ? user.username : null,
      message: isCorrect
        ? `🏆 ${user.username} solved today's puzzle.`
        : "Not it."
    });

  } catch (err) {
    console.error(err);

    return json({
      evaluation: null,
      score: 0,
      isCorrect: false,
      gameLocked: false,
      message: "Server error."
    });
  }
}
