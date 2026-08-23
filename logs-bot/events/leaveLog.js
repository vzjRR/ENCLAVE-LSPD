const { sendLog } = require('../lib/logs');

function register(client) {
  client.on('guildMemberRemove', async (member) => {
    if (member.guild.id !== process.env.GUILD_ID) return;

    const roles = member.roles?.cache
      ? member.roles.cache
          .filter((r) => r.id !== member.guild.id)
          .map((r) => r.name)
          .join(', ') || 'None'
      : 'Unknown (uncached)';
    const joinedAt = member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown';

    await sendLog(member.guild, 'leave', {
      title: '📤 Member Left',
      description: `**${member.user.tag}** left the server.`,
      fields: [
        { name: 'Joined', value: joinedAt, inline: true },
        { name: 'Roles Had', value: roles, inline: false },
      ],
      footer: `User ID: ${member.id}`,
      thumbnail: member.user.displayAvatarURL({ extension: 'png', size: 128 }),
    });
  });
}

module.exports = { register };
