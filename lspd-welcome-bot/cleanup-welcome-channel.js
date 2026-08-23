// يحذف كل رسائل البوت بقناة الترحيب عدا رسالة واحدة تخص مستخدمًا محددًا —
// تنظيف عام بعد أي اختبار (batch أو fake-names)، بغض النظر عن أي سكربت أرسلها.
// يحدد "رسالتك" بأنها الرسالة الوحيدة اللي تحتوي منشن <@userId> فعليًا.
//
// الاستخدام: node cleanup-welcome-channel.js --yes [--keep=<userId>]

require('dotenv').config();
const cfg = require('./config/welcome');

const API = 'https://discord.com/api/v10';

const args = process.argv.slice(2);
if (!args.includes('--yes')) {
  console.error('⚠️  هذا السكربت يحذف رسائل حقيقية بالسيرفر.');
  console.error('    لو متأكد شغّله كذا: node cleanup-welcome-channel.js --yes');
  process.exit(1);
}

function argValue(name, fallback) {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
}

const keepUserId = argValue('keep', '1303195553068482591');

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
if (!token || !guildId) {
  console.error('❌ الملف .env ناقص: تأكد من DISCORD_TOKEN و GUILD_ID');
  process.exit(1);
}

async function api(route, init) {
  const res = await fetch(`${API}${route}`, {
    ...init,
    headers: {
      Authorization: `Bot ${token}`,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${route} → ${res.status} ${res.statusText}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function fetchAllMessages(channelId) {
  const all = [];
  let before = null;
  for (;;) {
    const q = before ? `?limit=100&before=${before}` : '?limit=100';
    const page = await api(`/channels/${channelId}/messages${q}`);
    if (!page.length) break;
    all.push(...page);
    before = page[page.length - 1].id;
    if (page.length < 100) break;
  }
  return all;
}

(async () => {
  const me = await api('/users/@me');
  const channels = await api(`/guilds/${guildId}/channels`);
  const channel = channels.find((c) => c.name === cfg.channelName);
  if (!channel) throw new Error(`ما لقيت قناة الترحيب "${cfg.channelName}"`);

  console.log(`📋 نجيب رسائل #${channel.name} ...`);
  const messages = await fetchAllMessages(channel.id);
  const botMessages = messages.filter((m) => m.author.id === me.id);
  console.log(`   ${botMessages.length} رسالة من البوت (من أصل ${messages.length})`);

  const keepMention = `<@${keepUserId}>`;
  const toKeep = botMessages.filter((m) => m.content.includes(keepMention));
  const toDelete = botMessages.filter((m) => !m.content.includes(keepMention));

  console.log(`   ✅ نُبقي: ${toKeep.length} رسالة (تحتوي منشن ${keepMention})`);
  console.log(`   🗑️  نحذف: ${toDelete.length} رسالة`);

  if (!toDelete.length) {
    console.log('لا شيء نحذفه.');
    return;
  }

  // البذف الجماعي (bulk-delete) يحتاج ٢-١٠٠ رسالة وعمرها أقل من ١٤ يومًا —
  // حالة الاختبار هنا دايمًا كذا. غير المؤهل (رسالة وحيدة، أو أقدم) نحذفه فرديًا.
  const now = Date.now();
  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
  const bulkEligible = toDelete.filter((m) => now - new Date(m.timestamp).getTime() < TWO_WEEKS_MS);
  const individual = toDelete.filter((m) => !bulkEligible.includes(m));

  for (let i = 0; i < bulkEligible.length; i += 100) {
    const batch = bulkEligible.slice(i, i + 100);
    if (batch.length === 1) {
      individual.push(batch[0]);
      continue;
    }
    await api(`/channels/${channel.id}/messages/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: batch.map((m) => m.id) }),
    });
    console.log(`   🗑️  حذف جماعي: ${batch.length} رسالة`);
  }

  for (const m of individual) {
    await api(`/channels/${channel.id}/messages/${m.id}`, { method: 'DELETE' }).catch((err) =>
      console.error(`   ⚠️  فشل حذف ${m.id}: ${err.message}`)
    );
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log('\n✅ خلص التنظيف.');
})().catch((err) => {
  console.error('❌ فشل:', err.message);
  process.exit(1);
});
