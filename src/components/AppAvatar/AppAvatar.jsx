import React, { useMemo, useState } from 'react';

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

    return (
        <div className={className} style={style}>
            {src && !failed ? (
                <img
                    src={src}
                    alt={fullName || 'Avatar'}
                    className={imgClassName}
                    onError={() => setFailed(true)}
                />
            ) : (
                <span className={fallbackClassName} style={fallbackStyle}>{initials}</span>
            )}
        </div>
    );
};

export default AppAvatar;
