/** 数字游民专页：表格从 PATHWAYS 渲染，数据一更新页面自动同步。 */

const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const bold = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

const NOMADS = PATHWAYS.filter((p) => p.type === 'nomad');

/** 把收入门槛写成一句人话，并区分「持续收入」和「账户存款」。 */
function incomeCell(p) {
  const i = p.req?.income;
  if (i) {
    const amount = `$${i.minMonthlyUSD.toLocaleString()}<span class="unit">/月</span>`;
    const kind = { remote: '远程工作收入', passive: '被动收入', either: '远程或被动收入' }[i.mode];
    const src = i.foreignSource ? '<em class="flag-note">需来自境外</em>' : '';
    return `<b>${amount}</b><span class="sub2">${kind}${src ? ' · ' : ''}${src}</span>`;
  }
  if (p.req?.fundsUSD) {
    return `<b>$${p.req.fundsUSD.toLocaleString()}</b><span class="sub2">账户存款，非月收入</span>`;
  }
  return '<span class="sub2">无明确门槛</span>';
}

function prCell(p) {
  const yes = leadsToPR(p);
  return `<span class="pr-tag ${yes ? 'yes' : 'no'}">${yes ? '可以' : '不通往'}</span>`;
}

function renderTable() {
  const rows = [...NOMADS].sort((a, b) => {
    const av = a.req?.income?.minMonthlyUSD ?? Infinity;
    const bv = b.req?.income?.minMonthlyUSD ?? Infinity;
    return av - bv;                       // 门槛从低到高，先看够得着的
  });

  document.querySelector('#cmp').innerHTML = `
    <thead><tr>
      <th>国家 / 签证</th><th>收入门槛</th><th>时长</th><th>通往永居</th><th>难度</th>
    </tr></thead>
    <tbody>${rows.map((p) => `
      <tr>
        <td>
          <span class="c-flag">${p.flag}</span>
          <a href="pathway.html?id=${p.id}">${esc(p.name)}</a>
          <span class="sub2">${esc(p.country)}</span>
        </td>
        <td>${incomeCell(p)}</td>
        <td class="sub2">${esc(p.duration)}</td>
        <td>${prCell(p)}</td>
        <td class="sub2 diff">${'●'.repeat(p.difficulty)}${'○'.repeat(5 - p.difficulty)}</td>
      </tr>`).join('')}
    </tbody>`;
}

/** 误区文案里的数字直接从数据算，避免文案和数据对不上。 */
function renderMyths() {
  const deposit = NOMADS.filter((p) => !p.req?.income && p.req?.fundsUSD);
  const noPr = NOMADS.filter((p) => !leadsToPR(p));
  const foreign = NOMADS.filter((p) => p.req?.income?.foreignSource);
  // 这里要的是「要求境外来源」这批里的最低门槛，不是全部路径的最低 ——
  // 否则会拿一条并不要求境外来源的路径（如葡萄牙 D7）来举例，说反了。
  const lowestForeign = [...foreign]
    .sort((a, b) => a.req.income.minMonthlyUSD - b.req.income.minMonthlyUSD)[0];

  const myths = [
    `**「我有存款就够了」** —— ${NOMADS.length} 条里有 ${NOMADS.length - deposit.length} 条看的是**每月持续收入**，` +
    `只有 ${deposit.map((p) => p.country).join('、')} 这 ${deposit.length} 条认账户余额。存款再多，也补不上「没有持续收入」这一项。`,

    `**「住几年就能拿身份」** —— ${noPr.length} 条不通往永居，居留年限也不累积入籍。` +
    `它给的是合法长住，不是身份路径。若目标是护照，得看 ${NOMADS.length - noPr.length} 条通往永居的，或干脆换留学 / 工签路线。`,

    `**「收入够了就行」** —— 有 ${foreign.length} 条额外要求收入**来自居住国以外**。` +
    `你到了当地再去接本地公司的活，反而可能不符合。这批里门槛最低的是${lowestForeign.country}的 ` +
    `$${lowestForeign.req.income.minMonthlyUSD.toLocaleString()}/月，同样受这条限制。`,
  ];

  document.querySelector('#myths').innerHTML = myths.map((m) => `<li>${bold(m)}</li>`).join('');
}

document.querySelector('#nomadCount').textContent = NOMADS.length;
renderTable();
renderMyths();
