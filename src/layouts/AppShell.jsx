import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Map, Briefcase, Calendar, Settings } from 'lucide-react';

export default function AppShell() {
  return (
    <div className="layout">
      <main className="content">
        <Outlet />
      </main>
      
      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Calendar size={24} />
          <span>Plan</span>
        </NavLink>
        <NavLink to="/map" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Map size={24} />
          <span>Map</span>
        </NavLink>
        <NavLink to="/vault" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Briefcase size={24} />
          <span>Vault</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={24} />
          <span>Settings</span>
        </NavLink>
      </nav>
    </div>
  );
}
