// NATIVE PRINT - Tarayıcının yazdırma özelliğini kullanır
function exportPDFNative() {
    console.log('Opening print dialog...');

    if (!window.questionList || window.questionList.length === 0) {
        alert('Lütfen önce bir Excel dosyası yükleyin.');
        return;
    }

    const data = getFilteredData();
    if (!data || data.length === 0) {
        alert('Veri bulunamadı.');
        return;
    }

    // Calculate stats
    let totalSum = 0, totalCount = 0;
    data.forEach(row => {
        window.questionList.forEach((_, i) => {
            const val = row[`Q${i + 1}`];
            if (val && !isNaN(val)) {
                totalSum += parseFloat(val);
                totalCount++;
            }
        });
    });
    const overallAvg = totalCount > 0 ? (totalSum / totalCount).toFixed(2) : '0.00';
    const participantCount = data.length;

    let alpha = '0.00';
    if (typeof calculateCronbachAlpha === 'function') {
        alpha = calculateCronbachAlpha(data).toFixed(2);
    }

    const dateStr = new Date().toLocaleDateString('tr-TR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    // Simple print content
    const printHTML = `
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><title>Analiz Raporu</title>
        <style>
            @page { size: A4; margin: 20mm; }
            @media print { .no-print { display: none !important; } }
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #1e293b; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
            .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
            .card { background: #f0f9ff; border: 2px solid #3b82f6; padding: 15px; border-radius: 8px; text-align: center; }
            .btn { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 14px; position: fixed; top: 20px; right: 20px; }
        </style></head><body>
        <button class="btn no-print" onclick="window.print()">🖨️ PDF Olarak Kaydet</button>
        <h1>Memnuniyet Analiz Raporu</h1>
        <p><strong>Tarih:</strong> ${dateStr}</p>
        <div class="metrics">
            <div class="card"><h3>Katılımcı</h3><h2>${participantCount}</h2></div>
            <div class="card"><h3>Ortalama</h3><h2>${overallAvg}/5.0</h2></div>
            <div class="card"><h3>Güvenilirlik</h3><h2>${alpha}</h2></div>
        </div>
        <h2>Özet</h2>
        <p>Toplam <strong>${participantCount}</strong> katılımcı. Genel ortalama: <strong>${overallAvg}/5.0</strong>. Güvenilirlik (α): <strong>${alpha}</strong></p>
        </body></html>
    `;

    const w = window.open('', '_blank', 'width=800,height=600');
    if (w) {
        w.document.write(printHTML);
        w.document.close();
        w.onload = () => setTimeout(() => w.focus(), 250);
    } else {
        alert('Popup engelleyici aktif. Lütfen izin verin.');
    }
}
