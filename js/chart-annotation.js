// Chart Annotation and Customization Features

let chartAnnotations = {}; // Store annotations per chart
let chartColors = {
    main: null,
    dist: null
};

// Open annotation modal for a chart
function openAnnotationModal(chartId) {
    const modal = document.getElementById('annotationModal');
    const chartName = document.getElementById('annotationChartName');
    const textInput = document.getElementById('annotationText');
    const colorInput = document.getElementById('annotationColor');

    // Set chart name
    chartName.textContent = chartId === 'mainChart' ? 'Ana Grafik' : 'Dağılım Grafiği';

    // Load existing annotation if any
    textInput.value = chartAnnotations[chartId] || '';
    colorInput.value = chartColors[chartId] || '#3b82f6';

    // Store current chart ID
    modal.dataset.chartId = chartId;

    // Show modal
    modal.classList.remove('hidden');
}

// Save annotation and color
function saveAnnotation() {
    const modal = document.getElementById('annotationModal');
    const chartId = modal.dataset.chartId;
    const text = document.getElementById('annotationText').value;
    const color = document.getElementById('annotationColor').value;

    console.log('Saving annotation for', chartId, ':', text, color);

    // Save annotation
    chartAnnotations[chartId] = text;
    chartColors[chartId] = color;

    // Update chart
    updateChartWithAnnotation(chartId, text, color);

    // Close modal
    modal.classList.add('hidden');
}

// Update chart with annotation
function updateChartWithAnnotation(chartId, text, color) {
    console.log('Updating chart:', chartId, 'text:', text, 'color:', color);

    // Get chart from global charts object
    const chartKey = chartId === 'mainChart' ? 'main' : 'dist';
    const chart = window.charts ? window.charts[chartKey] : null;

    if (!chart) {
        console.error('Chart not found:', chartId, 'Available charts:', window.charts);
        alert('Grafik bulunamadı. Lütfen sayfayı yenileyin.');
        return;
    }

    console.log('Chart found:', chart);

    // Update chart color if specified
    if (color) {
        const datasets = chart.data.datasets;
        datasets.forEach(dataset => {
            if (dataset.backgroundColor) {
                if (Array.isArray(dataset.backgroundColor)) {
                    dataset.backgroundColor = dataset.backgroundColor.map(() => color);
                    if (dataset.borderColor && Array.isArray(dataset.borderColor)) {
                        dataset.borderColor = dataset.borderColor.map(() => color);
                    }
                } else {
                    dataset.backgroundColor = color;
                    dataset.borderColor = color;
                }
            }
        });
        console.log('Color updated to:', color);
    }

    // Add/Update annotation text as subtitle
    if (text) {
        chart.options.plugins = chart.options.plugins || {};
        chart.options.plugins.subtitle = {
            display: true,
            text: text,
            font: {
                size: 14,
                weight: 'bold'
            },
            color: color || '#1e293b',
            padding: { top: 10, bottom: 20 }
        };
        console.log('Subtitle added:', text);
    } else {
        if (chart.options.plugins && chart.options.plugins.subtitle) {
            chart.options.plugins.subtitle.display = false;
        }
    }

    chart.update();
    console.log('Chart updated successfully');
}

// Close annotation modal
function closeAnnotationModal() {
    document.getElementById('annotationModal').classList.add('hidden');
}

// Add annotation button click handlers on charts
function initChartAnnotationButtons() {
    // Add annotation button to each chart container
    const mainChartContainer = document.getElementById('mainChartContainer');
    const distChartParent = document.querySelector('#distChart')?.parentElement?.parentElement;

    if (mainChartContainer && !mainChartContainer.querySelector('.chart-annotate-btn')) {
        const btn = createAnnotationButton('mainChart');
        mainChartContainer.style.position = 'relative';
        mainChartContainer.appendChild(btn);
    }

    if (distChartParent && !distChartParent.querySelector('.chart-annotate-btn')) {
        const btn = createAnnotationButton('distChart');
        distChartParent.style.position = 'relative';
        distChartParent.appendChild(btn);
    }
}

// Create annotation button (ICON ONLY)
function createAnnotationButton(chartId) {
    const btn = document.createElement('button');
    btn.className = 'chart-annotate-btn no-print';
    btn.innerHTML = '<i class="fa-solid fa-pen"></i>';
    btn.title = 'Yazı Ekle / Renk Değiştir';
    btn.onclick = () => openAnnotationModal(chartId);
    btn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(59, 130, 246, 0.9);
        color: white;
        border: none;
        padding: 10px;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        font-size: 14px;
        cursor: pointer;
        z-index: 10;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    btn.onmouseenter = () => {
        btn.style.background = 'rgba(37, 99, 235, 1)';
        btn.style.transform = 'scale(1.1)';
    };
    btn.onmouseleave = () => {
        btn.style.background = 'rgba(59, 130, 246, 0.9)';
        btn.style.transform = 'scale(1)';
    };

    return btn;
}

// Initialize when charts are created
if (typeof window.addEventListener !== 'undefined') {
    window.addEventListener('load', () => {
        // Wait for charts to be created
        setTimeout(initChartAnnotationButtons, 1500);
    });

    // Also try to add buttons when data is loaded
    window.addEventListener('dataLoaded', () => {
        setTimeout(initChartAnnotationButtons, 500);
    });
}
