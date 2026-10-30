// ---------------------------------------------------------------------------
// Everything the page knows about parade day lives here, in plain English-ish
// JavaScript. Change a time, a handle, or a camera here and the page follows.
// ---------------------------------------------------------------------------
window.PW = {
  // Friday, Oct 30, 2026. Milwaukee is on Central Daylight Time (UTC-5) that day.
  paradeStart: "2026-10-30T10:00:00-05:00",
  partyEnds: "2026-10-30T15:00:00-05:00",
  // How long we guess the front of the parade takes to reach the festival grounds.
  // The slider on the map can change it on the fly.
  defaultPaceMinutes: 90,

  // Where the weather is measured: Henry Maier Festival Park (the lakefront).
  weather: { lat: 43.031, lon: -87.899 },

  schedule: [
    { time: "2026-10-30T06:00:00-05:00", what: "Detours start on some downtown and lakefront streets", where: "Through about 1 p.m." },
    { time: "2026-10-30T07:00:00-05:00", what: "Road closures along the route begin", where: "One block each side of the route. Shuttles from American Family Field start ($5)." },
    { time: "2026-10-30T08:00:00-05:00", what: "Henry Maier Festival Park gates open", where: "Free until capacity. Rally towels for the first 50,000." },
    { time: "2026-10-30T09:00:00-05:00", what: "TV coverage ramps up", where: "FOX6 is the official broadcast partner. CBS 58 goes live at 9." },
    { time: "2026-10-30T10:00:00-05:00", what: "Parade steps off", where: "N. 4th St (Vel R. Phillips Ave) and W. Wisconsin Ave" },
    { time: "2026-10-30T11:30:00-05:00", what: "Parade reaches the festival grounds (our estimate)", where: "Rally program follows in the amphitheater, shown on screens across the park" },
    { time: "2026-10-30T15:00:00-05:00", what: "Festivities wrap up", where: "Henry Maier Festival Park" },
  ],

  // The route, point by point. Lat/lon pairs. Patch and Yahoo both describe it as:
  // east on Wisconsin, north on Jefferson, east on Mason, south on Jackson,
  // east on Chicago, into Henry Maier Festival Park.
  route: [
    [43.03868, -87.91670], // N 4th St (Vel R. Phillips Ave) & W Wisconsin Ave - start
    [43.03870, -87.91400], // 2nd St
    [43.03868, -87.91180], // Plankinton Ave
    [43.03868, -87.91120], // Wisconsin Ave bridge over the Milwaukee River
    [43.03870, -87.91050], // Water St
    [43.03875, -87.90800], // Broadway
    [43.03878, -87.90640], // Milwaukee St
    [43.03880, -87.90560], // Jefferson St - turn north
    [43.03960, -87.90560], // Jefferson & Mason - turn east
    [43.03960, -87.90410], // Mason & Jackson - turn south (Uecker mural corner)
    [43.03880, -87.90410], // Jackson & Wisconsin
    [43.03780, -87.90410], // Jackson & Michigan
    [43.03700, -87.90410], // Jackson & Clybourn
    [43.03560, -87.90410], // Jackson & St. Paul (under I-794)
    [43.03400, -87.90410], // Jackson & Buffalo (Third Ward)
    [43.03320, -87.90410], // Jackson & Chicago - turn east
    [43.03320, -87.90200], // Chicago St
    [43.03320, -87.90000], // Chicago St & Harbor Dr - Summerfest Mid Gate
    [43.03150, -87.89880], // Inside Henry Maier Festival Park
    [43.02800, -87.89950], // American Family Insurance Amphitheater - rally stage
  ],

  // Named spots along the route. "at" is the index into the route list above.
  spots: [
    { at: 0, name: "Step-off: 4th & Wisconsin", note: "Across from the Baird Center / Hyatt" },
    { at: 3, name: "Wisconsin Ave bridge", note: "Over the Milwaukee River. Bridge itself is closed to the public." },
    { at: 7, name: "The Pfister turn (Jefferson St)", note: "Parade swings north here" },
    { at: 9, name: "Uecker mural corner (Mason & Jackson)", note: "100-ft Bob Uecker mural on the Wintrust building" },
    { at: 13, name: "Under I-794 (St. Paul Ave)", note: "Entering the Historic Third Ward" },
    { at: 15, name: "Jackson & Chicago", note: "Last turn, heading for the lake" },
    { at: 17, name: "Summerfest Mid Gate", note: "Chicago St at Harbor Dr" },
    { at: 19, name: "Amphitheater rally stage", note: "American Family Insurance Amphitheater" },
  ],

  landmarks: [
    { lat: 43.0417, lon: -87.9095, label: "CH", name: "Milwaukee City Hall" },
    { lat: 43.0349, lon: -87.9079, label: "PM", name: "Milwaukee Public Market" },
    { lat: 43.0400, lon: -87.8970, label: "MAM", name: "Milwaukee Art Museum" },
    { lat: 43.0347, lon: -87.8976, label: "DW", name: "Discovery World" },
    { lat: 43.0451, lon: -87.9174, label: "DD", name: "Fiserv Forum / Deer District" },
    { lat: 43.0280, lon: -87.9712, label: "AFF", name: "American Family Field (free parking, $5 shuttle)" },
    { lat: 43.0393, lon: -87.9046, label: "UECK", name: "Bob Uecker mural, 731 N. Jackson St" },
  ],

  // Wisconsin DOT (511wi.gov) freeway cameras ringing downtown. The snapshot
  // endpoint returns a fresh still about every 3 minutes. "view" is the 511 view id.
  cams: [
    { view: 1355, name: "I-43 at Wisconsin Ave", lat: 43.03791, lon: -87.92427, featured: true },
    { view: 1137, name: "I-794 at James Lovell St", lat: 43.03624, lon: -87.92060, featured: true },
    { view: 1115, name: "I-794 at 2nd St", lat: 43.03543, lon: -87.91168, featured: true },
    { view: 1148, name: "I-794 at Lincoln Memorial Dr (lakefront)", lat: 43.03592, lon: -87.90037, featured: true },
    { view: 1159, name: "Hoan Bridge, north end", lat: 43.02584, lon: -87.89880, featured: true },
    { view: 1171, name: "Hoan Bridge, south end", lat: 43.01367, lon: -87.89525, featured: true },
    { view: 949, name: "Marquette Interchange (I-43 / I-94)", lat: 43.03595, lon: -87.92418, featured: true },
    { view: 1348, name: "I-43 at State St", lat: 43.04251, lon: -87.92484, featured: true },
    { view: 1351, name: "I-43 at Wells St", lat: 43.04035, lon: -87.92558, featured: true },
    { view: 1306, name: "I-94 at 13th St", lat: 43.03516, lon: -87.92861, featured: true },
    { view: 1321, name: "I-94 at the Stadium Interchange", lat: 43.03345, lon: -87.96888, featured: true },
    { view: 1105, name: "WIS 175 at the stadium (shuttle lots)", lat: 43.02756, lon: -87.96851, featured: true },
    { view: 1339, name: "I-43 at Juneau Ave", lat: 43.04502, lon: -87.92575 },
    { view: 1338, name: "I-43 at Highland Ave", lat: 43.04456, lon: -87.92651 },
    { view: 1343, name: "I-43 at McKinley Ave", lat: 43.04840, lon: -87.92354 },
    { view: 1350, name: "I-43 at Walnut St", lat: 43.05230, lon: -87.92603 },
    { view: 1330, name: "I-43 at Brown St", lat: 43.05661, lon: -87.92516 },
    { view: 1356, name: "I-43 at Wright St", lat: 43.06392, lon: -87.92114 },
    { view: 1342, name: "I-43 at Locust St", lat: 43.07139, lon: -87.92117 },
    { view: 1307, name: "I-94 at 20th St", lat: 43.03605, lon: -87.93832 },
    { view: 1310, name: "I-94 at 25th St", lat: 43.03528, lon: -87.94483 },
    { view: 1311, name: "I-94 at 30th St", lat: 43.03251, lon: -87.95144 },
    { view: 1312, name: "I-94 at 35th St", lat: 43.03197, lon: -87.95747 },
    { view: 1313, name: "I-94 at 39th St", lat: 43.03277, lon: -87.96304 },
    { view: 1319, name: "I-94 at Mitchell Blvd", lat: 43.03137, lon: -87.97731 },
    { view: 1120, name: "WIS 175 at Wells St", lat: 43.04102, lon: -87.97324 },
    { view: 1103, name: "WIS 175 at Bluemound Rd", lat: 43.03718, lon: -87.97019 },
    { view: 1106, name: "WIS 175 at National Ave", lat: 43.02074, lon: -87.97037 },
    { view: 1011, name: "I-43/94 at National Ave", lat: 43.02228, lon: -87.92078 },
    { view: 1010, name: "I-43/94 at Mitchell St", lat: 43.01222, lon: -87.91552 },
    { view: 1007, name: "I-43/94 at Chase Ave", lat: 43.00073, lon: -87.91573 },
    { view: 1126, name: "I-794 at Carferry Dr", lat: 43.00370, lon: -87.89070 },
  ],
  camImage: (view) => `https://511wi.gov/map/Cctv/${view}`,

  // YouTube channels. "live_stream?channel=" shows whatever that channel is
  // broadcasting right now; if it is not live, YouTube shows an offline card.
  youtube: {
    brewers: { id: "UCybiT6P8jSv7gIxC4cHXl2Q", name: "Brewers", fallback: "https://www.youtube.com/@Brewers/streams" },
    fox6: { id: "UCKQkUrya7CcOoDInIwOMJvg", name: "FOX6", fallback: "https://www.fox6now.com/live" },
    wisn: { id: "UClNiQJqUDBGqe7LygW-fGyA", name: "WISN 12", fallback: "https://www.wisn.com/nowcast" },
    tmj4: { id: "UCKdALw0BErtqmGI2AUtbbhg", name: "TMJ4", fallback: "https://www.tmj4.com/live" },
    cbs58: { id: "UCWaiavtiHM1Oc00ACDOEDVA", name: "CBS 58", fallback: "https://www.cbs58.com/" },
    mlb: { id: "UCoLrcjPV5PbUrUyXq5mjc_A", name: "MLB", fallback: "https://www.youtube.com/@MLB/streams" },
  },

  // Bluesky handles (no API key needed to read these).
  bluesky: {
    team: ["brewers.com"],
    reporters: [
      { handle: "adammccalvy.bsky.social", who: "Adam McCalvy, MLB.com" },
      { handle: "cyrthogg.bsky.social", who: "Curt Hogg, Journal Sentinel" },
      { handle: "willsammon.bsky.social", who: "Will Sammon, The Athletic" },
      { handle: "jrradcliffe.bsky.social", who: "JR Radcliffe, Journal Sentinel" },
      { handle: "bykylelobner.bsky.social", who: "Kyle Lobner, Brewer Fanatic" },
      { handle: "brewers.com", who: "Milwaukee Brewers (official)" },
    ],
    // Community-built Bluesky feeds that collect Brewers talk. Bluesky's search
    // endpoint refuses anonymous browsers, but reading a feed works without a key.
    // "q" is only used for the "open this search on Bluesky" buttons.
    feeds: [
      { label: "Brewers talk", uri: "at://did:plc:xggf6xt6w47fc3oqpo2i2cf4/app.bsky.feed.generator/aaaev7evdshlw", q: "brewers parade" },
      { label: "Brew Crew + Uecker", uri: "at://did:plc:lyrmsmhhg7vzz4ghj44y5xzq/app.bsky.feed.generator/19dd5aa88dca", q: "brew crew" },
      { label: "Wisconsin sports", uri: "at://did:plc:h2txmusdsltfskh3h5l2ex6l/app.bsky.feed.generator/aaabzf7pa7wuc", q: "milwaukee" },
      { label: "Brewers news", uri: "at://did:plc:dnne5gbk6yjt4ej7as4x3ikl/app.bsky.feed.generator/brewers", q: "brewers" },
    ],
  },

  // X (Twitter). The embedded timeline is hit-or-miss when you are not logged
  // in to X, so every handle also gets a plain link.
  x: {
    team: "Brewers",
    reporters: [
      { handle: "AdamMcCalvy", who: "Adam McCalvy, MLB.com" },
      { handle: "Todd_Rosiak", who: "Todd Rosiak, Journal Sentinel" },
      { handle: "CyrtHogg", who: "Curt Hogg, Journal Sentinel" },
      { handle: "WillSammon", who: "Will Sammon, The Athletic" },
      { handle: "JRRadcliffe", who: "JR Radcliffe, Journal Sentinel" },
    ],
    searches: [
      { label: "Brewers parade, latest", q: "\"brewers parade\"" },
      { label: "#Brewers, latest", q: "#Brewers" },
      { label: "#ThisIsMyCrew", q: "#ThisIsMyCrew" },
      { label: "Parade photos & video", q: "brewers parade filter:media" },
    ],
  },

  links: {
    paradePage: "https://www.mlb.com/brewers/fans/parade",
    freeStream: "https://www.mlb.com/brewers/fans/parade",
    mlbTv: "https://www.mlb.com/tv",
    googleTraffic: "https://www.google.com/maps/@43.036,-87.906,15z/data=!5m1!1e1",
    wazeLive: "https://www.waze.com/live-map/directions?to=ll.43.0332%2C-87.9000",
    wi511: "https://511wi.gov/map",
    mcts: "https://www.ridemcts.com/alerts",
    reddit: "https://www.reddit.com/r/Brewers/new/",
    wtmj: "https://wtmj.com/",
    instagram: "https://www.instagram.com/brewers/",
    tiktok: "https://www.tiktok.com/@brewers",
    fox6cams: "https://www.fox6now.com/live-cameras",
    fox6downtown: "https://www.fox6now.com/live-cameras-downtown-milwaukee",
    fox6clark: "https://www.fox6now.com/live-cameras-clark",
    earthcam: "https://www.earthcam.com/usa/wisconsin/milwaukee/",
    bskySearch: (q) => `https://bsky.app/search?q=${encodeURIComponent(q)}`,
    xSearch: (q) => `https://x.com/search?q=${encodeURIComponent(q)}&f=live`,
  },
};
