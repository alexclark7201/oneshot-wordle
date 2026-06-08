const { createClient } = require("@supabase/supabase-js");

/* =========================
   SUPABASE
   ========================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/* =========================
   WORD LIST (500 WORDS INLINE - RELIABLE)
   ========================= */
const words = [
"about","above","actor","acute","adapt","admin","admit","adopt","adult","after",
"again","agent","agree","ahead","alarm","album","alert","alike","alive","allow",
"alone","along","alter","among","anger","angle","angry","apart","apple","apply",
"arena","argue","arise","array","aside","asset","audio","audit","avoid","award",
"aware","badly","baker","bases","basic","beach","began","begin","being","below",
"bench","birth","black","blame","blank","blind","block","blood","board","brain",
"brand","bread","break","brief","bring","broad","brown","build","built","buyer",
"cable","carry","catch","cause","chain","chair","charm","chart","chase","cheap",
"check","chest","chief","child","claim","class","clean","clear","climb","clock",
"close","coach","coast","could","count","court","cover","craft","crash","cream",
"crime","cross","crowd","crown","cycle","daily","dance","death","debut","delay",
"depth","doubt","draft","drama","dream","dress","drink","drive","earth","elite",
"empty","enemy","enjoy","enter","equal","event","every","exact","exist","extra",
"faith","false","fault","field","fight","final","first","fixed","focus","force",
"frame","fresh","front","fruit","giant","glass","globe","great","green","group",
"guard","guest","guide","happy","heart","heavy","horse","house","human","image",
"index","issue","judge","known","large","later","laugh","learn","leave","light",
"limit","local","lucky","magic","major","maker","march","match","maybe","metal",
"model","money","month","music","night","noise","north","novel","occur","ocean",
"offer","order","other","paint","panel","party","peace","phone","photo","piece",
"place","plain","plane","plant","point","power","price","pride","prime","print",
"prize","proof","queen","quick","quiet","radio","reach","ready","refer","relax",
"reply","right","river","rough","round","route","royal","scale","scene","scope",
"score","sense","serve","shape","share","sharp","sheet","shift","shine","shirt",
"shock","short","sight","skill","sleep","small","smart","smile","smoke","solid",
"solve","sound","space","spare","speak","speed","spend","sport","staff","stage",
"stand","start","state","steel","stick","still","stock","stone","store","storm",
"story","study","style","sugar","table","teach","terms","thank","their","theme",
"there","these","thing","think","three","throw","tight","today","topic","total",
"touch","tower","trade","train","treat","trend","trial","truck","trust","truth",
"uncle","under","union","until","upper","usage","usual","value","video","visit",
"voice","waste","watch","water","wheel","where","which","while","white","whole",
"woman","world","worry","worse","worst","worth","write","wrong","youth"
];

/* =========================
   DAY (PST)
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

    const { error: insertError } = await supabase
      .from("guesses")
      .insert([{ email, guess, correct, game_day: day }]);

    if (insertError) {
      console.error("DB insert error:", insertError);
      return json(500, { error: "DB insert failed" });
    }

    return json(200, {
      result: correct ? "correct" : "incorrect"
    });

  } catch (err) {
    console.error("FUNCTION ERROR:", err);
    return json(500, {
      error: "Function crashed",
      detail: err.message
    });
  }
};

/* =========================
   RESPONSE HELPER
   ========================= */
function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}
