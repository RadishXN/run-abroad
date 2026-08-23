/**
 * 香港工作签证方案数据
 *
 * 只服务 hk.html，主工具的 PATHWAYS 不引用这里。
 *
 * 数据纪律：
 *   verified 标注最后一次对照入境处官网的日期；
 *   confirmed: false 表示该条来自整理资料、官网未能直接核实，页面上会显式标注「待核实」。
 *   宁可标注不确定，也不写一个看起来精确但没核实过的数字。
 */

const HK_VERIFIED = '2026-08';

/** 问卷选项。value 同时是 URL 参数值，改动会让旧分享链接失效。 */
const HK_QUESTIONS = [
  {
    id: 'degreeLoc', q: '你的本科学位在哪里取得？',
    hint: '决定你能不能走 IANG，以及高才通 B/C 类的资格',
    opts: [
      { v: 'hk', t: '香港院校' },
      { v: 'gba', t: '大湾区合作办学' },
      { v: 'listed', t: '合资格大学名单内的院校' },
      { v: 'none', t: '以上都不是' },
    ],
  },
  {
    id: 'fullTime', q: '本科是全日制统招吗？',
    hint: '自考、函授、网络教育、合作办学颁发的学位通常不被认可',
    opts: [
      { v: 'yes', t: '是，全日制统招' },
      { v: 'no', t: '否（自考 / 函授 / 网络教育）' },
    ],
  },
  {
    id: 'gradYears', q: '本科毕业多久了？',
    opts: [
      { v: 'studying', t: '还没毕业' },
      { v: 'within1', t: '1 年内（应届）' },
      { v: 'within5', t: '1–5 年' },
      { v: 'over5', t: '5 年以上' },
    ],
  },
  {
    id: 'workExp', q: '过去 5 年累计全职工作经验？',
    hint: '这一项是高才通 B 类和 C 类的分水岭',
    opts: [
      { v: 'none', t: '没有' },
      { v: 'under3', t: '不足 3 年' },
      { v: 'over3', t: '满 3 年及以上' },
    ],
  },
  {
    id: 'income', q: '申请前 12 个月的应评税收入（港币）？',
    hint: '按申请前 12 个月滚动计算，不是上一个课税年度。租金与理财收益通常不计入',
    opts: [
      { v: 'under100', t: '100 万以下' },
      { v: '100to200', t: '100–200 万' },
      { v: '200to250', t: '200–250 万' },
      { v: 'over250', t: '250 万及以上' },
    ],
  },
  {
    id: 'hasOffer', q: '已经拿到香港雇主的聘用了吗？',
    opts: [
      { v: 'no', t: '还没有' },
      { v: 'yes', t: '有' },
    ],
  },
  {
    id: 'hadTtps', q: '以前获批过高才通吗？',
    opts: [
      { v: 'no', t: '没有' },
      { v: 'yes', t: '获批过' },
    ],
  },
];

/**
 * 五条路径的静态事实。
 * 续签一栏刻意采用入境处的原始表述，不写成 2+2+2 / 2+3+3 ——
 * 整理资料里这两种说法互相冲突，而官网给的是「每次不超过 3 年」的规则而非固定步长。
 */
const HK_SCHEMES = [
  {
    id: 'ttps-a', group: 'ttps', name: '高才通 A 类', nameEn: 'TTPS Category A',
    tag: '高收入人士',
    facts: {
      首次逗留: '36 个月',
      续签: '每次不超过 3 年，或至雇佣合约届满，以较短者为准',
      绑定雇主: '不绑定，可自由工作或创业',
      重复申请: '首次逗留期只获批一次',
      永居: '连续通常居住满 7 年可申请',
      配额: '不设名额限制',
    },
    verified: HK_VERIFIED,
    official: 'https://www.immd.gov.hk/eng/services/visas/TTPS.html',
  },
  {
    id: 'ttps-b', group: 'ttps', name: '高才通 B 类', nameEn: 'TTPS Category B',
    tag: '名校 + 3 年经验',
    facts: {
      首次逗留: '24 个月',
      续签: '每次不超过 3 年，或至雇佣合约届满，以较短者为准',
      绑定雇主: '不绑定',
      重复申请: '首次逗留期只获批一次',
      永居: '连续通常居住满 7 年可申请',
      配额: '与 C 类共用年度配额',
    },
    topTier: '在港满 2 年、且上一课税年度应评税入息达 HK$200 万，一般可获延期 6 年',
    verified: HK_VERIFIED,
    official: 'https://www.immd.gov.hk/eng/services/visas/TTPS.html',
  },
  {
    id: 'ttps-c', group: 'ttps', name: '高才通 C 类', nameEn: 'TTPS Category C',
    tag: '名校 + 经验不足 3 年',
    facts: {
      首次逗留: '24 个月',
      续签: '每次不超过 3 年，或至雇佣合约届满，以较短者为准',
      绑定雇主: '不绑定',
      重复申请: '首次逗留期只获批一次',
      永居: '连续通常居住满 7 年可申请',
      配额: '设年度配额，先到先得，额满即使符合条件也不获批',
    },
    verified: HK_VERIFIED,
    official: 'https://www.immd.gov.hk/eng/services/visas/TTPS.html',
  },
  {
    id: 'iang', group: 'iang', name: 'IANG 毕业生留港', nameEn: 'IANG',
    tag: '香港院校毕业生',
    facts: {
      首次逗留: '24 个月，应届可无条件逗留',
      续签: '按在港受聘情况续期',
      绑定雇主: '不绑定，转工无须事先申请',
      重复申请: '可以再次申请',
      永居: '连续通常居住满 7 年可申请',
      配额: '无',
    },
    verified: HK_VERIFIED,
    official: 'https://www.immd.gov.hk/eng/services/visas/IANG.html',
  },
  {
    id: 'asmtp', group: 'asmtp', name: '输入内地人才计划（专才）', nameEn: 'ASMTP',
    tag: '有雇主聘用',
    facts: {
      首次逗留: '一般 36 个月',
      续签: '按雇佣合约续期',
      绑定雇主: '绑定，转换雇主须事先获入境处批准',
      重复申请: '可以（须有新雇主聘用）',
      永居: '连续通常居住满 7 年可申请',
      配额: '无',
    },
    verified: HK_VERIFIED,
    official: 'https://www.immd.gov.hk/hks/services/visas/ASMTP.html',
  },
];

/**
 * 页面上必须显式标注的不确定项。
 * 这些是整理资料与入境处官网表述不一致、或官网未直接列出的内容 ——
 * 与其挑一个说法写死，不如把分歧摆出来让人自己去核。
 */
const HK_UNCERTAIN = [
  {
    t: 'B / C 类是否只认本科学位',
    d: '整理资料称仅认全日制本科、硕博单独不算；入境处官网的表述是「相当于香港学士学位水平」。' +
       '两者口径不一致，只持有硕士或博士学位的申请人请直接向入境处确认。',
  },
  {
    t: '「只能获批一次」的确切范围',
    d: '入境处原文是「首次逗留期只会获批一次」。坊间常把它解读为「断签后终身不能再申请高才通」，' +
       '但官网并未如此表述。若你已获批过、正考虑续签或重新申请，务必以入境处答复为准。',
  },
  {
    t: 'C 类年度配额的具体数字',
    d: '整理资料给出每年 10,000 个（B/C 共用）。入境处页面确认配额存在且先到先得，但未在该页列出具体数字，' +
       '本页因此不显示该数值。',
  },
  {
    t: '续签的年期步长',
    d: '整理资料里有 2+2+2 与 2+3+3 两种互相冲突的说法。入境处给的是规则而非固定步长（每次不超过 3 年，' +
       '或至合约届满），本页采用官网表述。',
  },
];

/** 加载时自检，缺来源或核实日期直接在控制台告警。 */
function validateHkSchemes() {
  const problems = [];
  const seen = new Set();
  for (const s of HK_SCHEMES) {
    if (seen.has(s.id)) problems.push(`重复 id: ${s.id}`);
    seen.add(s.id);
    if (!s.official) problems.push(`${s.id} 缺 official 官方链接`);
    if (!s.verified) problems.push(`${s.id} 缺 verified 核实日期`);
    for (const k of ['首次逗留', '续签', '绑定雇主', '重复申请', '永居', '配额']) {
      if (!s.facts?.[k]) problems.push(`${s.id} 的 facts 缺「${k}」`);
    }
  }
  for (const q of HK_QUESTIONS) {
    if (!q.opts?.length) problems.push(`问题 ${q.id} 没有选项`);
  }
  return problems;
}
