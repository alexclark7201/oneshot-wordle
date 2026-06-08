export async function handler(event) {
  try {
    const { email, guess } = JSON.parse(event.body || "{}");

    if (!email || !guess || guess.length !== 5) {
      return json({
        result: "invalid",
        message: "Enter a 5-letter word + email."
      });
    }

    const word = await getDailyWord();

    const cleanGuess = guess.toLowerCase();
    const cleanWord = word.toLowerCase();

    const alreadyUsed = await checkIfUsedToday(email);
    if (alreadyUsed) {
      return json({
        result: "already_used",
        message: "You already used today’s shot."
      });
    }

    const evaluation = evaluate(cleanGuess, cleanWord);
    const isCorrect = cleanGuess === cleanWord;

    await storeResult(email, cleanGuess, isCorrect);

    const payload = {
      result: isCorrect ? "correct" : "incorrect",
      evaluation,
      message: isCorrect
        ? getWinMessage()
        : getLossMessage()
    };

    return json(payload);

  } catch (err) {
    return json({
      result: "error",
      message: "Server error."
    });
  }
}

/* =========================
   WORDLE EVALUATION
========================= */

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

/* =========================
   MESSAGES (UPGRADED BUT SAFE)
========================= */

function getWinMessage() {
  const msgs = [
    "Clean hit.",
    "Nice. You got it.",
    "Perfect.",
    "That’s it."
  ];
  return pick(msgs);
}

function getLossMessage() {
  const msgs = [
    "Nope.",
    "Not even close.",
    "That guess didn’t land anywhere near it.",
    "You were guessing in another universe.",
    "Respectfully… what was that?",
    "That was confidently incorrect.",
    "That one hurt to watch.",
    "You missed by a lot.",
    "I’ve seen better guesses from random typing.",
    "That wasn’t it."
  ];
  return pick(msgs);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* =========================
   RESPONSE WRAPPER
========================= */

function json(data) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  };
}

/* =========================
   PLACEHOLDERS (REPLACE LATER)
========================= */

async function getDailyWord() {
  return "apple";
}

async function checkIfUsedToday(email) {
  return false;
}

async function storeResult(email, guess, isCorrect) {
  return true;
}
