/* ══════════════════════════════════════════════════════════════════════════
   ADMIN BOSH SAHIFASI (V75) — brauzerda

   ═══ NEGA BU TEKSHIRUV KERAK ═══════════════════════════════════════════

   Bosh sahifa — panelning BIRINCHI ekrani. U yiqilsa, admin boshqa
   hech qayerga o'ta olmaydi. Shu sababli bu yerda tekshiriladigan
   narsa go'zallik emas, TIRIK QOLISH:

     · bloklar chizildi va JS xatosi tushmadi;
     · SERVER BO'SH javob qaytarganda ham yiqilmaydi (yangi tizim);
     · maydonlar YETISHMAGANDA ham yiqilmaydi (javob shakli o'zgardi);
     · bitta so'rov yiqilsa qolganlari BARIBIR chiziladi;
     · ruxsati yo'q blok umuman ko'rsatilmaydi;
     · Ctrl+K ochiladi va Esc yopadi;
     · bloklarni yashirish ishlaydi va SAQLANADI;
     · avto-yangilanish varaq ko'rinmaganda to'xtaydi;
     · telefonda gorizontal siljish yo'q.

   ⚠ CORS sarlavhalari shart: brauzer boshqa manzildagi javobni
   sarlavhasiz umuman o'qimaydi va sinov «ma'lumot kelmadi» deb
   tushunarsiz yiqilardi.

   Ishga tushirish:
     CHROME_PATH=/usr/bin/google-chrome node scripts/check-dash.mjs
     SHOT_DIR=/tmp/shots — skrinshotlar
   ══════════════════════════════════════════════════════════════════════════ */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import puppeteer from "puppeteer-core";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");
const SHOT = process.env.SHOT_DIR || null;
const PORT = 4711;
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
               ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp",
               ".json": "application/json", ".woff2": "font/woff2" };

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  let file = path.join(DIST, url === "/" ? "index.html" : url);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, "index.html");
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  res.end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(PORT, r));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars", "--no-proxy-server"],
});
const cors = (req) => ({
  "Access-Control-Allow-Origin": `http://127.0.0.1:${PORT}`,
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers":
    req.headers()["access-control-request-headers"] || "authorization,content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
});

let pageErrors = [];
let pass = 0, fail = 0;
const ok  = (m, x = "") => { pass++; console.log(`  ✅ ${m}${x ? ` (${x})` : ""}`); };
const bad = (m, x = "") => { fail++; console.log(`  ❌ ${m}${x ? ` — ${x}` : ""}`); };
const is  = (c, m, x = "") => (c ? ok(m, x) : bad(m, x));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── Soxta javoblar ─────────────────────────────────────────────────── */
const day = (i) => new Date(Date.UTC(2026, 5, i + 1)).toISOString().slice(0, 10);

const SHOPS = [
  { id: 1, name: "Chilonzor market", code: "CHM01", ownerName: "Ali Valiyev",
    status: "ACTIVE", createdAt: "2026-01-10T10:00:00Z" },
  { id: 2, name: "Sergeli oziq-ovqat", code: "SRG02", ownerName: null,
    status: "ACTIVE", createdAt: "2026-05-20T10:00:00Z" },
  { id: 3, name: "Yunusobod gul", code: "YUN03", ownerName: "Vali Aliyev",
    status: "BLOCKED", createdAt: "2025-11-01T10:00:00Z" },
  { id: 4, name: "Olmazor kiyim", code: "OLM04", ownerName: "Karim",
    status: "SUSPENDED", createdAt: "2025-09-01T10:00:00Z" },
];

const STATS = {
  activeShops30d: 2, totalShops: 4,
  subscriptionIncome30d: 12_400_000, salesCount30d: 1840,
  newRequests: 3, expiringSoon: 2,
  newShops30d: 1, abandonedShops: 1, neverSoldShops: 1, expiredShops: 1,
  prev: { activeShops: 4, subscriptionIncome: 8_000_000, salesCount: 1500, newShops: 3 },
  shops: [
    { shopId: 1, lastSaleAt: new Date().toISOString(), salesCount30d: 1200 },
    { shopId: 2, lastSaleAt: new Date().toISOString(), salesCount30d: 640 },
    { shopId: 3, lastSaleAt: "2025-12-01T10:00:00Z", salesCount30d: 0 },
    { shopId: 4, lastSaleAt: null, salesCount30d: 0 },
  ],
  daily: Array.from({ length: 14 }, (_, i) => ({ day: day(i), amount: (i % 4) * 300000 })),
};

const USERS = [
  { id: 11, fullName: "Ali Valiyev", username: "ali", enabled: true, shopName: "Chilonzor market" },
  { id: 12, fullName: "Vali Aliyev", username: "vali", enabled: false, shopName: "Yunusobod gul" },
];

const REQUESTS = [
  { id: 21, name: "Bekzod", phone: "+998901112233", status: "NEW", createdAt: "2026-06-10T09:00:00Z" },
  { id: 22, name: "Spam", phone: "+998900000000", status: "SPAM", createdAt: "2026-06-09T09:00:00Z" },
  { id: 23, name: "Dilshod", phone: "+998935556677", status: "NEW", createdAt: "2026-06-08T09:00:00Z" },
];

const BACKUP = { exists: true, stale: true, hoursAgo: 40 };

const EMPTY_STATS = {
  activeShops30d: 0, totalShops: 0, subscriptionIncome30d: 0, salesCount30d: 0,
  newRequests: 0, expiringSoon: 0, newShops30d: 0, abandonedShops: 0,
  neverSoldShops: 0, expiredShops: 0,
  prev: { activeShops: 0, subscriptionIncome: 0, salesCount: 0, newShops: 0 },
  shops: [], daily: [],
};

/* ── Sahifani ochish ────────────────────────────────────────────────── */
let calls = [];
async function open({ shops = SHOPS, users = USERS, requests = REQUESTS,
                      stats = STATS, backup = BACKUP, permissions = null,
                      fail404 = [], storage = {}, url = "/" } = {}) {
  calls = [];
  pageErrors = [];
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1100 });
  await page.setRequestInterception(true);
  page.on("request", (r) => {
    if (!r.url().includes("/api/")) return r.continue();
    const CORS = cors(r);
    if (r.method() === "OPTIONS") return r.respond({ status: 204, headers: CORS });
    const u = new URL(r.url());
    calls.push(u.pathname + u.search);

    /* Bitta so'rovni ataylab yiqitish — qolganlari baribir chizilsin. */
    if (fail404.some((x) => u.pathname.endsWith(x))) {
      return r.respond({ status: 500, contentType: "application/json", headers: CORS,
                         body: JSON.stringify({ success: false, message: "sinov xatosi" }) });
    }

    const map = {
      "/api/superadmin/shops/stats": stats,
      "/api/superadmin/shops": shops,
      "/api/superadmin/users": users,
      "/api/superadmin/backups": backup,
      "/api/contact": requests,
      /* ⚠ Yo'l `/me`, `/profile` EMAS. Mock noto'g'ri yo'lni bergan
         edi va ruxsat hech qachon kelmasdi — sinov «blok yashirilmadi»
         deb yiqilardi, sababi esa mock ning o'zida edi. */
      "/api/auth/admin/me": { id: 1, username: "root", fullName: "Bosh admin",
                              role: "SUPER_ADMIN", permissions },
    };
    /* ⚠ AVVAL ANIQ MOSLIK, keyin prefiks — va prefikslar UZUNIDAN
       boshlab. `/shops` `/shops/stats` dan oldin tekshirilganda
       statistika o'rniga do'konlar ro'yxati qaytardi va sinov «grafik
       chizilmadi» deb yiqilardi, sababi esa mock ning o'zida edi. */
    const key = Object.keys(map).find((k) => u.pathname === k)
             ?? Object.keys(map).sort((a, b) => b.length - a.length)
                  .find((k) => u.pathname.startsWith(k + "/"));
    const data = key ? map[key] : [];
    return r.respond({ status: 200, contentType: "application/json",
                       headers: CORS, body: JSON.stringify({ success: true, data }) });
  });
  page.on("pageerror", (e) => { pageErrors.push(e.message); });
  await page.evaluateOnNewDocument((extra) => {
    for (const [k, v] of Object.entries({
      ek_token: "v", ek_refresh: "v", ek_type: "admin", ek_role: "SUPER_ADMIN",
      ek_username: "root", ek_fullName: "Bosh admin", ek_deviceId: "v",
      ek_lang: "uz", ek_theme: "light",
    })) localStorage.setItem(k, v);
    localStorage.removeItem("ek.admdash.layout.v1");
    for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
  }, storage);
  await page.goto(`http://127.0.0.1:${PORT}${url}`, { waitUntil: "networkidle2", timeout: 30_000 });
  await page.waitForSelector(".dash", { timeout: 15_000 });
  await wait(500);
  return page;
}

const shot = async (page, n) => { if (SHOT) await page.screenshot({ path: path.join(SHOT, `${n}.png`), fullPage: true }); };

/* ══ A. To'liq panel ═══════════════════════════════════════════════════ */
console.log("── A. To'liq panel ──");
let page = await open();
{
  is(pageErrors.length === 0, "sahifa xatosiz ochildi", pageErrors[0] || "");

  const panels = await page.$$eval(".dpn", (n) => n.length);
  is(panels >= 6, "bloklar chizildi", `${panels} ta panel`);

  const kpis = await page.$$eval(".kpi2", (n) => n.length);
  is(kpis === 4, "to'rtta KPI kartochkasi", String(kpis));

  /* ⚠ RAQAMLAR NOL BO'LIB QOLMASIN. Kartochka bo'sh chiziladi, javob
     keyin keladi; sanash animatsiyasi eski halqani to'xtatmasa, u
     yangi qiymatni keyingi kadrda nolga qaytarardi. Aynan shu xato
     ilova panelida topilgan va bu yerdagi `CountUp` uning nusxasi. */
  const nums = await page.$$eval(".kpi2__v", (n) => n.map((x) => x.textContent.trim()));
  is(nums.filter((v) => /^0$/.test(v)).length === 0,
     "KPI raqamlari sanab bo'lindi, nolda qolmadi", nums.join(" · "));

  const svg = await page.$$eval(".dpn svg", (n) => n.length);
  is(svg >= 1, "obuna tushumi grafigi chizildi", `${svg} ta SVG`);

  const alerts = await page.$$eval(".alr__row", (n) => n.length);
  is(alerts >= 6, "ogohlantirishlar ro'yxati to'ldi", String(alerts));

  /* ⚠ ZAXIRA BIRINCHI: bloklangan do'kon bitta mijozning muammosi,
     zaxirasiz bir kun esa barcha do'konlarning tarixini yo'qotadi. */
  const first = await page.$eval(".alr__row .alr__txt", (n) => n.textContent.trim());
  is(/zaxira/i.test(first), "zaxira ogohlantirishi eng yuqorida", first);

  const firstTone = await page.$eval(".alr__row", (n) => n.dataset.tone);
  is(firstTone === "critical", "u qizil", firstTone);

  /* Tarjimasiz kalit ekranga chiqmasin. */
  const raw = await page.evaluate(() =>
    (document.querySelector(".dash")?.innerText || "").match(/\b(adm|common|nav)\.[a-zA-Z]+/g) || []);
  is(raw.length === 0, "tarjimasiz kalit ekranda yo'q", raw.join(", ") || "toza");

  await shot(page, "adm-dash-full");
}

/* ══ B. Raqamlar to'g'ri joyda ═════════════════════════════════════════ */
console.log("\n── B. Raqamlar ──");
{
  /* ⚠ Pasayish QIZIL: faol do'kon 4 → 2, ya'ni −50%. Ilgari bu yerda
     `aktiv/jami*100-100` turardi va u umuman o'zgarish emas edi. */
  const deltas = await page.$$eval(".dlt", (n) => n.map((x) => x.dataset.tone + "|" + x.textContent.trim()));
  is(deltas.some((d) => d.startsWith("bad") && d.includes("▼")),
     "pasayish qizil va pastga qaragan", deltas.join(" · "));
  is(deltas.some((d) => d.startsWith("good") && d.includes("▲")),
     "o'sish yashil va yuqoriga qaragan");

  /* Do'konlar holati: 2 ishlayapti, 1 tashlab ketilgan, 1 hech sotmagan. */
  const cells = await page.$$eval(".stk__c", (n) => n.map((x) => x.querySelector("b")?.textContent.trim()));
  is(cells.join(",") === "2,0,1,1", "do'konlar to'rtta holatga ajratildi", cells.join(","));

  const bars = await page.$$eval(".hlt__bar > span", (n) => n.length);
  is(bars === 3, "nol bo'lgan holat chiziqda chizilmaydi", String(bars));

  /* Jadvalda holat nuqtasi — «ishlayaptimi?» degan savolga javob. */
  const dots = await page.$$eval(".dpn table .brn__dot", (n) => n.map((x) => x.dataset.tone));
  is(dots.length === 4 && dots.includes("bad") && dots.includes("good"),
     "jadval satrida holat nuqtasi bor", dots.join(","));

  /* SPAM ariza «yangi» deb sanalmaydi — bu qoida bir marta buzilgan. */
  const reqRows = await page.$$eval(".dtop__row", (n) => n.length);
  is(reqRows === 2, "SPAM ariza ro'yxatga tushmaydi", `${reqRows} ta satr`);
}

/* ══ C. Drill-down ═════════════════════════════════════════════════════ */
console.log("\n── C. Chuqurlashtirish ──");
{
  const before = await page.$$eval(".kpi2__d", (n) => n.length);
  await page.evaluate(() => document.querySelector(".kpi2.is-click .kpi2__hit")?.click());
  await wait(150);
  const after = await page.$$eval(".kpi2__d", (n) => n.length);
  is(before === 0 && after === 1, "KPI bosilganda tafsilot OCHILADI, sahifa almashmaydi",
     `${before} → ${after}`);

  const rows = await page.$$eval(".kpi2__d .kpi2__row", (n) => n.length);
  is(rows >= 2, "tafsilotda raqam qayerdan chiqqani yozilgan", String(rows));

  await page.evaluate(() => document.querySelector(".kpi2.is-click .kpi2__hit")?.click());
  await wait(150);
  is((await page.$$eval(".kpi2__d", (n) => n.length)) === 0, "qayta bosilganda yopiladi");
}

/* ══ D. Ctrl+K ═════════════════════════════════════════════════════════ */
console.log("\n── D. Buyruq qatori ──");
{
  await page.keyboard.down("Control"); await page.keyboard.press("KeyK"); await page.keyboard.up("Control");
  await wait(250);
  is((await page.$(".cmd")) !== null, "Ctrl+K oynani ochdi");

  /* Bo'sh maydonda faqat BO'LIMLAR — yuzta do'konni ko'rsatish oynani
     ro'yxatga aylantirardi. */
  const groups0 = await page.$$eval(".cmd__gtitle", (n) => n.map((x) => x.textContent.trim()));
  is(groups0.length === 1, "bo'sh maydonda faqat bo'limlar", groups0.join(" · "));

  await page.type(".cmd__input", "chilonzor");
  await wait(250);
  const groups = await page.$$eval(".cmd__gtitle", (n) => n.map((x) => x.textContent.trim()));
  is(groups.length >= 2, "yozilganda do'kon ham topiladi", groups.join(" · "));
  const hit = await page.$$eval(".cmd__row .cmd__t", (n) => n.map((x) => x.textContent.trim()));
  is(hit.some((x) => /Chilonzor/i.test(x)), "do'kon nomi bo'yicha topildi", hit.join(", "));

  await page.keyboard.press("ArrowDown"); await wait(80);
  is((await page.$$eval(".cmd__row.is-active", (n) => n.length)) === 1, "faqat BITTA satr tanlangan");

  await page.keyboard.press("Escape"); await wait(250);
  is((await page.$(".cmd")) === null, "Esc yopdi");
  await shot(page, "adm-dash-cmd");
}

/* ══ E. Bloklarni sozlash ══════════════════════════════════════════════ */
console.log("\n── E. Bloklarni sozlash ──");
{
  const was = await page.$$eval(".dpn", (n) => n.length);
  await page.evaluate(() => [...document.querySelectorAll(".dash__icon")].pop()?.click());
  await wait(300);
  const rows = await page.$$eval(".lay__row", (n) => n.length);
  is(rows === 8, "sakkizta blok ro'yxatda", String(rows));

  await page.evaluate(() => {
    const row = [...document.querySelectorAll(".lay__row")].find((r) => /tushum/i.test(r.textContent));
    row?.querySelector("input")?.click();
  });
  await wait(250);
  await page.keyboard.press("Escape"); await wait(300);

  const now = await page.$$eval(".dpn", (n) => n.length);
  is(now === was - 1, "o'chirilgan blok yo'qoldi", `${was} → ${now}`);

  const saved = await page.evaluate(() => localStorage.getItem("ek.admdash.layout.v1"));
  is(saved && JSON.parse(saved).hidden.includes("income"), "tanlov SAQLANDI", saved?.slice(0, 60));
  await page.close();
}

/* ══ F. Saqlangan tartib ═══════════════════════════════════════════════ */
console.log("\n── F. Saqlangan tartib ──");
{
  page = await open({ storage: {
    "ek.admdash.layout.v1": JSON.stringify({ order: ["alerts"], hidden: ["income", "requests"] }),
  } });
  is((await page.$(".dpn svg")) === null, "yashirilgan grafik chizilmadi");

  /* ⚠ ENG QIMMAT TEKSHIRUV: saqlangan ro'yxatda YO'Q bloklar ham
     ko'rinishi kerak, aks holda yangi versiyada qo'shilgan blok eski
     foydalanuvchida hech qachon paydo bo'lmasdi. */
  const panels = await page.$$eval(".dpn", (n) => n.length);
  is(panels >= 5, "saqlangan ro'yxatda yo'q bloklar ham chizildi", `${panels} ta`);
  await page.close();
}

/* ══ G. Bo'sh tizim ════════════════════════════════════════════════════ */
console.log("\n── G. Bo'sh tizim ──");
{
  page = await open({ shops: [], users: [], requests: [], stats: EMPTY_STATS,
                      backup: { exists: true, stale: false, hoursAgo: 1 } });
  is(pageErrors.length === 0, "bo'sh javobda ham yiqilmadi", pageErrors[0] || "");
  is((await page.$(".attn__empty")) !== null, "«hammasi joyida» ko'rinadi");
  is((await page.$$eval(".dpn", (n) => n.length)) >= 5, "bloklar baribir chizildi");
  await shot(page, "adm-dash-empty");
  await page.close();
}

/* ══ H. Buzuq javob ════════════════════════════════════════════════════ */
console.log("\n── H. Buzuq javob ──");
{
  /* ⚠ Server javobi o'zgarishi mumkin. Bosh sahifa yiqilsa admin hech
     qayerga o'tolmaydi. */
  page = await open({ stats: {}, backup: {}, shops: [{}], users: [{}], requests: [{}] });
  is(pageErrors.length === 0, "bo'sh obyektlar sahifani yiqitmadi", pageErrors[0] || "");
  await page.close();

  page = await open({ stats: null, backup: null, shops: null, users: null, requests: null });
  is(pageErrors.length === 0, "null javoblar ham yiqitmadi", pageErrors[0] || "");
  await page.close();
}

/* ══ I. Bitta so'rov yiqilsa ═══════════════════════════════════════════ */
console.log("\n── I. Qisman xato ──");
{
  /* ⚠ `allSettled`, `all` EMAS: statistika yiqilsa ham do'konlar
     ro'yxati foydali. */
  page = await open({ fail404: ["/shops/stats"] });
  is(pageErrors.length === 0, "statistika yiqilsa sahifa turadi", pageErrors[0] || "");
  const rows = await page.$$eval(".dpn table tbody tr", (n) => n.length);
  is(rows === 4, "do'konlar jadvali BARIBIR to'ldi", String(rows));
  await page.close();
}

/* ══ J. Ruxsat ═════════════════════════════════════════════════════════ */
console.log("\n── J. Ruxsat ──");
{
  /* Faqat do'konlarni ko'ra oladigan admin: arizalar bloki chizilmaydi. */
  page = await open({ permissions: ["SHOP_VIEW"] });
  await wait(400);
  const titles = await page.$$eval(".dpn__t", (n) => n.map((x) => x.textContent.trim()));
  is(!titles.some((x) => /ariza/i.test(x)),
     "ruxsati yo'q blok umuman chizilmaydi", titles.join(" · "));
  is(titles.some((x) => /do'kon/i.test(x)), "ruxsati bor blok esa joyida");
  await page.close();
}

/* ══ K. Avto-yangilanish ═══════════════════════════════════════════════ */
console.log("\n── K. Avto-yangilanish ──");
{
  page = await open();
  const before = calls.filter((c) => c.includes("/shops/stats")).length;

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await wait(200);
  const hidden = calls.filter((c) => c.includes("/shops/stats")).length;
  is(hidden === before, "varaq yashirilganda so'rov KETMAYDI", `${before} → ${hidden}`);

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await wait(500);
  const after = calls.filter((c) => c.includes("/shops/stats")).length;
  is(after > before, "varaq qaytganda DARHOL yangilanadi", `${before} → ${after}`);
  await page.close();
}

/* ══ L. Telefon ════════════════════════════════════════════════════════ */
console.log("\n── L. Telefon ──");
{
  page = await open();
  await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
  await wait(500);

  const over = await page.evaluate(() => {
    const d = document.documentElement;
    const wide = [...document.querySelectorAll(".dash *")]
      .filter((e) => e.getBoundingClientRect().right > d.clientWidth + 1)
      .map((e) => e.className?.toString?.().slice(0, 40)).filter(Boolean);
    return { scroll: d.scrollWidth, client: d.clientWidth, wide: [...new Set(wide)].slice(0, 5) };
  });
  is(over.scroll <= over.client + 1, "sahifa yon tomonga surilmaydi",
     `${over.scroll} / ${over.client}${over.wide.length ? " — " + over.wide.join(", ") : ""}`);

  is((await page.$$eval(".dpn", (n) => n.length)) >= 6, "telefonda ham bloklar chizildi");
  await shot(page, "adm-dash-mobile");
  await page.close();
}

/* ══ Yakun ════════════════════════════════════════════════════════════ */
await browser.close();
server.close();
console.log(`\n${fail ? "❌" : "✅"} admin bosh sahifasi: ${pass} o'tdi, ${fail} yiqildi`);
if (pageErrors.length) console.log("Sahifa xatolari:\n  " + pageErrors.join("\n  "));
process.exit(fail ? 1 : 0);
