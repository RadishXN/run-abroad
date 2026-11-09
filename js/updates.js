/**
 * 更新记录。
 *
 * 写在这里的不是「新功能预告」，是修改记录：
 * 改了什么、谁改的、为什么改，以及之前哪里错了。
 * 每条都应该能点进背后的 PR / Issue 自行核对。
 */

const CONTRIBUTORS = {
  RagnTec: 'https://github.com/RagnTec',
  RadishXN: 'https://github.com/RadishXN',
};

const UPDATES = [
  {
    date: '2026-11-09',
    title: '把新西兰技术移民 (SMC) 拆成三条路径',
    author: 'dainiubi438-debug',
    tags: ['政策更新', '数据修正', '新西兰'],
    problem:
      'SMC 原卡片写的是「2023 年改为 6 分制」，把整个 SMC 当作单一路径，并且设了 `minDeg: DEG.bachelor`。' +
      '但新西兰移民局 2026-08-24 起把 SMC 改成了**三条并列路径**，满足任意一条即可；' +
      '其中新设的两条恰恰**不要求本科学位**，是给多年经验型申请人和技工开的门。' +
      '结果是无学位但有长期技术工作经验、或持 Level 4 资格的技工，会被这张卡片直接判成「暂时走不通」——' +
      '对一个以「告诉你哪条路能走」为目标的初筛工具，这是漏报，不是保守估计。' +
      '另外原文「累计到 6 分」容易被读成学历分和收入分可以相加，而官方明确禁止跨技能类别混算。',
    change: [
      '保留 `nz-smc` 这个 id（避免破坏已有分享链接与外链），改写为「积分制路径」，并在 notes 里明确 6 分须来自单一技能类别、只能与新西兰技术工作经验分组合。',
      '新增 `nz-smc-work-exp`：5 年相关经验（含 2 年新西兰）、ANZSCO 1–3、薪资 ≥1.1× 门槛、不要求学位。写明 Red List 不可用、Amber List 加严到 1.2×、自雇不计入。',
      '新增 `nz-smc-trades`：NZQCF Level 4+ 相关资格、4 年取得资格后的经验（含 1.5 年新西兰），按 `vocational` 类型建模。',
      '三条都补了 detail（步骤 / 材料 / 坑 / 官方链接），并把 `nz-psw` 的 notes 同步为「三条路径的共同入口」。',
      'README 路径数 171 → 173，大洋洲 9 → 11，新西兰 5 → 7，技术移民 6 → 8。',
    ],
    note:
      '**两处引擎建模限制已写进各卡片的 pitfalls，没有假装判得准**：' +
      '① `req` 各字段是 AND 关系，无法表达积分制路径的「学历 / 职业注册 / 收入三选一」——' +
      '本 PR 按最常见的学历路径建模，靠职业注册或高收入拿分的无学位申请人要以官网为准；' +
      '② `req.workExp` 只能表达总年数，无法表达「其中 2 年 / 1.5 年必须在新西兰」。' +
      '这两处若要判准，需要扩展 `req` 字段，属于比本 PR 更大的改动，先明示、不硬套。' +
      '另外 `cost` 字段沿用了原值未改，本 PR 只修资格路径，费用请另开 PR 核对。',
    links: [
      { t: 'SMC 三条路径总览（INZ 官方）', u: 'https://www.immigration.govt.nz/live/resident-visas-to-live-in-new-zealand/skilled-residence-pathways-in-new-zealand/skilled-migrant-category-pathway-to-residence/2026-changes-to-the-skilled-migrant-category-resident-visa/' },
      { t: '2026-08-24 生效公告（INZ 官方）', u: 'https://www.immigration.govt.nz/about-us/news-centre/further-changes-to-the-skilled-migrant-category-to-come-into-effect-in-august-2026' },
      { t: 'SMC 工资门槛费率表（INZ 官方）', u: 'https://www.immigration.govt.nz/live/resident-visas-to-live-in-new-zealand/skilled-residence-pathways-in-new-zealand/skilled-migrant-category-pathway-to-residence/pay-rates-for-the-skilled-migrant-category-resident-visa/' },
    ],
  },
  {
    date: '2026-08-18',
    title: '把「有存款」和「有收入」分开',
    author: 'RagnTec',
    tags: ['匹配逻辑', '数据模型'],
    problem:
      '数字游民类签证要求的是**每月持续的境外收入**，但工具此前只有一个「可动用资金」字段，把存款和收入混为一谈。' +
      '结果是：你有 20 万存款、但没有可以长期在境外做的工作，系统照样把葡萄牙 D8 推荐给你。',
    change: [
      '新增独立的收入模型：收入类型、当前工作能否长期在境外完成、主动月收入、被动月收入、主要收入来源地——按需展开，不相关的问题不会出现。',
      '数字游民类路径改为按收入判定；**存款类要求保持不变**（如泰国 DTV 要的确实是 50 万泰铢存款，不是收入）。',
      '缺口提示改为具体原因：「当前工作不能长期在境外远程进行」「当前远程收入低于该路径约 $3,800/月 的要求」，而不是一句通用的资金要求。',
      '收入档位落在门槛附近时，提示「当前收入档位尚不能确认达到要求」，不假装能判准。',
    ],
    effect: {
      head: ['你的情况', '数字游民类「符合条件」'],
      rows: [
        ['有约 20 万存款，但没有远程收入', '2 条'],
        ['受雇，但工作不能远程', '2 条'],
        ['可远程，月入 $1,000', '2 条'],
        ['可远程，月入 $4,000', '7 条'],
      ],
    },
    note:
      '**一个意外收获**：审阅这个 PR 的过程中，贡献者反过来查出了我们数据里的一处错误——' +
      '挪威自雇那一条把两类不同的许可混成了一条（境外自雇赴挪威做 assignment 最长 2 年但**不计入永居**；' +
      '在挪威经营自有业务的那类才可以计入）。原本的 review 意见要求把这条一起迁移，' +
      '是错的——机械迁移只会把错误数据换个字段继续存在。这条已单独标记待修，没有塞进这个 PR。',
    links: [
      { t: 'Pull Request #3', u: 'https://github.com/RadishXN/run-abroad/pull/3' },
    ],
  },
];
