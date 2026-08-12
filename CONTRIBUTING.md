# 贡献指南

## 报告数据错误

移民政策变动频繁，数据出错是常态。提 Issue 时请附上：

- 路径的 `id`（在 `js/data.js` 里）
- 哪个字段错了、正确值是什么
- **官网链接**（这一条最重要，没有官方来源的修改无法合并）

## 补充一条新路径

在 `js/data.js` 的 `PATHWAYS` 数组里加一个对象。所有 `req` 里的字段都是**门槛**，留空 = 无此要求。

```js
{
  id: 'xx-visa-name',              // 唯一，国家代码 + 简称
  country: '国家名', flag: '🇽🇽',
  name: '中文签证名', nameEn: 'Official English Name',
  type: 'jobseek',                 // 见下方类型表
  duration: '12 个月',              // 签证时长
  pr: '连续 5 年可申永居',           // 是否/如何通往永居
  req: {
    age: [18, 30],                 // 年龄区间
    minDeg: DEG.bachelor,          // none/highschool/college/bachelor/master/phd
    uniRank: 100,                  // 院校世界排名要求（50/100/200/500）
    gradWithin: 5,                 // 毕业几年内
    minEng: ENG.ielts55,           // none/daily/ielts55/ielts65/fluent
    workExp: 3,                    // 最低工作年限
    jobOffer: true,                // 是否需要当地 offer
    fundsUSD: 3000,                // 资金证明（美元）
    studyIn: 'hk',                 // 学位必须在该地取得，见 STUDY_LOC
    skills: ['tech', 'science'],   // 偏好的技能方向，满足其一即可
  },
  quota: '每年 1000 个名额',
  cost: '签证费 + 其他实际支出',
  difficulty: 3,                   // 1–5，办理难度
  notes: '实操要点、坑、和别的路径相比的优劣。',
  official: 'https://官网链接',      // 必填，且必须是政府官网
}
```

### type 取值

| 值 | 含义 |
|---|---|
| `workholiday` | 打工度假 |
| `jobseek` | 毕业生找工作签 |
| `talent` | 人才引进 |
| `skilled` | 技术移民 |
| `work` | 工作签证（需 offer） |
| `study` | 留学转移民 |
| `nomad` | 数字游民 |
| `invest` | 创业 / 投资 |
| `soft` | 软着陆 / 落脚点 |

### 写 `notes` 的原则

`notes` 是这个项目最有价值的部分，请写**别处查不到的实操信息**，而不是复述门槛：

- ✅「不需要 offer、不需要日语，名校认定看三大排名中至少两个的前 100」
- ✅「近年因申请量暴增设置了年度处理上限，等待期显著变长，市面上大量『包过』中介风险很高」
- ❌「这是一个适合年轻人的好签证」（没有信息量）

请用自己的话总结，不要大段复制官网或其他网站的原文。

## 提交前自检

打开 `index.html`，按 F12 看控制台。`validatePathways()` 会在页面加载时自动跑，重复 `id`、缺字段、未定义的 `type` 都会打印告警。

然后随手填几组不同的条件，确认你新加的路径出现在合理的分组里——特别是确认它不会对所有人都显示「符合条件」（这通常意味着漏写了某个门槛）。

## 行为准则

这个项目只讨论**合法的**移民与签证路径。不接受任何涉及伪造材料、虚假婚姻、非法滞留的内容。
