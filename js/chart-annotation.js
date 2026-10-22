// Chart Annotation and Customization Features
// Strategy: NEVER mutate live Chart.js objects (proxy recursion risk).
// Store state globally → trigger chart re-creation → subtitle injected at build time.

window.chartAnnotations = window.chartAnnotations || {}; // { distChart: 'text', mainChart: 'text' }
window.chartAnnotationColors = window.chartAnnotationColors || {}; // { distChart: '#hex', mainChart: '#hex' }

// Open annotation modal for a chart
function openAnnotationModal(chartId) {
    const modal = document.getElementById('annotationModal');
    if (!modal) return;

    const chartName = document.getElementById('annotationChartName');
    const textInput = document.getElementById('annotationText');
    const colorInput = document.getElementById('annotationColor');

    if (chartName) chartName.textContent = chartId === 'mainChart' ? 'Ana Grafik' : 'Dağılım Grafiği';
    if (textInput) textInput.value = window.chartAnnotations[chartId] || '';
    if (colorInput) colorInput.value = window.chartAnnotationColors[chartId] || '#3b82f6';

    modal.dataset.chartId = chartId;
    modal.classList.remove('hidden');
}

// Save annotation — store state, trigger safe re-render
function saveAnnotation() {
    const modal = document.getElementById('annotationModal');
    if (!modal) return;

    const chartId = modal.dataset.chartId;
    const text = (document.getElementById('annotationText')?.value || '').trim();
    const color = document.getElementById('annotationColor')?.value || '#3b82f6';

    // Persist to global state (read by renderDistributionChart / renderMainChart)
    window.chartAnnotations[chartId] = text;
    window.chartAnnotationColors[chartId] = color;

    modal.classList.add('hidden');

    // Trigger a full safe re-render (chart is destroyed and recreated from scratch)
    if (typeof updateDashboard === 'function') {
        updateDashboard();
        if (text) {
            showToast('Grafik güncellendi.', 'success');
        }
    }
}

// Close annotation modal
function closeAnnotationModal() {
    const modal = document.getElementById('annotationModal');
    if (modal) modal.classList.add('hidden');
}

// Add annotation button click handlers on charts
function initChartAnnotationButtons() {
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

// Create annotation button (pen icon)
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
        setTimeout(initChartAnnotationButtons, 1500);
    });
    window.addEventListener('dataLoaded', () => {
        setTimeout(initChartAnnotationButtons, 500);
    });
}
