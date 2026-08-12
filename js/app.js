/** 表单 → 匹配 → 渲染。纯前端，无任何后端请求。 */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* ── 表单选项 ───────────────────────────── */

const OPTIONS = {
  degree: [
    { v: DEG.highschool, t: '高中 / 中专' },
    { v: DEG.college, t: '大专' },
    { v: DEG.bachelor, t: '本科' },
    { v: DEG.master, t: '硕士' },
    { v: DEG.phd, t: '博士' },
  ],
  uniRank: [
    { v: 50, t: '世界排名前 50' },
    { v: 100, t: '前 100（QS100）' },
    { v: 200, t: '前 200' },
    { v: 500, t: '前 500' },
    { v: 9999, t: '排名 500 开外 / 双非' },
  ],
  studyLoc: Object.entries(STUDY_LOC).map(([v, t]) => ({ v, t })),
  gradYears: [
    { v: 'na', t: '还在读 / 尚未毕业' },
    { v: 0, t: '今年刚毕业' },
    { v: 2, t: '毕业 1–3 年' },
    { v: 4, t: '毕业 3–5 年' },
    { v: 7, t: '毕业 5–10 年' },
    { v: 12, t: '毕业 10 年以上' },
  ],
  english: [
    { v: ENG.none, t: '几乎不会' },
    { v: ENG.daily, t: '日常交流没问题' },
    { v: ENG.ielts55, t: '雅思 5.5 / 六级水平' },
    { v: ENG.ielts65, t: '雅思 6.5 / 能用英语工作' },
    { v: ENG.fluent, t: '接近母语' },
  ],
  french: [
    { v: FRA.none, t: '不会法语' },
    { v: FRA.basic, t: '入门（A1–A2）' },
    { v: FRA.mid, t: '中级（NCLC 5–6）' },
    { v: FRA.nclc7, t: 'NCLC 7+ / TEF B2 以上' },
  ],
  workExp: [
    { v: 0, t: '应届 / 无全职经验' },
    { v: 1, t: '1–2 年' },
    { v: 3, t: '3–5 年' },
    { v: 5, t: '5–10 年' },
    { v: 10, t: '10 年以上' },
  ],
  funds: [
    { v: 1000, t: '1 万人民币以内' },
    { v: 3000, t: '2 万人民币左右' },
    { v: 10000, t: '7 万人民币左右' },
    { v: 30000, t: '20 万人民币左右' },
    { v: 100000, t: '70 万人民币左右' },
    { v: 500000, t: '350 万人民币以上' },
  ],
};

/* ── 构建表单 ───────────────────────────── */

function buildForm() {
  // 所有下拉框默认停在占位项，不预设任何答案 ——
  // 预填的默认值会被当成「系统的建议」，反而干扰用户如实填写。
  const fill = (id, opts, placeholder = '请选择') => {
    const el = $('#' + id);
    el.innerHTML =
      `<option value="" disabled selected>${placeholder}</option>` +
      opts.map((o) => `<option value="${o.v}">${o.t}</option>`).join('');
  };
  fill('degree', OPTIONS.degree);
  fill('uniRank', OPTIONS.uniRank);
  fill('studyLoc', OPTIONS.studyLoc);
  fill('gradYears', OPTIONS.gradYears);
  fill('english', OPTIONS.english);
  fill('french', OPTIONS.french);
  fill('workExp', OPTIONS.workExp);
  fill('funds', OPTIONS.funds);

  $('#skills').innerHTML = Object.entries(SKILLS)
    .map(([k, v]) => chip('skill', k, v)).join('');
  $('#goals').innerHTML = Object.entries(GOALS)
    .map(([k, v]) => chip('goal', k, v)).join('');
}

function chip(group, value, label) {
  return `<label class="chip">
    <input type="checkbox" data-group="${group}" value="${value}">
    <span>${label}</span>
  </label>`;
}

function readProfile() {
  const grad = $('#gradYears').value;
  return {
    age: Math.max(15, Math.min(80, parseInt($('#age').value, 10) || 25)),
    degree: +$('#degree').value,
    uniRank: +$('#uniRank').value,
    studyLoc: $('#studyLoc').value,
    yearsSinceGrad: grad === 'na' ? null : +grad,
    english: +$('#english').value,
    french: +$('#french').value,
    workExp: +$('#workExp').value,
    funds: +$('#funds').value,
    hasOffer: $('#hasOffer').checked,
    skills: $$('[data-group="skill"]:checked').map((el) => el.value),
    goals: $$('[data-group="goal"]:checked').map((el) => el.value),
  };
}

/* ── 结果渲染 ───────────────────────────── */

const GROUPS = [
  { key: 'eligible', title: '符合条件', hint: '按你填的信息，这些路径的硬性门槛你都过了', cls: 'ok' },
  { key: 'close', title: '差一点', hint: '只差一两项，且都是能补上的（语言、经验、资金、offer）', cls: 'near' },
  { key: 'stretch', title: '需要长期准备', hint: '缺口较多，但方向上并没有被堵死', cls: 'far' },
  { key: 'blocked', title: '暂时走不通', hint: '存在短期无法改变的硬门槛（年龄、毕业年限、院校排名）', cls: 'no' },
];

let lastBucket = null;
let lastProfile = null;

function run() {
  lastProfile = readProfile();
  lastBucket = matchAll(lastProfile);
  render();
  $('#results').hidden = false;
  syncUrl(lastProfile);
}

/** 筛选与渲染分离：切换筛选器时不需要重新跑匹配。 */
function render() {
  const bucket = applyFilters(lastBucket);
  renderSummary(lastProfile, bucket);
  renderGroups(bucket);
  renderFilterNote(bucket);
}

function applyFilters(bucket) {
  if (!$('#onlyDeveloped').checked) return bucket;
  const out = {};
  for (const k of Object.keys(bucket)) {
    out[k] = bucket[k].filter((r) => DEVELOPED.has(r.pathway.country));
  }
  return out;
}

/**
 * 明确告诉用户筛掉了什么。
 * 隐式过滤掉一批国家而不作说明，会让人误以为那些路径不存在。
 */
function renderFilterNote(shown) {
  const note = $('#filterNote');
  if (!$('#onlyDeveloped').checked) { note.textContent = ''; return; }

  const all = Object.values(lastBucket).flat();
  const hidden = all.filter((r) => !DEVELOPED.has(r.pathway.country));
  if (!hidden.length) { note.textContent = ''; return; }

  const countries = [...new Set(hidden.map((r) => r.pathway.country))];
  note.textContent = `已隐藏 ${hidden.length} 条路径（${countries.join('、')}）`;
}

function renderSummary(profile, bucket) {
  const necks = bottlenecks(bucket);
  const n = (k) => bucket[k].length;

  const countries = new Set(bucket.eligible.map((r) => r.pathway.country));
  const prCount = bucket.eligible.filter((r) => /永居|绿卡|永久居民|^是$/.test(r.pathway.pr || '')).length;

  $('#summary').innerHTML = `
    <div class="stats">
      <div class="stat"><b>${n('eligible')}</b><span>条现在就能申</span></div>
      <div class="stat"><b>${countries.size}</b><span>个国家 / 地区</span></div>
      <div class="stat"><b>${prCount}</b><span>条通往永居</span></div>
      <div class="stat"><b>${n('close')}</b><span>条差一点</span></div>
    </div>
    ${necks.length ? `
      <div class="bottleneck">
        <h3>先补哪一项最划算</h3>
        <ol>${necks.map((b) => `<li>${b.text}<em>解锁 ${b.count} 条路径</em></li>`).join('')}</ol>
      </div>` : ''}
  `;
}

function renderGroups(bucket) {
  const total = Object.values(bucket).reduce((n, list) => n + list.length, 0);
  if (!total) {
    $('#groups').innerHTML = `<div class="panel empty">
      当前筛选条件下没有任何路径。取消「只看发达国家 / 地区」再看看。
    </div>`;
    return;
  }

  $('#groups').innerHTML = GROUPS.map((g) => {
    const list = bucket[g.key];
    if (!list.length) return '';
    return `
      <section class="group ${g.cls}">
        <header>
          <h2>${g.title} <span class="count">${list.length}</span></h2>
          <p>${g.hint}</p>
        </header>
        <div class="cards">${list.map(card).join('')}</div>
      </section>`;
  }).join('');
}

function card(r) {
  const p = r.pathway;
  const gaps = [...r.hardGaps, ...r.softGaps];
  return `
    <article class="card">
      <div class="card-top">
        <div class="title">
          <span class="flag">${p.flag}</span>
          <div>
            <h3>${p.name}</h3>
            <p class="sub">${p.country} · ${p.nameEn}</p>
          </div>
        </div>
        <div class="badges">
          <span class="badge type">${TYPE_LABEL[p.type]}</span>
          <span class="badge diff" title="办理难度">难度 ${'●'.repeat(p.difficulty)}${'○'.repeat(5 - p.difficulty)}</span>
        </div>
      </div>

      <dl class="facts">
        <div><dt>时长</dt><dd>${p.duration}</dd></div>
        <div><dt>永居路径</dt><dd>${p.pr}</dd></div>
        <div><dt>费用</dt><dd>${p.cost}</dd></div>
        <div><dt>名额</dt><dd>${p.quota}</dd></div>
      </dl>

      <p class="notes">${p.notes}</p>

      ${gaps.length ? `
        <div class="gaps">
          <b>你还差：</b>
          <ul>${gaps.map((g) => `<li class="${g.kind}">${g.text}</li>`).join('')}</ul>
        </div>` : '<div class="gaps none">✓ 所列门槛均已满足</div>'}

      <a class="official" href="${p.official}" target="_blank" rel="noopener noreferrer">查看官方页面 →</a>
    </article>`;
}

/* ── 分享链接：把表单编码进 URL ───────────── */

function syncUrl(p) {
  const q = new URLSearchParams({
    a: p.age, d: p.degree, u: p.uniRank, l: p.studyLoc, g: p.yearsSinceGrad ?? 'na',
    e: p.english, fr: p.french, w: p.workExp, f: p.funds, o: p.hasOffer ? 1 : 0,
    s: p.skills.join('.'), t: p.goals.join('.'),
    dev: $('#onlyDeveloped').checked ? 1 : 0,
  });
  history.replaceState(null, '', '?' + q.toString());
}

function loadFromUrl() {
  const q = new URLSearchParams(location.search);
  if (!q.has('a')) return false;
  const set = (id, key) => { if (q.has(key)) $('#' + id).value = q.get(key); };
  set('age', 'a'); set('degree', 'd'); set('uniRank', 'u'); set('studyLoc', 'l'); set('gradYears', 'g');
  set('english', 'e'); set('french', 'fr'); set('workExp', 'w'); set('funds', 'f');
  $('#hasOffer').checked = q.get('o') === '1';
  $('#onlyDeveloped').checked = q.get('dev') === '1';
  const check = (group, csv) => {
    const want = new Set((csv || '').split('.').filter(Boolean));
    $$(`[data-group="${group}"]`).forEach((el) => { el.checked = want.has(el.value); });
  };
  check('skill', q.get('s'));
  check('goal', q.get('t'));
  return true;
}

/* ── 启动 ───────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  buildForm();

  const problems = validatePathways();
  if (problems.length) console.warn('[数据校验]', problems);
  $('#total').textContent = PATHWAYS.length;

  $('#form').addEventListener('submit', (e) => {
    e.preventDefault();
    run();
    $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('#onlyDeveloped').addEventListener('change', () => {
    if (!lastBucket) return;
    render();
    syncUrl(lastProfile);
  });

  $('#copyLink').addEventListener('click', async () => {
    await navigator.clipboard.writeText(location.href);
    const btn = $('#copyLink');
    btn.textContent = '已复制';
    setTimeout(() => { btn.textContent = '复制结果链接'; }, 1500);
  });

  if (loadFromUrl()) run();
});
