// قيد من Discord نفسه، مو بالكود: حدث MESSAGE_DELETE ما يرجّع author/content إطلاقًا —
// المصدر الوحيد لهما هو كاش البوت (لازم يكون شاف الرسالة وهي حية عبر messageCreate قبل حذفها).
// رسائل موجودة من قبل ما يشتغل البوت (أو طلعت من الكاش) تطلع "غير معروف" — هذا متوقع ومو خطأ.
// messageUpdate عكسها: النص الجديد يوصل دايمًا بالحدث، بس النص القديم يعتمد على نفس شرط الكاش.

const { sendLog } = require('../lib/logs');
const logsConfig = require('../config/logs');

function truncate(str, max = 200) {
  if (!str) return '*(empty message)*';
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

function register(client) {
  client.on('messageDelete', async (message) => {
    if (!message.guild || message.guild.id !== process.env.GUILD_ID) return;
    if (message.author?.bot && logsConfig.ignoreBots) return;

    const wasCached = !message.partial;

    await sendLog(message.guild, 'moderation', {
      title: '🗑️ Message Deleted',
      description: `in ${message.channel} by ${wasCached ? message.author.tag : 'Unknown — message wasn\'t cached before deletion'}`,
      fields: logsConfig.showMessageContent
        ? [{ name: 'Content', value: wasCached ? truncate(message.content) : '*(unrecoverable — Discord doesn\'t send deleted message content)*', inline: false }]
        : [],
      footer: `Message ID: ${message.id}`,
    });
  });

  client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!newMessage.guild || newMessage.guild.id !== process.env.GUILD_ID) return;
    if (newMessage.author?.bot && logsConfig.ignoreBots) return;
    if (!oldMessage.partial && oldMessage.content === newMessage.content) return; // تجاهل تحديثات embed/pin فقط

    await sendLog(newMessage.guild, 'moderation', {
      title: '✏️ Message Edited',
      description: `in ${newMessage.channel} by ${newMessage.author ? newMessage.author.tag : 'Unknown'} · [Jump to message](${newMessage.url})`,
      fields: logsConfig.showMessageContent
        ? [
            { name: 'Before', value: oldMessage.partial ? '*(unknown — not cached before this edit)*' : truncate(oldMessage.content), inline: false },
            { name: 'After', value: truncate(newMessage.content), inline: false },
          ]
        : [],
      footer: `Message ID: ${newMessage.id}`,
    });
  });
}

module.exports = { register };
