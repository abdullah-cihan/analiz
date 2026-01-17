// ============================================
// DETAILED REPORT GENERATOR
// Dynamic report generation for any dataset
// ============================================

function generateDetailedReport() {
    console.log('generateDetailedReport called');

    // Check if data and questionList are available
    if (typeof getFilteredData !== 'function') {
        console.error('getFilteredData function not found');
        return;
    }

    if (typeof questionList === 'undefined' || !questionList || questionList.length === 0) {
        console.error('questionList is not available or empty');
        showReportError('Lütfen önce bir Excel dosyası yükleyin.');
        return;
    }

    const data = getFilteredData();

    if (!data || data.length === 0) {
        console.log('No data available for report');
        showReportError('Veri bulunamadı. Lütfen önce bir Excel dosyası yükleyin.');
        return;
    }

    console.log('Data available:', data.length, 'rows');
    console.log('Questions:', questionList.length);

    try {
        // Calculate overall statistics
        const stats = calculateOverallStats(data);
        console.log('Stats calculated:', stats);

        // Update metrics
        updateReportMetrics(stats);

        // Generate executive summary
        generateExecutiveSummary(stats);

        // Generate key findings
        generateKeyFindings(stats);

        // Generate action recommendations
        generateActionRecommendations(stats);

        // Generate strengths and weaknesses
        generateStrengthsWeaknesses(stats);

        // Generate score distribution
        generateScoreDistribution(data);

        console.log('Report generated successfully');
    } catch (error) {
        console.error('Error generating report:', error);
        showReportError('Rapor oluşturulurken bir hata oluştu: ' + error.message);
    }
}

function showReportError(message) {
    const summaryEl = document.getElementById('executive-summary');
    if (summaryEl) {
        summaryEl.innerHTML = `
            <div class="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <i class="fa-solid fa-exclamation-triangle text-yellow-600 dark:text-yellow-400 text-2xl"></i>
                <p class="text-sm text-yellow-800 dark:text-yellow-200">${message}</p>
            </div>
        `;
    }
}

function calculateOverallStats(data) {
    const questionKeys = questionList.map((_, i) => `Q${i + 1}`);

    // Calculate all question statistics
    const questionStats = questionKeys.map((qKey, idx) => {
        const values = data.map(row => row[qKey]).filter(v => v !== undefined);
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = values.length > 0 ? sum / values.length : 0;

        // Standard deviation
        const sqDiffs = values.map(v => Math.pow(v - mean, 2));
        const std = values.length > 1 ? Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (values.length - 1)) : 0;

        return {
            question: questionList[idx],
            key: qKey,
            mean: mean,
            std: std,
            count: values.length
        };
    });

    // Overall metrics
    const allValues = data.flatMap(row => questionKeys.map(k => row[k])).filter(v => v !== undefined);
    const overallMean = allValues.length > 0 ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 0;
    const overallStd = questionStats.reduce((sum, q) => sum + q.std, 0) / questionStats.length;

    // Cronbach's Alpha
    const alpha = calculateCronbachAlpha(data);

    // Sort questions by mean
    const sortedByMean = [...questionStats].sort((a, b) => b.mean - a.mean);
    const topQuestions = sortedByMean.slice(0, 3);
    const bottomQuestions = sortedByMean.slice(-3).reverse();

    // Score distribution
    const scoreDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allValues.forEach(val => {
        const rounded = Math.round(val);
        if (rounded >= 1 && rounded <= 5) {
            scoreDistribution[rounded]++;
        }
    });

    return {
        participantCount: data.length,
        questionCount: questionList.length,
        overallMean: overallMean,
        overallStd: overallStd,
        alpha: alpha,
        questionStats: questionStats,
        topQuestions: topQuestions,
        bottomQuestions: bottomQuestions,
        scoreDistribution: scoreDistribution,
        totalResponses: allValues.length
    };
}

function updateReportMetrics(stats) {
    document.getElementById('report-overall-score').textContent = stats.overallMean.toFixed(2);
    document.getElementById('report-participants').textContent = stats.participantCount;
    document.getElementById('report-reliability').textContent = stats.alpha.toFixed(2);
    document.getElementById('report-consistency').textContent = stats.overallStd.toFixed(2);

    // Update description based on score
    const scoreDesc = document.getElementById('report-overall-desc');
    if (stats.overallMean >= 4.5) scoreDesc.textContent = 'Mükemmel';
    else if (stats.overallMean >= 4.0) scoreDesc.textContent = 'Çok İyi';
    else if (stats.overallMean >= 3.5) scoreDesc.textContent = 'İyi';
    else if (stats.overallMean >= 3.0) scoreDesc.textContent = 'Orta';
    else scoreDesc.textContent = 'Geliştirilmeli';
}

function generateExecutiveSummary(stats) {
    const container = document.getElementById('executive-summary');

    let satisfactionLevel = '';
    let alphaQuality = '';
    let consistencyLevel = '';

    // Satisfaction assessment
    if (stats.overallMean >= 4.2) satisfactionLevel = 'yüksek';
    else if (stats.overallMean >= 3.5) satisfactionLevel = 'orta-yüksek';
    else if (stats.overallMean >= 2.8) satisfactionLevel = 'orta';
    else satisfactionLevel = 'düşük';

    // Alpha quality
    if (stats.alpha >= 0.9) alphaQuality = 'mükemmel';
    else if (stats.alpha >= 0.8) alphaQuality = 'iyi';
    else if (stats.alpha >= 0.7) alphaQuality = 'kabul edilebilir';
    else alphaQuality = 'düşük';

    // Consistency
    if (stats.overallStd < 0.7) consistencyLevel = 'çok yüksek tutarlılık';
    else if (stats.overallStd < 1.0) consistencyLevel = 'yüksek tutarlılık';
    else if (stats.overallStd < 1.3) consistencyLevel = 'orta tutarlılık';
    else consistencyLevel = 'düşük tutarlılık';

    const summary = `
        <p><strong>${stats.participantCount}</strong> katılımcıdan toplanan verilere göre, 
        <strong>${stats.questionCount}</strong> soru üzerinden yapılan değerlendirmede 
        genel memnuniyet skoru <strong>${stats.overallMean.toFixed(2)}/5.0</strong> olarak hesaplanmıştır. 
        Bu, <strong>${satisfactionLevel}</strong> bir memnuniyet düzeyine işaret etmektedir.</p>
        
        <p>Verilerin iç tutarlılık katsayısı (Cronbach's Alpha) <strong>${stats.alpha.toFixed(2)}</strong> 
        olup, bu değer ölçüm aracının <strong>${alphaQuality}</strong> güvenilirliğe sahip olduğunu göstermektedir. 
        Standart sapma değeri <strong>${stats.overallStd.toFixed(2)}</strong> ile katılımcılar arasında 
        <strong>${consistencyLevel}</strong> gözlemlenmiştir.</p>
        
        <p>En yüksek memnuniyet "<em>${stats.topQuestions[0].question}</em>" konusunda 
        (<strong>${stats.topQuestions[0].mean.toFixed(2)}</strong> puan), 
        en düşük memnuniyet ise "<em>${stats.bottomQuestions[0].question}</em>" konusunda 
        (<strong>${stats.bottomQuestions[0].mean.toFixed(2)}</strong> puan) tespit edilmiştir.</p>
    `;

    container.innerHTML = summary;
}

function generateKeyFindings(stats) {
    const container = document.getElementById('key-findings');

    const findings = [];

    // Top performing area
    findings.push({
        icon: 'fa-star',
        color: 'text-emerald-600 dark:text-emerald-400',
        title: 'En Başarılı Konu',
        text: `"${stats.topQuestions[0].question}" ${stats.topQuestions[0].mean.toFixed(2)} puan ile en yüksek memnuniyeti aldı.`
    });

    // Lowest performing area
    findings.push({
        icon: 'fa-flag',
        color: 'text-red-600 dark:text-red-400',
        title: 'Dikkat Gerektiren Alan',
        text: `"${stats.bottomQuestions[0].question}" ${stats.bottomQuestions[0].mean.toFixed(2)} puan ile en düşük skorlu konu olarak öne çıkıyor.`
    });

    // Reliability insight
    if (stats.alpha >= 0.8) {
        findings.push({
            icon: 'fa-shield-check',
            color: 'text-blue-600 dark:text-blue-400',
            title: 'Yüksek Güvenilirlik',
            text: `${stats.alpha.toFixed(2)} Cronbach's Alpha değeri, anket sonuçlarının güvenilir olduğunu gösteriyor.`
        });
    } else {
        findings.push({
            icon: 'fa-exclamation-triangle',
            color: 'text-orange-600 dark:text-orange-400',
            title: 'Güvenilirlik Uyarısı',
            text: `${stats.alpha.toFixed(2)} Cronbach's Alpha değeri, ölçüm aracının gözden geçirilmesi gerebileceğini gösteriyor.`
        });
    }

    // Consistency insight
    if (stats.overallStd > 1.2) {
        findings.push({
            icon: 'fa-chart-scatter',
            color: 'text-purple-600 dark:text-purple-400',
            title: 'Değişken Görüşler',
            text: `${stats.overallStd.toFixed(2)} standart sapma ile katılımcılar arasında görüş farklılıkları mevcut.`
        });
    }

    let html = '';
    findings.forEach(finding => {
        html += `
            <div class="flex gap-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                <div class="flex-shrink-0">
                    <i class="fa-solid ${finding.icon} ${finding.color} text-lg"></i>
                </div>
                <div>
                    <div class="font-bold text-sm text-slate-700 dark:text-slate-200">${finding.title}</div>
                    <div class="text-xs text-slate-600 dark:text-slate-300 mt-1">${finding.text}</div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function generateActionRecommendations(stats) {
    const container = document.getElementById('action-items');

    const actions = [];

    // For bottom questions
    stats.bottomQuestions.slice(0, 2).forEach((q, idx) => {
        if (q.mean < 3.5) {
            actions.push({
                priority: 'high',
                text: `"${q.question}" konusunda iyileştirme planı oluşturun (Mevcut: ${q.mean.toFixed(2)}/5.0)`
            });
        } else if (q.mean < 4.0) {
            actions.push({
                priority: 'medium',
                text: `"${q.question}" için gelişim fırsatlarını değerlendirin (${q.mean.toFixed(2)}/5.0)`
            });
        }
    });

    // Alpha-based recommendation
    if (stats.alpha < 0.7) {
        actions.push({
            priority: 'high',
            text: 'Anket sorularını gözden geçirin ve tutarlılığı artırmak için revize edin'
        });
    }

    // Consistency recommendation
    if (stats.overallStd > 1.2) {
        actions.push({
            priority: 'medium',
            text: 'Farklı grupların ihtiyaçlarını analiz edin ve özelleştirilmiş çözümler geliştirin'
        });
    }

    // Success maintenance
    if (stats.topQuestions[0].mean >= 4.5) {
        actions.push({
            priority: 'low',
            text: `"${stats.topQuestions[0].question}" konusundaki başarıyı sürdürmek için en iyi uygulamaları belgeleyin`
        });
    }

    // If overall is good but has outliers
    if (stats.overallMean >= 4.0 && stats.bottomQuestions[0].mean < 3.5) {
        actions.push({
            priority: 'medium',
            text: 'Düşük puanlı alanlara odaklanarak genel memnuniyeti daha da artırın'
        });
    }

    let html = '';
    actions.forEach((action, idx) => {
        const priorityColors = {
            high: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700',
            medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700',
            low: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700'
        };

        const priorityLabels = {
            high: 'Yüksek Öncelik',
            medium: 'Orta Öncelik',
            low: 'Düşük Öncelik'
        };

        html += `
            <div class="flex gap-3 items-start p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                <div class="flex-shrink-0 w-6 h-6 bg-green-600 dark:bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    ${idx + 1}
                </div>
                <div class="flex-1">
                    <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-2 ${priorityColors[action.priority]} border">
                        ${priorityLabels[action.priority]}
                    </span>
                    <p class="text-sm text-slate-700 dark:text-slate-200">${action.text}</p>
                </div>
            </div>
        `;
    });

    if (actions.length === 0) {
        html = '<p class="text-sm text-slate-400 italic">Genel performans mükemmel! Mevcut yaklaşımı sürdürün.</p>';
    }

    container.innerHTML = html;
}

function generateStrengthsWeaknesses(stats) {
    const strengthsContainer = document.getElementById('strengths-list');
    const weaknessesContainer = document.getElementById('weaknesses-list');

    // Strengths (top 5 questions)
    let strengthsHtml = '';
    stats.topQuestions.slice(0, 5).forEach(q => {
        if (q.mean >= 3.5) {
            strengthsHtml += `
                <div class="flex items-start gap-2 p-2 bg-emerald-50/50 dark:bg-emerald-900/10 rounded">
                    <i class="fa-solid fa-check-circle text-emerald-600 dark:text-emerald-400 text-sm mt-0.5"></i>
                    <div class="flex-1 text-xs">
                        <span class="text-slate-700 dark:text-slate-200">${q.question}</span>
                        <span class="font-bold text-emerald-700 dark:text-emerald-300 ml-2">${q.mean.toFixed(2)}</span>
                    </div>
                </div>
            `;
        }
    });

    if (!strengthsHtml) {
        strengthsHtml = '<p class="text-sm text-emerald-600/60 dark:text-emerald-400/60 italic">Belirgin güçlü yön tespit edilemedi.</p>';
    }

    // Weaknesses (bottom 5 questions)
    let weaknessesHtml = '';
    stats.bottomQuestions.slice(0, 5).forEach(q => {
        if (q.mean < 4.0) {
            const urgency = q.mean < 3.0 ? '🔴' : q.mean < 3.5 ? '🟡' : '🟢';
            weaknessesHtml += `
                <div class="flex items-start gap-2 p-2 bg-red-50/50 dark:bg-red-900/10 rounded">
                    <span class="text-sm mt-0.5">${urgency}</span>
                    <div class="flex-1 text-xs">
                        <span class="text-slate-700 dark:text-slate-200">${q.question}</span>
                        <span class="font-bold text-red-700 dark:text-red-300 ml-2">${q.mean.toFixed(2)}</span>
                    </div>
                </div>
            `;
        }
    });

    if (!weaknessesHtml) {
        weaknessesHtml = '<p class="text-sm text-red-600/60 dark:text-red-400/60 italic">Tüm alanlar kabul edilebilir seviyede performans gösteriyor.</p>';
    }

    strengthsContainer.innerHTML = strengthsHtml;
    weaknessesContainer.innerHTML = weaknessesHtml;
}

function generateScoreDistribution(data) {
    const container = document.getElementById('score-distribution');

    const allScores = data.flatMap(row =>
        questionList.map((_, i) => row[`Q${i + 1}`])
    ).filter(v => v !== undefined);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allScores.forEach(score => {
        const rounded = Math.round(score);
        if (rounded >= 1 && rounded <= 5) {
            distribution[rounded]++;
        }
    });

    const total = allScores.length;
    const maxCount = Math.max(...Object.values(distribution));

    let html = '';
    for (let score = 1; score <= 5; score++) {
        const count = distribution[score];
        const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
        const heightPercent = maxCount > 0 ? (count / maxCount * 100) : 0;

        const colors = {
            1: 'bg-red-500 dark:bg-red-600',
            2: 'bg-orange-500 dark:bg-orange-600',
            3: 'bg-yellow-500 dark:bg-yellow-600',
            4: 'bg-lime-500 dark:bg-lime-600',
            5: 'bg-emerald-500 dark:bg-emerald-600'
        };

        html += `
            <div class="flex flex-col items-center">
                <div class="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">${percentage}%</div>
                <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-t-lg h-32 flex flex-col justify-end relative">
                    <div class="${colors[score]} rounded-t-lg transition-all duration-500" 
                         style="height: ${heightPercent}%"></div>
                </div>
                <div class="text-sm font-bold text-slate-700 dark:text-slate-200 mt-2">${score} Puan</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">(${count})</div>
            </div>
        `;
    }

    container.innerHTML = html;
}
