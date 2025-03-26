import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, ExternalLink, 
  Save, X, Upload, AlertTriangle,
  Link, ArrowUpDown, Award, Book, Briefcase, CheckCircle,
  Clipboard, Coffee, FileText, Heart, HelpCircle, 
  MessageCircle, Star, Target, ThumbsUp, Settings
} from 'lucide-react';

const TrainingMaterialsManager = ({ businessId }) => {
    const [trainingMaterials, setTrainingMaterials] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [currentMaterial, setCurrentMaterial] = useState(null);
    const [reorderMode, setReorderMode] = useState(false);
    const [updateTimeout, setUpdateTimeout] = useState(null);
  
    const [newMaterial, setNewMaterial] = useState({
        title: '',
        description: '',
        icon: 'book',
        color: '#3b82f6',
        document_url: '',
        active: true,
        order: 0
    });

    // Comprehensive list of icons with proper mapping for visual display
    const iconOptions = [
        { value: 'book', label: 'Book', component: Book },
        { value: 'clipboard', label: 'Clipboard', component: Clipboard },
        { value: 'users', label: 'Team', component: Clipboard },
        { value: 'award', label: 'Award', component: Award },
        { value: 'briefcase', label: 'Briefcase', component: Briefcase },
        { value: 'check-circle', label: 'Check Circle', component: CheckCircle },
        { value: 'coffee', label: 'Coffee', component: Coffee },
        { value: 'file-text', label: 'Document', component: FileText },
        { value: 'heart', label: 'Heart', component: Heart },
        { value: 'help-circle', label: 'Help', component: HelpCircle },
        { value: 'message-circle', label: 'Message', component: MessageCircle },
        { value: 'star', label: 'Star', component: Star },
        { value: 'target', label: 'Target', component: Target },
        { value: 'thumbs-up', label: 'Thumbs Up', component: ThumbsUp },
        { value: 'settings', label: 'Settings', component: Settings }
    ];

    // Color options with meaning categorizations
    const colorOptions = [
        { value: '#3b82f6', label: 'Blue (Informational)', colorClass: 'bg-blue-500 text-white' },
        { value: '#ef4444', label: 'Red (Important)', colorClass: 'bg-red-500 text-white' },
        { value: '#10b981', label: 'Green (Beginner)', colorClass: 'bg-green-500 text-white' },
        { value: '#f59e0b', label: 'Yellow (Caution)', colorClass: 'bg-yellow-500 text-white' },
        { value: '#8b5cf6', label: 'Purple (Advanced)', colorClass: 'bg-purple-500 text-white' },
        { value: '#ec4899', label: 'Pink (Specialty)', colorClass: 'bg-pink-500 text-white' },
        { value: '#6b7280', label: 'Gray (General)', colorClass: 'bg-gray-500 text-white' },
        { value: '#1e293b', label: 'Dark Blue (Technical)', colorClass: 'bg-slate-800 text-white' },
        { value: '#6d28d9', label: 'Indigo (Critical)', colorClass: 'bg-indigo-600 text-white' },
        { value: '#0891b2', label: 'Cyan (Procedural)', colorClass: 'bg-cyan-500 text-white' },
    ];

    // Get CSRF token from page
    const getCsrfToken = () => {
        const csrfTokenElement = document.querySelector('[name=csrfmiddlewaretoken]');
        return csrfTokenElement ? csrfTokenElement.value : '';
    };

    // Fetch training materials for the selected business
    useEffect(() => {
        fetchTrainingMaterials();
    }, []);

    // Get appropriate icon component 
    const getIconComponent = (iconName) => {
        const iconOption = iconOptions.find(option => option.value === iconName);
        if (iconOption && iconOption.component) {
            const IconComponent = iconOption.component;
            return <IconComponent size={24} />;
        }
        
        // Default fallback
        return <Book size={24} />;
    };

    const isValidUrl = (url) => {
        if (!url) return false;
        
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    // Check if URL is a Google Drive document
    const isGoogleDriveUrl = (url) => {
        return url && (
            url.includes('docs.google.com') || 
            url.includes('drive.google.com')
        );
    };

    const fetchTrainingMaterials = async () => {
        try {
        setLoading(true);
        
        try {
            // Attempt to call the real API endpoint
            const response = await fetch(`/api/training-materials/`);
            
            if (response.ok) {
                const data = await response.json();
                setTrainingMaterials(data.training_materials);
                return;
            }
        } catch (apiError) {
            console.warn('API endpoint not available, using example data');
        }
        
        // Fallback to example data if the API endpoint doesn't exist yet
        setTrainingMaterials([
            {
            id: 1,
            title: 'Opening Ice-Breaker',
            description: 'Techniques for starting interviews and meetings effectively.',
            icon: 'coffee',
            color: '#6b7280',
            document_url: 'https://docs.google.com/document/d/example1',
            active: true,
            order: 0
            },
            {
            id: 2,
            title: 'Integrity/Accountability',
            description: 'Training on workplace ethics and personal accountability.',
            icon: 'check-circle',
            color: '#3b82f6',
            document_url: 'https://docs.google.com/document/d/example2',
            active: true,
            order: 1
            },
            {
            id: 3,
            title: 'Work Ethic',
            description: 'Guide to cultivating a positive and productive work ethic.',
            icon: 'briefcase',
            color: '#10b981',
            document_url: 'https://docs.google.com/document/d/example3',
            active: true,
            order: 2
            },
            {
            id: 4,
            title: 'Self-Awareness',
            description: 'Developing skills for professional self-reflection and growth.',
            icon: 'users',
            color: '#ef4444',
            document_url: 'https://docs.google.com/document/d/example4',
            active: true,
            order: 3
            }
        ]);
        } catch (err) {
            console.error('Error fetching training materials:', err);
            setError('Failed to load training materials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddMaterial = async (e) => {
        e.preventDefault();
    
        try {
            setLoading(true);
        
            try {
                // Try to use the real API
                const response = await fetch(`/api/training-materials/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCsrfToken(),
                    },
                    body: JSON.stringify({
                        ...newMaterial,
                        order: trainingMaterials.length // Place at the end by default
                    }),
                });
            
                if (response.ok) {
                const data = await response.json();
                setTrainingMaterials([...trainingMaterials, data]);
                setShowAddModal(false);
                setSuccess('Training material added successfully');
                setTimeout(() => setSuccess(null), 3000);
            
                // Reset form
                setNewMaterial({
                    title: '',
                    description: '',
                    icon: 'book',
                    color: '#3b82f6',
                    document_url: '',
                    active: true,
                    order: 0
                });
            
                return;
                }
            } catch (apiError) {
                console.warn('API endpoint not available, simulating success');
            }
        
            // Simulate success for development
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Add to local state with a fake ID
            const newId = Math.max(0, ...trainingMaterials.map(m => m.id)) + 1;
            setTrainingMaterials([
                ...trainingMaterials,
                { ...newMaterial, id: newId, order: trainingMaterials.length }
            ]);
        
            // Close modal and reset form
            setShowAddModal(false);
            setNewMaterial({
                title: '',
                description: '',
                icon: 'book',
                color: '#3b82f6',
                document_url: '',
                active: true,
                order: 0
            });
        
            // Show success message
            setSuccess('Training material added successfully');
            setTimeout(() => setSuccess(null), 3000);
            } catch (err) {
                console.error('Error adding training material:', err);
                setError('Failed to add training material. Please try again.');
            } finally {
            setLoading(false);
        }
    };

    const handleEditMaterial = async (e) => {
        e.preventDefault();
        
        if (!currentMaterial) return;
        
        try {
            setLoading(true);
            
            try {
                // Try to use the real API
                const response = await fetch(`/api/training-materials/${currentMaterial.id}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken(),
                },
                body: JSON.stringify(currentMaterial),
                });
                
                if (response.ok) {
                const data = await response.json();
                setTrainingMaterials(trainingMaterials.map(material => 
                    material.id === data.id ? data : material
                ));
                setShowEditModal(false);
                setSuccess('Training material updated successfully');
                setTimeout(() => setSuccess(null), 3000);
                return;
                }
            } catch (apiError) {
                console.warn('API endpoint not available, simulating success');
            }
            
            // Simulate success for development
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Update local state
            setTrainingMaterials(trainingMaterials.map(material => 
                material.id === currentMaterial.id ? currentMaterial : material
            ));
            
            // Close modal
            setShowEditModal(false);
            
            // Show success message
            setSuccess('Training material updated successfully');
            setTimeout(() => setSuccess(null), 3000);
            } catch (err) {
            console.error('Error updating training material:', err);
            setError('Failed to update training material. Please try again.');
            } finally {
            setLoading(false);
        }
    };

    const handleDeleteMaterial = async () => {
    if (!currentMaterial) return;
    
    try {
      setLoading(true);
      
      try {
        // Try to use the real API
        const response = await fetch(`/api/training-materials/${currentMaterial.id}/`, {
          method: 'DELETE',
          headers: {
            'X-CSRFToken': getCsrfToken(),
          }
        });
        
        if (response.ok) {
          // Update local state
          const updatedMaterials = trainingMaterials
            .filter(material => material.id !== currentMaterial.id)
            .map((material, index) => ({
              ...material,
              order: index
            }));
            
          setTrainingMaterials(updatedMaterials);
          
          setShowDeleteModal(false);
          setSuccess('Training material deleted successfully');
          setTimeout(() => setSuccess(null), 3000);
          return;
        }
      } catch (apiError) {
        console.warn('API endpoint not available, simulating success');
      }
      
      // Simulate success for development
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update local state
      const updatedMaterials = trainingMaterials
        .filter(material => material.id !== currentMaterial.id)
        .map((material, index) => ({
          ...material,
          order: index
        }));
        
      setTrainingMaterials(updatedMaterials);
      
      // Close modal
      setShowDeleteModal(false);
      
      // Show success message
      setSuccess('Training material deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting training material:', err);
      setError('Failed to delete training material. Please try again.');
    } finally {
      setLoading(false);
    }
    };

    // Function to preview a Google Drive document to verify it works
    const handlePreviewDocument = (url) => {
        if (!url) {
            setError('No document URL provided.');
            return;
        }
        
        // Open the document in a new tab
        window.open(url, '_blank');
    };

  // Handler for reordering materials
    const handleReorder = async (materialId, direction) => {
        // Find the material and its current index
        const materialIndex = trainingMaterials.findIndex(m => m.id === materialId);
        if (materialIndex === -1) return;
        
        // Calculate new index
        const newIndex = direction === 'up' 
            ? Math.max(0, materialIndex - 1)
            : Math.min(trainingMaterials.length - 1, materialIndex + 1);
            
        // If no change in position, exit
        if (newIndex === materialIndex) return;
        
        try {
            // Create a copy of the materials array
            const updatedMaterials = [...trainingMaterials];
            
            // Remove the material from its current position
            const [movedMaterial] = updatedMaterials.splice(materialIndex, 1);
            
            // Insert it at the new position
            updatedMaterials.splice(newIndex, 0, movedMaterial);
            
            // Update the order property for all materials
            const reorderedMaterials = updatedMaterials.map((material, index) => ({
            ...material,
            order: index
            }));
            
            // Update local state first for immediate feedback
            setTrainingMaterials(reorderedMaterials);
            
            // Clear any existing timeout
            if (updateTimeout) {
            clearTimeout(updateTimeout);
            }
            
            // Set a new timeout for API updates with debounce
            const newTimeout = setTimeout(async () => {
            try {
                // Try to update on the server (one by one)
                for (const material of reorderedMaterials) {
                await fetch(`/api/training-materials/${material.id}/`, {
                    method: 'PUT',
                    headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken(),
                    },
                    body: JSON.stringify({ order: material.order })
                });
                }
                
                // Show success message after all updates are complete
                setSuccess('Order updated successfully');
                setTimeout(() => setSuccess(null), 2000);
            } catch (apiError) {
                console.warn('API endpoint not available, order will be maintained locally only');
            }
            }, 500); // 500ms debounce delay
            
            // Store the timeout ID so we can clear it if needed
            setUpdateTimeout(newTimeout);
            
        } catch (err) {
            console.error('Error reordering materials:', err);
            setError('Failed to update order. Please try again.');
        }
    };

  // Toggle active state of a material
    const handleToggleActive = async (material) => {
        try {
        const updatedMaterial = { ...material, active: !material.active };
        
        try {
            // Try to use the real API
            const response = await fetch(`/api/training-materials/${material.id}/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
            },
            body: JSON.stringify({ active: updatedMaterial.active })
            });
            
            if (response.ok) {
            setTrainingMaterials(trainingMaterials.map(m => 
                m.id === material.id ? { ...m, active: updatedMaterial.active } : m
            ));
            setSuccess(`Material ${updatedMaterial.active ? 'activated' : 'deactivated'} successfully`);
            setTimeout(() => setSuccess(null), 2000);
            return;
            }
        } catch (apiError) {
            console.warn('API endpoint not available, simulating success');
        }
        
        // Update local state
        setTrainingMaterials(trainingMaterials.map(m => 
            m.id === material.id ? updatedMaterial : m
        ));
        
        setSuccess(`Material ${updatedMaterial.active ? 'activated' : 'deactivated'} successfully`);
        setTimeout(() => setSuccess(null), 2000);
        } catch (err) {
        setError('Failed to update material status. Please try again.');
        }
    };
    // Main render function
    if (loading && trainingMaterials.length === 0) {
        return (
        <div className="bg-white rounded-lg shadow p-8">
            <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        </div>
        );
    }
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Success Message */}
      {success && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded z-50 shadow-lg flex items-center">
          <CheckCircle size={18} className="mr-2" />
          {success}
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded z-50 shadow-lg flex items-center">
          <AlertTriangle size={18} className="mr-2" />
          {error}
          <button onClick={() => setError(null)} className="ml-2">
            <X size={18} />
          </button>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Training Materials</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setReorderMode(!reorderMode)}
            className={`px-3 py-1 rounded flex items-center ${
              reorderMode 
                ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            }`}
            title={reorderMode ? "Exit reorder mode" : "Reorder materials"}
          >
            <ArrowUpDown size={16} className="mr-2" />
            {reorderMode ? "Done Reordering" : "Reorder"}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
          >
            <Plus size={18} className="mr-2" />
            Add Training Material
          </button>
        </div>
      </div>
      
      {/* Training Materials List */}
      <div className="bg-white p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainingMaterials
            .sort((a, b) => a.order - b.order)
            .map(material => (
              <div 
                key={material.id}
                className={`border rounded-lg shadow-sm hover:shadow transition-shadow overflow-hidden ${
                  !material.active ? 'opacity-60' : ''
                }`}
              >
                <div 
                  className="p-4 flex items-start"
                  style={{ borderTop: `4px solid ${material.color}` }}
                >
                  <div className="mr-4">
                    <div 
                      className="w-10 h-10 flex items-center justify-center rounded-full"
                      style={{ backgroundColor: material.color, color: 'white' }}
                    >
                      {getIconComponent(material.icon)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h3 className="font-medium text-lg">{material.title}</h3>
                      {!material.active && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mt-1">{material.description}</p>
                    
                    {material.document_url && (
                      <div className="mt-2">
                        <div className="flex items-center">
                          <Link size={16} className="text-blue-500 mr-1" />
                          <span className="text-sm text-gray-600 truncate" style={{maxWidth: '200px'}}>
                            {isGoogleDriveUrl(material.document_url) 
                              ? 'Google Drive Document' 
                              : material.document_url}
                          </span>
                        </div>
                        <a 
                          href={material.document_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center mt-2"
                        >
                          <ExternalLink size={16} className="mr-1" />
                          View Document
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div className="border-t bg-gray-50 p-2 flex justify-between items-center">
                  <div>
                    {reorderMode && (
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleReorder(material.id, 'up')}
                          disabled={material.order === 0}
                          className="text-gray-500 hover:text-gray-700 p-1 disabled:opacity-30"
                          title="Move up"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 15l-6-6-6 6"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleReorder(material.id, 'down')}
                          disabled={material.order === trainingMaterials.length - 1}
                          className="text-gray-500 hover:text-gray-700 p-1 disabled:opacity-30"
                          title="Move down"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleToggleActive(material)}
                      className={`p-1 rounded ${material.active ? 'text-green-600' : 'text-gray-400'}`}
                      title={material.active ? "Deactivate (hide from users)" : "Activate (show to users)"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                    <button 
                      onClick={() => {
                        setCurrentMaterial(material);
                        setShowEditModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => {
                        setCurrentMaterial(material);
                        setShowDeleteModal(true);
                      }}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
        
        {/* Empty state when no training materials exist */}
        {trainingMaterials.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="mx-auto w-20 h-20 text-gray-300 mb-4">
              <Book size={80} />
            </div>
            <p className="text-lg">No training materials found.</p>
            <p className="mt-2">Click the "Add Training Material" button to create one.</p>
          </div>
        )}
      </div>
      
      {/* Add Training Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-xl">
            <h2 className="text-2xl font-bold mb-6">Add Training Material</h2>
            
            <form onSubmit={handleAddMaterial}>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newMaterial.title}
                    onChange={(e) => setNewMaterial({...newMaterial, title: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newMaterial.description}
                    onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})}
                    className="w-full p-2 border rounded"
                    rows={3}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Icon
                    </label>
                    <select
                      value={newMaterial.icon}
                      onChange={(e) => setNewMaterial({...newMaterial, icon: e.target.value})}
                      className="w-full p-2 border rounded"
                    >
                      {iconOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <select
                      value={newMaterial.color}
                      onChange={(e) => setNewMaterial({...newMaterial, color: e.target.value})}
                      className="w-full p-2 border rounded"
                      style={{ backgroundColor: newMaterial.color, color: 'white' }}
                    >
                      {colorOptions.map(option => (
                        <option 
                          key={option.value} 
                          value={option.value}
                          style={{ backgroundColor: option.value, color: 'white' }}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document URL (Google Drive or other)
                  </label>
                  <input
                    type="url"
                    value={newMaterial.document_url}
                    onChange={(e) => setNewMaterial({...newMaterial, document_url: e.target.value})}
                    className="w-full p-2 border rounded"
                    placeholder="https://docs.google.com/document/d/..."
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Tip: Use a Google Drive sharing link that anyone with the link can view
                  </p>
                </div>
                
                <div className="flex items-center mt-2">
                  <input
                    id="active"
                    type="checkbox"
                    checked={newMaterial.active}
                    onChange={(e) => setNewMaterial({...newMaterial, active: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                    Active (visible to users)
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : (
                    <>
                      <Save size={18} className="mr-2" />
                      Add Material
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Training Material Modal */}
      {showEditModal && currentMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-xl">
            <h2 className="text-2xl font-bold mb-6">Edit Training Material</h2>
            
            <form onSubmit={handleEditMaterial}>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={currentMaterial.title}
                    onChange={(e) => setCurrentMaterial({...currentMaterial, title: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={currentMaterial.description}
                    onChange={(e) => setCurrentMaterial({...currentMaterial, description: e.target.value})}
                    className="w-full p-2 border rounded"
                    rows={3}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Icon
                    </label>
                    <select
                      value={currentMaterial.icon}
                      onChange={(e) => setCurrentMaterial({...currentMaterial, icon: e.target.value})}
                      className="w-full p-2 border rounded"
                    >
                      {iconOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <select
                      value={currentMaterial.color}
                      onChange={(e) => setCurrentMaterial({...currentMaterial, color: e.target.value})}
                      className="w-full p-2 border rounded"
                      style={{ backgroundColor: currentMaterial.color, color: 'white' }}
                    >
                      {colorOptions.map(option => (
                        <option 
                          key={option.value} 
                          value={option.value}
                          style={{ backgroundColor: option.value, color: 'white' }}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document URL (Google Drive or other)
                  </label>
                  <div className="flex">
                    <input
                      type="url"
                      value={currentMaterial.document_url}
                      onChange={(e) => setCurrentMaterial({...currentMaterial, document_url: e.target.value})}
                      className="w-full p-2 border rounded-l"
                      placeholder="https://docs.google.com/document/d/..."
                    />
                    <button
                      type="button"
                      onClick={() => handlePreviewDocument(currentMaterial.document_url)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 border border-l-0 rounded-r hover:bg-gray-200"
                      disabled={!isValidUrl(currentMaterial.document_url)}
                      title="Test link in new tab"
                    >
                      <ExternalLink size={16} />
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {isGoogleDriveUrl(currentMaterial.document_url) 
                      ? "✓ Valid Google Drive link detected" 
                      : "Make sure your link is publicly accessible"}
                  </p>
                </div>
                
                <div className="flex items-center mt-2">
                  <input
                    id="edit_active"
                    type="checkbox"
                    checked={currentMaterial.active}
                    onChange={(e) => setCurrentMaterial({...currentMaterial, active: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="edit_active" className="ml-2 block text-sm text-gray-900">
                    Active (visible to users)
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : (
                    <>
                      <Save size={18} className="mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && currentMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md">
            <h2 className="text-xl font-bold text-red-600 mb-4">Delete Training Material</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete the training material "{currentMaterial.title}"? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMaterial}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center"
                disabled={loading}
              >
                {loading ? 'Deleting...' : (
                  <>
                    <Trash2 size={18} className="mr-2" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
          )}
    </div>
  );
};
export default TrainingMaterialsManager;