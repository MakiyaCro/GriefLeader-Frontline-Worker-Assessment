// static/js/admin-dashboard.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import AdminDashboard from './components/AdminDashboard';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('admin-dashboard-root');
  const root = createRoot(container);
  root.render(React.createElement(AdminDashboard));
});