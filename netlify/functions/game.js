const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/* WORD LIST */
const words = [
"about","above","actor","acute","adapt","admin","admit","adopt","adult","after",
"again","agent","agree","ahead","alarm","album","alert","alike","alive","allow",
"alone","along","alter","among","anger","angle","angry","apart","apple","apply",
"arena","argue","arise","array","aside","asset","audio","audit","avoid","award",
"aware","badly","baker","basic","beach","begin","below","black","blind","block",
"board","brain","brand","bread","break","bring","brown","build","cable","carry",
"catch","chain","chair","chase","cheap","check","child","claim","clean","clear",
"clock","close","cloud","could","count","court","cover","craft","crash","cream",
"crime","cross","crowd","dance","death","delay","depth","doubt","dream","drink",
"drive","earth","empty","enemy","enjoy","enter","equal","event","every","faith",
"fault","field","fight","final","first","focus","force","frame","fresh","front",
"fruit","giant","glass","great","green","group","guard","happy","heart","heavy",
"horse","house","human","image","issue","large","later","laugh","learn","light",
"limit","local","lucky","magic","major","maker","money","month","music","night",
"noise","north","ocean","offer","order","other","place","plant","point","power",
"price","pride","print","prize","queen","quick","quiet","radio","reach","ready",
"river","rough","round","scale","scene","scope","serve","shape","share","sharp",
"short","sight","skill","small","smart","smile","sound","space","speak","speed",
"spend","stand","start","state","stick","still","store","storm","story","study",
"table","teach","terms","thank","their","theme","there","these","thing","think",
"three","today","topic","total","touch","trade","train","treat","trust","truth",
"under","union","value","video","voice","water","wheel","where","which","while",
"white","whole","woman","world","write","wrong","youth"
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

/* WORDLE EVALUATION */
function evaluate(guess, word) {
  const res = Array(5).fill("absent");
  const target = word.split("");

  // correct
  for (let i = 0; i < 5; i++) {
    if (guess[i] === target[i]) {
      res[i] = "correct";
      target[i] = null;
    }
  }

  // present
  for (let i = 0; i < 5; i++) {
    if (res[i] === "correct") continue;
    const idx = target.indexOf(guess[i]);
    if (idx !== -1) {
      res[i] = "present";
      target[idx] = null;
    }
  }

  return res;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const { email, guess } = JSON.parse(event.body || "{}");

    const cleanEmail = email?.toLowerCase().trim();
    const cleanGuess = guess?.toLowerCase().trim();

    if (!cleanEmail || !cleanGuess) {
      return json(400, { error: "Missing data" });
    }

    const day = getDay();
    const word = getWord(day);

    // prevent multiple plays
    const { data: existing } = await supabase
      .from("guesses")
      .select("id")
      .eq("email", cleanEmail)
      .eq("game_day", day);

    if (existing?.length) {
      return json(200, { result: "already_used" });
    }

    const correct = cleanGuess === word;
    const evaluation = evaluate(cleanGuess, word);

    await supabase.from("guesses").insert([{
      email: cleanEmail,
      guess: cleanGuess,
      correct,
      game_day: day
    }]);

    return json(200, {
      result: correct ? "correct" : "incorrect",
      evaluation,
      word // optional debug (you can remove later)
    });

  } catch (err) {
    console.error(err);
    return json(500, { error: err.message });
  }
};

function json(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}
