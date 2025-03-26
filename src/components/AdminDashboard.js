import React, { useState, useEffect } from 'react';
import BenchmarkSection from './BenchmarkSection';
import AssessmentSection from './AssessmentSection';
import QuestionPairManager from './QuestionPairManager';
import HRUserManager from './HRUserManager';
import ModuleVisibilityMenu from './ModuleVisibilityMenu';
import { ChevronRight, Upload } from 'lucide-react';
import AdminNavbar from './AdminNavbar';
import TrainingMaterialsManager from './TrainingMaterialsManager';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [businessDetails, setBusinessDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showDeleteBusinessConfirmation, setShowDeleteBusinessConfirmation] = useState(false);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [showAddHRUserModal, setShowAddHRUserModal] = useState(false);
  const [newBusinessData, setNewBusinessData] = useState({
    name: '',
    slug: '',
    primaryColor: '#000000',
    useColor: true,
    logo: null
  });
  const [newHRUser, setNewHRUser] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: ''
  });
  const [showAddManagerModal, setShowAddManagerModal] = useState(false);
  const [showEditManagerModal, setShowEditManagerModal] = useState(false);
  const [currentManager, setCurrentManager] = useState(null);
  const [newManager, setNewManager] = useState({
    name: '',
    email: '',
    region: '',
    position: '',
    is_default: false
  });
  const [managers, setManagers] = useState([]);
  const [moduleVisibility, setModuleVisibility] = useState({
    sidebarModule: true,
    hrUsersModule: true,
    assessmentModule: true,
    benchmarkModule: true,
    managersModule: true,
    questionPairsModule: true
  });

  // Fetch businesses when component mounts
  useEffect(() => {
    fetchBusinesses();
  }, []);
  
  useEffect(() => {
    if (selectedBusiness) {
      fetchManagers();
    }
  }, [selectedBusiness]);
  
  useEffect(() => {
    if (selectedBusiness) {
      fetchBusinessDetails(selectedBusiness.id);
    }
  }, [selectedBusiness?.id]); // Only run when the selected business ID changes
  

  // Get CSRF token
  const getCsrfToken = () => {
    const csrfTokenElement = document.querySelector('[name=csrfmiddlewaretoken]');
    return csrfTokenElement ? csrfTokenElement.value : '';
  };

  

  // Fetch list of businesses
  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/businesses/list/');
      if (!response.ok) throw new Error('Failed to fetch businesses');
      const data = await response.json();
      setBusinesses(data.businesses);
      
      // If only one business exists, auto-select it
      if (data.businesses.length === 1) {
        handleBusinessSelect(data.businesses[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshBusinessData = async () => {
    if (selectedBusiness) {
      await fetchBusinessDetails(selectedBusiness.id);
    }
  };

  // Add function to handle logo upload for the selected business
  const handleLogoUpload = async (event) => {
    if (!selectedBusiness) return;
    
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file is an image and under 2MB
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, etc.)');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo file size must be under 2MB');
      return;
    }
    
    const formData = new FormData();
    formData.append('logo', file);
    
    try {
      setLoading(true);
      const response = await fetch(`/api/businesses/${selectedBusiness.id}/upload-logo/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload logo');
      }
      
      const data = await response.json();
      
      // Fully refresh the business data after successful upload
      await fetchBusinessDetails(selectedBusiness.id);
      
      setSuccess('Logo uploaded successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch business details
  const fetchBusinessDetails = async (businessId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/businesses/${businessId}/details/`);
      if (!response.ok) throw new Error('Failed to fetch business details');
      const data = await response.json();
      
      // Update both selectedBusiness and businessDetails with fresh data
      setSelectedBusiness({
        ...data.business
      });
      setBusinessDetails(data);
      
      // Also refresh managers
      await fetchManagers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch managers for the selected business
  const fetchManagers = async () => {
    if (!selectedBusiness) return;
    
    try {
      const response = await fetch(`/api/businesses/${selectedBusiness.id}/managers/`);
      if (!response.ok) throw new Error('Failed to fetch managers');
      const data = await response.json();
      setManagers(data.managers || []);
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle business selection
  const handleBusinessSelect = async (business) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/businesses/${business.id}/details/`);
      if (!response.ok) throw new Error('Failed to fetch business details');
      const data = await response.json();
      
      setSelectedBusiness(business);
      setBusinessDetails(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create new business
  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // First create the business
      const response = await fetch('/api/businesses/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({
          name: newBusinessData.name,
          slug: newBusinessData.name.toLowerCase().replace(/\s+/g, '-'),
          primaryColor: newBusinessData.useColor ? newBusinessData.primaryColor : '#000000'
        }),
      });

      if (!response.ok) throw new Error('Failed to create business');

      const data = await response.json();
      
      // If logo was provided, upload it
      if (!newBusinessData.useColor && newBusinessData.logo) {
        const formData = new FormData();
        formData.append('logo', newBusinessData.logo);
        
        const logoResponse = await fetch(`/api/businesses/${data.id}/upload-logo/`, {
          method: 'POST',
          headers: {
            'X-CSRFToken': getCsrfToken(),
          },
          body: formData
        });
        
        if (!logoResponse.ok) {
          const errorData = await logoResponse.json();
          console.error('Logo upload failed:', errorData.error);
          // We continue even if logo upload fails
        }
      }
      
      // Refresh businesses list
      await fetchBusinesses();
      
      // Select the newly created business
      handleBusinessSelect(data);
      
      // Close the form
      setShowBusinessForm(false);
      
      // Reset form data
      setNewBusinessData({
        name: '',
        slug: '',
        primaryColor: '#000000',
        useColor: true,
        logo: null
      });
      
      // Show success message
      setSuccess('Business created successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add HR User
  const handleAddHRUser = async (e) => {
    e.preventDefault();
    
    if (!selectedBusiness) {
      setError('No business selected');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/hr-users/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({
          ...newHRUser,
          business_id: selectedBusiness.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add HR user');
      }

      // Refresh business details to show new HR user
      await fetchBusinessDetails(selectedBusiness.id);
      
      // Close the modal
      setShowAddHRUserModal(false);
      
      // Reset form
      setNewHRUser({
        email: '',
        first_name: '',
        last_name: '',
        password: ''
      });
      
      // Show success message
      setSuccess('HR user added successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete business
  const handleDeleteBusiness = async () => {
    if (!selectedBusiness) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/businesses/${selectedBusiness.id}/`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': getCsrfToken(),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to delete business');

      // Refresh businesses list
      await fetchBusinesses();
      
      // Reset selected business
      setSelectedBusiness(null);
      setBusinessDetails(null);
      
      // Close confirmation modal
      setShowDeleteBusinessConfirmation(false);
      
      // Show success message
      setSuccess('Business deleted successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Upload Assessment Template
  const handleAssessmentTemplateUpload = async (event) => {
    if (!selectedBusiness) return;

    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const response = await fetch(`/api/businesses/${selectedBusiness.id}/upload-template/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload assessment template');
      }

      // Refresh business details
      await fetchBusinessDetails(selectedBusiness.id);
      
      // Show success message
      setSuccess('Assessment template uploaded successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add new manager
  const handleAddManager = async (e) => {
    e.preventDefault();
    
    if (!selectedBusiness) {
      setError('No business selected');
      return;
    }

    try {
      setLoading(true);
      
      // Log data being sent to help with debugging
      console.log('Sending manager data:', newManager);
      
      const response = await fetch(`/api/businesses/${selectedBusiness.id}/managers/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({
          name: newManager.name,
          email: newManager.email,
          region: newManager.region,
          position: newManager.position,
          is_default: newManager.is_default || false // Ensure boolean value
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add manager');
      }

      // Refresh managers list
      await fetchManagers();
      
      // Close the modal
      setShowAddManagerModal(false);
      
      // Reset form
      setNewManager({
        name: '',
        email: '',
        region: '',
        position:'',
        is_default: false
      });
      
      // Show success message
      setSuccess('Manager added successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error adding manager:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete manager
  const handleDeleteManager = async (managerId) => {
    try {
      const response = await fetch(`/api/managers/${managerId}/`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': getCsrfToken(),
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete manager');
      
      // Refresh managers list
      await fetchManagers();
      setSuccess('Manager deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Update manager
  const handleEditManager = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`/api/managers/${currentManager.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({
          name: currentManager.name,
          email: currentManager.email,
          region: currentManager.region,
          position: currentManager.position,
          is_default: currentManager.is_default
        }),
      });
      
      if (!response.ok) throw new Error('Failed to update manager');
      
      // Refresh managers list
      await fetchManagers();
      
      // Close the modal
      setShowEditManagerModal(false);
      setSuccess('Manager updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleModuleVisibility = (moduleId, isVisible) => {
    setModuleVisibility(prev => ({
      ...prev,
      [moduleId]: isVisible
    }));
  };


  const renderContent = () => {
    if (activeTab === 'training') {
      return (
        <div className="p-6 w-full">
          <h1 className="text-2xl font-bold mb-6">Training Materials Management</h1>
          <p className="mb-6 text-gray-600">
            Manage training materials that will be displayed to all HR users across all businesses.
            These materials appear on the Training page accessible by HR users.
          </p>
          <TrainingMaterialsManager />
        </div>
      );
    } else {
      return (
        <div className="flex h-full w-full">
          {/* Module Visibility Menu */}
          <ModuleVisibilityMenu onToggleModuleVisibility={handleToggleModuleVisibility} />

          {/* Business Sidebar */}
          {moduleVisibility.sidebarModule ? (
          <div className="w-64 bg-gray-100 p-4 flex flex-col">
            <h2 className="text-xl font-bold mb-4">Businesses</h2>
            <div className="flex-grow overflow-y-auto">
              {businesses.length === 0 ? (
                <p className="text-gray-500">No businesses found</p>
              ) : (
                <div>
                  {businesses.map((business) => (
                    <button
                      key={business.id}
                      onClick={() => handleBusinessSelect(business)}
                      className={`w-full text-left p-2 mb-2 rounded ${
                        selectedBusiness && selectedBusiness.id === business.id 
                          ? 'bg-blue-500 text-white' 
                          : 'hover:bg-gray-200'
                      }`}
                    >
                      {business.name}
                      {!business.assessment_template_uploaded && (
                        <span className="text-red-500 ml-2">*</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Create Business Button */}
            <button 
              onClick={() => setShowBusinessForm(true)}
              className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Create New Business
            </button>
          </div>
        ) : (
          /* When sidebar is hidden, show a minimal sidebar with just a toggle button */
          <div className="w-10 bg-gray-100 flex flex-col items-center p-2">
            <button
              onClick={() => handleToggleModuleVisibility('sidebarModule', true)}
              className="mt-2 text-blue-500 hover:text-blue-700"
              title="Show Business Sidebar"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

          {/* Main Content Area */}
          <div className="flex-1 p-8 bg-white overflow-y-auto">
            {/* Success Message */}
            {success && (
              <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded z-50">
                {success}
              </div>
            )}

            {!selectedBusiness ? (
              <div className="text-center text-gray-500">
                Select a business to view details
              </div>
            ) : (
              <div>
                {/* Business Header */}
                <div className="mb-8 flex justify-between items-center">
                  <h1 
                    className="text-3xl font-bold" 
                    style={{color: selectedBusiness.primary_color || '#000000'}}
                  >
                    {selectedBusiness.name}
                  </h1>
                  <div className="flex items-center">
                    {selectedBusiness.logo_url ? (
                      <div className="relative mr-4">
                        <img 
                          src={selectedBusiness.logo_url} 
                          alt={`${selectedBusiness.name} logo`} 
                          className="h-16 max-w-xs object-contain"
                        />
                        <label 
                          className="cursor-pointer absolute bottom-0 right-0 bg-white p-1 rounded-full shadow"
                          title="Change Logo"
                        >
                          <Upload size={16} className="text-gray-500" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      <label 
                        className="cursor-pointer px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-4 flex items-center"
                        title="Upload Logo"
                      >
                        <Upload size={16} className="mr-2" />
                        Upload Logo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                    <button 
                      onClick={() => setShowDeleteBusinessConfirmation(true)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 flex items-center"
                    >
                      Delete Business
                    </button>
                  </div>
                </div>

                {/* Business Details */}
                {businessDetails && (
                  <div className="w-full">    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                      {/* HR Users Section */}
                      {moduleVisibility.hrUsersModule && (
                        <div className="bg-gray-50 p-6 rounded-lg">
                          <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">HR Users</h2>
                            <button 
                              onClick={() => setShowAddHRUserModal(true)}
                              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              Add HR User
                            </button>
                          </div>
                          
                          {businessDetails && (
                            businessDetails.hr_users.length === 0 ? (
                              <p className="text-gray-500">No HR users found</p>
                            ) : (
                              <HRUserManager
                                hrUsers={businessDetails.hr_users}
                                onDeleteUser={async (userId) => {
                                  try {
                                    const response = await fetch(`/api/hr-users/${userId}/`, {
                                      method: 'DELETE',
                                      headers: {
                                        'X-CSRFToken': getCsrfToken(),
                                      }
                                    });
                                    
                                    if (!response.ok) throw new Error('Failed to delete HR user');
                                    
                                    // Refresh business details
                                    await fetchBusinessDetails(selectedBusiness.id);
                                    
                                    setSuccess('HR user deleted successfully');
                                    setTimeout(() => setSuccess(null), 3000);
                                  } catch (err) {
                                    setError(err.message);
                                  }
                                }}
                                onEditUser={async (userId, data) => {
                                  try {
                                    const response = await fetch(`/api/hr-users/${userId}/`, {
                                      method: 'PUT',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'X-CSRFToken': getCsrfToken(),
                                      },
                                      body: JSON.stringify(data)
                                    });
                                    
                                    if (!response.ok) throw new Error('Failed to update HR user');
                                    
                                    // Refresh business details
                                    await fetchBusinessDetails(selectedBusiness.id);
                                    
                                    setSuccess('HR user updated successfully');
                                    setTimeout(() => setSuccess(null), 3000);
                                  } catch (err) {
                                    setError(err.message);
                                  }
                                }}
                                onResetPassword={async (userId) => {
                                  try {
                                    const response = await fetch(`/api/hr-users/${userId}/reset-password/`, {
                                      method: 'POST',
                                      headers: {
                                        'X-CSRFToken': getCsrfToken(),
                                      }
                                    });
                                    
                                    if (!response.ok) throw new Error('Failed to reset password');
                                    
                                    setSuccess('Password reset email sent successfully');
                                    setTimeout(() => setSuccess(null), 3000);
                                  } catch (err) {
                                    setError(err.message);
                                  }
                                }}
                              />
                            )
                          )}
                        </div>
                      )}

                      {/* Assessment Pairs Section */}
                      {moduleVisibility.questionPairsModule && (
                        <div className="bg-gray-50 p-6 rounded-lg">
                        <div className="flex justify-between items-center mb-4">
                          <h2 className="text-xl font-semibold">Assessment Pairs</h2>
                          <label className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer">
                            Upload CSV
                            <input
                              type="file"
                              accept=".csv"
                              onChange={handleAssessmentTemplateUpload}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {businessDetails.question_pairs.length === 0 ? (
                          <p className="text-gray-500">No assessment pairs found</p>
                        ) : (
                          <QuestionPairManager
                            questionPairs={businessDetails.question_pairs}
                            onDeletePair={async (pairId) => {
                              try {
                                const response = await fetch(`/api/question-pairs/${pairId}/`, {
                                  method: 'DELETE',
                                  headers: {
                                    'X-CSRFToken': getCsrfToken(),
                                  }
                                });
                                
                                if (!response.ok) throw new Error('Failed to delete question pair');
                                
                                // Refresh business details
                                await fetchBusinessDetails(selectedBusiness.id);
                                
                                setSuccess('Question pair deleted successfully');
                                setTimeout(() => setSuccess(null), 3000);
                              } catch (err) {
                                setError(err.message);
                              }
                            }}
                            onEditPair={async (pairId, data) => {
                              try {
                                const response = await fetch(`/api/question-pairs/${pairId}/`, {
                                  method: 'PUT',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'X-CSRFToken': getCsrfToken(),
                                  },
                                  body: JSON.stringify(data)
                                });
                                
                                if (!response.ok) throw new Error('Failed to update question pair');
                                
                                // Refresh business details
                                await fetchBusinessDetails(selectedBusiness.id);
                                
                                setSuccess('Question pair updated successfully');
                                setTimeout(() => setSuccess(null), 3000);
                              } catch (err) {
                                setError(err.message);
                              }
                            }}
                          />
                        )}
                        </div>
                      )}
                        
                      
                    </div>
                    {/* Manager Section */}
                      {moduleVisibility.managersModule && (
                        <div className="bg-gray-50 p-6 rounded-lg mt-8 w-full">
                          <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Managers</h2>
                            <button 
                              onClick={() => setShowAddManagerModal(true)}
                              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              Add Manager
                            </button>
                          </div>
                          
                          {managers.length === 0 ? (
                            <p className="text-gray-500">No managers found</p>
                          ) : (
                            <div className="overflow-x-auto w-full">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Region
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Position
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Default
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {managers.map((manager) => (
                                    <tr key={manager.id}>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        {manager.name}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        {manager.email}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        {manager.region}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        {manager.position}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        {manager.is_default ? (
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Yes
                                          </span>
                                        ) : (
                                          <span className="text-gray-400">No</span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button 
                                          onClick={() => {
                                            setCurrentManager(manager);
                                            setShowEditManagerModal(true);
                                          }}
                                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                                        >
                                          Edit
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteManager(manager.id)}
                                          className="text-red-600 hover:text-red-900"
                                        >
                                          Delete
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                  )}
                  {/* Add BenchmarkSection here, right after the grid */}
                  {moduleVisibility.benchmarkModule && (
                    <BenchmarkSection businessDetails={businessDetails} />
                  )}
                  
                  {moduleVisibility.assessmentModule && (
                    <AssessmentSection businessDetails={businessDetails} />
                  )}

              </div>
            )}
          </div>
        </div>
      );
    }
  };

  // If loading, show loading state
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <AdminNavbar 
        activeTab={activeTab} 
        onTabChange={(tab) => setActiveTab(tab)} 
      />

      <div className="flex-1">
        {/* Content area */}
        {renderContent()}
      </div>

      {/* Business Form Modal */}
      {showBusinessForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-2xl font-bold mb-6">Create New Business</h2>
            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={newBusinessData.name}
                  onChange={(e) => setNewBusinessData({
                    ...newBusinessData,
                    name: e.target.value
                  })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              
              <div className="flex items-center space-x-4 my-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={newBusinessData.useColor}
                    onChange={() => setNewBusinessData({
                      ...newBusinessData,
                      useColor: true,
                      logo: null
                    })}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2">Use Primary Color</span>
                </label>
                
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={!newBusinessData.useColor}
                    onChange={() => setNewBusinessData({
                      ...newBusinessData,
                      useColor: false
                    })}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2">Upload Logo</span>
                </label>
              </div>
              
              {newBusinessData.useColor ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Color
                  </label>
                  <input
                    type="color"
                    value={newBusinessData.primaryColor}
                    onChange={(e) => setNewBusinessData({
                      ...newBusinessData,
                      primaryColor: e.target.value
                    })}
                    className="w-full p-1 border rounded"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Logo
                  </label>
                  <div className="mt-1 flex items-center">
                    <label className="w-full flex justify-center px-4 py-2 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:bg-gray-50">
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <span>{newBusinessData.logo ? newBusinessData.logo.name : 'Select a logo file'}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF up to 2MB
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setNewBusinessData({
                              ...newBusinessData,
                              logo: file
                            });
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowBusinessForm(false)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Create Business
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add HR User Modal */}
      {showAddHRUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-2xl font-bold mb-6">Add HR User</h2>
            <form onSubmit={handleAddHRUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newHRUser.email}
                  onChange={(e) => setNewHRUser({...newHRUser, email: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={newHRUser.first_name}
                  onChange={(e) => setNewHRUser({...newHRUser, first_name: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={newHRUser.last_name}
                  onChange={(e) => setNewHRUser({...newHRUser, last_name: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={newHRUser.password}
                  onChange={(e) => setNewHRUser({...newHRUser, password: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAddHRUserModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Business Confirmation Modal */}
      {showDeleteBusinessConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md">
            <h2 className="text-xl font-bold text-red-600 mb-4">Confirm Business Deletion</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete the business "{selectedBusiness.name}"? 
              This action cannot be undone and will remove all associated data.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteBusinessConfirmation(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBusiness}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete Business
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Manager Modal */}
      {showAddManagerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Add Manager</h2>
            <form onSubmit={handleAddManager} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newManager.name}
                    onChange={(e) => setNewManager({...newManager, name: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newManager.email}
                    onChange={(e) => setNewManager({...newManager, email: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region
                  </label>
                  <input
                    type="text"
                    value={newManager.region}
                    onChange={(e) => setNewManager({...newManager, region: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    value={newManager.position}
                    onChange={(e) => setNewManager({...newManager, position: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              
              
              <div className="flex items-center mt-4">
                <input
                  id="is_default"
                  type="checkbox"
                  checked={newManager.is_default}
                  onChange={(e) => setNewManager({...newManager, is_default: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900">
                  Default Manager (automatically receives all assessment notifications)
                </label>
              </div>

              <div className="flex justify-end space-x-4 pt-4 mt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddManagerModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add Manager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Manager Modal */}
      {showEditManagerModal && currentManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Edit Manager</h2>
            <form onSubmit={handleEditManager} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={currentManager.name}
                    onChange={(e) => setCurrentManager({...currentManager, name: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={currentManager.email}
                    onChange={(e) => setCurrentManager({...currentManager, email: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region
                  </label>
                  <input
                    type="text"
                    value={currentManager.region}
                    onChange={(e) => setCurrentManager({...currentManager, region: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    value={currentManager.position}
                    onChange={(e) => setCurrentManager({...currentManager, position: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
              
              <div className="flex items-center mt-4">
                <input
                  id="edit_is_default"
                  type="checkbox"
                  checked={currentManager.is_default || false}
                  onChange={(e) => setCurrentManager({...currentManager, is_default: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="edit_is_default" className="ml-2 block text-sm text-gray-900">
                  Default Manager (automatically receives all assessment notifications)
                </label>
              </div>

              <div className="flex justify-end space-x-4 pt-4 mt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditManagerModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Update Manager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md">
            <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
            <p className="text-gray-700 mb-6">{error}</p>
            <button
              onClick={() => setError(null)}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;