import React, { useState } from 'react';
import { Search, BookOpen, Palette, Map, Zap, HelpCircle, Lightbulb, ChevronDown, ChevronRight, Keyboard, Eye, Target, Hand, Flag, Hourglass, Hash, Footprints, ArrowDownCircle, Activity, Utensils, Skull, Sparkles, MessageCircle, Crosshair, RefreshCw, Clapperboard, DoorOpen, Trophy, ArrowDown, Clock, Timer, Ban, Dices } from 'lucide-react';

export const HelpSection: React.FC = () => {

     // DATA CONSTANTS

     const TRIGGERS = [
          { name: "KEY PRESS", desc: "Quand on appuie sur une touche du clavier.", example: "Espace → Sauter", icon: <Keyboard size={24} />, color: "bg-yellow-100 border-yellow-400 text-yellow-800" },
          { name: "TOUCH (Collision)", desc: "Quand cet objet en touche un autre.", example: "Hero touche Pièce → Gagner point", icon: <Eye size={24} />, color: "bg-yellow-100 border-yellow-400 text-yellow-800" },
          { name: "HIT", desc: "Quand cet objet est touché par un projectile (Shoot).", example: "Monstre touché par Balle → Mourir", icon: <Target size={24} />, color: "bg-orange-100 border-orange-400 text-orange-800" },
          { name: "CLICK", desc: "Quand on clique sur l'objet avec la souris.", example: "Clic sur Levier → Ouvrir Porte", icon: <Hand size={24} />, color: "bg-yellow-100 border-yellow-400 text-yellow-800" },
          { name: "START", desc: "Se déclenche une seule fois au début de la scène.", example: "Start → Jouer Musique", icon: <Flag size={24} />, color: "bg-green-100 border-green-400 text-green-800" },
          { name: "TIMER", desc: "Se déclenche toutes les X secondes.", example: "Toutes les 2s → Créer Ennemi", icon: <Hourglass size={24} />, color: "bg-blue-100 border-blue-400 text-blue-800" },
          { name: "VAR? (Condition)", desc: "Se déclenche quand une variable respecte une condition.", example: "Si Vie = 0 → Perdu", icon: <Hash size={24} />, color: "bg-blue-100 border-blue-400 text-blue-800" },
     ];

     const EFFECTS = [
          { name: "CHASE", desc: "L'objet se déplace vers une cible (Hero ou autre).", example: "Zombie → Chase Hero", icon: <Footprints size={24} />, color: "bg-green-100 border-green-400 text-green-800" },
          { name: "MOVE", desc: "L'objet suit un chemin dessiné.", example: "Nuage → Move (sur le ciel)", icon: <Map size={24} />, color: "bg-blue-100 border-blue-400 text-blue-800" },
          { name: "JUMP", desc: "Fait sauter l'objet (nécessite gravité).", example: "Touche Espace → Jump", icon: <ArrowDownCircle size={24} />, color: "bg-emerald-100 border-emerald-400 text-emerald-800" },
          { name: "SHAKE", desc: "Fait trembler l'écran pour un impact.", example: "Explosion → Shake", icon: <Activity size={24} />, color: "bg-red-100 border-red-400 text-red-800" },
          { name: "EAT (Destroy Object)", desc: "Détruit l'objet touché.", example: "Hero touche Pomme → Eat", icon: <Utensils size={24} />, color: "bg-red-100 border-red-400 text-red-800" },
          { name: "DIE (Destroy Self)", desc: "L'objet se détruit lui-même.", example: "Balle touche Mur → Die", icon: <Skull size={24} />, color: "bg-red-100 border-red-400 text-red-800" },
          { name: "SPAWN", desc: "Fait apparaître un nouvel objet.", example: "Coffre ouvert → Spawn Trésor", icon: <Sparkles size={24} />, color: "bg-purple-100 border-purple-400 text-purple-800" },
          { name: "SAY", desc: "Affiche une bulle de dialogue.", example: "Clic PNJ → Say 'Bonjour!'", icon: <MessageCircle size={24} />, color: "bg-yellow-100 border-yellow-400 text-yellow-800" },
          { name: "SHOOT", desc: "Tire un projectile dans une direction.", example: "Clic → Shoot Balle", icon: <Crosshair size={24} />, color: "bg-red-100 border-red-400 text-red-800" },
          { name: "CONFETTI", desc: "Explosion de particules visuelles.", example: "Gagner → Confetti", icon: <Sparkles size={24} />, color: "bg-purple-100 border-purple-400 text-purple-800" },
          { name: "SWAP", desc: "L'objet se transforme en un autre.", example: "Chenille → Swap Papillon", icon: <RefreshCw size={24} />, color: "bg-pink-100 border-pink-400 text-pink-800" },
          { name: "ANIM", desc: "Change l'animation de l'objet.", example: "Avancer → Anim 'Walk'", icon: <Clapperboard size={24} />, color: "bg-pink-100 border-pink-400 text-pink-800" },
          { name: "DOOR (Change Scene)", desc: "Transporte le joueur vers une autre scène.", example: "Touche Porte → Door (Niveau 2)", icon: <DoorOpen size={24} />, color: "bg-purple-100 border-purple-400 text-purple-800" },
          { name: "WIN", desc: "Affiche l'écran de victoire.", example: "Touche Drapeau → Win", icon: <Trophy size={24} />, color: "bg-yellow-100 border-yellow-400 text-yellow-800" },
          { name: "SET VAR", desc: "Modifie la valeur d'une variable.", example: "Touche Pièce → Score +1", icon: <Hash size={24} />, color: "bg-blue-100 border-blue-400 text-blue-800" },
          { name: "HOLD", desc: "L'objet est ramassé et suit le porteur.", example: "Touche Épée → Hold", icon: <Hand size={24} />, color: "bg-amber-100 border-amber-400 text-amber-800" },
          { name: "DROP", desc: "Lâche l'objet actuellement tenu.", example: "Clic → Drop", icon: <ArrowDown size={24} />, color: "bg-amber-100 border-amber-400 text-amber-800" },
          { name: "WAIT", desc: "Attend un certain temps avant la suite.", example: "Wait 1s → Boom", icon: <Clock size={24} />, color: "bg-gray-100 border-gray-400 text-gray-800" },
     ];

     const MODIFIERS = [
          { name: "THEN", desc: "Permet d'enchaîner plusieurs actions à la suite.", example: "Wait 1s → THEN → Shoot", icon: <Timer size={24} />, color: "bg-gray-100 border-gray-400 text-gray-800" },
          { name: "NOT", desc: "Inverse une condition (Déclencheur).", example: "NOT Touch Sol → Tomber", icon: <Ban size={24} />, color: "bg-red-100 border-red-400 text-red-800" },
          { name: "RANDOM (Chance)", desc: "Ajoute une probabilité qu'une règle se déclenche.", example: "50% Chance → Spawn Coin", icon: <Dices size={24} />, color: "bg-purple-100 border-purple-400 text-purple-800" },
     ];

     const TIPS = [
          {
               title: "🎮 Créer un Platformer",
               tips: [
                    "Utilisez MOVE avec direction DOWN pour la gravité",
                    "KEY PRESS (flèche) → MOVE pour les contrôles",
                    "COLLISION avec le sol → arrêter la gravité",
                    "Ajoutez des obstacles avec COLLISION → LOSE"
               ]
          },
          {
               title: "🧩 Créer un Puzzle",
               tips: [
                    "Utilisez des variables pour compter les objets",
                    "CLICK pour interaction avec les objets",
                    "Conditions: SI variable = X → WIN",
                    "TELEPORT pour réinitialiser des positions"
               ]
          },
          {
               title: "🎒 Système d'Inventaire",
               tips: [
                    "HOLD pour ramasser des items",
                    "Utilisez des variables pour compter (items ramassés)",
                    "DROP sur clic pour placer des objets",
                    "Positionnez les items held hors écran ou sur le joueur"
               ]
          },
          {
               title: "✨ Rendre le Jeu Beau",
               tips: [
                    "Ajoutez des PARTICLES pour les effets visuels",
                    "Utilisez des SOUNDS pour le feedback",
                    "Animations: plusieurs frames pour le mouvement",
                    "HUD personnalisés pour montrer la progression"
               ]
          }
     ];

     const FAQS = [
          { question: "Comment faire en sorte qu'un objet suive ma souris?", answer: "Créez une règle avec TIMER (répétitif) → TELEPORT TO CURSOR" },
          { question: "Comment compter les objets détruits?", answer: "Créez une variable 'Score'. Puis: DESTROY objet → Variable +1" },
          { question: "Mon objet traverse les murs!", answer: "Ajoutez une règle: COLLISION avec mur → MOVE dans la direction opposée (ou STOP)" },
          { question: "Comment créer plusieurs niveaux?", answer: "Créez plusieurs scènes. Utilisez CHANGE SCENE pour passer au niveau suivant" },
          { question: "Le HUD ne s'affiche pas!", answer: "Vérifiez: 1) Variable attachée 2) Display Mode = VISIBLE 3) Objet existe dans la scène" },
          { question: "Comment faire une barre de vie qui descend?", answer: "Variable 'Vie' (per-actor) + HUD en mode BAR. Règles: Collision ennemi → Vie -1. Si Vie = 0 → LOSE" },
     ];

     const [searchQuery, setSearchQuery] = useState('');
     const [expandedSection, setExpandedSection] = useState<string | null>('getting-started');

     const toggleSection = (id: string) => {
          setExpandedSection(expandedSection === id ? null : id);
     };

     const matches = (text: string) => text.toLowerCase().includes(searchQuery.toLowerCase());

     // Filtered Data
     const filteredTriggers = TRIGGERS.filter(t => matches(t.name) || matches(t.desc) || matches(t.example));
     const filteredEffects = EFFECTS.filter(e => matches(e.name) || matches(e.desc) || matches(e.example));
     const filteredModifiers = MODIFIERS.filter(m => matches(m.name) || matches(m.desc) || matches(m.example));

     const filteredTips = TIPS.filter(t => matches(t.title) || t.tips.some(tip => matches(tip)));
     const filteredFAQs = FAQS.filter(f => matches(f.question) || matches(f.answer));

     // Check for matches in static sections
     const gettingStartedMatches = matches("Démarrage Rapide") || matches("Interface Générale") || matches("DRAW") || matches("PLACE") || matches("RULES") || matches("Créer Votre Premier Jeu");
     const drawingMatches = matches("Outils de Dessin") || matches("Créer un Acteur") || matches("Crayon") || matches("Gomme") || matches("Seau") || matches("Clear") || matches("Animations");
     const scenesMatches = matches("Éditeur de Scènes") || matches("Placer des Objets") || matches("Arrière-Plan") || matches("HUD") || matches("ATTACH VARIABLE");

     // Auto-expand logic
     const isSearching = searchQuery.length > 0;

     const showGettingStarted = !isSearching || gettingStartedMatches;
     const showDrawing = !isSearching || drawingMatches;
     const showScenes = !isSearching || scenesMatches;
     const showRules = !isSearching || filteredTriggers.length > 0 || filteredEffects.length > 0 || filteredModifiers.length > 0;
     const showTips = !isSearching || filteredTips.length > 0;
     const showFAQ = !isSearching || filteredFAQs.length > 0;

     // Force expand if searching and matches found
     const expandGettingStarted = expandedSection === 'getting-started' || (isSearching && gettingStartedMatches);
     const expandDrawing = expandedSection === 'drawing' || (isSearching && drawingMatches);
     const expandScenes = expandedSection === 'scenes' || (isSearching && scenesMatches);
     const expandRules = expandedSection === 'rules' || (isSearching && showRules);
     const expandTips = expandedSection === 'tips' || (isSearching && showTips);
     const expandFAQ = expandedSection === 'faq' || (isSearching && showFAQ);

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
                         {(showGettingStarted) && (
                              <Section
                                   id="getting-started"
                                   title="🚀 Démarrage Rapide"
                                   icon={<BookOpen />}
                                   expanded={expandGettingStarted}
                                   onToggle={() => toggleSection('getting-started')}
                                   forceExpand={isSearching && gettingStartedMatches}
                              >
                                   <div className="space-y-6">
                                        <DetailBlock title="Interface Générale" searchQuery={searchQuery}>
                                             <p className="mb-4">L'application est divisée en <strong>3 sections principales</strong>:</p>
                                             <ul className="space-y-2 ml-6">
                                                  <li><strong>🎨 DRAW</strong> - Créez et dessinez vos personnages et objets</li>
                                                  <li><strong>📍 PLACE</strong> - Placez les objets dans vos scènes</li>
                                                  <li><strong>⚡ RULES</strong> - Définissez les règles et comportements du jeu</li>
                                             </ul>
                                        </DetailBlock>

                                        <DetailBlock title="Créer Votre Premier Jeu" searchQuery={searchQuery}>
                                             <ol className="space-y-3 ml-6 list-decimal">
                                                  <li><strong>Dessinez un personnage</strong> dans l'onglet DRAW</li>
                                                  <li><strong>Placez-le</strong> dans une scène (PLACE)</li>
                                                  <li><strong>Ajoutez une règle</strong> : "Quand on clique le personnage → Détruire"</li>
                                                  <li><strong>Testez!</strong> Cliquez sur ▶️ PLAY</li>
                                             </ol>
                                        </DetailBlock>
                                   </div>
                              </Section>
                         )}

                         {/* DRAWING TOOLS */}
                         {(showDrawing) && (
                              <Section
                                   id="drawing"
                                   title="🎨 Outils de Dessin"
                                   icon={<Palette />}
                                   expanded={expandDrawing}
                                   onToggle={() => toggleSection('drawing')}
                                   forceExpand={isSearching && drawingMatches}
                              >
                                   <div className="space-y-6">
                                        <DetailBlock title="Créer un Acteur" searchQuery={searchQuery}>
                                             <p className="mb-4">Les <strong>acteurs</strong> sont tous les objets de votre jeu (personnages, obstacles, items...).</p>
                                             <ul className="space-y-2 ml-6">
                                                  <li>📝 <strong>Nom</strong> : Donnez un nom unique</li>
                                                  <li>🎨 <strong>Dessin</strong> : Utilisez les outils de dessin intégrés</li>
                                                  <li>📁 <strong>Import</strong> : ou importez une image</li>
                                                  <li>🎬 <strong>Animation</strong> : Ajoutez plusieurs frames pour animer</li>
                                             </ul>
                                        </DetailBlock>

                                        <DetailBlock title="Outils de Dessin Disponibles" searchQuery={searchQuery}>
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

                                        <DetailBlock title="Animations" searchQuery={searchQuery}>
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
                         )}

                         {/* SCENE EDITOR */}
                         {(showScenes) && (
                              <Section
                                   id="scenes"
                                   title="📍 Éditeur de Scènes"
                                   icon={<Map />}
                                   expanded={expandScenes}
                                   onToggle={() => toggleSection('scenes')}
                                   forceExpand={isSearching && scenesMatches}
                              >
                                   <div className="space-y-6">
                                        <DetailBlock title="Placer des Objets" searchQuery={searchQuery}>
                                             <p className="mb-4">Glissez-déposez vos acteurs depuis la bibliothèque vers le canvas:</p>
                                             <ul className="space-y-2 ml-6">
                                                  <li>🖱️ <strong>Drag & Drop</strong> : Faites glisser un acteur</li>
                                                  <li>✋ <strong>Déplacer</strong> : Cliquez et déplacez un objet</li>
                                                  <li>📏 <strong>Redimensionner</strong> : Tirez les coins (quand sélectionné)</li>
                                                  <li>🗑️ <strong>Supprimer</strong> : Cliquez sur l'icône poubelle</li>
                                             </ul>
                                        </DetailBlock>

                                        <DetailBlock title="Arrière-Plan" searchQuery={searchQuery}>
                                             <p className="mb-4">Personnalisez le fond de votre scène:</p>
                                             <ul className="space-y-2 ml-6">
                                                  <li>🎨 <strong>Couleur unie</strong> : Choisissez une couleur</li>
                                                  <li>🖼️ <strong>Image</strong> : Importez un arrière-plan</li>
                                             </ul>
                                        </DetailBlock>

                                        <DetailBlock title="HUD (Affichage à l'écran) - NOUVEAU ✨" searchQuery={searchQuery}>
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
                         )}

                         {/* RULES SYSTEM */}
                         {(showRules) && (
                              <Section
                                   id="rules"
                                   title="⚡ Système de Règles"
                                   icon={<Zap />}
                                   expanded={expandRules}
                                   onToggle={() => toggleSection('rules')}
                                   forceExpand={isSearching && showRules}
                              >
                                   <div className="space-y-8">
                                        <div className="p-4 bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-black rounded-lg font-mono text-lg shadow-[4px_4px_0px_rgba(0,0,0,1)] sketch-box text-center">
                                             <strong>QUAND</strong> [DÉCLENCHEUR] → <strong>ALORS</strong> [EFFET]
                                        </div>

                                        {/* STARTERS */}
                                        {(filteredTriggers.length > 0) && (
                                             <div>
                                                  <h3 className="text-2xl font-black mb-4 text-yellow-600 border-b-4 border-yellow-200 inline-block rotate-[-1deg]">🏁 DÉCLENCHEURS (Starters)</h3>
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                       {filteredTriggers.map((item, i) => (
                                                            <HelpItem key={i} {...item} searchQuery={searchQuery} />
                                                       ))}
                                                  </div>
                                             </div>
                                        )}

                                        {/* EFFECTS */}
                                        {(filteredEffects.length > 0) && (
                                             <div>
                                                  <h3 className="text-2xl font-black mb-4 text-green-600 border-b-4 border-green-200 inline-block rotate-[1deg]">✨ EFFETS (Actions)</h3>
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                       {filteredEffects.map((item, i) => (
                                                            <HelpItem key={i} {...item} searchQuery={searchQuery} />
                                                       ))}
                                                  </div>
                                             </div>
                                        )}

                                        {/* MODIFIERS */}
                                        {(filteredModifiers.length > 0) && (
                                             <div>
                                                  <h3 className="text-2xl font-black mb-4 text-gray-600 border-b-4 border-gray-200 inline-block rotate-[-1deg]">🔧 MODIFICATEURS</h3>
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                       {filteredModifiers.map((item, i) => (
                                                            <HelpItem key={i} {...item} searchQuery={searchQuery} />
                                                       ))}
                                                  </div>
                                             </div>
                                        )}
                                   </div>
                              </Section>
                         )}

                         {/* TIPS & TRICKS */}
                         {(showTips) && (
                              <Section
                                   id="tips"
                                   title="💡 Astuces & Conseils"
                                   icon={<Lightbulb />}
                                   expanded={expandTips}
                                   onToggle={() => toggleSection('tips')}
                                   forceExpand={isSearching && showTips}
                              >
                                   <div className="space-y-4">
                                        {filteredTips.map((tip, i) => (
                                             <TipCard key={i} {...tip} searchQuery={searchQuery} />
                                        ))}
                                   </div>
                              </Section>
                         )}

                         {/* FAQ */}
                         {(showFAQ) && (
                              <Section
                                   id="faq"
                                   title="❓ Questions Fréquentes"
                                   icon={<HelpCircle />}
                                   expanded={expandFAQ}
                                   onToggle={() => toggleSection('faq')}
                                   forceExpand={isSearching && showFAQ}
                              >
                                   <div className="space-y-4">
                                        {filteredFAQs.map((faq, i) => (
                                             <FAQItem key={i} {...faq} searchQuery={searchQuery} />
                                        ))}
                                   </div>
                              </Section>
                         )}
                    </div>

                    {/* FOOTER */}
                    <div className="mt-12 p-6 bg-yellow-50 border-4 border-black rounded-xl text-center shadow-[4px_4px_0px_rgba(0,0,0,1)] sketch-box rotate-[-0.5deg]">
                         <h3 className="text-2xl font-bold mb-2 font-['Gochi_Hand']">Besoin d'aide supplémentaire?</h3>
                         <p className="text-gray-700 font-['Gochi_Hand']">
                              Expérimentez! La meilleure façon d'apprendre est d'essayer.
                              Créez, testez, et amusez-vous! 🎮✨
                         </p>
                    </div>
               </div >
          </div >
     );
};


// Helper Components

// Utility for highlighting text
const HighlightText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
     if (!highlight.trim()) return <>{text}</>;

     const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
     return (
          <span>
               {parts.map((part, i) =>
                    part.toLowerCase() === highlight.toLowerCase() ? (
                         <span key={i} className="bg-yellow-300 text-black px-0.5 rounded">{part}</span>
                    ) : (
                         part
                    )
               )}
          </span>
     );
};

const Section: React.FC<{
     id: string;
     title: string;
     icon: React.ReactNode;
     expanded: boolean;
     onToggle: () => void;
     children: React.ReactNode;
     forceExpand?: boolean;
}> = ({ title, icon, expanded, onToggle, children, forceExpand }) => (
     <div className={`border-4 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-white sketch-box transition-transform ${forceExpand ? 'ring-4 ring-yellow-400 ring-opacity-50' : 'hover:rotate-[-0.5deg]'}`}>
          <button
               onClick={onToggle}
               className={`w-full p-6 flex items-center justify-between transition-colors border-b-4 border-black ${expanded ? 'bg-[#86efac]' : 'bg-[#a7f3d0] hover:bg-[#86efac]'}`}
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

const HelpItem: React.FC<{ icon: React.ReactNode; color: string; name: string; desc: string; example: string; visible?: boolean; searchQuery?: string }> = ({ icon, color, name, desc, example, visible = true, searchQuery = '' }) => {
     if (!visible) return null;
     return (
          <div className={`p-4 border-2 rounded-lg ${color} shadow-sm flex flex-col gap-2 hover:scale-105 transition-transform`}>
               <div className="flex items-center gap-2">
                    {icon}
                    <span className="font-black text-lg font-['Gochi_Hand']">
                         <HighlightText text={name} highlight={searchQuery} />
                    </span>
               </div>
               <p className="text-sm font-bold font-['Gochi_Hand'] leading-tight">
                    <HighlightText text={desc} highlight={searchQuery} />
               </p>
               <div className="bg-white/50 p-2 rounded text-xs italic font-['Gochi_Hand']">
                    💡 Ex: <HighlightText text={example} highlight={searchQuery} />
               </div>
          </div>
     );
};

const DetailBlock: React.FC<{ title: string; children: React.ReactNode; searchQuery?: string }> = ({ title, children, searchQuery = '' }) => (
     <div className="border-l-4 border-blue-500 pl-4 mb-6">
          <h3 className="text-xl font-bold mb-3 text-blue-700 font-['Gochi_Hand']">
               <HighlightText text={title} highlight={searchQuery} />
          </h3>
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

const TipCard: React.FC<{ title: string; tips: string[]; searchQuery?: string }> = ({ title, tips, searchQuery = '' }) => (
     <div className="p-4 border-3 border-purple-400 bg-purple-50 rounded-lg shadow-[3px_3px_0px_rgba(0,0,0,0.3)] sketch-box hover:rotate-[0.5deg] transition-transform">
          <h4 className="font-bold mb-2 text-purple-900 font-['Gochi_Hand']">
               <HighlightText text={title} highlight={searchQuery} />
          </h4>
          <ul className="space-y-1 ml-6 list-disc">
               {tips.map((tip, i) => (
                    <li key={i} className="text-sm text-purple-700 font-['Gochi_Hand']">
                         <HighlightText text={tip} highlight={searchQuery} />
                    </li>
               ))}
          </ul>
     </div>
);

const FAQItem: React.FC<{ question: string; answer: string; searchQuery?: string }> = ({ question, answer, searchQuery = '' }) => (
     <div className="p-4 border-3 border-gray-400 rounded-lg bg-gray-50 shadow-[3px_3px_0px_rgba(0,0,0,0.3)] sketch-box hover:shadow-[4px_4px_0px_rgba(0,0,0,0.3)] transition-all">
          <div className="font-bold text-gray-900 mb-2 font-['Gochi_Hand']">
               Q: <HighlightText text={question} highlight={searchQuery} />
          </div>
          <div className="text-gray-700 ml-4 font-['Gochi_Hand']">
               → <HighlightText text={answer} highlight={searchQuery} />
          </div>
     </div>
);



