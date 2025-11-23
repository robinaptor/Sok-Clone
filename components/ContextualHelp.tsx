import React, { useState, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface ContextualHelpProps {
     active: boolean;
     onToggle: () => void;
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({ active, onToggle }) => {
     const [tooltip, setTooltip] = useState<{ x: number, y: number, text: string } | null>(null);

     useEffect(() => {
          if (!active) {
               setTooltip(null);
               return;
          }

          const handleClick = (e: MouseEvent) => {
               const target = e.target as HTMLElement;

               // Allow closing the help mode
               if (target.closest('#close-contextual-help')) {
                    return;
               }

               e.preventDefault();
               e.stopPropagation();

               // Find closest element with data-help attribute
               const helpElement = target.closest('[data-help]');

               if (helpElement) {
                    const text = helpElement.getAttribute('data-help');
                    if (text) {
                         setTooltip({
                              x: e.clientX,
                              y: e.clientY,
                              text
                         });
                    }
               } else {
                    // Clicked elsewhere, close tooltip or toggle off?
                    // Let's just close tooltip
                    setTooltip(null);
               }
          };

          // Add overlay listener
          document.addEventListener('click', handleClick, true); // Capture phase to intercept clicks

          return () => {
               document.removeEventListener('click', handleClick, true);
          };
     }, [active]);

     if (!active) {
          return null;
     }

     return (
          <>
               {/* Overlay Curtain */}
               <div className="fixed inset-0 z-[100] bg-blue-500/10 cursor-help pointer-events-none border-4 border-blue-500">
                    <div className="absolute top-4 right-4 pointer-events-auto">
                         <button
                              id="close-contextual-help"
                              onClick={onToggle}
                              className="bg-blue-500 text-white border-2 border-white rounded-full p-2 shadow-md hover:scale-110 transition-transform"
                         >
                              <X size={24} />
                         </button>
                    </div>

                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-6 py-2 rounded-full font-bold shadow-lg animate-bounce">
                         CLICK ANYTHING TO LEARN ABOUT IT!
                    </div>
               </div>

               {/* Tooltip */}
               {tooltip && (
                    <div
                         className="fixed z-[101] bg-white border-2 border-black p-4 rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,1)] max-w-xs animate-in zoom-in duration-200"
                         style={{
                              left: Math.min(window.innerWidth - 320, Math.max(20, tooltip.x - 150)),
                              top: tooltip.y + 20
                         }}
                    >
                         <div className="font-['Gochi_Hand'] text-lg font-bold leading-tight">
                              {tooltip.text}
                         </div>
                         <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t-2 border-l-2 border-black rotate-45"></div>
                    </div>
               )}
          </>
     );
};
