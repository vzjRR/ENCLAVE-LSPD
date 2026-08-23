// يرسل رسالة ترحيب لكل عضو حالي (غير بوت) بترتيب الانضمام (الأقدم أولًا)،
// بدون منشن (اسمه نصًّا فقط) وبدون DM وبدون أي رول — رسائل القناة فقط.
// ما يحذف شيء بعدها؛ هذا الجولة النهائية تُبقى بالقناة.
//
// الاستخدام: node backfill-welcome-all-members.js --yes

require('dotenv').config();
const cfg = require('./config/welcome');
const { composeWelcomeImage } = require('./lib/composeWelcomeImage');

const API = 'https://discord.com/api/v10';

const args = process.argv.slice(2);
if (!args.includes('--yes')) {
  console.error('⚠️  هذا السكربت يرسل رسالة حقيقية لكل عضو حالي بالسيرفر (تبقى بالقناة، ما تُحذف).');
  console.error('    لو متأكد شغّله كذا: node backfill-welcome-all-members.js --yes');
  process.exit(1);
}

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

function avatarUrl(user) {
  if (user.avatar) return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=512`;
  const i =
    user.discriminator && user.discriminator !== '0'
      ? Number(user.discriminator) % 5
      : Number((BigInt(user.id) >> 22n) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${i}.png`;
}

async function fetchAllMembers() {
  const members = [];
  let after = '0';
  for (;;) {
    const page = await api(`/guilds/${guildId}/members?limit=1000&after=${after}`);
    if (!page.length) break;
    members.push(...page);
    if (page.length < 1000) break;
    after = page[page.length - 1].user.id;
  }
  return members;
}

(async () => {
  const guild = await api(`/guilds/${guildId}?with_counts=true`);
  const channels = await api(`/guilds/${guildId}/channels`);
  const channel = channels.find((c) => c.name === cfg.channelName);
  if (!channel) throw new Error(`ما لقيت قناة الترحيب "${cfg.channelName}"`);
  const rulesChannel = channels.find((c) => c.name === cfg.rulesChannelName);

  console.log('📋 نجيب أعضاء السيرفر الحاليين ...');
  const allMembers = await fetchAllMembers();
  const members = allMembers
    .filter((m) => !m.user.bot)
    .sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at));

  console.log(`   ${members.length} عضو (بدون البوتات)، مرتّبين من الأقدم انضمامًا`);

  let sent = 0;
  let failed = 0;
  for (const [i, member] of members.entries()) {
    const user = member.user;
    const displayName = member.nick || user.global_name || user.username;
    const memberCount = i + 1; // رقم انضمامهم الفعلي حسب الترتيب

    const content = fillTemplate(cfg.contentTemplate, {
      member: `**${displayName}**`,
      memberTag: user.username,
      memberCount,
      serverName: guild.name,
      rulesChannel: rulesChannel ? `<#${rulesChannel.id}>` : '#rules',
      inviter: '`(دخول سابق)`',
    });

    console.log(`[${i + 1}/${members.length}] 🖼️  ${displayName} (@${user.username}) ...`);
    try {
      const imageBuffer = await composeWelcomeImage(avatarUrl(user), displayName);
      const filename = cfg.generatedImageFilename || 'welcome.png';

      const form = new FormData();
      form.append('payload_json', JSON.stringify({ content, attachments: [{ id: 0, filename }] }));
      form.append('files[0]', new Blob([imageBuffer], { type: 'image/png' }), filename);

      const msg = await api(`/channels/${channel.id}/messages`, { method: 'POST', body: form });
      console.log(`   ✅ ${msg.id}`);
      sent += 1;
    } catch (err) {
      console.error(`   ❌ فشل: ${err.message}`);
      failed += 1;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n✅ أُرسلت ${sent} رسالة${failed ? ` — فشلت ${failed}` : ''}. لم يُحذف شيء.`);
})().catch((err) => {
  console.error('❌ فشل عام:', err.message);
  process.exit(1);
});
