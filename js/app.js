/** 表单 → 匹配 → 渲染。纯前端，无任何后端请求。 */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* ── 表单选项 ───────────────────────────── */

function orderIncomeSourceLocations(locations) {
  const first = ['中国大陆', '中国香港'];
  const last = '其他国家 / 地区';
  const fallbackCompare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  let compare = fallbackCompare;
  try {
    const pinyin = new Intl.Collator('zh-CN-u-co-pinyin');
    compare = (a, b) => pinyin.compare(a, b) || fallbackCompare(a, b);
  } catch (_) {
    // 极少数精简运行环境没有拼音排序数据，退回稳定的 Unicode 顺序。
  }
  const middle = locations
    .filter((location) => !first.includes(location) && location !== last)
    .sort(compare);
  return [...first.filter((location) => locations.includes(location)), ...middle,
    ...(locations.includes(last) ? [last] : [])];
}

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
  incomeType: [
    { v: 'none', t: '无稳定持续收入' },
    { v: 'employee', t: '受雇工资' },
    { v: 'selfEmployed', t: '自由职业 / 自营或经营收入' },
    { v: 'passive', t: '被动收入' },
    { v: 'mixed', t: '多种收入' },
  ],
  remoteAbroad: [
    { v: 'no', t: '不能' },
    { v: 'uncertain', t: '不确定' },
    { v: 'yes', t: '可以' },
  ],
  monthlyIncome: MONTHLY_INCOME_BANDS,
  primaryIncomeCountry: orderIncomeSourceLocations(INCOME_SOURCE_LOCATIONS)
    .map((v) => ({ v, t: v })),
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
  fill('incomeType', OPTIONS.incomeType);
  fill('remoteAbroad', OPTIONS.remoteAbroad);
  fill('activeIncome', OPTIONS.monthlyIncome);
  fill('passiveIncome', OPTIONS.monthlyIncome);
  fill('primaryIncomeCountry', OPTIONS.primaryIncomeCountry);

  $('#langs').innerHTML = Object.entries(LANGS)
    .map(([k, v]) => chip('lang', k, v)).join('');
  $('#skills').innerHTML = Object.entries(SKILLS)
    .map(([k, v]) => chip('skill', k, v)).join('');
  $('#goals').innerHTML = Object.entries(GOALS)
    .map(([k, v]) => chip('goal', k, v)).join('');

  $$('select').forEach(enhanceSelect);

  // 筛选区：地区多选 + 排除条件多选。不选地区 = 不限地区。
  $('#regions').innerHTML = Object.entries(REGION_LABEL)
    .map(([k, v]) => chip('region', k, v)).join('');
  $('#excludes').innerHTML = Object.entries(EXCLUDES)
    .map(([k, v]) => chip('exclude', k, v.label, v.hint)).join('');

  updateIncomeFields();
}

/* ── 自绘下拉框 ─────────────────────────────
   原生 <select> 展开后的弹层由操作系统绘制，CSS 管不到，
   在 Windows 上和页面风格差异很大。这里用一个自绘列表接管交互，
   但把原生 select 保留在 DOM 里（透明覆盖在原位）——
   这样表单校验、URL 同步、读屏器都仍然基于它工作。
   ------------------------------------------------ */

let openSel = null;

function enhanceSelect(sel) {
  if (sel.dataset.enhanced) return;
  sel.dataset.enhanced = '1';

  const wrap = document.createElement('div');
  wrap.className = 'sel';
  sel.parentNode.insertBefore(wrap, sel);
  wrap.appendChild(sel);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sel-btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');

  const list = document.createElement('div');
  list.className = 'sel-list';
  list.setAttribute('role', 'listbox');
  list.hidden = true;

  [...sel.options].forEach((o) => {
    if (o.value === '') return;               // 占位项不进列表
    const item = document.createElement('div');
    item.className = 'sel-opt';
    item.setAttribute('role', 'option');
    item.dataset.value = o.value;
    item.textContent = o.textContent;
    list.appendChild(item);
  });

  wrap.append(btn, list);

  const opts = () => [...list.children];
  const close = () => {
    list.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (openSel === wrap) openSel = null;
  };
  const open = () => {
    if (openSel && openSel !== wrap) openSel.querySelector('.sel-list').hidden = true;
    openSel = wrap;
    list.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    const cur = opts().find((o) => o.dataset.value === sel.value) || opts()[0];
    cur?.scrollIntoView({ block: 'nearest' });
    setActive(opts().indexOf(cur));
  };

  let active = -1;
  const setActive = (i) => {
    active = Math.max(0, Math.min(opts().length - 1, i));
    opts().forEach((o, n) => o.classList.toggle('is-active', n === active));
    opts()[active]?.scrollIntoView({ block: 'nearest' });
  };

  const pick = (item) => {
    sel.value = item.dataset.value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    syncSelectUI(sel);
    close();
    btn.focus();
  };

  btn.addEventListener('click', () => (list.hidden ? open() : close()));

  btn.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); open(); }
  });

  list.addEventListener('click', (e) => {
    const item = e.target.closest('.sel-opt');
    if (item) pick(item);
  });

  wrap.addEventListener('keydown', (e) => {
    if (list.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); btn.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(opts().length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(opts()[active]); }
    else if (e.key === 'Tab') close();
  });

  // 原生校验失败时，把焦点引到自绘按钮上，提示才落在正确的位置
  sel.addEventListener('invalid', () => { wrap.classList.add('is-invalid'); });
  sel.addEventListener('change', () => wrap.classList.remove('is-invalid'));

  syncSelectUI(sel);
}

/** 把原生 select 的当前值反映到自绘 UI 上（URL 回填时也要调用）。 */
function syncSelectUI(sel) {
  const wrap = sel.closest('.sel');
  if (!wrap) return;
  const btn = wrap.querySelector('.sel-btn');
  const chosen = sel.options[sel.selectedIndex];
  const isPlaceholder = !sel.value;
  btn.textContent = chosen ? chosen.textContent : '请选择';
  btn.classList.toggle('is-placeholder', isPlaceholder);
  wrap.querySelectorAll('.sel-opt').forEach((o) => {
    o.setAttribute('aria-selected', String(o.dataset.value === sel.value));
    o.classList.toggle('is-chosen', o.dataset.value === sel.value);
  });
}

document.addEventListener('click', (e) => {
  if (openSel && !openSel.contains(e.target)) {
    openSel.querySelector('.sel-list').hidden = true;
    openSel.querySelector('.sel-btn').setAttribute('aria-expanded', 'false');
    openSel = null;
  }
});

function chip(group, value, label, hint) {
  return `<label class="chip"${hint ? ` title="${hint}"` : ''}>
    <input type="checkbox" data-group="${group}" value="${value}">
    <span>${label}</span>
  </label>`;
}

function normalizeSkillSelection(changed) {
  const skills = $$('[data-group="skill"]');
  const none = skills.find((el) => el.value === 'none');
  if (!none) return;

  if (changed?.checked && changed.value === 'none') {
    skills.forEach((el) => { if (el !== none) el.checked = false; });
  } else if ((changed?.checked && changed.value !== 'none') ||
    (none.checked && skills.some((el) => el.value !== 'none' && el.checked))) {
    none.checked = false;
  }
}

const FORM_ACTIVE_INCOME_TYPES = new Set(['employee', 'selfEmployed', 'mixed']);

function setIncomeField(id, visible) {
  const el = $('#' + id);
  const field = $('#' + id + 'Field');
  field.hidden = !visible;
  el.disabled = !visible;
  el.required = visible;
  if (!visible) el.value = '';
  syncSelectUI(el);
}

/** 收入问题只在与当前收入类型相关时展开。 */
function updateIncomeFields() {
  const incomeType = $('#incomeType').value;
  const hasActive = FORM_ACTIVE_INCOME_TYPES.has(incomeType);
  const hasPassive = ['passive', 'mixed'].includes(incomeType);
  const canRemote = hasActive && $('#remoteAbroad').value === 'yes';

  setIncomeField('remoteAbroad', hasActive);
  setIncomeField('activeIncome', canRemote);
  setIncomeField('primaryIncomeCountry', canRemote);
  setIncomeField('passiveIncome', hasPassive);
}

function numberOrNull(el) {
  return el.disabled || el.value === '' ? null : +el.value;
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
    incomeType: $('#incomeType').value || null,
    remoteAbroad: $('#remoteAbroad').disabled ? null : ($('#remoteAbroad').value || null),
    activeIncome: numberOrNull($('#activeIncome')),
    passiveIncome: numberOrNull($('#passiveIncome')),
    primaryIncomeCountry: $('#primaryIncomeCountry').disabled
      ? null
      : ($('#primaryIncomeCountry').value || null),
    hasOffer: $('#hasOffer').checked,
    langs: $$('[data-group="lang"]:checked').map((el) => el.value),
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
  syncUrl(lastProfile);
  render();
  $('#results').hidden = false;
}

/** 筛选与渲染分离：切换筛选器时不需要重新跑匹配。 */
function render() {
  const bucket = applyFilters(lastBucket);
  renderSummary(lastProfile, bucket);
  renderGroups(bucket);
  renderFilterNote(bucket);
}

/** 当前生效的筛选条件。三者是「与」的关系。 */
function activeFilters() {
  return {
    developed: $('#onlyDeveloped').checked,
    regions: new Set($$('[data-group="region"]:checked').map((el) => el.value)),
    excludes: $$('[data-group="exclude"]:checked').map((el) => el.value),
  };
}

/** 一条路径是否应当被保留。部分排除条件要看用户档案才能判准。 */
function keeps(p, f, profile) {
  if (f.developed && !DEVELOPED.has(p.country)) return false;
  if (f.regions.size && !f.regions.has(REGION_OF[p.country])) return false;
  for (const key of f.excludes) {
    if (EXCLUDES[key]?.test(p, profile)) return false;
  }
  return true;
}

function applyFilters(bucket) {
  const f = activeFilters();
  if (!f.developed && !f.regions.size && !f.excludes.length) return bucket;
  const out = {};
  for (const k of Object.keys(bucket)) {
    out[k] = bucket[k].filter((r) => keeps(r.pathway, f, lastProfile));
  }
  return out;
}

/**
 * 明确告诉用户筛掉了什么。
 * 隐式过滤掉一批国家而不作说明，会让人误以为那些路径不存在。
 */
function renderFilterNote() {
  const note = $('#filterNote');
  const f = activeFilters();
  const all = Object.values(lastBucket).flat();
  const hidden = all.filter((r) => !keeps(r.pathway, f, lastProfile));

  if (!hidden.length) { note.textContent = ''; return; }

  // 逐条说明是被哪个条件筛掉的，而不是只给一个总数
  const reasons = [];
  if (f.developed) {
    const n = all.filter((r) => !DEVELOPED.has(r.pathway.country)).length;
    if (n) reasons.push(`非发达地区 ${n} 条`);
  }
  if (f.regions.size) {
    const n = all.filter((r) => !f.regions.has(REGION_OF[r.pathway.country])).length;
    if (n) reasons.push(`地区不符 ${n} 条`);
  }
  for (const key of f.excludes) {
    const n = all.filter((r) => EXCLUDES[key].test(r.pathway, lastProfile)).length;
    if (n) reasons.push(`${EXCLUDES[key].label} ${n} 条`);
  }
  note.textContent = `已隐藏 ${hidden.length} 条：${reasons.join(' · ')}`;
}

function renderSummary(profile, bucket) {
  const necks = bottlenecks(bucket);
  const n = (k) => bucket[k].length;

  const countries = new Set(bucket.eligible.map((r) => r.pathway.country));
  const prCount = bucket.eligible.filter((r) => leadsToPR(r.pathway)).length;

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
        <div class="cards">${list.map((r, i) => card(r, i)).join('')}</div>
      </section>`;
  }).join('');
}

/**
 * 数据里的 notes 用 **…** 标注重点，需要转成 <strong>。
 * 先转义再替换，保证即便以后数据来自外部贡献也不会注入 HTML。
 */
function fmt(s) {
  return String(s ?? '')
    .replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function detailHref(id) {
  const q = new URLSearchParams({ id });
  const returnState = location.search.slice(1);
  if (returnState) q.set('return', returnState);
  return `pathway.html?${q.toString()}`;
}

/* ── 国旗降级 ─────────────────────────────
   Windows 没有内置旗帜字体，🇯🇵 这类「区域指示符对」会退化成两个
   字母，排版很难看。这里画一个已知有彩色的旗帜到 canvas 上，
   若像素全是灰阶就说明系统不支持，改用设计过的国家代码块。
   ------------------------------------------------ */

const FLAG_OK = (() => {
  try {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 24;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.font = '20px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('\u{1F1E8}\u{1F1F3}', 0, 0);      // 🇨🇳，红色面积大，便于判定
    const d = ctx.getImageData(0, 0, 24, 24).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 0 && (Math.abs(d[i] - d[i + 1]) > 32 || Math.abs(d[i + 1] - d[i + 2]) > 32)) {
        return true;                                // 有彩色像素 = 真的画出了旗帜
      }
    }
    return false;
  } catch {
    return false;
  }
})();

/** 由区域指示符反推 ISO 双字母代码：🇯🇵 → JP */
function flagCode(flag) {
  const cp = [...String(flag)].map((ch) => ch.codePointAt(0));
  return cp.length === 2 && cp.every((x) => x >= 0x1F1E6 && x <= 0x1F1FF)
    ? cp.map((x) => String.fromCharCode(x - 0x1F1E6 + 65)).join('')
    : '';
}

function flagHtml(p) {
  const code = flagCode(p.flag);
  if (FLAG_OK || !code) return `<span class="flag">${p.flag}</span>`;
  return `<span class="flag flag-code" title="${p.country}">${code}</span>`;
}

function card(r, i = 0) {
  const p = r.pathway;
  const gaps = [...r.hardGaps, ...r.softGaps];
  // --i 驱动 CSS 里的入场动画延迟；只对前若干张有意义，避免长列表末尾等太久
  return `
    <article class="card" style="--i:${Math.min(i, 12)}">
      <div class="card-top">
        <div class="title">
          ${flagHtml(p)}
          <div>
            <h3>${p.name}</h3>
            <p class="sub">${p.country} · ${p.nameEn}</p>
          </div>
        </div>
        <div class="badges">
          ${r.skillMatch ? '<span class="badge match">✓ 你的职业方向在清单上</span>' : ''}
          <span class="badge type">${TYPE_LABEL[p.type]}</span>
          <span class="badge diff" title="办理难度">难度 ${'●'.repeat(p.difficulty)}${'○'.repeat(5 - p.difficulty)}</span>
        </div>
      </div>

      <dl class="facts">
        <div><dt>时长</dt><dd>${fmt(p.duration)}</dd></div>
        <div><dt>永居路径</dt><dd>${fmt(p.pr)}</dd></div>
        <div><dt>费用</dt><dd>${fmt(p.cost)}</dd></div>
        <div><dt>名额</dt><dd>${fmt(p.quota)}</dd></div>
      </dl>

      <p class="notes">${fmt(p.notes)}</p>

      ${gaps.length ? `
        <div class="gaps">
          <b>你还差：</b>
          <ul>${gaps.map((g) => `<li class="${g.kind}">${fmt(g.text)}</li>`).join('')}</ul>
        </div>` : '<div class="gaps none">✓ 所列门槛均已满足</div>'}

      <div class="card-links">
        <a class="official" href="${fmt(detailHref(p.id))}">查看详细条件与流程 →</a>
        <a class="official secondary" href="${p.official}" target="_blank" rel="noopener noreferrer">官网</a>
      </div>
    </article>`;
}

/* ── 分享链接：把表单编码进 URL ───────────── */

function syncUrl(p) {
  const q = new URLSearchParams({
    a: p.age, d: p.degree, u: p.uniRank, l: p.studyLoc, g: p.yearsSinceGrad ?? 'na',
    e: p.english, fr: p.french, w: p.workExp, f: p.funds, o: p.hasOffer ? 1 : 0,
    s: p.skills.join('.'), t: p.goals.join('.'), lg: p.langs.join('.'),
    dev: $('#onlyDeveloped').checked ? 1 : 0,
    rg: $$('[data-group="region"]:checked').map((el) => el.value).join('.'),
    ex: $$('[data-group="exclude"]:checked').map((el) => el.value).join('.'),
  });
  if (p.incomeType) q.set('it', p.incomeType);
  if (p.remoteAbroad) q.set('ra', p.remoteAbroad);
  if (p.activeIncome != null) q.set('ai', p.activeIncome);
  if (p.passiveIncome != null) q.set('pi', p.passiveIncome);
  if (p.primaryIncomeCountry) q.set('ic', p.primaryIncomeCountry);
  history.replaceState(null, '', '?' + q.toString());
}

function loadFromUrl() {
  const q = new URLSearchParams(location.search);
  if (!q.has('a')) return false;
  const set = (id, key) => { if (q.has(key)) $('#' + id).value = q.get(key); };
  set('age', 'a'); set('degree', 'd'); set('uniRank', 'u'); set('studyLoc', 'l'); set('gradYears', 'g');
  set('english', 'e'); set('french', 'fr'); set('workExp', 'w'); set('funds', 'f');
  set('incomeType', 'it'); set('remoteAbroad', 'ra'); set('activeIncome', 'ai');
  set('passiveIncome', 'pi'); set('primaryIncomeCountry', 'ic');
  updateIncomeFields();
  $('#hasOffer').checked = q.get('o') === '1';
  $('#onlyDeveloped').checked = q.get('dev') === '1';
  const check = (group, csv) => {
    const want = new Set((csv || '').split('.').filter(Boolean));
    $$(`[data-group="${group}"]`).forEach((el) => { el.checked = want.has(el.value); });
  };
  check('skill', q.get('s'));
  normalizeSkillSelection();
  check('goal', q.get('t'));
  check('lang', q.get('lg'));
  check('region', q.get('rg'));
  check('exclude', q.get('ex'));
  $$('select').forEach(syncSelectUI);   // 回填后让自绘按钮显示正确的选项
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

  // 筛选条件变化只需重渲染，不必重跑匹配
  document.addEventListener('change', (e) => {
    if (e.target.id === 'incomeType' || e.target.id === 'remoteAbroad') updateIncomeFields();
    if (e.target.dataset?.group === 'skill') normalizeSkillSelection(e.target);
    if (!lastBucket) return;
    const g = e.target.dataset?.group;
    if (e.target.id === 'onlyDeveloped' || g === 'region' || g === 'exclude') {
      syncUrl(lastProfile);
      render();
    }
  });

  $('#copyLink').addEventListener('click', async () => {
    await navigator.clipboard.writeText(location.href);
    const btn = $('#copyLink');
    btn.textContent = '已复制';
    setTimeout(() => { btn.textContent = '复制结果链接'; }, 1500);
  });

  if (loadFromUrl()) run();
});
