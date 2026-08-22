// NATIVE PRINT - Gelişmiş Rapor Oluşturucu
function generateCustomReport() {
    console.log('Generating custom report...');
    const modal = document.getElementById('reportConfigModal');
    if (modal) modal.classList.add('hidden');

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
    const incMetrics = document.getElementById('rpt-metrics') ? document.getElementById('rpt-metrics').checked : true;
    const incMainChart = document.getElementById('rpt-main-chart') ? document.getElementById('rpt-main-chart').checked : true;
    const incHeatmap = document.getElementById('rpt-heatmap') ? document.getElementById('rpt-heatmap').checked : true;
    const incHighLow = document.getElementById('rpt-highlow') ? document.getElementById('rpt-highlow').checked : true;
    const incDetails = document.getElementById('rpt-details') ? document.getElementById('rpt-details').checked : true;
    const incComments = document.getElementById('rpt-comments') ? document.getElementById('rpt-comments').checked : true;

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
    let logoHTML = customLogo ? `<div class="logo-container"><img src="${customLogo}" style="height: 50px; max-width: 150px; object-fit: contain;"></div>` : '';

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
            <div class="summary-text">
                Bu rapor, toplam <span class="text-highlight">${participantCount}</span> katılımcının verileri kullanılarak oluşturulmuştur. 
                Kurum genel memnuniyet ortalaması 5 üzerinden <span class="text-highlight">${overallAvg}</span> olarak hesaplanmıştır. 
                Veri setinin iç tutarlılık katsayısı (Cronbach's Alpha) <span class="text-highlight">${alpha}</span> seviyesindedir.
            </div>
        `;
    }

    // B. Main Chart
    if (incMainChart) {
        const mainCanvas = document.getElementById('mainChart');
        if (mainCanvas) {
            let originalTab = null;
            if (typeof activeTab !== 'undefined' && activeTab !== 'general') {
                originalTab = activeTab;
                if (typeof switchTab === 'function') switchTab('general');
                if (typeof charts !== 'undefined' && charts.main) {
                    charts.main.resize();
                }
            }

            const imgData = mainCanvas.toDataURL('image/png');

            if (originalTab && typeof switchTab === 'function') {
                switchTab(originalTab);
            }

            contentHTML += `
                <div style="margin-top: 40px; page-break-inside: avoid;">
                    <h2>Genel Analiz Grafiği</h2>
                    <div class="chart-container">
                        <img src="${imgData}" style="width: 100%; max-height: 450px; object-fit: contain;">
                    </div>
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
        contentHTML += `<div style="flex: 1; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <h3 style="color: #059669; border-bottom: 2px solid #10b981; padding-bottom: 10px; margin-top: 0; font-size: 15px;">En Yüksek 3 Alan</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">`;
        top3.forEach(q => {
            contentHTML += `<li style="margin-top: 15px; padding: 12px 15px; background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 6px;">
                <div style="font-weight: 700; font-size: 16px; color: #065f46; margin-bottom: 4px;">${q.avg.toFixed(2)} <span style="font-size: 12px; color: #059669; font-weight: 500;">/ 5.0</span></div>
                <div style="font-size: 13px; color: #334155; line-height: 1.4;"><strong>S${q.id}</strong> - ${q.text}</div>
            </li>`;
        });
        contentHTML += `</ul></div>`;

        // Low
        contentHTML += `<div style="flex: 1; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <h3 style="color: #dc2626; border-bottom: 2px solid #ef4444; padding-bottom: 10px; margin-top: 0; font-size: 15px;">Gelişime Açık 3 Alan</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">`;
        bot3.forEach(q => {
            contentHTML += `<li style="margin-top: 15px; padding: 12px 15px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px;">
                <div style="font-weight: 700; font-size: 16px; color: #991b1b; margin-bottom: 4px;">${q.avg.toFixed(2)} <span style="font-size: 12px; color: #dc2626; font-weight: 500;">/ 5.0</span></div>
                <div style="font-size: 13px; color: #334155; line-height: 1.4;"><strong>S${q.id}</strong> - ${q.text}</div>
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
        const feedbackSelect = document.getElementById('feedbackSource');
        let fKeys = ['Yorum', 'Görüş', 'Öneri'];
        
        if (feedbackSelect && feedbackSelect.value && feedbackSelect.value !== 'none') {
            fKeys = [feedbackSelect.value];
        } else if (typeof feedbackColumns !== 'undefined' && feedbackColumns.length > 0) {
            fKeys = feedbackColumns.map(f => typeof f === 'object' ? f.key : f);
        }

        const commentRows = [];
        data.forEach(d => {
            for (let k of fKeys) {
                if (d[k] && typeof d[k] === 'string' && d[k].trim().length > 0) {
                    commentRows.push({ text: d[k].trim() });
                    break;
                }
            }
        });

        const selectedComments = commentRows.slice(0, 50);

        if (selectedComments.length > 0) {
            contentHTML += `
                <div class="page-break"></div>
                <h2>Katılımcı Yorumları (İlk 50)</h2>
                <ul style="list-style: none; padding: 0;">
            `;
            selectedComments.forEach(item => {
                contentHTML += `<li class="comment-item">"${item.text}"</li>`;
            });
            contentHTML += `</ul>`;
        }
    }

    // --- 4. Render Wrapper ---
    const printHTML = `
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><title>${customTitle}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            @page { size: A4; margin: 15mm; }
            @media print { 
                .no-print { display: none !important; } 
                .page-break { page-break-before: always; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            body { 
                font-family: 'Inter', sans-serif; 
                max-width: 850px; 
                margin: 0 auto; 
                padding: 20px; 
                color: #1e293b; 
                background-color: #ffffff;
            }
            
            .report-header {
                background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
                color: white;
                padding: 35px;
                border-radius: 12px;
                margin-bottom: 35px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            }
            
            .header-title-container { display: flex; flex-direction: column; }
            .header-title-container h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; color: #f8fafc; }
            .meta { margin-top: 8px; font-size: 13px; color: #94a3b8; font-weight: 500; }
            .logo-container { background: white; padding: 10px; border-radius: 8px; display: inline-flex; }
            
            h2 { color: #0f172a; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; margin-top: 40px; margin-bottom: 20px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; page-break-after: avoid; }
            h3 { color: #475569; font-size: 13px; margin-top: 5px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
            
            .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; }
            .card { background: #ffffff; border: 1px solid #e2e8f0; padding: 25px 20px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border-top: 4px solid #3b82f6; }
            .card:nth-child(2) { border-top-color: #10b981; }
            .card:nth-child(3) { border-top-color: #8b5cf6; }
            .card h3 { margin: 0 0 10px 0; font-size: 12px; color: #64748b; }
            .card h2 { margin: 0; font-size: 32px; font-weight: 700; color: #0f172a; }
            
            table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 20px; font-size: 13px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            th { background: #f8fafc; text-align: left; padding: 14px 15px; color: #475569; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
            td { padding: 14px 15px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
            tr:last-child td { border-bottom: none; }
            tr:nth-child(even) { background: #fdfefd; }
            
            .page-break { page-break-before: always; margin-top: 40px; display: block; height: 1px; }
            .chart-container { text-align: center; margin: 25px 0; background: #ffffff; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); page-break-inside: avoid; }
            
            .btn { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; position: fixed; top: 20px; right: 20px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3); transition: all 0.2s; }
            .btn:hover { background: #2563eb; transform: translateY(-1px); }
            
            .text-highlight { font-weight: 600; color: #0f172a; }
            .summary-text { font-size: 14px; line-height: 1.7; color: #475569; background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; }
            .comment-item { margin-bottom: 15px; padding: 20px; background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; font-size: 14px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); color: #334155; font-style: italic; }
            .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; font-weight: 500; }
        </style></head><body>
        
        <button class="btn no-print" onclick="window.print()">🖨️ Yazdır / Kaydet</button>
        
        <div class="report-header">
            <div class="header-title-container">
                <h1>${customTitle}</h1>
                <div class="meta">Oluşturulma Tarihi: ${dateStr}</div>
            </div>
            ${logoHTML}
        </div>

        ${contentHTML}

        <div class="footer">
            Otomatik Rapor Sistemi ile Üretilmiştir • Sayfa sonu
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
