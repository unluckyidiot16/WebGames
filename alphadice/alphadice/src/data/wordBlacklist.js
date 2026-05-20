// === Word blacklist (school-safe filter) ===
//
// The ENABLE Scrabble dictionary in dictionary.js contains ~51K words —
// great for accepting common English plays like BUS, MARS, JUMP. But it
// also includes profanity, slurs, and sexually explicit terms which
// shouldn't appear in a classroom-facing game.
//
// This blacklist is applied at DICTIONARY Set construction time, so any
// listed word will return false from isValidWord(). The list is
// conservative — it excludes:
//   • explicit profanity (the obvious 4-letter words)
//   • racial / ethnic / sexual-orientation slurs
//   • sexually explicit anatomy and acts
//   • mild expletives (damn, hell) that schools typically restrict
//
// It deliberately KEEPS:
//   • religious words with no slur context (devil, satan, hell removed
//     but kept words like "god", "angel", "demon")
// Words with ANY profane/derogatory secondary meaning are blocked even
// when an innocent meaning exists, since context-free classroom play
// can't distinguish them. The list is intentionally aggressive on this
// front — it's better to lose a few legitimate plays than allow one
// uncomfortable moment.
// Add more entries as you discover them.

export const WORD_BLACKLIST = new Set([
  // Profanity — variations of the core swears
  "arse", "arses", "ass", "asses", "asshole", "assholes",
  "bastard", "bastards",
  "bitch", "bitched", "bitches", "bitching", "bitchy",
  "bollock", "bollocks",
  "bullshit",
  "cock", "cocks", // dictionary keeps "rooster" sense via that word
  "crap", "crapped", "crapper", "crappers", "crappier", "crappies",
  "crappily", "crapping", "crappy", "craps",
  "cum", "cums", "cummed", "cumming",
  "cunt", "cunts",
  "damn", "damned", "damns", "damning", "damnable", "damnably",
  "damnedest", "damner", "damners",
  "dick", "dicks", "dicked", "dicking", "dickish", "dicky",
  "dildo", "dildos",
  "fag", "fags", "faggot", "faggots", "fagged", "fagging",
  "fart", "farted", "farter", "farters", "farting", "farts",
  "fuck", "fucked", "fucker", "fuckers", "fucking", "fucks", "fuckup",
  "fucked", "fuckers",
  "goddamn",
  "hell", "hells",
  "homo", "homos",
  "hooker", "hookers",
  "horny",
  "masturbate", "masturbated", "masturbates", "masturbating",
  "nipple", "nipples", "nippled",
  "orgasm", "orgasms", "orgasmic",
  "penis", "penises",
  "piss", "pissed", "pisser", "pissers", "pisses", "pissing", "pissy",
  "poop", "pooped", "pooper", "poopers", "pooping", "poops", "poopy",
  "porn", "porns", "porno", "pornos",
  "puke", "puked", "puker", "pukers", "pukes", "puking",
  "pussies", "pussy",
  "rape", "raped", "raper", "rapers", "rapes", "raping", "rapist", "rapists",
  "scrotum", "scrota",
  "shag", "shagged", "shagger", "shaggers", "shagging", "shags",
  "shit", "shits", "shat", "shitted", "shitter", "shitters",
  "shitting", "shitty", "shittier",
  "slut", "sluts", "slutty", "sluttier",
  "tit", "tits", "titty", "titties",
  "turd", "turds",
  "twat", "twats", "twatted", "twatting",
  "vagina", "vaginas", "vaginal",
  "wank", "wanked", "wanker", "wankers", "wanking", "wanks",
  "whore", "whored", "whores", "whoring",

  // Words with profane / derogatory secondary meanings — even if there's
  // an innocent dictionary entry, the slang/insult sense makes them
  // unsafe in a classroom setting.
  "anal",
  "ballsack",
  "bimbo", "bimbos",
  "bint", "bints",
  "boob", "boobs", "boobies", "booby",  // breast slang + "stupid person"
  "bugger", "buggered", "buggering", "buggers",
  "butt", "butts",                       // rear-end slang dominates
  "chode", "chodes",
  "choad", "choads",
  "clit", "clits", "clitoral", "clitoris",
  "crackhead", "crackheads",
  "dipshit", "dipshits",
  "douche", "douches", "douchebag", "douchebags",
  "douchey",
  "dumbass", "dumbasses",
  "dyke", "dykes",                       // historically anti-LGBT slur
  "freak", "freaks", "freaked", "freaking", "freaky",
  "gook", "gooks",
  "halfwit", "halfwits",
  "hump", "humps", "humped", "humping",  // sexual slang
  "idiot", "idiots", "idiotic",
  "imbecile", "imbeciles",
  "jackass", "jackasses",
  "jerk", "jerks", "jerked", "jerking",   // also masturbation slang
  "junkie", "junkies",
  "kinky", "kinkier",
  "knob", "knobs", "knobby",              // British slang for penis
  "lame", "lamer", "lames",
  "loony", "loonies",
  "loser", "losers",
  "moron", "morons", "moronic",
  "muff", "muffs",                        // anatomical slang
  "negro", "negroes",                    // outdated, offensive
  "nutter", "nutters",
  "perv", "pervs", "perved", "perving", "pervert", "perverts", "perverted",
  "pissed", "pisser",
  "prat", "prats",
  "prick", "pricks",                      // insult + anatomical
  "queer", "queers",                      // historically slur
  "retard", "retards", "retarded",
  "schmuck", "schmucks",
  "scumbag", "scumbags",
  "skank", "skanks", "skanky",
  "sleaze", "sleazes", "sleazy",
  "snatch", "snatches",                   // anatomical slang
  "spaz", "spazzes", "spazzed", "spazzing",
  "stiffy", "stiffies",                   // erection slang
  "stoner", "stoners",
  "stupid", "stupider", "stupidly", "stupids",
  "sucker", "suckers",
  "tard", "tards",                        // shortened slur
  "tool", "tools",                        // insult sense too prevalent
  "tramp", "tramps", "trampy",
  "wacko", "wackos",
  "weirdo", "weirdos",
  "wuss", "wusses", "wussy",
  "yid", "yids",                          // anti-Jewish slur

  // Racial / ethnic / orientation slurs (historically offensive)
  "chink", "chinks", "chinky",
  "coon", "coons",
  "dago", "dagos",
  "gook", "gooks",
  "jap", "japs",
  "kike", "kikes",
  "nigger", "niggers",
  "paki", "pakis",
  "spic", "spics",
  "wog", "wogs",
  "wop", "wops",
]);
