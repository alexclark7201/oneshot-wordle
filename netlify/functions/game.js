// =====================================
// ONE SHOT - GAME ENGINE v3
// Daily Word + First Winner Lock System
// =====================================

// ---------------------
// WORD LIST
// ---------------------

const WORDS = [
  "apple","crane","smile","grape","flame",
  "brick","stone","plant","train","light",
  "river","sound","crown","sharp","brave",
  "cloud","ocean","storm","beach","music"
];

// ---------------------
// DAILY STATE (TEMP MEMORY)
// ---------------------

const dailyState = {};

// ---------------------
// DATE KEY (GLOBAL DAY ID)
// ---------------------

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// ---------------------
// DAILY WORD (DETERMINISTIC)
// ---------------------

function getDailyWord() {
  const today = new Date();

  const seed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();

  return WORDS[seed % WORDS.length];
}

// ---------------------
// WORDLE EVALUATION ENGINE
// ---------------------

function evaluate(guess, word) {
  const result = Array(5).fill("absent");

  const w = word.split("");
  const g = guess.split("");

  // correct pass
  for (let i = 0; i < 5; i++) {
    if (g[i] === w[i]) {
      result[i] = "correct";
      w[i] = null;
      g[i] = null;
    }
  }

  // present pass
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

// ---------------------
// SCORING SYSTEM
// ---------------------

function calculateScore(evaluation, isCorrect) {
  let score = 0;

  for (let i = 0; i < evaluation.length; i++) {
    if (evaluation[i] === "correct") score += 5;
    if (evaluation[i] === "present") score += 1;
  }

  if (isCorrect) score += 50;

  return score;
}

// ---------------------
// RESPONSE HELPER
// ---------------------

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

// ---------------------
// MAIN HANDLER
// ---------------------

export async function handler(event) {
  try {
    const { guess } = JSON.parse(event.body || "{}");

    if (!guess || guess.length !== 5) {
      return json({
        evaluation: null,
        score: 0,
        isCorrect: false,
        gameLocked: false,
        message: "Enter a 5-letter word."
      });
    }

    const word = getDailyWord();
    const cleanGuess = guess.toLowerCase();

    const evaluation = evaluate(cleanGuess, word);
    const isCorrect = cleanGuess === word;
    const score = calculateScore(evaluation, isCorrect);

    const todayKey = getTodayKey();

    // ---------------------
    // INIT DAILY STATE
    // ---------------------

    if (!dailyState[todayKey]) {
      dailyState[todayKey] = {
        solved: false,
        winner: null,
        solvedAt: null
      };
    }

    // ---------------------
    // IF ALREADY SOLVED
    // ---------------------

    if (dailyState[todayKey].solved) {
      return json({
        evaluation,
        score,
        isCorrect,
        gameLocked: true,
        winner: dailyState[todayKey].winner,
        message: `Already solved today by ${dailyState[todayKey].winner}`
      });
    }

    // ---------------------
    // FIRST WINNER LOCK
    // ---------------------

    if (isCorrect && !dailyState[todayKey].solved) {
      dailyState[todayKey].solved = true;
      dailyState[todayKey].winner = "Player";
      dailyState[todayKey].solvedAt = new Date().toISOString();
    }

    return json({
      evaluation,
      score,
      isCorrect,
      gameLocked: dailyState[todayKey].solved,
      winner: dailyState[todayKey].winner,
      message: isCorrect
        ? "You solved it. First today."
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
