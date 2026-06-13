import React from 'react';
import { Search, User, Menu, Bell, Settings } from 'lucide-react';

const Header = ({ query, setQuery, handleSearch, setIsMobileOpen, username = 'Tharun' }) => {
  return (
    <header className="h-24 px-6 flex items-center justify-between lg:px-10 z-40 relative">
      <div className="flex items-center gap-4 lg:hidden">
        <button onClick={() => setIsMobileOpen(true)} className="p-2 text-text-secondary hover:text-white transition-colors">
          <Menu className="w-6 h-6" />
        </button>
        <span className="text-xl font-black tracking-tighter text-white">ECHONIX</span>
      </div>

      <div className="hidden lg:block">
        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
          <span className="opacity-40">Good evening,</span>
          <span className="gradient-text">{username}</span>
        </h2>
      </div>

      <div className="flex items-center gap-6 flex-1 justify-end max-w-2xl">
        <div className="flex items-center gap-2">
           <button className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-text-secondary hover:text-white hover:bg-white/[0.08] transition-all hidden md:flex">
             <Bell className="w-5 h-5" />
           </button>
           <button className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-text-secondary hover:text-white hover:bg-white/[0.08] transition-all hidden md:flex">
             <Settings className="w-5 h-5" />
           </button>
        </div>

        <form onSubmit={handleSearch} className="relative w-full max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent-purple transition-all duration-300 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search artists, songs, playlists..."
            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-accent-purple/50 focus:bg-white/[0.05] transition-all duration-300 placeholder:text-text-secondary/50 placeholder:font-medium"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <button className="flex items-center gap-3 p-1.5 pr-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] transition-all group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center shadow-glow-purple group-hover:scale-105 transition-transform">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-black text-white leading-tight">{username}</p>
            <p className="text-[9px] font-bold text-accent-purple uppercase tracking-widest mt-0.5">Premium</p>
          </div>
        </button>
      </div>
    </header>
  );
};

export default Header;
