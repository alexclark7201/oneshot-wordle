const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const words = [
  "apple","react","ghost","pixel","shark","train","world","beach","flame","heavy",
  "magic","tiger","water","solar","vivid","storm","crane","brave","light","smile",
  "stone","pride","sword","orbit","drift","smash","trace","globe","prism","cable"
];

function getDay() {
  const now = new Date();
  const pst = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  );
  return pst.toISOString().slice(0, 10);
}

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
      return json({ result: "error" });
    }

    const normEmail = email.toLowerCase().trim();
    const day = getDay();
    const word = getWord(day);

    const { data: existing } = await supabase
      .from("guesses")
      .select("id")
      .eq("email", normEmail)
      .eq("game_day", day)
      .limit(1);

    if (existing && existing.length > 0) {
      return json({ result: "already_used" });
    }

    const correct = guess.toLowerCase() === word;

    await supabase.from("guesses").insert([
      {
        email: normEmail,
        guess,
        correct,
        game_day: day
      }
    ]);

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
