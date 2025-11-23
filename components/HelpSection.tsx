import React, { useState } from 'react';
import { Search, BookOpen, Palette, Map, Zap, HelpCircle, Lightbulb, ChevronDown, ChevronRight } from 'lucide-react';

export const HelpSection: React.FC = () => {
     const [searchQuery, setSearchQuery] = useState('');
     const [expandedSection, setExpandedSection] = useState<string | null>('getting-started');

     const toggleSection = (id: string) => {
          setExpandedSection(expandedSection === id ? null : id);
     };

     return (
          <div className="w-full h-full bg-[#f3f4f6] overflow-y-auto">
               <div className="max-w-5xl mx-auto p-8">
                    {/* HEADER */}
                    <div className="text-center mb-12">
                         <h1 className="text-7xl font-black mb-4 font-['Gochi_Hand'] underline decoration-wavy decoration-yellow-400 rotate-[-1deg]">
                              📚 AIDE
                         </h1>
                         <p className="text-xl text-gray-700 font-bold font-['Gochi_Hand'] rotate-[0.5deg]">
                              Documentation complète pour créer des jeux incroyables!
                         </p>
                    </div>

                    {/* SEARCH BAR */}
                    <div className="mb-8 relative">
                         <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
                         <input
                              type="text"
                              placeholder="Rechercher dans la documentation..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-14 pr-4 py-4 border-4 border-black rounded-xl text-lg font-bold shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all font-['Gochi_Hand'] bg-white"
                         />
                    </div>

                    {/* CONTENT SECTIONS */}
                    <div className="space-y-6">

                         {/* GETTING STARTED */}
                         <Section
                              id="getting-started"
                              title="🚀 Démarrage Rapide"
                              icon={<BookOpen />}
                              expanded={expandedSection === 'getting-started'}
                              onToggle={() => toggleSection('getting-started')}
                         >
                              <div className="space-y-6">
                                   <DetailBlock title="Interface Générale">
                                        <p className="mb-4">L'application est divisée en <strong>3 sections principales</strong>:</p>
                                        <ul className="space-y-2 ml-6">
                                             <li><strong>🎨 DRAW</strong> - Créez et dessinez vos personnages et objets</li>
                                             <li><strong>📍 PLACE</strong> - Placez les objets dans vos scènes</li>
                                             <li><strong>⚡ RULES</strong> - Définissez les règles et comportements du jeu</li>
                                        </ul>
                                   </DetailBlock>

                                   <DetailBlock title="Créer Votre Premier Jeu">
                                        <ol className="space-y-3 ml-6 list-decimal">
                                             <li><strong>Dessinez un personnage</strong> dans l'onglet DRAW</li>
                                             <li><strong>Placez-le</strong> dans une scène (PLACE)</li>
                                             <li><strong>Ajoutez une règle</strong> : "Quand on clique le personnage → Détruire"</li>
                                             <li><strong>Testez!</strong> Cliquez sur ▶️ PLAY</li>
                                        </ol>
                                   </DetailBlock>
                              </div>
                         </Section>

                         {/* DRAWING TOOLS */}
                         <Section
                              id="drawing"
                              title="🎨 Outils de Dessin"
                              icon={<Palette />}
                              expanded={expandedSection === 'drawing'}
                              onToggle={() => toggleSection('drawing')}
                         >
                              <div className="space-y-6">
                                   <DetailBlock title="Créer un Acteur">
                                        <p className="mb-4">Les <strong>acteurs</strong> sont tous les objets de votre jeu (personnages, obstacles, items...).</p>
                                        <ul className="space-y-2 ml-6">
                                             <li>📝 <strong>Nom</strong> : Donnez un nom unique</li>
                                             <li>🎨 <strong>Dessin</strong> : Utilisez les outils de dessin intégrés</li>
                                             <li>📁 <strong>Import</strong> : ou importez une image</li>
                                             <li>🎬 <strong>Animation</strong> : Ajoutez plusieurs frames pour animer</li>
                                        </ul>
                                   </DetailBlock>

                                   <DetailBlock title="Outils de Dessin Disponibles">
                                        <div className="grid grid-cols-2 gap-4">
                                             <div className="p-4 border-2 border-gray-300 rounded-lg bg-white">
                                                  <strong>✏️ Crayon</strong>
                                                  <p className="text-sm text-gray-600">Dessinez librement</p>
                                             </div>
                                             <div className="p-4 border-2 border-gray-300 rounded-lg bg-white">
                                                  <strong>🗑️ Gomme</strong>
                                                  <p className="text-sm text-gray-600">Effacez des parties</p>
                                             </div>
                                             <div className="p-4 border-2 border-gray-300 rounded-lg bg-white">
                                                  <strong>🎨 Seau</strong>
                                                  <p className="text-sm text-gray-600">Remplissez une zone</p>
                                             </div>
                                             <div className="p-4 border-2 border-gray-300 rounded-lg bg-white">
                                                  <strong>🔄 Clear</strong>
                                                  <p className="text-sm text-gray-600">Effacez tout</p>
                                             </div>
                                        </div>
                                   </DetailBlock>

                                   <DetailBlock title="Animations">
                                        <p className="mb-4">Créez des animations en ajoutant plusieurs <strong>frames</strong>:</p>
                                        <ol className="space-y-2 ml-6 list-decimal">
                                             <li>Dessinez le premier état</li>
                                             <li>Cliquez sur "+ ADD FRAME"</li>
                                             <li>Dessinez le deuxième état</li>
                                             <li>L'animation jouera automatiquement en boucle!</li>
                                        </ol>
                                   </DetailBlock>
                              </div>
                         </Section>

                         {/* SCENE EDITOR */}
                         <Section
                              id="scenes"
                              title="📍 Éditeur de Scènes"
                              icon={<Map />}
                              expanded={expandedSection === 'scenes'}
                              onToggle={() => toggleSection('scenes')}
                         >
                              <div className="space-y-6">
                                   <DetailBlock title="Placer des Objets">
                                        <p className="mb-4">Glissez-déposez vos acteurs depuis la bibliothèque vers le canvas:</p>
                                        <ul className="space-y-2 ml-6">
                                             <li>🖱️ <strong>Drag & Drop</strong> : Faites glisser un acteur</li>
                                             <li>✋ <strong>Déplacer</strong> : Cliquez et déplacez un objet</li>
                                             <li>📏 <strong>Redimensionner</strong> : Tirez les coins (quand sélectionné)</li>
                                             <li>🗑️ <strong>Supprimer</strong> : Cliquez sur l'icône poubelle</li>
                                        </ul>
                                   </DetailBlock>

                                   <DetailBlock title="Arrière-Plan">
                                        <p className="mb-4">Personnalisez le fond de votre scène:</p>
                                        <ul className="space-y-2 ml-6">
                                             <li>🎨 <strong>Couleur unie</strong> : Choisissez une couleur</li>
                                             <li>🖼️ <strong>Image</strong> : Importez un arrière-plan</li>
                                        </ul>
                                   </DetailBlock>

                                   <DetailBlock title="HUD (Affichage à l'écran) - NOUVEAU ✨">
                                        <p className="mb-4 font-bold text-blue-600">Affichez des variables directement sur vos acteurs!</p>
                                        <ol className="space-y-3 ml-6 list-decimal">
                                             <li><strong>Sélectionnez un acteur</strong> dans la scène</li>
                                             <li>Cliquez <strong>"ATTACH VARIABLE"</strong></li>
                                             <li>Choisissez la variable à afficher</li>
                                             <li>Cliquez <strong>"CONFIGURE HUD"</strong></li>
                                             <li>Dans l'éditeur visuel:
                                                  <ul className="ml-6 mt-2 space-y-1">
                                                       <li>🖱️ <strong>Glissez</strong> la box verte pour positionner</li>
                                                       <li>📐 <strong>Tirez les coins</strong> pour redimensionner</li>
                                                       <li>✅ <strong>Toggles</strong> : Show Label, Show Background</li>
                                                       <li>🔢 <strong>Max Value</strong> : Valeur maximum pour les barres</li>
                                                  </ul>
                                             </li>
                                             <li>Modes d'affichage:
                                                  <ul className="ml-6 mt-2 space-y-1">
                                                       <li><strong>VISIBLE</strong> : Toujours visible (parfait pour barres de vie)</li>
                                                       <li><strong>POPUP</strong> : Visible sur clic du bouton "i"</li>
                                                  </ul>
                                             </li>
                                        </ol>
                                        <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                                             <strong>💡 Astuce:</strong> Dessinez un contour de barre sur votre sprite, puis positionnez une barre HUD dedans avec "Show Background: OFF"!
                                        </div>
                                   </DetailBlock>
                              </div>
                         </Section>

                         {/* RULES SYSTEM */}
                         <Section
                              id="rules"
                              title="⚡ Système de Règles"
                              icon={<Zap />}
                              expanded={expandedSection === 'rules'}
                              onToggle={() => toggleSection('rules')}
                         >
                              <div className="space-y-6">

                                   <DetailBlock title="Exemples Visuels de Règles">
                                        <div className="space-y-4">
                                             <VisualRule
                                                  trigger="CLICK"
                                                  subject="Hero"
                                                  effect="JUMP"
                                                  desc="Quand je clique sur le Hero, il saute"
                                             />
                                             <VisualRule
                                                  trigger="COLLISION"
                                                  subject="Hero"
                                                  object="Coin"
                                                  effect="DESTROY (Coin)"
                                                  desc="Quand le Hero touche une Pièce, la Pièce disparait"
                                             />
                                             <VisualRule
                                                  trigger="KEY PRESS (Space)"
                                                  subject="Hero"
                                                  effect="SHOOT"
                                                  desc="Quand j'appuie sur Espace, le Hero tire"
                                             />
                                             <VisualRule
                                                  trigger="VAR CHECK (Life=0)"
                                                  subject="Global"
                                                  effect="LOSE"
                                                  desc="Quand la Vie arrive à 0, Perdu!"
                                             />
                                        </div>
                                   </DetailBlock>

                                   <DetailBlock title="Comprendre les Règles">
                                        <p className="mb-4">Une règle a cette structure:</p>
                                        <div className="p-4 bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-black rounded-lg font-mono text-lg shadow-[4px_4px_0px_rgba(0,0,0,1)] sketch-box">
                                             <strong>QUAND</strong> [DÉCLENCHEUR] → <strong>ALORS</strong> [EFFET]
                                        </div>
                                   </DetailBlock>
                              </div>
                         </Section>

                         {/* TIPS & TRICKS */}
                         <Section
                              id="tips"
                              title="💡 Astuces & Conseils"
                              icon={<Lightbulb />}
                              expanded={expandedSection === 'tips'}
                              onToggle={() => toggleSection('tips')}
                         >
                              <div className="space-y-4">
                                   <TipCard
                                        title="🎮 Créer un Platformer"
                                        tips={[
                                             "Utilisez MOVE avec direction DOWN pour la gravité",
                                             "KEY PRESS (flèche) → MOVE pour les contrôles",
                                             "COLLISION avec le sol → arrêter la gravité",
                                             "Ajoutez des obstacles avec COLLISION → LOSE"
                                        ]}
                                   />

                                   <TipCard
                                        title="🧩 Créer un Puzzle"
                                        tips={[
                                             "Utilisez des variables pour compter les objets",
                                             "CLICK pour interaction avec les objets",
                                             "Conditions: SI variable = X → WIN",
                                             "TELEPORT pour réinitialiser des positions"
                                        ]}
                                   />

                                   <TipCard
                                        title="🎒 Système d'Inventaire"
                                        tips={[
                                             "HOLD pour ramasser des items",
                                             "Utilisez des variables pour compter (items ramassés)",
                                             "DROP sur clic pour placer des objets",
                                             "Positionnez les items held hors écran ou sur le joueur"
                                        ]}
                                   />

                                   <TipCard
                                        title="✨ Rendre le Jeu Beau"
                                        tips={[
                                             "Ajoutez des PARTICLES pour les effets visuels",
                                             "Utilisez des SOUNDS pour le feedback",
                                             "Animations: plusieurs frames pour le mouvement",
                                             "HUD personnalisés pour montrer la progression"
                                        ]}
                                   />
                              </div>
                         </Section>

                         {/* FAQ */}
                         <Section
                              id="faq"
                              title="❓ Questions Fréquentes"
                              icon={<HelpCircle />}
                              expanded={expandedSection === 'faq'}
                              onToggle={() => toggleSection('faq')}
                         >
                              <div className="space-y-4">
                                   <FAQItem
                                        question="Comment faire en sorte qu'un objet suive ma souris?"
                                        answer="Créez une règle avec TIMER (répétitif) → TELEPORT TO CURSOR"
                                   />
                                   <FAQItem
                                        question="Comment compter les objets détruits?"
                                        answer="Créez une variable 'Score'. Puis: DESTROY objet → Variable +1"
                                   />
                                   <FAQItem
                                        question="Mon objet traverse les murs!"
                                        answer="Ajoutez une règle: COLLISION avec mur → MOVE dans la direction opposée (ou STOP)"
                                   />
                                   <FAQItem
                                        question="Comment créer plusieurs niveaux?"
                                        answer="Créez plusieurs scènes. Utilisez CHANGE SCENE pour passer au niveau suivant"
                                   />
                                   <FAQItem
                                        question="Le HUD ne s'affiche pas!"
                                        answer="Vérifiez: 1) Variable attachée 2) Display Mode = VISIBLE 3) Objet existe dans la scène"
                                   />
                                   <FAQItem
                                        question="Comment faire une barre de vie qui descend?"
                                        answer="Variable 'Vie' (per-actor) + HUD en mode BAR. Règles: Collision ennemi → Vie -1. Si Vie = 0 → LOSE"
                                   />
                              </div>
                         </Section>
                    </div>

                    {/* FOOTER */}
                    <div className="mt-12 p-6 bg-yellow-50 border-4 border-black rounded-xl text-center shadow-[4px_4px_0px_rgba(0,0,0,1)] sketch-box rotate-[-0.5deg]">
                         <h3 className="text-2xl font-bold mb-2 font-['Gochi_Hand']">Besoin d'aide supplémentaire?</h3>
                         <p className="text-gray-700 font-['Gochi_Hand']">
                              Expérimentez! La meilleure façon d'apprendre est d'essayer.
                              Créez, testez, et amusez-vous! 🎮✨
                         </p>
                    </div>
               </div>
          </div>
     );
};

// Helper Components
const Section: React.FC<{
     id: string;
     title: string;
     icon: React.ReactNode;
     expanded: boolean;
     onToggle: () => void;
     children: React.ReactNode;
}> = ({ title, icon, expanded, onToggle, children }) => (
     <div className="border-4 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-white sketch-box hover:rotate-[-0.5deg] transition-transform">
          <button
               onClick={onToggle}
               className="w-full p-6 flex items-center justify-between bg-[#a7f3d0] hover:bg-[#86efac] transition-colors border-b-4 border-black"
          >
               <div className="flex items-center gap-4">
                    <div className="text-black">{icon}</div>
                    <h2 className="text-2xl font-black text-black font-['Gochi_Hand']">{title}</h2>
               </div>
               {expanded ? <ChevronDown className="text-black" size={32} /> : <ChevronRight className="text-black" size={32} />}
          </button>
          {expanded && (
               <div className="p-6 font-['Gochi_Hand']">
                    {children}
               </div>
          )}
     </div>
);

const DetailBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
     <div className="border-l-4 border-blue-500 pl-4 mb-6">
          <h3 className="text-xl font-bold mb-3 text-blue-700 font-['Gochi_Hand']">{title}</h3>
          <div className="text-gray-700 leading-relaxed font-['Gochi_Hand']">
               {children}
          </div>
     </div>
);

const VisualRule: React.FC<{ trigger: string; subject: string; object?: string; effect: string; desc: string }> = ({ trigger, subject, object, effect, desc }) => (
     <div className="flex flex-col gap-2 p-3 bg-gray-50 border-2 border-dashed border-gray-400 rounded-lg">
          <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
               <div className="px-3 py-1 bg-yellow-100 border-2 border-black rounded-full font-bold text-sm shadow-sm">WHEN</div>
               <div className="px-3 py-1 bg-white border-2 border-black rounded-lg font-bold text-sm flex items-center gap-1 shadow-sm">
                    <Zap size={14} className="text-yellow-600" /> {trigger}
               </div>
               <div className="text-gray-400">→</div>
               {object && (
                    <>
                         <div className="px-3 py-1 bg-blue-50 border-2 border-blue-200 rounded-lg font-bold text-sm text-blue-800 shadow-sm">{subject} + {object}</div>
                         <div className="text-gray-400">→</div>
                    </>
               )}
               <div className="px-3 py-1 bg-green-100 border-2 border-black rounded-full font-bold text-sm shadow-sm">THEN</div>
               <div className="px-3 py-1 bg-white border-2 border-black rounded-lg font-bold text-sm flex items-center gap-1 shadow-sm">
                    <Zap size={14} className="text-green-600" /> {effect}
               </div>
          </div>
          <div className="text-sm text-gray-500 italic text-center md:text-left">"{desc}"</div>
     </div>
);

const TriggerCard: React.FC<{ name: string; desc: string }> = ({ name, desc }) => (
     <div className="p-3 border-2 border-yellow-400 bg-yellow-50 rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.3)] hover:shadow-[3px_3px_0px_rgba(0,0,0,0.3)] transition-all sketch-box">
          <div className="font-bold text-yellow-900 font-['Gochi_Hand']">{name}</div>
          <div className="text-sm text-yellow-700 font-['Gochi_Hand']">{desc}</div>
     </div>
);

const EffectCard: React.FC<{ name: string; desc: string }> = ({ name, desc }) => (
     <div className="p-3 border-2 border-green-400 bg-green-50 rounded-lg flex justify-between items-center shadow-[2px_2px_0px_rgba(0,0,0,0.3)] hover:shadow-[3px_3px_0px_rgba(0,0,0,0.3)] transition-all sketch-box">
          <div className="font-bold text-green-900 font-['Gochi_Hand']">{name}</div>
          <div className="text-sm text-green-700 font-['Gochi_Hand']">{desc}</div>
     </div>
);

const TipCard: React.FC<{ title: string; tips: string[] }> = ({ title, tips }) => (
     <div className="p-4 border-3 border-purple-400 bg-purple-50 rounded-lg shadow-[3px_3px_0px_rgba(0,0,0,0.3)] sketch-box hover:rotate-[0.5deg] transition-transform">
          <h4 className="font-bold mb-2 text-purple-900 font-['Gochi_Hand']">{title}</h4>
          <ul className="space-y-1 ml-6 list-disc">
               {tips.map((tip, i) => (
                    <li key={i} className="text-sm text-purple-700 font-['Gochi_Hand']">{tip}</li>
               ))}
          </ul>
     </div>
);

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => (
     <div className="p-4 border-3 border-gray-400 rounded-lg bg-gray-50 shadow-[3px_3px_0px_rgba(0,0,0,0.3)] sketch-box hover:shadow-[4px_4px_0px_rgba(0,0,0,0.3)] transition-all">
          <div className="font-bold text-gray-900 mb-2 font-['Gochi_Hand']">Q: {question}</div>
          <div className="text-gray-700 ml-4 font-['Gochi_Hand']">→ {answer}</div>
     </div>
);
