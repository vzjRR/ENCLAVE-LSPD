// /role-create /role-list /role-delete — إضافة رولات جديدة فورًا بدون لمس config/roles.js
// أو إعادة نشر. مقفولة على T.MANAGEMENT_UP (نفس مستوى view access لقسم security-logs)
// + setDefaultMemberPermissions(ManageRoles) كخط دفاع أول من Discord نفسه.

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const T = require('../config/constants');
const { createRole, deleteRole, listRoles } = require('../lib/roles');

function isManagementUp(member) {
  return (
    member.roles.cache.some((r) => T.MANAGEMENT_UP.includes(r.name)) ||
    member.permissions.has(PermissionFlagsBits.Administrator)
  );
}

const data = [
  new SlashCommandBuilder()
    .setName('role-create')
    .setDescription('ينشئ رول جديد بالسيرفر')
    .addStringOption((o) => o.setName('name').setDescription('اسم الرول (مع الإيموجي لو تبي)').setRequired(true))
    .addStringOption((o) => o.setName('color').setDescription('هيكس كولور، مثال #9146FF').setRequired(false))
    .addBooleanOption((o) => o.setName('hoist').setDescription('يظهر منفصل بقائمة الأعضاء؟').setRequired(false))
    .addBooleanOption((o) => o.setName('mentionable').setDescription('يقدر الكل يمنشنه؟').setRequired(false))
    .addStringOption((o) =>
      o.setName('below').setDescription('اسم رول موجود — الرول الجديد يتوضع تحته مباشرة').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  new SlashCommandBuilder()
    .setName('role-list')
    .setDescription('يعرض رولات السيرفر')
    .addStringOption((o) => o.setName('filter').setDescription('فلترة بالاسم').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  new SlashCommandBuilder()
    .setName('role-delete')
    .setDescription('يحذف رول موجود')
    .addStringOption((o) => o.setName('name').setDescription('اسم الرول بالضبط').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
];

async function execute(interaction) {
  if (!isManagementUp(interaction.member)) {
    return interaction.reply({ content: '🚫 هذا الأمر يتطلب رول إداري (Management وما فوق).', ephemeral: true });
  }

  if (interaction.commandName === 'role-create') {
    const name = interaction.options.getString('name', true);
    const colorInput = interaction.options.getString('color');
    const hoist = interaction.options.getBoolean('hoist') ?? false;
    const mentionable = interaction.options.getBoolean('mentionable') ?? false;
    const below = interaction.options.getString('below');

    if (colorInput && !/^#?[0-9a-fA-F]{6}$/.test(colorInput)) {
      return interaction.reply({ content: '🚫 لون غير صحيح. استخدم صيغة هيكس مثل `#9146FF`.', ephemeral: true });
    }

    try {
      const role = await createRole(interaction.guild, {
        name,
        color: colorInput ? (colorInput.startsWith('#') ? colorInput : `#${colorInput}`) : undefined,
        hoist,
        mentionable,
        belowRoleName: below || undefined,
      });

      const embed = new EmbedBuilder()
        .setColor(role.color || 0x2b2d31)
        .setTitle('✅ Role Created')
        .setDescription(`**${role.name}** — \`${role.hexColor}\``)
        .addFields(
          { name: 'Position', value: below ? `Placed under ${below}` : 'Top of hierarchy — adjust manually if needed', inline: true },
          { name: 'Hoisted', value: hoist ? 'Yes' : 'No', inline: true },
          { name: 'Mentionable', value: mentionable ? 'Yes' : 'No', inline: true }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }

  if (interaction.commandName === 'role-list') {
    const filter = interaction.options.getString('filter');
    const roles = listRoles(interaction.guild, filter).slice(0, 25);

    if (!roles.length) {
      return interaction.reply({ content: 'ما لقيت رولات تطابق الفلتر.', ephemeral: true });
    }

    const lines = roles.map((r) => `${r.hexColor !== '#000000' ? '🎨' : '⚪'} ${r.name} — ${r.members.size} member(s)`);
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🎭 Roles${filter ? ` — matching "${filter}"` : ''}`)
      .setDescription(lines.join('\n'))
      .setFooter({ text: `${roles.length} role(s) shown` });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (interaction.commandName === 'role-delete') {
    const name = interaction.options.getString('name', true);
    try {
      await deleteRole(interaction.guild, name);
      return interaction.reply({ content: `🗑️ تم حذف الرول **${name}**.`, ephemeral: true });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
}

module.exports = { data, execute };
