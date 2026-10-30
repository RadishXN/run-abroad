/**
 * 匹配引擎
 *
 * 设计原则：不做「能 / 不能」的二元判断。
 * 大多数人真正需要知道的是「我差什么，补上要多久」，
 * 所以每条路径都会算出 gaps（硬缺口）和 softGaps（可以努力补上的缺口）。
 */

/** 硬性缺口：短期内无法改变（年龄、毕业年限、学校排名） */
const HARD = 'hard';
/** 软性缺口：花时间或花钱可以补（语言、工作经验、资金、offer） */
const SOFT = 'soft';

/**
 * 软缺口的粗略准备成本，只用于排序和展示，**不参与** eligible / close / stretch / blocked 的判定。
 *
 * - months：补上这个缺口大约需要的月数区间 [最少, 最多]（含备考 / 申请 / 等待）。
 * - monthsPerUnit：按「缺口大小」线性估算（目前只有 workExp：每缺 1 年约 12 个月）。
 * - cost：费用档位 none / low / mid / high，只是相对高低，不是金额。
 * - uncertain：时间取决于外部因素（如能否拿到雇主 offer），展示时会标注「不确定」。
 *
 * 这些数字是常见情形下的粗略估计，不是权威数据，也不承诺成功率。
 * 欢迎直接改常量并在 PR 里说明依据；单条路径有特殊情况时，
 * 可在 data.js 的该路径上写可选字段 effortOverrides，只覆盖需要改的字段，例如：
 *   effortOverrides: { english: { months: [1, 3] }, workExp: { monthsPerUnit: 6 } }
 */
const GAP_EFFORT = {
  english:    { months: [2, 12],  cost: 'low'  },   // 雅思 / 同等考试的备考 + 考试周期
  french:     { months: [6, 18],  cost: 'mid'  },   // 从入门到 NCLC 7 左右
  otherLang:  { months: [6, 24],  cost: 'mid'  },   // 达到 B1–B2 的常见学习周期
  workExp:    { monthsPerUnit: 12, cost: 'none' },  // 每缺 1 年约 12 个月，按缺的年数线性算
  funds:      { months: [3, 24],  cost: 'mid'  },   // 视缺口大小，积累或筹措资金
  income:     { months: [3, 12],  cost: 'none' },   // 建立 / 调整持续收入来源
  jobOffer:   { months: [3, 12],  cost: 'none', uncertain: true }, // 求职周期，高度依赖市场
  skills:     { months: [12, 36], cost: 'mid'  },   // 转向或培训新的职业方向
  degree:     { months: [12, 24], cost: 'high' },   // 读一个硕士等
  studyIn:    { months: [12, 24], cost: 'high' },   // 在目标地读一个学位
  gradWithin: { months: [0, 1],   cost: 'none', uncertain: true }, // 只是毕业时间未填，尽快核实即可
};

const COST_RANK = { none: 0, low: 1, mid: 2, high: 3 };

/** 某个软缺口在某条路径上的预估：默认值 + 该路径的 effortOverrides（可选）。 */
function effortOf(gap, profile, p) {
  const base = { ...(GAP_EFFORT[gap.field] || { months: [0, 0], cost: 'none', uncertain: true }) };
  Object.assign(base, p.effortOverrides?.[gap.field]);
  let months = base.months;
  if (base.monthsPerUnit != null) {
    // 目前只有工作年限按缺口大小线性估算
    const missing = gap.field === 'workExp'
      ? Math.max(0, (p.req.workExp || 0) - (profile.workExp || 0))
      : 1;
    const m = Math.round(base.monthsPerUnit * missing);
    months = [m, m];
  }
  return { months: [...months], cost: base.cost, uncertain: !!base.uncertain };
}

/**
 * 一条路径的准备成本汇总：缺口可以并行准备，所以时间取各缺口的最大值，费用取最高档位。
 * 没有软缺口时返回 null。
 */
function summarizeEffort(softGaps) {
  if (!softGaps.length) return null;
  const efforts = softGaps.map((g) => g.effort);
  return {
    months: [
      Math.max(...efforts.map((e) => e.months[0])),
      Math.max(...efforts.map((e) => e.months[1])),
    ],
    cost: efforts.reduce((top, e) => (COST_RANK[e.cost] > COST_RANK[top] ? e.cost : top), 'none'),
    uncertain: efforts.some((e) => e.uncertain),
  };
}

const MATCH_ACTIVE_INCOME_TYPES = new Set(['employee', 'selfEmployed', 'mixed']);

function compareIncomeBand(value, threshold) {
  if (value == null) return 'unknown';
  const band = MONTHLY_INCOME_BANDS.find((item) => item.v === Number(value));
  if (!band) return Number(value) >= threshold ? 'met' : 'below';
  if (band.min >= threshold) return 'met';
  if (band.max != null && band.max < threshold) return 'below';
  return 'ambiguous';
}

/** 先判断是否满足，再识别缺失或档位歧义，最后选择一条最相关的用户提示。 */
function checkIncome(profile, p, income) {
  const activeType = MATCH_ACTIVE_INCOME_TYPES.has(profile.incomeType);
  const passiveType = ['passive', 'mixed'].includes(profile.incomeType);
  const sourceKnown = !!profile.primaryIncomeCountry;
  const sourceOk = !income.foreignSource ||
    (sourceKnown && profile.primaryIncomeCountry !== p.country);
  const activeAmount = compareIncomeBand(profile.activeIncome, income.minMonthlyUSD);
  const passiveAmount = compareIncomeBand(profile.passiveIncome, income.minMonthlyUSD);

  const remoteOk = activeType &&
    profile.remoteAbroad === 'yes' &&
    activeAmount === 'met' &&
    sourceOk;
  const passiveOk = passiveType &&
    passiveAmount === 'met';

  if (income.mode === 'remote' && remoteOk) return null;
  if (income.mode === 'passive' && passiveOk) return null;
  if (income.mode === 'either' && (remoteOk || passiveOk)) return null;

  const incomeTypeUnknown = profile.incomeType == null;
  const remoteUnknown = incomeTypeUnknown || (activeType && (
    profile.remoteAbroad == null || profile.remoteAbroad === 'uncertain' ||
    (profile.remoteAbroad === 'yes' &&
      (activeAmount === 'unknown' || (income.foreignSource && !sourceKnown)))
  ));
  const passiveUnknown = incomeTypeUnknown ||
    (passiveType && passiveAmount === 'unknown');
  const unknown = income.mode === 'remote' ? remoteUnknown
    : income.mode === 'passive' ? passiveUnknown
      : remoteUnknown || passiveUnknown;

  const checksRemote = income.mode === 'remote' || income.mode === 'either';
  const checksPassive = income.mode === 'passive' || income.mode === 'either';
  const threshold = `$${income.minMonthlyUSD.toLocaleString()}/月`;
  const withShortfallHint = (message) => income.shortfallHint
    ? `${message}；${income.shortfallHint}`
    : message;
  let text;
  if (checksRemote && activeType && profile.remoteAbroad === 'no') {
    text = '当前工作不能长期在境外远程进行';
  } else if (checksRemote && activeType && profile.remoteAbroad === 'uncertain') {
    text = '需先确认当前工作是否允许长期在境外远程进行';
  } else if (checksRemote && activeType && profile.remoteAbroad === 'yes' &&
    activeAmount === 'below') {
    text = withShortfallHint(`当前远程收入低于该路径约 ${threshold}的要求`);
  } else if (checksRemote && activeType && profile.remoteAbroad === 'yes' &&
    activeAmount === 'ambiguous') {
    text = `当前远程收入档位无法确认是否达到该路径约 ${threshold}的要求`;
  } else if (checksRemote && activeType && profile.remoteAbroad === 'yes' &&
    income.foreignSource && sourceKnown && profile.primaryIncomeCountry === p.country) {
    text = '主要收入来自目标国家/地区，不符合该路径以境外收入为主的要求';
  } else if (checksPassive && passiveType && profile.passiveIncome != null &&
    passiveAmount === 'below') {
    text = withShortfallHint(`当前稳定被动收入低于该路径约 ${threshold}的要求`);
  } else if (checksPassive && passiveType && passiveAmount === 'ambiguous') {
    text = `当前稳定被动收入档位无法确认是否达到该路径约 ${threshold}的要求`;
  } else if (unknown) {
    text = '需补充持续收入信息，确认这条路径的收入条件';
  } else if (income.mode === 'remote') {
    text = `需要可长期在境外完成的远程工作，并有每月约 $${income.minMonthlyUSD.toLocaleString()} 的持续主动收入` +
      (income.foreignSource ? '（主要来自居住国以外）' : '');
  } else if (income.mode === 'passive') {
    text = `需要每月约 $${income.minMonthlyUSD.toLocaleString()} 的持续被动收入`;
  } else {
    text = `需要每月约 $${income.minMonthlyUSD.toLocaleString()} 的持续远程或被动收入`;
  }

  return { kind: SOFT, field: 'income', text };
}

function checkPathway(profile, p) {
  const req = p.req || {};
  const gaps = [];

  // 年龄 —— 唯一真正不可逆的门槛
  if (req.age) {
    const [lo, hi] = req.age;
    if (profile.age < lo) {
      gaps.push({ kind: HARD, field: 'age', text: `年龄需满 ${lo} 岁` });
    } else if (profile.age > hi) {
      const over = profile.age - hi;
      gaps.push({ kind: HARD, field: 'age', text: `超龄 ${over} 岁（上限 ${hi} 岁）` });
    }
  }

  // 学历；部分路径也接受当前在读生（yearsSinceGrad 为 null）。
  // 「还在读 / 尚未毕业」也可能是没读过大学的人，至少要有高中学历才算可能在读本科。
  const currentStudent = profile.yearsSinceGrad == null && profile.degree >= DEG.highschool;
  if (req.minDeg != null && profile.degree < req.minDeg &&
      !(req.allowCurrentStudent && currentStudent)) {
    gaps.push({
      kind: SOFT, field: 'degree',
      text: `需要${DEG_LABEL[req.minDeg]}及以上学历，你目前是${DEG_LABEL[profile.degree]}`,
    });
  }

  // 学校排名档位（数字越小越好）
  if (req.uniRank != null && profile.uniRank > req.uniRank) {
    gaps.push({
      kind: HARD, field: 'uniRank',
      text: `要求世界排名前 ${req.uniRank} 的院校，你的院校档位不满足`,
    });
  }

  // 本科院校档位：部分路径（如香港高才通）只看本科院校，硕博院校不算
  if (req.ugRank != null && (profile.ugRank ?? profile.uniRank) > req.ugRank) {
    gaps.push({
      kind: HARD, field: 'ugRank',
      text: `要求本科院校为世界排名前 ${req.ugRank}（QS${req.ugRank}），硕博院校不算，你的本科院校档位不满足`,
    });
  }

  // 毕业年限窗口
  if (req.gradWithin != null) {
    if (profile.yearsSinceGrad == null) {
      gaps.push({ kind: SOFT, field: 'gradWithin', text: `需在毕业 ${req.gradWithin} 年内申请` });
    } else if (profile.yearsSinceGrad > req.gradWithin) {
      gaps.push({
        kind: HARD, field: 'gradWithin',
        text: `毕业已满 ${profile.yearsSinceGrad} 年，超过 ${req.gradWithin} 年窗口期`,
      });
    }
  }

  // 英语
  if (req.minEng != null && profile.english < req.minEng) {
    gaps.push({
      kind: SOFT, field: 'english',
      text: `语言需达到「${ENG_LABEL[req.minEng]}」，你当前是「${ENG_LABEL[profile.english]}」`,
    });
  }

  // 法语
  if (req.minFrench != null && profile.french < req.minFrench) {
    gaps.push({
      kind: SOFT, field: 'french',
      text: `法语需达到「${FRA_LABEL[req.minFrench]}」，你当前是「${FRA_LABEL[profile.french]}」`,
    });
  }

  // 小语种：某条路径的开关，有就能走，没有就走不了
  if (req.otherLang && !(profile.langs || []).includes(req.otherLang.code)) {
    gaps.push({
      kind: SOFT, field: 'otherLang',
      text: `需要${req.otherLang.label}水平`,
    });
  }

  // 工作经验
  if (req.workExp != null && profile.workExp < req.workExp) {
    gaps.push({
      kind: SOFT, field: 'workExp',
      text: `需要 ${req.workExp} 年以上工作经验，你有 ${profile.workExp} 年`,
    });
  }

  // 资金
  if (req.fundsUSD != null && profile.funds < req.fundsUSD) {
    gaps.push({
      kind: SOFT, field: 'funds',
      text: `需准备约 $${req.fundsUSD.toLocaleString()} 资金证明，超出你的预算区间`,
    });
  }

  // 持续收入：远程能力、金额和来源地合并为一个初筛缺口。
  if (req.income) {
    const gap = checkIncome(profile, p, req.income);
    if (gap) gaps.push(gap);
  }

  // 学位就读地：部分路径只认一个或一组指定地区的院校
  if (req.studyInAny?.length && !req.studyInAny.includes(profile.studyLoc)) {
    const locations = req.studyInAny.map((loc) => STUDY_LOC[loc]).join(' / ');
    gaps.push({
      kind: SOFT, field: 'studyIn',
      text: `需在以下地区之一的院校就读或毕业：${locations}`,
    });
  } else if (req.studyIn && profile.studyLoc !== req.studyIn) {
    gaps.push({
      kind: SOFT, field: 'studyIn',
      text: `学位需在${STUDY_LOC[req.studyIn]}的院校取得（可先去读书再申请）`,
    });
  }

  // 工作 offer
  if (req.jobOffer && !profile.hasOffer) {
    // 用「合同」覆盖工作 offer、学徒培训合同、季节工用工合同等多种情形
    gaps.push({ kind: SOFT, field: 'jobOffer', text: '需要先拿到当地的工作 / 培训合同' });
  }

  // 技能方向（满足其一即可）。
  // 用户没勾选任何技能时视为「未提供」——既不加分也不扣分，
  // 否则跳过这一项的人会在所有职业类路径上凭空多出一个缺口。
  let skillMatch = false;
  if (req.skills && req.skills.length && profile.skills.length) {
    skillMatch = req.skills.some((s) => profile.skills.includes(s));
    if (!skillMatch) {
      const names = req.skills.map((s) => SKILLS[s]).join(' / ');
      gaps.push({ kind: SOFT, field: 'skills', text: `这条路主要面向：${names}` });
    }
  }

  const hardGaps = gaps.filter((g) => g.kind === HARD);
  const softGaps = gaps.filter((g) => g.kind === SOFT);
  for (const g of softGaps) g.effort = effortOf(g, profile, p);

  let status;
  if (gaps.length === 0) status = 'eligible';
  else if (hardGaps.length > 0) status = 'blocked';
  else if (softGaps.length <= 2) status = 'close';
  else status = 'stretch';

  return {
    pathway: p, status, hardGaps, softGaps, skillMatch,
    effort: summarizeEffort(softGaps),
    score: scoreOf(profile, p, status, softGaps, skillMatch),
  };
}

/**
 * 这条路径是否真的通往永居。
 * 必须先排除否定表述 —— 「不通往永居」里同样含「永居」二字，
 * 直接做关键词匹配会把打工度假、数字游民签全部误判成永居路径。
 */
function leadsToPR(p) {
  const pr = p.pr || '';
  if (/不通往|不直接通往|不计入|不挂钩|属于短期/.test(pr)) return false;
  return /永居|绿卡|永久居民|长居|入籍|^是$/.test(pr);
}

/**
 * 打分只用于排序，不代表「成功率」。
 * 基准分按 status 给，再根据用户目标做偏好加权。
 */
function scoreOf(profile, p, status, softGaps, skillMatch) {
  let score = { eligible: 70, close: 50, stretch: 30, blocked: 0 }[status];
  if (status === 'blocked') return 0;

  // 每个软缺口按预估时间中位数折算扣分：round(3 + 月数中位 / 6)，限制在 2–8 分。
  // 例：gradWithin 3、english / jobOffer / income 约 4、funds / french 5、
  // degree / studyIn 6、skills 7、workExp 缺 1 年 5（缺得多封顶 8）。
  // 多数缺口比原先固定的 6 分扣得少，所以整体分数会略高一点；
  // 分数只用于组内排序，不影响 status，只是「两个月能补」比「要读两年书」扣得更少。
  for (const g of softGaps) {
    const [lo, hi] = g.effort.months;
    score -= Math.max(2, Math.min(8, Math.round(3 + (lo + hi) / 2 / 6)));
  }

  // 职业方向对上了紧缺清单，是很强的正面信号，往前排
  if (skillMatch) score += 10;

  const goals = profile.goals || [];

  if (goals.includes('pr')) score += leadsToPR(p) ? 14 : -12;
  if (goals.includes('fast') && ['workholiday', 'jobseek', 'nomad'].includes(p.type)) score += 12;
  if (goals.includes('fast') && p.type === 'skilled') score -= 6;

  // 「软着陆」只是落脚点，不是身份路径，默认压低排序，
  // 只有明确想「先出去」或「预算有限」的人才把它往上提。
  if (p.type === 'soft') {
    score -= 20;
    if (goals.includes('fast')) score += 10;
    if (goals.includes('cheap')) score += 6;
  }
  if (goals.includes('cheap')) {
    const need = p.req?.fundsUSD || 0;
    if (need <= 5000) score += 10;
    if (need >= 100000) score -= 15;
    if (p.difficulty >= 4) score -= 4;
  }
  if (goals.includes('study') && p.type === 'study') score += 12;
  const incomeMode = p.req?.income?.mode;
  const remoteRelevant = incomeMode
    ? ['remote', 'either'].includes(incomeMode)
    : p.type === 'nomad';
  if (goals.includes('remote') && remoteRelevant) score += 16;
  if (goals.includes('business') && p.type === 'invest') score += 14;
  if (goals.includes('family') && ['workholiday', 'soft'].includes(p.type)) score -= 8;

  // 难度轻微反向影响，让同等条件下更好走的排前面
  score -= (p.difficulty - 3) * 3;

  return Math.max(1, Math.min(99, Math.round(score)));
}

/** 主入口：返回按 status 分组、组内按分数降序的结果。 */
function matchAll(profile) {
  const results = PATHWAYS.map((p) => checkPathway(profile, p));
  const bucket = { eligible: [], close: [], stretch: [], blocked: [] };
  for (const r of results) bucket[r.status].push(r);
  for (const k of Object.keys(bucket)) {
    bucket[k].sort((a, b) => b.score - a.score || a.pathway.difficulty - b.pathway.difficulty);
  }
  return bucket;
}

/**
 * 统计哪个软缺口挡住了最多路径 —— 用来给出「优先补哪一项」的建议。
 * 这往往比列出一堆签证更有用。
 *
 * 排序仍以「挡住的路径数」为主，只用预估时间做温和折算：
 *   权重 = 路径数 / (1 + 典型月数中位 / 48)
 * 折算是温和的：约 36 个月的缺口权重约打 5.7 折（1/1.75），约 2 个月的几乎不打折。
 * 例：degree 解锁 20 条、中位 18 个月 → 14.55，english 解锁 15 条、中位 7 个月 → 13.09，
 * 仍是 20 条的在前；但若 15 条的只要 2 个月 → 14.40，与 20 条的几乎打平；
 * 解锁 20 条但要约 36 个月 → 11.43，则会排到 15 条 / 2 个月的后面。
 * 路径数差距明显时仍由数量决定。
 * 权重相同时路径数多的在前。months 取各路径上该缺口预估的平均值，仅用于展示。
 */
function bottlenecks(bucket) {
  const stat = {};
  for (const r of [...bucket.close, ...bucket.stretch]) {
    for (const g of r.softGaps) {
      const s = stat[g.field] || (stat[g.field] = { count: 0, lo: 0, hi: 0 });
      s.count += 1;
      s.lo += g.effort.months[0];
      s.hi += g.effort.months[1];
    }
  }
  const advice = {
    english: '提高语言成绩（考出雅思 6.5 或同等）',
    workExp: '积累工作经验',
    degree: '提升学历（读一个硕士）',
    funds: '攒够资金证明',
    income: '确认并建立符合路径要求的持续收入',
    jobOffer: '拿到一个海外雇主 offer',
    skills: '转向紧缺职业方向',
    gradWithin: '尽快在毕业窗口期内行动',
    studyIn: '考虑先去目标国家读一个学位',
    french: '学法语到 NCLC 7（加拿大法语通道分数线远低于常规轮次）',
    otherLang: '学一门小语种（德语开职业教育，日语开日本本地路径）',
  };
  return Object.entries(stat)
    .map(([field, s]) => {
      const months = [Math.round(s.lo / s.count), Math.round(s.hi / s.count)];
      return {
        field, count: s.count, months, text: advice[field] || field,
        weight: s.count / (1 + (months[0] + months[1]) / 2 / 48),
      };
    })
    .sort((a, b) => b.weight - a.weight || b.count - a.count)
    .slice(0, 3)
    .map(({ weight, ...rest }) => rest);
}
