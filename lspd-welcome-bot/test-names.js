// اختبار محلي لرسم الأسماء — ما يتصل بديسكورد ولا يحمّل أفاتار ولا يرسل أي شيء.
// يفحص إن الأسماء العربية/المختلطة تنرسم موصولة، وإن باقي أنواع الأسماء (لاتيني،
// أرقام، إيموجي، رموز، سكربتات نادرة) ما تطلع مربعات tofu.
//
// الاستخدام:  npm run test:names

const { renderNameTextOnly, normalizeForRender, NAME_FONT_SIZE } = require('./lib/composeWelcomeImage');

let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}${detail ? `  ${detail}` : ''}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}${detail ? `  ${detail}` : ''}`);
  }
}

async function widthOf(text) {
  const r = await renderNameTextOnly(text);
  return r ? r.width : 0;
}

(async () => {
  console.log('\n── 1. وصل الحروف العربية ─────────────────────────────');
  const one = await widthOf('ب');
  const three = await widthOf('ببب');
  const ratio = one ? three / (one * 3) : 0;
  check('"ببب" أضيق من ٣ باءات مفردة (وصل شغّال)', ratio > 0 && ratio < 0.8,
    `ب=${one} ببب=${three} نسبة=${ratio.toFixed(2)}`);

  const lam = await widthOf('ل');
  const alef = await widthOf('ا');
  const lamAlef = await widthOf('لا');
  check('ليجاتشر "لا" يتكوّن', lamAlef > 0 && lamAlef < (lam + alef) * 0.85,
    `لا=${lamAlef} مقابل ل+ا=${lam + alef}`);

  console.log('\n── 2. الحروف العريضة (Fullwidth) ما تطلع مربعات ──────');
  check('ＦＵＬＬ → FULL', normalizeForRender('ＦＵＬＬ') === 'FULL');
  check('ما يلمس العربي', normalizeForRender('بانيذا') === 'بانيذا');
  {
    const fw = await widthOf(normalizeForRender('ＦＵＬＬＷＩＤＴＨ'));
    const ascii = await widthOf('FULLWIDTH');
    check('العريض ينرسم نفس ASCII (مو tofu)', fw === ascii, `عريض=${fw} ascii=${ascii}`);
  }

  console.log('\n── 3. إيموجي ورموز زخرفية وسكربتات نادرة (مو tofu) ────');
  // الحيلة: كودبوينت غير معرّف نهائيًا (U+1FFFD) دايمًا يطلع مربع tofu بمقاس ثابت.
  // لو أي رمز آخر طلع بنفس المقاس بالضبط معناها هو كمان ما انرسم برمزه الحقيقي.
  const tofuRef = await renderNameTextOnly('\u{1FFFD}');
  const tofuSize = tofuRef ? `${tofuRef.width}x${tofuRef.height}` : 'none';
  for (const [text, label] of [
    ['\u{1F600}', '😀'],
    ['\u{1F6A8}', '🚨'],
    ['\u{1F451}', '👑'],
    ['★', '★ (black star)'],
    ['✩', '✩ (star outline)'],
    ['⚡', '⚡ (bolt)'],
    ['ᏕᎥᏦᎯ', 'Cherokee (اسم حقيقي كشف المشكلة)'],
    ['ꦱꦸꦫꦠ꧀', 'Javanese'],
    ['ᚦᚩᚱ', 'Runic'],
    ['ⴰⵎⴰⵣⵉⵖ', 'Tifinagh'],
    ['ილია', 'Georgian'],
  ]) {
    const r = await renderNameTextOnly(text);
    const size = r ? `${r.width}x${r.height}` : 'none';
    check(`${label} تنرسم برمز حقيقي`, Boolean(r) && size !== tofuSize,
      `${size} (مربع tofu = ${tofuSize})`);
  }

  console.log('\n── 4. أسماء واقعية بدون أخطاء ─────────────────────────');
  for (const name of [
    'azبانيذا',
    'محمد العتيبي',
    'لا إله إلا الله',
    'Ali علي 99',
    'Xx_Gamer_xX',
    'Привет',
    '! ZÉCÒ ✩',
    'ᏕᎥᏦᎯ',
  ]) {
    try {
      const r = await renderNameTextOnly(normalizeForRender(name).trim(), NAME_FONT_SIZE);
      check(`"${name}"`, Boolean(r) && r.width > 0 && r.height > 0,
        r ? `${r.width}x${r.height}` : '→ رجع null');
    } catch (err) {
      check(`"${name}"`, false, `→ استثناء: ${err.message}`);
    }
  }

  console.log(`\n${failed === 0 ? '✅' : '❌'} النتيجة: ${passed} نجح، ${failed} فشل`);
  if (failed > 0) process.exit(1);
})();
