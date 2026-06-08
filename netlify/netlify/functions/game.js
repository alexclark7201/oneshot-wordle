const { createClient } = require("@supabase/supabase-js");

/* Supabase client */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/* WORD LIST (expandable) */
const words = [
  "apple","react","ghost","pixel","shark","train","world","beach","flame","heavy",
  "magic","tiger","water","solar","vivid","storm","crane","brave","light","smile",
  "stone","pride","sword","orbit","drift","smash","trace","globe","prism","cable"
];

/* PST DAY (3AM EST reset equivalent) */
function getDay() {
  const now = new Date();
  const pst = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  );
  return pst.toISOString().slice(0, 10);
}

/* deterministic word */
function getWord(day) {
  let hash = 0;
  for (let i = 0; i < day.length; i++) {
    hash = (hash << 5) - hash + day.charCodeAt(i);
    hash |= 0;
  }
  return words[Math.abs(hash) % words.length];
}

exports.handler = async (event) => {
  try {
    const { email, guess } = JSON.parse(event.body);

    if (!email || !guess) {
      return json({ result: "error", message: "missing fields" });
    }

    const normEmail = email.toLowerCase().trim();
    const day = getDay();
    const word = getWord(day);

    /* check if already played today */
    const { data: existing, error: fetchError } = await supabase
      .from("guesses")
      .select("id")
      .eq("email", normEmail)
      .eq("game_day", day)
      .limit(1);

    if (fetchError) {
      console.log(fetchError);
      return json({ result: "error" });
    }

    if (existing && existing.length > 0) {
      return json({ result: "already_used" });
    }

    const correct = guess.toLowerCase() === word;

    /* insert attempt */
    const { error: insertError } = await supabase
      .from("guesses")
      .insert([
        {
          email: normEmail,
          guess,
          correct,
          game_day: day
        }
      ]);

    if (insertError) {
      console.log(insertError);
      return json({ result: "error" });
    }

    return json({
      result: correct ? "correct" : "incorrect"
    });

  } catch (err) {
    console.log(err);
    return json({ result: "error" });
  }
};

function json(body) {
  return {
    statusCode: 200,
    body: JSON.stringify(body)
  };
}
