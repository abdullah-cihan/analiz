// --- ADVANCED STATISTICS TAB (UI) ---
// Akış: 1) Normallik  →  2) Varsayım kontrolü ve test önerisi  →  3) Önerilen testin sonuçları  →  4) İlişki analizleri
// Hesaplamalar stats-tests.js içindeki AdvStats motorundadır; bu dosya yalnızca görünümü üretir.

const advState = {
    groupKey: 'none',
    groupTouched: false,   // kullanıcı bu sekmede grup seçmediyse kenar çubuğundaki "Karşılaştırma Grubu" izlenir
    chartVar: 'scale',
    chartScope: 'all',
    corrMethod: 'auto',
    chiA: 'none',
    chiB: 'none',
    open: {}               // akordiyon açık/kapalı durumları (yeniden çizimde korunur)
};

let advCharts = {};
let advCtx = null;
let advLastApa = '';

const ADV_PARAMETRIC_KEYS = ['welch', 'anova', 'welchanova'];
const ADV_TONES = {
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
};

// ------------------------------------------------------------------ small helpers
function advEsc(s) {
    return String(s === null || s === undefined ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function advIsDark() {
    return typeof isDarkTheme === 'function' ? isDarkTheme() : document.documentElement.classList.contains('dark');
}

function advBadge(text, tone) {
    return `<span class="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${ADV_TONES[tone] || ADV_TONES.slate}">${text}</span>`;
}

function advNum(v, d) {
    return (v === null || v === undefined || typeof v !== 'number' || isNaN(v)) ? '–' : v.toFixed(d === undefined ? 2 : d);
}

function advP(p) {
    if (p === null || p === undefined || isNaN(p)) return '–';
    return p < 0.001 ? '< 0.001' : p.toFixed(3);
}

function advTable(headers, rows) {
    return `<div class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table class="w-full text-xs text-left">
            <thead class="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                <tr>${headers.map(h => `<th class="px-3 py-2 font-semibold whitespace-nowrap">${h}</th>`).join('')}</tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-200">${rows.join('')}</tbody>
        </table></div>`;
}

function advRow(cells, attrs) {
    return `<tr ${attrs || ''}>${cells.map(c => `<td class="px-3 py-2 whitespace-nowrap">${c}</td>`).join('')}</tr>`;
}

// ------------------------------------------------------------------ accordion helpers
const ADV_STEP_IDS = ['adv-step-normality', 'adv-step-recommend', 'adv-step-compare', 'adv-step-relations'];
const ADV_STEP_NAMES = { 1: 'Normallik', 2: 'Test önerisi', 3: 'Sonuçlar', 4: 'İlişkiler' };
const ADV_DOT = { green: 'bg-emerald-500', red: 'bg-red-500', amber: 'bg-amber-500', indigo: 'bg-indigo-500', slate: 'bg-slate-400' };
let advSectionReg = { top: [], sub: [] };
let advStepStatus = {};
let advSummary = {};

function advIsOpen(id, def) {
    return Object.prototype.hasOwnProperty.call(advState.open, id) ? !!advState.open[id] : !!def;
}

// Ana adım (1-4): numara + başlık + tek satırlık sonuç özeti; gövde açılıp kapanır.
function advSection(o) {
    advSectionReg.top.push(o.id);
    if (o.status) advStepStatus[o.no] = o.status;
    const open = advIsOpen(o.id, o.open);
    const st = o.status
        ? `<span class="mt-2 flex flex-wrap items-center gap-2">${advBadge(o.status.label, o.status.tone)}<span class="text-xs font-medium text-slate-600 dark:text-slate-300">${o.status.text}</span></span>`
        : '';
    const next = o.nextNo
        ? `<div class="mt-5 flex justify-end"><button type="button" onclick="advNextStep(${o.no})" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition">Sonraki adım: ${o.nextTitle} <i class="fa-solid fa-arrow-right"></i></button></div>`
        : '';
    return `<h3 class="m-0">
        <button type="button" id="adv-hd-${o.id}" onclick="advToggle('${o.id}')" aria-expanded="${open}" aria-controls="adv-bd-${o.id}" class="w-full flex items-start gap-3 text-left">
            <span class="w-8 h-8 shrink-0 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">${o.no}</span>
            <span class="flex-1 min-w-0 block">
                <span class="block text-lg font-bold text-slate-800 dark:text-white">${o.title}</span>
                <span class="block text-xs font-normal text-slate-500 dark:text-slate-400">${o.subtitle}</span>
                ${st}
            </span>
            <span class="shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center"><i class="fa-solid fa-chevron-down adv-chev text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}"></i></span>
        </button>
    </h3>
    <div id="adv-bd-${o.id}" class="${open ? '' : 'hidden'} mt-5 pt-5 border-t border-slate-100 dark:border-slate-700">${o.body}${next}</div>`;
}

// Alt bölüm (ayrıntılar): advSubOpen ... içerik ... advSubClose
function advSubOpen(id, title, hint, open, chip) {
    advSectionReg.sub.push(id);
    const isOpen = advIsOpen(id, open);
    return `<div class="rounded-xl border border-slate-200 dark:border-slate-700 mb-3">
        <button type="button" id="adv-hd-${id}" onclick="advToggle('${id}')" aria-expanded="${isOpen}" aria-controls="adv-bd-${id}" class="w-full flex items-center gap-2 px-4 py-3 text-left rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
            <i class="fa-solid fa-chevron-down adv-chev text-[11px] text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}"></i>
            <span class="text-sm font-bold text-slate-700 dark:text-slate-200 shrink-0">${title}</span>
            ${hint ? `<span class="text-xs text-slate-500 dark:text-slate-400 truncate min-w-0 flex-1">· ${hint}</span>` : '<span class="flex-1"></span>'}
            <span id="adv-chip-${id}" class="shrink-0">${chip ? advBadge(chip.text, chip.tone) : ''}</span>
        </button>
        <div id="adv-bd-${id}" class="${isOpen ? '' : 'hidden'} px-4 pb-4">`;
}

function advSubClose() { return '</div></div>'; }

function advSub(id, title, hint, body, open, chip) {
    return advSubOpen(id, title, hint, open, chip) + body + advSubClose();
}

// Başlık çipini sonradan güncelle (hesaplama gövde çizildikten sonra bitiyorsa)
function advSetChip(id, tone, text) {
    const el = document.getElementById('adv-chip-' + id);
    if (el) el.innerHTML = advBadge(text, tone);
}

// ------------------------------------------------------------------ sade açıklamalar (ipucu)
const ADV_GLOSS = {
    shapiro: "Shapiro-Wilk: Verinin normal (çan) eğrisine ne kadar uyduğunu ölçer. p > 0.05 ise veri normal kabul edilir. Küçük örneklemlerde güvenilirdir.",
    skew: "Çarpıklık: Dağılımın bir tarafa yatma derecesi. Sıfıra yakınsa simetriktir. Parantez içindeki z değeri ±3.29 dışına çıkarsa belirgin çarpıktır.",
    kurt: "Basıklık: Dağılımın uçlarının ne kadar ağır veya hafif olduğu. Sıfıra yakınsa normal eğriye benzer.",
    decision: "Karar: Normal ise ortalama temelli (parametrik) testler, değilse sıra/medyan temelli (parametrik olmayan) testler kullanılır.",
    p: "p değeri: Gruplar gerçekte aynı olsaydı, gözlenen farkın (veya daha büyüğünün) rastlantıyla ortaya çıkma olasılığı. 0.05 altındaysa fark anlamlı sayılır.",
    levene: "Levene (Brown-Forsythe): Grupların yayılımının (varyansın) benzer olup olmadığını test eder. p > 0.05 ise varyanslar eşit kabul edilir.",
    effect: "Etki büyüklüğü: Farkın anlamlı olup olmadığını değil, ne kadar büyük olduğunu gösterir. Büyük örneklemde küçük farklar bile anlamlı çıkabilir; bu değer pratik önemi gösterir.",
    holm: "Holm düzeltmesi: Çok sayıda madde aynı anda test edilince şans eseri anlamlı sonuç çıkma riski artar. Bu düzeltme p değerini buna göre büyütür.",
    posthoc: "Post-hoc: Genel test gruplar arasında fark var dedikten sonra, hangi iki grubun birbirinden farklı olduğunu bulmak için yapılan ikili karşılaştırmalardır.",
    ci: "%95 güven aralığı: Gerçek ortalamanın %95 olasılıkla içinde bulunacağı aralık. Aralıklar çakışmıyorsa fark belirgindir.",
    df: "Serbestlik derecesi (sd): İstatistiğin hesabında bağımsız değişebilen bilgi sayısı; örneklem ve grup sayısına bağlıdır.",
    corr: "Korelasyon: İki madde arasındaki birlikte değişim. +1 tam aynı yönde, -1 tam ters yönde, 0 ilişki yok demektir. Nedensellik göstermez.",
    spearman: "Spearman (rho): Değerlerin sıralarına bakar; Likert gibi sıralı veya normal olmayan veriler için uygundur. Pearson ise normal ve aralık ölçekli veride kullanılır.",
    cramer: "Cramér V: Ki-kare testinde iki değişken arasındaki ilişkinin gücü (0 = yok, 1 = tam)."
};

function advHelp(key) {
    return `<i class="fa-regular fa-circle-question text-slate-400 hover:text-indigo-500 cursor-help ml-1" tabindex="0" role="note" data-adv-tip="${advEsc(ADV_GLOSS[key] || key)}"></i>`;
}

// Etiket + ? ipucu
function advT(label, key) {
    return `<span class="inline-flex items-center">${label}${advHelp(key)}</span>`;
}

// p değerini düz Türkçe ile yorumla
function advPlainP(p) {
    if (p === null || p === undefined || isNaN(p)) return '';
    const pct = p < 0.001 ? "%0,1'den küçük" : '%' + (p * 100).toFixed(1).replace('.', ',');
    return p < 0.05
        ? `Gruplar gerçekte aynı olsaydı, bu kadar büyük bir farkın rastlantıyla görülme olasılığı ${pct}; bu, %5 eşiğinin altında olduğu için fark <b>anlamlı</b>dır.`
        : `Gruplar gerçekte aynı olsaydı, bu kadar büyük bir farkın rastlantıyla görülme olasılığı ${pct}; bu, %5 eşiğinin üzerinde olduğu için <b>anlamlı bir fark kanıtlanamamıştır</b>.`;
}

// Tek bir yüzen ipucu kutusu (tabloların overflow davranışından etkilenmez)
(function advInitTips() {
    if (window.__advTipsReady) return;
    window.__advTipsReady = true;
    let tip = null, current = null;
    const ensure = () => {
        if (tip) return tip;
        tip = document.createElement('div');
        tip.id = 'adv-tooltip';
        tip.setAttribute('role', 'tooltip');
        tip.className = 'fixed z-[9999] hidden max-w-xs rounded-lg bg-slate-800 dark:bg-slate-600 text-white text-xs leading-relaxed px-3 py-2 shadow-xl pointer-events-none';
        document.body.appendChild(tip);
        return tip;
    };
    const hide = () => { if (tip) tip.classList.add('hidden'); current = null; };
    const show = el => {
        const t = ensure();
        t.textContent = el.getAttribute('data-adv-tip');
        t.classList.remove('hidden');
        const r = el.getBoundingClientRect();
        const w = t.offsetWidth, h = t.offsetHeight;
        const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
        let top = r.bottom + 8;
        if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
        t.style.left = left + 'px';
        t.style.top = top + 'px';
        current = el;
    };
    const find = e => (e.target && e.target.closest) ? e.target.closest('[data-adv-tip]') : null;
    document.addEventListener('mouseover', e => { const el = find(e); if (el) show(el); else if (current) hide(); });
    document.addEventListener('focusin', e => { const el = find(e); if (el) show(el); else hide(); });
    document.addEventListener('focusout', hide);
    document.addEventListener('click', e => { const el = find(e); if (el) { if (current === el) hide(); else show(el); } else hide(); });
    window.addEventListener('scroll', hide, true);
})();

function advNoGroupStep(meta, bodyHtml) {
    return advSection(Object.assign({}, meta, {
        status: { tone: 'slate', label: 'Grup seçilmedi', text: 'Bu adım için bir karşılaştırma grubu seçin.' },
        body: bodyHtml
    }));
}

function advSetOpen(id, open) {
    advState.open[id] = open;
    const bd = document.getElementById('adv-bd-' + id), hd = document.getElementById('adv-hd-' + id);
    if (!bd || !hd) return;
    bd.classList.toggle('hidden', !open);
    hd.setAttribute('aria-expanded', String(open));
    const ch = hd.querySelector('.adv-chev');
    if (ch) ch.classList.toggle('rotate-180', open);
    if (open) requestAnimationFrame(() => Object.keys(advCharts).forEach(k => { try { advCharts[k].resize(); } catch (e) { } }));
}

function advToggle(id) {
    const hd = document.getElementById('adv-hd-' + id);
    advSetOpen(id, !(hd && hd.getAttribute('aria-expanded') === 'true'));
}

function advToggleAll(open) {
    advSectionReg.top.concat(advSectionReg.sub).forEach(id => advSetOpen(id, open));
}

function advGoStep(no) {
    advSetOpen('step' + no, true);
    const el = document.getElementById(ADV_STEP_IDS[no - 1]);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function advNextStep(no) {
    advSetOpen('step' + no, false);
    advGoStep(no + 1);
}

function advToolbarHtml() {
    const chips = [1, 2, 3, 4].map(n => {
        const st = advStepStatus[n];
        const dot = st ? ADV_DOT[st.tone] || ADV_DOT.slate : ADV_DOT.slate;
        return `<button type="button" id="adv-nav-${n}" onclick="advGoStep(${n})" title="${st ? advEsc(st.label) : ''}" class="inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition">
            <span class="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px]">${n}</span>${ADV_STEP_NAMES[n]}<span class="w-2 h-2 rounded-full ${dot}"></span></button>`;
    }).join('<i class="fa-solid fa-chevron-right text-[10px] text-slate-300 dark:text-slate-600"></i>');
    const btn = 'px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition';
    return `<div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">${chips}</div>
        <div class="flex items-center gap-2">
            <button type="button" id="adv-expand-all" onclick="advToggleAll(true)" class="${btn}"><i class="fa-solid fa-angles-down mr-1"></i>Tümünü aç</button>
            <button type="button" id="adv-collapse-all" onclick="advToggleAll(false)" class="${btn}"><i class="fa-solid fa-angles-up mr-1"></i>Tümünü kapat</button>
        </div>
    </div>`;
}

function advNote(html, tone) {
    const cls = tone === 'warn'
        ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200'
        : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-300';
    return `<div class="text-xs rounded-lg border p-3 ${cls}">${html}</div>`;
}

function advShortLabel(text, max) {
    const s = String(text || '');
    return s.length > (max || 60) ? s.substring(0, max || 60) + '…' : s;
}

function advChartTheme() {
    const dark = advIsDark();
    return { text: dark ? '#cbd5e1' : '#475569', grid: dark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.15)', line: dark ? '#e2e8f0' : '#1e293b' };
}

function advPalette() {
    const src = advIsDark() && typeof PALETTE_DARK !== 'undefined' ? PALETTE_DARK : (typeof PALETTE !== 'undefined' ? PALETTE : [{ bg: 'rgba(59,130,246,0.7)', border: 'rgb(59,130,246)' }]);
    return src;
}

function advDestroyCharts() {
    Object.keys(advCharts).forEach(id => { try { advCharts[id].destroy(); } catch (e) { } });
    advCharts = {};
}

function advMakeChart(id, config) {
    const el = document.getElementById(id);
    if (!el || typeof Chart === 'undefined') return;
    if (advCharts[id]) { advCharts[id].destroy(); delete advCharts[id]; }
    advCharts[id] = new Chart(el.getContext('2d'), config);
}

// ------------------------------------------------------------------ context (all calculations)
function advGroupSort(a, b) {
    return String(a).localeCompare(String(b), 'tr', { numeric: true });
}

function advBuildContext() {
    const rows = typeof getFilteredData === 'function' ? getFilteredData() : [];
    if (!rows || rows.length === 0 || !Array.isArray(questionList) || questionList.length === 0) return null;
    const k = questionList.length;

    const vars = [];
    const scaleVals = rows.map(r => {
        let s = 0, c = 0;
        for (let i = 1; i <= k; i++) {
            const v = r[`Q${i}`];
            if (typeof v === 'number' && isFinite(v)) { s += v; c++; }
        }
        return c ? s / c : NaN;
    });
    vars.push({ id: 'scale', short: 'Ölçek', label: 'Ölçek Puanı (tüm maddelerin ortalaması)', values: scaleVals, isScale: true });
    questionList.forEach((q, i) => {
        vars.push({ id: `Q${i + 1}`, short: `S${i + 1}`, label: q, values: rows.map(r => r[`Q${i + 1}`]), isScale: false });
    });

    // grouping
    let groupIdx = null, groupLabel = '';
    if (advState.groupKey && advState.groupKey !== 'none') {
        const cand = (window.groupingCandidates || []).find(c => c.key === advState.groupKey);
        if (cand) {
            groupLabel = cand.label;
            groupIdx = {};
            rows.forEach((r, ri) => {
                const g = r[cand.key];
                if (g === undefined || g === null) return;
                const name = String(g).trim();
                if (!name) return;
                (groupIdx[name] = groupIdx[name] || []).push(ri);
            });
        }
    }

    const allNames = groupIdx ? Object.keys(groupIdx).sort(advGroupSort) : [];
    const usableNames = allNames.filter(n => groupIdx[n].length >= 2);
    const excluded = allNames.filter(n => groupIdx[n].length < 2);

    vars.forEach(v => {
        v.groupsMap = {};
        usableNames.forEach(name => {
            v.groupsMap[name] = groupIdx[name].map(ri => v.values[ri]).filter(x => typeof x === 'number' && isFinite(x));
        });
        v.analysis = AdvStats.analyzeVariable(v.values, v.groupsMap);
    });

    const ctx = {
        rows, k, vars, scaleVar: vars[0], groupLabel, allNames, usableNames, excluded,
        groupSizes: allNames.map(n => ({ name: n, n: groupIdx[n].length })),
        hasGroups: usableNames.length >= 2, rec: null, results: {}, itemResults: []
    };

    if (ctx.hasGroups) {
        const a = ctx.scaleVar.analysis;
        ctx.rec = AdvStats.recommendTest(a.usable.map(g => ({ name: g.name, n: g.n, decision: g.decision })), a.levene);
        const keys = usableNames.length === 2 ? ['welch', 'mannwhitney'] : ['anova', 'welchanova', 'kruskal'];
        keys.forEach(key => { ctx.results[key] = AdvStats.runComparison(ctx.scaleVar.groupsMap, key); });

        // item level: each item gets the test that fits ITS OWN normality / variance result
        vars.filter(v => !v.isScale).forEach(v => {
            const an = v.analysis;
            const rec = AdvStats.recommendTest(an.usable.map(g => ({ name: g.name, n: g.n, decision: g.decision })), an.levene);
            const res = rec.key ? AdvStats.runComparison(v.groupsMap, rec.key) : { valid: false, error: 'Test seçilemedi' };
            ctx.itemResults.push({ v, rec, res });
        });
        const validIdx = ctx.itemResults.map((r, i) => i).filter(i => ctx.itemResults[i].res.valid);
        const adj = AdvStats.holmAdjust(validIdx.map(i => ctx.itemResults[i].res.p));
        validIdx.forEach((i, j) => { ctx.itemResults[i].pAdj = adj[j]; });
    }
    return ctx;
}

// ------------------------------------------------------------------ public entry points
function advPopulateGroupSelect() {
    const sel = document.getElementById('advGroup');
    if (!sel) return;
    const cands = window.groupingCandidates || [];
    sel.innerHTML = '<option value="none">Grup yok (yalnızca normallik ve ilişkiler)</option>' +
        cands.map(c => `<option value="${advEsc(c.key)}">${advEsc(c.label)}</option>`).join('');

    if (!advState.groupTouched) {
        const main = document.getElementById('groupSelect');
        advState.groupKey = main && cands.some(c => c.key === main.value) ? main.value : 'none';
    }
    if (!cands.some(c => c.key === advState.groupKey)) advState.groupKey = 'none';
    sel.value = advState.groupKey;
}

function renderAdvancedStats() {
    const root = document.getElementById('adv-stats-root');
    if (!root) return;
    advPopulateGroupSelect();
    advDestroyCharts();

    advCtx = advBuildContext();
    const info = document.getElementById('adv-info-bar');

    if (!advCtx) {
        if (info) info.innerHTML = '';
        ['adv-step-normality', 'adv-step-recommend', 'adv-step-compare', 'adv-step-relations'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.innerHTML = ''; el.classList.add('hidden'); }
        });
        document.getElementById('adv-empty').classList.remove('hidden');
        return;
    }
    document.getElementById('adv-empty').classList.add('hidden');
    ['adv-step-normality', 'adv-step-recommend', 'adv-step-compare', 'adv-step-relations'].forEach(id => {
        document.getElementById(id).classList.remove('hidden');
    });

    const c = advCtx;
    if (advState.chartVar !== 'scale' && !c.vars.some(v => v.id === advState.chartVar)) advState.chartVar = 'scale';
    if (advState.chartScope !== 'all' && !c.usableNames.includes(advState.chartScope)) advState.chartScope = 'all';

    if (info) {
        const gTxt = c.hasGroups
            ? `${c.groupLabel}: ` + c.groupSizes.map(g => `${advEsc(g.name)} (n=${g.n})`).join(', ')
            : 'Karşılaştırma grubu seçilmedi';
        info.innerHTML = `<span class="font-semibold">N = ${c.rows.length}</span> katılımcı · <span class="font-semibold">${c.k}</span> madde · ${gTxt}`;
    }

    advSectionReg = { top: [], sub: [] };
    advStepStatus = {};
    advSummary = {};
    document.getElementById('adv-step-normality').innerHTML = advRenderNormalityStep();
    document.getElementById('adv-step-recommend').innerHTML = advRenderRecommendStep();
    document.getElementById('adv-step-compare').innerHTML = advRenderCompareStep();
    document.getElementById('adv-step-relations').innerHTML = advRenderRelationsStep();
    if (info) info.innerHTML += '<div id="adv-summary-box"></div>' + advToolbarHtml();

    advRenderNormalityCharts();
    advRenderCompareChart();
    advRenderCorrelation();
    advRenderChi();
    advRenderSummary();
}

function advOnGroupChange(val) {
    advState.groupKey = val;
    advState.groupTouched = true;
    advState.chartScope = 'all';
    renderAdvancedStats();
}

function advSetChartVar(val) { advState.chartVar = val; advRenderNormalityCharts(); }
function advSetChartScope(val) { advState.chartScope = val; advRenderNormalityCharts(); }
function advPickVar(id) {
    advState.chartVar = id;
    advSetOpen('n-charts', true);
    const sel = document.getElementById('advChartVar');
    if (sel) sel.value = id;
    advRenderNormalityCharts();
    const el = document.getElementById('adv-chart-anchor');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function advSetCorrMethod(val) { advState.corrMethod = val; advRenderCorrelation(); advRenderSummary(); }
function advSetChi(which, val) { advState[which] = val; advRenderChi(); }

function advCopyApa() {
    if (!advLastApa) return;
    const done = () => { if (typeof showToast === 'function') showToast('Yorum panoya kopyalandı.', 'success'); };
    if (navigator.clipboard) navigator.clipboard.writeText(advLastApa).then(done).catch(() => { });
    else done();
}

// ------------------------------------------------------------------ RESULT SUMMARY (plain language)
let advSummaryText = '';

function advBuildSummaryLines() {
    const c = advCtx, S = advSummary;
    if (!c) return [];
    const lines = [];

    lines.push({
        icon: 'fa-chart-area',
        html: S.scaleNormal
            ? `Ölçek puanı <b>normal dağılıyor</b>; bu yüzden ortalama temelli (parametrik) testler uygundur. (${S.normalItems}/${c.k} madde tek başına normal.)`
            : `Ölçek puanı <b>normal dağılmıyor</b> (Likert verilerinde yaygındır); bu yüzden sıra/medyan temelli (parametrik olmayan) testler kullanılır. (${S.normalItems}/${c.k} madde tek başına normal.)`
    });

    if (!c.hasGroups) {
        lines.push({ icon: 'fa-scale-balanced', html: 'Karşılaştırma grubu seçilmedi, gruplar arası fark testi yapılmadı. Sağ üstteki <b>Karşılaştırma Grubu</b> listesinden bir grup seçebilirsiniz.' });
    } else if (S.compare) {
        const k = S.compare;
        lines.push({
            icon: 'fa-scale-balanced',
            html: `<b>${advEsc(k.groupLabel)}</b> gruplarında ${advEsc(k.testLabel)} uygulandı: ${k.sig ? '<b>anlamlı fark var</b>' : '<b>anlamlı fark yok</b>'} (${advEsc(k.apa)}). Etki büyüklüğü <b>${advEsc(k.effectLabel)}</b> düzeyde.`
        });
    } else {
        lines.push({ icon: 'fa-scale-balanced', html: 'Önerilen test hesaplanamadığı için grup karşılaştırma sonucu yok.' });
    }

    if (S.items && S.items.total > 0) {
        const n = S.items.sig.length;
        lines.push({
            icon: 'fa-list-check',
            html: n
                ? `Tek tek maddelerde (Holm düzeltmesiyle) <b>${n}/${S.items.total}</b> maddede anlamlı grup farkı var: ${S.items.sig.slice(0, 6).join(', ')}${n > 6 ? ' …' : ''}.`
                : 'Tek tek maddelerin hiçbirinde (Holm düzeltmesiyle) anlamlı grup farkı bulunmadı.'
        });
    }

    if (S.corr) {
        const r = S.corr;
        lines.push({
            icon: 'fa-diagram-project',
            html: r.top
                ? `Maddeler arası en güçlü ilişki <b>${r.top.a} ↔ ${r.top.b}</b> (${r.symbol} = ${advNum(r.top.r, 2)}, ${advEsc(r.top.label)}); ${r.nSig}/${r.total} madde çifti anlamlı.`
                : 'Maddeler arasında anlamlı bir korelasyon bulunmadı.'
        });
    }
    return lines;
}

function advRenderSummary() {
    const box = document.getElementById('adv-summary-box');
    if (!box) return;
    const lines = advBuildSummaryLines();
    if (!lines.length) { box.innerHTML = ''; advSummaryText = ''; return; }
    advSummaryText = lines.map(l => '• ' + l.html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"')).join('\n');
    box.innerHTML = `<div class="mt-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-900/20 p-4">
        <div class="flex items-center justify-between gap-3 mb-2">
            <div class="text-sm font-bold text-indigo-700 dark:text-indigo-300"><i class="fa-solid fa-wand-magic-sparkles mr-2"></i>Sonuç Özeti <span class="font-normal text-xs text-slate-500 dark:text-slate-400">· ayrıntılar için aşağıdaki adımları açın</span></div>
            <button type="button" id="btn-adv-copy-summary" onclick="advCopySummary()" class="shrink-0 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition" title="Özeti kopyala"><i class="fa-regular fa-copy mr-1"></i>Kopyala</button>
        </div>
        <ul class="space-y-1.5">${lines.map(l => `<li class="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200 leading-relaxed"><i class="fa-solid ${l.icon} mt-1 w-4 text-center text-indigo-500 shrink-0"></i><span>${l.html}</span></li>`).join('')}</ul>
    </div>`;
}

function advCopySummary() {
    if (!advSummaryText) return;
    const done = () => { if (typeof showToast === 'function') showToast('Sonuç özeti panoya kopyalandı.', 'success'); };
    if (navigator.clipboard) navigator.clipboard.writeText(advSummaryText).then(done).catch(() => { });
    else done();
}

// ------------------------------------------------------------------ STEP 1: normality
function advDecisionBadge(dec) {
    if (!dec.testable) return advBadge('Test edilemedi', 'amber');
    return `<span title="${advEsc(dec.basis)}">${dec.normal ? advBadge('Normal', 'indigo') : advBadge('Normal değil', 'slate')}</span>`;
}

function advNormCells(label, desc, sw, dec) {
    const sk = desc.skew === null || desc.skew === undefined ? '–' : `${advNum(desc.skew)} (${advNum(desc.zSkew)})`;
    const ku = desc.kurt === null || desc.kurt === undefined ? '–' : `${advNum(desc.kurt)} (${advNum(desc.zKurt)})`;
    return [label, desc.n, advNum(desc.mean), advNum(desc.sd), advNum(desc.median), sk, ku,
        sw && sw.valid ? advNum(sw.W, 3) : '–', sw && sw.valid ? advP(sw.p) : '–', advDecisionBadge(dec)];
}

function advRenderNormalityStep() {
    const c = advCtx;
    const a = c.scaleVar.analysis;

    const headers = ['Grup', 'n', 'Ort.', 'SS', 'Medyan', advT('Çarpıklık (z)', 'skew'), advT('Basıklık (z)', 'kurt'), advT('Shapiro-Wilk W', 'shapiro'), advT('p', 'p'), advT('Karar', 'decision')];
    const scaleRows = [advRow(advNormCells('<span class="font-semibold">Tüm örneklem</span>', a.descAll, a.swAll, a.decAll))];
    a.groups.forEach(g => {
        if (g.n >= 2) scaleRows.push(advRow(advNormCells(advEsc(g.name), g.desc, g.sw, g.decision)));
    });

    // items table
    const itemHeaders = ['Madde', 'Soru', 'n', 'Ort.', 'SS', advT('Çarpıklık (z)', 'skew'), advT('Basıklık (z)', 'kurt'), advT('Shapiro-Wilk W', 'shapiro'), advT('p', 'p'), advT('Karar', 'decision')];
    if (c.hasGroups) itemHeaders.push('Normal grup');
    let normalItems = 0;
    const itemRows = c.vars.filter(v => !v.isScale).map(v => {
        const an = v.analysis;
        if (an.decAll.normal) normalItems++;
        const cells = advNormCells('', an.descAll, an.swAll, an.decAll);
        const row = [`<span class="font-semibold">${v.short}</span>`,
            `<div class="max-w-[320px] truncate" title="${advEsc(v.label)}">${advEsc(advShortLabel(v.label, 70))}</div>`,
            cells[1], cells[2], cells[3], cells[5], cells[6], cells[7], cells[8], cells[9]];
        if (c.hasGroups) {
            const ok = an.usable.filter(g => g.decision.normal).length;
            row.push(`${ok}/${an.usable.length}`);
        }
        return `<tr class="cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-slate-700/50" onclick="advPickVar('${v.id}')" title="Grafiği göster">` +
            row.map((x, i) => `<td class="px-3 py-2 ${i === 1 ? '' : 'whitespace-nowrap'}">${x}</td>`).join('') + '</tr>';
    });

    const scaleNormal = c.hasGroups ? a.allNormal : a.decAll.normal;
    const scaleBasis = c.hasGroups
        ? 'Ölçek puanı her grupta ayrı ayrı değerlendirildi; parametrik test için tüm grupların normal olması gerekir.'
        : 'Grup seçilmediği için tüm örneklem üzerinden değerlendirildi.';

    const varOptions = c.vars.map(v => `<option value="${v.id}" ${v.id === advState.chartVar ? 'selected' : ''}>${advEsc(v.isScale ? v.label : v.short + ' – ' + advShortLabel(v.label, 55))}</option>`).join('');
    const scopeOptions = `<option value="all">Tüm örneklem</option>` + c.usableNames.map(n => `<option value="${advEsc(n)}" ${n === advState.chartScope ? 'selected' : ''}>${advEsc(n)}</option>`).join('');
    const selCls = 'w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white text-sm rounded-lg p-2';

    const body = `

        <div class="mb-4 p-4 rounded-xl border ${scaleNormal ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20' : 'border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/60'}">
            <div class="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                <i class="fa-solid fa-circle-info ${scaleNormal ? 'text-indigo-600' : 'text-slate-500'}"></i>
                Ölçek puanı ${scaleNormal ? 'normal dağılım gösteriyor → ortalama temelli (parametrik) testler uygundur.' : 'normal dağılım göstermiyor → sıra/medyan temelli (parametrik olmayan) testler önerilir.'}
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-300 mt-2"><b>Bu ne demek?</b> ${scaleNormal
                ? 'Puanlar ortada yığılıp iki uça doğru simetrik azalıyor; ortalama grubu iyi temsil eder.'
                : 'Puanlar simetrik bir çan eğrisi çizmiyor (örneğin bir uçta yığılıyor); bu Likert verilerinde sık görülür ve bir hata değildir. Testler ortalama yerine sıraları karşılaştırır.'}
                ${scaleBasis}</p>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Karar kuralı: n ≤ 50 → Shapiro-Wilk; 50 &lt; n &lt; 300 → |z çarpıklık|, |z basıklık| &lt; 3.29; n ≥ 300 → |çarpıklık| &lt; 2 ve |basıklık| &lt; 7 (Kim, 2013).
                Büyük örneklemde Shapiro-Wilk en küçük sapmayı bile reddettiği için bu kural kullanılır.</p>
        </div>

        ${advSubOpen('n-scale', '1a. Ölçek puanı', 'Tüm maddelerin ortalaması; tüm örneklem ve gruplar', true,
            { tone: scaleNormal ? 'indigo' : 'slate', text: c.hasGroups ? a.usable.filter(g => g.decision.normal).length + '/' + a.usable.length + ' grup normal' : (scaleNormal ? 'Normal' : 'Normal değil') })}
        ${advTable(headers, scaleRows)}
        ${advSubClose()}

        ${advSubOpen('n-charts', 'Dağılım grafikleri', 'Histogram ve Q-Q grafiği; değişken ve grup seçilebilir', false)}

        <div id="adv-chart-anchor" class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1 mb-3">
            <div>
                <label class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Grafik için değişken</label>
                <select id="advChartVar" onchange="advSetChartVar(this.value)" class="${selCls}">${varOptions}</select>
            </div>
            <div>
                <label class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Kapsam</label>
                <select id="advChartScope" onchange="advSetChartScope(this.value)" class="${selCls}">${scopeOptions}</select>
            </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="rounded-xl border border-slate-200 dark:border-slate-700 p-3"><div class="relative h-72"><canvas id="adv-hist-canvas"></canvas></div></div>
            <div class="rounded-xl border border-slate-200 dark:border-slate-700 p-3"><div class="relative h-72"><canvas id="adv-qq-canvas"></canvas></div></div>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">Histogramda çubuklar gözlenen, kırmızı çizgi normal dağılımdan beklenen frekanstır. Q-Q grafiğinde noktaların çizgi üzerinde dizilmesi normallik anlamına gelir.</p>
        ${advSubClose()}

        ${advSubOpen('n-items', '1b. Tek tek maddeler (tüm örneklem)', 'Her madde ayrı değerlendirilir; satıra tıklayınca grafiği açılır', false, { tone: 'slate', text: normalItems + '/' + c.k + ' madde normal' })}
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-2">Likert maddeleri sıralı ölçektir ve 5 seçenekli maddelerde normallik çoğunlukla sağlanmaz (${normalItems}/${c.k} madde normal). Bir satıra tıklayarak grafiğini görebilirsiniz.</p>
        ${advTable(itemHeaders, itemRows)}
        ${advSubClose()}
    `;

    advSummary.scaleNormal = scaleNormal;
    advSummary.normalItems = normalItems;

    return advSection({
        id: 'step1', no: 1, title: 'Normallik Testi',
        subtitle: 'Hangi test ailesinin (parametrik / parametrik olmayan) kullanılacağına bu adımın sonucu karar verir.',
        status: {
            tone: scaleNormal ? 'indigo' : 'slate',
            label: scaleNormal ? 'Normal dağılım' : 'Normal dağılım değil',
            text: scaleNormal ? 'Ortalama temelli (parametrik) testler uygundur.' : 'Sıra/medyan temelli (parametrik olmayan) testler önerilir.'
        },
        body, open: true, nextNo: 2, nextTitle: 'Test önerisi'
    });
}

function advHistogramData(values) {
    const x = values.filter(v => typeof v === 'number' && isFinite(v));
    const n = x.length;
    if (n === 0) return null;
    const min = Math.min(...x), max = Math.max(...x);
    const allInt = x.every(v => Number.isInteger(v)) && (max - min) <= 10;
    let edges = [];
    if (allInt) {
        for (let v = min; v <= max + 1; v++) edges.push(v - 0.5);
    } else {
        const bins = Math.max(5, Math.min(20, Math.ceil(Math.log2(n)) + 1));
        const width = (max - min) / bins || 1;
        for (let i = 0; i <= bins; i++) edges.push(min + i * width);
    }
    const counts = new Array(edges.length - 1).fill(0);
    x.forEach(v => {
        let b = edges.findIndex((e, i) => i < edges.length - 1 && v >= e && v < edges[i + 1]);
        if (b < 0) b = counts.length - 1;
        counts[b]++;
    });
    const d = AdvStats.describe(x);
    const expected = counts.map((_, i) => d.sd > 0
        ? n * (AdvStats.normCdf((edges[i + 1] - d.mean) / d.sd) - AdvStats.normCdf((edges[i] - d.mean) / d.sd))
        : 0);
    const labels = counts.map((_, i) => allInt ? String(Math.round((edges[i] + edges[i + 1]) / 2)) : ((edges[i] + edges[i + 1]) / 2).toFixed(2));
    return { labels, counts, expected, desc: d, n };
}

function advRenderNormalityCharts() {
    const c = advCtx;
    if (!c) return;
    const v = c.vars.find(x => x.id === advState.chartVar) || c.vars[0];
    const vals = advState.chartScope !== 'all' && v.groupsMap[advState.chartScope] ? v.groupsMap[advState.chartScope] : v.values;
    const clean = vals.filter(t => typeof t === 'number' && isFinite(t));
    const th = advChartTheme();
    const title = `${v.isScale ? 'Ölçek puanı' : v.short}${advState.chartScope !== 'all' ? ' · ' + advState.chartScope : ''} (n=${clean.length})`;

    const h = advHistogramData(clean);
    if (!h) return;
    advMakeChart('adv-hist-canvas', {
        type: 'bar',
        data: {
            labels: h.labels,
            datasets: [
                { label: 'Gözlenen frekans', data: h.counts, backgroundColor: 'rgba(99,102,241,0.55)', borderColor: 'rgb(99,102,241)', borderWidth: 1, categoryPercentage: 1, barPercentage: 0.95, order: 2 },
                { type: 'line', label: 'Beklenen (normal eğri)', data: h.expected, borderColor: '#f43f5e', backgroundColor: '#f43f5e', tension: 0.35, pointRadius: 3, borderWidth: 2, order: 1 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                datalabels: { display: false },
                legend: { labels: { color: th.text, boxWidth: 12 } },
                title: { display: true, text: 'Histogram · ' + title, color: th.text }
            },
            scales: {
                x: { ticks: { color: th.text }, grid: { display: false } },
                y: { beginAtZero: true, ticks: { color: th.text }, grid: { color: th.grid }, title: { display: true, text: 'Frekans', color: th.text } }
            }
        }
    });

    // Q-Q plot
    const sorted = h.desc.sorted;
    const n = sorted.length;
    const pts = sorted.map((val, i) => ({ x: AdvStats.normInv((i + 1 - 0.375) / (n + 0.25)), y: val }));
    const zMin = pts[0].x, zMax = pts[n - 1].x;
    const ref = [{ x: zMin, y: h.desc.mean + h.desc.sd * zMin }, { x: zMax, y: h.desc.mean + h.desc.sd * zMax }];
    advMakeChart('adv-qq-canvas', {
        type: 'scatter',
        data: {
            datasets: [
                { label: 'Gözlemler', data: pts, backgroundColor: 'rgba(99,102,241,0.7)', pointRadius: 3 },
                { label: 'Normal referans çizgisi', data: ref, showLine: true, borderColor: '#f43f5e', borderWidth: 2, pointRadius: 0, fill: false }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                datalabels: { display: false },
                legend: { labels: { color: th.text, boxWidth: 12 } },
                title: { display: true, text: 'Normal Q-Q Grafiği · ' + title, color: th.text }
            },
            scales: {
                x: { ticks: { color: th.text }, grid: { color: th.grid }, title: { display: true, text: 'Kuramsal normal kantiller (z)', color: th.text } },
                y: { ticks: { color: th.text }, grid: { color: th.grid }, title: { display: true, text: 'Gözlenen değer', color: th.text } }
            }
        }
    });
}

// ------------------------------------------------------------------ STEP 2: assumptions & recommendation
function advRenderRecommendStep() {
    const c = advCtx;
    const stepMeta = {
        id: 'step2', no: 2, title: 'Varsayım Kontrolü ve Test Önerisi',
        subtitle: 'Normallik sonucu, grup sayısı ve varyans homojenliğine göre uygun test otomatik seçilir.',
        open: false, nextNo: 3, nextTitle: 'Sonuçlar'
    };
    if (!c.hasGroups) {
        return advNoGroupStep(stepMeta, advNote('Grup karşılaştırması için yukarıdaki <b>Karşılaştırma Grubu</b> listesinden en az 2 grubu (her birinde n ≥ 2) olan bir değişken seçin. Grup seçmeden de Adım 1 ve Adım 4 kullanılabilir.'));
    }
    const a = c.scaleVar.analysis;
    const rec = c.rec;
    const info = AdvStats.TEST_INFO[rec.key] || { label: '–', posthoc: null };

    const normalChips = a.usable.map(g => `<div class="flex items-center justify-between gap-3 text-xs"><span class="truncate max-w-[160px]" title="${advEsc(g.name)}">${advEsc(g.name)} (n=${g.n})</span>${advDecisionBadge(g.decision)}</div>`).join('');
    const lev = a.levene;
    const levHtml = lev.valid
        ? `<div class="text-xs text-slate-600 dark:text-slate-300">${advT('Brown-Forsythe Levene', 'levene')}: F(${lev.df1}, ${lev.df2}) = ${advNum(lev.F)}, p ${advP(lev.p) === '< 0.001' ? '< 0.001' : '= ' + advP(lev.p)}</div>
           <div class="mt-1">${lev.equal ? advBadge('Varyanslar homojen', 'indigo') : advBadge('Varyanslar homojen değil', 'slate')}</div>`
        : `<div class="text-xs text-slate-500">${advEsc(lev.error || 'Hesaplanamadı')}</div>`;

    const warns = [];
    a.usable.filter(g => g.n < 5).forEach(g => warns.push(`“${advEsc(g.name)}” grubunda yalnızca ${g.n} kişi var; sonuçlar güvenilir olmayabilir.`));
    if (c.excluded.length) warns.push(`n &lt; 2 olduğu için analiz dışı bırakılan grup(lar): ${c.excluded.map(advEsc).join(', ')}.`);

    const arrow = '<div class="hidden lg:flex items-center text-slate-300 dark:text-slate-600"><i class="fa-solid fa-chevron-right text-xl"></i></div>';
    const box = 'flex-1 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2';

    const body = `
        <div class="flex flex-col lg:flex-row items-stretch gap-3">
            <div class="${box}"><div class="text-xs font-bold uppercase tracking-wide text-slate-500">Normallik (ölçek puanı)</div>${normalChips}</div>
            ${arrow}
            <div class="${box}"><div class="text-xs font-bold uppercase tracking-wide text-slate-500">${advT('Varyans homojenliği', 'levene')}</div>${levHtml}</div>
            ${arrow}
            <div class="flex-1 rounded-xl border-2 border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 p-4 space-y-1">
                <div class="text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Önerilen test</div>
                <div class="text-base font-bold text-slate-800 dark:text-white">${advEsc(info.label)}</div>
                ${info.posthoc ? `<div class="text-xs text-slate-600 dark:text-slate-300">${advT('Post-hoc', 'posthoc')}: ${advEsc(info.posthoc)}</div>` : ''}
            </div>
        </div>
        ${advSubOpen('r-why', 'Bu test neden önerildi?', 'Karar gerekçeleri', false)}<ul class="text-xs text-slate-600 dark:text-slate-300 list-disc pl-5 space-y-1">${rec.reasons.map(r => `<li>${advEsc(r)}</li>`).join('')}</ul>${advSubClose()}
        ${warns.length ? `<div class="mt-3 space-y-2">${warns.map(w => advNote(w, 'warn')).join('')}</div>` : ''}
    `;

    return advSection(Object.assign({}, stepMeta, {
        status: { tone: 'indigo', label: 'Önerilen test', text: advEsc(info.label) },
        body
    }));
}

// ------------------------------------------------------------------ STEP 3: comparison results
function advSigBadge(p) {
    return p < 0.05 ? advBadge('Anlamlı', 'green') : advBadge('Anlamsız', 'slate');
}

function advGroupStatsRows(useMean) {
    const a = advCtx.scaleVar.analysis;
    if (useMean) {
        return advTable(['Grup', 'n', 'Ortalama', 'SS', advT('%95 GA', 'ci')],
            a.usable.map(g => advRow([advEsc(g.name), g.n, advNum(g.desc.mean), advNum(g.desc.sd),
                `${advNum(g.desc.ciLow)} – ${advNum(g.desc.ciHigh)}`])));
    }
    const meanRanks = advCtx.results.kruskal && advCtx.results.kruskal.valid ? advCtx.results.kruskal.detail.meanRanks
        : (advCtx.results.mannwhitney && advCtx.results.mannwhitney.valid ? [advCtx.results.mannwhitney.detail.meanRank1, advCtx.results.mannwhitney.detail.meanRank2] : null);
    return advTable(['Grup', 'n', 'Medyan', 'Q1', 'Q3', 'IQR', 'Ort. sıra'],
        a.usable.map((g, i) => advRow([advEsc(g.name), g.n, advNum(g.desc.median), advNum(g.desc.q1), advNum(g.desc.q3), advNum(g.desc.iqr),
            meanRanks ? advNum(meanRanks[i], 1) : '–'])));
}

function advRenderCompareStep() {
    const c = advCtx;
    const stepMeta = {
        id: 'step3', no: 3, title: 'Karşılaştırma Sonuçları',
        subtitle: 'Önerilen testin sonucu, etki büyüklüğü ve (gerekirse) post-hoc analiz.',
        open: false, nextNo: 4, nextTitle: 'İlişkiler'
    };
    if (!c.hasGroups) {
        advLastApa = '';
        return advNoGroupStep(stepMeta, advNote('Bu adım için bir karşılaştırma grubu seçin.'));
    }
    const rec = c.rec;
    const useMean = ADV_PARAMETRIC_KEYS.includes(rec.key);
    const res = c.results[rec.key];
    const info = AdvStats.TEST_INFO[rec.key];

    let mainHtml;
    let status = { tone: 'amber', label: 'Hesaplanamadı', text: 'Önerilen test hesaplanamadı.' };
    if (!res || !res.valid) {
        advLastApa = '';
        mainHtml = advNote(`Önerilen test hesaplanamadı: ${advEsc(res ? res.error : 'bilinmeyen hata')}`, 'warn');
    } else {
        const sig = res.p < 0.05;
        status = {
            tone: sig ? 'green' : 'slate',
            label: sig ? 'Anlamlı fark var' : 'Anlamlı fark yok',
            text: `${advEsc(res.label)} · ${advEsc(res.apa)}`
        };
        advSummary.compare = { sig, p: res.p, apa: res.apa, testLabel: res.label, groupLabel: c.groupLabel, effectLabel: res.effect.label, effectName: res.effect.name };
        const apaText = `${c.groupLabel} değişkenine göre gruplar arasında ölçek puanı bakımından ${info.label} sonucunda istatistiksel olarak ` +
            `${sig ? 'anlamlı bir fark bulunmuştur' : 'anlamlı bir fark bulunmamıştır'} (${res.apa}). Etki büyüklüğü ${res.effect.label} düzeydedir.`;
        advLastApa = apaText;
        const det = [];
        if (res.key === 'welch') {
            det.push(['Ortalama farkı', `${advNum(res.detail.diff)} (%95 GA ${advNum(res.detail.ciLow)} – ${advNum(res.detail.ciHigh)})`]);
            det.push(["Hedges g", advNum(res.detail.hedgesG)]);
        }
        mainHtml = `
            <div class="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div class="flex flex-wrap items-center gap-2 mb-3">
                    <span class="text-base font-bold text-slate-800 dark:text-white">${advEsc(res.label)}</span>
                    ${advBadge('Önerilen', 'indigo')} ${advSigBadge(res.p)}
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><div class="text-[11px] uppercase text-slate-500">İstatistik (${res.statName})</div><div class="font-bold text-slate-800 dark:text-white">${advNum(res.stat, 3)}</div></div>
                    <div><div class="text-[11px] uppercase text-slate-500">${advT('Serbestlik derecesi', 'df')}</div><div class="font-bold text-slate-800 dark:text-white">${advEsc(res.dfText)}</div></div>
                    <div><div class="text-[11px] uppercase text-slate-500">${advT('p değeri', 'p')}</div><div class="font-bold text-slate-800 dark:text-white">${advP(res.p)}</div></div>
                    <div><div class="text-[11px] uppercase text-slate-500">${advT(advEsc(res.effect.name), 'effect')}</div><div class="font-bold text-slate-800 dark:text-white">${advNum(res.effect.value, 3)} <span class="text-xs font-medium text-slate-500">(${res.effect.label})</span></div></div>
                </div>
                <div class="mt-3 p-3 rounded-lg border ${sig ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20' : 'border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/60'} text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                    <div><b>Sade anlatım:</b> ${advPlainP(res.p)}</div>
                    <div class="mt-1">Etki büyüklüğü <b>${advEsc(res.effect.label)}</b> düzeyde; anlamlılık farkın varlığını, etki büyüklüğü ise pratik önemini gösterir.</div>
                </div>
                ${det.length ? `<div class="mt-3 text-xs text-slate-600 dark:text-slate-300 space-y-0.5">${det.map(d => `<div><b>${d[0]}:</b> ${d[1]}</div>`).join('')}</div>` : ''}
                <div class="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                    <div class="flex justify-between items-start gap-3">
                        <div><b>Yorum:</b> ${advEsc(apaText)}</div>
                        <button id="btn-adv-copy-apa" onclick="advCopyApa()" class="shrink-0 px-2 py-1 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600" title="Yorumu kopyala"><i class="fa-regular fa-copy"></i></button>
                    </div>
                </div>
            </div>`;
    }

    // other tests (informational)
    const others = Object.keys(c.results).filter(k => k !== rec.key).map(k => {
        const r = c.results[k];
        const nm = AdvStats.TEST_INFO[k].label;
        if (!r.valid) return advRow([nm, '–', '–', '–', '–', advEsc(r.error || '')]);
        return advRow([nm, `${r.statName} = ${advNum(r.stat, 3)}`, advEsc(r.dfText), advP(r.p), `${advNum(r.effect.value, 3)} (${r.effect.label})`, advSigBadge(r.p)]);
    });
    const othersHtml = advSub('c-others', 'Diğer testler', 'Yalnızca bilgi amaçlı; varsayımlar sağlanmıyorsa yorumlanmamalıdır',
        advTable(['Test', 'İstatistik', advT('sd', 'df'), advT('p', 'p'), advT('Etki büyüklüğü', 'effect'), 'Sonuç'], others), false,
        { tone: 'slate', text: Object.keys(c.results).filter(k => k !== rec.key && c.results[k].valid && c.results[k].p < 0.05).length + '/' + Object.keys(c.results).filter(k => k !== rec.key).length + ' anlamlı' });

    // post-hoc
    let postHtml = '';
    if (res && res.valid && res.posthoc && res.posthoc.length) {
        const sig = res.p < 0.05;
        const rows = res.posthoc.map(p => advRow([`${advEsc(p.a)} – ${advEsc(p.b)}`, advNum(p.diff, 3), `${p.statName} = ${advNum(p.stat, 3)}`, advP(p.p), advP(p.pAdj), advSigBadge(p.pAdj)]));
        const diffLabel = rec.key === 'kruskal' ? 'Ort. sıra farkı' : 'Ortalama farkı';
        const sigPairs = res.posthoc.filter(p => p.pAdj < 0.05).length;
        postHtml = advSub('c-post', 'Post-hoc: ' + advEsc(res.posthocLabel), 'İkili karşılaştırmalar; hangi gruplar birbirinden farklı?',
            (sig ? '' : advNote('Genel test anlamlı olmadığı için ikili karşılaştırmalar yorumlanmamalıdır; bilgi amaçlı gösterilmiştir.', 'warn') + '<div class="h-2"></div>') +
            advTable(['Karşılaştırma', diffLabel, 'İstatistik', advT('p', 'p'), advT(rec.key === 'kruskal' ? 'p (Holm)' : 'p (düzeltilmiş)', 'holm'), 'Sonuç'], rows), sig,
            { tone: sigPairs ? 'green' : 'slate', text: sigPairs + '/' + res.posthoc.length + ' çift anlamlı' });
    }

    // item level
    const itemRows = c.itemResults.map(({ v, rec: r, res: rs, pAdj }) => {
        const label = `<div class="max-w-[260px] truncate" title="${advEsc(v.label)}"><span class="font-semibold">${v.short}</span> ${advEsc(advShortLabel(v.label, 45))}</div>`;
        if (!rs.valid) return advRow([label, advEsc(rs.error || '–'), '–', '–', '–', '–', '–']);
        const parametric = ADV_PARAMETRIC_KEYS.includes(rs.key);
        const grp = v.analysis.usable.map(g => `${advEsc(advShortLabel(g.name, 10))}: ${advNum(parametric ? g.desc.mean : g.desc.median)}`).join(' | ');
        return advRow([label, advEsc(rs.label), `${rs.statName} = ${advNum(rs.stat, 2)}`, advP(rs.p), advP(pAdj),
            `${advNum(rs.effect.value, 2)} (${rs.effect.label})`, `<span class="text-[11px]" title="${parametric ? 'Ortalama' : 'Medyan'}">${grp}</span>`,
            advSigBadge(pAdj)]);
    });
    const validItems = c.itemResults.filter(r => r.res.valid);
    const sigItems = validItems.filter(r => r.pAdj < 0.05);
    advSummary.items = { total: validItems.length, sig: sigItems.map(r => r.v.short) };
    const itemHtml = advSub('c-items', 'Tek tek maddeler', 'Her madde için ayrı test; Holm düzeltmeli', 
        `<p class="text-xs text-slate-500 dark:text-slate-400 mb-2">Her madde için test, o maddenin kendi normallik ve varyans sonucuna göre seçilir. Çok sayıda madde aynı anda test edildiği için anlamlılık <b>Holm düzeltmeli p</b> değerine göre verilir. Gruplar sütununda parametrik testlerde ortalama, diğerlerinde medyan gösterilir.</p>` +
        advTable(['Madde', 'Test', 'İstatistik', advT('p', 'p'), advT('p (Holm)', 'holm'), advT('Etki büyüklüğü', 'effect'), 'Gruplar', 'Sonuç'], itemRows), false,
        { tone: sigItems.length ? 'green' : 'slate', text: sigItems.length + '/' + validItems.length + ' madde anlamlı' });

    const chartHtml = `
        <div class="grid grid-cols-1 xl:grid-cols-5 gap-4 mb-4">
            <div class="xl:col-span-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3"><div class="relative h-80"><canvas id="adv-compare-canvas"></canvas></div></div>
            <div class="xl:col-span-2">
                <div class="mb-2 text-xs text-slate-500 dark:text-slate-400">${useMean
                    ? 'Dağılım normal olduğu için <b>ortalama ± %95 güven aralığı</b> gösterilir.'
                    : 'Dağılım normal olmadığı için <b>medyan ve çeyrekler (kutu grafiği)</b> gösterilir.'}</div>
                ${advGroupStatsRows(useMean)}
            </div>
        </div>
    `;

    const body = `
        ${mainHtml}
        <div class="mt-4"></div>
        ${advSub('c-chart', 'Grup grafiği ve özet tablo', 'Grupların görsel karşılaştırması', chartHtml, true)}
        ${postHtml}
        ${othersHtml}
        ${itemHtml}
    `;

    return advSection(Object.assign({}, stepMeta, { status, body }));
}

const advErrorBarPlugin = {
    id: 'advErrorBars',
    afterDatasetsDraw(chart, args, opts) {
        if (!opts || !opts.lows) return;
        const y = chart.scales.y;
        const meta = chart.getDatasetMeta(0);
        const ctx = chart.ctx;
        ctx.save();
        ctx.strokeStyle = opts.color;
        ctx.lineWidth = 2;
        meta.data.forEach((bar, i) => {
            const lo = opts.lows[i], hi = opts.highs[i];
            if (lo === null || hi === null || lo === undefined || hi === undefined) return;
            const yl = y.getPixelForValue(Math.max(lo, y.min));
            const yh = y.getPixelForValue(Math.min(hi, y.max));
            ctx.beginPath();
            ctx.moveTo(bar.x, yl); ctx.lineTo(bar.x, yh);
            ctx.moveTo(bar.x - 7, yl); ctx.lineTo(bar.x + 7, yl);
            ctx.moveTo(bar.x - 7, yh); ctx.lineTo(bar.x + 7, yh);
            ctx.stroke();
        });
        ctx.restore();
    }
};

const advBoxPlugin = {
    id: 'advBox',
    afterDatasetsDraw(chart, args, opts) {
        if (!opts || !opts.stats) return;
        const y = chart.scales.y;
        const meta = chart.getDatasetMeta(0);
        const ctx = chart.ctx;
        const py = v => y.getPixelForValue(v);
        ctx.save();
        ctx.strokeStyle = opts.color;
        meta.data.forEach((bar, i) => {
            const s = opts.stats[i];
            if (!s) return;
            const x = bar.x, half = bar.width / 2;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(x - half, py(s.median)); ctx.lineTo(x + half, py(s.median)); ctx.stroke();
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, py(s.q3)); ctx.lineTo(x, py(s.whiHi));
            ctx.moveTo(x - 8, py(s.whiHi)); ctx.lineTo(x + 8, py(s.whiHi));
            ctx.moveTo(x, py(s.q1)); ctx.lineTo(x, py(s.whiLo));
            ctx.moveTo(x - 8, py(s.whiLo)); ctx.lineTo(x + 8, py(s.whiLo));
            ctx.stroke();
            s.outliers.forEach(o => { ctx.beginPath(); ctx.arc(x, py(o), 3, 0, 2 * Math.PI); ctx.stroke(); });
            const my = py(s.mean);
            ctx.beginPath();
            ctx.moveTo(x - 5, my - 5); ctx.lineTo(x + 5, my + 5);
            ctx.moveTo(x - 5, my + 5); ctx.lineTo(x + 5, my - 5);
            ctx.stroke();
        });
        ctx.restore();
    }
};

function advBoxStats(desc) {
    const lowFence = desc.q1 - 1.5 * desc.iqr, highFence = desc.q3 + 1.5 * desc.iqr;
    const inside = desc.sorted.filter(v => v >= lowFence && v <= highFence);
    return {
        median: desc.median, q1: desc.q1, q3: desc.q3, mean: desc.mean,
        whiLo: inside.length ? Math.min(...inside) : desc.q1,
        whiHi: inside.length ? Math.max(...inside) : desc.q3,
        outliers: desc.sorted.filter(v => v < lowFence || v > highFence)
    };
}

function advRenderCompareChart() {
    const c = advCtx;
    if (!c || !c.hasGroups || !c.rec || !c.rec.key) return;
    const groups = c.scaleVar.analysis.usable;
    const th = advChartTheme();
    const pal = advPalette();
    const useMean = ADV_PARAMETRIC_KEYS.includes(c.rec.key);
    const labels = groups.map(g => `${g.name} (n=${g.n})`);
    const bg = groups.map((g, i) => pal[i % pal.length].bg);
    const border = groups.map((g, i) => pal[i % pal.length].border);
    const common = {
        responsive: true, maintainAspectRatio: false,
        scales: {
            x: { ticks: { color: th.text }, grid: { display: false } },
            y: { min: 1, max: 5, ticks: { color: th.text, stepSize: 1 }, grid: { color: th.grid }, title: { display: true, text: 'Ölçek puanı (1–5)', color: th.text } }
        }
    };

    if (useMean) {
        advMakeChart('adv-compare-canvas', {
            type: 'bar', plugins: [advErrorBarPlugin],
            data: { labels, datasets: [{ label: 'Ortalama', data: groups.map(g => g.desc.mean), backgroundColor: bg, borderColor: border, borderWidth: 2, borderRadius: 6, maxBarThickness: 90 }] },
            options: Object.assign({}, common, {
                plugins: {
                    datalabels: { display: false }, legend: { display: false },
                    title: { display: true, text: 'Ortalama ± %95 güven aralığı', color: th.text },
                    advErrorBars: { lows: groups.map(g => g.desc.ciLow), highs: groups.map(g => g.desc.ciHigh), color: th.line },
                    tooltip: { callbacks: { label: ctx => { const d = groups[ctx.dataIndex].desc; return `Ort. ${advNum(d.mean)} (SS ${advNum(d.sd)}); %95 GA ${advNum(d.ciLow)} – ${advNum(d.ciHigh)}`; } } }
                }
            })
        });
    } else {
        const stats = groups.map(g => advBoxStats(g.desc));
        advMakeChart('adv-compare-canvas', {
            type: 'bar', plugins: [advBoxPlugin],
            data: { labels, datasets: [{ label: 'Q1 – Q3', data: groups.map(g => [g.desc.q1, g.desc.q3]), backgroundColor: bg, borderColor: border, borderWidth: 2, maxBarThickness: 90 }] },
            options: Object.assign({}, common, {
                plugins: {
                    datalabels: { display: false }, legend: { display: false },
                    title: { display: true, text: 'Kutu grafiği: medyan (kalın çizgi), Q1–Q3, bıyıklar, aykırı değerler (○), ortalama (×)', color: th.text },
                    advBox: { stats, color: th.line },
                    tooltip: { callbacks: { label: ctx => { const d = groups[ctx.dataIndex].desc; return `Medyan ${advNum(d.median)} · Q1 ${advNum(d.q1)} · Q3 ${advNum(d.q3)}`; } } }
                }
            })
        });
    }
}

// ------------------------------------------------------------------ STEP 4: relationships
function advRenderRelationsStep() {
    const c = advCtx;
    const cands = window.groupingCandidates || [];
    const opts = (sel) => '<option value="none">Seçiniz</option>' + cands.map(g => `<option value="${advEsc(g.key)}" ${g.key === sel ? 'selected' : ''}>${advEsc(g.label)}</option>`).join('');
    const selCls = 'w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white text-sm rounded-lg p-2';

    if (advState.chiA === 'none' && cands.length >= 2) {
        advState.chiA = cands[0].key;
        advState.chiB = cands[1].key;
    }

    const body = `
        ${advSubOpen('x-corr', 'Maddeler arası korelasyon', 'Pearson veya Spearman', true)}
        <div class="flex flex-wrap items-end gap-4 mb-3">
            <div class="w-full sm:w-72">
                <label class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Korelasyon yöntemi</label>
                <select id="advCorrMethod" onchange="advSetCorrMethod(this.value)" class="${selCls}">
                    <option value="auto" ${advState.corrMethod === 'auto' ? 'selected' : ''}>Otomatik (normallik sonucuna göre)</option>
                    <option value="pearson" ${advState.corrMethod === 'pearson' ? 'selected' : ''}>Pearson (r)</option>
                    <option value="spearman" ${advState.corrMethod === 'spearman' ? 'selected' : ''}>Spearman (rho)</option>
                </select>
            </div>
        </div>
        <div id="adv-corr-body"></div>
        ${advSubClose()}

        ${advSubOpen('x-chi', 'Ki-kare bağımsızlık testi', 'İki kategorik değişken arasındaki ilişki', false)}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
            <div>
                <label class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Satır değişkeni</label>
                <select id="advChiA" onchange="advSetChi('chiA', this.value)" class="${selCls}">${opts(advState.chiA)}</select>
            </div>
            <div>
                <label class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Sütun değişkeni</label>
                <select id="advChiB" onchange="advSetChi('chiB', this.value)" class="${selCls}">${opts(advState.chiB)}</select>
            </div>
        </div>
        <div id="adv-chi-body"></div>
        ${advSubClose()}
    `;

    return advSection({
        id: 'step4', no: 4, title: 'İlişki Analizleri',
        subtitle: 'Maddeler arası korelasyon (Pearson veya Spearman) ve iki kategorik değişken arasında ki-kare bağımsızlık testi.',
        status: { tone: 'slate', label: 'Keşifsel', text: 'Korelasyon matrisi ve ki-kare testi' },
        body, open: false
    });
}

function advCorrColor(r) {
    const a = Math.min(1, Math.abs(r)) * 0.6;
    return r >= 0 ? `rgba(59,130,246,${a.toFixed(2)})` : `rgba(239,68,68,${a.toFixed(2)})`;
}

function advRenderCorrelation() {
    const body = document.getElementById('adv-corr-body');
    const c = advCtx;
    if (!body || !c) return;
    const chipEl = document.getElementById('adv-chip-x-corr');
    if (chipEl) chipEl.innerHTML = '';
    delete advSummary.corr;

    const MAX_ITEMS = 30;
    const itemVars = c.vars.filter(v => !v.isScale);
    const used = [c.scaleVar].concat(itemVars.slice(0, MAX_ITEMS));
    if (used.length < 3) {
        body.innerHTML = advNote('Korelasyon matrisi için en az 2 madde gerekli.');
        return;
    }

    let method = advState.corrMethod;
    let reason = '';
    if (method === 'auto') {
        const allNormal = used.every(v => v.analysis.decAll.normal);
        method = allNormal ? 'pearson' : 'spearman';
        reason = allNormal
            ? 'Tüm değişkenler normal dağıldığı için Pearson seçildi.'
            : 'Normal dağılmayan değişkenler olduğu (ve maddeler sıralı ölçek olduğu) için Spearman seçildi.';
    }
    const fn = method === 'pearson' ? AdvStats.pearson : AdvStats.spearman;
    const symbol = method === 'pearson' ? 'r' : 'ρ';

    const n = used.length;
    const mat = Array.from({ length: n }, () => new Array(n).fill(null));
    const pairs = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const res = fn(used[i].values, used[j].values);
            mat[i][j] = mat[j][i] = res;
            if (res.valid && i > 0) pairs.push({ i, j, res });
        }
    }

    const star = p => (p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : '');
    const head = '<th class="px-2 py-2"></th>' + used.map(v => `<th class="px-2 py-2 font-semibold text-center whitespace-nowrap" title="${advEsc(v.label)}">${v.short}</th>`).join('');
    const rowsHtml = used.map((vi, i) => {
        const cells = used.map((vj, j) => {
            if (i === j) return '<td class="px-2 py-1.5 text-center text-slate-300 dark:text-slate-600">—</td>';
            const res = mat[i][j];
            if (!res || !res.valid) return `<td class="px-2 py-1.5 text-center text-slate-400" title="${advEsc(res ? res.error : '')}">–</td>`;
            const tip = `${vi.short} × ${vj.short}: ${symbol} = ${advNum(res.r, 3)}, p ${res.p < 0.001 ? '< 0.001' : '= ' + res.p.toFixed(3)}, n = ${res.n}`;
            return `<td class="px-2 py-1.5 text-center whitespace-nowrap" style="background:${advCorrColor(res.r)}" title="${tip}">${advNum(res.r)}<span class="text-[10px] align-top">${star(res.p)}</span></td>`;
        }).join('');
        return `<tr><th class="px-2 py-1.5 text-left font-semibold whitespace-nowrap bg-slate-50 dark:bg-slate-900" title="${advEsc(vi.label)}">${vi.short}</th>${cells}</tr>`;
    }).join('');

    const sigPairs = pairs.filter(p => p.res.p < 0.05);
    const top = sigPairs.slice().sort((a, b) => Math.abs(b.res.r) - Math.abs(a.res.r)).slice(0, 5);
    advSummary.corr = {
        symbol, method, total: pairs.length, nSig: sigPairs.length,
        top: top.length ? { a: used[top[0].i].short, b: used[top[0].j].short, r: top[0].res.r, label: AdvStats.correlationLabel(top[0].res.r) } : null
    };
    advSetChip('x-corr', sigPairs.length ? 'green' : 'slate', sigPairs.length + '/' + pairs.length + ' madde çifti anlamlı');
    const topHtml = top.length
        ? `<div class="mt-3"><div class="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">En güçlü 5 ilişki (maddeler arası, p &lt; 0.05)</div>` +
          advTable(['Madde çifti', symbol, advT('p', 'p'), 'n', 'Güç'], top.map(p => advRow([
              `<span title="${advEsc(used[p.i].label)} ↔ ${advEsc(used[p.j].label)}"><b>${used[p.i].short}</b> ↔ <b>${used[p.j].short}</b></span>`,
              advNum(p.res.r, 3), advP(p.res.p), p.res.n, AdvStats.correlationLabel(p.res.r)]))) + '</div>'
        : '';

    body.innerHTML = `
        <div class="text-xs text-slate-500 dark:text-slate-400 mb-2">${advT('Korelasyon', 'corr')} yöntemi: <b>${method === 'pearson' ? 'Pearson r' : 'Spearman ρ'}</b>${method === 'spearman' ? advHelp('spearman') : ''}. ${reason}
            Hücrelerdeki yıldızlar: * p &lt; 0.05, ** p &lt; 0.01, *** p &lt; 0.001 (çoklu karşılaştırma düzeltmesi uygulanmamıştır).
            ${itemVars.length > MAX_ITEMS ? `İlk ${MAX_ITEMS} madde gösterilmektedir.` : ''}</div>
        <div class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 max-h-[520px]">
            <table class="text-xs text-slate-700 dark:text-slate-200"><thead class="bg-slate-50 dark:bg-slate-900 sticky top-0"><tr>${head}</tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-700">${rowsHtml}</tbody></table>
        </div>
        ${topHtml}`;
}

function advRenderChi() {
    const body = document.getElementById('adv-chi-body');
    const c = advCtx;
    if (!body || !c) return;
    const chiChip = document.getElementById('adv-chip-x-chi');
    if (chiChip) chiChip.innerHTML = '';
    delete advSummary.chi;
    const cands = window.groupingCandidates || [];
    if (cands.length < 2) {
        body.innerHTML = advNote('Ki-kare testi için en az 2 kategorik (gruplama) sütunu gerekir.');
        return;
    }
    const A = advState.chiA, B = advState.chiB;
    if (A === 'none' || B === 'none') { body.innerHTML = advNote('Lütfen iki değişken seçin.'); return; }
    if (A === B) { body.innerHTML = advNote('Satır ve sütun için farklı değişkenler seçmelisiniz.', 'warn'); return; }

    const clean = v => (v === undefined || v === null || String(v).trim() === '') ? null : String(v).trim();
    const rowsData = c.rows.filter(r => clean(r[A]) !== null && clean(r[B]) !== null);
    const aVals = [...new Set(rowsData.map(r => clean(r[A])))].sort(advGroupSort);
    const bVals = [...new Set(rowsData.map(r => clean(r[B])))].sort(advGroupSort);
    if (aVals.length > 15 || bVals.length > 15) {
        body.innerHTML = advNote(`Bir değişken 15'ten fazla kategoriye sahip (${aVals.length} × ${bVals.length}); ki-kare için daha az kategorili değişkenler seçin.`, 'warn');
        return;
    }
    const matrix = aVals.map(() => bVals.map(() => 0));
    rowsData.forEach(r => { matrix[aVals.indexOf(clean(r[A]))][bVals.indexOf(clean(r[B]))]++; });
    const res = AdvStats.chiSquareIndependence(matrix);
    const labelOf = key => (cands.find(g => g.key === key) || {}).label || key;
    if (!res.valid) { body.innerHTML = advNote(`Hesaplanamadı: ${advEsc(res.error)}`, 'warn'); return; }

    const tRows = aVals.map((av, i) => {
        const cells = bVals.map((bv, j) => {
            const o = matrix[i][j];
            const pct = res.rowTot[i] ? (o / res.rowTot[i] * 100).toFixed(0) : 0;
            const ar = res.adjResid[i][j];
            const hl = Math.abs(ar) >= 1.96 ? (ar > 0 ? 'background:rgba(59,130,246,0.25)' : 'background:rgba(239,68,68,0.25)') : '';
            return `<td class="px-3 py-2 text-center whitespace-nowrap" style="${hl}" title="Beklenen: ${res.expected[i][j].toFixed(1)} · düzeltilmiş artık: ${ar.toFixed(2)}">${o} <span class="text-[10px] text-slate-500">(%${pct})</span></td>`;
        }).join('');
        return `<tr><th class="px-3 py-2 text-left font-semibold whitespace-nowrap bg-slate-50 dark:bg-slate-900">${advEsc(av)}</th>${cells}<td class="px-3 py-2 text-center font-semibold">${res.rowTot[i]}</td></tr>`;
    }).join('');
    const colTot = '<tr class="bg-slate-50 dark:bg-slate-900 font-semibold"><th class="px-3 py-2 text-left">Toplam</th>' + res.colTot.map(t => `<td class="px-3 py-2 text-center">${t}</td>`).join('') + `<td class="px-3 py-2 text-center">${res.N}</td></tr>`;

    const warns = [];
    if (res.pctLowExpected > 20 || res.minExpected < 1) {
        warns.push(`Beklenen frekansı 5'ten küçük hücre oranı %${res.pctLowExpected.toFixed(0)} (en küçük beklenen = ${res.minExpected.toFixed(2)}). Ki-kare varsayımı zayıf; kategorileri birleştirmeyi düşünün.`);
    }
    const sig = res.p < 0.05;
    const vLabel = AdvStats.effectLabel('V', res.cramersV, { minDimDf: res.minDimDf });
    advSummary.chi = { sig, a: labelOf(A), b: labelOf(B), v: res.cramersV, vLabel };
    advSetChip('x-chi', sig ? 'green' : 'slate', sig ? 'Anlamlı ilişki' : 'Anlamlı ilişki yok');

    body.innerHTML = `
        <div class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table class="w-full text-xs text-slate-700 dark:text-slate-200">
                <thead class="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400"><tr><th class="px-3 py-2 text-left">${advEsc(labelOf(A))} ＼ ${advEsc(labelOf(B))}</th>${bVals.map(b => `<th class="px-3 py-2 text-center whitespace-nowrap">${advEsc(b)}</th>`).join('')}<th class="px-3 py-2 text-center">Toplam</th></tr></thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-700">${tRows}${colTot}</tbody>
            </table>
        </div>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Hücre: gözlenen sayı (satır yüzdesi). Mavi/kırmızı vurgu: düzeltilmiş standart artık |z| ≥ 1.96 (beklenenden anlamlı fazla / az).</p>
        <div class="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div class="flex flex-wrap items-center gap-2 mb-2"><span class="font-bold text-slate-800 dark:text-white">Pearson ki-kare</span>${advSigBadge(res.p)}</div>
            <div class="text-sm text-slate-700 dark:text-slate-200">χ²(${res.df}, N = ${res.N}) = ${advNum(res.chi2, 3)}, ${AdvStats.formatP(res.p)}, ${advT('Cramér V', 'cramer')} = ${advNum(res.cramersV, 3)} <span class="text-xs text-slate-500">(${vLabel})</span></div>
            <div class="text-xs text-slate-500 dark:text-slate-400 mt-2">${advEsc(labelOf(A))} ile ${advEsc(labelOf(B))} arasında ${sig ? 'istatistiksel olarak anlamlı bir ilişki vardır' : 'istatistiksel olarak anlamlı bir ilişki bulunmamıştır'}.</div>
        </div>
        ${warns.map(w => `<div class="mt-2">${advNote(advEsc(w), 'warn')}</div>`).join('')}`;
}
