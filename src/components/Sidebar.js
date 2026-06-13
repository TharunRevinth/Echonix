import React from 'react';
import { Home, Search, ListMusic, CassetteTape, Radio, Headphones, Music2, Library, Clock } from 'lucide-react';

const Sidebar = ({ currentView, setCurrentView, isMobileOpen, setIsMobileOpen }) => {
  const navItems = [
    { icon: Home, label: 'Home', view: 'home' },
    { icon: Search, label: 'Discover', view: 'search' },
    { icon: ListMusic, label: 'Queue', view: 'queue' },
    { icon: Library, label: 'My Library', view: 'library' },
    { icon: CassetteTape, label: 'Collection', view: 'liked' },
    { icon: Radio, label: 'Retro FM', view: 'radio' },
    { icon: Clock, label: 'YT History', view: 'ytmusic-history' },
    { icon: Headphones, label: 'Local History', view: 'history' },
  ];

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 w-72 bg-bg-sidebar border-r border-white/5 p-6 
      transition-transform duration-300 lg:relative lg:translate-x-0
      ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      flex flex-col
    `}>
      <div className="flex items-center gap-3 mb-12 px-2">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center shadow-glow-purple group cursor-pointer overflow-hidden relative">
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Music2 className="text-white w-6 h-6 relative z-10" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tighter text-white leading-none">ECHONIX</h1>
          <p className="text-[8px] font-black text-accent-purple uppercase tracking-[0.4em] mt-1">Studio Edition</p>
        </div>
      </div>

      <nav className="space-y-1 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em] mb-4 px-4 opacity-40">Main Menu</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.view;
          return (
            <button
              key={item.label}
              onClick={() => { setCurrentView(item.view); setIsMobileOpen(false); }}
              className={`
                w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group relative
                ${active 
                  ? 'sidebar-item-active text-white shadow-[inset_0_0_20px_rgba(157,80,255,0.05)]' 
                  : 'text-text-secondary hover:bg-white/[0.03] hover:text-white'}
              `}
            >
              <Icon className={`w-5 h-5 transition-transform duration-300 ${active ? 'text-accent-purple scale-110' : 'group-hover:scale-110'}`} />
              <span className={`font-bold text-sm tracking-tight ${active ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}>{item.label}</span>
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent-purple rounded-full shadow-glow-purple" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5">
        <div className="p-4 rounded-[24px] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-accent-purple/10 rounded-full blur-2xl group-hover:bg-accent-purple/20 transition-all" />
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Current Session</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-teal/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-accent-teal animate-pulse" />
            </div>
            <p className="text-xs font-bold text-white/80">Audio HQ Enabled</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
