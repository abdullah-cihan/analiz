/**
 * Advanced Turkish Sentiment Analyzer
 * Özellikler: Sözlük tabanlı analiz, Stemmer (Kök bulucu), Emoji Desteği, 
 * Kalıp (Phrase) Tespiti, Pekiştirici ve Olumsuzluk Kontrolü, Fuzzy Matching (Yazım Toleransı)
 */

const SENTIMENT = {
    positive: [
        "iyi", "güzel", "harika", "mükemmel", "süper", "başarılı", "memnun",
        "kaliteli", "verimli", "faydalı", "beğendim", "sevdim", "hızlı",
        "ilgili", "profesyonel", "nazik", "temiz", "ferah", "net", "açık",
        "güvenilir", "sağlam", "tatmin", "avantaj", "kolay", "rahat",
        "şahane", "efsane", "mis", "muhteşem", "kusursuz", "tavsiye"
    ],
    negative: [
        "kötü", "berbat", "rezalet", "yetersiz", "sorun", "sıkıntı",
        "zayıf", "yavaş", "ilgisiz", "gereksiz", "beğenmedim", "hata",
        "kalitesiz", "karmaşık", "verimsiz", "sıkıcı", "pahalı",
        "negatif", "rezil", "iğrenç", "yanlış", "hatalı", "çirkin",
        "kaba", "saygısız", "yorucu", "bıktım", "pişman",
        "bozuk", "çalışmıyor", "bitik", "amatör", "çöp", "mağdur"
    ],
    neutral: [
        "idare", "normal", "ortalama", "standart",
        "eh", "fena", "sıradan", "tipik"
    ],
    phrases: {
        "çok iyi": 2.5,
        "çok kötü": -2.5,
        "on numara": 3,
        "herşey on numara": 3,
        "mükemmel gidiyor": 3,
        "iyi çalışıyor": 2,
        "ne iyi ne kötü": 0,
        "idare eder": 0,
        "fena değil": 1.5,
        "vakit kaybı": -3,
        "ciddiye almıyor": -2,
        "ciddiye almıyorlar": -2,
        "memnun kaldım": 2,
        "memnun değilim": -2
    },
    negators: [
        "değil", "yok", "hayır", "hiç", "asla", "etmez", "olmaz"
    ],
    conditionals: [
        "olursa", "eğer", "şayet", "varsa", "gerekirse"
    ],
    intensifiers: {
        "çok": 1.7,
        "aşırı": 2.0,
        "fazla": 1.5,
        "baya": 1.5,
        "oldukça": 1.4,
        "gerçekten": 1.5
    },
    emojis: {
        "🙂": 1, "😊": 2, "😍": 2, "👍": 2, "🔥": 2,
        "😡": -2, "😞": -1, "😢": -2, "👎": -2
    }
};

const STOP_WORDS = new Set([
    // Bağlaçlar ve Edatlar
    "ve", "ile", "veya", "ya", "da", "de", "ki", "ama", "fakat", "lakin", "ancak", "oysa", "oysaki", "madem", "meğer", "sanki",
    "çünkü", "için", "gibi", "kadar", "göre", "tarafından", "dolayı", "yüzünden", "rağmen", "karşın", "ise", "diye",
    "üzere", "sayesinde", "nedeniyle", "amacıyla", "hakkında", "konusunda", "ilgili", "dair", "açısından", "yerine", "birlikte", "beraber",
    
    // Zamirler
    "ben", "sen", "o", "biz", "siz", "onlar", "bana", "sana", "ona", "bize", "size", "onlara",
    "beni", "seni", "onu", "bizi", "sizi", "onları", "benim", "senin", "onun", "bizim", "sizin", "onların",
    "kendi", "kendisi", "kendim", "kendin", "kendileri", "birbiri", "birbirleri", "birbirimize", "birbirinize",
    "şu", "bu", "bunlar", "şunlar", "bundan", "şundan", "ondan", "bunun", "şunun", "bunu", "şunu",
    "kim", "kimse", "hiçkimse", "herkes", "biri", "birisi", "diğeri", "öteki", "beriki", "bazı", "bazısı", "tümü", "hepsi",
    
    // Miktar, Sıklık ve Zaman
    "bir", "iki", "hiç", "hiçbiri", "her", "bazen", "birkaç", "biraz", "çok", "daha", "en", "pek", "gayet", "oldukça",
    "fazla", "az", "eksik", "tam", "yarım", "bütün", "tüm", "sadece", "yalnız", "tek",
    "her", "zaman", "şimdi", "sonra", "önce", "dün", "bugün", "yarın", "henüz", "hala", "artık", "yine", "yeniden", "tekrar", "hep", "daima", "asla",
    "defa", "kere", "tane", "kez",
    
    // Durum ve Doğrulama
    "gerçekten", "kesinlikle", "mutlaka", "belki", "muhtemelen", "galiba", "umarım", "inşallah", "maalesef", "neyse",
    "özellikle", "genellikle", "çoğunlukla", "adeta", "zaten", "aslında", "esasen", "esas",
    "ayrıca", "üstelik", "hatta", "örneğin", "mesela", "yani", "demek", "öyleyse", "tabii", "elbette", "şüphesiz",
    "evet", "hayır", "peki", "tamam",
    
    // Soru Kelimeleri
    "nasıl", "neden", "niçin", "niye", "ne", "kim", "hangi", "nereye", "nerede", "nereden", "mı", "mi", "mu", "mü",
    
    // Sıfatlar ve Zarf (Konu Olmaması Gerekenler)
    "iyi", "kötü", "güzel", "çirkin", "büyük", "küçük", "eski", "yeni", "doğru", "yanlış",
    "öyle", "böyle", "şöyle", "şekilde", "olarak", "olan", "olanlar", "olmayan",
    
    // Fiiller ve Yardımcı Fiiller
    "var", "yok", "vardı", "yoktu", "varmış", "yokmuş", "değil", "değildi",
    "ol", "oldu", "olacak", "olur", "olmaz", "olmalı", "olabilir", "olsun", "olduk", "oldukça", "olarak", "olması", "olmasını", "olduğunu",
    "yap", "yaptı", "yapmış", "yapacak", "yapar", "yapmaz", "yapmalı", "yapabilir", "yapılması", "yapılmalı", "yapıyor",
    "et", "etti", "etmiş", "edecek", "eder", "etmez", "etmeli", "edebilir", "ediyor", "edilmesi", "edilmeli",
    "gel", "git", "al", "ver", "gör", "bil", "bul", "çık", "gir",
    "bence", "sence", "katılıyorum", "düşünüyorum", "biliyorum", "istiyorum", "istiyoruz", "gerekiyor", "gerek", "lazım", "şart", "rica", "ediyorum",
    
    // Anket ve Geribildirim Klişeleri
    "teşekkür", "teşekkürler", "tebrik", "tebrikler", "memnun", "memnunum", "memnunuz", "memnuniyet", "şikayet", "şikayetçiyim",
    "herhangi", "baska", "başka", "dışında", "haricinde", "lütfen", "saygılar", "merhaba", "selam"
]);

/**
 * İstatistiksel NLP - N-Gram Frekans Algoritması (Yapay Zeka Olmadan)
 * Pass 1: Tüm yorumları okuyup en çok geçen anlamlı kelimeleri TF-IDF mantığı ile tespit eder.
 */
function extractDynamicTopics(textsArray, topN = 7) {
    if (!textsArray || textsArray.length === 0) return [];

    let termGlobalFreq = {}; // Toplam Geçme Sayısı (TF)
    let docFreq = {}; // Geçtiği Belge/Yorum Sayısı (DF)
    let totalDocs = 0;

    textsArray.forEach(text => {
        if (!text) return;
        
        let clean = text.toLocaleLowerCase('tr-TR')
            .replace(/([^\w\sğüşıöç])/gi, ' ')
            .replace(/\s+/g, " ")
            .trim();
        
        if (clean.length < 3) return;
        totalDocs++;

        let tokens = clean.split(" ");
        let validTokens = [];
        let uniqueTokensInDoc = new Set();

        // Stop-word filtreleme, Stemming ve Synonym Eşleştirme
        for (let t of tokens) {
            if (t.length < 3) continue;
            if (STOP_WORDS.has(t)) continue;
            
            let stemmed = stem(t);
            if (STOP_WORDS.has(stemmed) || stemmed.length < 3) continue;
            
            // Eş Anlamlı Kelime Haritalama
            let mapped = typeof SYNONYMS !== 'undefined' ? (SYNONYMS[stemmed] || SYNONYMS[t] || stemmed) : stemmed;
            validTokens.push(mapped);
        }

        // Unigram Frekansı (Tek Kelimeler)
        validTokens.forEach(t => {
            termGlobalFreq[t] = (termGlobalFreq[t] || 0) + 1;
            uniqueTokensInDoc.add(t);
        });

        // Bigram Frekansı (İkili Öbekler)
        for (let i = 0; i < validTokens.length - 1; i++) {
            let bigram = validTokens[i] + " " + validTokens[i+1];
            termGlobalFreq[bigram] = (termGlobalFreq[bigram] || 0) + 1.5; 
            uniqueTokensInDoc.add(bigram);
        }

        // Doküman frekansını güncelle (DF)
        uniqueTokensInDoc.forEach(token => {
            docFreq[token] = (docFreq[token] || 0) + 1;
        });
    });

    // TF-IDF Hesaplama (Global TF * IDF)
    let tfidfScores = {};
    Object.keys(termGlobalFreq).forEach(term => {
        let tf = termGlobalFreq[term];
        let df = docFreq[term] || 1;
        // Jenerik kelimeleri ezmek için IDF formülü: Log((N + 1) / (df + 0.5))
        let idf = Math.log((totalDocs + 1) / (df + 0.5));
        tfidfScores[term] = tf * idf;
    });

    // Skorlara göre sırala
    let sortedKeys = Object.keys(tfidfScores).sort((a, b) => tfidfScores[b] - tfidfScores[a]);
    
    // Anlamlı skorlara sahip konuları filtrele
    let finalTopics = [];
    for (let key of sortedKeys) {
        if (termGlobalFreq[key] >= 2 && tfidfScores[key] > 0.5) {
            // Sadece ilk harfi büyük yap
            finalTopics.push(key.charAt(0).toUpperCase() + key.slice(1));
        }
        if (finalTopics.length >= topN) break;
    }

    if (finalTopics.length === 0) {
        finalTopics = ["Çalışma", "İletişim", "Yönetim"];
    }

    return finalTopics;
}

/**
 * Eş Anlamlı ve Konu Gruplama Sözlüğü (Synonyms Dictionary)
 * Kökleri veya kelimeleri ana konseptlere bağlar.
 */
const SYNONYMS = {
    "maaş": "Ücret/Maaş",
    "ücret": "Ücret/Maaş",
    "zam": "Ücret/Maaş",
    "prim": "Ücret/Maaş",
    "ikramiye": "Ücret/Maaş",
    
    "müdür": "Yönetim",
    "yönetici": "Yönetim",
    "şef": "Yönetim",
    "amir": "Yönetim",
    "yönetim": "Yönetim",
    "lider": "Yönetim",
    "patron": "Yönetim",
    
    "ofis": "Fiziksel Ortam",
    "tuvalet": "Fiziksel Ortam",
    "yemekhane": "Fiziksel Ortam",
    "klima": "Fiziksel Ortam",
    "ortam": "Fiziksel Ortam",
    "temizlik": "Fiziksel Ortam",
    
    "eğitim": "Eğitim/Gelişim",
    "kurs": "Eğitim/Gelişim",
    "gelişim": "Eğitim/Gelişim",
    "kariyer": "Eğitim/Gelişim",
    "terfi": "Eğitim/Gelişim"
};

/**
 * Gelişmiş Türkçe Kök Bulucu (Safeguarded Stemmer)
 * Ekleri uzunluklarına göre sıralamak kesme hatalarını önler.
 * Aşırı kesmeyi önlemek için kökün en az 3 harfli kalmasını sağlar.
 */
function stem(word) {
    if (!word || word.length <= 4) return word; // 4 harf veya altını elleme
    
    const suffixes = [
        "larımızdan", "lerimizden", "larındaki", "lerindeki", "larımızın", "lerimizin",
        "larından", "lerinden", "larımıza", "lerimize", "larımız", "lerimiz",
        "larımdan", "lerimden", "larımla", "lerimle",
        "yacağından", "yeceğinden", "yacağına", "yeceğine",
        "yacaklar", "yecekler",
        "larından", "lerinden", "yorsunuz", "yorsunuz",
        "madan", "meden", "dıkça", "dikçe",
        "mıyor", "miyor", "muyor", "müyor",
        "ıyor", "iyor", "uyor", "üyor",
        "acak", "ecek", "dığı", "diği", "duğu", "düğü",
        "lara", "lere", "ları", "leri", "lar", "ler",
        "maz", "mez", "mış", "miş", "muş", "müş",
        "dan", "den", "tan", "ten", "nın", "nin", "nun", "nün",
        "sın", "sin", "sun", "sün", "mız", "miz", "muz", "müz",
        "ım", "im", "um", "üm", "ın", "in", "un", "ün",
        "da", "de", "ta", "te", "ya", "ye", "yı", "yi", "yu", "yü",
        "a", "e", "ı", "i", "u", "ü"
    ];

    let original = word;
    for (let s of suffixes) {
        if (word.endsWith(s)) {
            let chopped = word.slice(0, -s.length);
            // Kök 3 harften kısaysa veya sesli harf içermiyorsa kesmeyi iptal et
            if (chopped.length >= 3 && /[aeıioöuü]/i.test(chopped)) {
                return chopped;
            }
        }
    }
    return original;
}

/**
 * Negatif fiil kontrolü
 */
function hasNegativeSuffix(word) {
    const negSuffix = ["mıyor", "miyor", "muyor", "müyor", "maz", "mez", "madım", "medim", "mam", "mem"];
    return negSuffix.some(n => word.endsWith(n));
}

/**
 * Levenshtein Distance Algoritması
 * İki kelime arasındaki harf değişim mesafesini hesaplar
 */
function getLevenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // Değiştirme
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) // Ekleme / Silme
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

/**
 * Fuzzy Matching Helper
 * Kelimeyi sözlükte arar, tam bulamazsa yazım yanlışını tolere ederek en yakın eşleşmeyi döndürür
 */
function findClosestMatch(word, dictArray) {
    if (dictArray.includes(word)) return { match: word, isFuzzy: false };
    if (word.length <= 3) return null; // Kısa kelimelerde tahmin yapma

    const allowedDistance = word.length > 5 ? 2 : 1;
    let bestMatch = null;
    let lowestDistance = Infinity;

    for (let dictWord of dictArray) {
        if (Math.abs(word.length - dictWord.length) > allowedDistance) continue;

        const dist = getLevenshteinDistance(word, dictWord);
        if (dist <= allowedDistance && dist < lowestDistance) {
            lowestDistance = dist;
            bestMatch = dictWord;
        }
    }
    return bestMatch ? { match: bestMatch, isFuzzy: true } : null;
}

/**
 * Ana Duygu Analizi Fonksiyonu (Aspect-Based Sentiment & Clause Splitting)
 */
function analyzeSentiment(text, dynamicTopics = []) {
    if (!text) return { score: 0, type: "neutral", confidence: 0, matchedWords: [], topics: [], aspectScores: {} };

    // 1. Cümleyi bağlaçlardan ve noktalama işaretlerinden parçalara ayır (Clause Splitting)
    const clauseSplitterRegex = /\s+(?:ama|fakat|lakin|ancak|rağmen|oysa|bununla birlikte|[,;!])\s+/i;
    const clauses = text.split(clauseSplitterRegex);

    let totalScore = 0;
    let totalMatched = [];
    let allFoundTopics = new Set();
    let aspectScores = {};
    let conditional = false;

    clauses.forEach(clause => {
        let clean = clause.toLocaleLowerCase('tr-TR')
            .replace(/([^\w\sğüşıöç])/gi, ' $1 ') // Emojileri ayır
            .replace(/[.,!?;:()"']/g, " ") // Noktalama işaretlerini temizle
            .replace(/\s+/g, " ")
            .trim();

        if (!clean) return;

        let clauseScore = 0;
        let clauseMatched = [];
        let clauseTopics = new Set();

        // Konu Tespiti
        if (dynamicTopics && dynamicTopics.length > 0) {
            for (let topic of dynamicTopics) {
                let lowerTopic = topic.toLocaleLowerCase('tr-TR');
                if (lowerTopic.includes(" ")) {
                    if (clean.includes(lowerTopic)) clauseTopics.add(topic);
                } else {
                    let tokens = clean.split(" ");
                    for (let t of tokens) {
                        let stemmed = stem(t);
                        let mapped = typeof SYNONYMS !== 'undefined' ? (SYNONYMS[stemmed] || SYNONYMS[t] || stemmed) : stemmed;
                        if (mapped === lowerTopic || t === lowerTopic || stemmed === lowerTopic) {
                            clauseTopics.add(topic);
                            break;
                        }
                    }
                }
            }
        }

        // 1. Kalıp (Phrase) Tespiti
        for (let p in SENTIMENT.phrases) {
            if (clean.includes(p)) {
                clauseScore += SENTIMENT.phrases[p];
                clauseMatched.push(`[Kalıp: ${p}]`);
                clean = clean.replace(p, ""); 
            }
        }

        const tokens = clean.split(/\s+/).filter(t => t.length > 0);

        // 2. Kelime Bazlı Analiz
        for (let i = 0; i < tokens.length; i++) {
            let word = tokens[i];
            let base = stem(word);
            let multiplier = 1;
            let isNegated = false;

            if (SENTIMENT.emojis[word]) {
                clauseScore += SENTIMENT.emojis[word];
                clauseMatched.push(`[Emoji: ${word}]`);
                continue;
            }

            if (SENTIMENT.conditionals.includes(base) || SENTIMENT.conditionals.includes(word)) {
                conditional = true;
            }

            if (i > 0 && SENTIMENT.intensifiers[tokens[i - 1]]) {
                multiplier = SENTIMENT.intensifiers[tokens[i - 1]];
            }

            if (i < tokens.length - 1 && SENTIMENT.negators.includes(tokens[i + 1])) {
                isNegated = true;
            }

            if (hasNegativeSuffix(word)) {
                isNegated = true;
            }

            let posResult = findClosestMatch(base, SENTIMENT.positive);
            let negResult = findClosestMatch(base, SENTIMENT.negative);
            let neuResult = findClosestMatch(base, SENTIMENT.neutral);

            if (posResult) {
                let logTag = posResult.isFuzzy ? `+${posResult.match} (düzeltildi: ${word})` : `+${word}`;
                if (isNegated) {
                    clauseScore -= 1 * multiplier;
                    clauseMatched.push(`-${logTag} (negated)`);
                } else {
                    clauseScore += 1 * multiplier;
                    clauseMatched.push(logTag);
                }
            }
            else if (negResult) {
                let logTag = negResult.isFuzzy ? `-${negResult.match} (düzeltildi: ${word})` : `-${word}`;
                if (isNegated) {
                    clauseScore += 0.5;
                    clauseMatched.push(`~${logTag} (negated)`);
                } else {
                    clauseScore -= 1 * multiplier;
                    clauseMatched.push(logTag);
                }
            }
            else if (neuResult) {
                let logTag = neuResult.isFuzzy ? `=${neuResult.match} (düzeltildi: ${word})` : `=${word}`;
                clauseMatched.push(logTag);
            }
        }

        totalScore += clauseScore;
        totalMatched.push(...clauseMatched);
        
        // Bu clause (parça) içindeki konulara, parçanın duygu skorunu ekle
        clauseTopics.forEach(t => {
            allFoundTopics.add(t);
            if (!aspectScores[t]) aspectScores[t] = 0;
            aspectScores[t] += clauseScore;
        });
    });

    // 3. Koşullu cümle cezası
    if (conditional) {
        totalScore = totalScore * 0.6;
    }

    // 4. Sonuç Hesaplama
    let type = "neutral";
    if (totalScore > 1) type = "positive";
    else if (totalScore < -1) type = "negative";
    if (conditional && Math.abs(totalScore) > 0) type = "mixed";

    const confidence = parseFloat(Math.min(Math.abs(totalScore) / 4, 1).toFixed(2));

    return {
        score: parseFloat(totalScore.toFixed(2)),
        type,
        confidence,
        matchedWords: totalMatched,
        topics: Array.from(allFoundTopics),
        aspectScores // { "Maaş": -1, "Yönetim": 2 }
    };
}