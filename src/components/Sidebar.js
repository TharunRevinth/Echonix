import React from 'react';
import { Home, Search, ListMusic, CassetteTape, Radio, Headphones, Music2, Library, Clock, Heart, Plus } from 'lucide-react';

const Sidebar = ({ currentView, setCurrentView, isMobileOpen, setIsMobileOpen }) => {
  const navItems = [
    { icon: Home, label: 'Home', view: 'home' },
    { icon: Search, label: 'Search', view: 'search' },
  ];

  const libraryItems = [
    { icon: CassetteTape, label: 'Collection', view: 'liked' },
    { icon: Radio, label: 'Retro FM', view: 'radio' },
    { icon: Clock, label: 'YT History', view: 'ytmusic-history' },
    { icon: Headphones, label: 'Local History', view: 'history' },
  ];

  const mobileItems = [
    { icon: Home, label: 'Home', view: 'home' },
    { icon: Search, label: 'Search', view: 'search' },
    { icon: Library, label: 'Library', view: 'library' },
    { icon: CassetteTape, label: 'Liked', view: 'liked' },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-black/95 backdrop-blur-3xl border-t border-white/5 px-2 pb-safe shadow-[0_-10px_50px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-around h-16">
          {mobileItems.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.view;
            return (
              <button
                key={item.label}
                onClick={() => setCurrentView(item.view)}
                className={`
                  flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all
                  ${active ? 'text-white' : 'text-text-subdued hover:text-white'}
                `}
              >
                <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                <span className="text-[10px] font-bold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-60 bg-black p-2 
        transition-transform duration-300 lg:relative lg:translate-x-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        hidden lg:flex flex-col gap-2
      `}>
        {/* Main Nav Section */}
        <nav className="bg-bg-highlight rounded-lg p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.view;
            return (
              <button
                key={item.label}
                onClick={() => { setCurrentView(item.view); setIsMobileOpen(false); }}
                className={`
                  w-full flex items-center gap-4 px-3 py-3 rounded-md transition-all group
                  ${active ? 'text-white' : 'text-text-subdued hover:text-white'}
                `}
              >
                <Icon className={`w-6 h-6 transition-transform duration-300 ${active ? 'stroke-[2.5px]' : 'stroke-2 group-hover:scale-105'}`} />
                <span className={`font-bold text-sm tracking-tight`}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Library Section */}
        <nav className="bg-bg-highlight rounded-lg flex-1 flex flex-col p-2 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 mb-2">
            <button 
              onClick={() => setCurrentView('library')}
              className="flex items-center gap-3 text-text-subdued hover:text-white transition-colors group"
            >
              <Library className="w-6 h-6" />
              <span className="font-bold text-sm">Your Library</span>
            </button>
            <button title="Create playlist" className="p-1.5 text-text-subdued hover:text-white hover:bg-white/10 rounded-full transition-all">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-0.5">
            {libraryItems.map((item) => {
              const Icon = item.icon;
              const active = currentView === item.view;
              return (
                <button
                  key={item.label}
                  onClick={() => { setCurrentView(item.view); setIsMobileOpen(false); }}
                  className={`
                    w-full flex items-center gap-4 px-4 py-3 rounded-md transition-all group
                    ${active ? 'bg-bg-elevated-highlight text-white' : 'text-text-subdued hover:text-white hover:bg-white/[0.03]'}
                  `}
                >
                  <Icon className={`w-6 h-6 transition-transform duration-300 ${active ? 'stroke-[2px]' : 'stroke-2 group-hover:scale-105'}`} />
                  <span className={`font-semibold text-sm tracking-tight truncate`}>{item.label}</span>
                </button>
              );
            })}
            
            <div className="mt-4 pt-4 border-t border-white/5 space-y-1">
               <button onClick={() => setCurrentView('liked')} className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/[0.03] transition-all group text-left">
                  <div className="w-12 h-12 rounded-md bg-gradient-to-br from-[#450eff] to-[#8e8ee5] flex items-center justify-center shrink-0">
                    <Heart className="w-5 h-5 text-white fill-white" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-semibold text-white truncate">Liked Songs</p>
                    <p className="text-xs text-text-subdued">Playlist • Pinned</p>
                  </div>
               </button>
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
