import React from 'react';
import { X, User, Ghost, Box, Coins, Wand2 } from 'lucide-react';

interface CreationWizardProps {
     onClose: () => void;
     onCreate: (type: 'HERO' | 'ENEMY' | 'ITEM' | 'BLOCK') => void;
     onMagicCreate: (type: 'HERO' | 'ENEMY' | 'ITEM' | 'BLOCK', prompt: string) => void;
}

export const CreationWizard: React.FC<CreationWizardProps> = ({ onClose, onCreate, onMagicCreate }) => {
     const [prompt, setPrompt] = React.useState('');

     const OPTIONS = [
          { type: 'HERO', label: 'HERO', icon: <User size={48} />, color: 'bg-blue-100 border-blue-500 text-blue-800', desc: 'The main character' },
          { type: 'ENEMY', label: 'ENEMY', icon: <Ghost size={48} />, color: 'bg-red-100 border-red-500 text-red-800', desc: 'Something to avoid' },
          { type: 'ITEM', label: 'ITEM', icon: <Coins size={48} />, color: 'bg-yellow-100 border-yellow-500 text-yellow-800', desc: 'Something to collect' },
          { type: 'BLOCK', label: 'BLOCK', icon: <Box size={48} />, color: 'bg-gray-100 border-gray-500 text-gray-800', desc: 'A wall or obstacle' },
     ] as const;

     const handleCreate = (type: 'HERO' | 'ENEMY' | 'ITEM' | 'BLOCK') => {
          if (prompt.trim()) {
               onMagicCreate(type, prompt);
          } else {
               onCreate(type);
          }
     };

     return (
          <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
               <div className="bg-white p-8 border-4 border-black rounded-xl shadow-[8px_8px_0px_rgba(0,0,0,0.5)] flex flex-col gap-6 w-[600px] sketch-box relative">
                    <button onClick={onClose} className="absolute top-4 right-4 hover:scale-110 transition-transform">
                         <X size={32} />
                    </button>

                    <div className="text-center">
                         <h2 className="text-4xl font-black mb-2 flex items-center justify-center gap-3 font-['Gochi_Hand']">
                              <Wand2 size={40} className="text-purple-500" />
                              MAGIC CREATOR
                         </h2>
                         <p className="text-xl text-gray-600 font-['Gochi_Hand']">What do you want to create?</p>
                    </div>

                    <div className="relative">
                         <input
                              value={prompt}
                              onChange={(e) => setPrompt(e.target.value)}
                              placeholder="e.g. A flying robot that shoots lasers..."
                              className="w-full p-4 text-xl border-4 border-purple-300 rounded-xl outline-none focus:border-purple-500 font-['Gochi_Hand'] bg-purple-50 placeholder-purple-300"
                              autoFocus
                         />
                         {prompt && (
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-500 animate-pulse font-bold">
                                   ✨ AI ACTIVE
                              </div>
                         )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         {OPTIONS.map((opt) => (
                              <button
                                   key={opt.type}
                                   onClick={() => handleCreate(opt.type)}
                                   className={`p-6 border-4 rounded-xl flex flex-col items-center gap-3 hover:scale-105 transition-transform shadow-sm hover:shadow-md ${opt.color} ${prompt ? 'ring-4 ring-purple-400 ring-offset-2' : ''}`}
                              >
                                   {opt.icon}
                                   <div className="text-center">
                                        <div className="text-2xl font-black font-['Gochi_Hand']">{opt.label}</div>
                                        <div className="text-sm font-bold opacity-70 font-['Gochi_Hand']">{opt.desc}</div>
                                   </div>
                              </button>
                         ))}
                    </div>
               </div>
          </div>
     );
};
