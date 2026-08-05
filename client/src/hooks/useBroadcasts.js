import { useEffect, useState } from 'react';

const POLL_INTERVAL_MS = 8000;

function useBroadcasts(type) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function fetchBroadcasts() {
      try {
        const response = await fetch(`http://localhost:4000/api/broadcasts?type=${type}`);
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const json = await response.json();
        if (cancelled) return;
        setData(json);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBroadcasts();
    const intervalId = setInterval(fetchBroadcasts, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [type]);

  return { data, loading, error };
}

export default useBroadcasts;
