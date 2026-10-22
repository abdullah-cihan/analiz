// --- STATISTICS MODULE ---
// Advanced Academic Survey Statistics: Reliability, Parametric & Non-Parametric Hypotheses Tests

/**
 * Cronbach's Alpha (İç Tutarlılık / Güvenilirlik Analizi)
 */
function calculateCronbachAlpha(data) {
    if (!data || data.length < 2 || !Array.isArray(questionList) || questionList.length < 2) return 0;

    const n = data.length;
    const k = questionList.length;

    // 1. Calculate Item Variances
    let sumItemVariances = 0;
    questionList.forEach((_, i) => {
        const qKey = `Q${i + 1}`;
        const values = data.map(r => r[qKey]).filter(v => typeof v === 'number' && !isNaN(v));
        if (values.length > 1) {
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (values.length - 1); // Sample variance
            sumItemVariances += variance;
        }
    });

    // 2. Calculate Total Score Variance
    const totalScores = data.map(row => {
        return questionList.reduce((acc, _, i) => {
            const val = row[`Q${i + 1}`];
            return acc + (typeof val === 'number' && !isNaN(val) ? val : 0);
        }, 0);
    });

    const meanTotal = totalScores.reduce((a, b) => a + b, 0) / n;
    const varTotal = totalScores.reduce((a, b) => a + Math.pow(b - meanTotal, 2), 0) / (n - 1);

    if (varTotal === 0) return 0;

    // 3. Formula
    let alpha = (k / (k - 1)) * (1 - (sumItemVariances / varTotal));
    
    // Clamp to 0 minimum because negative reliability indicates reversed/random items which is equivalent to 0 reliability for users
    if (alpha < 0) alpha = 0;
    
    return alpha;
}

/**
 * Betimsel İstatistikler (Descriptive Statistics)
 */
function calculateDescriptiveStats(values) {
    const nums = (values || []).filter(v => typeof v === 'number' && !isNaN(v)).sort((a, b) => a - b);
    const n = nums.length;
    if (n === 0) {
        return { n: 0, mean: 0, median: 0, std: 0, variance: 0, min: 0, max: 0, q1: 0, q3: 0, iqr: 0 };
    }

    const mean = nums.reduce((a, b) => a + b, 0) / n;
    const variance = n > 1 ? nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1) : 0;
    const std = Math.sqrt(variance);

    const getPercentile = (p) => {
        const index = p * (n - 1);
        const lower = Math.floor(index);
        const fraction = index - lower;
        if (lower + 1 < n) {
            return nums[lower] + fraction * (nums[lower + 1] - nums[lower]);
        }
        return nums[lower];
    };

    const median = getPercentile(0.5);
    const q1 = getPercentile(0.25);
    const q3 = getPercentile(0.75);

    return {
        n,
        mean: parseFloat(mean.toFixed(2)),
        median: parseFloat(median.toFixed(2)),
        std: parseFloat(std.toFixed(2)),
        variance: parseFloat(variance.toFixed(2)),
        min: nums[0],
        max: nums[n - 1],
        q1: parseFloat(q1.toFixed(2)),
        q3: parseFloat(q3.toFixed(2)),
        iqr: parseFloat((q3 - q1).toFixed(2))
    };
}

/**
 * Welch's Two-Sample T-Test (Eşit Olmayan Varyanslar için T-Testi) & Cohen's d (Etki Büyüklüğü)
 */
function calculateTTest(sample1, sample2) {
    const s1 = (sample1 || []).filter(v => typeof v === 'number' && !isNaN(v));
    const s2 = (sample2 || []).filter(v => typeof v === 'number' && !isNaN(v));

    const n1 = s1.length;
    const n2 = s2.length;

    if (n1 < 2 || n2 < 2) {
        return { valid: false, error: "Yetersiz örneklem (her grupta en az 2 gözlem gerekli)" };
    }

    const m1 = s1.reduce((a, b) => a + b, 0) / n1;
    const m2 = s2.reduce((a, b) => a + b, 0) / n2;

    const v1 = s1.reduce((a, b) => a + Math.pow(b - m1, 2), 0) / (n1 - 1);
    const v2 = s2.reduce((a, b) => a + Math.pow(b - m2, 2), 0) / (n2 - 1);

    const se = Math.sqrt((v1 / n1) + (v2 / n2));
    if (se === 0) {
        return {
            valid: true,
            t: 0,
            df: n1 + n2 - 2,
            pValue: 1,
            mean1: m1,
            mean2: m2,
            diff: 0,
            cohensD: 0,
            isSignificant: false,
            significanceLabel: "Anlamsız (p ≥ 0.05)"
        };
    }

    const t = (m1 - m2) / se;

    // Welch–Satterthwaite equation for degrees of freedom
    const numerator = Math.pow((v1 / n1) + (v2 / n2), 2);
    const denominator = (Math.pow(v1 / n1, 2) / (n1 - 1)) + (Math.pow(v2 / n2, 2) / (n2 - 1));
    const df = denominator > 0 ? numerator / denominator : (n1 + n2 - 2);

    // Cohen's d pooled standard deviation
    const sPooled = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
    const cohensD = sPooled > 0 ? (m1 - m2) / sPooled : 0;

    // P-value approximation using normal/Student-t distribution
    const pValue = getTwoTailedPValue(Math.abs(t), df);
    const isSignificant = pValue < 0.05;

    let effectSizeCategory = "İhmal Edilebilir";
    const absD = Math.abs(cohensD);
    if (absD >= 0.8) effectSizeCategory = "Büyük Etki";
    else if (absD >= 0.5) effectSizeCategory = "Orta Etki";
    else if (absD >= 0.2) effectSizeCategory = "Küçük Etki";

    return {
        valid: true,
        t: parseFloat(t.toFixed(3)),
        df: parseFloat(df.toFixed(1)),
        pValue: pValue < 0.001 ? 0.001 : parseFloat(pValue.toFixed(4)),
        pValueFormatted: pValue < 0.001 ? "p < 0.001" : `p = ${pValue.toFixed(3)}`,
        mean1: parseFloat(m1.toFixed(2)),
        mean2: parseFloat(m2.toFixed(2)),
        diff: parseFloat((m1 - m2).toFixed(2)),
        cohensD: parseFloat(cohensD.toFixed(2)),
        effectSizeCategory,
        isSignificant,
        significanceLabel: isSignificant ? "İstatistiki Olarak Anlamlı (p < 0.05)" : "Anlamlı Fark Yok (p ≥ 0.05)"
    };
}

/**
 * Mann-Whitney U Testi (Parametrik Olmayan İki Grup Sıralama Testi - Likert Ölçekleri için İdeal)
 */
function calculateMannWhitneyU(sample1, sample2) {
    const s1 = (sample1 || []).filter(v => typeof v === 'number' && !isNaN(v));
    const s2 = (sample2 || []).filter(v => typeof v === 'number' && !isNaN(v));

    const n1 = s1.length;
    const n2 = s2.length;

    if (n1 < 3 || n2 < 3) {
        return { valid: false, error: "Yetersiz örneklem (her grupta en az 3 gözlem önerilir)" };
    }

    // Combine and rank all items
    const combined = [];
    s1.forEach(v => combined.push({ val: v, group: 1 }));
    s2.forEach(v => combined.push({ val: v, group: 2 }));
    combined.sort((a, b) => a.val - b.val);

    // Assign average ranks for ties
    const nTotal = combined.length;
    const ranks = new Array(nTotal);
    let i = 0;
    while (i < nTotal) {
        let j = i;
        while (j < nTotal - 1 && combined[j].val === combined[j + 1].val) {
            j++;
        }
        const avgRank = (i + 1 + j + 1) / 2;
        for (let k = i; k <= j; k++) {
            ranks[k] = avgRank;
        }
        i = j + 1;
    }

    let r1 = 0;
    for (let k = 0; k < nTotal; k++) {
        if (combined[k].group === 1) r1 += ranks[k];
    }

    const u1 = r1 - (n1 * (n1 + 1)) / 2;
    const u2 = (n1 * n2) - u1;
    const u = Math.min(u1, u2);

    // Normal approximation for U
    const meanU = (n1 * n2) / 2;
    const sigmaU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
    const z = sigmaU > 0 ? (u - meanU) / sigmaU : 0;
    const pValue = 2 * (1 - standardNormalCdf(Math.abs(z)));
    const isSignificant = pValue < 0.05;

    return {
        valid: true,
        u: Math.round(u),
        z: parseFloat(z.toFixed(3)),
        pValue: pValue < 0.001 ? 0.001 : parseFloat(pValue.toFixed(4)),
        pValueFormatted: pValue < 0.001 ? "p < 0.001" : `p = ${pValue.toFixed(3)}`,
        isSignificant,
        significanceLabel: isSignificant ? "Anlamlı Sıra Farkı (p < 0.05)" : "Sıralar Benzer (p ≥ 0.05)"
    };
}

/**
 * Tek Yönlü ANOVA (One-Way ANOVA - 3 veya daha fazla grup karşılaştırması)
 */
function calculateOneWayANOVA(groupsMap) {
    // groupsMap: { "Grup A": [1, 2, ...], "Grup B": [3, 4, ...], ... }
    const groupKeys = Object.keys(groupsMap || {}).filter(k => (groupsMap[k] || []).length > 0);
    const k = groupKeys.length;

    if (k < 2) {
        return { valid: false, error: "En az 2 grup gerekli" };
    }

    let nTotal = 0;
    let sumTotal = 0;
    const groupSummaries = [];

    groupKeys.forEach(g => {
        const vals = groupsMap[g].filter(v => typeof v === 'number' && !isNaN(v));
        const n_i = vals.length;
        if (n_i > 0) {
            const sum_i = vals.reduce((a, b) => a + b, 0);
            const mean_i = sum_i / n_i;
            nTotal += n_i;
            sumTotal += sum_i;
            groupSummaries.push({ name: g, vals, n: n_i, mean: mean_i });
        }
    });

    if (groupSummaries.length < 2 || nTotal <= k) {
        return { valid: false, error: "Gruplarda yeterli veri yok" };
    }

    const grandMean = sumTotal / nTotal;

    // SSB (Between groups sum of squares)
    let ssb = 0;
    groupSummaries.forEach(g => {
        ssb += g.n * Math.pow(g.mean - grandMean, 2);
    });

    // SSW (Within groups sum of squares)
    let ssw = 0;
    groupSummaries.forEach(g => {
        g.vals.forEach(v => {
            ssw += Math.pow(v - g.mean, 2);
        });
    });

    const dfB = k - 1;
    const dfW = nTotal - k;

    const msb = dfB > 0 ? ssb / dfB : 0;
    const msw = dfW > 0 ? ssw / dfW : 0;

    const fStat = msw > 0 ? msb / msw : 0;
    const etaSquared = (ssb + ssw) > 0 ? ssb / (ssb + ssw) : 0;

    // Approximate p-value from F-distribution
    const pValue = approximateFPValue(fStat, dfB, dfW);
    const isSignificant = pValue < 0.05;

    return {
        valid: true,
        f: parseFloat(fStat.toFixed(3)),
        dfBetween: dfB,
        dfWithin: dfW,
        etaSquared: parseFloat(etaSquared.toFixed(3)),
        pValue: pValue < 0.001 ? 0.001 : parseFloat(pValue.toFixed(4)),
        pValueFormatted: pValue < 0.001 ? "p < 0.001" : `p = ${pValue.toFixed(3)}`,
        isSignificant,
        significanceLabel: isSignificant ? "Gruplar Arası Anlamlı Fark (p < 0.05)" : "Gruplar Arası Anlamlı Fark Yok (p ≥ 0.05)"
    };
}

// --- STATISTICAL MATH HELPERS ---

function standardNormalCdf(x) {
    // Complementary error function (Numerical Recipes erfcc): relative error < 1.2e-7 everywhere,
    // which keeps small tail probabilities accurate (unlike an absolute-error polynomial).
    const z = Math.abs(x) / Math.SQRT2;
    const t = 1.0 / (1.0 + 0.5 * z);
    const poly = -z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
        t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
        t * (-0.82215223 + t * 0.17087277))))))));
    const erfcAbs = t * Math.exp(poly);          // erfc(|x|/sqrt2)
    const upperTail = 0.5 * erfcAbs;             // P(Z > |x|)
    return x >= 0 ? 1 - upperTail : upperTail;
}

function getTwoTailedPValue(tVal, df) {
    if (isNaN(tVal) || isNaN(df) || df <= 0) return 1;
    // Exact two-tailed Student-t p-value for every df (normal approximation is NOT accurate near df=30..100)
    const x = df / (df + tVal * tVal);
    return Math.min(1, Math.max(0, regularizedBeta(x, df / 2, 0.5)));
}

function approximateFPValue(fVal, df1, df2) {
    if (fVal <= 0 || df1 <= 0 || df2 <= 0) return 1;
    const x = df2 / (df2 + df1 * fVal);
    return Math.min(1, Math.max(0, regularizedBeta(x, df2 / 2, df1 / 2)));
}

// Incomplete regularized beta function I_x(a, b) using continued fractions
function regularizedBeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    const lnBeta = logGamma(a) + logGamma(b) - logGamma(a + b);
    const front = Math.exp(Math.log(x) * a + Math.log(1.0 - x) * b - lnBeta);

    // The continued fraction converges quickly only for x < (a+1)/(a+b+2); otherwise use the symmetry relation.
    if (x < (a + 1.0) / (a + b + 2.0)) {
        return front * betaContinuedFraction(x, a, b) / a;
    }
    return 1.0 - front * betaContinuedFraction(1.0 - x, b, a) / b;
}

// Continued fraction for the incomplete beta function (modified Lentz method)
function betaContinuedFraction(x, a, b) {
    const maxIter = 500;
    const epsilon = 3e-15;
    const tiny = 1e-300;

    const qab = a + b;
    const qap = a + 1.0;
    const qam = a - 1.0;
    let c = 1.0;
    let d = 1.0 - qab * x / qap;
    if (Math.abs(d) < tiny) d = tiny;
    d = 1.0 / d;
    let h = d;

    for (let m = 1; m <= maxIter; m++) {
        const m2 = 2 * m;

        let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
        d = 1.0 + aa * d;
        if (Math.abs(d) < tiny) d = tiny;
        c = 1.0 + aa / c;
        if (Math.abs(c) < tiny) c = tiny;
        d = 1.0 / d;
        h *= d * c;

        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
        d = 1.0 + aa * d;
        if (Math.abs(d) < tiny) d = tiny;
        c = 1.0 + aa / c;
        if (Math.abs(c) < tiny) c = tiny;
        d = 1.0 / d;
        const delta = d * c;
        h *= delta;

        if (Math.abs(delta - 1.0) < epsilon) break;
    }
    return h;
}

// Lanczos approximation of ln(Gamma(z)) (Numerical Recipes 3rd ed., gammln), valid for z > 0
function logGamma(z) {
    const c = [
        57.1562356658629235,
        -59.5979603554754912,
        14.1360979747417471,
        -0.491913816097620199,
        0.339946499848118887e-4,
        0.465236289270485756e-4,
        -0.983744753048795646e-4,
        0.158088703224377394e-3,
        -0.210264441724104883e-3,
        0.217439618115212643e-3,
        -0.164318106536763890e-3,
        0.844182239838527433e-4,
        -0.261908384015814087e-4,
        0.368991826595316234e-5
    ];
    let y = z;
    let tmp = z + 5.24218750000000000;
    tmp = (z + 0.5) * Math.log(tmp) - tmp;
    let ser = 0.999999999999997092;
    for (let j = 0; j < c.length; j++) {
        ser += c[j] / ++y;
    }
    return tmp + Math.log(2.5066282746310005 * ser / z);
}
