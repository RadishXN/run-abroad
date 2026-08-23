/**
 * 香港工作签证专题页。
 *
 * 这一页自带判定逻辑，不走 engine.js 的 checkPathway()——
 * 主引擎是扁平 AND，表达不了「满足任一子方案即可」的分支结构，
 * 也没有港币年薪这个量纲。
 */

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const bold = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

const $1 = (s) => document.querySelector(s);

/* ── 问卷 ───────────────────────────── */

function renderForm() {
  $1('#quiz').innerHTML = HK_QUESTIONS.map((q) => `
    <fieldset class="hk-q">
      <legend>${esc(q.q)}${q.hint ? `<em>${esc(q.hint)}</em>` : ''}</legend>
      <div class="chips">
        ${q.opts.map((o) => `
          <label class="chip">
            <input type="radio" name="${q.id}" value="${o.v}">
            <span>${esc(o.t)}</span>
          </label>`).join('')}
      </div>
    </fieldset>`).join('');
}

function readAnswers() {
  const a = {};
  for (const q of HK_QUESTIONS) {
    const el = $1(`input[name="${q.id}"]:checked`);
    if (el) a[q.id] = el.value;
  }
  return a;
}

const answered = (a) => HK_QUESTIONS.filter((q) => a[q.id]).length;

/* ── 判定 ───────────────────────────── */

/** 学位是否在合资格大学名单内。香港院校多数在列，但需自行核对当年名单。 */
function onEligibleList(a) {
  if (a.degreeLoc === 'listed') return 'yes';
  if (a.degreeLoc === 'hk') return 'likely';
  return 'no';
}

function evalScheme(s, a) {
  const gaps = [];
  const notes = [];
  let status = 'eligible';

  const list = onEligibleList(a);
  const fullTime = a.fullTime === 'yes';

  if (s.group === 'ttps') {
    if (s.id === 'ttps-a') {
      // A 类只看收入，完全不看学历 —— 这是它和 B/C 最大的区别
      if (a.income === 'over250') {
        notes.push('A 类**不要求任何学历**，也不设名额限制，只看申请前 12 个月的应评税收入。');
      } else if (a.income === '200to250') {
        status = 'close';
        gaps.push('收入接近但未达 HK$250 万。注意口径是**申请前 12 个月滚动计算**，不是上一个课税年度——如果近期涨薪或有年终奖入账，重算一次可能就够了。');
      } else {
        status = 'blocked';
        gaps.push('A 类要求申请前 12 个月应评税收入达 HK$250 万，你目前的档位差距较大。');
      }
      if (a.income && a.income !== 'under100') {
        notes.push('租金、股票与理财投资收益通常**不计入**应评税收入；受雇薪俸、自雇或独资业务利润才算。');
      }
    } else {
      // B / C 类共用的学历前置条件
      if (list === 'no') {
        status = 'blocked';
        gaps.push('本科院校需在入境处发布的**合资格大学综合名单**内。该名单是四个世界排名榜单前 100 的合并结果，另含若干专门院校，按年度更新。');
      } else if (!fullTime && a.fullTime) {
        status = 'blocked';
        gaps.push('需要**全日制统招本科**。自考、函授、网络教育以及合作办学机构颁发的学位通常不获认可。');
      } else if (list === 'likely') {
        notes.push('香港多所院校在合资格名单内，但请核对**当年**名单。你同时符合 IANG，通常 IANG 更直接。');
      }

      if (status !== 'blocked') {
        if (s.id === 'ttps-b') {
          if (a.workExp === 'over3') {
            notes.push('B 类有**顶尖人才路径**：' + s.topTier + '。C 类没有这条路。');
          } else if (a.workExp) {
            status = 'blocked';
            gaps.push('B 类要求过去 5 年内累计满 3 年工作经验，你目前不足——但这正是 C 类的适用场景。');
          }
        } else if (s.id === 'ttps-c') {
          if (a.workExp === 'over3') {
            status = 'na';
            notes.push('你已满足 B 类条件。B 类**不占 C 类的配额**，也有顶尖人才路径，没有理由走 C 类。');
          } else if (a.workExp) {
            notes.push('⚠️ C 类设**年度配额、先到先得**，额满后即使完全符合条件也不会获批。配额通常在年初释放，越早递交越稳。');
          }
        }
      }
    }

    if (a.hadTtps === 'yes' && status !== 'blocked') {
      notes.push('你曾获批过高才通。入境处的表述是「首次逗留期只会获批一次」，坊间常解读为断签后终身不能再申请——但官网并非如此表述，**请直接向入境处确认你的情况**。');
    }
  }

  if (s.id === 'iang') {
    if (a.degreeLoc === 'hk' || a.degreeLoc === 'gba') {
      if (a.gradYears === 'within1' || a.gradYears === 'studying') {
        notes.push('应届可**无条件逗留 24 个月**，不需要先找到工作。');
      } else if (a.gradYears) {
        if (a.hasOffer === 'yes') {
          notes.push('非应届走 IANG 需要已获香港雇主聘用，你已满足。');
        } else {
          status = 'close';
          gaps.push('毕业已超过 1 年，非应届路径需要**先拿到香港雇主的聘用**。');
        }
      }
      notes.push('IANG **可以再次申请**，这是它和高才通最大的区别之一。');
    } else if (a.degreeLoc) {
      status = 'blocked';
      gaps.push('IANG 只面向香港院校毕业生，以及大湾区合作办学的毕业生。');
    }
  }

  if (s.id === 'asmtp') {
    if (a.hasOffer === 'yes') {
      notes.push('专才**绑定雇主**，转换工作须事先获入境处批准（顶尖人才只须通知）。这是它和高才通、IANG 的核心差别。');
      notes.push('雇主须证明本地招聘困难；若职位属人才清单短缺专业，或年薪（含房屋津贴等福利）达 HK$200 万，可获豁免。');
    } else if (a.hasOffer) {
      status = 'blocked';
      gaps.push('专才必须**先由香港雇主聘用并代为提交**，不能自己申请。');
    }
  }

  return { scheme: s, status, gaps, notes };
}

const RANK = { eligible: 0, close: 1, na: 2, blocked: 3 };

function evaluate(a) {
  return HK_SCHEMES
    .map((s) => evalScheme(s, a))
    .sort((x, y) => RANK[x.status] - RANK[y.status]);
}

/* ── 结果渲染 ───────────────────────── */

const STATUS_LABEL = {
  eligible: { t: '符合条件', cls: 'ok' },
  close: { t: '差一点', cls: 'near' },
  na: { t: '不必走这条', cls: 'no' },
  blocked: { t: '走不通', cls: 'no' },
};

function renderResults() {
  const a = readAnswers();
  const done = answered(a);
  const box = $1('#result');

  if (done < HK_QUESTIONS.length) {
    box.innerHTML = `<div class="panel empty">
      还有 ${HK_QUESTIONS.length - done} 题没答。全部答完后，这里会逐条列出你符合哪些方案、差在哪里。
    </div>`;
    return;
  }

  const results = evaluate(a);
  const okCount = results.filter((r) => r.status === 'eligible').length;

  box.innerHTML = `
    <div class="panel summary hk-summary">
      <div class="stats">
        <div class="stat"><b>${okCount}</b><span>条现在就能申</span></div>
        <div class="stat"><b>${results.filter((r) => r.status === 'close').length}</b><span>条差一点</span></div>
        <div class="stat"><b>${HK_SCHEMES.length}</b><span>条已比对</span></div>
      </div>
      ${okCount === 0 ? '<p class="notes hk-none">五条路目前都没走通。下面每条都写了具体差在哪里——多数缺口（工作经验、雇主聘用、收入）是能补的。</p>' : ''}
    </div>
    ${results.map(card).join('')}`;
}

function card(r) {
  const s = r.scheme;
  const st = STATUS_LABEL[r.status];
  return `
    <article class="panel hk-card ${st.cls}">
      <div class="hk-card-top">
        <div>
          <h3>${esc(s.name)}<span class="hk-tag">${esc(s.tag)}</span></h3>
          <p class="sub">${esc(s.nameEn)}</p>
        </div>
        <span class="hk-status ${st.cls}">${st.t}</span>
      </div>

      <dl class="facts">
        ${Object.entries(s.facts).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      </dl>

      ${r.gaps.length ? `<div class="gaps"><b>差在哪里</b><ul>${r.gaps.map((g) => `<li class="soft">${bold(g)}</li>`).join('')}</ul></div>` : ''}
      ${r.notes.length ? `<ul class="d-list hk-notes">${r.notes.map((n) => `<li>${bold(n)}</li>`).join('')}</ul>` : ''}

      <a class="official" href="${esc(s.official)}" target="_blank" rel="noopener noreferrer">官方页面 →</a>
      <span class="hk-verified">最后核对官网：${esc(s.verified)}</span>
    </article>`;
}

/* ── 对比表与不确定项 ───────────────── */

function renderTable() {
  const cols = ['首次逗留', '绑定雇主', '重复申请', '配额'];
  $1('#cmp').innerHTML = `
    <thead><tr><th>方案</th>${cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${HK_SCHEMES.map((s) => `
      <tr>
        <td><b>${esc(s.name)}</b><span class="sub2">${esc(s.tag)}</span></td>
        ${cols.map((c) => `<td class="sub2">${esc(s.facts[c])}</td>`).join('')}
      </tr>`).join('')}
    </tbody>`;
}

function renderUncertain() {
  $1('#uncertain').innerHTML = HK_UNCERTAIN
    .map((u) => `<li><b>${esc(u.t)}</b><br>${esc(u.d)}</li>`).join('');
}

/* ── URL 同步，方便分享 ─────────────── */

function syncUrl() {
  const a = readAnswers();
  const q = new URLSearchParams(a);
  history.replaceState(null, '', q.toString() ? '?' + q : location.pathname);
}

function loadFromUrl() {
  const q = new URLSearchParams(location.search);
  let any = false;
  for (const qu of HK_QUESTIONS) {
    const v = q.get(qu.id);
    if (!v) continue;
    const el = $1(`input[name="${qu.id}"][value="${CSS.escape(v)}"]`);
    if (el) { el.checked = true; any = true; }
  }
  return any;
}

/* ── 启动 ───────────────────────────── */

const problems = validateHkSchemes();
if (problems.length) console.warn('[香港数据校验]', problems);

renderForm();
renderTable();
renderUncertain();
$1('#schemeCount').textContent = HK_SCHEMES.length;

$1('#quiz').addEventListener('change', () => { renderResults(); syncUrl(); });
loadFromUrl();
renderResults();
