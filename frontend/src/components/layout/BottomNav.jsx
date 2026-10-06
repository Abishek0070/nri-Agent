import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Edit3, Mic, Sparkles, Award } from 'lucide-react';

export const BottomNav = () => {
  const navItems = [
    { to: '/', label: 'Home', icon: Home },

    { to: '/speaking', label: 'Speaking', icon: Mic },
    { to: '/culture', label: 'Culture', icon: Sparkles },
    { to: '/progress', label: 'Passport', icon: Award },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-amber-200/80 px-2 py-1.5 sm:hidden shadow-lg pb-safe">
      <div className="flex items-center justify-around">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all select-none ${
                isActive
                  ? 'text-amber-600 font-extrabold scale-105'
                  : 'text-stone-500 font-medium hover:text-stone-800'
              }`
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
