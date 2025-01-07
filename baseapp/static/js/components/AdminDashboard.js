// static/js/components/AdminDashboard.js
import React, { useState } from 'react';

const AdminDashboard = () => {
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [businessFormData, setBusinessFormData] = useState({
    name: '',
    slug: '',
    primaryColor: '#000000'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Get CSRF token from cookie
  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  const csrftoken = getCookie('csrftoken');

  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/businesses/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken,
        },
        body: JSON.stringify(businessFormData),
      });

      if (!response.ok) throw new Error('Failed to create business');

      const data = await response.json();
      setCurrentBusiness(data);
      setShowBusinessForm(false);
      setSuccess('Business created successfully!');
      setBusinessFormData({ name: '', slug: '', primaryColor: '#000000' });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFileUpload = async (e) => {
    if (!currentBusiness) {
      setError('Please create or select a business first');
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/question-pairs/import/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrftoken,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to import questions');

      const data = await response.json();
      setSuccess(data.message);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="mb-8">
        <button
          onClick={() => setShowBusinessForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create New Business
        </button>
      </div>

      {showBusinessForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Business</h2>
          <form onSubmit={handleCreateBusiness} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Business Name</label>
              <input
                type="text"
                value={businessFormData.name}
                onChange={(e) => setBusinessFormData({
                  ...businessFormData,
                  name: e.target.value,
                  slug: e.target.value.toLowerCase().replace(/\s+/g, '-')
                })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Primary Color</label>
              <input
                type="color"
                value={businessFormData.primaryColor}
                onChange={(e) => setBusinessFormData({
                  ...businessFormData,
                  primaryColor: e.target.value
                })}
                className="p-1 border rounded"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create Business
              </button>
              <button
                type="button"
                onClick={() => setShowBusinessForm(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {currentBusiness && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Upload Assessment Questions</h2>
            <div className="flex items-center gap-4">
              <label className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer">
                Upload CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <span className="text-sm text-gray-600">
                Upload the assessment questions CSV file
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;