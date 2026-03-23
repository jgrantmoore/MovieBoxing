'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user already accepted
    const consent = localStorage.getItem('cookie-consent');
    //if (!consent) {
      // Small delay so it doesn't pop in instantly on page load
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    //}
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'true');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          // Initial State: Off-screen and transparent
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          // Animate In: Slide up and settle
          animate={{ y: 0, opacity: 1, scale: 1 }}
          // Exit Animation: Fast slide down with a slight "knockout" fade
          exit={{ y: 100, opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:w-96 bg-slate-900 border border-neutral-800 p-6 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] text-white font-sans"
        >
          <div className="flex items-start gap-4 text-white selection:bg-red-400 selection:text-black font-sans">
            <div className="w-10 h-10 bg-red-600/20 rounded-full flex-shrink-0 flex items-center justify-center text-red-600 font-black italic">
              !
            </div>
            <div>
              <h4 className="text-md font-black uppercase italic mb-1 tracking-tight text-white">
                Cookie Consent
              </h4>
              <p className="text-sm text-neutral-400 leading-relaxed mb-4">
                We use cookies to keep your stats synced and the arena running. 
                Check our <a href="/privacy" className="text-white underline hover:text-red-600 transition-colors">Privacy Policy</a> for details.
              </p>
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAccept}
                className="w-full bg-white text-black text-xs font-black py-3 rounded-xl hover:bg-red-600 hover:text-white transition-colors uppercase tracking-widest"
              >
                Accept & Enter
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieBanner;