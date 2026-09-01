/** 大学生专题：问卷、分支评估、结果和 URL 分享。 */

const studentEsc = (s) => String(s ?? '').replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const studentMd = (s) => studentEsc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
const student$ = (s) => document.querySelector(s);

function optionMarkup(q) {
  return q.options.map((o) => `<label class="chip student-chip">
    <input type="${q.type === 'checkbox' ? 'checkbox' : 'radio'}" name="${q.id}" value="${studentEsc(o.value)}">
    <span>${studentEsc(o.label)}</span>
  </label>`).join('');
}

function renderStudentQuiz() {
  student$('#quiz').innerHTML = STUDENT_QUESTIONS.map((q, i) => {
    const control = q.type === 'number'
      ? `<input class="student-number" id="student-age" type="number" min="15" max="80" placeholder="例如 22" required>`
      : `<div class="chips">${optionMarkup(q)}</div>`;
    return `<fieldset class="student-q" data-q="${q.id}">
      <legend><span class="q-index">${String(i + 1).padStart(2, '0')}</span>${studentEsc(q.label)}${q.hint ? `<em>${studentEsc(q.hint)}</em>` : ''}</legend>
      ${control}
    </fieldset>`;
  }).join('');
}

function readStudentProfile() {
  const p = {};
  for (const q of STUDENT_QUESTIONS) {
    if (q.type === 'number') p[q.id] = Number(student$('#student-age').value || 0);
    else if (q.type === 'checkbox') p[q.id] = [...document.querySelectorAll(`input[name="${q.id}"]:checked`)].map((e) => e.value);
    else p[q.id] = document.querySelector(`input[name="${q.id}"]:checked`)?.value || null;
  }
  return p;
}

function completeStudentProfile(p) {
  return STUDENT_QUESTIONS.every((q) => q.type === 'checkbox' || (p[q.id] !== null && p[q.id] !== undefined && p[q.id] !== 0));
}

function evalStudentBranch(branch, p) {
  const hardGaps = [], softGaps = [];
  for (const c of branch.checks) {
    if (c.test(p)) continue;
    (c.kind === 'hard' ? hardGaps : softGaps).push(c.gap);
  }
  return { branchId: branch.id, label: branch.label, hardGaps, softGaps, passed: !hardGaps.length && !softGaps.length };
}

function studentStatus(r) {
  if (r.best.passed) return 'eligible';
  if (!r.best.hardGaps.length && r.best.softGaps.length <= 2) return 'close';
  if (!r.best.hardGaps.length) return 'prepare';
  if (r.results.some((x) => !x.hardGaps.length)) return 'prepare';
  return 'blocked';
}

function evaluateStudentPathway(path, profile) {
  const branches = path.branches.map((b) => evalStudentBranch(b, profile));
  const best = [...branches].sort((a, b) =>
    (a.hardGaps.length - b.hardGaps.length) || (a.softGaps.length - b.softGaps.length))[0];
  const result = { pathway: path, results: branches, best };
  result.status = studentStatus(result);
  return result;
}

const STUDENT_STATUS = {
  eligible: { label: '值得先查', cls: 'ok' },
  close: { label: '补一两项', cls: 'near' },
  prepare: { label: '需要准备', cls: 'far' },
  blocked: { label: '暂不匹配', cls: 'no' },
};

function scoreStudentResult(r, p) {
  const score = { eligible: 100, close: 72, prepare: 45, blocked: 0 }[r.status];
  let n = score - r.best.softGaps.length * 7 - r.best.hardGaps.length * 18;
  if (p.goals?.includes('leaveFast') && ['workholiday', 'employment', 'internship'].includes(r.pathway.type)) n += 10;
  if (p.goals?.includes('skill') && r.pathway.type === 'training') n += 10;
  if (p.goals?.includes('lowCost') && /低|免学费|津贴|工资/.test(r.pathway.costs.startup + r.pathway.costs.tuition)) n += 6;
  if (p.goals?.includes('pr') && /永居|长期/.test(r.pathway.followOn)) n += 6;
  if (p.limits?.includes('noShortStay') && /短期|12 个月|一年/.test(r.pathway.timeline.duration)) n -= 10;
  if (r.pathway.confidence === 'needs-confirmation') n -= 5;
  return n;
}

function renderStudentResults() {
  const p = readStudentProfile();
  const box = student$('#results');
  if (!completeStudentProfile(p)) {
    box.hidden = false;
    box.innerHTML = `<div class="panel student-empty">把上面的必答项填完，结果会在这里出现。<span>先不用急着决定国家。</span></div>`;
    return;
  }

  const rs = STUDENT_PATHWAYS.map((x) => evaluateStudentPathway(x, p))
    .sort((a, b) => scoreStudentResult(b, p) - scoreStudentResult(a, p));
  const count = (s) => rs.filter((r) => r.status === s).length;
  const best = rs.filter((r) => r.status === 'eligible' || r.status === 'close').slice(0, 5);
  const gaps = [...new Set(best.flatMap((r) => r.best.softGaps).filter(Boolean))].slice(0, 3);

  box.hidden = false;
  box.innerHTML = `
    <section class="panel student-summary">
      <div class="student-result-head"><div><span class="eyebrow">按你的当前答案</span><h2>先看这 ${best.length || 0} 条</h2></div><button class="ghost" id="studentCopy">复制结果链接</button></div>
      <div class="stats">
        <div class="stat"><b>${count('eligible')}</b><span>值得先查</span></div>
        <div class="stat"><b>${count('close')}</b><span>补一两项</span></div>
        <div class="stat"><b>${count('prepare')}</b><span>需要准备</span></div>
        <div class="stat"><b>${count('blocked')}</b><span>暂不匹配</span></div>
      </div>
      ${gaps.length ? `<div class="student-next"><h3>最值得先补的</h3><ul>${gaps.map((g) => `<li>${studentMd(g)}</li>`).join('')}</ul></div>` : ''}
    </section>
    <div class="student-results-list">${rs.map(studentCard).join('')}</div>`;

  student$('#studentCopy').addEventListener('click', async () => {
    await navigator.clipboard.writeText(location.href);
    student$('#studentCopy').textContent = '已复制';
    setTimeout(() => { student$('#studentCopy').textContent = '复制结果链接'; }, 1400);
  });
}

function studentCard(r) {
  const p = r.pathway, st = STUDENT_STATUS[r.status];
  const gaps = [...r.best.hardGaps, ...r.best.softGaps].filter(Boolean);
  const platform = p.legalNature === 'platform';
  return `<article class="student-card ${st.cls}">
    <div class="student-card-top"><div class="student-name"><span class="student-flag">${p.flag}</span><div><span class="student-country">${studentEsc(p.country)} · ${studentEsc(STUDENT_TYPES[p.type])}</span><h3>${studentEsc(p.title)}</h3></div></div><span class="student-status ${st.cls}">${st.label}</span></div>
    <div class="student-tags">${p.tags.map((t) => `<span>${studentEsc(t)}</span>`).join('')}</div>
    ${platform ? '<div class="student-platform-warning">这是平台线索，不是签证，也不自动授予工作许可。</div>' : ''}
    <p class="student-summary-text">${studentMd(p.summary)}</p>
    <dl class="student-facts"><div><dt>预算提示</dt><dd>${studentMd(p.costs.startup)}</dd></div><div><dt>准备周期</dt><dd>${studentMd(p.timeline.preparation)}</dd></div><div><dt>工作边界</dt><dd>${studentMd(p.workRestrictions)}</dd></div></dl>
    ${gaps.length ? `<div class="gaps student-gaps"><b>${r.best.label}分支还差</b><ul>${gaps.map((g) => `<li>${studentMd(g)}</li>`).join('')}</ul></div>` : `<div class="gaps none">✓ 按当前答案没有明显缺口，仍需打开官网核对</div>`}
    <div class="student-card-links"><a href="student-pathway.html?id=${encodeURIComponent(p.id)}">看详细条件与步骤 →</a><a href="${studentEsc(p.officialLinks[0].url)}" target="_blank" rel="noopener noreferrer">官方来源</a></div>
    <small class="student-meta">最后整理：${studentEsc(p.verifiedAt)} · ${p.confidence === 'needs-confirmation' ? '部分信息待官方确认' : '建议再次核对官方页面'}</small>
  </article>`;
}

function renderStudentComparison() {
  const rows = STUDENT_PATHWAYS;
  student$('#comparison').innerHTML = `<thead><tr><th>路径</th><th>性质</th><th>预算起点</th><th>工作 / 身份</th><th>后续</th></tr></thead><tbody>${rows.map((p) => `<tr><td><span class="student-c-flag">${p.flag}</span><a href="student-pathway.html?id=${encodeURIComponent(p.id)}">${studentEsc(p.title)}</a><span class="sub2">${studentEsc(p.country)}</span></td><td class="sub2">${studentEsc(STUDENT_TYPES[p.type])}</td><td class="sub2">${studentMd(p.costs.startup)}</td><td class="sub2">${studentMd(p.workRights)}</td><td class="sub2">${studentMd(p.followOn)}</td></tr>`).join('')}</tbody>`;
}

function syncStudentUrl(p) {
  const q = new URLSearchParams();
  for (const qd of STUDENT_QUESTIONS) {
    const v = p[qd.id];
    if (Array.isArray(v) ? v.length : v) q.set(qd.id, Array.isArray(v) ? v.join('.') : v);
  }
  history.replaceState(null, '', q.toString() ? '?' + q : location.pathname);
}

function loadStudentUrl() {
  const q = new URLSearchParams(location.search);
  if (!q.toString()) return;
  for (const question of STUDENT_QUESTIONS) {
    const raw = q.get(question.id);
    if (!raw) continue;
    if (question.type === 'number') student$('#student-age').value = raw;
    else raw.split('.').forEach((v) => { const el = document.querySelector(`input[name="${question.id}"][value="${CSS.escape(v)}"]`); if (el) el.checked = true; });
  }
}

function initStudent() {
  const problems = validateStudentData();
  if (problems.length) console.warn('[学生专题数据校验]', problems);
  student$('#pathwayCount').textContent = STUDENT_PATHWAYS.length;
  renderStudentQuiz();
  renderStudentComparison();
  loadStudentUrl();
  renderStudentResults();
  student$('#quiz').addEventListener('change', () => { const p = readStudentProfile(); syncStudentUrl(p); renderStudentResults(); });
  student$('#student-age').addEventListener('input', () => { const p = readStudentProfile(); syncStudentUrl(p); renderStudentResults(); });
}

document.addEventListener('DOMContentLoaded', initStudent);
