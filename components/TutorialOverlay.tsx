import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';

interface TutorialOverlayProps {
     onComplete: () => void;
}

const STEPS = [
     {
          target: 'header', // General area
          title: "Welcome to Sok-Maker!",
          text: "This is your studio. Let's make a game in 3 steps!",
          position: 'center'
     },
     {
          target: '[data-tutorial="draw-tab"]',
          title: "1. DRAW",
          text: "Create your characters and items here. Draw a Hero, an Enemy, or a Wall!",
          position: 'bottom-left'
     },
     {
          target: '[data-tutorial="scene-tab"]',
          title: "2. PLACE",
          text: "Drag your characters into the scene to build your level.",
          position: 'bottom'
     },
     {
          target: '[data-tutorial="rules-tab"]',
          title: "3. RULES",
          text: "Give them life! Make them move, jump, or explode using simple rules.",
          position: 'bottom-right'
     },
     {
          target: '[data-tutorial="play-btn"]', // We need to add this data attr
          title: "PLAY!",
          text: "Test your game anytime by clicking the Play button.",
          position: 'bottom-right'
     }
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete }) => {
     const [stepIndex, setStepIndex] = useState(0);
     const step = STEPS[stepIndex];

     const handleNext = () => {
          if (stepIndex < STEPS.length - 1) {
               setStepIndex(stepIndex + 1);
          } else {
               onComplete();
          }
     };

     return (
          <div className="fixed inset-0 z-[200] pointer-events-none">
               {/* Darken background except for target (simulated for now, just dark overlay) */}
               <div className="absolute inset-0 bg-black/60 pointer-events-auto" />

               {/* Card */}
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white p-8 border-4 border-black rounded-xl shadow-[8px_8px_0px_rgba(0,0,0,1)] max-w-md flex flex-col gap-4 pointer-events-auto animate-in zoom-in duration-300">
                         <div className="flex justify-between items-center">
                              <h3 className="text-2xl font-black font-['Gochi_Hand'] text-purple-600">{step.title}</h3>
                              <button onClick={onComplete} className="text-gray-400 hover:text-black"><X size={24} /></button>
                         </div>

                         <p className="text-lg font-['Gochi_Hand']">{step.text}</p>

                         <div className="flex justify-between items-center mt-4">
                              <div className="flex gap-1">
                                   {STEPS.map((_, i) => (
                                        <div key={i} className={`w-3 h-3 rounded-full ${i === stepIndex ? 'bg-purple-500' : 'bg-gray-200'}`} />
                                   ))}
                              </div>
                              <button
                                   onClick={handleNext}
                                   className="bg-black text-white px-6 py-2 rounded-lg font-bold font-['Gochi_Hand'] flex items-center gap-2 hover:scale-105 transition-transform"
                              >
                                   {stepIndex === STEPS.length - 1 ? 'LET\'S GO!' : 'NEXT'}
                                   {stepIndex === STEPS.length - 1 ? <Check size={20} /> : <ArrowRight size={20} />}
                              </button>
                         </div>
                    </div>
               </div>
          </div>
     );
};
