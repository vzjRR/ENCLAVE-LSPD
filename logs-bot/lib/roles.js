// عمليات الرولات المستخدمة من /role-create /role-list /role-delete (commands/role.js).
// نفس منطق build.js roles من ناحية التحقق من التكرار، بس هنا فوري وتفاعلي بدل سكربت يشتغل مرة.

const { PermissionFlagsBits } = require('discord.js');

function permBits(names = []) {
  return names.map((n) => {
    const bit = PermissionFlagsBits[n];
    if (bit === undefined) throw new Error(`صلاحية غير معروفة: ${n}`);
    return bit;
  });
}

async function createRole(guild, { name, color, hoist = false, mentionable = false, permissions = [], belowRoleName } = {}) {
  const existing = guild.roles.cache.find((r) => r.name === name);
  if (existing) {
    const err = new Error(`الرول "${name}" موجود مسبقًا.`);
    err.code = 'ROLE_EXISTS';
    throw err;
  }

  const role = await guild.roles.create({
    name,
    color: color || undefined,
    hoist,
    mentionable,
    permissions: permBits(permissions),
    reason: 'تمت الإضافة عبر /role-create',
  });

  if (belowRoleName) {
    const anchor = guild.roles.cache.find((r) => r.name === belowRoleName);
    if (anchor) {
      await role.setPosition(Math.max(anchor.position - 1, 1)).catch(() => {});
    }
  }

  return role;
}

async function deleteRole(guild, name) {
  const role = guild.roles.cache.find((r) => r.name === name);
  if (!role) {
    const err = new Error(`الرول "${name}" غير موجود.`);
    err.code = 'ROLE_NOT_FOUND';
    throw err;
  }
  if (role.managed) {
    const err = new Error(`"${name}" رول مُدار من تكامل خارجي (بوت/بوست) — لا يمكن حذفه من هنا.`);
    err.code = 'ROLE_MANAGED';
    throw err;
  }

  await role.delete('تم الحذف عبر /role-delete');
  return role;
}

function listRoles(guild, filter) {
  let roles = guild.roles.cache.filter((r) => r.id !== guild.id && !r.managed);
  if (filter) {
    const q = filter.toLowerCase();
    roles = roles.filter((r) => r.name.toLowerCase().includes(q));
  }
  return [...roles.values()].sort((a, b) => b.position - a.position);
}

module.exports = { createRole, deleteRole, listRoles };
