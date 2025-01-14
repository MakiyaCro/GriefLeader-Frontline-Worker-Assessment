import React, { useState, useEffect } from 'react';
import BenchmarkSection from './BenchmarkSection';

const AdminDashboard = () => {
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
    primaryColor: '#000000'
  });
  const [newHRUser, setNewHRUser] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: ''
  });

  // Fetch businesses when component mounts
  useEffect(() => {
    fetchBusinesses();
  }, []);

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

  // Fetch business details
  const fetchBusinessDetails = async (businessId) => {
    try {
      const response = await fetch(`/api/businesses/${businessId}/details/`);
      if (!response.ok) throw new Error('Failed to fetch business details');
      const data = await response.json();
      setBusinessDetails(data);
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
      const response = await fetch('/api/businesses/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({
          name: newBusinessData.name,
          slug: newBusinessData.name.toLowerCase().replace(/\s+/g, '-'),
          primaryColor: newBusinessData.primaryColor
        }),
      });

      if (!response.ok) throw new Error('Failed to create business');

      const data = await response.json();
      
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
        primaryColor: '#000000'
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

  // If loading, show loading state
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen">
      {/* Business Sidebar */}
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
              <button 
                onClick={() => setShowDeleteBusinessConfirmation(true)}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 flex items-center"
              >
                Delete Business
              </button>
            </div>

            {/* Business Details */}
            {businessDetails && (
              <div className="grid grid-cols-2 gap-8">
                {/* HR Users Section */}
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
                  
                  {businessDetails.hr_users.length === 0 ? (
                    <p className="text-gray-500">No HR users found</p>
                  ) : (
                    <div className="space-y-2">
                      {businessDetails.hr_users.map((user) => (
                        <div 
                          key={user.id} 
                          className="flex justify-between items-center p-2 bg-white rounded shadow-sm"
                        >
                          <div>
                            <p className="font-medium">{user.email}</p>
                            <p className="text-sm text-gray-500">
                              {user.first_name} {user.last_name}
                            </p>
                          </div>
                          <span 
                            className={`px-2 py-1 rounded text-xs ${
                              user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assessment Pairs Section */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Assessment Pairs</h2>
                    <label 
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
                    >
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
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {businessDetails.question_pairs.map((pair) => (
                        <div 
                          key={pair.id} 
                          className="bg-white p-3 rounded shadow-sm"
                        >
                          <div className="flex justify-between mb-2">
                            <span className="font-medium text-blue-600">
                              {pair.attribute1__name}
                            </span>
                            <span className="font-medium text-blue-600">
                              {pair.attribute2__name}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <p className="text-sm text-gray-700">{pair.statement_a}</p>
                            <p className="text-sm text-gray-700">{pair.statement_b}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              )}
              {/* Add BenchmarkSection here, right after the grid */}
                <BenchmarkSection businessDetails={businessDetails} />  
          </div>
        )}
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