import { useState } from 'react';

// message.content is now a full Cloudinary URL, so there is nothing to fetch:
// the browser loads it straight from the CDN.
const MediaMessage = ({ url, type }) => {
    const [failed, setFailed] = useState(false);

    if (failed) {
        return <div className="text-xs text-rose">Unable to load media.</div>;
    }

    if (type === 'IMAGE') {
        return (
            <img
                src={url}
                alt="Shared"
                loading="lazy"
                onError={() => setFailed(true)}
                className="max-w-[240px] rounded-md border border-border-subtle"
            />
        );
    }

    if (type === 'VIDEO') {
        return (
            <video
                src={url}
                controls
                preload="metadata"
                onError={() => setFailed(true)}
                className="max-w-[280px] rounded-md border border-border-subtle"
            />
        );
    }

    if (type === 'AUDIO') {
        return <audio src={url} controls preload="metadata" onError={() => setFailed(true)} className="max-w-[240px]" />;
    }

    return null;
};

export default MediaMessage;