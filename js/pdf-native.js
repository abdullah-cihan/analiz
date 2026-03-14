// NATIVE PRINT - Gelişmiş Rapor Oluşturucu
function generateCustomReport() {
    console.log('Generating custom report...');
    document.getElementById('reportConfigModal').classList.add('hidden');

    if (!window.questionList || window.questionList.length === 0) {
        alert('Lütfen önce bir Excel dosyası yükleyin.');
        return;
    }

    const data = getFilteredData();
    if (!data || data.length === 0) {
        alert('Veri bulunamadı.');
        return;
    }

    // --- 1. Gather Selections ---
    const incMetrics = document.getElementById('rpt-metrics')?.checked;
    const incMainChart = document.getElementById('rpt-main-chart')?.checked;
    const incHeatmap = document.getElementById('rpt-heatmap')?.checked;
    const incHighLow = document.getElementById('rpt-highlow')?.checked;
    const incDetails = document.getElementById('rpt-details')?.checked;
    const incComments = document.getElementById('rpt-comments')?.checked;

    // --- 2. Calculate Statistics ---
    const participantCount = data.length;
    let totalSum = 0, totalCount = 0;

    const questionStats = window.questionList.map((text, i) => {
        const qKey = `Q${i + 1}`;
        const vals = data.map(r => r[qKey]).filter(v => v !== undefined && v !== null && !isNaN(v));
        const sum = vals.reduce((a, b) => a + b, 0);
        const count = vals.length;
        const avg = count ? sum / count : 0;

        totalSum += sum;
        totalCount += count;

        // Calculate standard deviation for advanced stats
        const mean = avg;
        const sqDiffs = vals.map(v => Math.pow(v - mean, 2));
        const avgSqDiff = sqDiffs.reduce((a, b) => a + b, 0) / count;
        const std = Math.sqrt(avgSqDiff);

        return { id: i + 1, text, avg, count, std };
    });

    const overallAvg = totalCount > 0 ? (totalSum / totalCount).toFixed(2) : '0.00';
    let alpha = '0.00';
    if (typeof calculateCronbachAlpha === 'function') {
        alpha = calculateCronbachAlpha(data).toFixed(2);
    }
    const dateStr = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    // Customization
    const customTitle = localStorage.getItem('custom_report_title') || "Memnuniyet Analiz Raporu";
    const customLogo = localStorage.getItem('custom_report_logo');
    let logoHTML = customLogo ? `<img src="${customLogo}" style="height: 50px; margin-right: 15px; vertical-align: middle;">` : '';

    // --- 3. Build Content Blocks ---
    let contentHTML = '';

    // A. Metrics (Özet)
    if (incMetrics) {
        contentHTML += `
            <div class="metrics">
                <div class="card"><h3>Katılımcı Sayısı</h3><h2>${participantCount}</h2></div>
                <div class="card"><h3>Genel Ortalama</h3><h2>${overallAvg}<span style="font-size:16px; color:#94a3b8; font-weight:normal">/5</span></h2></div>
                <div class="card"><h3>Güvenilirlik (Alpha)</h3><h2>${alpha}</h2></div>
            </div>
            
            <h2>Özet Değerlendirme</h2>
            <p style="line-height: 1.6; margin-bottom: 30px;">
                Bu rapor, toplam <strong>${participantCount}</strong> katılımcının verileri kullanılarak oluşturulmuştur. 
                Kurum genel memnuniyet ortalaması 5 üzerinden <strong>${overallAvg}</strong> olarak hesaplanmıştır. 
                Veri setinin iç tutarlılık katsayısı (Cronbach's Alpha) <strong>${alpha}</strong> seviyesindedir.
            </p>
        `;
    }

    // B. Main Chart
    if (incMainChart) {
        const mainCanvas = document.getElementById('mainChart');
        if (mainCanvas) {
            contentHTML += `
                <div class="page-break"></div>
                <h2>Genel Analiz Grafiği</h2>
                <div class="chart-container">
                    <img src="${mainCanvas.toDataURL('image/png')}" style="width: 100%; max-height: 500px; object-fit: contain;">
                </div>
            `;
        }
    }

    // C. High / Low Scores
    if (incHighLow) {
        const sorted = [...questionStats].sort((a, b) => b.avg - a.avg);
        const top3 = sorted.slice(0, 3);
        const bot3 = sorted.slice(-3).reverse();

        contentHTML += `<div class="page-break"></div>`;
        contentHTML += `<h2>Öne Çıkan Sonuçlar</h2>`;
        contentHTML += `<div style="display: flex; gap: 20px; margin-top: 20px;">`;

        // High
        contentHTML += `<div style="flex: 1;">
            <h3 style="color: #16a34a; border-bottom: 2px solid #16a34a; padding-bottom: 5px;">En Yüksek 3 Alan</h3>
            <ul style="list-style: none; padding: 0;">`;
        top3.forEach(q => {
            contentHTML += `<li style="margin-bottom: 10px; padding: 10px; background: #f0fdf4; border-left: 4px solid #16a34a;">
                <div style="font-weight: bold; font-size: 14px; color: #166534;">${q.avg.toFixed(2)} / 5.0</div>
                <div style="font-size: 12px; color: #374151;">S${q.id} - ${q.text}</div>
            </li>`;
        });
        contentHTML += `</ul></div>`;

        // Low
        contentHTML += `<div style="flex: 1;">
            <h3 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 5px;">Gelişime Açık 3 Alan</h3>
            <ul style="list-style: none; padding: 0;">`;
        bot3.forEach(q => {
            contentHTML += `<li style="margin-bottom: 10px; padding: 10px; background: #fef2f2; border-left: 4px solid #dc2626;">
                <div style="font-weight: bold; font-size: 14px; color: #991b1b;">${q.avg.toFixed(2)} / 5.0</div>
                <div style="font-size: 12px; color: #374151;">S${q.id} - ${q.text}</div>
            </li>`;
        });
        contentHTML += `</ul></div>`;
        contentHTML += `</div>`;
    }

    // D. Heatmap (Generated Table)
    if (incHeatmap) {
        const groupSelect = document.getElementById('groupSelect');
        const groupKey = groupSelect ? groupSelect.value : 'none';

        if (groupKey !== 'none') {
            contentHTML += `<div class="page-break"></div><h2>Isı Haritası Analizi (${groupKey})</h2>`;

            // Build groups
            const groups = [...new Set(data.map(d => d[groupKey]))].filter(g => g).sort();

            contentHTML += `<table><thead><tr><th>Soru</th><th>Genel</th>`;
            groups.forEach(g => contentHTML += `<th>${g}</th>`);
            contentHTML += `</tr></thead><tbody>`;

            questionStats.forEach((q, i) => {
                const qKey = `Q${q.id}`;
                contentHTML += `<tr><td style="width: 40%;"><strong>S${q.id}</strong> ${q.text}</td>
                <td style="font-weight: bold; background: #f8fafc;">${q.avg.toFixed(2)}</td>`;

                groups.forEach(g => {
                    const gData = data.filter(d => d[groupKey] == g);
                    const vals = gData.map(r => r[qKey]);
                    const gAvg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

                    // Color Logic
                    let bg = '#ffffff';
                    if (gAvg >= 4.5) bg = '#dcfce7'; // green-100
                    else if (gAvg >= 4.0) bg = '#f0fdf4'; // green-50
                    else if (gAvg < 2.5) bg = '#fee2e2'; // red-100
                    else if (gAvg < 3.0) bg = '#fef2f2'; // red-50
                    else if (gAvg < 3.5) bg = '#fefce8'; // yellow-50

                    contentHTML += `<td style="background: ${bg}; text-align: center;">${gAvg.toFixed(2)}</td>`;
                });
                contentHTML += `</tr>`;
            });
            contentHTML += `</tbody></table>`;
        } else {
            // Fallback if no group selected
            contentHTML += `<div style="margin-top:20px; padding:10px; background:#f1f5f9; color:#64748b; font-size:12px;">Isı Haritası için arayüzde bir gruplama seçilmediğinden bu bölüm atlandı.</div>`;
        }
    }

    // E. Detailed Data Table
    if (incDetails) {
        contentHTML += `
            <div class="page-break"></div>
            <h2>Soru Bazlı Detay Analiz</h2>
            <table>
                <thead>
                    <tr>
                        <th style="width: 50px;">No</th>
                        <th>Soru</th>
                        <th style="width: 80px;">Ort.</th>
                        <th style="width: 60px;">Std.Sap</th>
                        <th style="width: 60px;">N</th>
                    </tr>
                </thead>
                <tbody>
        `;
        questionStats.forEach(q => {
            let colorStyle = '';
            if (q.avg < 3.0) colorStyle = 'color: #dc2626; font-weight: bold;';
            else if (q.avg >= 4.0) colorStyle = 'color: #16a34a; font-weight: bold;';

            contentHTML += `
                <tr>
                    <td style="text-align: center; color: #64748b;">S${q.id}</td>
                    <td style="text-align: left;">${q.text}</td>
                    <td style="${colorStyle}">${q.avg.toFixed(2)}</td>
                    <td style="color: #64748b;">${q.std.toFixed(2)}</td>
                    <td>${q.count}</td>
                </tr>
            `;
        });
        contentHTML += `</tbody></table>`;
    }

    // F. Comments
    if (incComments) {
        const commentRows = data.filter(d => d['Yorum'] || d['Görüş'] || d['Öneri']).slice(0, 50); // Increased to 50
        if (commentRows.length > 0) {
            contentHTML += `
                <div class="page-break"></div>
                <h2>Katılımcı Yorumları (İlk 50)</h2>
                <ul style="list-style: none; padding: 0;">
            `;
            commentRows.forEach(row => {
                const txt = row['Yorum'] || row['Görüş'] || row['Öneri'];
                contentHTML += `<li style="margin-bottom: 10px; padding: 15px; background: #f8fafc; border-left: 3px solid #3b82f6; font-size: 13px; border-radius: 4px;">"${txt}"</li>`;
            });
            contentHTML += `</ul>`;
        }
    }

    // --- 4. Render Wrapper ---
    const printHTML = `
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><title>${customTitle}</title>
        <style>
            @page { size: A4; margin: 15mm; }
            @media print { 
                .no-print { display: none !important; } 
                .page-break { page-break-before: always; }
                body { -webkit-print-color-adjust: exact; }
            }
            body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #334155; }
            
            .header-container { border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-bottom: 30px; display: flex; align-items: center; }
            h1 { margin: 0; color: #1e293b; font-size: 24px; flex: 1; }
            h2 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin-top: 30px; font-size: 18px; page-break-after: avoid; }
            h3 { color: #64748b; font-size: 14px; margin-top: 5px; text-transform: uppercase; }
            .meta { font-size: 12px; color: #64748b; }
            
            .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: center; }
            .card h3 { margin: 0 0 5px 0; font-size: 12px; }
            .card h2 { margin: 0; font-size: 24px; color: #3b82f6; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; width: 100%; page-break-inside: auto; }
            th { background: #f1f5f9; text-align: left; padding: 8px; border-bottom: 2px solid #cbd5e1; color: #475569; font-weight: bold; }
            td { padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
            tr:nth-child(even) { background: #f8fafc; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            
            .page-break { page-break-before: always; margin-top: 30px; display: block; height: 1px; }
            .chart-container { text-align: center; margin: 20px 0; border: 1px solid #f1f5f9; padding: 10px; border-radius: 8px; page-break-inside: avoid; }
            
            .btn { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 14px; position: fixed; top: 20px; right: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        </style></head><body>
        
        <button class="btn no-print" onclick="window.print()">🖨️ Yazdır / Kaydet</button>
        
        <div class="header-container">
            ${logoHTML}
            <div>
                <h1>${customTitle}</h1>
                <div class="meta">Oluşturulma Tarihi: ${dateStr}</div>
            </div>
        </div>

        ${contentHTML}

        <div style="margin-top: 50px; text-align: center; font-size: 10px; color: #cbd5e1; border-top: 1px solid #f1f5f9; padding-top: 10px;">
            Rapor Sonu
        </div>
        </body></html>
    `;

    const w = window.open('', '_blank', 'width=900,height=800');
    if (w) {
        w.document.write(printHTML);
        w.document.close();
        w.onload = () => setTimeout(() => w.focus(), 500);
    } else {
        alert('Popup engelleyici aktif. Lütfen izin verin.');
    }
}

// Old function wrapper for backward compatibility or direct calls
function exportPDFNative() {
    // Redirect to the new modal flow
    const modal = document.getElementById('reportConfigModal');
    if (modal) modal.classList.remove('hidden');
    else generateCustomReport(); // Fallback
}
