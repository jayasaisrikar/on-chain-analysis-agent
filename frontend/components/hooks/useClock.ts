import { useEffect, useState } from 'react';

// Provides a client-only ticking clock string (HH:MM:SS locale)
export function useClock() {
  const [nowTime, setNowTime] = useState('');
  useEffect(() => {
    const update = () => setNowTime(new Date().toLocaleTimeString());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return nowTime;
}
