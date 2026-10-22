// --- UI & CHARTS ---

window.showChartLabels = true;
let currentChartType = 'bar';
window.charts = {}; // Global: chart-annotation.js ve diğer modüller buraya erişir
let charts = window.charts; // Yerel referans — ikisi aynı nesneyi gösterir
let activeTab = 'general';
let tableSort = { key: 'id', order: 'asc' };
let editorPage = 1;
const editorPageSize = 50;

// Register plugins safely
if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
}

// --- TOAST NOTIFICATION SYSTEM ---
function showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed; bottom: 24px; right: 24px; z-index: 9999;
            display: flex; flex-direction: column; gap: 10px; pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    const icons = {
        success: 'fa-circle-check',
        error:   'fa-circle-xmark',
        warning: 'fa-triangle-exclamation',
        info:    'fa-circle-info'
    };
    const colors = {
        success: { bg: '#f0fdf4', border: '#86efac', icon: '#16a34a', text: '#15803d' },
        error:   { bg: '#fef2f2', border: '#fca5a5', icon: '#dc2626', text: '#b91c1c' },
        warning: { bg: '#fffbeb', border: '#fde68a', icon: '#d97706', text: '#b45309' },
        info:    { bg: '#eff6ff', border: '#93c5fd', icon: '#2563eb', text: '#1d4ed8' }
    };
    const c = colors[type] || colors.info;
    const icon = icons[type] || icons.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
        display: flex; align-items: center; gap: 10px;
        background: ${c.bg}; border: 1px solid ${c.border}; border-radius: 10px;
        padding: 12px 16px; min-width: 260px; max-width: 380px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.12);
        pointer-events: all; cursor: default;
        animation: toastSlideIn 0.3s ease; opacity: 1;
        transition: opacity 0.3s ease, transform 0.3s ease;
    `;
    toast.innerHTML = `
        <i class="fa-solid ${icon}" style="color:${c.icon}; font-size:16px; flex-shrink:0;"></i>
        <span style="font-size:13px; font-weight:500; color:${c.text}; line-height:1.4;">${message}</span>
    `;

    // Inject animation if not already present
    if (!document.getElementById('toast-style')) {
        const style = document.createElement('style');
        style.id = 'toast-style';
        style.textContent = `
            @keyframes toastSlideIn {
                from { opacity: 0; transform: translateY(16px); }
                to   { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        setTimeout(() => toast.remove(), 320);
    }, duration);
}



// --- REPORT CUSTOMIZATION SETTINGS ---

const DEFAULT_TITLE = "Analiz Paneli";

document.addEventListener('DOMContentLoaded', () => {
    initReportSettings();
});

function initReportSettings() {
    // Load Title
    const savedTitle = localStorage.getItem('custom_report_title');
    if (savedTitle) {
        applyPageTitle(savedTitle);
        const input = document.getElementById('reportTitleInput');
        if (input) input.value = savedTitle;
    }

    // Load Logo
    const savedLogo = localStorage.getItem('custom_report_logo');
    if (savedLogo) {
        applyLogo(savedLogo);
        const text = document.getElementById('logo-upload-text');
        if (text) text.textContent = "Logo Yüklü (Değiştir)";
    }
}

function handleReportTitleChange(val) {
    if (!val || val.trim() === '') {
        val = DEFAULT_TITLE;
        localStorage.removeItem('custom_report_title');
    } else {
        localStorage.setItem('custom_report_title', val);
    }
    
    applyPageTitle(val);
}

function applyPageTitle(val) {
    const titles = document.querySelectorAll('[data-page-title]');
    titles.forEach(t => {
        if (t.tagName === 'H1') {
            t.innerHTML = `<i class="fa-solid fa-chart-pie text-indigo-500"></i> ${val}`;
        } else {
            t.textContent = val;
        }
    });
}

function handleLogoUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];

        // Size Check (500KB)
        if (file.size > 500 * 1024) {
            showToast("Logo dosyası çok büyük! Lütfen 500KB'dan küçük bir dosya seçin.", 'error');
            input.value = ''; // Reset
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const base64 = e.target.result;
            // Validate Image
            if (!base64.startsWith('data:image')) {
                showToast('Lütfen geçerli bir resim dosyası seçin.', 'error');
                return;
            }

            localStorage.setItem('custom_report_logo', base64);
            applyLogo(base64);
            const logoText = document.getElementById('logo-upload-text');
            if (logoText) logoText.textContent = "Logo Yüklü (Değiştir)";
        };
        reader.readAsDataURL(file);
    }
}

function applyLogo(base64) {
    // Check if logo container exists in header, if not create it
    let logoImg = document.getElementById('custom-header-logo');
    const headerTitle = document.getElementById('page-title');

    if (!logoImg) {
        logoImg = document.createElement('img');
        logoImg.id = 'custom-header-logo';
        logoImg.className = "h-10 mr-4 object-contain hidden sm:block"; // Tailwind classes
        // Insert before the title
        headerTitle.parentNode.insertBefore(logoImg, headerTitle);
    }

    logoImg.src = base64;
    logoImg.style.display = 'block';
}



function clearLogo() {
    localStorage.removeItem('custom_report_logo');
    // Remove from UI if present
    const logoImg = document.getElementById('custom-header-logo');
    if (logoImg) logoImg.remove();

    const logoInput = document.getElementById('logoInput');
    if (logoInput) logoInput.value = '';

    const logoText = document.getElementById('logo-upload-text');
    if (logoText) logoText.textContent = "Dosya Seç";
}


// --- THEME & PALETTES ---
const PALETTES = {
    light: [
        { border: '#4f46e5', bg: 'rgba(79, 70, 229, 0.8)' }, // Indigo (Pro)
        { border: '#0284c7', bg: 'rgba(2, 132, 199, 0.8)' }, // Sky
        { border: '#059669', bg: 'rgba(5, 150, 105, 0.8)' }, // Emerald
        { border: '#d97706', bg: 'rgba(217, 119, 6, 0.8)' }, // Amber
        { border: '#dc2626', bg: 'rgba(220, 38, 38, 0.8)' }, // Red
    ],
    dark: [
        { border: '#818cf8', bg: 'rgba(129, 140, 248, 0.85)' }, // Bright Indigo
        { border: '#38bdf8', bg: 'rgba(56, 189, 248, 0.85)' }, // Bright Sky
        { border: '#34d399', bg: 'rgba(52, 211, 153, 0.85)' }, // Bright Emerald
        { border: '#fbbf24', bg: 'rgba(251, 191, 36, 0.85)' }, // Bright Amber
        { border: '#f87171', bg: 'rgba(248, 113, 113, 0.85)' }, // Bright Red
    ]
};
const TRAFFIC_PALETTE = {
    light: { low: 'rgba(220, 38, 38, 0.8)', mid: 'rgba(217, 119, 6, 0.8)', high: 'rgba(5, 150, 105, 0.8)' },
    dark: { low: 'rgba(248, 113, 113, 0.8)', mid: 'rgba(251, 191, 36, 0.8)', high: 'rgba(52, 211, 153, 0.8)' }
};



// --- HELPER: Theme-aware chart colors (single source of truth) ---
function isDarkTheme() {
    return document.documentElement.classList.contains('dark');
}

function getChartTheme(isDark = isDarkTheme()) {
    return isDark ? {
        isDark: true,
        text: '#cbd5e1',          // Slate 300 - readable on slate 800/900
        textMuted: '#94a3b8',     // Slate 400
        grid: 'rgba(148, 163, 184, 0.18)',
        axis: 'rgba(148, 163, 184, 0.35)',
        datalabel: '#f1f5f9',
        surface: '#1e293b',       // Card background (borders/backdrops)
        tooltipBg: 'rgba(15, 23, 42, 0.95)',
        tooltipTitle: '#f8fafc',
        tooltipBody: '#cbd5e1',
        tooltipBorder: '#475569',
        accent: '#60a5fa',
        accentStrong: '#93c5fd',
        purple: '#c084fc',
        gradientTop: 1,
        gradientBottom: 0.6
    } : {
        isDark: false,
        text: '#475569',          // Slate 600 - readable on white
        textMuted: '#64748b',     // Slate 500
        grid: '#e2e8f0',
        axis: '#cbd5e1',
        datalabel: '#334155',
        surface: '#ffffff',
        tooltipBg: 'rgba(255, 255, 255, 0.97)',
        tooltipTitle: '#0f172a',
        tooltipBody: '#475569',
        tooltipBorder: '#cbd5e1',
        accent: '#2563eb',
        accentStrong: '#1e40af',
        purple: '#7c3aed',
        gradientTop: 0.95,
        gradientBottom: 0.55
    };
}

// Shared tooltip styling for all charts
function getTooltipTheme(theme = getChartTheme()) {
    return {
        backgroundColor: theme.tooltipBg,
        titleColor: theme.tooltipTitle,
        bodyColor: theme.tooltipBody,
        borderColor: theme.tooltipBorder,
        borderWidth: 1
    };
}

// Apply global Chart.js defaults according to the current theme
function applyChartThemeDefaults() {
    if (typeof Chart === 'undefined') return;
    const theme = getChartTheme();
    Chart.defaults.color = theme.text;
    Chart.defaults.borderColor = theme.grid;
}

// --- HELPER: Color -> rgba(r,g,b,alpha) (supports #rgb, #rrggbb, rgb(), rgba()) ---
function toRgba(color, alpha) {
    if (typeof color !== 'string') return color;
    const c = color.trim();
    if (c.startsWith('#')) {
        let hex = c.slice(1);
        if (hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('');
        const num = parseInt(hex.substring(0, 6), 16);
        if (isNaN(num)) return color;
        return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
    }
    const m = c.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (m) return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
    return color;
}

// --- HELPER: Gradient Generator ---
// Returns a scriptable color: the gradient is computed from the real chart area,
// so tall (horizontal) charts no longer fade to near-transparent below 400px.
// options.horizontal = true -> gradient runs left to right (for indexAxis: 'y').
function createGradient(ctx, color, options = {}) {
    const horizontal = !!options.horizontal;
    return (context) => {
        const theme = getChartTheme();
        const chart = context && context.chart;
        const solid = toRgba(color, theme.gradientTop);
        if (!chart || !chart.chartArea) return solid;

        const { chartArea } = chart;
        const c2d = chart.ctx || ctx;
        const gradient = horizontal
            ? c2d.createLinearGradient(chartArea.left, 0, chartArea.right, 0)
            : c2d.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);

        gradient.addColorStop(0, toRgba(color, theme.gradientBottom));
        gradient.addColorStop(1, solid);
        return gradient;
    };
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
    if (tabId === 'crosstab' && typeof renderCrossTab === 'function') renderCrossTab();
    if (tabId === 'advstats' && typeof renderAdvancedStats === 'function') renderAdvancedStats();
}

function setChartType(type) {
    currentChartType = type;
    
    // Normal chart buttons
    ['bar', 'horizontalBar', 'line', 'radar', 'area', 'scatter'].forEach(t => {
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

    // Circular chart dropdown container
    const circularTypes = ['polarArea', 'pie', 'doughnut'];
    const btnCircular = document.getElementById('btn-circular');
    const selectCircular = document.getElementById('select-circular');
    
    if (btnCircular && selectCircular) {
        if (circularTypes.includes(type)) {
            btnCircular.classList.remove('text-slate-500', 'bg-slate-100');
            btnCircular.classList.add('bg-blue-50', 'text-blue-700', 'shadow-sm', 'border', 'border-blue-100');
            selectCircular.value = type;
        } else {
            btnCircular.classList.add('text-slate-500', 'bg-slate-100');
            btnCircular.classList.remove('bg-blue-50', 'text-blue-700', 'shadow-sm', 'border', 'border-blue-100');
            selectCircular.value = "";
        }
    }

    updateDashboard();
}

function toggleDataLabels() {
    window.showChartLabels = !window.showChartLabels;
    const btn = document.getElementById('btn-toggle-labels');
    if (btn) {
        if (window.showChartLabels) {
            btn.classList.add('text-blue-600', 'dark:text-blue-400', 'bg-blue-50', 'dark:bg-blue-900/30', 'border-blue-200', 'dark:border-blue-800');
            btn.classList.remove('text-slate-500', 'dark:text-slate-400', 'bg-white', 'dark:bg-slate-800', 'border-slate-200', 'dark:border-slate-700');
            btn.innerHTML = '<i class="fa-solid fa-tags"></i> Değerleri Gizle';
        } else {
            btn.classList.remove('text-blue-600', 'dark:text-blue-400', 'bg-blue-50', 'dark:bg-blue-900/30', 'border-blue-200', 'dark:border-blue-800');
            btn.classList.add('text-slate-500', 'dark:text-slate-400', 'bg-white', 'dark:bg-slate-800', 'border-slate-200', 'dark:border-slate-700');
            btn.innerHTML = '<i class="fa-solid fa-tag"></i> Değerleri Göster';
        }
    }
    // Update existing charts
    if(charts['main']) charts['main'].update();
    if(charts['timeSeries']) charts['timeSeries'].update();
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



    const labels = stats.map(s => `S${s.id}`);
    const datasets = [];

    // --- Dataset Generation Logic ---
    const isDark = document.documentElement.classList.contains('dark');
    // Define Chart Colors based on theme
    const theme = getChartTheme(isDark);
    const gridColor = theme.grid;
    const textColor = theme.text;
    const axisColor = theme.axis;
    const isHorizontal = currentChartType === 'horizontalBar';
    const isBarLike = currentChartType === 'bar' || isHorizontal;

    // Fallback if constants are missing (safe guard)
    const activePalette = (typeof PALETTES !== 'undefined' && isDark) ? PALETTES.dark : (typeof PALETTES !== 'undefined' ? PALETTES.light : PALETTE);
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

            // Overlapping fills (area / radar) need lower opacity so every group stays visible
            const overlapFill = currentChartType === 'area' || currentChartType === 'radar';

            datasets.push({
                label: gName.length > 20 ? gName.substring(0, 20) + '...' : gName,
                data: avgs,
                backgroundColor: overlapFill ? toRgba(colorObj.border, isDark ? 0.25 : 0.18) : colorObj.bg,
                borderColor: colorObj.border,
                pointBackgroundColor: colorObj.border,
                pointBorderColor: theme.surface,
                borderWidth: isBarLike ? 1 : 2,
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

        // Base color per bar (traffic light + distinct purple for General Average)
        const baseColors = data.map((v, i) => {
            if (i === data.length - 1) return theme.purple;
            if (v < 2.5) return trafficColors.low;
            if (v < 3.5) return trafficColors.mid;
            return trafficColors.high;
        });

        // Gradients follow bar orientation and the real chart area
        const gradientFns = baseColors.map(c => createGradient(ctx, c, { horizontal: isHorizontal }));
        const borderColors = baseColors.map(c => toRgba(c, 1));

        // Single scriptable color (Chart.js doesn't resolve functions inside option arrays)
        const bgColors = (context) => {
            const i = context.dataIndex;
            if (typeof i !== 'number' || !baseColors[i]) {
                // Dataset-level (line/area fill)
                return toRgba(theme.accent, isDark ? 0.2 : 0.12);
            }
            if (isBarLike) return gradientFns[i](context);
            return toRgba(baseColors[i], 0.9);
        };
        const borderColorFn = (context) => {
            const i = context.dataIndex;
            if (typeof i !== 'number' || !borderColors[i]) return theme.accent; // line stroke
            return borderColors[i];
        };

        datasets.push({
            label: 'Genel Ortalama',
            data: data,
            backgroundColor: bgColors,
            borderColor: borderColorFn,
            pointBorderColor: theme.surface,
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
            scales: ['radar', 'polarArea', 'pie', 'doughnut'].includes(currentChartType) ? (
                ['radar', 'polarArea'].includes(currentChartType) ? {
                    r: {
                        beginAtZero: true,
                        max: 5.5,
                        grid: { color: gridColor },
                        ticks: { display: false }
                    }
                } : undefined
            ) : (currentChartType === 'horizontalBar'
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
                }),
            plugins: {
                legend: {
                    display: groupKey !== 'none', // Show legend only if grouped
                    position: 'top',
                    align: 'end',
                    labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 }, color: textColor }
                },
                tooltip: {
                    ...getTooltipTheme(theme),
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
                    color: theme.datalabel,
                    offset: 2,
                    display: (ctx) => {
                        return window.showChartLabels;
                    }
                },
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line',
                            // Only valid for Cartesian
                            yMin: targetScore, yMax: targetScore,
                            borderColor: isDark ? 'rgba(248, 113, 113, 0.85)' : 'rgba(220, 38, 38, 0.7)',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                                content: `Hedef: ${targetScore}`,
                                enabled: true,
                                position: 'start',
                                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.9)' : 'rgba(220, 38, 38, 0.9)',
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
                chartConfig.data.datasets[0].backgroundColor = toRgba(theme.accent, isDark ? 0.25 : 0.18);
                chartConfig.data.datasets[0].pointBackgroundColor = theme.accent;
            }
        }
    }

    // --- Inject annotation subtitle safely at creation time (chart-annotation.js stores state here) ---
    const mainAnnotationText = (window.chartAnnotations && window.chartAnnotations['mainChart']) || '';
    const mainAnnotationColor = (window.chartAnnotationColors && window.chartAnnotationColors['mainChart']) || null;
    chartConfig.options.plugins.subtitle = mainAnnotationText ? {
        display: true,
        text: mainAnnotationText,
        font: { size: 12, weight: 'normal', style: 'italic' },
        color: mainAnnotationColor || theme.textMuted,
        padding: { top: 4, bottom: 10 }
    } : { display: false };

    charts.main = new Chart(ctx, chartConfig);
}

function renderDistributionChart(data, groupKey) {
    const ctx = document.getElementById('distChart').getContext('2d');
    if (charts.dist) charts.dist.destroy();

    const isDark = document.documentElement.classList.contains('dark');
    const theme = getChartTheme(isDark);
    const textColor = theme.text;
    const borderColor = theme.surface;

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

    // Generate colors cycling through Palette (brighter tones in dark mode)
    const distPalette = (isDark && typeof PALETTE_DARK !== 'undefined') ? PALETTE_DARK : PALETTE;
    const bgColors = labels.map((_, i) => distPalette[i % distPalette.length].border);

    // --- Annotation state (set by chart-annotation.js, applied here safely at creation time) ---
    const distAnnotationText = (window.chartAnnotations && window.chartAnnotations['distChart']) || '';
    const distAnnotationColor = (window.chartAnnotationColors && window.chartAnnotationColors['distChart']) || null;
    const subtitleConfig = distAnnotationText ? {
        display: true,
        text: distAnnotationText,
        font: { size: 12, weight: 'normal', style: 'italic' },
        color: distAnnotationColor || theme.textMuted,
        padding: { top: 4, bottom: 12 }
    } : { display: false };

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
                subtitle: subtitleConfig,
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
                    ...getTooltipTheme(theme),
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
                    color: isDark ? '#0f172a' : '#ffffff',
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
                    showToast(`"${label}" grubunu filtrelemek için sol menüden filtre ekleyebilirsiniz.`, 'info');
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
    const theme = getChartTheme(isDark);
    const gridColor = theme.grid;
    const textColor = theme.text;
    const tooltipBg = theme.tooltipBg;
    const tooltipText = theme.tooltipTitle;
    const tooltipBorder = theme.tooltipBorder;
    const barColor = isDark ? '#60a5fa' : '#2563eb';

    charts.multiSelect = new Chart(ctx, {
        type: 'bar',
        indexAxis: 'y',
        data: {
            labels: labels,
            datasets: [{
                label: 'Seçilme Sayısı',
                data: values,
                backgroundColor: createGradient(ctx, barColor, { horizontal: true }),
                borderColor: barColor,
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
                    bodyColor: theme.tooltipBody,
                    borderColor: tooltipBorder,
                    borderWidth: 1
                },
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    formatter: (val) => val,
                    font: { weight: 'bold' },
                    color: theme.datalabel,
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

    const subtitleEl = document.getElementById('heatmap-subtitle');
    if (groupKey === 'none') {
        container.innerHTML = '<div class="p-10 text-center text-slate-400 bg-slate-50 rounded-xl my-4">Isı haritası için lütfen sol menüden bir karşılaştırma grubu seçin.</div>';
        if (subtitleEl) subtitleEl.classList.add('hidden');
        return;
    }

    // Dynamic Title Generation
    if (subtitleEl) {
        subtitleEl.classList.remove('hidden');
        const filterSelects = document.querySelectorAll('.dynamic-filter');
        let filterTexts = [];
        filterSelects.forEach(select => {
            if (select.value !== 'all') {
                filterTexts.push(`<strong>${select.dataset.key}:</strong> ${select.value}`);
            }
        });
        const filterMsg = filterTexts.length > 0 ? `| Uygulanan Filtreler: ${filterTexts.join(', ')}` : "| Aktif filtre bulunmuyor.";
        const groupLabel = document.querySelector(`#groupSelect option[value="${groupKey}"]`)?.textContent || groupKey;
        subtitleEl.innerHTML = `Karşılaştırma: <strong>${groupLabel}</strong> bazında. ${filterMsg}`;
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

        // Calculate deltas and find max/min
        const groupAverages = [];
        uniqueGroups.forEach(g => {
            const groupData = data.filter(r => r[groupKey] == g);
            const vals = groupData.map(r => r[qKey]);
            const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
            groupAverages.push({ group: g, avg: avg, count: vals.length });
        });

        const validAvgs = groupAverages.filter(g => g.avg > 0).map(g => g.avg);
        const maxAvg = validAvgs.length ? Math.max(...validAvgs) : -1;
        
        // 3. Group Columns
        groupAverages.forEach(gInfo => {
            const avg = gInfo.avg;
            const delta = avg > 0 ? avg - overallAvg : 0;
            const deltaStr = delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2);

            // Relative delta color logic (tuned for both light and dark themes)
            let bgClass = 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700';
            if (avg > 0) {
                if (delta >= 0.20) bgClass = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-sm';
                else if (delta > 0.05) bgClass = 'bg-green-50 dark:bg-emerald-950/30 text-green-700 dark:text-emerald-400 border border-green-200 dark:border-emerald-800/40';
                else if (delta >= -0.05) bgClass = 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
                else if (delta > -0.20) bgClass = 'bg-orange-100 dark:bg-amber-950/50 text-orange-800 dark:text-amber-300 border border-orange-200 dark:border-amber-800/50';
                else bgClass = 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700/60';
            }

            const isMax = (avg === maxAvg && avg > 0 && validAvgs.length > 1);
            const trophyHtml = isMax ? `<span class="absolute -top-2 -right-2 drop-shadow-md text-base" title="Bu sorudaki en yüksek değer">🏆</span>` : '';
            
            const deltaColor = delta > 0.05 ? 'text-emerald-600 dark:text-emerald-400' : (delta < -0.05 ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-slate-500');
            const deltaHtml = avg > 0 ? `<span class="text-[10px] font-bold ${deltaColor} mt-1 tracking-tighter">${deltaStr}</span>` : '';

            html += `<td class="p-2 text-center align-middle" onclick="openModalById(${qId})">
                <div class="cursor-pointer transition-transform hover:scale-105 rounded-lg py-1.5 px-2 mx-auto w-full max-w-[120px] flex flex-col items-center justify-center relative ${bgClass}">
                    ${trophyHtml}
                    <span class="text-sm font-bold ${avg === 0 ? 'opacity-50' : ''}">${avg.toFixed(2)}</span>
                    ${deltaHtml}
                    <span class="text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">n:${gInfo.count}</span>
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
        const delta = gAvg > 0 ? gAvg - grandMean : 0;
        const deltaStr = delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2);

        // Color Logic based on Delta
        let bgClass = 'bg-slate-100 text-slate-400 border border-slate-200';
        if (gAvg > 0) {
            if (delta >= 0.20) bgClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm';
            else if (delta > 0.05) bgClass = 'bg-green-50 text-green-700 border-green-200';
            else if (delta >= -0.05) bgClass = 'bg-slate-50 text-slate-600 border-slate-200';
            else if (delta > -0.20) bgClass = 'bg-orange-100 text-orange-800 border-orange-200';
            else bgClass = 'bg-red-100 text-red-800 border-red-300';
        }
        
        const deltaColor = delta > 0.05 ? 'text-emerald-600' : (delta < -0.05 ? 'text-red-500' : 'text-slate-400');
        const deltaHtml = gAvg > 0 ? `<span class="text-[10px] font-bold ${deltaColor} mt-0.5 tracking-tighter">${deltaStr}</span>` : '';

        html += `<td class="p-3 text-center align-middle bg-indigo-50/30">
            <div class="rounded-lg py-1.5 px-3 mx-auto w-full max-w-[120px] border flex flex-col items-center justify-center ${bgClass}">
                <span class="text-sm font-extrabold">${gAvg.toFixed(2)}</span>
                ${deltaHtml}
            </div>
        </td>`;
    });

    html += '</tr>';
    html += '</tbody></table>';

    container.innerHTML = html;
}

function renderFeedback() {
    const columnKey = document.getElementById('feedbackSource').value;
    const container = document.getElementById('comments-list');
    const cloudContainer = document.getElementById('cloud-container');
    const data = getFilteredData();

    container.innerHTML = '';
    cloudContainer.innerHTML = '';

    const comments = [];
    let posCount = 0;
    let negCount = 0;
    let allDetectedTopics = new Set();

    const words = {};
    const searchVal = document.getElementById('commentSearch') ? document.getElementById('commentSearch').value.toLocaleLowerCase('tr-TR') : "";

    // --- PASS 1: Metinleri Topla ve Dinamik Konuları Belirle ---
    const allTexts = [];
    data.forEach(row => {
        const val = row[columnKey];
        if (val === undefined || val === null) return;
        const text = String(val).trim();

        if (text.replace(/[.,\-_!?]/g, '').trim().length === 0) return;
        if (text.length < 3) return;
        const lowerText = text.toLowerCase();
        if (['yok', 'hayır', 'yoktur', 'boş'].includes(lowerText)) return;
        
        allTexts.push(text);
    });

    // Dinamik konuları NLP algoritması ile belirle
    window.currentDynamicTopics = extractDynamicTopics(allTexts);

    // --- PASS 2: Yorumları Etiketle ve Görüntüle ---
    data.forEach(row => {
        const val = row[columnKey];
        if (val === undefined || val === null) return;
        const text = String(val).trim();

        if (text.replace(/[.,\-_!?]/g, '').trim().length === 0) return;
        if (text.length < 3) return;
        const lowerText = text.toLowerCase();
        if (['yok', 'hayır', 'yoktur', 'boş'].includes(lowerText)) return;

        // 1. Text Analysis (Dinamik konularla birlikte)
        const sentResult = analyzeSentiment(text, window.currentDynamicTopics);
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
        let matchesSearch = (searchVal === "" || lowerText.includes(searchVal));
        let matchesTopic = (!window.activeTopicFilter || (sentResult.topics && sentResult.topics.includes(window.activeTopicFilter)));

        if (matchesSearch && matchesTopic) {
            let indicator = score > 0
                ? '<span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full ml-auto">Genel: Olumlu</span>'
                : (score < 0
                    ? '<span class="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full ml-auto">Genel: Olumsuz</span>'
                    : '');

            comments.push({ 
                text: text, 
                indicator: indicator, 
                topics: sentResult.topics || [],
                aspectScores: sentResult.aspectScores || {}
            });
            
            if (sentResult.topics) {
                sentResult.topics.forEach(t => allDetectedTopics.add(t));
            }

            // Word Cloud Tokenization (Global STOP_WORDS kullanarak)
            const tokens = lowerText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(/\s+/).filter(t => t.length >= 3 && typeof STOP_WORDS !== 'undefined' && !STOP_WORDS.has(t));

            // Unigrams
            tokens.forEach(t => { words[t] = (words[t] || 0) + 1; });

            // Bigrams (Öbekler)
            for (let i = 0; i < tokens.length - 1; i++) {
                const bigram = tokens[i] + " " + tokens[i + 1];
                words[bigram] = (words[bigram] || 0) + 1;
            }
        }
    });

    // --- Update UI ---

    // 1. Counters
    const countEl = document.getElementById('comment-count');
    if (countEl) countEl.textContent = comments.length;

    // 2. Sentiment Bars
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

            let topicTags = '';
            if (c.topics && c.topics.length > 0) {
                topicTags = '<div class="mt-2 flex flex-wrap gap-1">';
                c.topics.forEach(t => {
                    let score = c.aspectScores[t] || 0;
                    let colorClass = 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'; // Nötr / Sadece Eşleşme
                    let icon = '';
                    
                    if (score > 0) {
                        colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
                        icon = '<i class="fa-solid fa-arrow-up text-[8px] mr-0.5"></i>';
                    } else if (score < 0) {
                        colorClass = 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
                        icon = '<i class="fa-solid fa-arrow-down text-[8px] mr-0.5"></i>';
                    }

                    topicTags += `<span class="text-[9px] font-medium border px-1.5 py-0.5 rounded cursor-pointer transition-colors ${colorClass}" onclick="window.activeTopicFilter = (window.activeTopicFilter === '${t}') ? null : '${t}'; typeof renderFeedback === 'function' ? renderFeedback() : null;">${icon}${t}</span>`;
                });
                topicTags += '</div>';
            }

            htmlList += `
                <div class="p-3 bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-900 transition-colors">
                    <div class="flex justify-between items-start mb-1">
                        <i class="fa-solid fa-quote-left text-slate-300 dark:text-slate-600 text-sm mt-0.5"></i>
                        ${c.indicator}
                    </div>
                    <p class="text-xs text-slate-600 dark:text-slate-300 ml-5 leading-relaxed">${displayText}</p>
                    <div class="ml-5">${topicTags}</div>
                </div>
            `;
        });
        htmlList += '</div>';
        container.innerHTML = htmlList;
    }

    // 4. Update Topic Filters UI
    const filterContainer = document.getElementById('topic-filters');
    if (filterContainer) {
        let filterHtml = `<button onclick="window.activeTopicFilter=null; typeof renderFeedback === 'function' ? renderFeedback() : null;" class="px-2 py-1 rounded-full border ${!window.activeTopicFilter ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'} transition-colors text-[10px]">Tümü</button>`;
        
        const topicsToRender = window.currentDynamicTopics || [];
        topicsToRender.forEach(t => {
            const isActive = window.activeTopicFilter === t;
            filterHtml += `<button onclick="window.activeTopicFilter='${t}'; typeof renderFeedback === 'function' ? renderFeedback() : null;" class="px-2 py-1 rounded-full border ${isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'} transition-colors text-[10px]">${t}</button>`;
        });
        
        filterContainer.innerHTML = filterHtml;
    }

    // 5. Word Cloud
    const sortedWords = Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 40);
    if (sortedWords.length === 0) {
        cloudContainer.innerHTML = '<p class="text-slate-400 w-full text-center mt-4">Analiz edilecek kelime bulunamadı.</p>';
        return;
    }

    renderWordCloudChart(sortedWords);
}

function renderWordCloudChart(sortedWords) {
    const ctx = document.getElementById('wordCloudChart');
    if (!ctx) return;

    if (charts['wordCloud']) {
        charts['wordCloud'].destroy();
    }

    const labels = sortedWords.map(w => w[0]);
    const data = sortedWords.map(w => w[1] * 10); // scale up for wordcloud

    const theme = getChartTheme();
    // High-contrast blue/indigo tones per theme (no pale tones on white, no navy on slate)
    const cloudColors = theme.isDark
        ? ['#93c5fd', '#60a5fa', '#a5b4fc', '#7dd3fc', '#bfdbfe', '#c4b5fd']
        : ['#1d4ed8', '#2563eb', '#1e40af', '#4338ca', '#0369a1', '#3730a3'];

    charts['wordCloud'] = new Chart(ctx, {
        type: 'wordCloud',
        data: {
            labels: labels,
            datasets: [{
                label: 'Kelime Frekansı',
                data: data,
                color: function(context) {
                    // Stable per-word color (avoids flicker on hover/redraw)
                    const idx = typeof context.dataIndex === 'number' ? context.dataIndex : 0;
                    return cloudColors[idx % cloudColors.length];
                }
            }]
        },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: {
                    ...getTooltipTheme(theme),
                    callbacks: {
                        label: (ctx) => `Geçiş sayısı: ${ctx.raw / 10}`
                    }
                }
            }
        }
    });
}

function renderTimeSeriesChart(data) {
    const container = document.getElementById('time-series-container');
    const ctx = document.getElementById('timeSeriesChart');
    
    // Check if we have date columns mapped
    if (typeof dateColumns === 'undefined' || dateColumns.length === 0 || !container || !ctx) {
        if(container) container.classList.add('hidden');
        return;
    }

    const dateCol = dateColumns[0].key;
    
    // Group data by Date/Month
    const timeData = {};
    
    data.forEach(row => {
        let rawDate = row[dateCol];
        if(!rawDate) return;
        
        let dateObj;
        
        // Basic Excel serial date conversion (approximation if it's a number)
        if(!isNaN(rawDate) && rawDate > 25000) {
             dateObj = new Date((rawDate - (25567 + 2)) * 86400 * 1000); 
        } else {
             dateObj = new Date(rawDate);
        }
        
        if(isNaN(dateObj.getTime())) return; // Invalid date
        
        // Format to YYYY-MM
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        const periodKey = `${year}-${month}`;
        
        if(!timeData[periodKey]) {
            timeData[periodKey] = { sum: 0, count: 0 };
        }
        
        // Calculate average satisfaction for this row
        let rowSum = 0, rowQCount = 0;
        if(typeof questionList !== 'undefined') {
             questionList.forEach((_, i) => {
                 const qVal = row[`Q${i + 1}`];
                 if (qVal) { rowSum += qVal; rowQCount++; }
             });
        }
        
        if(rowQCount > 0) {
            timeData[periodKey].sum += (rowSum / rowQCount);
            timeData[periodKey].count++;
        }
    });
    
    const periods = Object.keys(timeData).sort(); // Sort chronologically
    if(periods.length === 0) {
        container.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    
    const labels = periods;
    const dataPoints = periods.map(p => parseFloat((timeData[p].sum / timeData[p].count).toFixed(2)));

    if (charts['timeSeries']) {
        charts['timeSeries'].destroy();
    }

    const theme = getChartTheme();

    charts['timeSeries'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ortalama Memnuniyet',
                data: dataPoints,
                borderColor: theme.accent,
                backgroundColor: toRgba(theme.accent, theme.isDark ? 0.18 : 0.12),
                borderWidth: 2,
                pointBackgroundColor: theme.accent,
                pointBorderColor: theme.surface,
                pointRadius: 4,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 1, max: 5, grid: { color: theme.grid }, ticks: { color: theme.text } },
                x: { grid: { color: theme.grid }, ticks: { color: theme.text } }
            },
            plugins: {
                legend: { display: false },
                tooltip: { ...getTooltipTheme(theme) },
                datalabels: {
                    align: 'top',
                    anchor: 'end',
                    offset: 4,
                    color: theme.accentStrong,
                    font: { weight: 'bold', size: 10 },
                    display: (ctx) => window.showChartLabels
                }
            }
        }
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
    const theme = getChartTheme();
    const histAlpha = theme.isDark ? 0.85 : 0.8;
    charts.modal = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['1 (Çok Kötü)', '2 (Kötü)', '3 (Orta)', '4 (İyi)', '5 (Çok İyi)'],
            datasets: [{
                label: 'Yanıt Sayısı',
                data: counts,
                backgroundColor: theme.isDark ? [
                    `rgba(248, 113, 113, ${histAlpha})`,
                    `rgba(251, 146, 60, ${histAlpha})`,
                    `rgba(250, 204, 21, ${histAlpha})`,
                    `rgba(163, 230, 53, ${histAlpha})`,
                    `rgba(52, 211, 153, ${histAlpha})`
                ] : [
                    `rgba(220, 38, 38, ${histAlpha})`,
                    `rgba(234, 88, 12, ${histAlpha})`,
                    `rgba(202, 138, 4, ${histAlpha})`,
                    `rgba(101, 163, 13, ${histAlpha})`,
                    `rgba(5, 150, 105, ${histAlpha})`
                ],
                borderRadius: 4,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { ...getTooltipTheme(theme) },
                datalabels: {
                    // Contrast ink on bars; zero-count labels (no bar behind) use normal text color
                    color: (c) => (c.dataset.data[c.dataIndex] > 0)
                        ? (theme.isDark ? '#0f172a' : '#ffffff')
                        : theme.text,
                    font: { weight: 'bold', size: 11 }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { display: false }, ticks: { color: theme.text } },
                x: { grid: { display: false }, ticks: { color: theme.text } }
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
        showToast('Önce bir karşılaştırma kriteri seçmelisiniz (Sol Menü).', 'warning');
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

    // Overall participant averages for hypothesis testing
    const overallA = dataA.map(r => {
        let sum = 0, count = 0;
        questionList.forEach((_, i) => {
            const v = r[`Q${i + 1}`];
            if (typeof v === 'number' && !isNaN(v)) { sum += v; count++; }
        });
        return count > 0 ? sum / count : null;
    }).filter(v => v !== null);

    const overallB = dataB.map(r => {
        let sum = 0, count = 0;
        questionList.forEach((_, i) => {
            const v = r[`Q${i + 1}`];
            if (typeof v === 'number' && !isNaN(v)) { sum += v; count++; }
        });
        return count > 0 ? sum / count : null;
    }).filter(v => v !== null);

    // Statistical Hypothesis Tests on Overall Satisfaction
    const statsSummaryEl = document.getElementById('compStatsSummary');
    if (statsSummaryEl) {
        if (typeof calculateTTest === 'function' && overallA.length >= 2 && overallB.length >= 2) {
            const tRes = calculateTTest(overallA, overallB);
            const mwRes = typeof calculateMannWhitneyU === 'function' ? calculateMannWhitneyU(overallA, overallB) : null;

            const badgeBg = tRes.isSignificant 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' 
                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
            const badgeIcon = tRes.isSignificant ? 'fa-check-circle text-emerald-600' : 'fa-circle-info text-slate-400';

            statsSummaryEl.className = `p-4 rounded-xl border ${badgeBg} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs transition`;
            statsSummaryEl.innerHTML = `
                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid ${badgeIcon} text-base"></i>
                        <span class="font-bold text-sm">${tRes.significanceLabel}</span>
                    </div>
                    <p class="text-xs opacity-80">
                        <strong>${groupA}</strong> (Ort: ${tRes.mean1}, n: ${overallA.length}) ile 
                        <strong>${groupB}</strong> (Ort: ${tRes.mean2}, n: ${overallB.length}) arasında fark: 
                        <span class="font-semibold">${Math.abs(tRes.diff).toFixed(2)} puan</span>
                    </p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <span class="px-2.5 py-1 bg-white/80 dark:bg-slate-700/80 rounded border border-slate-200 dark:border-slate-600 font-mono" title="Welch İki Örneklem T-Testi">
                        <strong>t:</strong> ${tRes.t} (df: ${tRes.df})
                    </span>
                    <span class="px-2.5 py-1 bg-white/80 dark:bg-slate-700/80 rounded border border-slate-200 dark:border-slate-600 font-mono font-bold" title="Anlamlılık Değeri (p < 0.05 anlamlı kabul edilir)">
                        ${tRes.pValueFormatted}
                    </span>
                    <span class="px-2.5 py-1 bg-white/80 dark:bg-slate-700/80 rounded border border-slate-200 dark:border-slate-600" title="Cohen's d Etki Büyüklüğü">
                        <strong>d:</strong> ${tRes.cohensD} <span class="opacity-75">(${tRes.effectSizeCategory})</span>
                    </span>
                    ${mwRes && mwRes.valid ? `
                    <span class="px-2.5 py-1 bg-white/80 dark:bg-slate-700/80 rounded border border-slate-200 dark:border-slate-600 font-mono" title="Mann-Whitney U Testi (Parametrik Olmayan Sıralama)">
                        <strong>U:</strong> ${mwRes.u} (z: ${mwRes.z})
                    </span>` : ''}
                </div>
            `;
        } else {
            statsSummaryEl.className = 'hidden';
            statsSummaryEl.innerHTML = '';
        }
    }

    questionList.forEach((q, i) => {
        const k = `Q${i + 1}`;
        const valsA = dataA.map(r => r[k]).filter(v => typeof v === 'number' && !isNaN(v));
        const valsB = dataB.map(r => r[k]).filter(v => typeof v === 'number' && !isNaN(v));

        const sumA = valsA.reduce((a, b) => a + b, 0);
        const avgA = valsA.length ? sumA / valsA.length : 0;
        const sumB = valsB.reduce((a, b) => a + b, 0);
        const avgB = valsB.length ? sumB / valsB.length : 0;

        const qTTest = (typeof calculateTTest === 'function' && valsA.length >= 2 && valsB.length >= 2) 
            ? calculateTTest(valsA, valsB) 
            : null;

        avgsA.push(avgA.toFixed(2));
        avgsB.push(avgB.toFixed(2));
        deltas.push({
            q: `S${i + 1}`,
            text: q,
            valA: avgA,
            valB: avgB,
            diff: Math.abs(avgA - avgB),
            winner: avgA > avgB ? groupA : (avgB > avgA ? groupB : "Eşit"),
            qTTest: qTTest
        });
    });

    const ctx = document.getElementById('compChart').getContext('2d');
    if (charts.comp) charts.comp.destroy();

    const isDark = isDarkTheme();
    const theme = getChartTheme(isDark);
    const colorA = isDark ? '#818cf8' : '#4f46e5';
    const colorB = isDark ? '#fb923c' : '#ea580c';

    charts.comp = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: questionList.map((_, i) => `S${i + 1}`),
            datasets: [
                {
                    label: groupA,
                    data: avgsA,
                    borderColor: colorA,
                    backgroundColor: toRgba(colorA, isDark ? 0.25 : 0.18),
                    pointRadius: 4,
                    pointBackgroundColor: colorA,
                    pointBorderColor: theme.surface,
                    borderWidth: 2
                },
                {
                    label: groupB,
                    data: avgsB,
                    borderColor: colorB,
                    backgroundColor: toRgba(colorB, isDark ? 0.25 : 0.18),
                    pointRadius: 4,
                    pointBackgroundColor: colorB,
                    pointBorderColor: theme.surface,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    min: 1,
                    max: 5,
                    grid: { color: theme.grid },
                    angleLines: { color: theme.axis },
                    pointLabels: {
                        font: { size: 10, family: 'Inter' },
                        color: theme.text
                    },
                    ticks: {
                        display: false,
                        backdropColor: theme.surface
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: theme.text, font: { size: 11 } }
                },
                tooltip: { ...getTooltipTheme(theme) }
            }
        }
    });

    deltas.sort((a, b) => b.diff - a.diff);
    const tbody = document.getElementById('compTableBody');
    tbody.innerHTML = '';

    deltas.slice(0, 10).forEach(d => {
        const row = document.createElement('tr');
        row.className = "border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition";
        const colorClass = d.winner === groupA ? "text-indigo-600 dark:text-indigo-400" : (d.winner === groupB ? "text-orange-600 dark:text-orange-400" : "text-slate-400");
        const barWidth = (d.diff / 2) * 100;

        let sigBadge = '';
        if (d.qTTest && d.qTTest.valid) {
            if (d.qTTest.isSignificant) {
                sigBadge = `<span class="ml-1 text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300" title="Welch t-test: ${d.qTTest.pValueFormatted}, t=${d.qTTest.t}">p<0.05*</span>`;
            } else {
                sigBadge = `<span class="ml-1 text-[9px] px-1 py-0.5 rounded bg-slate-100 text-slate-400 dark:bg-slate-700/60 dark:text-slate-400" title="Welch t-test: ${d.qTTest.pValueFormatted}">p≥0.05</span>`;
            }
        }

        row.innerHTML = `
            <td class="p-3" title="${d.text}">
                <div class="flex items-center">
                    <span class="font-bold text-xs bg-slate-100 dark:bg-slate-700 px-1.5 rounded mr-2 text-slate-500 dark:text-slate-300">${d.q}</span> 
                    <span class="opacity-90 text-xs font-medium text-slate-700 dark:text-slate-300 clamp-1">${d.text.substring(0, 25)}...</span>
                    ${sigBadge}
                </div>
            </td>
            <td class="p-3">
                <div class="flex items-center gap-2">
                     <span class="font-bold text-slate-800 dark:text-white w-8 text-right">${d.diff.toFixed(2)}</span>
                     <div class="h-1.5 flex-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div class="h-full bg-slate-400 dark:bg-slate-500" style="width: ${Math.min(100, barWidth)}%"></div>
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

    // Update Chart Defaults centrally
    if (typeof applyChartThemeDefaults === 'function') {
        applyChartThemeDefaults();
    }

    // Trigger full dashboard update to regenerate datasets with new palette
    if (typeof updateDashboard === 'function' && typeof questionList !== 'undefined' && questionList.length > 0) {
        updateDashboard();
    }

    // Re-render WordCloud if feedback tab is active
    if (activeTab === 'feedback' && typeof renderFeedback === 'function') {
        renderFeedback();
    }

    // Re-render Comparison if modal is open
    const compareModal = document.getElementById('compareModal');
    if (compareModal && !compareModal.classList.contains('hidden') && typeof renderComparison === 'function') {
        renderComparison();
    }

    // Re-render CrossTab if tab is active
    if (activeTab === 'crosstab' && typeof renderCrossTab === 'function') {
        renderCrossTab();
    }
}

// Check preference on load
if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
}
if (typeof applyChartThemeDefaults === 'function') {
    applyChartThemeDefaults();
}

// --- FEATURE: PDF Export (Modern & Robust) ---
async function exportPDF() {
    console.log('PDF Export Started');

    // Validation
    if (!questionList || questionList.length === 0) {
        showToast('Lütfen önce bir Excel dosyası yükleyin.', 'warning');
        return;
    }

    const data = getFilteredData();
    if (!data || data.length === 0) {
        showToast('Veri bulunamadı. Lütfen dosya yükleyin.', 'warning');
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

        if (typeof showToast === 'function') {
            showToast('PDF oluşturulurken hata oluştu: ' + error.message, 'error', 5000);
        } else {
            alert('PDF oluşturulurken bir hata oluştu: ' + error.message);
        }
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
            { element: '#btn-open-comp', popover: { title: '14. Karşılaştırma Modu', description: 'İki grubu radar grafiği ile detaylı kıyaslayın.' } },
            { element: 'header button[onclick="exportPDFNative()"]', popover: { title: '15. PDF Rapor', description: 'Tüm analizleri ve detaylı raporu tek bir PDF dosyası olarak indirin.' } },
            { element: 'header button[onclick="toggleDarkMode()"]', popover: { title: '16. Karanlık Mod', description: 'Göz yormayan karanlık tema ile çalışın.' } }
        ]
    });

    tour.drive();
    tour.drive();
}

// --- FEATURE: Cross Tabulation ---
// --- FEATURE: Cross Tabulation (Enhanced Colors & Visibility for Day & Night) ---
function getCrossTabCellStyle(score, themeName = 'blue', isDark = false) {
    if (typeof score !== 'number' || isNaN(score) || score <= 0) {
        return {
            bg: isDark ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc',
            border: isDark ? 'rgba(51, 65, 85, 0.4)' : '#e2e8f0',
            text: isDark ? '#64748b' : '#94a3b8',
            nColor: isDark ? '#475569' : '#cbd5e1'
        };
    }

    if (themeName === 'traffic') {
        if (score >= 4.2) {
            return {
                bg: isDark ? 'rgba(5, 150, 105, 0.9)' : '#059669',
                border: isDark ? '#34d399' : '#047857',
                text: '#ffffff',
                nColor: isDark ? '#d1fae5' : '#ecfdf5'
            };
        }
        if (score >= 3.6) {
            return {
                bg: isDark ? 'rgba(6, 78, 59, 0.55)' : '#d1fae5',
                border: isDark ? 'rgba(52, 211, 153, 0.45)' : '#6ee7b7',
                text: isDark ? '#6ee7b7' : '#065f46',
                nColor: isDark ? '#a7f3d0' : '#047857'
            };
        }
        if (score >= 3.0) {
            return {
                bg: isDark ? 'rgba(120, 53, 15, 0.55)' : '#fef3c7',
                border: isDark ? 'rgba(251, 191, 36, 0.45)' : '#fcd34d',
                text: isDark ? '#fde68a' : '#92400e',
                nColor: isDark ? '#fcd34d' : '#b45309'
            };
        }
        if (score >= 2.5) {
            return {
                bg: isDark ? 'rgba(124, 45, 18, 0.6)' : '#ffedd5',
                border: isDark ? 'rgba(251, 146, 60, 0.45)' : '#fdba74',
                text: isDark ? '#fed7aa' : '#9a3412',
                nColor: isDark ? '#fdba74' : '#c2410c'
            };
        }
        return {
            bg: isDark ? 'rgba(127, 29, 29, 0.65)' : '#fee2e2',
            border: isDark ? 'rgba(248, 113, 113, 0.45)' : '#fca5a5',
            text: isDark ? '#fca5a5' : '#991b1b',
            nColor: isDark ? '#fecaca' : '#b91c1c'
        };
    }

    if (themeName === 'emerald') {
        if (score >= 4.5) {
            return {
                bg: isDark ? '#059669' : '#047857',
                border: isDark ? '#34d399' : '#065f46',
                text: '#ffffff',
                nColor: '#d1fae5'
            };
        }
        if (score >= 4.0) {
            return {
                bg: isDark ? 'rgba(16, 185, 129, 0.85)' : '#10b981',
                border: isDark ? '#6ee7b7' : '#059669',
                text: '#ffffff',
                nColor: '#ecfdf5'
            };
        }
        if (score >= 3.5) {
            return {
                bg: isDark ? 'rgba(6, 95, 70, 0.55)' : '#a7f3d0',
                border: isDark ? 'rgba(52, 211, 153, 0.4)' : '#6ee7b7',
                text: isDark ? '#a7f3d0' : '#064e3b',
                nColor: isDark ? '#6ee7b7' : '#047857'
            };
        }
        if (score >= 3.0) {
            return {
                bg: isDark ? 'rgba(6, 78, 59, 0.4)' : '#d1fae5',
                border: isDark ? 'rgba(52, 211, 153, 0.3)' : '#a7f3d0',
                text: isDark ? '#6ee7b7' : '#065f46',
                nColor: isDark ? '#34d399' : '#059669'
            };
        }
        if (score >= 2.5) {
            return {
                bg: isDark ? 'rgba(30, 41, 59, 0.65)' : '#f0fdf4',
                border: isDark ? 'rgba(51, 65, 85, 0.4)' : '#dcfce7',
                text: isDark ? '#cbd5e1' : '#1e293b',
                nColor: isDark ? '#94a3b8' : '#64748b'
            };
        }
        return {
            bg: isDark ? 'rgba(15, 23, 42, 0.8)' : '#f8fafc',
            border: isDark ? 'rgba(51, 65, 85, 0.3)' : '#e2e8f0',
            text: isDark ? '#94a3b8' : '#475569',
            nColor: isDark ? '#64748b' : '#94a3b8'
        };
    }

    if (themeName === 'violet') {
        if (score >= 4.5) {
            return {
                bg: isDark ? '#7c3aed' : '#6d28d9',
                border: isDark ? '#a78bfa' : '#5b21b6',
                text: '#ffffff',
                nColor: '#ede9fe'
            };
        }
        if (score >= 4.0) {
            return {
                bg: isDark ? 'rgba(139, 92, 246, 0.85)' : '#8b5cf6',
                border: isDark ? '#c4b5fd' : '#7c3aed',
                text: '#ffffff',
                nColor: '#f5f3ff'
            };
        }
        if (score >= 3.5) {
            return {
                bg: isDark ? 'rgba(109, 40, 217, 0.55)' : '#c4b5fd',
                border: isDark ? 'rgba(167, 139, 250, 0.4)' : '#a78bfa',
                text: isDark ? '#ddd6fe' : '#4c1d95',
                nColor: isDark ? '#c4b5fd' : '#5b21b6'
            };
        }
        if (score >= 3.0) {
            return {
                bg: isDark ? 'rgba(91, 33, 182, 0.4)' : '#ede9fe',
                border: isDark ? 'rgba(167, 139, 250, 0.3)' : '#ddd6fe',
                text: isDark ? '#c4b5fd' : '#5b21b6',
                nColor: isDark ? '#a78bfa' : '#7c3aed'
            };
        }
        if (score >= 2.5) {
            return {
                bg: isDark ? 'rgba(30, 41, 59, 0.65)' : '#f5f3ff',
                border: isDark ? 'rgba(51, 65, 85, 0.4)' : '#ede9fe',
                text: isDark ? '#cbd5e1' : '#1e293b',
                nColor: isDark ? '#94a3b8' : '#64748b'
            };
        }
        return {
            bg: isDark ? 'rgba(15, 23, 42, 0.8)' : '#f8fafc',
            border: isDark ? 'rgba(51, 65, 85, 0.3)' : '#e2e8f0',
            text: isDark ? '#94a3b8' : '#475569',
            nColor: isDark ? '#64748b' : '#94a3b8'
        };
    }

    // Default: 'blue' (High-contrast, elegant Sapphire/Sky Blue)
    if (score >= 4.5) {
        return {
            bg: isDark ? '#2563eb' : '#1d4ed8',
            border: isDark ? '#60a5fa' : '#1e40af',
            text: '#ffffff',
            nColor: isDark ? '#dbeafe' : '#eff6ff'
        };
    }
    if (score >= 4.0) {
        return {
            bg: isDark ? '#1d4ed8' : '#3b82f6',
            border: isDark ? 'rgba(96, 165, 250, 0.5)' : '#2563eb',
            text: '#ffffff',
            nColor: isDark ? '#bfdbfe' : '#eff6ff'
        };
    }
    if (score >= 3.5) {
        return {
            bg: isDark ? 'rgba(37, 99, 235, 0.45)' : '#93c5fd',
            border: isDark ? 'rgba(96, 165, 250, 0.45)' : '#60a5fa',
            text: isDark ? '#bfdbfe' : '#1e3a8a',
            nColor: isDark ? '#93c5fd' : '#1e40af'
        };
    }
    if (score >= 3.0) {
        return {
            bg: isDark ? 'rgba(30, 58, 138, 0.4)' : '#dbeafe',
            border: isDark ? 'rgba(59, 130, 246, 0.35)' : '#bfdbfe',
            text: isDark ? '#93c5fd' : '#1e40af',
            nColor: isDark ? '#60a5fa' : '#2563eb'
        };
    }
    if (score >= 2.5) {
        return {
            bg: isDark ? 'rgba(30, 41, 59, 0.7)' : '#eff6ff',
            border: isDark ? 'rgba(51, 65, 85, 0.4)' : '#dbeafe',
            text: isDark ? '#cbd5e1' : '#1e293b',
            nColor: isDark ? '#94a3b8' : '#64748b'
        };
    }
    return {
        bg: isDark ? 'rgba(15, 23, 42, 0.8)' : '#f8fafc',
        border: isDark ? 'rgba(51, 65, 85, 0.3)' : '#e2e8f0',
        text: isDark ? '#94a3b8' : '#475569',
        nColor: isDark ? '#64748b' : '#94a3b8'
    };
}

function getCrossTabLegendHtml(themeName, isDark) {
    const isTraffic = themeName === 'traffic';
    const bands = isTraffic ? [
        { label: '< 2.5 (Kritik)', score: 2.0 },
        { label: '2.5 - 2.9 (Düşük)', score: 2.7 },
        { label: '3.0 - 3.5 (Orta)', score: 3.2 },
        { label: '3.6 - 4.1 (İyi)', score: 3.8 },
        { label: '≥ 4.2 (Çok İyi)', score: 4.6 }
    ] : [
        { label: '< 2.5', score: 2.0 },
        { label: '2.5 - 2.9', score: 2.7 },
        { label: '3.0 - 3.4', score: 3.2 },
        { label: '3.5 - 3.9', score: 3.7 },
        { label: '4.0 - 4.4', score: 4.2 },
        { label: '≥ 4.5', score: 4.7 }
    ];

    const items = bands.map(b => {
        const style = getCrossTabCellStyle(b.score, themeName, isDark);
        return `
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold shadow-xs border transition-all" 
                 style="background-color: ${style.bg}; border-color: ${style.border}; color: ${style.text}">
                <span>${b.label}</span>
            </div>
        `;
    }).join('');

    return `
        <div class="flex items-center justify-between gap-4 mb-4 p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex-wrap shadow-xs">
            <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <i class="fa-solid fa-layer-group text-blue-500"></i> Renk Skalası:
                </span>
                <div class="flex items-center gap-1.5 flex-wrap">${items}</div>
            </div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                * Hücrelerdeki <strong class="text-slate-700 dark:text-slate-200">n</strong> değeri kesişimdeki katılımcı sayısını gösterir.
            </div>
        </div>
    `;
}

function renderCrossTab() {
    const group1Key = document.getElementById('crossGroup1')?.value;
    const group2Key = document.getElementById('crossGroup2')?.value;
    const questionKey = document.getElementById('crossQuestion')?.value;
    const themeSelect = document.getElementById('crossColorTheme');
    const container = document.getElementById('crosstab-container');

    if (!container) return;

    // Restore or sync saved color theme
    let colorTheme = themeSelect ? themeSelect.value : (localStorage.getItem('crossColorTheme') || 'blue');
    if (themeSelect && themeSelect.value !== colorTheme) {
        themeSelect.value = colorTheme;
    }
    try {
        localStorage.setItem('crossColorTheme', colorTheme);
    } catch(e) {}

    const isDark = typeof isDarkTheme === 'function' ? isDarkTheme() : document.documentElement.classList.contains('dark');

    if (!group1Key || group1Key === 'none' || !group2Key || group2Key === 'none' || !questionKey) {
        container.innerHTML = '<div class="flex items-center justify-center h-full text-slate-400 text-sm py-12">Lütfen yukarıdan analiz edilecek X Ekseni, Y Ekseni ve Soruyu seçin.</div>';
        return;
    }

    if (group1Key === group2Key) {
        container.innerHTML = '<div class="flex items-center justify-center h-full text-red-500 text-sm py-12"><i class="fa-solid fa-triangle-exclamation mr-2"></i> X Ekseni ve Y Ekseni için farklı gruplar seçmelisiniz.</div>';
        return;
    }

    const rawData = getFilteredData();
    if (!rawData || rawData.length === 0) {
        container.innerHTML = '<div class="flex items-center justify-center h-full text-slate-400 text-sm py-12">Analiz edilecek veri bulunamadı.</div>';
        return;
    }

    // Determine unique values for both groups
    const g1Values = [...new Set(rawData.map(row => row[group1Key]).filter(val => val !== undefined && val !== null && val !== ''))].sort();
    const g2Values = [...new Set(rawData.map(row => row[group2Key]).filter(val => val !== undefined && val !== null && val !== ''))].sort();

    // Start with Legend Bar
    let html = getCrossTabLegendHtml(colorTheme, isDark);

    // Matrix Wrapper with Clean Scroll
    html += '<div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">';
    html += '<table class="w-full text-sm text-center border-collapse table-auto">';
    
    // Header Row (Group 1 values)
    html += '<thead class="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 sticky top-0 z-20 shadow-xs">';
    html += '<tr>';
    html += '<th class="border-b border-r border-slate-200 dark:border-slate-700 p-3 bg-slate-100 dark:bg-slate-950 font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 sticky left-0 z-30 min-w-[140px]">Y Ekseni \\ X Ekseni</th>';
    g1Values.forEach(g1 => {
        html += `<th class="border-b border-r border-slate-200 dark:border-slate-700 p-3 font-semibold text-xs tracking-tight min-w-[86px]">${g1}</th>`;
    });
    html += '<th class="border-b border-slate-200 dark:border-slate-700 p-3 font-bold text-xs uppercase tracking-wider bg-slate-100 dark:bg-slate-950 min-w-[100px]">Genel (Satır)</th>';
    html += '</tr></thead><tbody>';

    let allScores = [];
    let matrixGrandSum = 0;
    let matrixGrandCount = 0;

    // Rows (Group 2 values)
    g2Values.forEach(g2 => {
        html += `<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors">`;
        html += `<td class="border-b border-r border-slate-200 dark:border-slate-700 p-3 font-bold bg-slate-50 dark:bg-slate-900 text-left text-slate-800 dark:text-slate-200 sticky left-0 z-10 text-xs">${g2}</td>`;
        
        let rowSum = 0;
        let rowCount = 0;

        g1Values.forEach(g1 => {
            // Find intersection
            const subset = rawData.filter(row => row[group1Key] == g1 && row[group2Key] == g2);
            let cellScore = null;
            let cellContent = `<div class="py-2.5 px-2 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 font-light select-none text-sm">—</div>`;

            if (subset.length > 0) {
                let sum = 0;
                let count = 0;
                
                subset.forEach(row => {
                    if (questionKey === 'average') {
                        questionList.forEach((_, idx) => {
                            const val = row[`Q${idx + 1}`];
                            if (val) { sum += val; count++; }
                        });
                    } else {
                        const val = row[questionKey];
                        if (val) { sum += val; count++; }
                    }
                });

                if (count > 0) {
                    cellScore = sum / count;
                    rowSum += cellScore * subset.length;
                    rowCount += subset.length;
                    allScores.push(cellScore);
                    matrixGrandSum += sum;
                    matrixGrandCount += count;

                    const style = getCrossTabCellStyle(cellScore, colorTheme, isDark);

                    cellContent = `
                        <div class="rounded-lg py-2 px-2 flex flex-col items-center justify-center transition-all border shadow-2xs hover:scale-[1.03] cursor-default"
                             style="background-color: ${style.bg}; border-color: ${style.border}; color: ${style.text}">
                            <span class="text-sm font-extrabold tracking-tight">${cellScore.toFixed(2)}</span>
                            <span class="text-[10px] font-semibold mt-0.5" style="color: ${style.nColor}">n=${subset.length}</span>
                        </div>
                    `;
                }
            }
            
            html += `<td class="border-b border-r border-slate-200 dark:border-slate-700 p-1.5 min-w-[84px] align-middle">${cellContent}</td>`;
        });

        // Row Average (Genel Satır)
        let rowAvgHtml = '<span class="text-slate-300 dark:text-slate-600">—</span>';
        if (rowCount > 0) {
            const rowAvg = rowSum / rowCount;
            rowAvgHtml = `<span class="font-extrabold text-slate-800 dark:text-slate-100 text-sm">${rowAvg.toFixed(2)}</span>`;
        }
        html += `<td class="border-b border-slate-200 dark:border-slate-700 p-2.5 bg-slate-50/70 dark:bg-slate-900/80 align-middle">${rowAvgHtml}</td></tr>`;
    });

    // Column Averages (Bottom Row)
    html += '<tr class="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-bold border-t-2 border-slate-300 dark:border-slate-700">';
    html += '<td class="border-r border-slate-200 dark:border-slate-700 p-3 text-left sticky left-0 bg-slate-100 dark:bg-slate-950 z-10 text-xs uppercase tracking-wider">Genel (Sütun)</td>';
    
    g1Values.forEach(g1 => {
        const subset = rawData.filter(row => row[group1Key] == g1);
        let colSum = 0;
        let colCount = 0;
        
        subset.forEach(row => {
            if (questionKey === 'average') {
                questionList.forEach((_, idx) => {
                    const val = row[`Q${idx + 1}`];
                    if (val) { colSum += val; colCount++; }
                });
            } else {
                const val = row[questionKey];
                if (val) { colSum += val; colCount++; }
            }
        });

        let colAvgHtml = '<span class="text-slate-300 dark:text-slate-600 font-light">—</span>';
        if (colCount > 0) {
            colAvgHtml = `<span class="font-bold text-slate-800 dark:text-slate-100 text-sm">${(colSum / colCount).toFixed(2)}</span>`;
        }
        html += `<td class="border-r border-slate-200 dark:border-slate-700 p-2.5 align-middle">${colAvgHtml}</td>`;
    });
    
    // Bottom-right Grand Total Average
    const grandAvgVal = matrixGrandCount > 0 ? (matrixGrandSum / matrixGrandCount).toFixed(2) : '-';
    html += `
        <td class="p-2.5 bg-blue-50/70 dark:bg-blue-950/40 text-center align-middle border-slate-200 dark:border-slate-700">
            <div class="flex flex-col items-center justify-center">
                <span class="font-extrabold text-blue-700 dark:text-blue-300 text-base">${grandAvgVal}</span>
                <span class="text-[9px] font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-tighter">Genel Ort.</span>
            </div>
        </td>
    `;
    html += '</tr>';

    html += '</tbody></table></div>';
    container.innerHTML = html;
}
