// دالة مشتركة لكل event handlers بمجلد events/ — تحل القناة من الاسم وترسل الإمبد.
// نفس فلسفة lib/permissions.js: لو القناة غير موجودة، تحذير بالكونسول وتجاهل بدل ما يكرش البوت.

const { EmbedBuilder } = require('discord.js');
const logsConfig = require('../config/logs');

// LOG_CHANNEL_ID و LOG_DISABLE_TYPES اختياريان بملف .env — تخصيص لكل نشرة بدون
// لمس config/logs.js المشترك بين كل النشرات (تغييره هنا يؤثر على Enclave أيضًا).
//   LOG_CHANNEL_ID=123        → كل الأنواع المفعّلة تُرسل لقناة واحدة بهذا الـ ID
//                                بدل البحث عن قناة باسمها لكل نوع على حدة.
//   LOG_DISABLE_TYPES=bot,foo → أنواع تُعطَّل لهذه النشرة فقط، حتى لو enabled=true
//                                بـ config/logs.js.
function resolveLogChannel(guild, key) {
  const cfg = logsConfig[key];
  if (!cfg || !cfg.enabled) return null;

  const disabledTypes = (process.env.LOG_DISABLE_TYPES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (disabledTypes.includes(key)) return null;

  const channelId = process.env.LOG_CHANNEL_ID;
  const channel = channelId
    ? guild.channels.cache.get(channelId)
    : guild.channels.cache.find((c) => c.name === cfg.channel && c.isTextBased());

  if (!channel || !channel.isTextBased()) {
    const label = channelId ? `id ${channelId}` : `"${cfg.channel}"`;
    console.warn(`   ⚠️  قناة اللوق ${label} (${key}) غير موجودة — تم تجاهل هذا اللوق.`);
    return null;
  }
  return channel;
}

async function sendLog(guild, key, { title, description, fields = [], footer, thumbnail } = {}) {
  const cfg = logsConfig[key];
  const channel = resolveLogChannel(guild, key);
  if (!channel) return;

  const embed = new EmbedBuilder().setColor(cfg.color).setTimestamp();
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (fields.length) embed.addFields(fields);
  if (footer) embed.setFooter({ text: footer });
  if (thumbnail) embed.setThumbnail(thumbnail);

  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(`   ❌ فشل إرسال لوق (${key}): ${err.message}`);
  }
}

module.exports = { resolveLogChannel, sendLog };
