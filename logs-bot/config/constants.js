// تجميعات الأدوار حسب المستوى — تُستخدم لتحديد من يرى/يكتب في كل قسم
const TIERS = {
  OWNER: ['👑 Owner'],
  EXECUTIVE: ['👑 Executive', '🧭 Director'],
  MANAGEMENT: ['🛡️ Server Manager', '⚙️ Operations Manager', '👥 Community Manager', '📊 Management'],
  DEV: ['💻 Lead Developer', '💻 Developer', '🗄️ Database Administrator', '🧪 QA', '🎨 Designer'],
  STAFF: ['🛡️ Head Administrator', '🔨 Administrator', '🔧 Moderator', '🎫 Support'],

  POLICE: ['🚔 Police Chief', '🚔 Deputy Chief', '🚔 Police Command', '🚔 Police Officer', '🚔 Police Recruit'],
  POLICE_COMMAND: ['🚔 Police Chief', '🚔 Deputy Chief', '🚔 Police Command'],

  EMS: ['🏥 EMS Chief', '🏥 EMS Command', '🏥 Paramedic', '🏥 EMS Recruit'],
  EMS_COMMAND: ['🏥 EMS Chief', '🏥 EMS Command'],

  MOJ: ['⚖️ Chief Justice', '⚖️ Judge', '⚖️ Prosecutor', '⚖️ Lawyer', '⚖️ Legal Staff'],
  MOJ_COMMAND: ['⚖️ Chief Justice', '⚖️ Judge'],

  CIA: ['🕵️ CIA Director', '🕵️ CIA Command', '🕵️ CIA Agent', '🕵️ CIA Recruit'],
  CIA_COMMAND: ['🕵️ CIA Director', '🕵️ CIA Command'],

  GOVERNMENT: ['🏛️ Government Official', '🏛️ Government Employee'],
  BUSINESS: ['🏢 Business Owner', '🏢 Business Manager', '👔 Business Employee'],

  VERIFIED: ['✅ Verified'],
  CITIZEN: ['👤 Citizen'],
  BOT: ['🤖 Bot'],
};

TIERS.MANAGEMENT_UP = [...TIERS.OWNER, ...TIERS.EXECUTIVE, ...TIERS.MANAGEMENT];
TIERS.STAFF_UP = [...TIERS.MANAGEMENT_UP, ...TIERS.STAFF];
TIERS.DEV_UP = [...TIERS.MANAGEMENT_UP, ...TIERS.DEV];

module.exports = TIERS;
