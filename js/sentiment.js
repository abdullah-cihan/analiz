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

/**
 * Türkçe basit stemmer
 * Ekleri uzunluklarına göre sıralamak kesme hatalarını önler.
 */
function stem(word) {
    const suffixes = [
        "mıyor", "miyor", "muyor", "müyor",
        "ıyor", "iyor", "uyor", "üyor", "yor",
        "lar", "ler", "maz", "mez",
        "sin", "sın", "sun", "sün",
        "im", "ım", "um", "üm",
        "de", "da", "te", "ta"
    ];

    for (let s of suffixes) {
        if (word.endsWith(s)) {
            return word.slice(0, -s.length);
        }
    }
    return word;
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
 * Ana Duygu Analizi Fonksiyonu
 */
function analyzeSentiment(text) {
    if (!text) return { score: 0, type: "neutral", confidence: 0, matchedWords: [] };

    let clean = text.toLowerCase()
        .replace(/([^\w\s\ğ\ü\ş\i\ö\ç])/gi, ' $1 ') // Emojileri ayır
        .replace(/[.,!?;:()"']/g, " ") // Noktalama işaretlerini temizle
        .replace(/\s+/g, " ")
        .trim();

    let score = 0;
    let matched = [];
    let conditional = false;

    // 1. Kalıp (Phrase) Tespiti
    for (let p in SENTIMENT.phrases) {
        if (clean.includes(p)) {
            score += SENTIMENT.phrases[p];
            matched.push(`[Kalıp: ${p}]`);
            clean = clean.replace(p, ""); // Bulunan kalıbı cümleden çıkar (Çifte puanlamayı önler)
        }
    }

    const tokens = clean.split(/\s+/).filter(t => t.length > 0);

    // 2. Kelime Bazlı Analiz
    for (let i = 0; i < tokens.length; i++) {
        let word = tokens[i];
        let base = stem(word);
        let multiplier = 1;
        let isNegated = false;

        // Emoji kontrolü
        if (SENTIMENT.emojis[word]) {
            score += SENTIMENT.emojis[word];
            matched.push(`[Emoji: ${word}]`);
            continue;
        }

        // Koşul kelimesi mi?
        if (SENTIMENT.conditionals.includes(base) || SENTIMENT.conditionals.includes(word)) {
            conditional = true;
        }

        // Pekiştirici var mı? (Önceki kelimeye bak)
        if (i > 0 && SENTIMENT.intensifiers[tokens[i - 1]]) {
            multiplier = SENTIMENT.intensifiers[tokens[i - 1]];
        }

        // Olumsuzluk kelimesi var mı? (Sonraki kelimeye bak, örn: "iyi değil")
        if (i < tokens.length - 1 && SENTIMENT.negators.includes(tokens[i + 1])) {
            isNegated = true;
        }

        // Kelime fiil kökenli olumsuz bir ek mi almış?
        if (hasNegativeSuffix(word)) {
            isNegated = true;
        }

        // --- FUZZY MATCHING (Yazım Toleransı) KONTROLLERİ ---
        let posResult = findClosestMatch(base, SENTIMENT.positive);
        let negResult = findClosestMatch(base, SENTIMENT.negative);
        let neuResult = findClosestMatch(base, SENTIMENT.neutral);

        if (posResult) {
            let logTag = posResult.isFuzzy ? `+${posResult.match} (düzeltildi: ${word})` : `+${word}`;
            if (isNegated) {
                score -= 1 * multiplier;
                matched.push(`-${logTag} (negated)`);
            } else {
                score += 1 * multiplier;
                matched.push(logTag);
            }
        } 
        else if (negResult) {
            let logTag = negResult.isFuzzy ? `-${negResult.match} (düzeltildi: ${word})` : `-${word}`;
            if (isNegated) {
                score += 0.5; // Kötü değil -> hafif pozitif
                matched.push(`~${logTag} (negated)`);
            } else {
                score -= 1 * multiplier;
                matched.push(logTag);
            }
        } 
        else if (neuResult) {
            let logTag = neuResult.isFuzzy ? `=${neuResult.match} (düzeltildi: ${word})` : `=${word}`;
            matched.push(logTag);
        }
    }

    // 3. Koşullu cümle cezası
    if (conditional) {
        score = score * 0.6;
    }

    // 4. Sonuç Hesaplama
    let type = "neutral";
    if (score > 1) type = "positive";
    else if (score < -1) type = "negative";
    if (conditional && Math.abs(score) > 0) type = "mixed"; 

    const confidence = parseFloat(Math.min(Math.abs(score) / 4, 1).toFixed(2));

    return {
        score: parseFloat(score.toFixed(2)),
        type,
        confidence,
        matchedWords: matched
    };
}
