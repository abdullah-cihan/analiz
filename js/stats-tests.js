// --- ADVANCED STATISTICS ENGINE ---
// Saf (DOM'dan bağımsız) istatistik testleri: normallik, varyans homojenliği, grup karşılaştırmaları,
// post-hoc testler, korelasyon ve ki-kare. Dağılım yardımcıları (standardNormalCdf, regularizedBeta,
// logGamma) statistics.js içinden gelir; bu dosya statistics.js'ten SONRA yüklenmelidir.

const AdvStats = (function () {
    'use strict';

    // ------------------------------------------------------------------ helpers
    const isNum = v => typeof v === 'number' && isFinite(v);
    const clean = arr => (arr || []).filter(isNum);
    const sum = a => a.reduce((s, v) => s + v, 0);
    const mean = a => sum(a) / a.length;
    const variance = (a, m) => {
        if (a.length < 2) return 0;
        const mu = m === undefined ? mean(a) : m;
        return a.reduce((s, v) => s + (v - mu) * (v - mu), 0) / (a.length - 1);
    };

    function quantileSorted(sorted, p) {
        const n = sorted.length;
        if (n === 0) return NaN;
        const idx = p * (n - 1);
        const lo = Math.floor(idx);
        const frac = idx - lo;
        return lo + 1 < n ? sorted[lo] + frac * (sorted[lo + 1] - sorted[lo]) : sorted[lo];
    }

    function median(arr) {
        const s = clean(arr).sort((a, b) => a - b);
        return quantileSorted(s, 0.5);
    }

    // ------------------------------------------------------------------ distributions
    const normCdf = x => standardNormalCdf(x);
    const normSf = x => standardNormalCdf(-x);
    const normPdf = x => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

    // Inverse normal CDF: Abramowitz-Stegun 26.2.23 start + Halley refinement
    function normInv(p) {
        if (p <= 0) return -Infinity;
        if (p >= 1) return Infinity;
        if (p === 0.5) return 0;
        const q = p < 0.5 ? p : 1 - p;
        const t = Math.sqrt(-2 * Math.log(q));
        let x = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) /
            (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
        if (p < 0.5) x = -x;
        for (let i = 0; i < 3; i++) {
            const e = normCdf(x) - p;
            const u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
            x = x - u / (1 + x * u / 2);
        }
        return x;
    }

    const tSf2 = (t, df) => (t === 0 ? 1 : Math.min(1, Math.max(0, regularizedBeta(df / (df + t * t), df / 2, 0.5))));
    const fSf = (f, d1, d2) => (f <= 0 ? 1 : Math.min(1, Math.max(0, regularizedBeta(d2 / (d2 + d1 * f), d2 / 2, d1 / 2))));

    // Two-sided critical t value (alpha = 0.05) by bisection
    function tCritical(df, alpha) {
        const a = alpha === undefined ? 0.05 : alpha;
        let lo = 0, hi = 1000;
        for (let i = 0; i < 90; i++) {
            const mid = (lo + hi) / 2;
            if (tSf2(mid, df) > a) lo = mid; else hi = mid;
        }
        return (lo + hi) / 2;
    }

    // Upper regularized incomplete gamma Q(a, x)
    function gammaQ(a, x) {
        if (x <= 0) return 1;
        const lg = logGamma(a);
        if (x < a + 1) {
            let ap = a, s = 1 / a, del = s;
            for (let n = 0; n < 2000; n++) {
                ap += 1;
                del *= x / ap;
                s += del;
                if (Math.abs(del) < Math.abs(s) * 1e-15) break;
            }
            return Math.max(0, 1 - s * Math.exp(-x + a * Math.log(x) - lg));
        }
        const tiny = 1e-300;
        let b = x + 1 - a, c = 1 / tiny, d = 1 / b, h = d;
        for (let i = 1; i < 2000; i++) {
            const an = -i * (i - a);
            b += 2;
            d = an * d + b; if (Math.abs(d) < tiny) d = tiny;
            c = b + an / c; if (Math.abs(c) < tiny) c = tiny;
            d = 1 / d;
            const del = d * c;
            h *= del;
            if (Math.abs(del - 1) < 1e-15) break;
        }
        return Math.min(1, Math.exp(-x + a * Math.log(x) - lg) * h);
    }
    const chi2Sf = (x, k) => gammaQ(k / 2, x / 2);

    // Studentized range distribution (Tukey): numerical double integration
    const PT_NZ = 170, PT_ZMIN = -8.5, PT_ZMAX = 8.5;
    const PT_HZ = (PT_ZMAX - PT_ZMIN) / PT_NZ;
    const PT_Z = [], PT_PDF = [], PT_CDF = [];
    for (let i = 0; i <= PT_NZ; i++) {
        const z = PT_ZMIN + i * PT_HZ;
        PT_Z.push(z); PT_PDF.push(normPdf(z)); PT_CDF.push(normCdf(z));
    }

    function ptukeyCdf(q, k, df) {
        if (!(q > 0) || k < 2 || df < 1) return 0;
        const W = w => {
            let s = 0;
            for (let i = 0; i <= PT_NZ; i++) {
                const diff = PT_CDF[i] - normCdf(PT_Z[i] - w);
                const v = PT_PDF[i] * Math.pow(diff > 0 ? diff : 0, k - 1);
                s += (i === 0 || i === PT_NZ ? 1 : (i % 2 ? 4 : 2)) * v;
            }
            return Math.min(1, k * s * PT_HZ / 3);
        };
        const lo = Math.max(1e-8, 1 - 8 / Math.sqrt(2 * df));
        const hi = 1 + 12 / Math.sqrt(2 * df);
        const ns = 300, hs = (hi - lo) / ns;
        const lnConst = (df / 2) * Math.log(df) - logGamma(df / 2) - (df / 2 - 1) * Math.LN2;
        let num = 0, den = 0;
        for (let i = 0; i <= ns; i++) {
            const s = lo + i * hs;
            const f = Math.exp(lnConst + (df - 1) * Math.log(s) - df * s * s / 2);
            const coef = (i === 0 || i === ns ? 1 : (i % 2 ? 4 : 2));
            num += coef * f * W(q * s);
            den += coef * f;
        }
        return Math.min(1, Math.max(0, num / den));
    }
    const ptukeySf = (q, k, df) => Math.max(0, 1 - ptukeyCdf(q, k, df));

    // ------------------------------------------------------------------ multiple-comparison corrections
    function holmAdjust(ps) {
        const m = ps.length;
        const order = ps.map((p, i) => i).sort((a, b) => ps[a] - ps[b]);
        const adj = new Array(m);
        let running = 0;
        order.forEach((idx, rank) => {
            running = Math.max(running, Math.min(1, (m - rank) * ps[idx]));
            adj[idx] = running;
        });
        return adj;
    }

    function benjaminiHochberg(ps) {
        const m = ps.length;
        const order = ps.map((p, i) => i).sort((a, b) => ps[b] - ps[a]); // descending
        const adj = new Array(m);
        let running = 1;
        order.forEach((idx, j) => {
            const rank = m - j;
            running = Math.min(running, ps[idx] * m / rank);
            adj[idx] = Math.min(1, running);
        });
        return adj;
    }

    // ------------------------------------------------------------------ ranks
    function rankWithTies(values) {
        const n = values.length;
        const idx = values.map((v, i) => i).sort((a, b) => values[a] - values[b]);
        const ranks = new Array(n);
        let tieTerm = 0;
        let i = 0;
        while (i < n) {
            let j = i;
            while (j < n - 1 && values[idx[j + 1]] === values[idx[i]]) j++;
            const avg = (i + j) / 2 + 1;
            for (let k = i; k <= j; k++) ranks[idx[k]] = avg;
            const t = j - i + 1;
            tieTerm += t * t * t - t;
            i = j + 1;
        }
        return { ranks, tieTerm };
    }

    // ------------------------------------------------------------------ descriptives
    function describe(values) {
        const x = clean(values).sort((a, b) => a - b);
        const n = x.length;
        if (n === 0) return { n: 0 };
        const m = mean(x);
        const sd = Math.sqrt(variance(x, m));
        const d = {
            n, mean: m, sd, se: sd / Math.sqrt(n), min: x[0], max: x[n - 1],
            q1: quantileSorted(x, 0.25), median: quantileSorted(x, 0.5), q3: quantileSorted(x, 0.75),
            skew: null, kurt: null, seSkew: null, seKurt: null, zSkew: null, zKurt: null,
            ciLow: null, ciHigh: null, sorted: x
        };
        d.iqr = d.q3 - d.q1;
        if (n > 1) {
            const tc = tCritical(n - 1);
            d.ciLow = m - tc * d.se;
            d.ciHigh = m + tc * d.se;
        }
        if (n >= 3 && sd > 0) {
            let m2 = 0, m3 = 0, m4 = 0;
            x.forEach(v => { const dv = v - m; m2 += dv * dv; m3 += dv * dv * dv; m4 += dv * dv * dv * dv; });
            m2 /= n; m3 /= n; m4 /= n;
            const g1 = m3 / Math.pow(m2, 1.5);
            d.skew = g1 * Math.sqrt(n * (n - 1)) / (n - 2);                 // SPSS G1
            d.seSkew = Math.sqrt(6 * n * (n - 1) / ((n - 2) * (n + 1) * (n + 3)));
            d.zSkew = d.skew / d.seSkew;
            if (n >= 4) {
                const g2 = m4 / (m2 * m2) - 3;
                d.kurt = (n - 1) / ((n - 2) * (n - 3)) * ((n + 1) * g2 + 6);   // SPSS G2 (excess)
                d.seKurt = 2 * d.seSkew * Math.sqrt((n * n - 1) / ((n - 3) * (n + 5)));
                d.zKurt = d.kurt / d.seKurt;
            }
        }
        return d;
    }

    // ------------------------------------------------------------------ Shapiro-Wilk (Royston 1995, AS R94)
    function poly(cc, x) {
        let r = 0;
        for (let i = cc.length - 1; i >= 0; i--) r = r * x + cc[i];
        return r;
    }

    function shapiroWilk(values) {
        const x = clean(values).sort((a, b) => a - b);
        const n = x.length;
        if (n < 3) return { valid: false, error: 'En az 3 gözlem gerekli' };
        if (n > 5000) return { valid: false, error: 'Shapiro-Wilk n ≤ 5000 için geçerlidir' };
        if (x[n - 1] - x[0] < 1e-12) return { valid: false, error: 'Tüm değerler aynı' };

        const nn2 = Math.floor(n / 2);
        const a = new Array(nn2 + 1).fill(0);
        if (n === 3) {
            a[1] = Math.SQRT1_2;
        } else {
            const an25 = n + 0.25;
            const m = new Array(nn2 + 1).fill(0);
            let summ2 = 0;
            for (let i = 1; i <= nn2; i++) {
                m[i] = normInv((i - 0.375) / an25);
                summ2 += m[i] * m[i];
            }
            summ2 *= 2;
            const ssumm2 = Math.sqrt(summ2);
            const rsn = 1 / Math.sqrt(n);
            const c1 = [0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056];
            const c2 = [0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633];
            const a1 = poly(c1, rsn) - m[1] / ssumm2;
            let i1, fac;
            if (n > 5) {
                i1 = 3;
                const a2 = -m[2] / ssumm2 + poly(c2, rsn);
                fac = Math.sqrt((summ2 - 2 * m[1] * m[1] - 2 * m[2] * m[2]) / (1 - 2 * a1 * a1 - 2 * a2 * a2));
                a[2] = a2;
            } else {
                i1 = 2;
                fac = Math.sqrt((summ2 - 2 * m[1] * m[1]) / (1 - 2 * a1 * a1));
            }
            a[1] = a1;
            for (let i = i1; i <= nn2; i++) a[i] = -m[i] / fac;
        }

        const mu = mean(x);
        let ss = 0;
        x.forEach(v => { ss += (v - mu) * (v - mu); });
        let num = 0;
        for (let i = 1; i <= nn2; i++) num += a[i] * (x[n - i] - x[i - 1]);
        let W = (num * num) / ss;
        if (W > 1) W = 1;

        // p-value
        let p;
        if (n === 3) {
            p = 6 / Math.PI * (Math.asin(Math.sqrt(W)) - Math.PI / 3);
            p = Math.max(0, Math.min(1, p));
        } else {
            const w1 = 1 - W;
            let y = Math.log(w1);
            let mm, s;
            if (n <= 11) {
                const gamma = poly([-2.273, 0.459], n);
                if (y >= gamma) {
                    p = 1e-99;
                    return { valid: true, W, p, n };
                }
                y = -Math.log(gamma - y);
                mm = poly([0.544, -0.39978, 0.025054, -6.714e-4], n);
                s = Math.exp(poly([1.3822, -0.77857, 0.062767, -0.0020322], n));
            } else {
                const xx = Math.log(n);
                mm = poly([-1.5861, -0.31082, -0.083751, 0.0038915], xx);
                s = Math.exp(poly([-0.4803, -0.082676, 0.0030302], xx));
            }
            p = normSf((y - mm) / s);
        }
        return { valid: true, W, p: Math.max(0, Math.min(1, p)), n };
    }

    // Normallik kararı: küçük örneklemde Shapiro-Wilk, orta/büyük örneklemde çarpıklık-basıklık (Kim, 2013)
    function normalityDecision(desc, sw) {
        if (!desc || desc.n < 3 || !(desc.sd > 0)) {
            return { testable: false, normal: false, basis: 'Test edilemedi (n < 3 veya tüm değerler aynı)' };
        }
        if (desc.n <= 50 && sw && sw.valid) {
            const ok = sw.p >= 0.05;
            return { testable: true, normal: ok, basis: `n ≤ 50 → Shapiro-Wilk (p ${ok ? '≥' : '<'} 0.05)` };
        }
        if (desc.n < 300 && desc.zSkew !== null && desc.zKurt !== null) {
            const ok = Math.abs(desc.zSkew) < 3.29 && Math.abs(desc.zKurt) < 3.29;
            return { testable: true, normal: ok, basis: `50 < n < 300 → |z çarpıklık| ve |z basıklık| ${ok ? '<' : '≥'} 3.29` };
        }
        if (desc.skew !== null && desc.kurt !== null) {
            const ok = Math.abs(desc.skew) < 2 && Math.abs(desc.kurt) < 7;
            return { testable: true, normal: ok, basis: `n ≥ 300 → |çarpıklık| < 2 ve |basıklık| < 7 ${ok ? '(sağlandı)' : '(sağlanmadı)'}` };
        }
        if (sw && sw.valid) {
            const ok = sw.p >= 0.05;
            return { testable: true, normal: ok, basis: `Shapiro-Wilk (p ${ok ? '≥' : '<'} 0.05)` };
        }
        return { testable: false, normal: false, basis: 'Test edilemedi' };
    }

    // ------------------------------------------------------------------ Levene (Brown-Forsythe, median merkezli)
    function levene(groups) {
        const gs = groups.map(clean).filter(g => g.length >= 2);
        if (gs.length < 2) return { valid: false, error: 'En az 2 grup (her birinde n ≥ 2) gerekli' };
        const z = gs.map(g => { const med = median(g); return g.map(v => Math.abs(v - med)); });
        const res = oneWayAnova(z);
        if (!res.valid) return { valid: false, error: res.error };
        return { valid: true, F: res.F, df1: res.dfBetween, df2: res.dfWithin, p: res.p, equal: res.p >= 0.05 };
    }

    // ------------------------------------------------------------------ two-group tests
    function welchT(sampleA, sampleB) {
        const a = clean(sampleA), b = clean(sampleB);
        const n1 = a.length, n2 = b.length;
        if (n1 < 2 || n2 < 2) return { valid: false, error: 'Her grupta en az 2 gözlem gerekli' };
        const m1 = mean(a), m2 = mean(b);
        const v1 = variance(a, m1), v2 = variance(b, m2);
        const se2 = v1 / n1 + v2 / n2;
        const diff = m1 - m2;
        if (se2 === 0) {
            if (diff !== 0) return { valid: false, error: 'Gruplar içi varyans sıfır' };
            return { valid: true, t: 0, df: n1 + n2 - 2, p: 1, diff: 0, ciLow: 0, ciHigh: 0, d: 0, g: 0, m1, m2 };
        }
        const se = Math.sqrt(se2);
        const t = diff / se;
        const df = (se2 * se2) / ((v1 / n1) * (v1 / n1) / (n1 - 1) + (v2 / n2) * (v2 / n2) / (n2 - 1));
        const p = tSf2(Math.abs(t), df);
        const tc = tCritical(df);
        const sp = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
        const d = sp > 0 ? diff / sp : 0;
        const g = d * (1 - 3 / (4 * (n1 + n2) - 9));
        return { valid: true, t, df, p, diff, ciLow: diff - tc * se, ciHigh: diff + tc * se, d, g, m1, m2, n1, n2 };
    }

    function mannWhitney(sampleA, sampleB) {
        const a = clean(sampleA), b = clean(sampleB);
        const n1 = a.length, n2 = b.length;
        if (n1 < 2 || n2 < 2) return { valid: false, error: 'Her grupta en az 2 gözlem gerekli' };
        const { ranks, tieTerm } = rankWithTies(a.concat(b));
        let r1 = 0;
        for (let i = 0; i < n1; i++) r1 += ranks[i];
        const u1 = r1 - n1 * (n1 + 1) / 2;
        const u2 = n1 * n2 - u1;
        const N = n1 + n2;
        const mu = n1 * n2 / 2;
        const sigma = Math.sqrt(n1 * n2 / 12 * ((N + 1) - tieTerm / (N * (N - 1))));
        if (!(sigma > 0)) return { valid: false, error: 'Tüm değerler aynı' };
        const zRaw = (u1 - mu) / sigma;
        const zCc = Math.max(0, Math.abs(u1 - mu) - 0.5) / sigma;       // continuity corrected
        const p = Math.min(1, 2 * normSf(zCc));
        return {
            valid: true, u: Math.min(u1, u2), u1, u2, z: zRaw, p,
            rankBiserial: 2 * u1 / (n1 * n2) - 1,
            rEffect: Math.abs(zRaw) / Math.sqrt(N),
            meanRank1: r1 / n1, meanRank2: (sum(ranks) - r1) / n2, n1, n2
        };
    }

    // ------------------------------------------------------------------ k-group tests
    function oneWayAnova(groupsArr) {
        const gs = groupsArr.map(clean).filter(g => g.length > 0);
        const k = gs.length;
        if (k < 2) return { valid: false, error: 'En az 2 grup gerekli' };
        const N = gs.reduce((s, g) => s + g.length, 0);
        if (N <= k) return { valid: false, error: 'Gruplarda yeterli gözlem yok' };
        const grand = sum(gs.map(sum)) / N;
        let ssb = 0, ssw = 0;
        gs.forEach(g => {
            const m = mean(g);
            ssb += g.length * (m - grand) * (m - grand);
            g.forEach(v => { ssw += (v - m) * (v - m); });
        });
        const dfb = k - 1, dfw = N - k;
        const msb = ssb / dfb, msw = ssw / dfw;
        if (!(msw > 0)) return { valid: false, error: 'Gruplar içi varyans sıfır' };
        const F = msb / msw;
        return {
            valid: true, F, dfBetween: dfb, dfWithin: dfw, p: fSf(F, dfb, dfw), msw, ssb, ssw,
            eta2: ssb / (ssb + ssw),
            omega2: Math.max(0, (ssb - dfb * msw) / (ssb + ssw + msw))
        };
    }

    function welchAnova(groupsArr) {
        const gs = groupsArr.map(clean).filter(g => g.length >= 2);
        const k = gs.length;
        if (k < 2) return { valid: false, error: 'En az 2 grup (n ≥ 2) gerekli' };
        const ns = gs.map(g => g.length), ms = gs.map(mean), vs = gs.map((g, i) => variance(g, ms[i]));
        if (vs.some(v => !(v > 0))) return { valid: false, error: 'Bir grupta varyans sıfır' };
        const w = ns.map((n, i) => n / vs[i]);
        const W = sum(w);
        const mw = sum(w.map((wi, i) => wi * ms[i])) / W;
        const A = sum(w.map((wi, i) => wi * (ms[i] - mw) * (ms[i] - mw))) / (k - 1);
        const h = sum(w.map((wi, i) => Math.pow(1 - wi / W, 2) / (ns[i] - 1)));
        const B = 1 + 2 * (k - 2) / (k * k - 1) * h;
        const F = A / B;
        const df1 = k - 1, df2 = (k * k - 1) / (3 * h);
        const classic = oneWayAnova(gs);
        return {
            valid: true, F, dfBetween: df1, dfWithin: df2, p: fSf(F, df1, df2),
            omega2: classic.valid ? classic.omega2 : null, eta2: classic.valid ? classic.eta2 : null
        };
    }

    function kruskalWallis(groupsArr) {
        const gs = groupsArr.map(clean).filter(g => g.length > 0);
        const k = gs.length;
        if (k < 2) return { valid: false, error: 'En az 2 grup gerekli' };
        const all = [].concat(...gs);
        const N = all.length;
        const { ranks, tieTerm } = rankWithTies(all);
        let pos = 0, h = 0;
        const rankSums = [];
        gs.forEach(g => {
            let rs = 0;
            for (let i = 0; i < g.length; i++) rs += ranks[pos + i];
            pos += g.length;
            rankSums.push(rs);
            h += rs * rs / g.length;
        });
        h = 12 / (N * (N + 1)) * h - 3 * (N + 1);
        const corr = 1 - tieTerm / (N * N * N - N);
        if (!(corr > 0)) return { valid: false, error: 'Tüm değerler aynı' };
        const H = h / corr;
        const df = k - 1;
        return {
            valid: true, H, df, p: chi2Sf(H, df), epsilon2: Math.min(1, Math.max(0, H / (N - 1))),
            meanRanks: rankSums.map((rs, i) => rs / gs[i].length), N, tieTerm
        };
    }

    // ------------------------------------------------------------------ post-hoc
    function tukeyKramer(namesArr, groupsArr) {
        const idx = groupsArr.map((g, i) => i).filter(i => clean(groupsArr[i]).length >= 2);
        const gs = idx.map(i => clean(groupsArr[i])), names = idx.map(i => namesArr[i]);
        const an = oneWayAnova(gs);
        if (!an.valid) return [];
        const k = gs.length, out = [];
        for (let i = 0; i < k; i++) {
            for (let j = i + 1; j < k; j++) {
                const diff = mean(gs[i]) - mean(gs[j]);
                const se = Math.sqrt(an.msw / 2 * (1 / gs[i].length + 1 / gs[j].length));
                const q = Math.abs(diff) / se;
                const p = ptukeySf(q, k, an.dfWithin);
                out.push({ a: names[i], b: names[j], diff, stat: q, statName: 'q', p, pAdj: p });
            }
        }
        return out;
    }

    function gamesHowell(namesArr, groupsArr) {
        const idx = groupsArr.map((g, i) => i).filter(i => clean(groupsArr[i]).length >= 2);
        const gs = idx.map(i => clean(groupsArr[i])), names = idx.map(i => namesArr[i]);
        const k = gs.length, out = [];
        const ms = gs.map(mean), vs = gs.map((g, i) => variance(g, ms[i]));
        for (let i = 0; i < k; i++) {
            for (let j = i + 1; j < k; j++) {
                const se2 = vs[i] / gs[i].length + vs[j] / gs[j].length;
                if (!(se2 > 0)) continue;
                const t = Math.abs(ms[i] - ms[j]) / Math.sqrt(se2);
                const df = se2 * se2 / (Math.pow(vs[i] / gs[i].length, 2) / (gs[i].length - 1) +
                    Math.pow(vs[j] / gs[j].length, 2) / (gs[j].length - 1));
                const p = ptukeySf(t * Math.SQRT2, k, df);
                out.push({ a: names[i], b: names[j], diff: ms[i] - ms[j], stat: t * Math.SQRT2, statName: 'q', p, pAdj: p });
            }
        }
        return out;
    }

    function dunnTest(namesArr, groupsArr) {
        const idx = groupsArr.map((g, i) => i).filter(i => clean(groupsArr[i]).length >= 1);
        const gs = idx.map(i => clean(groupsArr[i])), names = idx.map(i => namesArr[i]);
        const all = [].concat(...gs);
        const N = all.length;
        const { ranks, tieTerm } = rankWithTies(all);
        let pos = 0;
        const meanRanks = gs.map(g => {
            let rs = 0;
            for (let i = 0; i < g.length; i++) rs += ranks[pos + i];
            pos += g.length;
            return rs / g.length;
        });
        const varTerm = N * (N + 1) / 12 - tieTerm / (12 * (N - 1));
        const out = [];
        for (let i = 0; i < gs.length; i++) {
            for (let j = i + 1; j < gs.length; j++) {
                const sigma = Math.sqrt(varTerm * (1 / gs[i].length + 1 / gs[j].length));
                if (!(sigma > 0)) continue;
                const z = (meanRanks[i] - meanRanks[j]) / sigma;
                const p = Math.min(1, 2 * normSf(Math.abs(z)));
                out.push({ a: names[i], b: names[j], diff: meanRanks[i] - meanRanks[j], stat: z, statName: 'z', p });
            }
        }
        const adj = holmAdjust(out.map(o => o.p));
        out.forEach((o, i) => { o.pAdj = adj[i]; });
        return out;
    }

    // ------------------------------------------------------------------ correlation
    function pearson(xs, ys) {
        const pairs = [];
        const len = Math.min(xs.length, ys.length);
        for (let i = 0; i < len; i++) if (isNum(xs[i]) && isNum(ys[i])) pairs.push([xs[i], ys[i]]);
        const n = pairs.length;
        if (n < 3) return { valid: false, n, error: 'En az 3 çift gözlem gerekli' };
        const mx = mean(pairs.map(p => p[0])), my = mean(pairs.map(p => p[1]));
        let sxy = 0, sxx = 0, syy = 0;
        pairs.forEach(([x, y]) => { sxy += (x - mx) * (y - my); sxx += (x - mx) * (x - mx); syy += (y - my) * (y - my); });
        if (!(sxx > 0) || !(syy > 0)) return { valid: false, n, error: 'Değişkenlerden biri sabit' };
        let r = sxy / Math.sqrt(sxx * syy);
        r = Math.max(-1, Math.min(1, r));
        const df = n - 2;
        const p = Math.abs(r) >= 1 ? 0 : tSf2(Math.abs(r) * Math.sqrt(df / (1 - r * r)), df);
        let ciLow = null, ciHigh = null;
        if (n > 3 && Math.abs(r) < 1) {
            const z = Math.atanh(r), se = 1 / Math.sqrt(n - 3);
            ciLow = Math.tanh(z - 1.959964 * se);
            ciHigh = Math.tanh(z + 1.959964 * se);
        }
        return { valid: true, r, n, df, p, ciLow, ciHigh };
    }

    function spearman(xs, ys) {
        const px = [], py = [];
        const len = Math.min(xs.length, ys.length);
        for (let i = 0; i < len; i++) if (isNum(xs[i]) && isNum(ys[i])) { px.push(xs[i]); py.push(ys[i]); }
        if (px.length < 3) return { valid: false, n: px.length, error: 'En az 3 çift gözlem gerekli' };
        return pearson(rankWithTies(px).ranks, rankWithTies(py).ranks);
    }

    // ------------------------------------------------------------------ chi-square independence
    function chiSquareIndependence(matrix) {
        const R = matrix.length, C = R ? matrix[0].length : 0;
        if (R < 2 || C < 2) return { valid: false, error: 'En az 2×2 tablo gerekli' };
        const rowTot = matrix.map(sum);
        const colTot = [];
        for (let j = 0; j < C; j++) colTot.push(sum(matrix.map(r => r[j])));
        const N = sum(rowTot);
        if (N === 0) return { valid: false, error: 'Veri yok' };
        if (rowTot.some(v => v === 0) || colTot.some(v => v === 0)) {
            return { valid: false, error: 'Boş satır/sütun var' };
        }
        let chi2 = 0, minExp = Infinity, low = 0;
        const expected = [], adjResid = [];
        for (let i = 0; i < R; i++) {
            expected.push([]); adjResid.push([]);
            for (let j = 0; j < C; j++) {
                const e = rowTot[i] * colTot[j] / N;
                expected[i].push(e);
                chi2 += Math.pow(matrix[i][j] - e, 2) / e;
                if (e < minExp) minExp = e;
                if (e < 5) low++;
                adjResid[i].push((matrix[i][j] - e) / Math.sqrt(e * (1 - rowTot[i] / N) * (1 - colTot[j] / N)));
            }
        }
        const df = (R - 1) * (C - 1);
        const minDim = Math.min(R - 1, C - 1);
        return {
            valid: true, chi2, df, p: chi2Sf(chi2, df), N, expected, adjResid, rowTot, colTot,
            cramersV: Math.sqrt(chi2 / (N * minDim)), minDimDf: minDim,
            minExpected: minExp, pctLowExpected: low / (R * C) * 100
        };
    }

    // ------------------------------------------------------------------ interpretation helpers
    function effectLabel(kind, v, extra) {
        const x = Math.abs(v);
        let cuts;
        if (kind === 'd' || kind === 'g') cuts = [0.2, 0.5, 0.8];
        else if (kind === 'r') cuts = [0.1, 0.3, 0.5];
        else if (kind === 'V') {
            const df = (extra && extra.minDimDf) || 1;
            cuts = df === 1 ? [0.1, 0.3, 0.5] : (df === 2 ? [0.07, 0.21, 0.35] : [0.06, 0.17, 0.29]);
        } else cuts = [0.01, 0.06, 0.14];            // eta², omega², epsilon²
        if (x < cuts[0]) return 'ihmal edilebilir';
        if (x < cuts[1]) return 'küçük';
        if (x < cuts[2]) return 'orta';
        return 'büyük';
    }

    function correlationLabel(r) {
        const x = Math.abs(r);
        if (x < 0.1) return 'ihmal edilebilir';
        if (x < 0.3) return 'zayıf';
        if (x < 0.5) return 'orta';
        return 'güçlü';
    }

    function formatP(p) {
        if (p === null || p === undefined || isNaN(p)) return '–';
        return p < 0.001 ? 'p < 0.001' : `p = ${p.toFixed(3)}`;
    }

    const fmt = (v, d) => (v === null || v === undefined || isNaN(v) ? '–' : v.toFixed(d === undefined ? 2 : d));

    // ------------------------------------------------------------------ test selection logic
    const TEST_INFO = {
        welch: { label: "Welch t-testi", posthoc: null },
        mannwhitney: { label: 'Mann-Whitney U testi', posthoc: null },
        anova: { label: 'Tek yönlü ANOVA', posthoc: 'Tukey-Kramer' },
        welchanova: { label: 'Welch ANOVA', posthoc: 'Games-Howell' },
        kruskal: { label: 'Kruskal-Wallis H testi', posthoc: 'Dunn (Holm düzeltmeli)' }
    };

    // groupInfos: [{ name, n, decision: {normal, testable} }]
    function recommendTest(groupInfos, leveneRes) {
        const k = groupInfos.length;
        const reasons = [];
        const allNormal = groupInfos.every(g => g.decision && g.decision.normal);
        const nonNormal = groupInfos.filter(g => !(g.decision && g.decision.normal)).map(g => g.name);
        if (k < 2) return { key: null, reasons: ['Karşılaştırma için en az 2 grup gerekli.'] };

        reasons.push(allNormal
            ? 'Tüm gruplarda dağılım normal kabul edildi.'
            : `Normal dağılmayan grup(lar): ${nonNormal.join(', ')}.`);

        if (k === 2) {
            if (allNormal) {
                reasons.push('Welch t-testi varyans eşitliği varsayımı gerektirmez, bu yüzden Student t yerine tercih edilir.');
                return { key: 'welch', reasons };
            }
            reasons.push('Normallik sağlanmadığı için parametrik olmayan Mann-Whitney U testi önerilir.');
            return { key: 'mannwhitney', reasons };
        }
        if (!allNormal) {
            reasons.push('Normallik sağlanmadığı için parametrik olmayan Kruskal-Wallis testi ve Dunn post-hoc önerilir.');
            return { key: 'kruskal', reasons };
        }
        if (leveneRes && leveneRes.valid) {
            if (leveneRes.equal) {
                reasons.push(`Varyanslar homojen (Levene ${formatP(leveneRes.p)}).`);
                return { key: 'anova', reasons };
            }
            reasons.push(`Varyanslar homojen değil (Levene ${formatP(leveneRes.p)}) → Welch ANOVA ve Games-Howell önerilir.`);
            return { key: 'welchanova', reasons };
        }
        reasons.push('Varyans homojenliği test edilemedi; güvenli seçenek olarak Welch ANOVA önerilir.');
        return { key: 'welchanova', reasons };
    }

    // groupsMap: { name: [values] } → seçilen test (key) sonucu
    function runComparison(groupsMap, key) {
        const names = Object.keys(groupsMap);
        const arrs = names.map(n => clean(groupsMap[n]));
        const info = TEST_INFO[key];
        if (!info) return { valid: false, error: 'Bilinmeyen test' };
        const base = { key, label: info.label, posthocLabel: info.posthoc };
        let r;

        if (key === 'welch') {
            if (names.length !== 2) return Object.assign(base, { valid: false, error: 'Tam 2 grup gerekli' });
            r = welchT(arrs[0], arrs[1]);
            if (!r.valid) return Object.assign(base, { valid: false, error: r.error });
            return Object.assign(base, {
                valid: true, statName: 't', stat: r.t, dfText: fmt(r.df, 2), p: r.p,
                effect: { name: "Cohen d", kind: 'd', value: r.d, label: effectLabel('d', r.d) },
                detail: { diff: r.diff, ciLow: r.ciLow, ciHigh: r.ciHigh, hedgesG: r.g, raw: r },
                apa: `t(${fmt(r.df, 1)}) = ${fmt(r.t, 2)}, ${formatP(r.p)}, d = ${fmt(r.d, 2)}`
            });
        }
        if (key === 'mannwhitney') {
            if (names.length !== 2) return Object.assign(base, { valid: false, error: 'Tam 2 grup gerekli' });
            r = mannWhitney(arrs[0], arrs[1]);
            if (!r.valid) return Object.assign(base, { valid: false, error: r.error });
            return Object.assign(base, {
                valid: true, statName: 'U', stat: r.u, dfText: '–', p: r.p, z: r.z,
                effect: { name: 'Rank-biserial r', kind: 'r', value: r.rankBiserial, label: effectLabel('r', r.rankBiserial) },
                detail: { z: r.z, meanRank1: r.meanRank1, meanRank2: r.meanRank2, raw: r },
                apa: `U = ${fmt(r.u, 1)}, z = ${fmt(r.z, 2)}, ${formatP(r.p)}, r = ${fmt(r.rankBiserial, 2)}`
            });
        }
        if (key === 'anova' || key === 'welchanova') {
            if (names.length < 3) return Object.assign(base, { valid: false, error: 'En az 3 grup gerekli' });
            r = key === 'anova' ? oneWayAnova(arrs) : welchAnova(arrs);
            if (!r.valid) return Object.assign(base, { valid: false, error: r.error });
            const dfText = key === 'anova' ? `${r.dfBetween}, ${r.dfWithin}` : `${r.dfBetween}, ${fmt(r.dfWithin, 1)}`;
            const post = key === 'anova' ? tukeyKramer(names, arrs) : gamesHowell(names, arrs);
            return Object.assign(base, {
                valid: true, statName: 'F', stat: r.F, dfText, p: r.p,
                effect: { name: 'ω² (omega kare)', kind: 'eta', value: r.omega2, label: effectLabel('eta', r.omega2) },
                detail: { eta2: r.eta2, omega2: r.omega2, raw: r },
                posthoc: post,
                apa: `F(${dfText}) = ${fmt(r.F, 2)}, ${formatP(r.p)}, ω² = ${fmt(r.omega2, 3)}`
            });
        }
        if (key === 'kruskal') {
            if (names.length < 3) return Object.assign(base, { valid: false, error: 'En az 3 grup gerekli' });
            r = kruskalWallis(arrs);
            if (!r.valid) return Object.assign(base, { valid: false, error: r.error });
            return Object.assign(base, {
                valid: true, statName: 'H', stat: r.H, dfText: String(r.df), p: r.p,
                effect: { name: 'ε² (epsilon kare)', kind: 'eta', value: r.epsilon2, label: effectLabel('eta', r.epsilon2) },
                detail: { meanRanks: r.meanRanks, raw: r },
                posthoc: dunnTest(names, arrs),
                apa: `H(${r.df}) = ${fmt(r.H, 2)}, ${formatP(r.p)}, ε² = ${fmt(r.epsilon2, 3)}`
            });
        }
        return Object.assign(base, { valid: false, error: 'Desteklenmeyen test' });
    }

    // Bir değişkeni (ölçek puanı veya madde) tüm örneklemde ve her grupta normallik + varyans açısından analiz eder.
    // allValues: tüm örneklem değerleri; groupsMap: { name: [values] } (gruplama yoksa boş obje)
    function analyzeVariable(allValues, groupsMap) {
        const descAll = describe(allValues);
        const swAll = shapiroWilk(allValues);
        const decAll = normalityDecision(descAll, swAll);
        const groupNames = Object.keys(groupsMap || {});
        const groups = groupNames.map(name => {
            const vals = clean(groupsMap[name]);
            const d = describe(vals);
            const sw = shapiroWilk(vals);
            return { name, n: vals.length, desc: d, sw, decision: normalityDecision(d, sw) };
        });
        const usable = groups.filter(g => g.n >= 2);
        const lev = usable.length >= 2 ? levene(usable.map(g => groupsMap[g.name])) : { valid: false, error: 'Grup yok' };
        const allNormal = usable.length > 0 && usable.every(g => g.decision.normal);
        return { descAll, swAll, decAll, groups, usable, levene: lev, allNormal };
    }

    return {
        // distributions
        normCdf, normSf, normInv, tSf2, fSf, chi2Sf, ptukeySf, ptukeyCdf, tCritical,
        // corrections
        holmAdjust, benjaminiHochberg,
        // building blocks
        describe, shapiroWilk, normalityDecision, levene, rankWithTies,
        welchT, mannWhitney, oneWayAnova, welchAnova, kruskalWallis,
        tukeyKramer, gamesHowell, dunnTest,
        pearson, spearman, chiSquareIndependence,
        // interpretation
        effectLabel, correlationLabel, formatP, fmt, median, TEST_INFO,
        // high-level
        recommendTest, runComparison, analyzeVariable
    };
})();
