/** 大学生路径详情页。只读取 STUDENT_PATHWAYS，不触碰主站 PATHWAYS。 */

const sEsc = (s) => String(s ?? '').replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sMd = (s) => sEsc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
const s$ = (s) => document.querySelector(s);
const STUDENT_FIELD_LABELS = {
  age: '年龄', education: '学历', language: '语言', stage: '适用阶段', offer: '前置条件',
  proofOfFunds: '资金证明', tuition: '学费 / 课程费', visaFee: '签证费', projectFee: '项目费',
  startup: '启动预算', monthlyLiving: '每月生活费', currency: '币种', preparation: '准备期',
  processing: '审理 / 匹配期', duration: '身份 / 项目时长',
};

function studentFieldLabel(key) {
  return STUDENT_FIELD_LABELS[key] || key;
}

function factsTable(groups) {
  return `<dl class="facts student-detail-facts">${Object.entries(groups).filter(([,v]) => v).map(([k,v]) => `<div><dt>${sEsc(studentFieldLabel(k))}</dt><dd>${sMd(v)}</dd></div>`).join('')}</dl>`;
}
function block(title, content, cls = '') {
  return `<section class="panel d-block student-detail-block ${cls}"><h2>${sEsc(title)}</h2>${content}</section>`;
}
function list(items, ordered = false) {
  const tag = ordered ? 'ol' : 'ul';
  return `<${tag} class="d-list student-detail-list">${(items || []).map(x => `<li>${sMd(x)}</li>`).join('')}</${tag}>`;
}

function renderStudentDetail(p) {
  document.title = `${p.title} · 大学生出国路径`;
  const type = STUDENT_TYPES[p.type];
  const guide = STUDENT_GUIDES[p.id] || {};
  const nature = { visa: '正式签证 / 居留', education: '教育项目', training: '职业培训', internship: '实习 / 交流', workholiday: '打工度假', aupair: '互惠生安排', employment: '雇佣路径', platform: '平台线索（不是签证）', longStay: '长期停留（工作权另查）' }[p.legalNature];
  s$('#head').innerHTML = `<a class="back" href="student.html">← 返回学生专题</a><div class="d-title"><span class="d-flag">${p.flag}</span><div><p class="d-country">${sEsc(p.country)} · ${sEsc(p.officialName)}</p><h1>${sEsc(p.title)}</h1></div></div><div class="badges d-badges"><span class="badge">${sEsc(type)}</span><span class="badge">${sEsc(nature)}</span><span class="badge">最后核验 ${sEsc(p.verifiedAt)}</span></div>`;

  const branchHtml = p.branches.map(b => `<div class="student-branch"><h3>${sEsc(b.label)}</h3><ul class="d-list">${b.checks.map(c => `<li><span class="student-kind ${c.kind}">${c.kind === 'hard' ? '硬' : '软'}</span>${sMd(c.label)}：${sMd(c.gap)}</li>`).join('')}</ul></div>`).join('');
  const links = [...(p.officialLinks || []).map(x => ({...x, kind:'官方'})), ...(p.secondaryLinks || []).map(x => ({...x, kind:'参考'}))];

  s$('#body').innerHTML = `
    ${guide.intro ? block('先说清楚这条路', `<p class="notes">${sMd(guide.intro)}</p>`) : ''}
    ${guide.requirements ? block('完整申请条件', list(guide.requirements)) : ''}
    ${block('申请门槛', factsTable(p.requirements) + `<div class="student-branches">${branchHtml}</div>`) }
    ${guide.costs ? block('费用拆开看', list(guide.costs)) : block('钱要怎么准备', factsTable(p.costs))}
    ${block('时间与工作边界', factsTable(p.timeline) + `<div class="student-rights"><h3>可以做什么</h3><p>${sMd(p.workRights)}</p><h3>不能想当然做什么</h3><p>${sMd(p.workRestrictions)}</p></div>`) }
    ${guide.timeline ? block('从准备到出发', list(guide.timeline, true)) : ''}
    ${p.steps?.length ? block('申请步骤', list(p.steps, true)) : ''}
    ${guide.documents ? block('材料清单（逐项核对）', list(guide.documents)) : p.documents?.length ? block('材料清单', list(p.documents)) : ''}
    ${p.followOn ? block('之后怎么办', `<p class="notes">${sMd(p.followOn)}</p>`) : ''}
    ${guide.next ? block('这条路的后续', `<p class="notes">${sMd(guide.next)}</p>`) : ''}
    ${guide.work ? block('工作权限的真实边界', `<p class="notes">${sMd(guide.work)}</p>`) : ''}
    ${guide.faq?.length ? block('常见问题', guide.faq.map(([q,a]) => `<details class="student-faq"><summary>${sEsc(q)}</summary><p>${sMd(a)}</p></details>`).join('')) : p.faq?.length ? block('常见问题', p.faq.map(x => `<details class="student-faq"><summary>${sEsc(x.q)}</summary><p>${sMd(x.a)}</p></details>`).join('')) : ''}
    ${guide.tips ? block('实用提醒', list(guide.tips)) : ''}
    ${guide.warnings ? block('需要特别小心', list(guide.warnings), 'd-warn') : p.pitfalls?.length ? block('容易踩的坑', list(p.pitfalls), 'd-warn') : ''}
    ${block('官方与参考链接', `<ul class="d-links student-detail-links">${links.map(x => `<li><span class="student-link-kind">${x.kind}</span><a href="${sEsc(x.url)}" target="_blank" rel="noopener noreferrer">${sEsc(x.label)} →</a></li>`).join('')}</ul>`) }
    ${block('资料说明', `<p class="notes">本条路径参考了公开路径资料的字段化整理，但参考资料不是官方来源。来源页最近更新：${sEsc(guide.sourceUpdated || '未标注')}。当前置信度：<strong>${sEsc(p.confidence)}</strong>。实际申请资格、费用、工作权和后续身份，请以链接中的官方页面为准。</p>`) }
  `;
}

(function init() {
  const id = new URLSearchParams(location.search).get('id');
  const p = STUDENT_PATHWAYS.find(x => x.id === id);
  if (!p) {
    s$('#head').innerHTML = '<h1>没有找到这条学生路径</h1>';
    s$('#body').innerHTML = '<div class="panel empty">链接可能已失效。<a href="student.html">回到学生专题</a>。</div>';
    return;
  }
  renderStudentDetail(p);
})();
