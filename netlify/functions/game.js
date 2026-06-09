import { createClient } from "@supabase/supabase-js";

// ===============================
// SUPABASE CLIENT
// ===============================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
// GAME STATE
// ===============================

async function getOrCreateGame(dateKey, word) {
  const { data } = await supabase
    .from("daily_games")
    .select("*")
    .eq("date", dateKey)
    .single();

  if (data) return data;

  await supabase.from("daily_games").insert({
    date: dateKey,
    word,
    solved: false,
    winner: null
  });

  return {
    date: dateKey,
    word,
    solved: false,
    winner: null
  };
}

async function lockGame(dateKey, winner) {
  await supabase
    .from("daily_games")
    .update({
      solved: true,
      winner,
      solved_at: new Date().toISOString()
    })
    .eq("date", dateKey);
}

// ===============================
// USER SYSTEM (NEW)
// ===============================

async function getOrCreateUserFromEmail(email) {

  const username = email.split("@")[0];

  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("users")
    .insert({
      username,
      phone: email
    })
    .select()
    .single();

  if (error) throw error;

  return created;
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

    // ===============================
    // USER CREATION (NEW)
    // ===============================

    const user = await getOrCreateUserFromEmail(email);

    // ===============================
    // SAVE SCORE (NEW)
    // ===============================

    await supabase.from("scores").insert({
      user_id: user.id,
      username: user.username,
      score
    });

    // ===============================
    // GAME LOCK LOGIC
    // ===============================

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
