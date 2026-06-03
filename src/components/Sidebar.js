import React from 'react';
import { Home, Search, ListMusic, CassetteTape, Radio, Headphones, Music2 } from 'lucide-react';

const Sidebar = ({ currentView, setCurrentView, isMobileOpen, setIsMobileOpen }) => {
  const navItems = [
    { icon: Home, label: 'Home', view: 'home' },
    { icon: Search, label: 'Discover', view: 'search' },
    { icon: ListMusic, label: 'Queue', view: 'queue' },
    { icon: CassetteTape, label: 'Collection', view: 'liked' },
    { icon: Radio, label: 'Retro FM', view: 'radio' },
    { icon: Headphones, label: 'Recently Played', view: 'history' },
  ];

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 w-72 bg-bg-dark/80 backdrop-blur-xl border-r border-glass-border p-6 
      transition-transform duration-300 lg:relative lg:translate-x-0
      ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-xl bg-accent-purple flex items-center justify-center shadow-glow-purple">
          <Music2 className="text-white w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">ECHONIX</h1>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.view;
          return (
            <button
              key={item.label}
              onClick={() => { setCurrentView(item.view); setIsMobileOpen(false); }}
              className={`
                w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all
                ${active 
                  ? 'bg-accent-purple text-white shadow-glow-purple' 
                  : 'text-text-secondary hover:bg-glass-bg hover:text-white'}
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
