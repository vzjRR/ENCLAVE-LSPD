// مشروع مستقل بذاته (شوف package.json بنفس المجلد) — يُشغَّل وينشر منفصل تمامًا عن logs-bot/
// وعن أدوات build.js بجذر المستودع. نفس توكن البوت (نفس تطبيق Discord)، لكن عملية Node منفصلة.
// التشغيل: npm install ثم npm start (أو node bot.js)
//
// يحتاج: تفعيل "Server Members Intent" من Discord Developer Portal → Bot
// (بدونها، حدث انضمام عضو جديد ما يوصل للبوت أبدًا)
//
// لو cfg.trackInvites = true، يحتاج كمان صلاحية "Manage Server" (Manage Guild)
// للبوت بالسيرفر عشان يقدر يقرأ قائمة الدعوات ويحدد مين دعا العضو الجديد.

require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { register } = require('./lib/welcome');

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
    GatewayIntentBits.GuildInvites,
  ],
});

register(client);

client.once('ready', () => {
  console.log(`✅ بوت الترحيب متصل كـ ${client.user.tag}`);
  console.log('👂 بانتظار انضمام أعضاء جدد... (اترك هذا الترمنال مفتوح)');

  // Custom status text shown under the bot's name in the member list -- ActivityType.Custom
  // renders the name as-is with no "Playing/Watching/..." prefix Discord would otherwise add.
  client.user.setPresence({
    activities: [{ name: 'WE ARE WATCHING, WE ARE THE LSPD', type: ActivityType.Custom }],
    status: 'online',
  });
});

client.login(token);

// ─────────────────────────────────────────────────────────────
// خادم HTTP صغير اختياري — مطلوب فقط لو نشرت البوت على منصة PaaS
// (زي Koyeb, Render, Railway) لأنها تحتاج البرنامج يفتح منفذ عشان تتأكد إنه شغّال.
// على جهازك الشخصي أو VPS عادي (pm2)، هذا الجزء ما يشتغل أصلًا لأن PORT غير معرّف — آمن 100%.
// ─────────────────────────────────────────────────────────────
if (process.env.PORT) {
  const http = require('http');
  http
    .createServer((_, res) => res.end('welcome-bot is alive'))
    .listen(process.env.PORT, () => {
      console.log(`🌐 Health-check server listening on port ${process.env.PORT}`);
    });
}
