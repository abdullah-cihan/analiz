/**
 * Turkish Sentiment Analysis Helper
 * A simple dictionary-based approach for client-side sentiment analysis.
 * Expanded with more words and intensifier logic.
 */

const SENTIMENT_DICT = {
    positive: [
        "teşekkür", "iyi", "güzel", "harika", "memnun", "başarılı", "süper", "verimli",
        "faydalı", "beğendim", "etkili", "kaliteli", "mükemmel", "destekleyici", "açıklayıcı",
        "anlaşılır", "rahat", "kolay", "sevdim", "tebrik", "mutlu", "geliştirici", "yeterli",
        "profesyonel", "nazik", "ilgili", "hızlı", "düzenli", "sistemli", "keyifli",
        "artı", "avantaj", "muazzam", "şahane", "tavsiye", "önemli", "katkı", "pozitif",
        "güvenilir", "sağlam", "inanılmaz", "olağanüstü", "kusursuz", "net", "açık",
        "yardımcı", "kibar", "zengin", "ideal", "hoş", "tatmin", "başarı", "seviyeli",
        "efsane", "bayıldım", "on numara", "mis", "temiz", "ferah", "aydınlatıcı"
    ],
    negative: [
        "kötü", "berbat", "yetersiz", "sorun", "sıkıntı", "zor", "karışık", "anlaşılmaz",
        "yavaş", "ilgisiz", "gereksiz", "beğenmedim", "hata", "mağdur", "şeker", "eksik",
        "zayıf", "donuyor", "kasıyor", "kopuyor", "ses yok", "görüntü yok", "ulaşamadım",
        "açılmıyor", "giremiyorum", "memnun değilim", "saçma", "vakit kaybı", "düşük",
        "kalitesiz", "karmaşık", "sistemsiz", "kopuk", "verimsiz", "sıkıcı", "pahalı",
        "negatif", "düzensiz", "karmaşa", "kaos", "rezalet", "iğrenç", "yanlış", "hatalı",
        "çirkin", "kaba", "saygısız", "uzun", "yorucu", "bıktım", "usandım", "pişman",
        "soğuk", "bozuk", "çalışmıyor", "gitmiyor", "batar", "bitik", "amatör"
    ],
    negators: [
        "değil", "yok", "hayır", "maalesef", "hiç", "asla", "sakın", "olmaz", "olmamış"
    ],
    intensifiers: [
        "çok", "aşırı", "fazla", "baya", "bayağı", "oldukça", "ekstra", "en"
    ]
};

/**
 * Analyzes the sentiment of a given text.
 * @param {string} text - The input text to analyze.
 * @returns {object} { score: number, type: 'positive'|'negative'|'neutral', words: [] }
 */
function analyzeSentiment(text) {
    if (!text) return { score: 0, type: 'neutral', words: [] };

    const lower = text.toLowerCase().replace(/[.,!?;:()"]/g, ' ');
    const tokens = lower.split(/\s+/).filter(w => w.length > 2);

    let score = 0;
    let matchedWords = [];

    for (let i = 0; i < tokens.length; i++) {
        const word = tokens[i];
        let multiplier = 1;

        // Check for intensifier in previous word
        if (i > 0 && SENTIMENT_DICT.intensifiers.includes(tokens[i - 1])) {
            multiplier = 1.5;
        }

        // Simple switch for Pos/Neg checking
        if (SENTIMENT_DICT.positive.includes(word)) {
            // Check for negator in previous word (e.g. "iyi değil") or two words back ("hiç iyi değil")
            let negated = false;
            if (i > 0 && SENTIMENT_DICT.negators.includes(tokens[i - 1])) negated = true;
            if (i > 1 && SENTIMENT_DICT.negators.includes(tokens[i - 2])) negated = true; // "hiç de iyi değil"

            if (negated) {
                score -= 2 * multiplier; // Flip to negative
                matchedWords.push(`-${word} (negated)`);
            } else {
                score += 1 * multiplier;
                matchedWords.push(`+${word}`);
            }
        }
        else if (SENTIMENT_DICT.negative.includes(word)) {
            // Check for negator (e.g. "kötü değil" -> slightly positive?)
            let negated = false;
            if (i > 0 && SENTIMENT_DICT.negators.includes(tokens[i - 1])) negated = true;

            if (negated) {
                score += 0.5; // Slightly mitigate negative
                matchedWords.push(`~${word} (negated)`);
            } else {
                score -= 1 * multiplier;
                matchedWords.push(`-${word}`);
            }
        }
    }

    let type = 'neutral';
    if (score > 0) type = 'positive';
    if (score < 0) type = 'negative';

    return {
        score,
        type,
        matchedWords
    };
}
