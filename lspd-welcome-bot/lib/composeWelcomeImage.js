// Composites the LSPD welcome banner: member avatar in the neon circle frame (right side),
// and the member's display name under the "WELCOME" word (left side) on a light translucent
// highlight pill so it stays readable over the police-car artwork.
//
// The template's avatar hole is a solid opaque black circle (not a real transparency), so we
// punch a transparent hole into a copy of the template ourselves (via a circular mask + the
// 'dest-out' blend), rather than relying on pre-cut alpha like the old template used.
//
// ── الخطوط المدمجة ──────────────────────────────────────────────
// النص يُرسم عبر sharp + SVG + fontconfig، بنفس أسلوب welcome-bot/ (بوت Enclave) —
// وليس عبر @napi-rs/canvas كما كان سابقًا. السبب: أسماء ديسكورد الحقيقية كثيرًا ما
// تحوي رموزًا زخرفية أو حروفًا يونيكود رياضية (مثل 𝑃𝐿𝑎𝑛𝑘²¹) أو عربية أو إيموجي،
// وخط font-bold.ttf وحده لا يغطيها فيطلع الاسم فارغًا أو مربعات tofu. هذا الأسلوب
// يسجّل حزمة خطوط احتياطية عبر fontconfig فيسقط تلقائيًا لأقرب خط يغطي كل حرف.
//
// ⚠️ لازم يُضبط FONTCONFIG_PATH *قبل* ما تبدأ عملية Node — شغّل عبر `npm start`
// مو `node bot.js` مباشرة (نفس قيد welcome-bot/).
const path = require('path');
const sharp = require('sharp');

const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts');

function checkBundledFonts() {
  const configured = process.env.FONTCONFIG_PATH ? path.resolve(process.env.FONTCONFIG_PATH) : null;
  if (configured === path.resolve(FONTS_DIR)) return;
  console.warn(
    '\n⚠️  FONTCONFIG_PATH مو مضبوط على assets/fonts — النصوص بتنرسم بخط احتياطي غلط.\n' +
      '   شغّل البوت بـ  npm start  بدل node مباشرة.\n' +
      `   الحالي: ${process.env.FONTCONFIG_PATH || '(غير مضبوط)'}\n`
  );
}
checkBundledFonts();

const TEMPLATE_PATH = path.join(__dirname, '..', 'assets', 'welcome_template.png');

const CANVAS = { width: 1536, height: 688 };

// Avatar hole — radius reaches the ring's inner edge (measured by ray-casting outward from
// center to the first bright/neon pixel in every direction) so the photo fills the frame with
// no dark gap, slightly overlapping under the ring's inner glow rather than falling short of it.
const AVATAR_CENTER = { x: 1211, y: 338 };
const AVATAR_RADIUS = 180;

// Name pill target box (per the user's markup on the police-car area, to the right of the
// headlight/hood so it doesn't crowd the "WELCOME" word or the car's front).
const NAME_BOX = { left: 190, right: 567, top: 375, bottom: 515 };
const NAME_COLOR = '#EAE0EE'; // matches the WELCOME word's light lavender-white
const NAME_FONT_SIZE = 38;
const NAME_MAX_WIDTH = NAME_BOX.right - NAME_BOX.left;
const NAME_HPAD = 22;

// font-bold.ttf's own embedded family name (see assets/fonts/font-bold.ttf) — kept first so
// normal Latin names keep their original bold display look; the Noto stack only kicks in for
// glyphs it doesn't cover. Order matters: Arabic must come before Math (see note below).
//
// ⚠️ لازم 'Noto Naskh Arabic' يجي *قبل* 'Noto Sans Math'. السبب: Noto Sans Math فيه رسوم
// للحروف العربية المفردة (يستخدمها بالرموز الرياضية العربية) لكن *بدون* جداول الوصل، فلو
// جا قبل خط النسخ يطلع الاسم العربي حروفًا مفكّكة بدل موصولة.
const FONT_STACK =
  "Arial, 'Noto Naskh Arabic', 'Noto Emoji', 'Noto Sans', 'Noto Sans Math', " +
  "'Noto Sans Symbols', 'Noto Sans Symbols 2', sans-serif";

// أسماء ديسكورد كثير تستخدم حروف "عريضة" (Ｆｕｌｌｗｉｄｔｈ) للزينة، وما فيها خط مدمج
// يغطيها — فترجع ASCII عادي بدل ما تنكسر الصورة (الفرق ثابت 0xFEE0).
function normalizeForRender(text) {
  return String(text)
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/　/g, ' ');
}

function escapeXml(str) {
  return String(str).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

// يرسم النص وحده على كانفاس شفاف واسع ثم يقصّه على حدود الحبر (trim) — نستعمل هذا فقط
// لقياس العرض الفعلي بالبكسل قبل اختيار طول النص المناسب لصندوقه.
async function measureText(text, fontSize) {
  const svg = `<svg width="3000" height="200" xmlns="http://www.w3.org/2000/svg">
    <text x="10" y="150" font-family="${FONT_STACK}" font-size="${fontSize}" font-weight="bold">${escapeXml(text)}</text>
  </svg>`;
  try {
    const { info } = await sharp(Buffer.from(svg)).trim({ threshold: 6 }).png().toBuffer({ resolveWithObject: true });
    return info.width;
  } catch {
    return 0;
  }
}

// يقصّر النص (بإضافة "…") حتى يصير عرضه المرسوم فعليًا ضمن الحد الأقصى — بدل تصغير
// الخط، فيبقى حجم الحروف ثابتًا كما صمّم القالب.
async function fitText(text, fontSize, maxWidth) {
  let t = text;
  if ((await measureText(t, fontSize)) <= maxWidth) return t;
  while (t.length > 1) {
    t = t.slice(0, -1);
    const withEllipsis = `${t}…`;
    if ((await measureText(withEllipsis, fontSize)) <= maxWidth) return withEllipsis;
  }
  return t;
}

// يبني طبقة الاسم كاملة (الصندوق الشفاف + النص) بمقاس الكانفاس الكامل، جاهزة للتركيب.
async function renderNamePillLayer(displayName) {
  const normalized = normalizeForRender(displayName).trim();
  if (!normalized) return null;

  const maxTextWidth = NAME_MAX_WIDTH - NAME_HPAD * 2;
  const text = await fitText(normalized, NAME_FONT_SIZE, maxTextWidth);
  const textWidth = await measureText(text, NAME_FONT_SIZE);

  // لو ما رسم أي بكسل (اسم كله إيموجي ملوّن أو رموز ما يغطيها أي خط مدمج) نتخطى
  // الصندوق كله بدل ما نطلع صورة فيها صندوق فاضٍ بلا نص.
  if (textWidth < 1) return null;

  const pillWidth = Math.min(NAME_MAX_WIDTH, textWidth + NAME_HPAD * 2);
  const pillHeight = NAME_FONT_SIZE + 30;
  const boxCenterX = (NAME_BOX.left + NAME_BOX.right) / 2;
  const boxCenterY = (NAME_BOX.top + NAME_BOX.bottom) / 2;
  const pillX = boxCenterX - pillWidth / 2;
  const pillY = boxCenterY - pillHeight / 2;
  const textX = pillX + NAME_HPAD;
  const textY = pillY + pillHeight / 2 + NAME_FONT_SIZE * 0.35;

  const svg = `<svg width="${CANVAS.width}" height="${CANVAS.height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${pillX}" y="${pillY}" width="${pillWidth}" height="${pillHeight}" rx="14"
          fill="rgba(255,255,255,0.16)" stroke="rgba(216,180,255,0.55)" stroke-width="1.5"/>
    <text x="${textX}" y="${textY}" font-family="${FONT_STACK}" font-size="${NAME_FONT_SIZE}"
          font-weight="bold" fill="${NAME_COLOR}">${escapeXml(text)}</text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

// يرسم النص وحده (بدون الصندوق) مقصوصًا على حدود الحبر — يُستخدم من الاختبار المحلي
// (test-names.js) عشان يتأكد إن اسم معيّن ينرسم برمز حقيقي مو مربع tofu، بدون ما
// يحتاج يحمّل أفاتار من الشبكة.
async function renderNameTextOnly(text, fontSize = NAME_FONT_SIZE) {
  const svg = `<svg width="3000" height="200" xmlns="http://www.w3.org/2000/svg">
    <text x="10" y="150" font-family="${FONT_STACK}" font-size="${fontSize}" font-weight="bold"
          fill="#ffffff">${escapeXml(text)}</text>
  </svg>`;
  try {
    const { data, info } = await sharp(Buffer.from(svg))
      .trim({ threshold: 6 })
      .png()
      .toBuffer({ resolveWithObject: true });
    if (!info.width || !info.height) return null;
    return { buffer: data, width: info.width, height: info.height };
  } catch {
    return null;
  }
}

function circleMaskSvg(cx, cy, r) {
  return Buffer.from(
    `<svg width="${CANVAS.width}" height="${CANVAS.height}" xmlns="http://www.w3.org/2000/svg">` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/></svg>`
  );
}

async function composeWelcomeImage(avatarUrl, displayName) {
  const avatarResp = await fetch(avatarUrl);
  if (!avatarResp.ok) {
    throw new Error(`فشل تحميل صورة العضو (${avatarResp.status})`);
  }
  const avatarBuffer = Buffer.from(await avatarResp.arrayBuffer());

  const size = AVATAR_RADIUS * 2;
  const resizedAvatar = await sharp(avatarBuffer).resize(size, size, { fit: 'cover' }).png().toBuffer();

  const mask = circleMaskSvg(AVATAR_CENTER.x, AVATAR_CENTER.y, AVATAR_RADIUS);

  // Avatar clipped to a circle, placed on a full-size transparent canvas.
  const avatarLayer = await sharp({
    create: { width: CANVAS.width, height: CANVAS.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: resizedAvatar, left: AVATAR_CENTER.x - AVATAR_RADIUS, top: AVATAR_CENTER.y - AVATAR_RADIUS },
      { input: mask, blend: 'dest-in' },
    ])
    .png()
    .toBuffer();

  // Template with a transparent hole punched where the avatar goes (it ships as opaque black there).
  const holedTemplate = await sharp(TEMPLATE_PATH).composite([{ input: mask, blend: 'dest-out' }]).png().toBuffer();

  const namePillLayer = displayName ? await renderNamePillLayer(displayName) : null;

  const composites = [{ input: holedTemplate, left: 0, top: 0 }];
  if (namePillLayer) composites.push({ input: namePillLayer, left: 0, top: 0 });

  return sharp(avatarLayer).composite(composites).png().toBuffer();
}

module.exports = {
  composeWelcomeImage,
  CANVAS,
  AVATAR_CENTER,
  AVATAR_RADIUS,
  FONT_STACK,
  normalizeForRender,
  renderNameTextOnly,
  NAME_FONT_SIZE,
};
