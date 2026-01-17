// --- GLOBAL VARIABLES ---
// Use window object to ensure cross-script access
window.rawData = [];
window.originalJson = [];
window.questionList = [];
window.groupingCandidates = [];
window.feedbackColumns = [];
window.multiSelectCandidates = [];

// --- SAMPLE DATA GENERATION ---
function loadSampleData() {
    loader.style.display = 'block';
    statusMsg.classList.add('hidden');

    // Simulate network delay for effect
    setTimeout(() => {
        try {
            const sampleData = generateSampleData();
            originalJson = sampleData;
            analyzeAndProcess(sampleData);

            loader.style.display = 'none';
            uploadOverlay.style.opacity = '0';
            setTimeout(() => {
                uploadOverlay.style.display = 'none';
                mainContainer.classList.remove('blur-sm');
            }, 500);

            // Show a toast or notification that sample data is loaded
            alert("Örnek veri seti başarıyla yüklendi! Sistemin tüm özelliklerini keşfedebilirsiniz.");

        } catch (err) {
            loader.style.display = 'none';
            statusMsg.textContent = "Örnek veri yüklenirken hata oluştu: " + err.message;
            statusMsg.classList.remove('hidden');
        }
    }, 800);
}

function generateSampleData() {
    const rowCount = 120; // Enough data for stats
    const departments = ['İnsan Kaynakları', 'Bilgi İşlem', 'Satış & Pazarlama', 'Üretim', 'Finans'];
    const titles = ['Uzman', 'Uzman Yardımcısı', 'Yönetici', 'Direktör', 'Stajyer'];
    const locations = ['İstanbul', 'Ankara', 'İzmir', 'Bursa'];
    const tools = ['Excel', 'PowerBI', 'Tableau', 'Jira', 'Slack', 'Teams', 'Zoom'];

    const questions = [
        "Şirket hedefleri ve stratejileri hakkında yeterince bilgilendiriliyorum.",
        "Yöneticimden aldığım geri bildirimler gelişimime katkı sağlıyor.",
        "Çalışma ortamım verimli çalışmam için uygundur.",
        "Takım arkadaşlarım arasında iş birliği ve dayanışma yüksektir.",
        "Şirket içi iletişim kanalları etkin bir şekilde kullanılıyor.",
        "Yaptığım işin şirket başarısına katkısını görebiliyorum.",
        "Kariyer gelişimim için yeterli fırsatlar sunuluyor.",
        "Ücret ve yan haklar politikası adil ve tatmin edicidir.",
        "İş-özel hayat dengesini kurabiliyorum.",
        "Genel olarak bu şirkette çalışmaktan memnunum."
    ];

    const data = [];

    for (let i = 0; i < rowCount; i++) {
        const row = {};

        // Demographics
        row['Departman'] = departments[Math.floor(Math.random() * departments.length)];
        row['Unvan'] = titles[Math.floor(Math.random() * titles.length)];
        row['Lokasyon'] = locations[Math.floor(Math.random() * locations.length)];
        row['Kıdem Yılı'] = Math.floor(Math.random() * 15) + 1; // 1-15 years

        // Likert Questions (Weighted random for realism)
        questions.forEach((q, idx) => {
            // Skew towards positive results generally (3, 4, 5)
            const r = Math.random();
            let val;
            if (r < 0.1) val = 1;
            else if (r < 0.25) val = 2;
            else if (r < 0.5) val = 3;
            else if (r < 0.8) val = 4;
            else val = 5;
            row[`Soru ${idx + 1}: ${q}`] = val;
        });

        // Multi-select column
        const numTools = Math.floor(Math.random() * 4) + 1;
        const selectedTools = [];
        for (let j = 0; j < numTools; j++) {
            const tool = tools[Math.floor(Math.random() * tools.length)];
            if (!selectedTools.includes(tool)) selectedTools.push(tool);
        }
        row['Kullandığınız Araçlar (Çoklu Seçim)'] = selectedTools.join('; ');

        // Feedback (Random sentiments)
        const sentiments = [
            "Genel olarak çalışma ortamından memnunum ancak sosyal alanlar geliştirilebilir.",
            "Yöneticim çok ilgili, teşekkürler.",
            "Maaş artış oranları beklentimin altında kaldı.",
            "Eğitim fırsatları daha fazla olmalı diye düşünüyorum.",
            "Harika bir ekip ortamımız var, herkes çok yardımcı.",
            "Yemekhane kalitesi artırılmalı.",
            "Uzaktan çalışma imkanları çok değerli.",
            "İletişim kopuklukları yaşanabiliyor bazen.",
            "Şirketin vizyonuna inanıyorum.",
            "Toplantı süreleri çok uzun, daha verimli olabilir."
        ];

        // Add feedback to 40% of rows
        if (Math.random() < 0.4) {
            row['Genel Görüş ve Önerileriniz'] = sentiments[Math.floor(Math.random() * sentiments.length)];
        } else {
            row['Genel Görüş ve Önerileriniz'] = "";
        }

        data.push(row);
    }

    return data;
}


// --- UPLOAD HANDLERS ---
const dropZone = document.getElementById('dropZone');
const uploadOverlay = document.getElementById('uploadOverlay');
const mainContainer = document.getElementById('mainContainer');
const loader = document.getElementById('loader');
const statusMsg = document.getElementById('statusMsg');

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-active');
    }, false);
});
['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-active');
    }, false);
});

dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length) handleFile(files[0]);
});

function handleFileSelect(input) {
    if (input.files.length) handleFile(input.files[0]);
}

function handleFile(file) {
    statusMsg.classList.add('hidden');
    loader.style.display = 'block';

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];


            // Critical: { defval: "" } ensures empty cells are read as empty strings, preserving row structure
            // Critical: { defval: "" } ensures empty cells are read as empty strings, preserving row structure
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

            if (!jsonData || jsonData.length === 0) {
                throw new Error("Dosya boş veya okunamadı.");
            }

            originalJson = jsonData; // Store original
            analyzeAndProcess(jsonData);

            loader.style.display = 'none';
            uploadOverlay.style.opacity = '0';
            setTimeout(() => {
                uploadOverlay.style.display = 'none';
                mainContainer.classList.remove('blur-sm');
            }, 500);

        } catch (err) {
            loader.style.display = 'none';
            statusMsg.textContent = "Hata: " + err.message;
            statusMsg.classList.remove('hidden');
        }
    };
    reader.readAsArrayBuffer(file);
}

function analyzeAndProcess(json) {
    const headers = Object.keys(json[0]);

    const qKeys = headers.filter(h => {
        const lowerH = h.toLowerCase();
        if (lowerH.includes('memnuniyet') && lowerH.includes('değerlendirme')) return true;
        if (h.includes('[')) return true;
        if (/^(soru|question|q|s)\s*\d+/i.test(h)) return true;
        if (lowerH.includes('puan') || lowerH.includes('skor') || lowerH.includes('rating')) return true;
        return false;
    });

    questionList = qKeys.map(k => {
        const match = k.match(/\[(.*?)\]/);
        if (match) return match[1];
        return k.length > 50 ? k.substring(0, 50) + '...' : k;
    });

    groupingCandidates = [];
    feedbackColumns = [];
    multiSelectCandidates = []; // NEW: Reset candidates

    const potentialGroupKeys = headers.filter(h => !qKeys.includes(h));

    potentialGroupKeys.forEach(key => {
        const uniqueValues = new Set();
        let hasDelimiter = false;

        json.forEach(row => {
            const val = row[key];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
                const sVal = String(val);
                uniqueValues.add(sVal);
                // Check for common checkbox delimiters (comma or semicolon)
                if (sVal.includes(';') || sVal.includes(',')) hasDelimiter = true;
            }
        });

        // Grouping Candidate Logic
        if (uniqueValues.size >= 2 && uniqueValues.size <= 40) {
            const isLongText = Array.from(uniqueValues).some(v => String(v).length > 60);
            if (!isLongText) {
                let label = key;
                if (key.includes('Biriminiz')) label = 'Birim / Fakülte';
                else if (key.includes('seçeneği işaretleyiniz')) label = 'Rol / Unvan';
                else if (key.includes('Cinsiyet')) label = 'Cinsiyet';

                groupingCandidates.push({
                    key: key,
                    label: label,
                    options: Array.from(uniqueValues).sort()
                });
            }
        }

        // NEW: Multi-Select Candidate Logic
        // If it has delimiters and isn't purely numeric, consider it a checkbox question
        if (hasDelimiter) {
            multiSelectCandidates.push({ key: key, label: key });
        }

        const lowerKey = key.toLowerCase();
        let isFeedback = false;
        let niceLabel = key;

        if (lowerKey.includes('uzaktan eğitim merkezi müdürlüğü') && lowerKey.includes('görüş ve öneriniz')) {
            isFeedback = true;
            niceLabel = "Genel Görüş ve Öneriler";
            feedbackColumns.unshift({ key: key, label: niceLabel });
            return;
        }

        if (lowerKey.includes('yukarda yer almayan') && lowerKey.includes('görüş ve öneriniz')) {
            isFeedback = true;
            niceLabel = "Genel Görüş ve Öneriler";
            feedbackColumns.unshift({ key: key, label: niceLabel });
            return;
        }

        if (lowerKey.includes('görüş') || lowerKey.includes('öneri') || lowerKey.includes('ifade') || lowerKey.includes('düşünce')) {
            isFeedback = true;
        }

        if (isFeedback) {
            const sampleVal = json.find(row => row[key])?.[key];
            if (sampleVal && isNaN(parseInt(sampleVal))) {
                feedbackColumns.push({ key: key, label: niceLabel });
            }
        }
    });

    rawData = json.map(row => {
        const cleanRow = { ...row };
        qKeys.forEach((key, idx) => {
            const val = parseInt(row[key]);
            cleanRow[`Q${idx + 1}`] = (!isNaN(val) && val >= 1 && val <= 5) ? val : 3;
        });
        return cleanRow;
    });

    initControls();
    updateDashboard();

    const now = new Date();
    document.getElementById('last-update').textContent = `Yüklendi: ${now.toLocaleTimeString()}`;
}

function initControls() {
    const groupSelect = document.getElementById('groupSelect');
    groupSelect.innerHTML = '<option value="none">Karşılaştırma Yok (Genel)</option>';
    groupingCandidates.forEach(cand => {
        const opt = document.createElement('option');
        opt.value = cand.key;
        opt.textContent = cand.label;
        groupSelect.appendChild(opt);
    });

    const filterContainer = document.getElementById('dynamicFilters');
    filterContainer.innerHTML = '<p class="text-xs text-slate-400 italic" id="no-filter-msg">Henüz filtre eklenmedi.</p>';

    const fbSelect = document.getElementById('feedbackSource');
    fbSelect.innerHTML = '';
    if (feedbackColumns.length > 0) {
        feedbackColumns.forEach(col => {
            const opt = document.createElement('option');
            opt.value = col.key;
            const displayLabel = col.label.length > 50 ? col.label.substring(0, 50) + '...' : col.label;
            opt.textContent = displayLabel;
            fbSelect.appendChild(opt);
        });
    } else {
        const opt = document.createElement('option');
        opt.textContent = "Görüş/Öneri Sütunu Bulunamadı";
        fbSelect.appendChild(opt);
    }

    // NEW: Populate Multi-Select Dropdown
    const msSelect = document.getElementById('multiSelectCol');
    msSelect.innerHTML = '';
    const msContainer = document.getElementById('multi-select-container');
    if (multiSelectCandidates.length > 0) {
        msContainer.classList.remove('hidden');
        multiSelectCandidates.forEach(col => {
            const opt = document.createElement('option');
            opt.value = col.key;
            opt.textContent = col.label.length > 60 ? col.label.substring(0, 60) + '...' : col.label;
            msSelect.appendChild(opt);
        });
    } else {
        msContainer.classList.add('hidden');
    }
}

function resetFilters() {
    document.getElementById('groupSelect').value = 'none';
    document.getElementById('btn-open-comp').classList.add('hidden'); // Hide compare button
    const container = document.getElementById('dynamicFilters');
    container.innerHTML = '<p class="text-xs text-slate-400 italic" id="no-filter-msg">Henüz filtre eklenmedi.</p>';
    updateDashboard();
}

function addNewFilter() {
    if (groupingCandidates.length === 0) {
        alert("Filtrelenecek uygun sütun bulunamadı.");
        return;
    }

    const container = document.getElementById('dynamicFilters');
    const noMsg = document.getElementById('no-filter-msg');
    if (noMsg) noMsg.remove();

    const wrapper = document.createElement('div');
    wrapper.className = "filter-row bg-slate-50 p-2 rounded-lg border border-slate-200 relative mb-2";

    const flexDiv = document.createElement('div');
    flexDiv.className = "flex gap-2 mb-1 pr-6";

    const colSelect = document.createElement('select');
    colSelect.className = "w-1/2 bg-white border border-slate-200 text-slate-700 text-xs rounded focus:ring-blue-500 focus:border-blue-500 p-1.5";

    groupingCandidates.forEach(cand => {
        const opt = document.createElement('option');
        opt.value = cand.key;
        opt.textContent = cand.label;
        colSelect.appendChild(opt);
    });

    const valSelect = document.createElement('select');
    valSelect.className = "dynamic-filter w-1/2 bg-white border border-slate-200 text-slate-700 text-xs rounded focus:ring-blue-500 focus:border-blue-500 p-1.5";

    const removeBtn = document.createElement('button');
    removeBtn.className = "absolute top-2 right-2 text-slate-400 hover:text-red-500 transition";
    removeBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
    removeBtn.onclick = () => {
        wrapper.remove();
        if (container.children.length === 0) {
            container.innerHTML = '<p class="text-xs text-slate-400 italic" id="no-filter-msg">Henüz filtre eklenmedi.</p>';
        }
        updateDashboard();
    };

    const updateValSelect = () => {
        const selectedKey = colSelect.value;
        const candidate = groupingCandidates.find(c => c.key === selectedKey);

        valSelect.innerHTML = '<option value="all">Tümü</option>';
        valSelect.dataset.key = selectedKey;

        if (candidate) {
            candidate.options.forEach(optVal => {
                const opt = document.createElement('option');
                opt.value = optVal;
                opt.textContent = optVal;
                valSelect.appendChild(opt);
            });
        }
        updateDashboard();
    };

    colSelect.onchange = updateValSelect;
    valSelect.onchange = updateDashboard;

    updateValSelect();

    flexDiv.appendChild(colSelect);
    flexDiv.appendChild(valSelect);
    wrapper.appendChild(flexDiv);
    wrapper.appendChild(removeBtn);
    container.appendChild(wrapper);
}

function getFilteredData() {
    if (rawData.length === 0) return [];

    const filterSelects = document.querySelectorAll('.dynamic-filter');
    return rawData.filter(row => {
        let pass = true;
        filterSelects.forEach(select => {
            if (select.value !== 'all') {
                if (row[select.dataset.key] != select.value) pass = false;
            }
        });
        return pass;
    });
}

function updateDashboard() {
    const groupSelect = document.getElementById('groupSelect');
    const data = getFilteredData();

    // Use AnimateValue for Counters (Added to ui.js)
    if (typeof animateValue === 'function') {
        const currentCount = parseInt(document.getElementById('visible-count').textContent) || 0;
        animateValue(document.getElementById('visible-count'), currentCount, data.length, 1000);
    } else {
        document.getElementById('visible-count').textContent = data.length;
    }

    // Calculate overall averages
    let totalSum = 0, totalCount = 0;
    const questionStats = questionList.map((q, i) => {
        const k = `Q${i + 1}`;
        const vals = data.map(r => r[k]);
        const sum = vals.reduce((a, b) => a + b, 0);
        const avg = vals.length ? sum / vals.length : 0;

        // Std Dev
        const mean = avg;
        const sqDiffs = vals.map(v => Math.pow(v - mean, 2));
        const std = vals.length > 1 ? Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (vals.length - 1)) : 0;

        totalSum += sum;
        totalCount += vals.length;

        return { id: i + 1, text: q, avg: avg, std: std };
    });

    const overallAvg = totalCount ? totalSum / totalCount : 0;
    // document.getElementById('visible-avg').textContent = overallAvg.toFixed(2);
    if (typeof animateValue === 'function') {
        const currentAvg = parseFloat(document.getElementById('visible-avg').textContent) || 0;
        animateValue(document.getElementById('visible-avg'), currentAvg, overallAvg, 800, 2);
    }

    const avgStd = questionList.length ? (questionStats.reduce((a, b) => a + b.std, 0) / questionList.length) : 0;
    // document.getElementById('visible-std').textContent = avgStd.toFixed(2);
    if (typeof animateValue === 'function') {
        const currentStd = parseFloat(document.getElementById('visible-std').textContent) || 0;
        animateValue(document.getElementById('visible-std'), currentStd, avgStd, 800, 2);
    }

    // Cronbach's Alpha
    const alpha = calculateCronbachAlpha(data);
    const alphaEl = document.getElementById('visible-alpha');
    // alphaEl.textContent = alpha.toFixed(2);
    if (typeof animateValue === 'function') {
        const currentAlpha = parseFloat(alphaEl.textContent) || 0;
        animateValue(alphaEl, currentAlpha, alpha, 800, 2);
    }

    alphaEl.className = `font-bold px-2 py-0.5 rounded ${alpha >= 0.7 ? 'text-purple-600 bg-purple-50' : 'text-red-500 bg-red-50'}`;

    // Pass data and groupKey to renderMainChart for advanced grouping logic
    renderMainChart(questionStats, data, groupSelect.value);
    renderDistributionChart(data, groupSelect.value);
    renderHighLow(questionStats);
    renderCorrelations(data);
    renderDetailTable(questionStats);

    // Render Heatmap if tab active
    if (activeTab === 'heatmap') renderHeatmap();

    // Render MultiSelect if visible
    const msContainer = document.getElementById('multi-select-container');
    if (!msContainer.classList.contains('hidden')) renderMultiSelectAnalysis();

    // Render Report if tab active
    if (activeTab === 'report' && typeof generateDetailedReport === 'function') {
        generateDetailedReport();
    }

    // Enable Comparison Button
    const compBtn = document.getElementById('btn-open-comp');
    if (groupSelect.value !== 'none') compBtn.classList.remove('hidden');
    else compBtn.classList.add('hidden');
}

function saveAndRefresh() {
    analyzeAndProcess(originalJson);
    const statusEl = document.getElementById('save-status');
    if (statusEl) {
        statusEl.classList.remove('hidden', 'opacity-0');
        statusEl.classList.add('opacity-100');
        setTimeout(() => {
            statusEl.classList.remove('opacity-100');
            statusEl.classList.add('opacity-0');
            setTimeout(() => statusEl.classList.add('hidden'), 300);
        }, 2000);
    } else {
        alert("Veriler kaydedildi ve analizler güncellendi!");
    }
}

function downloadEditedData() {
    const ws = XLSX.utils.json_to_sheet(originalJson);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Düzenlenmiş Veri");
    XLSX.writeFile(wb, "Analiz_Duzenlenmis.xlsx");
}

function exportTableToExcel() {
    const table = document.getElementById('detail-stats-table');
    if (!table) return;
    const wb = XLSX.utils.table_to_book(table, { sheet: "Soru Detaylari" });
    XLSX.writeFile(wb, "Soru_Detaylari.xlsx");
}
