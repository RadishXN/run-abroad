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

function studentSection(title, content, cls = '') {
  return `<section class="panel d-block student-detail-block ${cls}"><h2>${sEsc(title)}</h2>${content}</section>`;
}

function specialRequirements(p) {
  return `<div class="student-special-grid">${(STUDENT_SPECIALS[p.id] || []).map((x, i) => `<div class="student-special"><span>${String(i + 1).padStart(2, '0')}</span><p>${sMd(x)}</p></div>`).join('')}</div>`;
}

function checklist(items, pathId) {
  const saved = JSON.parse(sessionStorage.getItem(`student-docs:${pathId}`) || '{}');
  return `<div class="student-progress" data-progress="${sEsc(pathId)}">
    <div class="student-progress-head"><strong>材料准备进度</strong><span><b data-progress-count>0</b> / ${items.length} 已完成 · <b data-progress-percent>0%</b></span></div>
    <div class="student-progress-track"><span data-progress-bar></span></div>
    <div class="student-checklist">${items.map((x, i) => `<label><input type="checkbox" data-doc-check="${sEsc(x.id)}" ${saved[x.id] ? 'checked' : ''}><span><b>${String(i + 1).padStart(2, '0')}</b><strong>${sEsc(x.name)}</strong><small>${sMd(x.detail)}</small><em>准备：${sMd(x.action)} · 费用：${sMd(x.cost)} · 有效期：${sMd(x.validity)}</em></span></label>`).join('')}</div>
  </div>`;
}

function documentCards(pathId, fallback) {
  const items = STUDENT_DOCUMENT_DETAILS[pathId] || (fallback || []).map((name, i) => ({ id: `doc-${i}`, name, detail: '按官方清单核对。', action: '查看官方要求', cost: '待核实', validity: '按官方要求' }));
  return { items, html: checklist(items, pathId) };
}

function timelineCards(pathId, fallback) {
  const rows = STUDENT_TIMELINE_DETAILS[pathId] || (fallback || []).map((x, i) => ({ title: `阶段 ${i + 1}`, duration: '按官方或机构', tasks: [x] }));
  return `<div class="student-timeline">${rows.map((x, i) => `<article class="student-timeline-step"><div class="student-timeline-mark">${String(i + 1).padStart(2, '0')}</div><div><div class="student-timeline-title"><h3>${sEsc(x.title)}</h3><span>${sEsc(x.duration)}</span></div><ul class="d-list">${x.tasks.map(t => `<li>${sMd(t)}</li>`).join('')}</ul></div></article>`).join('')}</div>`;
}

function wireChecklist(pathId) {
  const root = document.querySelector(`[data-progress="${CSS.escape(pathId)}"]`);
  if (!root) return;
  const checks = [...root.querySelectorAll('[data-doc-check]')];
  const update = () => {
    const done = checks.filter(x => x.checked).length;
    const pct = checks.length ? Math.round(done / checks.length * 100) : 0;
    root.querySelector('[data-progress-count]').textContent = done;
    root.querySelector('[data-progress-percent]').textContent = `${pct}%`;
    root.querySelector('[data-progress-bar]').style.width = `${pct}%`;
    sessionStorage.setItem(`student-docs:${pathId}`, JSON.stringify(Object.fromEntries(checks.map(x => [x.dataset.docCheck, x.checked]))));
  };
  checks.forEach(x => x.addEventListener('change', update));
  update();
}

function renderStudentDetail(p) {
  document.title = `${p.title} · 大学生出国路径`;
  const type = STUDENT_TYPES[p.type];
  const guide = STUDENT_GUIDES[p.id] || {};
  const nature = { visa: '正式签证 / 居留', education: '教育项目', training: '职业培训', internship: '实习 / 交流', workholiday: '打工度假', aupair: '互惠生安排', employment: '雇佣路径', platform: '平台线索（不是签证）', longStay: '长期停留（工作权另查）' }[p.legalNature];
  s$('#head').innerHTML = `<a class="back" href="student.html">← 返回学生专题</a><div class="d-title"><span class="d-flag">${p.flag}</span><div><p class="d-country">${sEsc(p.country)} · ${sEsc(p.officialName)}</p><h1>${sEsc(p.title)}</h1></div></div><div class="badges d-badges"><span class="badge">${sEsc(type)}</span><span class="badge">${sEsc(nature)}</span><span class="badge">最后核验 ${sEsc(p.verifiedAt)}</span></div>`;

  const branchHtml = p.branches.map(b => `<div class="student-branch"><h3>${sEsc(b.label)}</h3><ul class="d-list">${b.checks.map(c => `<li><span class="student-kind ${c.kind}">${c.kind === 'hard' ? '硬' : '软'}</span>${sMd(c.label)}：${sMd(c.gap)}</li>`).join('')}</ul></div>`).join('');
  const age = p.requirements?.age || '按具体项目与官方规则核对';
  const docs = documentCards(p.id, guide.documents || p.documents);
  const links = [...(p.officialLinks || []).map(x => ({...x, kind:'官方'})), ...(p.secondaryLinks || []).map(x => ({...x, kind:'参考'}))];

  s$('#body').innerHTML = `
    ${studentSection('这条路是什么', `<p class="student-nature"><strong>${sEsc(nature)}</strong></p><p class="notes">${sMd(p.summary)}</p><p class="student-guide-intro">${sMd(guide.intro || '')}</p>`) }
    ${studentSection('申请条件', `<div class="student-age-callout"><span>年龄窗口</span><strong>${sMd(age)}</strong></div>${guide.requirements ? list(guide.requirements) : ''}${factsTable(p.requirements)}<div class="student-branches">${branchHtml}</div>`) }
    ${studentSection('特殊要求', specialRequirements(p))}
    ${studentSection('费用清单', `${factsTable(p.costs)}${guide.costs ? list(guide.costs) : ''}`) }
    ${studentSection('时间线', `${factsTable(p.timeline)}${timelineCards(p.id, guide.timeline)}`) }
    ${studentSection('材料清单', docs.html) }
    ${studentSection('工作权限', `<div class="student-rights"><h3>可以做什么</h3><p>${sMd(guide.work || p.workRights)}</p><h3>不能做什么</h3><p>${sMd(p.workRestrictions)}</p></div>`) }
    ${studentSection('后续路径', `<p class="notes">${sMd(guide.next || p.followOn || '没有自动身份衔接，需要另行核对官方规则。')}</p>`) }
    ${guide.faq?.length ? studentSection('常见问题', guide.faq.map(([q,a]) => `<details class="student-faq"><summary>${sEsc(q)}</summary><p>${sMd(a)}</p></details>`).join('')) : ''}
    ${guide.tips ? studentSection('实用提醒', list(guide.tips)) : ''}
    ${guide.warnings ? studentSection('风险与避坑', list(guide.warnings), 'd-warn') : ''}
    ${studentSection('官方与参考链接', `<ul class="d-links student-detail-links">${links.map(x => `<li><span class="student-link-kind">${x.kind}</span><a href="${sEsc(x.url)}" target="_blank" rel="noopener noreferrer">${sEsc(x.label)} →</a></li>`).join('')}</ul>`) }
    ${studentSection('资料说明', `<p class="notes">本页把公开路径资料拆成条件、费用、时间线和材料清单重新整理。来源页最近更新：${sEsc(guide.sourceUpdated || '未标注')}。当前置信度：<strong>${sEsc(p.confidence)}</strong>。政策、名额、费用和工作权请以官方链接为准。</p>`) }
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
  wireChecklist(p.id);
})();
