import React from 'react';
import { GameData } from '../types';
import { FolderPlus, Trash2, Play, Edit3 } from 'lucide-react';

interface ProjectManagerProps {
  savedProjects: GameData[];
  onLoadProject: (project: GameData) => void;
  onNewProject: () => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({ 
  savedProjects, 
  onLoadProject, 
  onNewProject, 
  onDeleteProject 
}) => {
  return (
    <div className="w-full h-full bg-[#f3f4f6] p-8 overflow-y-auto">
      
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-6xl font-bold font-['Gochi_Hand'] underline decoration-wavy decoration-pink-400 rotate-[-2deg]">
            MY PROJECTS
          </h1>
          <button 
            onClick={onNewProject}
            className="sketch-btn bg-[#a7f3d0] px-6 py-3 text-2xl font-bold flex items-center gap-3 hover:scale-105 active:scale-95"
          >
            <FolderPlus size={32} /> NEW STORY
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {savedProjects.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-400 border-4 border-dashed border-gray-300 rounded-xl">
              <p className="text-3xl">No stories yet...</p>
              <p className="text-xl mt-2">Click "NEW STORY" to begin!</p>
            </div>
          )}

          {savedProjects.map((project) => (
            <div 
              key={project.id} 
              className="sketch-box p-4 flex flex-col gap-4 hover:rotate-1 transition-transform duration-200 group bg-white shadow-lg"
            >
              {/* THUMBNAIL (Hero Image) */}
              <div 
                className="w-full h-40 bg-gray-100 border-2 border-black rounded-md flex items-center justify-center overflow-hidden relative cursor-pointer"
                onClick={() => onLoadProject(project)}
              >
                {project.actors[0] ? (
                  <img src={project.actors[0].imageData} alt="Hero" className="h-32 w-32 object-contain drop-shadow-md group-hover:scale-110 transition-transform" />
                ) : (
                  <span className="text-gray-300 font-bold">Empty</span>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <Play size={48} className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg transform scale-50 group-hover:scale-100 transition-all" />
                </div>
              </div>

              {/* INFO */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold truncate">{project.title}</h2>
                <p className="text-gray-500 text-sm">
                  {new Date(project.lastModified).toLocaleDateString()} • {project.scenes.length} Scene(s)
                </p>
              </div>

              {/* ACTIONS */}
              <div className="flex items-center justify-between border-t-2 border-gray-100 pt-2">
                <button 
                  onClick={() => onLoadProject(project)}
                  className="flex items-center gap-2 text-blue-600 font-bold hover:underline"
                >
                  <Edit3 size={18} /> EDIT
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
                  className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors border border-transparent hover:border-black"
                  title="Delete Project"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};