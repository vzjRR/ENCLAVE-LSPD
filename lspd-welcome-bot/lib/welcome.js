// منطق بوت الترحيب — مفصول عن welcome-bot.js عشان يشتغل إما مستقل (welcome-bot.js)
// أو داخل bot.js الموحّد (ترحيب + لوقات + أوامر بعملية واحدة).
//
// يحتاج: تفعيل "Server Members Intent" من Discord Developer Portal → Bot
// لو cfg.trackInvites = true، يحتاج كمان صلاحية "Manage Server" (Manage Guild) للبوت.

const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const cfg = require('../config/welcome');
const { composeWelcomeImage } = require('./composeWelcomeImage');

function fillTemplate(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, key) => (vars[key] !== undefined ? vars[key] : `{${key}}`));
}

function register(client) {
  const guildId = process.env.GUILD_ID;

  // تتبع الدعوات — نحتفظ بعدد استخدامات كل رابط دعوة، ولما يدخل عضو جديد
  // نقارن العدد القديم بالجديد لنعرف أي رابط استُخدم ومين صاحبه.
  let inviteCache = new Map(); // code -> uses

  async function refreshInviteCache(guild) {
    try {
      const invites = await guild.invites.fetch();
      inviteCache = new Map(invites.map((inv) => [inv.code, inv.uses]));
    } catch (err) {
      console.warn('⚠️  ما قدرنا نجيب قائمة الدعوات (تأكد إن البوت عنده صلاحية Manage Server):', err.message);
    }
  }

  async function findInviter(guild) {
    if (!cfg.trackInvites) return null;
    try {
      const before = inviteCache;
      const afterInvites = await guild.invites.fetch();

      let used = null;
      for (const invite of afterInvites.values()) {
        const prevUses = before.get(invite.code) ?? 0;
        if (invite.uses > prevUses) {
          used = invite;
          break;
        }
      }

      inviteCache = new Map(afterInvites.map((inv) => [inv.code, inv.uses]));
      return used ? used.inviter : null;
    } catch (err) {
      console.warn('⚠️  ما قدرنا نحدد مين دعا العضو الجديد:', err.message);
      return null;
    }
  }

  client.once('ready', async () => {
    const guild = client.guilds.cache.get(guildId);
    if (cfg.trackInvites && guild) {
      await refreshInviteCache(guild);
      console.log(`📋 تم تحميل ${inviteCache.size} دعوة لتتبعها`);
    }
  });

  client.on('inviteCreate', (invite) => {
    if (invite.guild?.id === guildId) inviteCache.set(invite.code, invite.uses);
  });

  client.on('inviteDelete', (invite) => {
    if (invite.guild?.id === guildId) inviteCache.delete(invite.code);
  });

  client.on('guildMemberAdd', async (member) => {
    try {
      if (member.guild.id !== guildId) return; // تجاهل لو البوت بأكثر من سيرفر

      const guild = member.guild;
      const channel = guild.channels.cache.find((c) => c.name === cfg.channelName && c.isTextBased());
      if (!channel) {
        console.warn(`⚠️  ما لقيت قناة الترحيب "${cfg.channelName}" — تأكد من الاسم بـ config/welcome.js`);
        return;
      }

      const rulesChannel = guild.channels.cache.find((c) => c.name === cfg.rulesChannelName);
      const inviter = await findInviter(guild);

      const vars = {
        member: `<@${member.id}>`,
        memberTag: member.user.username,
        memberCount: guild.memberCount,
        serverName: guild.name,
        rulesChannel: rulesChannel ? `<#${rulesChannel.id}>` : '#rules',
        // ما نقدر نحدد داعي معيّن (رابط عام غير متعقّب، دخول عن طريق Discovery...)
        // ما يعني إشكال أو مصدر مجهول — الأرجح إنه استخدم رابط دعوة السيرفر العام
        inviter: inviter ? `<@${inviter.id}>` : 'رابط دعوة السيرفر',
      };

      const files = [];
      let imageRef = null;

      if (cfg.generateWelcomeImage) {
        try {
          const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 512 });
          const imageBuffer = await composeWelcomeImage(avatarUrl, member.displayName);
          const filename = cfg.generatedImageFilename || 'welcome.png';
          files.push(new AttachmentBuilder(imageBuffer, { name: filename }));
          imageRef = `attachment://${filename}`;
        } catch (err) {
          console.warn('⚠️  فشل توليد صورة الترحيب، بنرسل النص فقط:', err.message);
        }
      } else if (cfg.bannerImagePath) {
        const fullPath = path.resolve(__dirname, '..', cfg.bannerImagePath);
        if (fs.existsSync(fullPath)) {
          const filename = path.basename(fullPath);
          files.push(new AttachmentBuilder(fullPath, { name: filename }));
          imageRef = `attachment://${filename}`;
        } else {
          console.warn(`⚠️  ملف البانر غير موجود: ${fullPath} — تم تجاهله`);
        }
      }

      const content = fillTemplate(cfg.contentTemplate, vars);
      await channel.send({ content, files });
      console.log(`✅ رحّبنا بـ ${member.user.tag} (العضو #${guild.memberCount})${inviter ? ` — دعاه ${inviter.tag}` : ''}`);

      if (cfg.autoAssignRole) {
        const role = guild.roles.cache.find((r) => r.name === cfg.autoAssignRole);
        if (role) {
          await member.roles.add(role).catch((err) => console.warn(`⚠️  فشل إعطاء الرول: ${err.message}`));
        } else {
          console.warn(`⚠️  الرول "${cfg.autoAssignRole}" غير موجود — شغّل node build.js roles أولًا`);
        }
      }

      if (cfg.sendDM) {
        const dmText = fillTemplate(cfg.dmMessage, vars);
        await member.send(dmText).catch(() => {
          console.log(`   ℹ️  ما قدرنا نرسل DM لـ ${member.user.tag} (خصوصياته مقفلة على الأرجح)`);
        });
      }
    } catch (err) {
      console.error('❌ خطأ أثناء الترحيب:', err);
    }
  });
}

module.exports = { register };
