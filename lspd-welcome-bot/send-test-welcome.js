// ⚠️  هذا السكربت يرسل فعليًا رسالة لقناة ديسكورد (مو محاكاة).
// يرسل رسالة ترحيب تجريبية بنفس شكل الدخول الحقيقي: النص + الصورة + المنشن.
// للأمان ما يشتغل إلا بعلم --yes صريح.
//
// الاستخدام: node send-test-welcome.js --yes [userId]

require('dotenv').config();
const cfg = require('./config/welcome');
const { composeWelcomeImage } = require('./lib/composeWelcomeImage');

const API = 'https://discord.com/api/v10';
const DEFAULT_USER_ID = '1119011672351330377';

const args = process.argv.slice(2);
if (!args.includes('--yes')) {
  console.error('⚠️  هذا السكربت ينشر رسالة حقيقية بالسيرفر.');
  console.error('    لو متأكد شغّله كذا: node send-test-welcome.js --yes');
  process.exit(1);
}

const userId = args.find((a) => /^\d{5,}$/.test(a)) || DEFAULT_USER_ID;
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
  return res.json();
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

(async () => {
  const user = await api(`/users/${userId}`);
  const guild = await api(`/guilds/${guildId}?with_counts=true`);
  const channels = await api(`/guilds/${guildId}/channels`);

  const channel = channels.find((c) => c.name === cfg.channelName);
  if (!channel) throw new Error(`ما لقيت قناة الترحيب "${cfg.channelName}"`);
  const rulesChannel = channels.find((c) => c.name === cfg.rulesChannelName);

  let nickname = null;
  try {
    nickname = (await api(`/guilds/${guildId}/members/${userId}`)).nick || null;
  } catch {
    /* العضو مو بالسيرفر — نكمل بالاسم العام */
  }

  const displayName = nickname || user.global_name || user.username;
  const memberCount = guild.approximate_member_count ?? 0;

  const content = fillTemplate(cfg.contentTemplate, {
    member: `<@${user.id}>`,
    memberTag: user.username,
    displayName,
    memberCount,
    serverName: guild.name,
    rulesChannel: rulesChannel ? `<#${rulesChannel.id}>` : '#rules',
    inviter: '`(تجربة — بيتحدد تلقائيًا بالدخول الحقيقي)`',
  });

  const files = [];
  if (cfg.generateWelcomeImage) {
    console.log(`🖼️  نركّب الصورة لـ ${displayName} (@${user.username}) ...`);
    const imageBuffer = await composeWelcomeImage(avatarUrl(user), displayName);
    const filename = cfg.generatedImageFilename || 'welcome.png';
    files.push({ filename, buffer: imageBuffer });
  }

  const form = new FormData();
  if (files.length) {
    form.append(
      'payload_json',
      JSON.stringify({ content, attachments: [{ id: 0, filename: files[0].filename }] })
    );
    form.append('files[0]', new Blob([files[0].buffer], { type: 'image/png' }), files[0].filename);
  } else {
    form.append('payload_json', JSON.stringify({ content }));
  }

  console.log(`📤 نرسل لقناة #${channel.name} ...`);
  const msg = await api(`/channels/${channel.id}/messages`, { method: 'POST', body: form });

  console.log('\n✅ انرسلت!');
  console.log(`   الرابط: https://discord.com/channels/${guildId}/${channel.id}/${msg.id}`);
  console.log(`   لحذفها: node -e "require('dotenv').config();fetch('${API}/channels/${channel.id}/messages/${msg.id}',{method:'DELETE',headers:{Authorization:'Bot '+process.env.DISCORD_TOKEN}}).then(r=>console.log(r.status))"`);
})().catch((err) => {
  console.error('❌ فشل الإرسال:', err.message);
  process.exit(1);
});
