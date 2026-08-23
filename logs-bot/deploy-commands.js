// يسجّل سلاش-كوماندز البوت مع Discord (guild-scoped = يظهر فورًا، بدون انتظار ساعة الكاش العالمي).
// شغّله مرة وحدة بعد أول نشر لـ bot.js، وبعدها كل ما تضيف/تعدّل أمر بمجلد commands/.
//
// الاستخدام: node deploy-commands.js

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const roleCommand = require('./commands/role');

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;

if (!token || !guildId) {
  console.error('❌ الملف .env ناقص: تأكد من DISCORD_TOKEN و GUILD_ID');
  process.exit(1);
}

async function main() {
  const commands = roleCommand.data.map((c) => c.toJSON());
  const rest = new REST({ version: '10' }).setToken(token);

  const app = await rest.get(Routes.oauth2CurrentApplication());
  const clientId = app.id;

  console.log(`🔧 يسجّل ${commands.length} أمر (Guild: ${guildId})...`);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
  console.log('✅ تم تسجيل الأوامر بنجاح — جرّبها بالسيرفر مباشرة: /role-create /role-list /role-delete');
}

main().catch((err) => {
  console.error('❌ فشل تسجيل الأوامر:', err);
  process.exit(1);
});
