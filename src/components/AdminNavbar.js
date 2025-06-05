import React from 'react';
import { Home, Book, ChevronRight } from 'lucide-react';

const AdminNavbar = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'training', label: 'Training Materials', icon: Book },
  ];

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 py-2 px-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex space-x-2 items-center">
          <span className="font-bold text-lg md:text-xl text-blue-600">Admin Panel</span>
        </div>
        <div className="flex space-x-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-colors whitespace-nowrap
                  ${activeTab === tab.id 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <Icon size={16} className="mr-1 md:mr-2" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminNavbar;