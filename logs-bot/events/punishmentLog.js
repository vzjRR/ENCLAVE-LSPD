// بان/أنبان يجيان بأحداث Discord مباشرة (guildBanAdd/Remove).
// تايم-آوت نكتشفه بمقارنة communicationDisabledUntilTimestamp قبل/بعد.
// الكيك ما عنده حدث خاص — guildMemberRemove يصير للطرد وللمغادرة الطبيعية بنفس الشكل،
// فنتحقق من الـ Audit Log لنعرف هل كان طرد فعلي خلال آخر ثوانٍ.
//
// يحتاج البوت صلاحية "View Audit Log" (أضفناها لرول 🤖 Bot بـ config/roles.js —
// لازم تُضاف يدويًا للرول الموجود فعليًا بسيرفرك، لأن build.js ما يعدّل رولات موجودة).

const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../lib/logs');

async function fetchExecutor(guild, targetId, type) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 5 });
    const entry = logs.entries.find((e) => e.target?.id === targetId && Date.now() - e.createdTimestamp < 8000);
    return entry?.executor ?? null;
  } catch (err) {
    console.warn('   ⚠️  ما قدرنا نقرأ الـ Audit Log (تأكد من صلاحية View Audit Log للبوت):', err.message);
    return null;
  }
}

function register(client) {
  client.on('guildBanAdd', async (ban) => {
    if (ban.guild.id !== process.env.GUILD_ID) return;
    const executor = await fetchExecutor(ban.guild, ban.user.id, AuditLogEvent.MemberBanAdd);

    await sendLog(ban.guild, 'punishment', {
      title: '🔨 Member Banned',
      fields: [
        { name: 'Target', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
        { name: 'Moderator', value: executor ? executor.tag : 'Unknown', inline: true },
        { name: 'Reason', value: ban.reason || 'No reason provided', inline: false },
      ],
      footer: `User ID: ${ban.user.id}`,
    });
  });

  client.on('guildBanRemove', async (ban) => {
    if (ban.guild.id !== process.env.GUILD_ID) return;
    const executor = await fetchExecutor(ban.guild, ban.user.id, AuditLogEvent.MemberBanRemove);

    await sendLog(ban.guild, 'punishment', {
      title: '🔓 Member Unbanned',
      fields: [
        { name: 'Target', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
        { name: 'Moderator', value: executor ? executor.tag : 'Unknown', inline: true },
      ],
      footer: `User ID: ${ban.user.id}`,
    });
  });

  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (newMember.guild.id !== process.env.GUILD_ID) return;

    const before = oldMember.communicationDisabledUntilTimestamp;
    const after = newMember.communicationDisabledUntilTimestamp;
    if (before === after) return;

    const executor = await fetchExecutor(newMember.guild, newMember.id, AuditLogEvent.MemberUpdate);

    if (after && after > Date.now()) {
      await sendLog(newMember.guild, 'punishment', {
        title: '🔇 Member Timed Out',
        fields: [
          { name: 'Target', value: `${newMember.user.tag} (${newMember.id})`, inline: true },
          { name: 'Moderator', value: executor ? executor.tag : 'Unknown', inline: true },
          { name: 'Until', value: `<t:${Math.floor(after / 1000)}:f>`, inline: false },
        ],
        footer: `User ID: ${newMember.id}`,
      });
    } else if (before && (!after || after <= Date.now())) {
      await sendLog(newMember.guild, 'punishment', {
        title: '🔊 Timeout Removed',
        fields: [
          { name: 'Target', value: `${newMember.user.tag} (${newMember.id})`, inline: true },
          { name: 'Moderator', value: executor ? executor.tag : 'Unknown', inline: true },
        ],
        footer: `User ID: ${newMember.id}`,
      });
    }
  });

  client.on('guildMemberRemove', async (member) => {
    if (member.guild.id !== process.env.GUILD_ID) return;
    try {
      const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 5 });
      const entry = logs.entries.find((e) => e.target?.id === member.id && Date.now() - e.createdTimestamp < 8000);
      if (!entry) return; // مغادرة طبيعية — leaveLog.js يغطيها

      await sendLog(member.guild, 'punishment', {
        title: '👢 Member Kicked',
        fields: [
          { name: 'Target', value: `${member.user.tag} (${member.id})`, inline: true },
          { name: 'Moderator', value: entry.executor ? entry.executor.tag : 'Unknown', inline: true },
          { name: 'Reason', value: entry.reason || 'No reason provided', inline: false },
        ],
        footer: `User ID: ${member.id}`,
      });
    } catch (err) {
      console.warn('   ⚠️  ما قدرنا نتحقق هل كانت مغادرة العضو طرد:', err.message);
    }
  });
}

module.exports = { register };
