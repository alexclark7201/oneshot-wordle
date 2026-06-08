export async function handler(event) {
  try {
    const { email, guess } = JSON.parse(event.body || "{}");

    if (!email || !guess || guess.length !== 5) {
      return json({
        result: "invalid",
        message: "Missing email or invalid guess."
      });
    }

    const word = await getDailyWord(); // replace with your Supabase logic

    const normalizedGuess = guess.toLowerCase();
    const normalizedWord = word.toLowerCase();

    const alreadyUsed = await checkIfUsedToday(email);
    if (alreadyUsed) {
      return json({
        result: "already_used",
        message: "You already used today’s shot."
      });
    }

    const evaluation = evaluateGuess(normalizedGuess, normalizedWord);
    const isCorrect = normalizedGuess === normalizedWord;

    await storeResult(email, normalizedGuess, isCorrect);

    return json({
      result: isCorrect ? "correct" : "incorrect",
      evaluation,
      message: isCorrect
        ? getWinMessage()
        : getLossMessage()
    });

  } catch (err) {
    return json({
      result: "error",
      message: "Server error. Try again."
    });
  }
}

/* =========================
   WORDLE EVALUATION ENGINE
========================= */

function evaluateGuess(guess, word) {
  const result = Array(5).fill("absent");
  const wordArr = word.split("");
  const guessArr = guess.split("");

  // correct first pass
  for (let i = 0; i < 5; i++) {
    if (guessArr[i] === wordArr[i]) {
      result[i] = "correct";
      wordArr[i] = null;
      guessArr[i] = null;
    }
  }

  // present second pass
  for (let i = 0; i < 5; i++) {
    if (!guessArr[i]) continue;

    const idx = wordArr.indexOf(guessArr[i]);
    if (idx !== -1) {
      result[i] = "present";
      wordArr[idx] = null;
    }
  }

  return result;
}

/* =========================
   WIN / LOSS MESSAGES
   (UPGRADED “JAB SYSTEM”)
========================= */

function getWinMessage() {
  const msgs = [
    "Clean hit.",
    "Alright, you got it.",
    "Perfect. Nothing to say here.",
    "That’s the one."
  ];
  return pick(msgs);
}

function getLossMessage() {
  const msgs = [
    "Nope. That was genuinely off the mark.",
    "Not even close — impressive confidence though.",
    "That guess didn’t stand a chance.",
    "You were aiming in the right zip code, just not this planet.",
    "That’s not the word. That’s just noise.",
    "Respectfully… what was that?",
    "You missed by a lot. Like, a lot a lot.",
    "That one hurt to watch.",
    "If guessing wrong was the goal, you nailed it.",
    "That’s not it. Not remotely.",
    "You were swinging blindfolded in a different stadium.",
    "That guess should probably stay private.",
    "I’ve seen better guesses from autocomplete.",
    "That was creative. Incorrect, but creative.",
    "You’re playing a different game entirely."
  ];

  return pick(msgs);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* =========================
   HELPERS
========================= */

function json(data) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  };
}

/* =========================
   PLACEHOLDER LOGIC
   (REPLACE WITH SUPABASE)
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
