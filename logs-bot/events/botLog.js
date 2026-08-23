// حالة "Bot Online" تُرسل من bot.js نفسه بعد ما يجهّز الكاش (channels.fetch/roles.fetch).
// هذا الملف يغطي فقط ما بعد الإقلاع: أخطاء/انقطاع/إعادة اتصال.

const { sendLog } = require('../lib/logs');

function register(client) {
  const guildId = process.env.GUILD_ID;

  client.on('shardDisconnect', async () => {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;
    await sendLog(guild, 'bot', { title: '🔴 Bot Disconnected', footer: 'Gateway disconnect' });
  });

  client.on('shardReconnecting', async () => {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;
    await sendLog(guild, 'bot', { title: '🔁 Reconnecting…', footer: 'Gateway reconnect' });
  });

  client.on('error', async (err) => {
    console.error('❌ Client error:', err);
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;
    await sendLog(guild, 'bot', {
      title: '⚠️ Client Error',
      description: `\`${err.message}\``,
      footer: 'راجع لوقات Railway لتفاصيل الخطأ الكاملة',
    });
  });
}

module.exports = { register };
