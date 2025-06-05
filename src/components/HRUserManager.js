import React, { useState } from 'react';
import { Pencil, Trash2, KeyRound, X } from 'lucide-react';

const HRUserManager = ({ hrUsers, onDeleteUser, onEditUser, onResetPassword }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    email: '',
    first_name: '',
    last_name: ''
  });

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditForm({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    await onEditUser(editingUser.id, editForm);
    setShowEditModal(false);
  };

  return (
    <div className="space-y-2">
      {/* Empty State */}
      {hrUsers.length === 0 ? (
        <div className="text-center text-gray-500 py-6 md:py-8">
          <div className="mb-4">
            <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h3 className="text-lg md:text-xl font-medium mb-2">No HR Users Found</h3>
          <p className="text-sm md:text-base text-gray-400">Add your first HR user to get started.</p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {hrUsers.map((user) => (
              <div key={user.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="space-y-3">
                  {/* Header with status */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-base truncate">{user.email}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {user.first_name || user.last_name ? (
                          `${user.first_name} ${user.last_name}`.trim()
                        ) : (
                          <span className="text-gray-400 italic">No name provided</span>
                        )}
                      </p>
                    </div>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  {/* Mobile Action Buttons */}
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => handleEditClick(user)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                      style={{ minHeight: '40px' }}
                    >
                      <Pencil size={16} className="mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => onResetPassword(user.id)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded text-sm font-medium text-yellow-600 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200"
                      style={{ minHeight: '40px' }}
                    >
                      <KeyRound size={16} className="mr-1" />
                      Reset
                    </button>
                    <button
                      onClick={() => onDeleteUser(user.id)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200"
                      style={{ minHeight: '40px' }}
                    >
                      <Trash2 size={16} className="mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
  
          {/* Desktop List View */}
          <div className="hidden md:block space-y-2">
            {hrUsers.map((user) => (
              <div 
                key={user.id} 
                className="flex justify-between items-center p-3 md:p-4 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 truncate">{user.email}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {user.first_name || user.last_name ? (
                          `${user.first_name} ${user.last_name}`.trim()
                        ) : (
                          <span className="text-gray-400 italic">No name provided</span>
                        )}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleEditClick(user)}
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                    title="Edit User"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => onResetPassword(user.id)}
                    className="p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded-full transition-colors"
                    title="Reset Password"
                  >
                    <KeyRound size={18} />
                  </button>
                  <button
                    onClick={() => onDeleteUser(user.id)}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                    title="Delete User"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
  
      {/* Edit Modal - Mobile Responsive */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 md:p-6 rounded-lg w-full max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold">Edit HR User</h2>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="w-full p-2 md:p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="user@company.com"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                    className="w-full p-2 md:p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="John"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                    className="w-full p-2 md:p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Doe"
                  />
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 md:p-4 rounded-md">
                <p className="text-sm text-gray-600">
                  <strong>Note:</strong> Changes to email or name will take effect immediately. 
                  Use the "Reset Password" button to send a password reset email to the user.
                </p>
              </div>
              
              <div className="flex flex-col md:flex-row justify-end space-y-2 md:space-y-0 md:space-x-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="w-full md:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                  style={{ minHeight: '44px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full md:w-auto px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  style={{ minHeight: '44px' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRUserManager;