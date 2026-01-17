// --- UI & CHARTS ---

let currentChartType = 'bar';
let charts = {};
let activeTab = 'general';
let tableSort = { key: 'id', order: 'asc' };
let editorPage = 1;
const editorPageSize = 50;

// Register plugins safely
if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
}


// --- THEME & PALETTES ---
const PALETTES = {
    light: [
        { border: '#4f46e5', bg: 'rgba(79, 70, 229, 0.7)' }, // Indigo (Pro)
        { border: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.7)' }, // Sky
        { border: '#10b981', bg: 'rgba(16, 185, 129, 0.7)' }, // Emerald
        { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.7)' }, // Amber
        { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.7)' }, // Red
    ],
    dark: [
        { border: '#818cf8', bg: 'rgba(129, 140, 248, 0.8)' }, // Bright Indigo
        { border: '#38bdf8', bg: 'rgba(56, 189, 248, 0.8)' }, // Bright Sky
        { border: '#34d399', bg: 'rgba(52, 211, 153, 0.8)' }, // Bright Emerald
        { border: '#fbbf24', bg: 'rgba(251, 191, 36, 0.8)' }, // Bright Amber
        { border: '#f87171', bg: 'rgba(248, 113, 113, 0.8)' }, // Bright Red
    ]
};
const TRAFFIC_PALETTE = {
    light: { low: 'rgba(239, 68, 68, 0.7)', mid: 'rgba(245, 158, 11, 0.7)', high: 'rgba(16, 185, 129, 0.7)' },
    dark: { low: 'rgba(248, 113, 113, 0.8)', mid: 'rgba(251, 191, 36, 0.8)', high: 'rgba(52, 211, 153, 0.8)' }
};



// --- HELPER: Gradient Generator ---
function createGradient(ctx, color) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    // Robustly replace the last number (alpha) with new opacity
    // Works for "rgba(r, g, b, a)" format
    const topColor = color.replace(/[\d\.]+\)$/, '0.9)');
    const bottomColor = color.replace(/[\d\.]+\)$/, '0.2)');

    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, bottomColor);
    return gradient;
}

// --- HELPER: Count Up Animation ---
function animateValue(obj, start, end, duration, decimals = 0) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const val = progress * (end - start) + start;
        obj.textContent = val.toFixed(decimals);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function switchTab(tabId) {
    activeTab = tabId;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.classList.add('text-slate-500', 'dark:text-slate-400', 'border-transparent');
    });
    const activeBtn = document.getElementById(`tab-btn-${tabId}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.classList.remove('text-slate-500', 'dark:text-slate-400', 'border-transparent');
    }

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
        content.classList.remove('animate-slide-up');
    });

    const targetContent = document.getElementById(`tab-${tabId}`);
    targetContent.classList.remove('hidden');
    targetContent.classList.add('animate-slide-up');

    if (tabId === 'heatmap') renderHeatmap();
    if (tabId === 'feedback') renderFeedback();
    if (tabId === 'editor') renderEditor();
    if (tabId === 'report') generateDetailedReport();
}

function setChartType(type) {
    currentChartType = type;
    ['bar', 'horizontalBar', 'line', 'radar', 'polarArea', 'area', 'scatter'].forEach(t => {
        const btn = document.getElementById(`btn-${t}`);
        if (btn) {
            if (t === type) {
                btn.classList.remove('text-slate-500', 'bg-slate-100');
                btn.classList.add('bg-blue-50', 'text-blue-700', 'shadow-sm', 'border', 'border-blue-100');
            } else {
                btn.classList.add('text-slate-500', 'bg-slate-100');
                btn.classList.remove('bg-blue-50', 'text-blue-700', 'shadow-sm', 'border', 'border-blue-100');
            }
        }
    });
    updateDashboard();
}

function renderMainChart(stats, rawData = [], groupKey = 'none') {
    const canvas = document.getElementById('mainChart');
    const container = document.getElementById('mainChartContainer');
    const ctx = canvas.getContext('2d');
    const targetScore = parseFloat(document.getElementById('targetScore').value) || 4.0;

    if (charts.main) charts.main.destroy();

    // --- HEIGHT MANAGEMENT ---
    // Strict logic: 30px per item for Horizontal, Fixed 450px for Vertical
    if (currentChartType === 'horizontalBar') {
        const height = Math.max(500, stats.length * 35 + 100);
        container.style.height = `${height}px`;
    } else {
        container.style.height = '450px';
    }

    // Is it Horizontal?
    const isHorizontal = currentChartType === 'horizontalBar';
    const indexAxis = isHorizontal ? 'y' : 'x';



    const labels = stats.map(s => `S${s.id}`);
    const datasets = [];

    // --- Dataset Generation Logic ---
    const isDark = document.documentElement.classList.contains('dark');
    // Define Chart Colors based on theme
    const gridColor = isDark ? '#334155' : '#f1f5f9';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const axisColor = isDark ? '#475569' : '#e2e8f0';

    // Fallback if constants are missing (safe guard)
    const activePalette = (typeof PALETTES !== 'undefined' && isDark) ? PALETTES.dark : (typeof PALETTES !== 'undefined' ? PALETTES.light : Utils.PALETTE);
    const trafficColors = (typeof TRAFFIC_PALETTE !== 'undefined' && isDark) ? TRAFFIC_PALETTE.dark : (typeof TRAFFIC_PALETTE !== 'undefined' ? TRAFFIC_PALETTE.light : { low: '#ef4444', mid: '#f59e0b', high: '#10b981' });

    if (groupKey !== 'none' && rawData.length > 0) {
        // GROUPED MODE
        const groups = {};
        rawData.forEach(r => {
            const gVal = r[groupKey] || 'Belirtilmemiş';
            if (!groups[gVal]) groups[gVal] = { count: 0, sums: new Array(stats.length).fill(0), counts: new Array(stats.length).fill(0) };

            groups[gVal].count++;
            stats.forEach((s, idx) => {
                const val = r[`Q${s.id}`];
                if (val) {
                    groups[gVal].sums[idx] += val;
                    groups[gVal].counts[idx]++;
                }
            });
        });

        // Sort groups by size and take top 5 to avoid clutter
        const sortedGroups = Object.entries(groups).sort((a, b) => b[1].count - a[1].count).slice(0, 5);

        sortedGroups.forEach((entry, i) => {
            const [gName, gData] = entry;
            const avgs = gData.sums.map((sum, idx) => gData.counts[idx] ? sum / gData.counts[idx] : 0);

            // Pick color from Palette
            const colorObj = activePalette[i % activePalette.length];

            datasets.push({
                label: gName.length > 20 ? gName.substring(0, 20) + '...' : gName,
                data: avgs,
                backgroundColor: colorObj.bg,
                borderColor: colorObj.border,
                borderWidth: 1,
                borderRadius: 4,
                fill: currentChartType === 'area',
                tension: 0.4,
                showLine: currentChartType !== 'scatter',
                pointRadius: 4
            });
        });

    } else {
        // STANDARD MODE (Overall)
        const data = stats.map(s => s.avg);

        // Calculate Grand Total
        const valid = data.filter(v => v > 0);
        const grandAvg = valid.length ? (valid.reduce((a, b) => a + b, 0) / valid.length) : 0;

        // Add to visualization
        labels.push('GENEL ORT.');
        data.push(grandAvg);

        const bgColors = data.map((v, i) => {
            // Distinct color for General Average (Purple)
            if (i === data.length - 1) return createGradient(ctx, isDark ? '#c084fc' : '#8b5cf6');

            let color;
            if (v < 2.5) color = trafficColors.low;
            else if (v < 3.5) color = trafficColors.mid;
            else color = trafficColors.high;
            return createGradient(ctx, color);
        });

        const borderColors = data.map((v, i) => {
            if (i === data.length - 1) return isDark ? '#c084fc' : '#8b5cf6';

            if (v < 2.5) return trafficColors.low.replace('0.7', '1').replace('0.8', '1');
            if (v < 3.5) return trafficColors.mid.replace('0.7', '1').replace('0.8', '1');
            return trafficColors.high.replace('0.7', '1').replace('0.8', '1');
        });

        datasets.push({
            label: 'Genel Ortalama',
            data: data,
            backgroundColor: bgColors,
            borderColor: borderColors,
            borderWidth: 2,
            borderRadius: 8,
            fill: currentChartType === 'area',
            tension: 0.4,
            showLine: currentChartType !== 'scatter',
            pointRadius: currentChartType === 'scatter' ? 6 : 3
        });
    }

    // 'scatter' in Chart.js requires {x,y} data. For categorical data, use 'line' with showLine:false.
    let actualType = currentChartType;
    if (currentChartType === 'horizontalBar') actualType = 'bar';
    else if (currentChartType === 'scatter') actualType = 'line';
    else if (currentChartType === 'area') actualType = 'line';

    let chartConfig = {
        type: actualType,
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            indexAxis: currentChartType === 'horizontalBar' ? 'y' : 'x',
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            },
            scales: currentChartType === 'horizontalBar'
                ? {
                    x: {
                        beginAtZero: true,
                        max: 5.5,
                        grid: { color: gridColor },
                        ticks: { color: textColor },
                        border: { display: false }
                    },
                    y: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: {
                            autoSkip: false,
                            font: { size: 10, family: 'Inter' },
                            color: textColor
                        }
                    }
                }
                : {
                    y: {
                        beginAtZero: true,
                        max: 5.5,
                        grid: { color: gridColor },
                        ticks: { color: textColor },
                        border: { display: false }
                    },
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: {
                            font: { size: 10, family: 'Inter' },
                            color: textColor,
                            maxRotation: 45,
                            minRotation: 0
                        }
                    }
                },
            plugins: {
                legend: {
                    display: groupKey !== 'none', // Show legend only if grouped
                    position: 'top',
                    align: 'end',
                    labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1e293b',
                    bodyColor: '#475569',
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 4,
                    usePointStyle: true,
                    titleFont: { size: 13, weight: 'bold' },
                    callbacks: {
                        title: (items) => {
                            const idx = items[0].dataIndex;
                            if (!stats[idx]) return "Genel Kurum Ortalaması";
                            return wrapText(stats[idx].text, 40);
                        },
                        label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toFixed(2)}`
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    formatter: (value) => value.toFixed(2),
                    font: { weight: 'bold', size: 10 },
                    color: '#64748b',
                    offset: 2,
                    display: (ctx) => {
                        // Hide datalabels if too many datasets to avoid clutter
                        return datasets.length <= 1;
                    }
                },
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line',
                            // Only valid for Cartesian
                            yMin: targetScore, yMax: targetScore,
                            borderColor: 'rgba(239, 68, 68, 0.6)',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                                content: `Hedef: ${targetScore}`,
                                enabled: true,
                                position: 'start',
                                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                                color: 'white',
                                font: { size: 10 }
                            }
                        }
                    }
                }
            },
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    openModal(stats[idx]);
                }
            }
        }
    };

    // Special handling for Radial charts
    if (currentChartType === 'radar' || currentChartType === 'polarArea') {
        const isRadar = currentChartType === 'radar';

        // Remove Cartesian scales
        delete chartConfig.options.scales.x;
        delete chartConfig.options.scales.y;

        // Add Radial Scale
        chartConfig.options.scales.r = {
            min: 0,
            max: 5,
            grid: { color: gridColor },
            angleLines: { color: axisColor },
            pointLabels: {
                font: { size: 11, family: 'Inter' },
                color: textColor
            },
            ticks: {
                display: false,
                backdropColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)'
            }
        };

        // Disable Annotation (Benchmark Line) as it relies on 'y' scale
        chartConfig.options.plugins.annotation = { annotations: {} };

        // For Radial + Grouped, standard dataset config works automatically
        // but if NOT grouped, we need the "transparent fill" style
        if (groupKey === 'none') {
            if (isRadar) {
                chartConfig.data.datasets[0].backgroundColor = 'rgba(59, 130, 246, 0.2)';
                chartConfig.data.datasets[0].pointBackgroundColor = '#3b82f6';
            }
        }
    }

    charts.main = new Chart(ctx, chartConfig);
}

function renderDistributionChart(data, groupKey) {
    const ctx = document.getElementById('distChart').getContext('2d');
    if (charts.dist) charts.dist.destroy();

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#475569';
    const borderColor = isDark ? '#1e293b' : '#ffffff';

    let labels = [], counts = [];

    if (groupKey === 'none') {
        labels = ['Tüm Katılımcılar'];
        counts = [data.length];
    } else {
        const groups = {};
        data.forEach(r => {
            const g = r[groupKey] || 'Belirtilmemiş';
            groups[g] = (groups[g] || 0) + 1;
        });
        labels = Object.keys(groups);
        counts = Object.values(groups);
    }

    // Generate colors cycling through Palette
    const bgColors = labels.map((_, i) => PALETTE[i % PALETTE.length].border);

    charts.dist = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: bgColors,
                borderWidth: 2,
                borderColor: borderColor,
                hoverOffset: 15,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%', // Thinner ring
            animation: { animateScale: true, animateRotate: true },
            layout: { padding: 20 },
            plugins: {
                legend: {
                    position: 'right', // Move to right as in example/preferred for long info
                    align: 'start',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 10,
                        font: { size: 12, family: 'Inter', weight: 500 },
                        padding: 15,
                        color: textColor,
                        generateLabels: (chart) => {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const meta = chart.getDatasetMeta(0);
                                    const style = meta.controller.getStyle(i);
                                    const value = data.datasets[0].data[i];
                                    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1) + '%';

                                    return {
                                        text: `${label} (${percentage} - ${value})`,
                                        fillStyle: style.backgroundColor,
                                        strokeStyle: style.borderColor,
                                        lineWidth: style.borderWidth,
                                        fontColor: textColor, // Explicitly set text color for dark mode
                                        hidden: isNaN(data.datasets[0].data[i]) || meta.data[i].hidden,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1e293b',
                    bodyColor: '#475569',
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: (ctx) => {
                            let sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            let perc = ((ctx.raw * 100) / sum).toFixed(1) + "%";
                            return ` ${ctx.label}: ${perc} (${ctx.raw})`;
                        }
                    }
                },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 11 },
                    backgroundColor: (ctx) => ctx.dataset.backgroundColor[ctx.dataIndex],
                    borderRadius: 4,
                    padding: 4,
                    formatter: (val, ctx) => {
                        let sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        let perc = ((val * 100) / sum).toFixed(0);
                        return `${perc}%`;
                    },
                    display: (ctx) => {
                        // Only show if > 5% to avoid clutter
                        let sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        return (ctx.dataset.data[ctx.dataIndex] / sum) > 0.05;
                    }
                }
            },
            onClick: (e, els) => {
                if (els.length && groupKey !== 'none') {
                    const idx = els[0].index;
                    const label = labels[idx];
                    alert(`"${label}" filtresini eklemek için sol menüyü kullanabilirsiniz.`);
                }
            }
        }
    });
}

function renderMultiSelectAnalysis() {
    const key = document.getElementById('multiSelectCol').value;
    if (!key) return;

    const data = getFilteredData();
    const counts = {};
    let totalResponses = 0;

    data.forEach(row => {
        const val = row[key];
        if (val) {
            // Split by ; or ,
            const options = String(val).split(/[,;]\s*/);
            options.forEach(opt => {
                const trimmed = opt.trim();
                if (trimmed) {
                    counts[trimmed] = (counts[trimmed] || 0) + 1;
                    totalResponses++;
                }
            });
        }
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(s => s[0]);
    const values = sorted.map(s => s[1]);

    const ctx = document.getElementById('multiSelectChart').getContext('2d');
    if (charts.multiSelect) charts.multiSelect.destroy();

    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? '#334155' : '#f1f5f9';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const tooltipBg = isDark ? '#1e293b' : 'white';
    const tooltipText = isDark ? '#f1f5f9' : '#1e293b';
    const tooltipBorder = isDark ? '#334155' : '#e2e8f0';

    charts.multiSelect = new Chart(ctx, {
        type: 'bar',
        indexAxis: 'y',
        data: {
            labels: labels,
            datasets: [{
                label: 'Seçilme Sayısı',
                data: values,
                backgroundColor: createGradient(ctx, 'rgba(59, 130, 246, 0.8)'),
                borderColor: '#3b82f6',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { right: 45 } }, // Prevent label clipping
            scales: {
                x: { beginAtZero: true, grid: { color: gridColor }, grace: '10%', ticks: { color: textColor } },
                y: { grid: { display: false }, ticks: { color: textColor } }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: tooltipBg,
                    titleColor: tooltipText,
                    bodyColor: isDark ? '#cbd5e1' : '#475569',
                    borderColor: tooltipBorder,
                    borderWidth: 1
                },
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    formatter: (val) => val,
                    font: { weight: 'bold' },
                    color: textColor,
                    offset: 4
                }
            }
        }
    });
}

function renderHighLow(stats) {
    const sorted = [...stats].sort((a, b) => b.avg - a.avg);
    const high = sorted.slice(0, 3);
    const low = sorted.slice(-3).reverse();

    const container = document.getElementById('high-low-container');
    container.innerHTML = '';

    const createCard = (item, type) => `
        <div class="flex items-center justify-between p-4 rounded-xl border ${type === 'high' ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20'} cursor-pointer transition group" onclick="openModalById(${item.id})">
            <div class="flex-1 mr-3">
                <div class="text-[10px] font-bold uppercase tracking-wide ${type === 'high' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} mb-1 flex items-center gap-1">
                    ${type === 'high' ? '<i class="fa-solid fa-arrow-trend-up"></i> En Yüksek' : '<i class="fa-solid fa-arrow-trend-down"></i> En Düşük'}
                </div>
                <div class="text-xs font-semibold text-slate-700 dark:text-slate-300 clamp-2 group-hover:text-slate-900 dark:group-hover:text-white transition" title="${item.text}">${item.text}</div>
            </div>
            <div class="text-xl font-bold ${type === 'high' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">${item.avg.toFixed(2)}</div>
        </div>
    `;

    high.forEach(item => container.innerHTML += createCard(item, 'high'));
    low.forEach(item => container.innerHTML += createCard(item, 'low'));
}

function renderCorrelations(data) {
    const container = document.getElementById('correlation-container');
    if (questionList.length < 2) {
        container.innerHTML = '<p class="text-xs text-slate-400 italic">Yeterli veri yok.</p>';
        return;
    }

    const matrix = [];
    for (let i = 0; i < questionList.length; i++) {
        for (let j = i + 1; j < questionList.length; j++) {
            const ki = `Q${i + 1}`, kj = `Q${j + 1}`;
            const valsI = data.map(r => r[ki]);
            const valsJ = data.map(r => r[kj]);

            // Pearson Correlation
            const n = valsI.length;
            const sumI = valsI.reduce((a, b) => a + b, 0);
            const sumJ = valsJ.reduce((a, b) => a + b, 0);
            const sumIJ = valsI.reduce((a, b, ix) => a + b * valsJ[ix], 0);
            const sumI2 = valsI.reduce((a, b) => a + b * b, 0);
            const sumJ2 = valsJ.reduce((a, b) => a + b * b, 0);

            const num = n * sumIJ - sumI * sumJ;
            const den = Math.sqrt((n * sumI2 - sumI * sumI) * (n * sumJ2 - sumJ * sumJ));
            const corr = den === 0 ? 0 : num / den;

            if (corr > 0.6) { // Threshold
                matrix.push({ q1: i + 1, q2: j + 1, val: corr });
            }
        }
    }

    matrix.sort((a, b) => b.val - a.val);
    const top5 = matrix.slice(0, 5);

    container.innerHTML = '';
    if (top5.length === 0) {
        container.innerHTML = '<div class="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 text-xs">Güçlü ilişki bulunamadı.</div>';
        return;
    }

    top5.forEach(pair => {
        const opacity = Math.max(0.1, pair.val - 0.5); // Dynamic opacity based on strength
        container.innerHTML += `
        <div class="flex justify-between items-center p-3 rounded-lg border border-slate-100 dark:border-slate-700 text-xs transition hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:border-blue-100 dark:hover:border-blue-800" style="background-color: rgba(241, 245, 249, ${opacity})">
            <span class="text-slate-600 dark:text-slate-300 font-medium truncate flex-1 mr-2" title="Soru ${pair.q1} & Soru ${pair.q2}">
                <span class="font-bold text-slate-800 dark:text-white">S${pair.q1} - S${pair.q2}</span>
            </span>
            <span class="font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm border border-blue-100 dark:border-blue-900/50">${pair.val.toFixed(2)}</span>
        </div>`;
    });
}

function renderDetailTable(stats) {
    const sortedStats = [...stats].sort((a, b) => {
        const valA = a[tableSort.key];
        const valB = b[tableSort.key];
        return tableSort.order === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    const tbody = document.getElementById('questions-table');
    tbody.innerHTML = '';

    sortedStats.forEach(s => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition cursor-pointer group border-b border-slate-100 last:border-0";
        tr.onclick = () => openModal(s);

        let statusBadge = '';
        if (s.avg >= 4) statusBadge = '<span class="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold shadow-sm ring-1 ring-emerald-200">Çok İyi</span>';
        else if (s.avg >= 3) statusBadge = '<span class="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold shadow-sm ring-1 ring-yellow-200">Orta</span>';
        else statusBadge = '<span class="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold shadow-sm ring-1 ring-red-200">Geliştirilmeli</span>';

        // Add sparkline-like background bar for average
        const bgWidth = (s.avg / 5) * 100;

        tr.innerHTML = `
            <td class="px-6 py-4 font-bold text-slate-600 text-xs">S${s.id}</td>
            <td class="px-6 py-4 text-slate-600 group-hover:text-blue-600 transition font-medium text-sm leading-relaxed">${s.text}</td>
            <td class="px-6 py-4 text-right">
                <div class="font-bold text-slate-800 dark:text-white text-sm">${s.avg.toFixed(2)}</div>
                <div class="h-1 bg-slate-100 rounded-full mt-1 overflow-hidden w-full">
                    <div class="h-full ${s.avg >= 3.5 ? 'bg-emerald-500' : (s.avg < 2.5 ? 'bg-red-500' : 'bg-yellow-400')}" style="width: ${bgWidth}%"></div>
                </div>
            </td>
            <td class="px-6 py-4 text-right text-slate-500 font-mono text-xs">${s.std.toFixed(2)}</td>
            <td class="px-6 py-4 text-center">${statusBadge}</td>
        `;
        tbody.appendChild(tr);
    });
}

function sortTable(key) {
    if (tableSort.key === key) {
        tableSort.order = tableSort.order === 'asc' ? 'desc' : 'asc';
    } else {
        tableSort.key = key;
        tableSort.order = 'desc'; // Default desc for metrics
    }
    updateDashboard();
}

function renderHeatmap() {
    const container = document.getElementById('heatmap-container');
    const data = getFilteredData();
    const groupSelect = document.getElementById('groupSelect');
    const groupKey = groupSelect.value;

    if (groupKey === 'none') {
        container.innerHTML = '<div class="p-10 text-center text-slate-400 bg-slate-50 rounded-xl my-4">Isı haritası için lütfen sol menüden bir karşılaştırma grubu seçin.</div>';
        return;
    }

    // Pre-calculate groups and totals for headers
    const uniqueGroups = [...new Set(data.map(d => d[groupKey]))].filter(g => g).sort();
    const groupStats = uniqueGroups.map(g => {
        const count = data.filter(d => d[groupKey] == g).length;
        const perc = data.length ? (count / data.length * 100).toFixed(1) : 0;
        return { name: g, count: count, perc: perc };
    });

    let html = '<table class="w-full text-sm text-left border-collapse bg-white dark:bg-slate-800 rounded-lg overflow-hidden shadow-sm table-fixed">';

    // --- Header ---
    html += '<thead class="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">';
    html += '<tr>';
    // Col 1: Question (Wide)
    html += '<th class="p-4 border-b border-r border-slate-200 dark:border-slate-700 sticky left-0 z-30 bg-slate-50 dark:bg-slate-800 w-1/3 min-w-[300px]">SORU</th>';
    // Col 2: Overall (Fixed)
    html += '<th class="p-4 border-b border-r border-slate-200 dark:border-slate-700 text-center w-24 bg-slate-50 dark:bg-slate-800">GENEL ORT.</th>';
    // Col 3+: Groups
    groupStats.forEach(g => {
        html += `<th class="p-3 border-b border-slate-100 dark:border-slate-700 text-center min-w-[140px]">
            <div class="flex flex-col items-center">
                <span class="text-slate-800 dark:text-slate-200">${g.name}</span>
                <span class="text-[9px] text-slate-400 font-medium normal-case mt-0.5">n:${g.count} (%${g.perc})</span>
            </div>
        </th>`;
    });
    html += '</tr></thead>';

    // --- Body ---
    html += '<tbody class="divide-y divide-slate-100 dark:divide-slate-700">';
    questionList.forEach((q, qIdx) => {
        const qId = qIdx + 1;

        // Calculate Overall Average for this question
        const qKey = `Q${qId}`;
        const allVals = data.map(r => r[qKey]);
        const overallAvg = allVals.length ? (allVals.reduce((a, b) => a + b, 0) / allVals.length) : 0;

        html += `<tr class="hover:bg-slate-50/50 transition group">`;

        // 1. Question Text
        html += `<td class="p-4 border-r border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 sticky left-0 z-20 text-slate-600 dark:text-slate-300 font-medium text-xs leading-relaxed">
            <span class="font-bold text-slate-400 dark:text-slate-500 mr-1.5">S${qId}:</span> ${q}
        </td>`;

        // 2. Overall Average
        html += `<td class="p-4 border-r border-slate-100 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-200 bg-slate-50/30 dark:bg-slate-700/50 text-sm">
            ${overallAvg.toFixed(2)}
        </td>`;

        // 3. Group Columns
        uniqueGroups.forEach(g => {
            const groupData = data.filter(r => r[groupKey] == g);
            const vals = groupData.map(r => r[qKey]);
            const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

            // Use theme system for colors
            const bgClass = typeof getHeatmapColorClass === 'function'
                ? getHeatmapColorClass(avg)
                : (avg <= 0 ? 'bg-slate-100 text-slate-400' :
                    avg >= 4.2 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        avg >= 3.5 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                            avg >= 2.5 ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                'bg-red-100 text-red-800 border border-red-200');

            html += `<td class="p-2 text-center align-middle" onclick="openModalById(${qId})">
                <div class="cursor-pointer transition-transform hover:scale-105 rounded-lg py-2 px-3 mx-auto w-full max-w-[120px] flex flex-col items-center justify-center ${bgClass}">
                    <span class="text-sm font-bold">${avg.toFixed(2)}</span>
                    <span class="text-[9px] opacity-70 font-semibold mt-0.5">n:${vals.length}</span>
                </div>
            </td>`;
        });

        html += '</tr>';
    });
    // --- Footer: Overall Group Averages ---
    html += '<tr class="bg-indigo-50/50 dark:bg-indigo-900/20 border-t-2 border-indigo-100 dark:border-indigo-900/50 font-bold">';

    // 1. Label
    html += '<td class="p-4 sticky left-0 z-20 bg-indigo-50 dark:bg-indigo-900/40 border-r border-indigo-100 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">GENEL GRUP ORT.</td>';

    // 2. Grand Total
    const allMeans = []; // Collect all averages to mean of means? Or mean of raw? Mean of raw is better.
    // Actually, calculate "Total Score / Total Count"
    let totalSum = 0;
    let totalCount = 0;
    data.forEach(r => {
        questionList.forEach((_, i) => {
            const val = r[`Q${i + 1}`];
            if (val > 0) { totalSum += val; totalCount++; }
        });
    });
    const grandMean = totalCount ? (totalSum / totalCount) : 0;

    html += `<td class="p-4 text-center border-r border-indigo-100 text-indigo-700 bg-indigo-100/50">${grandMean.toFixed(2)}</td>`;

    // 3. Group Columns
    uniqueGroups.forEach(g => {
        let gSum = 0;
        let gCount = 0;
        const groupRows = data.filter(d => d[groupKey] == g);
        groupRows.forEach(r => {
            questionList.forEach((_, i) => {
                const val = r[`Q${i + 1}`];
                if (val > 0) { gSum += val; gCount++; }
            });
        });
        const gAvg = gCount ? (gSum / gCount) : 0;

        // Color Logic
        let bgClass = 'bg-slate-100 text-slate-400';
        if (gAvg > 0) {
            if (gAvg >= 4.2) bgClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
            else if (gAvg >= 3.5) bgClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
            else if (gAvg >= 2.5) bgClass = 'bg-orange-100 text-orange-800 border-orange-200';
            else bgClass = 'bg-red-100 text-red-800 border-red-200';
        }

        html += `<td class="p-3 text-center align-middle bg-indigo-50/30">
            <div class="rounded-lg py-2 px-3 mx-auto w-full max-w-[120px] border ${bgClass}">
                <span class="text-sm font-extrabold">${gAvg.toFixed(2)}</span>
            </div>
        </td>`;
    });

    html += '</tr>';
    html += '</tbody></table>';

    container.innerHTML = html;
}

function renderFeedback() {
    // ... (Feedback function kept mostly same, but with enhanced HTML for comments) ...
    const columnKey = document.getElementById('feedbackSource').value;
    const container = document.getElementById('comments-list');
    const cloudContainer = document.getElementById('cloud-container');
    const data = getFilteredData();

    container.innerHTML = '';
    cloudContainer.innerHTML = '';

    const comments = [];
    let posCount = 0;
    let negCount = 0;

    // Stop words from user's snippet
    const stopWords = ['ve', 'ile', 'bir', 'bu', 'da', 'de', 'için', 'çok', 'daha', 'en', 'ise', 'ama', 'fakat', 'ancak', 'gibi', 'kadar', 'olan', 'olarak', 'var', 'yok', 'veya', 'mu', 'mı', 'ben', 'sen', 'o', 'biz', 'siz', 'onlar', 'her', 'şey', 'ki', 'yok', 'hayır', 'teşekkürler', 'teşekkür', 'yoktur', 'memnunum', 'gayet', 'iyi', 'güzel', 'ilgili', 'hakkında', 'konusunda', 'tarafından', 'dair', 'üzere', 'dolayı', 'rağmen'];
    const words = {};

    const searchVal = document.getElementById('commentSearch') ? document.getElementById('commentSearch').value.toLowerCase() : "";

    data.forEach(row => {
        const val = row[columnKey];
        if (val === undefined || val === null) return;
        const text = String(val).trim();

        if (text.replace(/[.,\-_!?]/g, '').trim().length === 0) return;
        if (text.length < 3) return;
        const lowerText = text.toLowerCase();
        if (['yok', 'hayır', 'yoktur', 'boş'].includes(lowerText)) return;

        // --- Hybrid Analysis (Text + Data) ---
        // 1. Text Analysis (using our improved sentiment.js)
        const sentResult = analyzeSentiment(text);
        let score = sentResult.score;

        // 2. Data Score Check (Fallback if text is neutral)
        if (score === 0 && Array.isArray(questionList)) {
            let rowSum = 0;
            let rowQCount = 0;
            questionList.forEach((_, i) => {
                const qVal = row[`Q${i + 1}`];
                if (qVal) { rowSum += qVal; rowQCount++; }
            });
            if (rowQCount > 0) {
                const rowAvg = rowSum / rowQCount;
                if (rowAvg >= 4.0) score = 1; // High satisfaction implied positive
                if (rowAvg <= 2.5) score = -1; // Low satisfaction implied negative
            }
        }

        if (score > 0) posCount++;
        if (score < 0) negCount++;

        // Filter and Collect for List
        if (searchVal === "" || lowerText.includes(searchVal)) {
            let indicator = score > 0
                ? '<span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full ml-auto">Olumlu</span>'
                : (score < 0
                    ? '<span class="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full ml-auto">Olumsuz</span>'
                    : '');

            comments.push({ text: text, indicator: indicator });

            // Word Cloud Tokenization (User's Logic)
            const tokens = lowerText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(/\s+/).filter(t => t.length >= 3 && !stopWords.includes(t));

            // Unigrams
            tokens.forEach(t => { words[t] = (words[t] || 0) + 1; });

            // Bigrams Removed per User Request ("tekrarı kaldır")
            // for (let i = 0; i < tokens.length - 1; i++) {
            //     const bigram = tokens[i] + " " + tokens[i + 1];
            //     words[bigram] = (words[bigram] || 0) + 1;
            // }
        }
    });

    // --- Update UI ---

    // 1. Counters
    const countEl = document.getElementById('comment-count');
    if (countEl) countEl.textContent = comments.length;

    // 2. Sentiment Bars
    const total = posCount + negCount; // Only count non-neutral for the bar shares usually, or total comments? User code used totalComments.
    // User code: const totalSent = posCount + negCount; if(totalSent > 0) ...
    // Let's stick to User's visual logic: share of *sentiment-expressing* people? 
    // Actually user code: totalSent = posCount + negCount.
    const totalSent = posCount + negCount;
    if (totalSent > 0) {
        animateValue(document.getElementById('sent-pos-val'), 0, posCount, 1000);
        document.getElementById('sent-pos-bar').style.width = `${(posCount / totalSent) * 100}%`;
        animateValue(document.getElementById('sent-neg-val'), 0, negCount, 1000);
        document.getElementById('sent-neg-bar').style.width = `${(negCount / totalSent) * 100}%`;
    } else {
        document.getElementById('sent-pos-val').textContent = 0;
        document.getElementById('sent-neg-val').textContent = 0;
        document.getElementById('sent-pos-bar').style.width = `0%`;
        document.getElementById('sent-neg-bar').style.width = `0%`;
    }

    // 3. Comments List
    if (comments.length === 0) {
        container.innerHTML = '<div class="flex flex-col items-center justify-center h-48 text-slate-400"><i class="fa-regular fa-comment-dots text-4xl mb-2"></i><p>Yorum bulunamadı.</p></div>';
    } else {
        let htmlList = '<div class="space-y-3">';
        comments.forEach(c => {
            let displayText = c.text;
            if (searchVal) {
                const regex = new RegExp(`(${searchVal})`, 'gi');
                displayText = displayText.replace(regex, '<span class="bg-yellow-200 text-yellow-900 px-1 rounded">$1</span>');
            }

            htmlList += `
                <div class="p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition flex flex-col gap-2 group">
                    <div class="flex items-start justify-between">
                         <p class="text-sm text-slate-700 leading-relaxed font-medium">"${displayText}"</p>
                         ${c.indicator}
                    </div>
                </div>`;
        });
        htmlList += '</div>';
        container.innerHTML = htmlList;
    }

    // 4. Word Cloud
    const sortedWords = Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 40);
    if (sortedWords.length === 0) {
        cloudContainer.innerHTML = '<p class="text-slate-400 w-full text-center mt-4">Analiz edilecek kelime bulunamadı.</p>';
        return;
    }

    const maxCount = sortedWords[0][1];
    const minCount = sortedWords[sortedWords.length - 1][1];

    sortedWords.forEach(([word, count]) => {
        const span = document.createElement('span');
        span.className = "cloud-tag bg-white border border-slate-200 text-slate-600 shadow-sm";
        span.textContent = `${word} (${count})`;

        // Dynamic Size
        let scale = 0.5;
        if (maxCount !== minCount) scale = (count - minCount) / (maxCount - minCount);
        const fontSize = 0.8 + (scale * 1.5);
        span.style.fontSize = `${fontSize}rem`;

        // Styling for popular words
        if (scale > 0.7) {
            span.classList.add('!bg-blue-600', '!text-white', '!border-blue-600');
        } else if (scale > 0.4) {
            span.classList.add('!bg-blue-50', '!text-blue-800', '!border-blue-200');
        }

        span.onclick = () => {
            const searchBox = document.getElementById('commentSearch');
            if (searchBox.value === word) {
                searchBox.value = "";
            } else {
                searchBox.value = word;
            }
            renderFeedback(); // Re-render to filter
        };
        cloudContainer.appendChild(span);
    });
}

function filterComments() {
    const query = document.getElementById('commentSearch').value.toLowerCase();
    const items = document.querySelectorAll('.comment-item');
    items.forEach(item => {
        if (item.textContent.toLowerCase().includes(query)) {
            item.style.display = 'flex';
            item.classList.add('animate-slide-up');
        }
        else item.style.display = 'none';
    });
}

function openModalById(id) {
    const data = getFilteredData();
    const vals = data.map(r => r[`Q${id}`]);
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = vals.length ? sum / vals.length : 0;
    const qText = questionList[id - 1] || `Soru ${id}`;

    openModal({ id: id, text: qText, avg: avg, n: vals.length });
}

function openModal(item) {
    const data = getFilteredData();
    const modal = document.getElementById('detailModal');
    document.getElementById('modal-title').textContent = `Soru ${item.id} Detayı`;
    document.getElementById('modal-subtitle').textContent = item.text;

    const k = `Q${item.id}`;
    const vals = data.map(r => r[k]);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

    animateValue(document.getElementById('modal-avg'), 0, avg, 500, 2);
    document.getElementById('modal-count').textContent = vals.length;

    const satisfied = vals.filter(v => v >= 4).length;
    const perc = vals.length ? ((satisfied / vals.length) * 100).toFixed(1) : 0;
    document.getElementById('modal-perc').textContent = `%${perc}`;

    // Histogram
    if (charts.modal) charts.modal.destroy();
    const counts = [0, 0, 0, 0, 0];
    vals.forEach(v => {
        if (v >= 1 && v <= 5) counts[Math.round(v) - 1]++;
    });

    const ctx = document.getElementById('modalChart').getContext('2d');
    charts.modal = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['1 (Çok Kötü)', '2 (Kötü)', '3 (Orta)', '4 (İyi)', '5 (Çok İyi)'],
            datasets: [{
                label: 'Yanıt Sayısı',
                data: counts,
                backgroundColor: [
                    'rgba(239, 68, 68, 0.6)',
                    'rgba(249, 115, 22, 0.6)',
                    'rgba(234, 179, 8, 0.6)',
                    'rgba(132, 204, 22, 0.6)',
                    'rgba(16, 185, 129, 0.6)'
                ],
                borderRadius: 4,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { display: false } },
                x: { grid: { display: false } }
            }
        }
    });

    modal.classList.remove('hidden');
    modal.classList.add('flex'); // Ensure flex display
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
    document.getElementById('detailModal').classList.remove('flex');
}

function copyChartToClipboard(canvasId, msgId) {
    const canvas = document.getElementById(canvasId);
    canvas.toBlob(blob => {
        const item = new ClipboardItem({ "image/png": blob });
        navigator.clipboard.write([item]).then(() => {
            const msg = document.getElementById(msgId);
            msg.classList.remove('hidden');
            msg.classList.add('copy-feedback');
            setTimeout(() => {
                msg.classList.add('hidden');
                msg.classList.remove('copy-feedback');
            }, 2000);
        });
    });
}

// Editor (Simple update to match style)
function renderEditor() {
    const table = document.getElementById('editor-table');
    if (originalJson.length === 0) {
        table.innerHTML = '<tr><td class="p-4 text-center text-slate-500">Veri bulunamadı.</td></tr>';
        return;
    }

    const totalPages = Math.ceil(originalJson.length / editorPageSize);
    document.getElementById('editor-page-info').textContent = `Sayfa ${editorPage} / ${totalPages}`;

    const start = (editorPage - 1) * editorPageSize;
    const end = Math.min(start + editorPageSize, originalJson.length);
    const pageData = originalJson.slice(start, end);
    const keys = Object.keys(originalJson[0]);

    let html = '<thead class="bg-slate-50 border-b"><tr>';
    keys.forEach(key => {
        html += `<th class="p-3 font-semibold text-slate-600 border-r border-slate-200 text-xs uppercase" style="min-width:150px">${key.substring(0, 30)}...</th>`;
    });
    html += '</tr></thead><tbody>';

    pageData.forEach((row, rowIdx) => {
        const globalIdx = start + rowIdx;
        html += `<tr class="border-b hover:bg-slate-50 transition">`;
        keys.forEach(key => {
            let val = row[key] !== undefined ? row[key] : '';
            let safeVal = String(val).replace(/"/g, '&quot;');
            html += `<td class="p-1 border-r border-slate-100">
                <input class="editor-input text-xs w-full p-2 bg-transparent rounded focus:bg-white transition-colors" 
                       value="${safeVal}" 
                       onchange="updateCell(${globalIdx}, '${key}', this.value)"
                       onkeydown="if(event.key === 'Enter') this.blur()">
            </td>`;
        });
        html += `</tr>`;
    });
    html += '</tbody>';
    table.innerHTML = html;
}

function updateCell(idx, key, value) {
    if (!isNaN(value) && value.trim() !== '') {
        originalJson[idx][key] = parseFloat(value);
    } else {
        originalJson[idx][key] = value;
    }
}

function changeEditorPage(delta) {
    const totalPages = Math.ceil(originalJson.length / editorPageSize);
    const newPage = editorPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        editorPage = newPage;
        renderEditor();
    }
}

function openComparisonModal() {
    /* Same as before but checking hidden class logic */
    const groupSelect = document.getElementById('groupSelect');
    const groupKey = groupSelect.value;
    if (groupKey === 'none') {
        alert("Önce bir karşılaştırma kriteri seçmelisiniz (Sol Menü).");
        return;
    }
    const data = getFilteredData();
    const groups = [...new Set(data.map(d => d[groupKey]))].filter(g => g !== undefined && g !== null).sort();

    const selA = document.getElementById('compA');
    const selB = document.getElementById('compB');
    selA.innerHTML = '';
    selB.innerHTML = '';

    groups.forEach(g => {
        const opA = document.createElement('option');
        opA.value = g; opA.textContent = g;
        selA.appendChild(opA);
        const opB = document.createElement('option');
        opB.value = g; opB.textContent = g;
        selB.appendChild(opB);
    });

    if (groups.length > 1) selB.selectedIndex = 1;

    document.getElementById('compareModal').classList.remove('hidden');
    document.getElementById('compareModal').classList.add('flex');
    renderComparison();
}

function renderComparison() {
    const groupKey = document.getElementById('groupSelect').value;
    const groupA = document.getElementById('compA').value;
    const groupB = document.getElementById('compB').value;
    const data = getFilteredData();

    const dataA = data.filter(d => d[groupKey] == groupA);
    const dataB = data.filter(d => d[groupKey] == groupB);

    const avgsA = [], avgsB = [], deltas = [];

    questionList.forEach((q, i) => {
        const k = `Q${i + 1}`;
        const sumA = dataA.reduce((a, r) => a + r[k], 0);
        const avgA = dataA.length ? sumA / dataA.length : 0;
        const sumB = dataB.reduce((a, r) => a + r[k], 0);
        const avgB = dataB.length ? sumB / dataB.length : 0;

        avgsA.push(avgA.toFixed(2));
        avgsB.push(avgB.toFixed(2));
        deltas.push({
            q: `S${i + 1}`,
            text: q,
            valA: avgA,
            valB: avgB,
            diff: Math.abs(avgA - avgB),
            winner: avgA > avgB ? groupA : (avgB > avgA ? groupB : "Eşit")
        });
    });

    const ctx = document.getElementById('compChart').getContext('2d');
    if (charts.comp) charts.comp.destroy();

    charts.comp = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: questionList.map((_, i) => `S${i + 1}`),
            datasets: [
                {
                    label: groupA,
                    data: avgsA,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    pointRadius: 4,
                    borderWidth: 2
                },
                {
                    label: groupB,
                    data: avgsB,
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.2)',
                    pointRadius: 4,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: { min: 1, max: 5, grid: { color: '#f1f5f9' }, pointLabels: { font: { size: 10 } } }
            },
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    deltas.sort((a, b) => b.diff - a.diff);
    const tbody = document.getElementById('compTableBody');
    tbody.innerHTML = '';

    deltas.slice(0, 10).forEach(d => {
        const row = document.createElement('tr');
        row.className = "border-b border-slate-50 hover:bg-slate-50 transition";
        const colorClass = d.winner === groupA ? "text-indigo-600" : (d.winner === groupB ? "text-orange-600" : "text-slate-400");
        const barWidth = (d.diff / 2) * 100;

        row.innerHTML = `
            <td class="p-3" title="${d.text}">
                <div class="flex items-center">
                    <span class="font-bold text-xs bg-slate-100 px-1.5 rounded mr-2 text-slate-500">${d.q}</span> 
                    <span class="opacity-90 text-xs font-medium text-slate-700 clamp-1">${d.text.substring(0, 25)}...</span>
                </div>
            </td>
            <td class="p-3">
                <div class="flex items-center gap-2">
                     <span class="font-bold text-slate-800 dark:text-white w-8 text-right">${d.diff.toFixed(2)}</span>
                     <div class="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full bg-slate-400" style="width: ${Math.min(100, barWidth)}%"></div>
                     </div>
                </div>
            </td>
            <td class="p-3 text-xs font-bold ${colorClass} text-right">${d.winner}</td>
        `;
        tbody.appendChild(row);
    });
}

// --- FEATURE: Dark Mode ---
function toggleDarkMode() {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    // Update Chart Defaults
    if (isDark) {
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.borderColor = '#334155';
    } else {
        Chart.defaults.color = '#64748b';
        Chart.defaults.borderColor = '#e2e8f0';
    }

    // Trigger full dashboard update to regenerate datasets with new palette
    if (typeof updateDashboard === 'function' && typeof questionList !== 'undefined' && questionList.length > 0) {
        updateDashboard();
    }
}

// Check preference on load
if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
    if (typeof Chart !== 'undefined') {
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.borderColor = '#334155';
    }
}

// --- FEATURE: PDF Export (Modern & Robust) ---
async function exportPDF() {
    console.log('PDF Export Started');

    // Validation
    if (!questionList || questionList.length === 0) {
        alert('Lütfen önce bir Excel dosyası yükleyin.');
        return;
    }

    const data = getFilteredData();
    if (!data || data.length === 0) {
        alert('Veri bulunamadı. Lütfen dosya yükleyin.');
        return;
    }

    // Show loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'pdf-loading';
    loadingDiv.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.8); z-index: 9999;
        display: flex; align-items: center; justify-content: center;
        color: white; font-size: 18px; font-weight: bold;
    `;
    loadingDiv.innerHTML = `
        <div style="text-align: center;">
            <div class="animate-spin" style="width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; margin: 0 auto 20px;"></div>
            <div>PDF Raporu Oluşturuluyor...</div>
            <div style="font-size: 14px; opacity: 0.7; margin-top: 10px;">Lütfen bekleyin</div>
        </div>
    `;
    document.body.appendChild(loadingDiv);

    try {
        // 1. Prepare metrics
        const dateStr = new Date().toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Calculate overall statistics
        let totalSum = 0, totalCount = 0;
        data.forEach(row => {
            questionList.forEach((_, i) => {
                const val = row[`Q${i + 1}`];
                if (val && !isNaN(val)) {
                    totalSum += parseFloat(val);
                    totalCount++;
                }
            });
        });
        const overallAvg = totalCount > 0 ? (totalSum / totalCount).toFixed(2) : '0.00';
        const participantCount = data.length;

        // Cronbach's Alpha
        let alpha = '0.00';
        if (typeof calculateCronbachAlpha === 'function') {
            alpha = calculateCronbachAlpha(data).toFixed(2);
        }

        // 2. Capture charts as images (with validation)
        let mainChartImg = null;
        let distChartImg = null;

        if (charts && charts.main && charts.main.canvas) {
            const canvas = charts.main.canvas;
            if (canvas.width > 0 && canvas.height > 0) {
                mainChartImg = canvas.toDataURL('image/png', 1.0);
            }
        }

        if (charts && charts.dist && charts.dist.canvas) {
            const canvas = charts.dist.canvas;
            if (canvas.width > 0 && canvas.height > 0) {
                distChartImg = canvas.toDataURL('image/png', 1.0);
            }
        }

        // 3. Build PDF content
        const pdfContent = document.createElement('div');
        pdfContent.style.cssText = `
            width: 210mm;
            min-height: 297mm;
            background: white;
            color: #1e293b;
            font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
            padding: 20mm;
            box-sizing: border-box;
        `;

        // Header
        pdfContent.innerHTML = `
            <!-- HEADER -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px;">
                <div>
                    <h1 style="font-size: 26px; font-weight: 800; color: #1e293b; margin: 0 0 5px 0;">Memnuniyet Analiz Raporu</h1>
                    <p style="color: #64748b; margin: 0; font-size: 13px;">Detaylı İstatistiksel Değerlendirme</p>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Rapor Tarihi</div>
                    <div style="font-size: 13px; font-weight: bold; color: #475569; margin-top: 3px;">${dateStr}</div>
                </div>
            </div>
            
            <!-- KEY METRICS -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px;">
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 18px; border-radius: 10px; color: white;">
                    <div style="font-size: 11px; text-transform: uppercase; opacity: 0.9; margin-bottom: 5px;">Katılımcı Sayısı</div>
                    <div style="font-size: 32px; font-weight: 800;">${participantCount}</div>
                </div>
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 18px; border-radius: 10px; color: white;">
                    <div style="font-size: 11px; text-transform: uppercase; opacity: 0.9; margin-bottom: 5px;">Genel Ortalama</div>
                    <div style="font-size: 32px; font-weight: 800;">${overallAvg}</div>
                    <div style="font-size: 10px; opacity: 0.8; margin-top: 3px;">5.0 üzerinden</div>
                </div>
                <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 18px; border-radius: 10px; color: white;">
                    <div style="font-size: 11px; text-transform: uppercase; opacity: 0.9; margin-bottom: 5px;">Güvenilirlik</div>
                    <div style="font-size: 32px; font-weight: 800;">${alpha}</div>
                    <div style="font-size: 10px; opacity: 0.8; margin-top: 3px;">Cronbach's α</div>
                </div>
            </div>
        `;

        // Charts Section
        if (mainChartImg || distChartImg) {
            let chartsHTML = '<div style="margin-bottom: 25px;">';

            if (mainChartImg) {
                chartsHTML += `
                    <h2 style="font-size: 16px; font-weight: 700; color: #1e293b; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 15px;">
                        Soru Bazlı Memnuniyet Analizi
                    </h2>
                    <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc; margin-bottom: 20px;">
                        <img src="${mainChartImg}" style="width: 100%; height: auto; display: block;" />
                    </div>
                `;
            }

            if (distChartImg) {
                chartsHTML += `
                    <h2 style="font-size: 16px; font-weight: 700; color: #1e293b; border-left: 4px solid #f59e0b; padding-left: 10px; margin-bottom: 15px;">
                        Katılımcı Dağılımı
                    </h2>
                    <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc; text-align: center;">
                        <img src="${distChartImg}" style="width: 60%; height: auto; display: inline-block;" />
                    </div>
                `;
            }

            chartsHTML += '</div>';
            pdfContent.innerHTML += chartsHTML;
        }

        // Add Detailed Report if available
        if (typeof generateDetailedReport === 'function') {
            // Make sure report is generated
            generateDetailedReport();

            // Wait a bit for rendering
            await new Promise(resolve => setTimeout(resolve, 500));

            const executiveSummary = document.getElementById('executive-summary');
            const reportScore = document.getElementById('report-overall-score');
            const reportParticipants = document.getElementById('report-participants');
            const reportReliability = document.getElementById('report-reliability');
            const reportConsistency = document.getElementById('report-consistency');
            const keyFindings = document.getElementById('key-findings');
            const actionItems = document.getElementById('action-items');
            const strengthsList = document.getElementById('strengths-list');
            const weaknessesList = document.getElementById('weaknesses-list');

            let reportHTML = `
                <div style="break-before: page; padding-top: 20px;">
                    <h2 style="font-size: 18px; font-weight: 700; color: #1e293b; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 20px;">
                        Detaylı Analiz Raporu
                    </h2>
            `;

            // Executive Summary
            if (executiveSummary && executiveSummary.textContent.trim() && !executiveSummary.textContent.includes('yükleyin')) {
                reportHTML += `
                    <div style="background: #f0f9ff; padding: 18px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #bae6fd;">
                        <h3 style="font-size: 14px; font-weight: 700; color: #0c4a6e; margin: 0 0 12px 0;">📋 Yönetici Özeti</h3>
                        <div style="font-size: 12px; line-height: 1.6; color: #334155;">
                            ${executiveSummary.innerHTML}
                        </div>
                    </div>
                `;
            }

            // Key Findings & Actions Grid
            if ((keyFindings && !keyFindings.innerHTML.includes('bekleniyor')) ||
                (actionItems && !actionItems.innerHTML.includes('bekleniyor'))) {
                reportHTML += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">';

                if (keyFindings && !keyFindings.innerHTML.includes('bekleniyor')) {
                    reportHTML += `
                        <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <h4 style="font-size: 13px; font-weight: 700; color: #1e293b; margin: 0 0 10px 0;">💡 Önemli Bulgular</h4>
                            <div style="font-size: 11px;">${keyFindings.innerHTML}</div>
                        </div>
                    `;
                }

                if (actionItems && !actionItems.innerHTML.includes('bekleniyor')) {
                    reportHTML += `
                        <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <h4 style="font-size: 13px; font-weight: 700; color: #1e293b; margin: 0 0 10px 0;">✅ Aksiyon Önerileri</h4>
                            <div style="font-size: 11px;">${actionItems.innerHTML}</div>
                        </div>
                    `;
                }

                reportHTML += '</div>';
            }

            // Strengths & Weaknesses
            if ((strengthsList && !strengthsList.innerHTML.includes('bekleniyor')) ||
                (weaknessesList && !weaknessesList.innerHTML.includes('bekleniyor'))) {
                reportHTML += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">';

                if (strengthsList && !strengthsList.innerHTML.includes('bekleniyor')) {
                    reportHTML += `
                        <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0;">
                            <h4 style="font-size: 13px; font-weight: 700; color: #166534; margin: 0 0 10px 0;">🏆 Güçlü Yönler</h4>
                            <div style="font-size: 11px;">${strengthsList.innerHTML}</div>
                        </div>
                    `;
                }

                if (weaknessesList && !weaknessesList.innerHTML.includes('bekleniyor')) {
                    reportHTML += `
                        <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fecaca;">
                            <h4 style="font-size: 13px; font-weight: 700; color: #991b1b; margin: 0 0 10px 0;">⚠️ İyileştirme Alanları</h4>
                            <div style="font-size: 11px;">${weaknessesList.innerHTML}</div>
                        </div>
                    `;
                }

                reportHTML += '</div>';
            }

            reportHTML += '</div>';
            pdfContent.innerHTML += reportHTML;
        }

        // Footer
        pdfContent.innerHTML += `
            <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 10px;">
                Bu rapor otomatik analiz sistemi tarafından ${dateStr} tarihinde oluşturulmuştur.
            </div>
        `;

        // Temporarily add to body for rendering - VISIBLE for html2canvas
        pdfContent.style.position = 'fixed';
        pdfContent.style.left = '0';
        pdfContent.style.top = '0';
        pdfContent.style.zIndex = '10000';  // Below loading overlay (9999)
        document.body.appendChild(pdfContent);

        // Wait for DOM rendering
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('PDF content rendered, starting capture...');

        // 4. Generate PDF
        const opt = {
            margin: [10, 10, 10, 10],
            filename: `analiz-raporu-${new Date().getTime()}.pdf`,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false,
                letterRendering: true,
                allowTaint: true
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait',
                compress: true
            },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        console.log('Calling html2pdf...');
        await html2pdf().set(opt).from(pdfContent).save();
        console.log('html2pdf completed');

        // Cleanup
        document.body.removeChild(pdfContent);
        document.body.removeChild(loadingDiv);

        console.log('PDF Export Successful');

    } catch (error) {
        console.error('PDF Export Error:', error);

        // Remove loading if it exists
        const loading = document.getElementById('pdf-loading');
        if (loading) document.body.removeChild(loading);

        alert('PDF oluşturulurken bir hata oluştu. Lütfen sayfayı yenileyin ve tekrar deneyin.\n\nHata: ' + error.message);
    }
}

// --- FEATURE: Onboarding Tour ---
function startTour() {
    const driver = window.driver.js.driver;

    const tour = driver({
        showProgress: true,
        steps: [
            { element: '#uploadOverlay', popover: { title: '1. Veri Yükleme', description: 'Analize başlamak için Excel dosyanızı buraya sürükleyin veya tıklayarak seçin.' } },
            { element: '.sidebar', popover: { title: '2. Filtreleme Menüsü', description: 'Verileri Fakülte, Bölüm gibi sütunlara göre filtreleyin ve özelleştirin.' } },
            { element: '#groupSelect', popover: { title: '3. Karşılaştırma Grubu', description: 'Isı haritası ve grup analizlerinde kullanılacak karşılaştırma kriterini seçin.' } },
            { element: '#mainChartContainer', popover: { title: '4. Ana Grafik', description: 'Tüm soruların memnuniyet ortalamalarını görselleştiren interaktif grafik.' } },
            { element: '#high-low-container', popover: { title: '5. En İyi/Kötü Sorular', description: 'En yüksek ve en düşük puanlı soruları hızlıca görün.' } },
            { element: '#tab-btn-general', popover: { title: '6. Genel Bakış', description: 'Ana analiz ekranı - grafikler, istatistikler ve genel değerlendirme.' } },
            { element: '#tab-btn-heatmap', popover: { title: '7. Isı Haritası', description: 'Grupların her sorudaki performansını renk kodlarıyla detaylı karşılaştırın.' } },
            { element: '#tab-btn-feedback', popover: { title: '8. Görüş ve Öneriler', description: 'Açık uçlu yorumları sentiment analizi ile değerlendirin.' } },
            { element: '#tab-btn-report', popover: { title: '9. Detaylı Rapor', description: 'Otomatik oluşturulan yönetici özeti, bulgular ve aksiyon önerileri.' } },
            { element: '#tab-btn-editor', popover: { title: '10. Veri Editörü', description: 'Ham verileri görüntüleyin ve düzenleyin.' } },
            { element: '#distChart', popover: { title: '11. Katılımcı Dağılımı', description: 'Anketi hangi grupların cevapladığını gösteren dağılım grafiği.' } },
            { element: '#correlation-container', popover: { title: '12. İlişki Analizi', description: 'Sorular arasındaki korelasyonları keşfedin.' } },
            { element: '#questions-table', popover: { title: '13. Detay Tablosu', description: 'Her sorunun istatistiksel dökümü (ortalama, std. sapma, vb.)' } },
            { element: 'header button[onclick="openComparisonModal()"]', popover: { title: '14. Karşılaştırma Modu', description: 'İki grubu radar grafiği ile detaylı kıyaslayın.' } },
            { element: 'header button[onclick="exportPDF()"]', popover: { title: '15. PDF Rapor', description: 'Tüm analizleri ve detaylı raporu tek bir PDF dosyası olarak indirin.' } },
            { element: 'header button[onclick="toggleDarkMode()"]', popover: { title: '16. Karanlık Mod', description: 'Göz yormayan karanlık tema ile çalışın.' } }
        ]
    });

    tour.drive();
}
