// ================================
// ONE SHOT - GAME ENGINE v2
// Daily Word System (Stateless)
// ================================

// 1. WORD LIST (temporary local version)
// Later we can move this to a DB or larger JSON file

const WORDS = [
  "apple","crane","smile","grape","flame",
  "brick","stone","plant","train","light",
  "river","sound","crown","sharp","brave",
  "cloud","ocean","storm","beach","music"
];

// ================================
// 2. DAILY WORD SEED FUNCTION
// ================================

function getDailyWord() {
  const today = new Date();

  // YYYYMMDD seed (stable per day globally)
  const seed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();

  const index = seed % WORDS.length;

  return WORDS[index];
}

// ================================
// 3. WORDLE EVALUATION ENGINE
// ================================

function evaluate(guess, word) {
  const result = Array(5).fill("absent");

  const w = word.split("");
  const g = guess.split("");

  // Step 1: correct positions
  for (let i = 0; i < 5; i++) {
    if (g[i] === w[i]) {
      result[i] = "correct";
      w[i] = null;
      g[i] = null;
    }
  }

  // Step 2: present letters
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

// ================================
// 4. SCORING SYSTEM
// ================================

function calculateScore(evaluation, isCorrect) {
  let score = 0;

  for (let i = 0; i < evaluation.length; i++) {
    if (evaluation[i] === "correct") score += 5;
    if (evaluation[i] === "present") score += 1;
  }

  if (isCorrect) score += 50;

  return score;
}

// ================================
// 5. RESPONSE HELPERS
// ================================

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

// ================================
// 6. MAIN HANDLER
// ================================

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

    return json({
      evaluation,
      score,
      isCorrect,
      gameLocked: isCorrect,
      message: isCorrect
        ? "Correct."
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
