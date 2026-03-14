// --- GLOBAL VARIABLES ---
// Use window object to ensure cross-script access
window.rawData = [];
window.originalJson = [];
window.questionList = [];
window.groupingCandidates = [];
window.feedbackColumns = [];
window.multiSelectCandidates = [];
window.currentFilters = []; // Global filter state for sharing

// DOM Elements (Explicit Definition)
const loader = document.getElementById('loader');
const statusMsg = document.getElementById('statusMsg');
const uploadOverlay = document.getElementById('uploadOverlay');
const mainContainer = document.getElementById('mainContainer') || document.body;

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
// --- UPLOAD HANDLERS ---
const dropZone = document.getElementById('dropZone');
// uploadOverlay, mainContainer, loader, statusMsg are global now

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

            // Extract headers and open mapping modal instead of analyzing directly
            const headers = Object.keys(jsonData[0]);
            openColumnMappingModal(headers);

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

// --- COLUMN MAPPING LOGIC (NEW) ---

function autoDetectColumns(headers, json) {
    const detected = {
        qKeys: [],
        potentialGroupKeys: [],
        feedbackColumns: [],
        multiSelectCandidates: []
    };

    detected.qKeys = headers.filter(h => {
        const lowerH = h.toLowerCase();
        if (lowerH.includes('memnuniyet') || lowerH.includes('değerlendirme') || lowerH.includes('katılma')) return true;
        if (h.includes('[')) return true;
        if (/^(soru|question|q|s)\s*\d+/i.test(h)) return true;
        if (lowerH.includes('puan') || lowerH.includes('skor') || lowerH.includes('rating')) return true;
        return false;
    });

    detected.potentialGroupKeys = headers.filter(h => !detected.qKeys.includes(h));

    detected.potentialGroupKeys.forEach(key => {
        const uniqueValues = new Set();
        let hasDelimiter = false;

        if (json && json.length > 0) {
            json.forEach(row => {
                const val = row[key];
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                    const sVal = String(val);
                    uniqueValues.add(sVal);
                    if (sVal.includes(';') || sVal.includes(',')) hasDelimiter = true;
                }
            });
        }

        // Grouping Candidate Logic
        if (uniqueValues.size >= 2 && uniqueValues.size <= 40) {
            const isLongText = Array.from(uniqueValues).some(v => String(v).length > 60);
            if (!isLongText) {
                let label = key;
                if (key.includes('Biriminiz')) label = 'Birim / Fakülte';
                else if (key.includes('seçeneği işaretleyiniz')) label = 'Rol / Unvan';
                else if (key.includes('Cinsiyet')) label = 'Cinsiyet';

                // We won't push directly to global groupingCandidates here, 
                // just marking it as a "group" type for the mapping UI
                detected.potentialGroupKeys.push(key); // Already in there
            }
        }

        const lowerKey = key.toLowerCase();
        let isFeedback = false;

        if (lowerKey.includes('görüş') || lowerKey.includes('öneri') || lowerKey.includes('ifade') || lowerKey.includes('düşünce')) {
            isFeedback = true;
        }

        if (isFeedback) {
            const sampleVal = json && json.length > 0 ? json.find(row => row[key])?.[key] : null;
            if (sampleVal && isNaN(parseInt(sampleVal))) {
                detected.feedbackColumns.push(key);
            }
        }
    });

    return detected;
}

function openColumnMappingModal(headers) {
    const listContainer = document.getElementById('columnMappingList');
    listContainer.innerHTML = ''; // Clear previous

    const detected = autoDetectColumns(headers, originalJson);

    headers.forEach((header, index) => {
        // Determine default selection
        let defaultType = 'ignore';
        if (detected.qKeys.includes(header)) {
            defaultType = 'question';
        } else if (detected.feedbackColumns.includes(header)) {
            defaultType = 'feedback';
        } else if (detected.potentialGroupKeys.includes(header)) { // Simplification: if not Q or Feedback, suggest Group (if it looks like one, but mostly let user decide)
            // Let's suggest 'group' if it's not a question or feedback, but has low cardinality.
            // For simplicity in UI, we'll default others to group or ignore.
            defaultType = 'group';
        }

        const rowHTML = `
            <div class="flex flex-col sm:flex-row items-start sm:items-center p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition" onclick="document.getElementById('chk-map-${index}').click()">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                    <input type="checkbox" id="chk-map-${index}" class="map-checkbox w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500" onclick="event.stopPropagation()">
                    <span class="text-xs font-mono text-slate-400 w-6">${index + 1}.</span>
                    <p class="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate select-none" title="${header}">${header}</p>
                </div>
                <div class="w-full sm:w-48" onclick="event.stopPropagation()">
                    <select id="map-col-${index}" data-header="${header}" class="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 dark:text-white map-select-item">
                        <option value="question" ${defaultType === 'question' ? 'selected' : ''}>Puanlanan Soru</option>
                        <option value="group" ${defaultType === 'group' ? 'selected' : ''}>Grup / Demografik</option>
                        <option value="feedback" ${defaultType === 'feedback' ? 'selected' : ''}>Görüş / Öneri</option>
                        <option value="metric" ${defaultType === 'metric' ? 'selected' : ''}>Sayısal (Metrik)</option>
                        <option value="ignore" ${defaultType === 'ignore' ? 'selected' : ''}>Yoksay</option>
                    </select>
                </div>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', rowHTML);
    });

    // Attach Shift-Click handler
    attachCheckboxShiftClick();

    document.getElementById('columnMappingModal').classList.remove('hidden');
    loader.style.display = 'none'; // Hide loader while user maps
}

function attachCheckboxShiftClick() {
    const checkboxes = Array.from(document.querySelectorAll('.map-checkbox'));
    let lastChecked = null;

    checkboxes.forEach((chk, index) => {
        chk.addEventListener('click', (e) => {
            if (!lastChecked) {
                lastChecked = chk;
                return;
            }

            if (e.shiftKey) {
                const start = checkboxes.indexOf(chk);
                const end = checkboxes.indexOf(lastChecked);
                const sliceStart = Math.min(start, end);
                const sliceEnd = Math.max(start, end);

                for (let i = sliceStart; i <= sliceEnd; i++) {
                    checkboxes[i].checked = lastChecked.checked;
                }
            }
            lastChecked = chk;
        });
    });
}

function applyBulkMapping(actionType) {
    const selectedType = document.getElementById('bulkMappingType').value;
    const selects = Array.from(document.querySelectorAll('.map-select-item'));
    const checkboxes = Array.from(document.querySelectorAll('.map-checkbox'));

    if (actionType === 'selected') {
        checkboxes.forEach((chk, index) => {
            if (chk.checked) {
                selects[index].value = selectedType;
            }
        });
    }

    // Seçim işlemlerinden sonra tüm tikleri ve inputu temizle
    checkboxes.forEach(chk => chk.checked = false);
    document.getElementById('bulkMappingRange').value = '';
}

function selectBulkRange() {
    const rangeStr = document.getElementById('bulkMappingRange').value.trim();
    if (!rangeStr) return;

    const checkboxes = Array.from(document.querySelectorAll('.map-checkbox'));

    // Parse range string (e.g. "1-5, 8, 10")
    const indicesToSelect = new Set();
    const parts = rangeStr.split(',');

    parts.forEach(part => {
        part = part.trim();
        if (part.includes('-')) {
            const [startStr, endStr] = part.split('-');
            const start = parseInt(startStr);
            const end = parseInt(endStr);
            if (!isNaN(start) && !isNaN(end)) {
                const min = Math.min(start, end);
                const max = Math.max(start, end);
                for (let i = min; i <= max; i++) indicesToSelect.add(i - 1); // 1-based to 0-based
            }
        } else {
            const val = parseInt(part);
            if (!isNaN(val)) indicesToSelect.add(val - 1);
        }
    });

    // Sadece tikle, menüyü değiştirme
    indicesToSelect.forEach(idx => {
        if (idx >= 0 && idx < checkboxes.length) {
            checkboxes[idx].checked = true; // Visual feedback
        }
    });
}

function reopenColumnMappingModal() {
    if (!originalJson || originalJson.length === 0) {
        alert("Önce bir veri dosyası yüklemelisiniz.");
        return;
    }
    document.getElementById('columnMappingModal').classList.remove('hidden');
}

function applyColumnMapping() {
    const listContainer = document.getElementById('columnMappingList');
    const selects = listContainer.querySelectorAll('select');

    const userMapping = {
        questions: [],
        groups: [],
        feedbacks: [],
        metrics: [],
        ignored: []
    };

    selects.forEach(select => {
        const header = select.getAttribute('data-header');
        const type = select.value;

        if (type === 'question') userMapping.questions.push(header);
        else if (type === 'group') userMapping.groups.push(header);
        else if (type === 'feedback') userMapping.feedbacks.push(header);
        else if (type === 'metric') userMapping.metrics.push(header);
        else userMapping.ignored.push(header);
    });

    if (userMapping.questions.length === 0) {
        alert("En az bir tane 'Puanlanan Soru' seçmelisiniz.");
        return;
    }

    // Hide mapping modal, show loader again
    document.getElementById('columnMappingModal').classList.add('hidden');
    loader.style.display = 'block';

    // Allow UI to repaint
    setTimeout(() => {
        analyzeAndProcess(originalJson, userMapping);

        loader.style.display = 'none';
        uploadOverlay.style.opacity = '0';
        setTimeout(() => {
            uploadOverlay.style.display = 'none';
            mainContainer.classList.remove('blur-sm');
        }, 500);
    }, 100);
}


function analyzeAndProcess(json, customMapping = null) {
    try {
        console.log("Analyzing data...", json.length);

        const headers = Object.keys(json[0]);
        let qKeys = [];

        groupingCandidates = [];
        feedbackColumns = [];
        multiSelectCandidates = [];

        if (customMapping) {
            // --- MANUAL MAPPING MODE ---
            qKeys = customMapping.questions;

            // Process Groups
            customMapping.groups.forEach(key => {
                const uniqueValues = new Set();
                let hasDelimiter = false;

                json.forEach(row => {
                    const val = row[key];
                    if (val !== undefined && val !== null && String(val).trim() !== '') {
                        const sVal = String(val);
                        uniqueValues.add(sVal);
                        if (sVal.includes(';') || sVal.includes(',')) hasDelimiter = true;
                    }
                });

                groupingCandidates.push({
                    key: key,
                    label: key, // Can be improved by asking user for label later, but keeping simple
                    options: Array.from(uniqueValues).sort()
                });

                if (hasDelimiter) {
                    multiSelectCandidates.push({ key: key, label: key });
                }
            });

            // Process Feedbacks
            customMapping.feedbacks.forEach(key => {
                feedbackColumns.push({ key: key, label: key });
            });

        } else {
            // --- AUTOMATIC FALLBACK (Should rarely be hit now, mainly for checkSharedUrl) ---
            qKeys = headers.filter(h => {
                const lowerH = h.toLowerCase();
                if (lowerH.includes('memnuniyet') || lowerH.includes('değerlendirme') || lowerH.includes('katılma')) return true;
                if (h.includes('[')) return true;
                if (/^(soru|question|q|s)\s*\d+/i.test(h)) return true;
                if (lowerH.includes('puan') || lowerH.includes('skor') || lowerH.includes('rating')) return true;
                return false;
            });

            const potentialGroupKeys = headers.filter(h => !qKeys.includes(h));

            potentialGroupKeys.forEach(key => {
                const uniqueValues = new Set();
                let hasDelimiter = false;

                json.forEach(row => {
                    const val = row[key];
                    if (val !== undefined && val !== null && String(val).trim() !== '') {
                        const sVal = String(val);
                        uniqueValues.add(sVal);
                        if (sVal.includes(';') || sVal.includes(',')) hasDelimiter = true;
                    }
                });

                if (uniqueValues.size >= 2 && uniqueValues.size <= 40) {
                    const isLongText = Array.from(uniqueValues).some(v => String(v).length > 60);
                    if (!isLongText) {
                        groupingCandidates.push({
                            key: key,
                            label: key,
                            options: Array.from(uniqueValues).sort()
                        });
                    }
                }

                if (hasDelimiter) {
                    multiSelectCandidates.push({ key: key, label: key });
                }

                const lowerKey = key.toLowerCase();
                let isFeedback = false;

                if (lowerKey.includes('görüş') || lowerKey.includes('öneri') || lowerKey.includes('ifade') || lowerKey.includes('düşünce')) {
                    isFeedback = true;
                }

                if (isFeedback) {
                    feedbackColumns.push({ key: key, label: key });
                }
            });
        } // End of customMapping else block

        questionList = qKeys.map(k => {
            const match = k.match(/\[(.*?)\]/);
            if (match) return match[1];
            return k.length > 50 ? k.substring(0, 50) + '...' : k;
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

    } catch (e) {
        console.error("Critical error in analyzeAndProcess:", e);
        // Alert removed for better UX, check console if needed
        throw e;
    }
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

// --- SHARE ANALYSIS FUNCTIONS ---

function generateShareLink(durationHours = 1, customTitle = "", readOnly = true) {
    if (!originalJson || originalJson.length === 0) {
        alert("Paylaşılacak veri bulunamadı.");
        return null;
    }

    // Capture current view state
    const currentGroup = document.getElementById('groupSelect') ? document.getElementById('groupSelect').value : 'none';

    // Extract current filters from UI
    currentFilters = [];
    document.querySelectorAll('.dynamic-filter').forEach(select => {
        if (select.value !== 'all') {
            currentFilters.push({ key: select.dataset.key, value: select.value });
        }
    });

    const shareData = {
        data: originalJson,
        timestamp: Date.now(),
        expiresAt: Date.now() + (durationHours * 60 * 60 * 1000),
        version: 1,
        options: {
            title: customTitle,
            savedGroup: currentGroup,
            savedFilters: currentFilters
        }
    };

    try {
        const jsonString = JSON.stringify(shareData);
        const compressed = LZString.compressToEncodedURIComponent(jsonString);

        // Construct URL: clear existing hash
        const baseUrl = window.location.href.split('#')[0];
        return `${baseUrl}#share=${compressed}`;
    } catch (e) {
        console.error("Compression error:", e);
        alert("Veri sıkıştırılırken hata oluştu: " + e.message);
        return null;
    }
}

function generateAndShowShareLink() {
    const durationHours = parseInt(document.getElementById('shareExpiration').value) || 1;
    const customTitle = document.getElementById('shareCustomTitle').value.trim();

    const link = generateShareLink(durationHours, customTitle);
    if (link) {
        const input = document.getElementById('shareLinkInput');
        input.value = link;
        document.getElementById('share-copy-msg').textContent = 'Link oluşturuldu!';
    }
}

function openShareModal() {
    const input = document.getElementById('shareLinkInput');
    input.value = '';
    document.getElementById('shareModal').classList.remove('hidden');
    document.getElementById('share-copy-msg').textContent = '';
}

function copyShareLink() {
    const input = document.getElementById('shareLinkInput');
    input.select();
    input.setSelectionRange(0, 99999); // Mobile compatibility

    // Modern API
    if (navigator.clipboard) {
        navigator.clipboard.writeText(input.value).then(() => {
            document.getElementById('share-copy-msg').textContent = 'Link kopyalandı!';
        }).catch(err => {
            // Fallback
            document.execCommand('copy');
            document.getElementById('share-copy-msg').textContent = 'Link kopyalandı!';
        });
    } else {
        document.execCommand('copy');
        document.getElementById('share-copy-msg').textContent = 'Link kopyalandı!';
    }
}

function checkSharedUrl() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#share=')) {
        const compressed = hash.substring(7); // remove #share=

        try {
            loader.style.display = 'block';
            statusMsg.classList.remove('hidden');
            statusMsg.textContent = "Paylaşılan analiz yükleniyor...";

            // Small timeout to allow UI to render loader
            setTimeout(() => {
                const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
                if (!decompressed) {
                    throw new Error("Link bozuk veya geçersiz.");
                }

                const parsed = JSON.parse(decompressed);

                if (parsed.expiresAt < Date.now()) {
                    throw new Error("Bu paylaşım linkinin süresi dolmuş.");
                }

                // Options Check
                const options = parsed.options || {};
                const customTitle = options.title || "";
                const savedGroup = options.savedGroup || 'none';
                const savedFilters = options.savedFilters || [];

                // Load Data
                originalJson = parsed.data; // Keep originalJson updated for other functions
                analyzeAndProcess(parsed.data);

                // Restore Filter States if Available
                if (savedGroup !== 'none') {
                    const groupSelect = document.getElementById('groupSelect');
                    if (groupSelect) {
                        groupSelect.value = savedGroup;
                        updateDashboard(); // Apply the grouping
                    }
                }

                if (savedFilters.length > 0) {
                    currentFilters = savedFilters;

                    // Visually Reconstruct the Dynamic Filters UI
                    const container = document.getElementById('dynamicFilters');
                    const noMsg = document.getElementById('no-filter-msg');
                    if (noMsg) noMsg.remove();
                    container.innerHTML = ''; // Temizle

                    savedFilters.forEach((filter, index) => {
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
                            if (cand.key === filter.key) opt.selected = true;
                            colSelect.appendChild(opt);
                        });

                        const valSelect = document.createElement('select');
                        valSelect.className = "dynamic-filter w-1/2 bg-white border border-slate-200 text-slate-700 text-xs rounded focus:ring-blue-500 focus:border-blue-500 p-1.5";
                        valSelect.dataset.key = filter.key;

                        const candidate = groupingCandidates.find(c => c.key === filter.key);
                        const optAll = document.createElement('option');
                        optAll.value = "all";
                        optAll.textContent = "Tümü";
                        valSelect.appendChild(optAll);

                        if (candidate) {
                            candidate.options.forEach(optVal => {
                                const opt = document.createElement('option');
                                opt.value = optVal;
                                opt.textContent = optVal;
                                if (optVal === filter.value) opt.selected = true;
                                valSelect.appendChild(opt);
                            });
                        }

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
                            const cand = groupingCandidates.find(c => c.key === selectedKey);
                            valSelect.innerHTML = '<option value="all">Tümü</option>';
                            valSelect.dataset.key = selectedKey;
                            if (cand) {
                                cand.options.forEach(optVal => {
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

                        flexDiv.appendChild(colSelect);
                        flexDiv.appendChild(valSelect);
                        wrapper.appendChild(flexDiv);
                        wrapper.appendChild(removeBtn);
                        container.appendChild(wrapper);
                    });

                    updateDashboard(); // Re-render visuals using these filters
                }

                // Setup View Mode
                enableSharedViewMode(parsed.expiresAt, customTitle);

                loader.style.display = 'none';
                uploadOverlay.style.opacity = '0';
                setTimeout(() => {
                    uploadOverlay.style.display = 'none';
                    mainContainer.classList.remove('blur-sm');
                }, 500);

            }, 100);

        } catch (e) {
            loader.style.display = 'none';
            statusMsg.textContent = "Hata: " + e.message;
            alert(e.message);
            // Kapanma işlemi
            document.body.innerHTML = `
                <div class="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                    <div class="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fa-solid fa-clock-rotate-left text-2xl text-red-600"></i>
                        </div>
                        <h2 class="text-xl font-bold text-slate-800 mb-2">Süre Doldu</h2>
                        <p class="text-slate-600 mb-6">${e.message}</p>
                        <button onclick="window.location.href=window.location.pathname" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                            Ana Sayfaya Dön
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

function enableSharedViewMode(expiresAt, customTitle = "") {
    // Hide Data Editor Tab
    const editorTabBtn = document.getElementById('tab-btn-editor');
    if (editorTabBtn) editorTabBtn.style.display = 'none';

    // Add visual indicator and countdown
    const title = document.getElementById('page-title');
    if (title) {
        const displayTitle = customTitle.length > 0 ? customTitle : "Analiz Paneli";
        title.innerHTML = displayTitle + ' <span class="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded ml-2">Paylaşım Modu</span><span id="share-countdown" class="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-0.5 rounded ml-2"><i class="fa-regular fa-clock"></i> --:--:--</span>';
    }

    // Start Countdown
    if (expiresAt) {
        startShareCountdown(expiresAt);
    }

    // Disable "Reset / New File" button sidebar
    const resetBtn = document.querySelector('aside button[onclick="location.reload()"]');
    if (resetBtn) {
        resetBtn.style.display = 'none';
    }

    // Disable "Share" and "Edit Mapping" buttons in header
    const shareBtn = document.getElementById('btn-share-analysis');
    if (shareBtn) shareBtn.style.display = 'none';
    const editMapBtn = document.getElementById('btn-edit-mapping');
    if (editMapBtn) editMapBtn.style.display = 'none';

    // Hide upload overlay if it's there (it is handled in checkSharedUrl but for safety)
    if (uploadOverlay) uploadOverlay.style.display = 'none';
    if (mainContainer) mainContainer.classList.remove('blur-sm');
}

function startShareCountdown(expiresAt) {
    if (window.shareCountdownInterval) clearInterval(window.shareCountdownInterval);

    const updateCountdown = () => {
        const now = Date.now();
        const diff = expiresAt - now;

        if (diff <= 0) {
            clearInterval(window.shareCountdownInterval);
            alert("Paylaşım süresi doldu. Ana sayfaya yönlendiriliyorsunuz.");
            window.location.href = window.location.pathname;
            return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const pad = (num) => num.toString().padStart(2, '0');
        const countStr = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

        const cdEl = document.getElementById('share-countdown');
        if (cdEl) {
            cdEl.innerHTML = `<i class="fa-regular fa-clock"></i> ${countStr}`;
            // Optional visual warning when less than 5 minutes
            if (hours === 0 && minutes < 5) {
                cdEl.classList.remove('bg-red-100', 'text-red-800');
                cdEl.classList.add('bg-red-500', 'text-white', 'animate-pulse');
            }
        }
    };

    updateCountdown(); // Call immediately
    window.shareCountdownInterval = setInterval(updateCountdown, 1000);
}

// Initial Check
document.addEventListener('DOMContentLoaded', checkSharedUrl);
