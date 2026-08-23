// All customization lives here — edit text/image without touching bot.js
//
// Variables available inside contentTemplate / dmMessage:
//   {member}       → mentions the member
//   {memberTag}    → member's username (no mention)
//   {memberCount}  → member's join order number (1, 2, 3...)
//   {serverName}   → server name
//   {rulesChannel} → auto-mentions the #rules channel (must match rulesChannelName below)
//   {inviter}      → mentions whoever invited them (needs "Manage Server" — see README)
//
// Same message/behavior as the original Enclave RP welcome-bot — only the channel names and
// auto-assigned role were changed for the LSPD server.

module.exports = {
  // Channel the welcome message is sent to (must match the channel name exactly)
  channelName: '✈️・welcome',

  // Rules channel name (used with {rulesChannel} above)
  rulesChannelName: '⭐・rules',

  // Plain message content (not an embed) sent when a member joins
  contentTemplate:
    '✦ | 𝑾𝒆𝒍𝒄𝒐𝒎𝒆 𝒕𝒐 𝑬𝑵𝑪𝑳𝑨𝑽𝑬 𝑹𝑷 𝑷𝑶𝑳𝑰𝑪𝑬 𝑫𝑬𝑷𝑨𝑹𝑻𝑴𝑬𝑵𝑻\n' +
    '✦ | {member} !\n' +
    '✦ | 𝑷𝒍𝒆𝒂𝒔𝒆 𝒈𝒐 𝒂𝒏𝒅 𝒓𝒆𝒂𝒅 𝒕𝒉𝒆 𝒓𝒖𝒍𝒆𝒔: {rulesChannel}\n' +
    '✦ | 𝑾𝒆 𝒉𝒂𝒗𝒆 𝒕𝒐𝒕𝒂𝒍 𝒐𝒇 #{memberCount} 𝑷𝒐𝒍𝒊𝒄𝒆 𝒐𝒇𝒇𝒊𝒄𝒆𝒓𝒔\n' +
    '✦ | 𝑰𝒏𝒗𝒊𝒕𝒆𝒅 𝒃𝒚 : {inviter}',

  // Generates the composed welcome image (banner + avatar + name pill) automatically.
  generateWelcomeImage: true,
  bannerImagePath: null,
  generatedImageFilename: 'welcome.png',

  // Invite tracking (who invited the new member) — needs "Manage Server" (Manage Guild)
  trackInvites: true,

  // Role auto-assigned to new members on join (null disables this)
  autoAssignRole: 'EN | VISITOR',

  // Also send a DM in addition to the channel message
  sendDM: true,
  dmMessage: 'يا هلا فيك بسيرفر {serverName}! تفضل زور قناة ✈️・welcome داخل السيرفر.',
};
