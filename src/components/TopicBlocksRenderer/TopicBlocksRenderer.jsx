import React from 'react';
import { getTopicAssetUrlCandidates, getTopicBlocksForEditor } from '../../utils/topicContent';
import styles from './TopicBlocksRenderer.module.css';

const getImageWidthPercent = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 50;
    return Math.max(10, Math.min(100, Math.round(numeric)));
};

const TopicBlocksRenderer = ({ topic }) => {
    const blocks = getTopicBlocksForEditor(topic);

    const handleImageFallback = (event, url) => {
        const candidates = getTopicAssetUrlCandidates(url);
        const currentIndex = Number(event.currentTarget.dataset.fallbackIndex || 0);
        const nextIndex = currentIndex + 1;
        if (nextIndex >= candidates.length) return;
        event.currentTarget.dataset.fallbackIndex = String(nextIndex);
        event.currentTarget.src = candidates[nextIndex];
    };

    if (!blocks.length) return null;

    return (
        <div className={styles.blocks}>
            {blocks.map((block, index) => {
                if (block.type === 'h2') {
                    return <h2 key={`block-${index}`} className={styles.h2}>{block.text}</h2>;
                }

                if (block.type === 'h3') {
                    return <h3 key={`block-${index}`} className={styles.h3}>{block.text}</h3>;
                }

                if (block.type === 'image') {
                    if (!block.url) return null;
                    return (
                        <div key={`block-${index}`} className={styles.imageWrap}>
                            <div className={styles.imageSized} style={{ width: `${getImageWidthPercent(block.widthPercent)}%` }}>
                                <img
                                    src={getTopicAssetUrlCandidates(block.url)[0]}
                                    alt=""
                                    className={styles.image}
                                    data-fallback-index="0"
                                    onError={(event) => handleImageFallback(event, block.url)}
                                />
                            </div>
                        </div>
                    );
                }

                if (block.type === 'spacer') {
                    return <div key={`block-${index}`} className={styles.spacer} aria-hidden="true" />;
                }

                return (
                    <p key={`block-${index}`} className={styles.text}>
                        {block.text}
                    </p>
                );
            })}
        </div>
    );
};

export default TopicBlocksRenderer;
