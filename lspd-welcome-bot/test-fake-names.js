// ⚠️  يرسل فعليًا عدة رسائل ترحيب وهمية لقناة ديسكورد (مو محاكاة) — أسماء مصطنعة
// بلغات وسكربتات ورموز مختلفة، لاختبار العرض الفعلي (شبكة + Discord نفسه، مو
// بس composeWelcomeImage محليًا). بدون منشن حقيقي (ما فيه مستخدم حقيقي أصلًا)،
// وبدون DM أو رول. يحذف كل الرسائل تلقائيًا بعد الإرسال إلا لو --keep.
//
// الاستخدام: node test-fake-names.js --yes [--keep]

require('dotenv').config();
const cfg = require('./config/welcome');
const { composeWelcomeImage } = require('./lib/composeWelcomeImage');

const API = 'https://discord.com/api/v10';

const args = process.argv.slice(2);
if (!args.includes('--yes')) {
  console.error('⚠️  هذا السكربت ينشر رسائل حقيقية بالسيرفر (وتُحذف تلقائيًا بعدها إلا لو --keep).');
  console.error('    لو متأكد شغّله كذا: node test-fake-names.js --yes');
  process.exit(1);
}
const keepMessages = args.includes('--keep');

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
if (!token || !guildId) {
  console.error('❌ الملف .env ناقص: تأكد من DISCORD_TOKEN و GUILD_ID');
  process.exit(1);
}

async function api(route, init) {
  const res = await fetch(`${API}${route}`, {
    ...init,
    headers: { Authorization: `Bot ${token}`, ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`${route} → ${res.status} ${res.statusText}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

function fillTemplate(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, key) => (vars[key] !== undefined ? vars[key] : `{${key}}`));
}

// دورة عبر أفاتارات ديسكورد الافتراضية الست، عشان الأسماء تتميّز بصريًا بسهولة.
function fakeAvatarUrl(i) {
  return `https://cdn.discordapp.com/embed/avatars/${i % 6}.png`;
}

// نفس البطارية اللي اختُبرت محليًا بنجاح (probe-stress سابقًا) — هذي المرة عبر
// الإرسال الحقيقي: توليد الصورة + رفعها + عرض Discord نفسه لها.
const NAMES = [
  ['azبانيذا', 'عربي-لاتيني مختلط'],
  ['محمد العتيبي', 'عربي'],
  ['لا إله إلا الله', 'عربي (ليجاتشر)'],
  ['ســـلام', 'عربي (تطويل)'],
  ['𝗕𝗼𝗹𝗱 𝗦𝗮𝗻𝘀', 'Math Sans Bold'],
  ['𝓒𝓾𝓻𝓼𝓲𝓿𝓮', 'Math Script'],
  ['𝕯𝖔𝖚𝖇𝖑𝖊 𝕱𝖗𝖆𝖐𝖙𝖚𝖗', 'Math Fraktur'],
  ['𝔻𝕠𝕦𝕓𝕝𝕖 𝕊𝕥𝕣𝕦𝕔𝕜', 'Math Double-Struck'],
  ['ⒸⒾⓇⒸⓁⒺⒹ', 'Circled letters'],
  ['ᴬᴮᶜᴰ ᵀᵉˢᵗ', 'Superscript'],
  ['Z̴̢̈a̸̗̚l̶̰̊g̷̈́ͅo̶͐̚', 'Zalgo combining'],
  ['ＦＵＬＬＷＩＤＴＨ', 'Fullwidth'],
  ['小林さくら', 'ياباني'],
  ['한지민', 'كوري'],
  ['王小明', 'صيني'],
  ['Привет Мир', 'روسي (سيريلك)'],
  ['ᏣᎳᎩ ᎠᏂᏔᏂ', 'شيروكي'],
  ['ილია მთვარელი', 'جورجي'],
  ['ᚦᚩᚱ ᚱᚢᚾᛁᚳ', 'رونيك'],
  ['ⴰⵎⴰⵣⵉⵖ ⵜⴰⵎⴰⵣⵉⵖⵜ', 'تيفيناغ'],
  ['ஜெயா தமிழ்', 'تاميلي'],
  ['สวัสดีไทย', 'تايلندي'],
  ['हिन्दी नाम', 'هندي'],
  ['עברית שם', 'عبري'],
  ['🔥 Blaze 👑 ★', 'إيموجي + رموز'],
  ['🇺🇸🇬🇧🇴🇲', 'أعلام'],
  ['! ZÉCÒ ✩', 'لاتيني بحروف ممدودة'],
  ['إبراهيم عبد الرحمن الشمري الطويل جدا حقًا زيادة عن الحد', 'اسم طويل (اختبار القص)'],
];

(async () => {
  const guild = await api(`/guilds/${guildId}?with_counts=true`);
  const channels = await api(`/guilds/${guildId}/channels`);
  const channel = channels.find((c) => c.name === cfg.channelName);
  if (!channel) throw new Error(`ما لقيت قناة الترحيب "${cfg.channelName}"`);
  const rulesChannel = channels.find((c) => c.name === cfg.rulesChannelName);
  const memberCount = guild.approximate_member_count ?? 0;

  const sentIds = [];
  let i = 0;
  for (const [name, label] of NAMES) {
    i += 1;
    const content = fillTemplate(cfg.contentTemplate, {
      member: `**${name}**  _(${label})_`,
      memberTag: name,
      memberCount,
      serverName: guild.name,
      rulesChannel: rulesChannel ? `<#${rulesChannel.id}>` : '#rules',
      inviter: '`(اختبار أسماء وهمية)`',
    });

    console.log(`[${i}/${NAMES.length}] 🖼️  "${name}" — ${label} ...`);
    let imageBuffer;
    try {
      imageBuffer = await composeWelcomeImage(fakeAvatarUrl(i), name);
    } catch (err) {
      console.error(`   ❌ فشل توليد الصورة: ${err.message}`);
      continue;
    }
    const filename = cfg.generatedImageFilename || 'welcome.png';

    const form = new FormData();
    form.append('payload_json', JSON.stringify({ content, attachments: [{ id: 0, filename }] }));
    form.append('files[0]', new Blob([imageBuffer], { type: 'image/png' }), filename);

    try {
      const msg = await api(`/channels/${channel.id}/messages`, { method: 'POST', body: form });
      sentIds.push(msg.id);
      console.log(`   ✅ ${msg.id}`);
    } catch (err) {
      console.error(`   ❌ فشل الإرسال: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n📤 أُرسلت ${sentIds.length} من ${NAMES.length}.`);

  if (keepMessages) {
    console.log('🔒 --keep مفعّل — ما بنحذف شيء. راجعها بعينك بالقناة.');
    return;
  }

  console.log('🧹 نحذفها كلها (استخدم --keep لو تبي تراجعها أول) ...');
  for (const id of sentIds) {
    await api(`/channels/${channel.id}/messages/${id}`, { method: 'DELETE' }).catch((err) =>
      console.error(`   ⚠️  فشل حذف ${id}: ${err.message}`)
    );
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log('✅ تم التنظيف.');
})().catch((err) => {
  console.error('❌ فشل عام:', err.message);
  process.exit(1);
});
