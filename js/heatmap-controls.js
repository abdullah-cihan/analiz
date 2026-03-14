// Heatmap Zoom/Pan and Export Functions

let heatmapZoomLevel = 1.0;
let heatmapPanX = 0;
let heatmapPanY = 0;
let isPanning = false;
let startX, startY;

// Zoom heatmap
function zoomHeatmap(delta) {
    heatmapZoomLevel = Math.max(0.5, Math.min(3.0, heatmapZoomLevel + delta));
    applyHeatmapZoom();
}

// Reset zoom
function resetHeatmapZoom() {
    heatmapZoomLevel = 1.0;
    heatmapPanX = 0;
    heatmapPanY = 0;
    applyHeatmapZoom();
}

// Apply zoom transformation
function applyHeatmapZoom() {
    const container = document.getElementById('heatmap-container');
    const zoomDisplay = document.getElementById('heatmapZoomLevel');

    if (container) {
        container.style.transform = `scale(${heatmapZoomLevel}) translate(${heatmapPanX}px, ${heatmapPanY}px)`;
        container.style.transformOrigin = 'top left';
        container.style.transition = 'transform 0.2s ease';
    }

    if (zoomDisplay) {
        zoomDisplay.textContent = `${Math.round(heatmapZoomLevel * 100)}%`;
    }
}

// Pan handling (drag to move when zoomed)
function initHeatmapPan() {
    const wrapper = document.querySelector('#heatmap-container').parentElement;

    if (!wrapper) return;

    wrapper.addEventListener('mousedown', (e) => {
        if (heatmapZoomLevel > 1.0) {
            isPanning = true;
            startX = e.clientX - heatmapPanX;
            startY = e.clientY - heatmapPanY;
            wrapper.style.cursor = 'grabbing';
        }
    });

    wrapper.addEventListener('mousemove', (e) => {
        if (isPanning) {
            heatmapPanX = e.clientX - startX;
            heatmapPanY = e.clientY - startY;
            applyHeatmapZoom();
        }
    });

    wrapper.addEventListener('mouseup', () => {
        isPanning = false;
        wrapper.style.cursor = heatmapZoomLevel > 1.0 ? 'grab' : 'default';
    });

    wrapper.addEventListener('mouseleave', () => {
        isPanning = false;
        wrapper.style.cursor = 'default';
    });
}

// Export heatmap to Excel
function exportHeatmapToExcel() {
    console.log('Exporting heatmap to Excel...');

    const table = document.querySelector('#heatmap-container table');

    if (!table) {
        alert('Isı haritası bulunamadı. Lütfen önce bir karşılaştırma grubu seçin.');
        return;
    }

    try {
        // Create workbook from table
        const wb = XLSX.utils.table_to_book(table, { sheet: "Heatmap" });

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `heatmap-${timestamp}.xlsx`;

        // Download
        XLSX.writeFile(wb, filename);

        console.log('Excel exported successfully:', filename);
    } catch (error) {
        console.error('Excel export error:', error);
        alert('Excel export sırasında hata oluştu:\n' + error.message);
    }
}

// Export heatmap as PNG
async function exportHeatmapAsPNG() {
    console.log('Exporting heatmap as PNG...');

    const container = document.getElementById('heatmap-container');

    if (!container || !container.querySelector('table')) {
        alert('Isı haritası bulunamadı. Lütfen önce bir karşılaştırma grubu seçin.');
        return;
    }

    // Show loading
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        color: white; font-size: 16px; font-weight: bold;
    `;
    loadingDiv.innerHTML = '<div>PNG Oluşturuluyor...</div>';
    document.body.appendChild(loadingDiv);

    try {
        // Reset zoom temporarily for capture
        const originalTransform = container.style.transform;
        container.style.transform = 'none';

        // Wait for rendering
        await new Promise(resolve => setTimeout(resolve, 100));

        // Capture using html2canvas
        const canvas = await html2canvas(container, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false
        });

        // Restore zoom
        container.style.transform = originalTransform;

        // Download
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `heatmap-${timestamp}.png`;

        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);

            console.log('PNG exported successfully:', filename);
        });

    } catch (error) {
        console.error('PNG export error:', error);
        alert('PNG export sırasında hata oluştu:\n' + error.message);
    } finally {
        document.body.removeChild(loadingDiv);
    }
}

// Copy heatmap table to clipboard
async function copyHeatmapTable() {
    console.log('Copying heatmap table to clipboard...');

    const table = document.querySelector('#heatmap-container table');

    if (!table) {
        alert('Isı haritası bulunamadı. Lütfen önce bir karşılaştırma grubu seçin.');
        return;
    }

    try {
        // Create a temporary container for clean copy
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(table.cloneNode(true));

        // Copy to clipboard
        await navigator.clipboard.writeText(tempDiv.innerText);

        // Show success message
        const btn = event.target.closest('button');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Kopyalandı!';
        btn.classList.add('bg-green-100', 'text-green-700');

        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove('bg-green-100', 'text-green-700');
        }, 2000);

        console.log('Table copied successfully');
    } catch (error) {
        console.error('Copy error:', error);
        alert('Kopyalama sırasında hata oluştu:\n' + error.message);
    }
}

// Initialize pan on page load
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(initHeatmapPan, 1000);
    });
}
