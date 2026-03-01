import React, { useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Routes, Route } from 'react-router-dom';
import AppShell from './layouts/AppShell';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AuthRoute from './components/AuthRoute';
import MapPage from './pages/MapPage';
import Settings from './pages/Settings';
import VaultPage from './pages/VaultPage';

function App() {

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <AuthRoute>
            <AppShell />
          </AuthRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="map" element={<MapPage />} />
          <Route path="vault" element={<VaultPage />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </APIProvider>
  );
}

export default App;
