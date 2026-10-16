// --- UTILITIES & CONSTANTS ---

const PALETTE = [
    { bg: 'rgba(59, 130, 246, 0.7)', border: 'rgb(59, 130, 246)' }, // Blue
    { bg: 'rgba(16, 185, 129, 0.7)', border: 'rgb(16, 185, 129)' }, // Green
    { bg: 'rgba(245, 158, 11, 0.7)', border: 'rgb(245, 158, 11)' },  // Amber
    { bg: 'rgba(236, 72, 153, 0.7)', border: 'rgb(236, 72, 153)' }, // Pink
    { bg: 'rgba(99, 102, 241, 0.7)', border: 'rgb(99, 102, 241)' }, // Indigo
    { bg: 'rgba(239, 68, 68, 0.7)', border: 'rgb(239, 68, 68)' },   // Red
    { bg: 'rgba(139, 92, 246, 0.7)', border: 'rgb(139, 92, 246)' }, // Violet
    { bg: 'rgba(20, 184, 166, 0.7)', border: 'rgb(20, 184, 166)' }, // Teal
    { bg: 'rgba(249, 115, 22, 0.7)', border: 'rgb(249, 115, 22)' }, // Orange
    { bg: 'rgba(100, 116, 139, 0.7)', border: 'rgb(100, 116, 139)' } // Slate
];

// Dark-mode variant of PALETTE (same hue order, brighter tones for slate backgrounds)
const PALETTE_DARK = [
    { bg: 'rgba(96, 165, 250, 0.8)', border: 'rgb(96, 165, 250)' },   // Blue 400
    { bg: 'rgba(52, 211, 153, 0.8)', border: 'rgb(52, 211, 153)' },   // Green 400
    { bg: 'rgba(251, 191, 36, 0.8)', border: 'rgb(251, 191, 36)' },   // Amber 400
    { bg: 'rgba(244, 114, 182, 0.8)', border: 'rgb(244, 114, 182)' }, // Pink 400
    { bg: 'rgba(129, 140, 248, 0.8)', border: 'rgb(129, 140, 248)' }, // Indigo 400
    { bg: 'rgba(248, 113, 113, 0.8)', border: 'rgb(248, 113, 113)' }, // Red 400
    { bg: 'rgba(167, 139, 250, 0.8)', border: 'rgb(167, 139, 250)' }, // Violet 400
    { bg: 'rgba(45, 212, 191, 0.8)', border: 'rgb(45, 212, 191)' },   // Teal 400
    { bg: 'rgba(251, 146, 60, 0.8)', border: 'rgb(251, 146, 60)' },   // Orange 400
    { bg: 'rgba(148, 163, 184, 0.8)', border: 'rgb(148, 163, 184)' }  // Slate 400
];

function wrapText(str, maxLen) {
    if (!str) return str;
    if (str.length <= maxLen) return str;

    const words = str.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        if (currentLine.length + 1 + words[i].length <= maxLen) {
            currentLine += ' ' + words[i];
        } else {
            lines.push(currentLine);
            currentLine = words[i];
        }
    }
    lines.push(currentLine);
    return lines;
}
