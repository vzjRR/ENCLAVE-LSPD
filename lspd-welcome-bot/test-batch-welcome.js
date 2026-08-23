// ⚠️  هذا السكربت يرسل فعليًا عدة رسائل ترحيب لقناة ديسكورد (مو محاكاة)، ثم يحذف
// كل الرسائل عدا واحدة تُحدَّد بمعرّف مستخدم. للأمان ما يشتغل إلا بعلم --yes صريح.
//
// يرسل، بهذا الترتيب:
//   1. رسالة "حقيقية الشكل" (منشن كامل) لمستخدم واحد تحدده --keep=<id> (تبقى في القناة)
//   2. عدد --others من أعضاء حاليين عشوائيين، بمنشن كامل مثل الدخول الحقيقي
//   3. عدد --silent من أعضاء حاليين عشوائيين آخرين، بدون منشن (اسمهم نصًّا فقط)
// كلها بدون أي تأثير جانبي حقيقي (بدون DM، وبدون إعطاء أي رول) — رسائل القناة فقط.
// ثم يحذف كل الرسائل المُرسَلة عدا رسالة --keep.
//
// الاستخدام: node test-batch-welcome.js --yes --keep=<userId> [--others=4] [--silent=5]

require('dotenv').config();
const cfg = require('./config/welcome');
const { composeWelcomeImage } = require('./lib/composeWelcomeImage');

const API = 'https://discord.com/api/v10';

const args = process.argv.slice(2);
if (!args.includes('--yes')) {
  console.error('⚠️  هذا السكربت ينشر ويحذف رسائل حقيقية بالسيرفر.');
  console.error('    لو متأكد شغّله كذا: node test-batch-welcome.js --yes --keep=<userId>');
  process.exit(1);
}

function argValue(name, fallback) {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
}

const keepUserId = argValue('keep', null);
const othersCount = Number(argValue('others', 4));
const silentCount = Number(argValue('silent', 5));

if (!keepUserId || !/^\d{5,}$/.test(keepUserId)) {
  console.error('❌ لازم تحدد --keep=<userId> — المستخدم اللي رسالته تبقى بعد الحذف.');
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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

async function sendWelcomeFor(member, guild, channel, rulesChannel, { mention }) {
  const user = member.user;
  const displayName = member.nick || user.global_name || user.username;
  const memberCount = guild.approximate_member_count ?? 0;

  const content = fillTemplate(cfg.contentTemplate, {
    member: mention ? `<@${user.id}>` : `**${displayName}**`,
    memberTag: user.username,
    displayName,
    memberCount,
    serverName: guild.name,
    rulesChannel: rulesChannel ? `<#${rulesChannel.id}>` : '#rules',
    inviter: '`(تجربة)`',
  });

  console.log(`🖼️  ${displayName} (@${user.username}) ${mention ? '— بمنشن' : '— بدون منشن'} ...`);
  const imageBuffer = await composeWelcomeImage(avatarUrl(user), displayName);
  const filename = cfg.generatedImageFilename || 'welcome.png';

  const form = new FormData();
  form.append('payload_json', JSON.stringify({ content, attachments: [{ id: 0, filename }] }));
  form.append('files[0]', new Blob([imageBuffer], { type: 'image/png' }), filename);

  const msg = await api(`/channels/${channel.id}/messages`, { method: 'POST', body: form });
  return msg.id;
}

(async () => {
  const guild = await api(`/guilds/${guildId}?with_counts=true`);
  const channels = await api(`/guilds/${guildId}/channels`);
  const channel = channels.find((c) => c.name === cfg.channelName);
  if (!channel) throw new Error(`ما لقيت قناة الترحيب "${cfg.channelName}"`);
  const rulesChannel = channels.find((c) => c.name === cfg.rulesChannelName);

  console.log('📋 نجيب أعضاء السيرفر الحاليين ...');
  const allMembers = await fetchAllMembers();
  const humanMembers = allMembers.filter((m) => !m.user.bot);
  console.log(`   ${humanMembers.length} عضو (بدون البوتات)`);

  const keepMember =
    humanMembers.find((m) => m.user.id === keepUserId) || (await api(`/guilds/${guildId}/members/${keepUserId}`).catch(() => null));
  if (!keepMember) throw new Error(`العضو ${keepUserId} مو موجود بالسيرفر`);

  const pool = shuffle(humanMembers.filter((m) => m.user.id !== keepUserId));
  const othersBatch = pool.slice(0, othersCount);
  const silentBatch = pool.slice(othersCount, othersCount + silentCount);

  if (othersBatch.length < othersCount || silentBatch.length < silentCount) {
    console.warn(
      `⚠️  السيرفر فيه ${pool.length} عضو غير ${keepUserId} فقط — طلبت ${othersCount + silentCount}. بنكمل بالمتاح.`
    );
  }

  const sentIds = [];
  const keepMsgId = await sendWelcomeFor(keepMember, guild, channel, rulesChannel, { mention: true });
  console.log(`   ✅ (تُبقى) ${keepMember.user.tag} → ${keepMsgId}`);

  for (const m of othersBatch) {
    const id = await sendWelcomeFor(m, guild, channel, rulesChannel, { mention: true });
    sentIds.push(id);
    await new Promise((r) => setTimeout(r, 400));
  }
  for (const m of silentBatch) {
    const id = await sendWelcomeFor(m, guild, channel, rulesChannel, { mention: false });
    sentIds.push(id);
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`\n📤 أُرسلت ${sentIds.length + 1} رسالة. نحذف كل شيء عدا رسالة ${keepMember.user.tag} ...`);
  for (const id of sentIds) {
    await api(`/channels/${channel.id}/messages/${id}`, { method: 'DELETE' });
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log('\n✅ خلص. الرسالة الباقية:');
  console.log(`   https://discord.com/channels/${guildId}/${channel.id}/${keepMsgId}`);
})().catch((err) => {
  console.error('❌ فشل:', err.message);
  process.exit(1);
});
