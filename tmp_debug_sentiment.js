
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

function analyzeSentiment(text) {
    if (!text) return { score: 0, type: 'neutral', words: [] };

    const lower = text.toLowerCase().replace(/[.,!?;:()"]/g, ' ');
    const tokens = lower.split(/\s+/).filter(w => w.length > 2);

    let score = 0;
    let matchedWords = [];

    for (let i = 0; i < tokens.length; i++) {
        const word = tokens[i];
        let multiplier = 1;

        if (i > 0 && SENTIMENT_DICT.intensifiers.includes(tokens[i - 1])) {
            multiplier = 1.5;
        }

        if (SENTIMENT_DICT.positive.includes(word)) {
            let negated = false;
            if (i > 0 && SENTIMENT_DICT.negators.includes(tokens[i - 1])) negated = true;
            if (i > 1 && SENTIMENT_DICT.negators.includes(tokens[i - 2])) negated = true;

            if (negated) {
                score -= 2 * multiplier;
                matchedWords.push(`-${word} (negated)`);
            } else {
                score += 1 * multiplier;
                matchedWords.push(`+${word}`);
            }
        }
        else if (SENTIMENT_DICT.negative.includes(word)) {
            let negated = false;
            if (i > 0 && SENTIMENT_DICT.negators.includes(tokens[i - 1])) negated = true;

            if (negated) {
                score += 0.5;
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

    return { score, type, matchedWords };
}

console.log(JSON.stringify(analyzeSentiment("herşey 10 numara"), null, 2));
console.log(JSON.stringify(analyzeSentiment("herşey on numara"), null, 2));
