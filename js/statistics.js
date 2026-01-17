// --- STATISTICS ---

function calculateCronbachAlpha(data) {
    if (data.length < 2 || questionList.length < 2) return 0;

    const n = data.length;
    const k = questionList.length;

    // 1. Calculate Item Variances
    let sumItemVariances = 0;
    questionList.forEach((_, i) => {
        const qKey = `Q${i + 1}`;
        const values = data.map(r => r[qKey]).filter(v => typeof v === 'number');
        if (values.length > 1) {
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (values.length - 1); // Sample variance
            sumItemVariances += variance;
        }
    });

    // 2. Calculate Total Score Variance
    const totalScores = data.map(row => {
        return questionList.reduce((acc, _, i) => {
            return acc + (row[`Q${i + 1}`] || 0);
        }, 0);
    });

    const meanTotal = totalScores.reduce((a, b) => a + b, 0) / n;
    const varTotal = totalScores.reduce((a, b) => a + Math.pow(b - meanTotal, 2), 0) / (n - 1);

    if (varTotal === 0) return 0;

    // 3. Formula
    const alpha = (k / (k - 1)) * (1 - (sumItemVariances / varTotal));
    return alpha;
}
