import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Eye, EyeOff } from 'lucide-react';

const ModuleVisibilityMenu = ({ onToggleModuleVisibility }) => {
  const [isOpen, setIsOpen] = useState(true); // Start with menu open for testing
  const [moduleStates, setModuleStates] = useState({
    sidebarModule: true,
    hrUsersModule: true,
    assessmentModule: true,
    benchmarkModule: true,
    managersModule: true,
    questionPairsModule: true
  });

  // Load saved state from localStorage on mount
  useEffect(() => {
    const savedModuleStates = localStorage.getItem('moduleVisibilityStates');
    if (savedModuleStates) {
      try {
        const parsedStates = JSON.parse(savedModuleStates);
        setModuleStates(parsedStates);
        
        // Apply saved states to modules
        Object.entries(parsedStates).forEach(([moduleId, isVisible]) => {
          onToggleModuleVisibility(moduleId, isVisible);
        });
      } catch (e) {
        console.error('Error parsing saved module states:', e);
      }
    }
  }, []);

  // Save to localStorage whenever moduleStates changes
  useEffect(() => {
    localStorage.setItem('moduleVisibilityStates', JSON.stringify(moduleStates));
  }, [moduleStates]);

  const toggleModuleVisibility = (moduleId) => {
    const newState = !moduleStates[moduleId];
    
    // Update state
    setModuleStates({
      ...moduleStates,
      [moduleId]: newState
    });
    
    // Call parent callback
    onToggleModuleVisibility(moduleId, newState);
  };

  const toggleMenu = () => {
    console.log('Toggle menu clicked, current state:', isOpen);
    setIsOpen(!isOpen);
  };

  const modules = [
    { id: 'sidebarModule', label: 'Business Sidebar' },
    { id: 'hrUsersModule', label: 'HR Users' },
    { id: 'assessmentModule', label: 'Assessments' },
    { id: 'benchmarkModule', label: 'Benchmark' },
    { id: 'managersModule', label: 'Managers' },
    { id: 'questionPairsModule', label: 'Question Pairs' }
  ];

  return (
    <div className={`fixed right-0 top-16 md:top-24 bg-white shadow-lg rounded-l-lg transition-all duration-300 z-50 ${isOpen ? 'w-64' : 'w-10'}`}>
    {/* Toggle Button - make it larger for mobile */}
    <button
      onClick={toggleMenu}
      className="absolute left-0 top-3 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-full cursor-pointer z-50"
    >
      {isOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
    </button>

    {/* Menu Content */}
    <div className={`p-4 pl-12 md:pl-14 overflow-hidden ${isOpen ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
      <h3 className="text-base md:text-lg font-semibold mb-4">Module Visibility</h3>
      <ul className="space-y-3">
        {modules.map(module => (
          <li key={module.id} className="flex items-center justify-between">
            <span className="text-sm">{module.label}</span>
            <button
              onClick={() => toggleModuleVisibility(module.id)}
              className={`p-2 rounded ${moduleStates[module.id] ? 'text-green-600 hover:bg-green-100' : 'text-red-600 hover:bg-red-100'}`}
              title={moduleStates[module.id] ? 'Hide Module' : 'Show Module'}
            >
              {moduleStates[module.id] ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  </div>
  );
};

export default ModuleVisibilityMenu;