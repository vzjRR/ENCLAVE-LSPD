const { sendLog } = require('../lib/logs');

function register(client) {
  client.on('guildMemberAdd', async (member) => {
    if (member.guild.id !== process.env.GUILD_ID) return;

    const accountAge = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;

    await sendLog(member.guild, 'join', {
      title: '📥 Member Joined',
      description: `**${member.user.tag}** just joined the server.\n${member} · Account created ${accountAge}`,
      fields: [{ name: 'Member Count', value: `#${member.guild.memberCount}`, inline: true }],
      footer: `User ID: ${member.id}`,
      thumbnail: member.user.displayAvatarURL({ extension: 'png', size: 128 }),
    });
  });
}

module.exports = { register };
