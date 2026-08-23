// js/export.js
// PPTX dışa aktarım işlemleri için fonksiyonlar

function exportPPTX() {
    if (!window.rawData || window.rawData.length === 0) {
        alert("Lütfen önce veri yükleyin veya örnek veriyi başlatın.");
        return;
    }

    try {
        // PptxGenJS instance
        let pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';

        // 1. Slayt - Kapak
        let slide1 = pptx.addSlide();
        slide1.background = { color: "F3F4F6" }; // bg-slate-100
        slide1.addText("Memnuniyet Analiz Raporu", { x: 1, y: 2, w: '80%', h: 1, fontSize: 36, bold: true, color: '1E293B', align: 'center' }); // text-slate-800
        slide1.addText(`Katılımcı Sayısı: ${window.rawData.length}`, { x: 1, y: 3.5, w: '80%', h: 1, fontSize: 24, color: '64748B', align: 'center' }); // text-slate-500
        
        const now = new Date();
        slide1.addText(`Oluşturulma Tarihi: ${now.toLocaleDateString()}`, { x: 1, y: 4.5, w: '80%', h: 0.5, fontSize: 14, color: '94A3B8', align: 'center' });

        // Grafik sekmelerini garanti altına almak için geçici olarak sekmeyi değiştir
        let originalTab = null;
        if (typeof activeTab !== 'undefined' && activeTab !== 'general') {
            originalTab = activeTab;
            if (typeof switchTab === 'function') switchTab('general');
            if (typeof charts !== 'undefined' && charts.main) {
                charts.main.resize();
            }
        }

        // 2. Slayt - Genel Analiz Grafiği
        let slide2 = pptx.addSlide();
        slide2.addText("Genel Analiz Dağılımı", { x: 0.5, y: 0.5, w: '90%', h: 0.5, fontSize: 24, bold: true, color: '1E293B' });
        
        const mainChartCanvas = document.getElementById('mainChart');
        if (mainChartCanvas) {
            try {
                const imgData = mainChartCanvas.toDataURL("image/png");
                slide2.addImage({ data: imgData, x: 0.5, y: 1.2, w: 9, h: 4.2 });
            } catch (err) {
                console.warn("Grafik resmi alınamadı:", err);
                slide2.addText("Grafik oluşturulamadı veya boş.", { x: 0.5, y: 2, w: '90%', h: 1, color: 'FF0000' });
            }
        } else {
            slide2.addText("Grafik bulunamadı.", { x: 0.5, y: 2, w: '90%', h: 1, color: 'FF0000' });
        }

        // 3. Slayt - Katılımcı Dağılımı Grafiği
        const distChartCanvas = document.getElementById('distChart');
        if (distChartCanvas) {
            let slide3 = pptx.addSlide();
            slide3.addText("Katılımcı Dağılımı", { x: 0.5, y: 0.5, w: '90%', h: 0.5, fontSize: 24, bold: true, color: '1E293B' });
            try {
                const distImgData = distChartCanvas.toDataURL("image/png");
                // Daha kare/dairesel bir grafik olduğu için ortalıyoruz
                slide3.addImage({ data: distImgData, x: 2.5, y: 1.2, w: 5, h: 4 });
            } catch (err) {
                console.warn("Dağılım grafiği alınamadı:", err);
                slide3.addText("Grafik oluşturulamadı veya boş.", { x: 0.5, y: 2, w: '90%', h: 1, color: 'FF0000' });
            }
        }

        // Orijinal sekmeye geri dön
        if (originalTab && typeof switchTab === 'function') {
            switchTab(originalTab);
        }

        // 4. Slayt - Öne Çıkan Sonuçlar (En Yüksek ve En Düşük)
        if (window.questionList && window.rawData.length > 0) {
            const data = window.rawData;
            const questionStats = window.questionList.map((text, i) => {
                const qKey = `Q${i + 1}`;
                const vals = data.map(r => r[qKey]).filter(v => v !== undefined && v !== null && !isNaN(v));
                const sum = vals.reduce((a, b) => a + b, 0);
                const count = vals.length;
                const avg = count ? sum / count : 0;
                return { id: i + 1, text, avg };
            });

            const sorted = [...questionStats].sort((a, b) => b.avg - a.avg);
            const top3 = sorted.slice(0, 3);
            const bot3 = sorted.slice(-3).reverse();

            let slide4 = pptx.addSlide();
            slide4.addText("Öne Çıkan Sonuçlar", { x: 0.5, y: 0.5, w: '90%', h: 0.5, fontSize: 24, bold: true, color: '1E293B' });

            // En Yüksek 3
            slide4.addText("En Yüksek 3 Alan", { x: 0.5, y: 1.2, w: '45%', h: 0.4, fontSize: 18, bold: true, color: '059669' });
            top3.forEach((q, idx) => {
                let shortText = q.text.length > 60 ? q.text.substring(0, 60) + '...' : q.text;
                slide4.addText(`[ ${q.avg.toFixed(2)} ] S${q.id}: ${shortText}`, { x: 0.5, y: 1.8 + (idx * 0.6), w: '42%', h: 0.5, fontSize: 14, color: '334155', fill: 'F0FDF4' });
            });

            // En Düşük 3
            slide4.addText("Gelişime Açık 3 Alan", { x: 5.0, y: 1.2, w: '45%', h: 0.4, fontSize: 18, bold: true, color: 'DC2626' });
            bot3.forEach((q, idx) => {
                let shortText = q.text.length > 60 ? q.text.substring(0, 60) + '...' : q.text;
                slide4.addText(`[ ${q.avg.toFixed(2)} ] S${q.id}: ${shortText}`, { x: 5.0, y: 1.8 + (idx * 0.6), w: '42%', h: 0.5, fontSize: 14, color: '334155', fill: 'FEF2F2' });
            });
        }

        // Dosyayı indir
        pptx.writeFile({ fileName: "Analiz_Sunumu.pptx" }).then(() => {
            console.log("PPTX başarıyla kaydedildi.");
        }).catch(err => {
            console.error("PPTX kaydetme hatası:", err);
            alert("Dosya kaydedilirken bir hata oluştu.");
        });
        
    } catch (e) {
        console.error("PPTX oluşturulurken hata:", e);
        alert("PowerPoint sunumu oluşturulurken bir hata oluştu.");
    }
}
