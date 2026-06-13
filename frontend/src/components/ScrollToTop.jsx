import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// เลื่อนกลับด้านบนทุกครั้งที่เปลี่ยนหน้า
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}
