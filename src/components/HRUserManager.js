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
      {hrUsers.map((user) => (
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
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleEditClick(user)}
              className="p-1 text-blue-600 hover:text-blue-800"
              title="Edit"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => onDeleteUser(user.id)}
              className="p-1 text-red-600 hover:text-red-800"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={() => onResetPassword(user.id)}
              className="p-1 text-yellow-600 hover:text-yellow-800"
              title="Reset Password"
            >
              <KeyRound size={16} />
            </button>
            <span 
              className={`px-2 py-1 rounded text-xs ${
                user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {user.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      ))}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit HR User</h2>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
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
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                  className="w-full p-2 border rounded"
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
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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