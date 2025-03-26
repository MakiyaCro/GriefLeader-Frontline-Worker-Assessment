import React from 'react';
import { Home, Book, ChevronRight } from 'lucide-react';

const AdminNavbar = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'training', label: 'Training Materials', icon: Book },
  ];

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 py-2 px-4 mb-4">
      <div className="flex items-center">
        <div className="flex space-x-2 items-center mr-8">
          <span className="font-bold text-lg text-blue-600">Admin Panel</span>
        </div>
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${activeTab === tab.id 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <Icon size={18} className="mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminNavbar;