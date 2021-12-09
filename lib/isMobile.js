import {useState, useEffect} from 'react';

export default function isMobileHook(){
  if (typeof window !== "undefined"){
    const [width, setWidth] = useState(null);

    function handleWindowSizeChange() {
        setWidth(window.innerWidth);
    }
    useEffect(() => {
        setWidth(window.innerWidth);
        window.addEventListener('resize', handleWindowSizeChange);
        return () => {
            window.removeEventListener('resize', handleWindowSizeChange);
        }
    }, []);
    
    const isMobile = width <= 768;
    return isMobile;
  }
}


