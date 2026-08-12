/** 单条路径的详情页。数据全部来自 data.js，无网络请求。 */

const $$$ = (s) => document.querySelector(s);

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/** 与首页一致：notes 里的 **…** 转粗体 */
function md(s) {
  return esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

/** 把 req 翻译成人话，逐条列出，而不是塞在一段话里 */
function requirements(p) {
  const r = p.req || {};
  const rows = [];
  if (r.age) rows.push(['年龄', `${r.age[0]} – ${r.age[1] === 99 ? '不限' : r.age[1]} 岁`]);
  if (r.minDeg != null) rows.push(['学历', `${DEG_LABEL[r.minDeg]}及以上`]);
  if (r.uniRank != null) rows.push(['院校', `世界排名前 ${r.uniRank}`]);
  if (r.studyIn) rows.push(['学位取得地', `必须在${STUDY_LOC[r.studyIn]}的院校取得`]);
  if (r.gradWithin != null) rows.push(['毕业年限', `毕业 ${r.gradWithin} 年内`]);
  if (r.minEng != null) rows.push(['英语', ENG_LABEL[r.minEng]]);
  if (r.minFrench != null) rows.push(['法语', FRA_LABEL[r.minFrench]]);
  if (r.otherLang) rows.push(['其他语言', r.otherLang.label]);
  if (r.workExp != null) rows.push(['工作经验', `${r.workExp} 年以上`]);
  if (r.jobOffer) rows.push(['雇主', '需先拿到当地的工作 / 培训合同']);
  if (r.fundsUSD != null) rows.push(['资金', `约 $${r.fundsUSD.toLocaleString()}（资金证明或存款）`]);
  if (r.skills) rows.push(['偏好背景', r.skills.map((s) => SKILLS[s]).join(' / ')]);
  if (!rows.length) rows.push(['门槛', '无硬性门槛']);
  return rows;
}

function list(title, items, cls = '') {
  if (!items || !items.length) return '';
  return `<section class="panel d-block ${cls}">
    <h2>${esc(title)}</h2>
    <ol class="d-steps">${items.map((x) => `<li>${md(x)}</li>`).join('')}</ol>
  </section>`;
}

function bullets(title, items, cls = '') {
  if (!items || !items.length) return '';
  return `<section class="panel d-block ${cls}">
    <h2>${esc(title)}</h2>
    <ul class="d-list">${items.map((x) => `<li>${md(x)}</li>`).join('')}</ul>
  </section>`;
}

function render(p) {
  document.title = `${p.name} · 润学导航`;

  const d = p.detail || {};
  const prYes = leadsToPR(p);

  $$$('#head').innerHTML = `
    <div class="d-title">
      <span class="d-flag">${p.flag}</span>
      <div>
        <p class="d-country">${esc(p.country)} · ${esc(p.nameEn || '')}</p>
        <h1>${esc(p.name)}</h1>
      </div>
    </div>
    <div class="badges d-badges">
      <span class="badge">${TYPE_LABEL[p.type]}</span>
      <span class="badge">${REGION_LABEL[REGION_OF[p.country]] || ''}</span>
      <span class="badge">难度 ${'●'.repeat(p.difficulty)}${'○'.repeat(5 - p.difficulty)}</span>
      <span class="badge ${prYes ? 'match' : ''}">${prYes ? '✓ 通往永居' : '不通往永居'}</span>
    </div>`;

  const facts = [
    ['签证时长', p.duration],
    ['永居路径', p.pr],
    ['费用', p.cost],
    ['名额', p.quota],
    ['办理周期', d.timeline],
  ].filter(([, v]) => v);

  $$$('#body').innerHTML = `
    <section class="panel d-block">
      <h2>这条路是什么</h2>
      <p class="notes">${md(p.notes)}</p>
      <dl class="facts d-facts">
        ${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${md(v)}</dd></div>`).join('')}
      </dl>
    </section>

    <section class="panel d-block">
      <h2>申请门槛</h2>
      <table class="d-req">
        ${requirements(p).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}
      </table>
    </section>

    ${list('申请步骤', d.steps)}
    ${bullets('需要准备的材料', d.docs)}
    ${bullets('容易踩的坑', d.pitfalls, 'd-warn')}

    <section class="panel d-block">
      <h2>官方与延伸链接</h2>
      <ul class="d-links">
        <li><a href="${esc(p.official)}" target="_blank" rel="noopener noreferrer">官方页面（以此为准）</a></li>
        ${(d.links || []).map((l) => `<li><a href="${esc(l.u)}" target="_blank" rel="noopener noreferrer">${esc(l.t)}</a></li>`).join('')}
      </ul>
    </section>

    ${d.steps ? '' : `<section class="panel d-block d-todo">
      <h2>这条还没写详细流程</h2>
      <p class="notes">上面的门槛和链接是准确的，但申请步骤、材料清单、常见坑还没整理。
      与其编一套看起来很详细、实际没核实过的流程，不如先空着 ——
      如果你走过这条路，欢迎到 GitHub 补充。</p>
    </section>`}
  `;
}

(function init() {
  const id = new URLSearchParams(location.search).get('id');
  const p = PATHWAYS.find((x) => x.id === id);

  if (!p) {
    $$$('#head').innerHTML = '<h1>没有找到这条路径</h1>';
    $$$('#body').innerHTML = '<div class="panel empty">链接可能已失效。<a href="index.html">回到首页重新筛选</a>。</div>';
    return;
  }
  render(p);

  // 从结果页点进来的，返回时保留原来的筛选条件
  const back = document.querySelector('.back');
  if (document.referrer.includes('index.html') || document.referrer.endsWith('/')) {
    back.addEventListener('click', (e) => { e.preventDefault(); history.back(); });
  }
})();
