import React, { useMemo, useState } from 'react';
import { getAvatarFallbackStyle } from '../../utils/avatarAccentColor';

const getInitials = (fullName = '') => {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
};

const AppAvatar = ({
    src = '',
    fullName = '',
    className = '',
    imgClassName = '',
    fallbackClassName = '',
    style,
    fallbackStyle
}) => {
    const [failed, setFailed] = useState(false);
    const initials = useMemo(() => getInitials(fullName), [fullName]);
    const isFallback = !src || failed;
    const avatarStyle = isFallback
        ? { ...getAvatarFallbackStyle(style?.backgroundColor, fullName || initials), ...style }
        : style;
    const initialsStyle = isFallback ? { color: '#ffffff', ...fallbackStyle } : fallbackStyle;

    return (
        <div className={className} style={avatarStyle}>
            {src && !failed ? (
                <img
                    src={src}
                    alt={fullName || 'Avatar'}
                    className={imgClassName}
                    onError={() => setFailed(true)}
                />
            ) : (
                <span className={fallbackClassName} style={initialsStyle}>{initials}</span>
            )}
        </div>
    );
};

export default AppAvatar;
