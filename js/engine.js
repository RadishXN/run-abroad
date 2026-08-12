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

  // 学历
  if (req.minDeg != null && profile.degree < req.minDeg) {
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

  // 学位就读地：部分路径只认在当地取得的学位
  if (req.studyIn && profile.studyLoc !== req.studyIn) {
    gaps.push({
      kind: SOFT, field: 'studyIn',
      text: `学位需在${STUDY_LOC[req.studyIn]}的院校取得（可先去读书再申请）`,
    });
  }

  // 工作 offer
  if (req.jobOffer && !profile.hasOffer) {
    gaps.push({ kind: SOFT, field: 'jobOffer', text: '需要当地雇主的工作 offer' });
  }

  // 技能方向（满足其一即可）
  if (req.skills && req.skills.length) {
    const hit = req.skills.some((s) => profile.skills.includes(s));
    if (!hit) {
      const names = req.skills.map((s) => SKILLS[s]).join(' / ');
      gaps.push({ kind: SOFT, field: 'skills', text: `更适合这些背景：${names}` });
    }
  }

  const hardGaps = gaps.filter((g) => g.kind === HARD);
  const softGaps = gaps.filter((g) => g.kind === SOFT);

  let status;
  if (gaps.length === 0) status = 'eligible';
  else if (hardGaps.length > 0) status = 'blocked';
  else if (softGaps.length <= 2) status = 'close';
  else status = 'stretch';

  return { pathway: p, status, hardGaps, softGaps, score: scoreOf(profile, p, status, softGaps) };
}

/**
 * 打分只用于排序，不代表「成功率」。
 * 基准分按 status 给，再根据用户目标做偏好加权。
 */
function scoreOf(profile, p, status, softGaps) {
  let score = { eligible: 70, close: 50, stretch: 30, blocked: 0 }[status];
  if (status === 'blocked') return 0;

  score -= softGaps.length * 6;

  const goals = profile.goals || [];
  const isPR = /永居|绿卡|永久居民|是$/.test(p.pr || '');

  if (goals.includes('pr') && isPR) score += 14;
  if (goals.includes('pr') && /不通往永居|不直接通往/.test(p.pr || '')) score -= 12;
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
  if (goals.includes('remote') && p.type === 'nomad') score += 16;
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
 */
function bottlenecks(bucket) {
  const count = {};
  for (const r of [...bucket.close, ...bucket.stretch]) {
    for (const g of r.softGaps) {
      count[g.field] = (count[g.field] || 0) + 1;
    }
  }
  const advice = {
    english: '提高语言成绩（考出雅思 6.5 或同等）',
    workExp: '积累工作经验',
    degree: '提升学历（读一个硕士）',
    funds: '攒够资金证明',
    jobOffer: '拿到一个海外雇主 offer',
    skills: '转向紧缺职业方向',
    gradWithin: '尽快在毕业窗口期内行动',
    studyIn: '考虑先去目标国家读一个学位',
    french: '学法语到 NCLC 7（加拿大法语通道分数线远低于常规轮次）',
    otherLang: '学一门小语种（德语开职业教育，日语开日本本地路径）',
  };
  return Object.entries(count)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([field, n]) => ({ field, count: n, text: advice[field] || field }));
}
