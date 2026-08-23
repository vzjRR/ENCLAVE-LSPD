// يلتقط أحداث الإدارة العامة من الـ Audit Log (قنوات، رولات، ويبهوكس، إيموجي، إعدادات السيرفر).
// أحداث الأعضاء (كيك/بان/تايم-آوت/رولات) مغطاة بتفاصيل أدق بـ punishmentLog.js و memberLog.js فنتجاهلها هنا.
// يتطلب discord.js v14.13+ (guildAuditLogEntryCreate) وصلاحية "View Audit Log" للبوت.

const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../lib/logs');

const ACTION_LABELS = {
  [AuditLogEvent.ChannelCreate]: '📁 Channel Created',
  [AuditLogEvent.ChannelUpdate]: '📁 Channel Updated',
  [AuditLogEvent.ChannelDelete]: '🗑️ Channel Deleted',
  [AuditLogEvent.RoleCreate]: '🎭 Role Created',
  [AuditLogEvent.RoleUpdate]: '🎭 Role Updated',
  [AuditLogEvent.RoleDelete]: '🗑️ Role Deleted',
  [AuditLogEvent.WebhookCreate]: '🔗 Webhook Created',
  [AuditLogEvent.WebhookUpdate]: '🔗 Webhook Updated',
  [AuditLogEvent.WebhookDelete]: '🗑️ Webhook Deleted',
  [AuditLogEvent.EmojiCreate]: '😀 Emoji Created',
  [AuditLogEvent.EmojiDelete]: '🗑️ Emoji Deleted',
  [AuditLogEvent.GuildUpdate]: '⚙️ Server Setting Updated',
  [AuditLogEvent.BotAdd]: '🤖 Bot Added',
  [AuditLogEvent.IntegrationCreate]: '🔌 Integration Added',
};

// نتجاهلها هنا لأن هندلرات تانية تغطيها بتفاصيل أوضح
const SKIP_ACTIONS = new Set([
  AuditLogEvent.MemberKick,
  AuditLogEvent.MemberBanAdd,
  AuditLogEvent.MemberBanRemove,
  AuditLogEvent.MemberUpdate,
  AuditLogEvent.MemberRoleUpdate,
]);

// تُرسل نسخة إضافية لقناة "security" لأنها تستاهل انتباه فوري
const SECURITY_ACTIONS = new Set([AuditLogEvent.BotAdd, AuditLogEvent.IntegrationCreate]);

// entry.executor بحدث الـ gateway الحي (guildAuditLogEntryCreate) يرجع null إلا لو المستخدم
// أصلًا بكاش البوت — الـ payload يجيب executorId بس مو كائن المستخدم الكامل. عكس fetchAuditLogs()
// (المستخدم بـ punishmentLog.js) اللي يرجع users[] كاملة فيعبّي الكاش قبل ما يبني الـ entries.
// الحل: fetch يدوي للمستخدم لما يكون غير موجود بالكاش.
async function resolveExecutorTag(client, entry) {
  if (entry.executor) return entry.executor.tag;
  if (!entry.executorId) return 'Unknown';
  try {
    const user = await client.users.fetch(entry.executorId);
    return user.tag;
  } catch {
    return 'Unknown';
  }
}

function register(client) {
  client.on('guildAuditLogEntryCreate', async (entry, guild) => {
    if (guild.id !== process.env.GUILD_ID) return;
    if (SKIP_ACTIONS.has(entry.action)) return;

    const label = ACTION_LABELS[entry.action];
    if (!label) return; // نوع غير مهم للوق — نتجاهله بدل ما نغرق القناة

    const executorTag = await resolveExecutorTag(client, entry);
    const fields = [{ name: 'Executor', value: executorTag, inline: true }];
    if (entry.target) {
      fields.push({ name: 'Target', value: `${entry.target.name || entry.target.tag || entry.target.id}`, inline: true });
    }
    if (entry.reason) fields.push({ name: 'Reason', value: entry.reason, inline: false });
    if (entry.changes?.length) {
      const changeText = entry.changes
        .slice(0, 3)
        .map((c) => `**${c.key}**: \`${c.old ?? '—'}\` → \`${c.new ?? '—'}\``)
        .join('\n');
      fields.push({ name: 'Changes', value: changeText, inline: false });
    }

    await sendLog(guild, 'audit', { title: label, fields, footer: `Audit entry #${entry.id}` });

    if (SECURITY_ACTIONS.has(entry.action)) {
      await sendLog(guild, 'security', { title: `🚨 Security Alert — ${label}`, fields, footer: `Audit entry #${entry.id}` });
    }
  });
}

module.exports = { register };
