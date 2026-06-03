const AVATAR_ACCENT_COLORS = [
    '#e53935',
    '#d81b60',
    '#c2185b',
    '#8e24aa',
    '#5e35b1',
    '#3949ab',
    '#1e88e5',
    '#00897b',
    '#2e7d32',
    '#558b2f',
    '#ef6c00',
    '#f4511e',
    '#6d4c41',
    '#ad1457'
];

const isHexColor = (value) => (
    typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
);

const hashString = (value) => {
    const input = String(value || '').trim();
    let hash = 0;

    for (let index = 0; index < input.length; index += 1) {
        hash = ((hash << 5) - hash) + input.charCodeAt(index);
        hash |= 0;
    }

    return Math.abs(hash);
};

export const getAvatarAccentColor = (preferredColor, seed = '') => {
    if (isHexColor(preferredColor)) return preferredColor;
    return AVATAR_ACCENT_COLORS[hashString(seed) % AVATAR_ACCENT_COLORS.length];
};

export const getAvatarFallbackStyle = (preferredColor, seed = '') => ({
    backgroundColor: getAvatarAccentColor(preferredColor, seed),
    color: '#ffffff'
});
