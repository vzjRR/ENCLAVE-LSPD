// مشروع مستقل بذاته (شوف package.json بنفس المجلد) — يُشغَّل وينشر منفصل تمامًا عن welcome-bot/
// وعن أدوات build.js بجذر المستودع. نفس توكن البوت (نفس تطبيق Discord)، لكن عملية Node منفصلة.
// يضم: كل اللوقات (events/*.js) + أوامر السلاش لإدارة الرولات (commands/*.js).
//
// يحتاج:
//   - "Message Content Intent" مفعّلة من Developer Portal → Bot (لعرض نص الرسائل المحذوفة/المعدّلة بـ moderation-log)
//   - رول 🤖 Bot عنده "Manage Roles" + "View Audit Log" (راجع config/roles.js بجذر المستودع)
//
// التشغيل: npm install ثم npm start (أو node bot.js)

require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { sendLog } = require('./lib/logs');
const joinLog = require('./events/joinLog');
const leaveLog = require('./events/leaveLog');
const memberLog = require('./events/memberLog');
const punishmentLog = require('./events/punishmentLog');
const moderationLog = require('./events/moderationLog');
const auditLog = require('./events/auditLog');
const botLog = require('./events/botLog');
const roleCommand = require('./commands/role');

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;

if (!token || !guildId) {
  console.error('❌ الملف .env ناقص: تأكد من DISCORD_TOKEN و GUILD_ID');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
});

// ── تسجيل كل أنظمة اللوق على نفس العميل ─────────────────────
joinLog.register(client);
leaveLog.register(client);
memberLog.register(client);
punishmentLog.register(client);
moderationLog.register(client);
auditLog.register(client);
botLog.register(client);

// ── أوامر السلاش ────────────────────────────────────────────
const commandHandlers = new Map();
for (const cmd of roleCommand.data) commandHandlers.set(cmd.name, roleCommand);

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const handler = commandHandlers.get(interaction.commandName);
  if (!handler) return;

  try {
    await handler.execute(interaction);
  } catch (err) {
    console.error(`❌ فشل تنفيذ الأمر ${interaction.commandName}:`, err);
    const payload = { content: '❌ صار خطأ غير متوقع أثناء تنفيذ الأمر.', ephemeral: true };
    if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
  }
});

// ── الإقلاع ──────────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} متصل — logs-bot شغّال (لوقات + أوامر رولات)`);

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    console.error(`❌ ما قدرنا نلقى سيرفر بالـ ID: ${guildId}`);
    return;
  }

  await guild.channels.fetch();
  await guild.roles.fetch();

  // بدون هذا، الكاش يحتوي بس الأعضاء اللي "شافهم" البوت عبر أحداث ثانية (رسالة، صوت...) —
  // يعني leave-log و member-log وكشف التايم-آوت بـ punishment-log تطلع "Unknown (uncached)"
  // لأي عضو غادر قبل ما البوت يشوفه بحدث آخر. الجلب هنا يعبّي الكاش الكامل مرة وحدة عند الإقلاع.
  try {
    const members = await guild.members.fetch();
    console.log(`👥 تم تحميل ${members.size} عضو للكاش`);
  } catch (err) {
    console.warn('⚠️  فشل تحميل قائمة الأعضاء الكاملة (تأكد من Server Members Intent):', err.message);
  }

  await sendLog(guild, 'bot', {
    title: '🟢 Bot Online',
    fields: [
      { name: 'Guilds', value: `${client.guilds.cache.size}`, inline: true },
      { name: 'Ping', value: `${client.ws.ping}ms`, inline: true },
    ],
    footer: 'Startup',
  });
});

client.login(token);

// ─────────────────────────────────────────────────────────────
// خادم HTTP صغير — Railway يحتاجه ليتأكد إن العملية شغّالة (health check).
// ─────────────────────────────────────────────────────────────
if (process.env.PORT) {
  const http = require('http');
  http
    .createServer((_, res) => res.end('bot is alive'))
    .listen(process.env.PORT, () => {
      console.log(`🌐 Health-check server listening on port ${process.env.PORT}`);
    });
}
