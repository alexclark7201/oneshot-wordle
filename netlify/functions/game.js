const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

/* =========================
   SUPABASE
   ========================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/* =========================
   LOAD WORD LIST (10k)
   ========================= */
const words = JSON.parse(
  fs.readFileSync(path.join(__dirname, "words.json"), "utf8")
);

/* =========================
   DAILY DATE (PST)
   ========================= */
function getDay() {
  const now = new Date();
  const pst = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  );
  return pst.toISOString().slice(0, 10);
}

/* =========================
   DAILY WORD PICK
   ========================= */
function getWord(day) {
  let hash = 0;

  for (let i = 0; i < day.length; i++) {
    hash = (hash << 5) - hash + day.charCodeAt(i);
    hash |= 0;
  }

  return words[Math.abs(hash) % words.length];
}

/* =========================
   HANDLER
   ========================= */
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const body = JSON.parse(event.body || "{}");
    const email = (body.email || "").toLowerCase().trim();
    const guess = (body.guess || "").toLowerCase().trim();

    if (!email || !guess) {
      return json(400, { error: "Missing email or guess" });
    }

    if (guess.length !== 5) {
      return json(400, { error: "Guess must be 5 letters" });
    }

    const day = getDay();
    const word = getWord(day);

    /* check duplicate email per day */
    const { data: existing } = await supabase
      .from("guesses")
      .select("id")
      .eq("email", email)
      .eq("game_day", day)
      .limit(1);

    if (existing?.length > 0) {
      return json(200, { result: "already_used" });
    }

    const correct = guess === word;

    await supabase.from("guesses").insert([
      {
        email,
        guess,
        correct,
        game_day: day
      }
    ]);

    return json(200, {
      result: correct ? "correct" : "incorrect"
    });

  } catch (err) {
    console.error(err);
    return json(500, { error: err.message });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}
