import { useEffect, useState } from 'react';
import { fetchMediaBlob } from '../services/RoomService';

const MediaMessage = ({ filename, type }) => {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    fetchMediaBlob(filename)
      .then((blobUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        objectUrl = blobUrl;
        setUrl(blobUrl);
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [filename]);

  if (failed) {
    return <div className="text-xs text-red-400">Unable to load media.</div>;
  }

  if (!url) {
    return <div className="h-32 w-48 animate-pulse rounded-lg bg-slate-700" />;
  }

  if (type === 'IMAGE') {
    return <img src={url} alt="Shared" className="max-w-[240px] rounded-lg" />;
  }

  if (type === 'VIDEO') {
    return <video src={url} controls className="max-w-[280px] rounded-lg" />;
  }

  if (type === 'AUDIO') {
    return <audio src={url} controls className="max-w-[240px]" />;
  }

  return null;
};

export default MediaMessage;