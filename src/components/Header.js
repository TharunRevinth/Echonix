import React from 'react';
import { Search, User, Menu, Bell, Settings } from 'lucide-react';

const Header = ({ query, setQuery, handleSearch, setIsMobileOpen, username = 'Tharun', greeting }) => {
  return (
    <header className="h-16 lg:h-20 px-4 lg:px-8 flex items-center justify-between z-40 relative gap-4">
      <div className="flex items-center gap-4 lg:hidden">
        <span className="text-xl font-bold tracking-tight text-white">ECHONIX</span>
      </div>

      <div className="hidden lg:block">
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span className="opacity-70">{greeting},</span>
          <span>{username}</span>
        </h2>
      </div>

      <div className="flex items-center gap-3 lg:gap-6 flex-1 justify-end max-w-2xl">
        <form onSubmit={handleSearch} className="relative flex-1 lg:max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent-purple transition-all duration-300 w-4 h-4 lg:w-5 lg:h-5" />
          <input 
            type="text"
            placeholder="Search..."
            className="w-full bg-white/[0.03] border border-white/5 rounded-xl lg:rounded-2xl py-2.5 lg:py-3 pl-10 lg:pl-12 pr-4 text-sm text-white outline-none focus:border-accent-purple/50 focus:bg-white/[0.05] transition-all duration-300 placeholder:text-text-secondary/50 placeholder:font-medium"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <button className="flex items-center gap-2 lg:gap-3 p-1 lg:p-1.5 lg:pr-4 rounded-xl lg:rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] transition-all group shrink-0">
          <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg lg:rounded-xl bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center shadow-glow-purple group-hover:scale-105 transition-transform">
            <User className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-[10px] lg:text-xs font-black text-white leading-tight">{username}</p>
            <p className="text-[8px] lg:text-[9px] font-bold text-accent-purple uppercase tracking-widest mt-0.5">Premium</p>
          </div>
        </button>
      </div>
    </header>
  );
};

export default Header;
