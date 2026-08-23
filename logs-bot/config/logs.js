// كل قناة لوق: enabled (شغّل/عطّل بدون لمس الكود)، channel (لازم يطابق الاسم بالضبط
// بـ config/categories.js تحت قسم security-logs)، color (هيكس اللون الجانبي بالإمبد).
//
// عطّل أي نوع بسهولة بتغيير enabled لـ false — بدون حذف كود أو إعادة نشر معقدة.

module.exports = {
  join: { enabled: true, channel: '📥・join-log', color: 0x57f287 },
  leave: { enabled: true, channel: '📤・leave-log', color: 0x99aab5 },
  member: { enabled: true, channel: '👤・member-log', color: 0x5865f2 },
  punishment: { enabled: true, channel: '🔨・punishment-log', color: 0x992d22 },
  moderation: { enabled: true, channel: '🛡️・moderation-log', color: 0xe67e22 },
  audit: { enabled: true, channel: '📜・audit-log', color: 0x747f8d },
  bot: { enabled: true, channel: '🤖・bot-log', color: 0x9b59b6 },
  security: { enabled: true, channel: '🔐・security', color: 0xf1c40f },

  // لا يوجد نظام تذاكر/بلاغات بعد — تُترك معطّلة لحد ما يُبنى مصدر لها
  ticket: { enabled: false, channel: '🎫・ticket-log', color: 0x2ecc71 },
  report: { enabled: false, channel: '🚨・report-log', color: 0xed4245 },

  // إعدادات عامة يستخدمها moderation-log
  showMessageContent: true, // يتطلب تفعيل "Message Content Intent" من Developer Portal
  ignoreBots: true, // تجاهل رسائل/تعديلات البوتات الأخرى بموديريشن-لوق
};
