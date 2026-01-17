// Heatmap Theme System

const heatmapThemes = {
    classic: {
        name: '🎨 Klasik',
        colors: {
            weak: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-800 dark:text-red-200', border: 'border-red-200 dark:border-red-800' },
            medium: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-800 dark:text-orange-200', border: 'border-orange-200 dark:border-orange-800' },
            good: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-800 dark:text-yellow-200', border: 'border-yellow-200 dark:border-yellow-800' },
            excellent: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-800 dark:text-emerald-200', border: 'border-emerald-200 dark:border-emerald-800' }
        }
    },
    blue: {
        name: '🌊 Mavi Tonları',
        colors: {
            weak: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-100 dark:border-blue-800' },
            medium: { bg: 'bg-blue-200 dark:bg-blue-800/60', text: 'text-blue-900 dark:text-blue-200', border: 'border-blue-300 dark:border-blue-700' },
            good: { bg: 'bg-blue-400 dark:bg-blue-600', text: 'text-white dark:text-white', border: 'border-blue-500 dark:border-blue-500' },
            excellent: { bg: 'bg-blue-600 dark:bg-blue-500', text: 'text-white dark:text-white', border: 'border-blue-700 dark:border-blue-400' }
        }
    },
    warm: {
        name: '🔥 Sıcak Renkler',
        colors: {
            weak: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-800 dark:text-yellow-200', border: 'border-yellow-200 dark:border-yellow-800' },
            medium: { bg: 'bg-orange-200 dark:bg-orange-800/60', text: 'text-orange-900 dark:text-orange-200', border: 'border-orange-300 dark:border-orange-700' },
            good: { bg: 'bg-orange-400 dark:bg-orange-600', text: 'text-white dark:text-white', border: 'border-orange-500 dark:border-orange-500' },
            excellent: { bg: 'bg-red-500 dark:bg-red-600', text: 'text-white dark:text-white', border: 'border-red-600 dark:border-red-400' }
        }
    },
    cool: {
        name: '❄️ Soğuk Tonlar',
        colors: {
            weak: { bg: 'bg-teal-50 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-100 dark:border-teal-800' },
            medium: { bg: 'bg-cyan-200 dark:bg-cyan-800/60', text: 'text-cyan-900 dark:text-cyan-200', border: 'border-cyan-300 dark:border-cyan-700' },
            good: { bg: 'bg-blue-400 dark:bg-blue-600', text: 'text-white dark:text-white', border: 'border-blue-500 dark:border-blue-500' },
            excellent: { bg: 'bg-purple-500 dark:bg-purple-600', text: 'text-white dark:text-white', border: 'border-purple-600 dark:border-purple-400' }
        }
    },
    contrast: {
        name: '⚡ Yüksek Kontrast',
        colors: {
            weak: { bg: 'bg-gray-800 dark:bg-gray-900', text: 'text-white dark:text-gray-300', border: 'border-gray-900 dark:border-gray-700' },
            medium: { bg: 'bg-gray-500 dark:bg-gray-700', text: 'text-white dark:text-gray-200', border: 'border-gray-600 dark:border-gray-600' },
            good: { bg: 'bg-gray-300 dark:bg-gray-600', text: 'text-gray-900 dark:text-white', border: 'border-gray-400 dark:border-gray-500' },
            excellent: { bg: 'bg-green-500 dark:bg-green-600', text: 'text-white dark:text-white', border: 'border-green-600 dark:border-green-400' }
        }
    }
};

let currentHeatmapTheme = 'classic';

// Apply theme to heatmap
function applyHeatmapTheme(themeName) {
    if (!heatmapThemes[themeName]) {
        console.error('Theme not found:', themeName);
        return;
    }

    currentHeatmapTheme = themeName;

    // Save to localStorage
    try {
        localStorage.setItem('heatmapTheme', themeName);
    } catch (e) {
        console.warn('Could not save theme to localStorage:', e);
    }

    // Regenerate heatmap with new theme
    if (typeof renderHeatmap === 'function') {
        renderHeatmap();
    }

    console.log('Heatmap theme changed to:', themeName);
}

// Get color class for score based on current theme
function getHeatmapColorClass(score) {
    const theme = heatmapThemes[currentHeatmapTheme];

    if (score <= 0) {
        return 'bg-slate-100 text-slate-400';
    } else if (score >= 4.2) {
        return `${theme.colors.excellent.bg} ${theme.colors.excellent.text} ${theme.colors.excellent.border} border`;
    } else if (score >= 3.5) {
        return `${theme.colors.good.bg} ${theme.colors.good.text} ${theme.colors.good.border} border`;
    } else if (score >= 2.5) {
        return `${theme.colors.medium.bg} ${theme.colors.medium.text} ${theme.colors.medium.border} border`;
    } else {
        return `${theme.colors.weak.bg} ${theme.colors.weak.text} ${theme.colors.weak.border} border`;
    }
}

// Load saved theme on page load
function loadSavedHeatmapTheme() {
    try {
        const saved = localStorage.getItem('heatmapTheme');
        if (saved && heatmapThemes[saved]) {
            currentHeatmapTheme = saved;

            // Set select value if exists
            const select = document.getElementById('heatmapTheme');
            if (select) {
                select.value = saved;
            }
        }
    } catch (e) {
        console.warn('Could not load theme from localStorage:', e);
    }
}

// Initialize on page load
if (typeof window !== 'undefined') {
    window.addEventListener('load', loadSavedHeatmapTheme);
}
