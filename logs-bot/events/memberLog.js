const { sendLog } = require('../lib/logs');

function register(client) {
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (newMember.guild.id !== process.env.GUILD_ID) return;

    if (oldMember.nickname !== newMember.nickname) {
      await sendLog(newMember.guild, 'member', {
        title: '✏️ Nickname Updated',
        description: `${newMember}`,
        fields: [
          { name: 'Before', value: oldMember.nickname || oldMember.user.username, inline: true },
          { name: 'After', value: newMember.nickname || newMember.user.username, inline: true },
        ],
        footer: `User ID: ${newMember.id}`,
      });
    }

    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;
    const added = newRoles.filter((r) => !oldRoles.has(r.id)).map((r) => r.name);
    const removed = oldRoles.filter((r) => !newRoles.has(r.id)).map((r) => r.name);

    if (added.length || removed.length) {
      await sendLog(newMember.guild, 'member', {
        title: '🎭 Roles Updated',
        description: `${newMember}`,
        fields: [
          ...(added.length ? [{ name: 'Added', value: added.join(', '), inline: true }] : []),
          ...(removed.length ? [{ name: 'Removed', value: removed.join(', '), inline: true }] : []),
        ],
        footer: `User ID: ${newMember.id}`,
      });
    }
  });
}

module.exports = { register };
