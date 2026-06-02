import React from 'react';
import { Search, User, Menu } from 'lucide-react';

const Header = ({ query, setQuery, handleSearch, setIsMobileOpen }) => {
  return (
    <header className="h-20 px-6 flex items-center justify-between lg:px-10">
      <div className="flex items-center gap-4 lg:hidden">
        <button onClick={() => setIsMobileOpen(true)} className="p-2 text-text-secondary">
          <Menu className="w-6 h-6" />
        </button>
        <span className="text-xl font-bold tracking-tight text-white">ECHONIX</span>
      </div>

      <div className="hidden lg:block">
        <h2 className="text-2xl font-bold text-white">Good evening,</h2>
      </div>

      <div className="flex items-center gap-6 flex-1 justify-end max-w-xl">
        <form onSubmit={handleSearch} className="relative w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent-purple transition-colors w-5 h-5" />
          <input 
            type="text"
            placeholder="Search for music..."
            className="w-full bg-bg-card border border-glass-border rounded-full py-2.5 pl-12 pr-4 text-sm outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <button className="hidden sm:flex items-center gap-2 p-1.5 rounded-full bg-glass-bg border border-glass-border">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
        </button>
      </div>
    </header>
  );
};

export default Header;
