export async function handler(event) {
  try {
    const { guess } = JSON.parse(event.body || "{}");

    if (!guess || guess.length !== 5) {
      return json({
        error: "invalid_guess",
        message: "Enter a 5-letter word."
      });
    }

    // =========================
    // 1. LOAD DAILY GAME STATE
    // =========================
    const game = await getDailyGame();

    if (game.solved) {
      return json({
        evaluation: null,
        score: 0,
        isCorrect: false,
        gameLocked: true,
        message: `Game over. The word was ${game.word}.`
      });
    }

    const word = game.word.toLowerCase();
    const cleanGuess = guess.toLowerCase();

    // =========================
    // 2. EVALUATE GUESS
    // =========================
    const evaluation = evaluate(cleanGuess, word);

    const isCorrect = cleanGuess === word;

    // =========================
    // 3. CALCULATE SCORE
    // =========================
    const score = calculateScore(evaluation, isCorrect);

    // =========================
    // 4. LOCK GAME IF WON
    // =========================
    if (isCorrect) {
      await lockGame(game.date);
    }

    return json({
      evaluation,
      score,
      isCorrect,
      gameLocked: isCorrect,
      message: isCorrect
        ? "You got it. Clean."
        : "Not it."
    });

  } catch (err) {
    return json({
      error: "server_error",
      message: "Something broke."
    });
  }
}

---

/* =========================
   GAME ENGINE CORE
========================= */

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

function calculateScore(evaluation, isCorrect) {
  let score = 0;

  for (let i = 0; i < evaluation.length; i++) {
    if (evaluation[i] === "correct") score += 5;
    if (evaluation[i] === "present") score += 1;
  }

  if (isCorrect) score += 50;

  return score;
}

function json(data) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  };
}

/* =========================
   DAILY GAME STORAGE (TEMP MOCK)
========================= */

let memoryGame = {
  date: new Date().toISOString().split("T")[0],
  word: "apple",
  solved: false
};

async function getDailyGame() {
  return memoryGame;
}

async function lockGame(date) {
  memoryGame.solved = true;
}
