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
