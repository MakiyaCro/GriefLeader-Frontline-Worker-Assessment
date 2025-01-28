import React, { useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';

const QuestionPairManager = ({ questionPairs, onDeletePair, onEditPair }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPair, setEditingPair] = useState(null);
  const [editForm, setEditForm] = useState({
    attribute1: '',
    attribute2: '',
    statement_a: '',
    statement_b: ''
  });

  const handleEditClick = (pair) => {
    setEditingPair(pair);
    setEditForm({
      attribute1: pair.attribute1__name,
      attribute2: pair.attribute2__name,
      statement_a: pair.statement_a,
      statement_b: pair.statement_b
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    await onEditPair(editingPair.id, editForm);
    setShowEditModal(false);
  };

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {questionPairs.map((pair) => (
        <div 
          key={pair.id} 
          className="bg-white p-3 rounded shadow-sm relative"
        >
          <div className="absolute top-3 right-3 flex space-x-2">
            <button
              onClick={() => handleEditClick(pair)}
              className="p-1 text-blue-600 hover:text-blue-800"
              title="Edit"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => onDeletePair(pair.id)}
              className="p-1 text-red-600 hover:text-red-800"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div className="flex justify-between mb-4 pr-16">
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

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Question Pair</h2>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Attribute 1
                  </label>
                  <input
                    type="text"
                    value={editForm.attribute1}
                    onChange={(e) => setEditForm({...editForm, attribute1: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Attribute 2
                  </label>
                  <input
                    type="text"
                    value={editForm.attribute2}
                    onChange={(e) => setEditForm({...editForm, attribute2: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Statement A
                </label>
                <textarea
                  value={editForm.statement_a}
                  onChange={(e) => setEditForm({...editForm, statement_a: e.target.value})}
                  className="w-full p-2 border rounded"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Statement B
                </label>
                <textarea
                  value={editForm.statement_b}
                  onChange={(e) => setEditForm({...editForm, statement_b: e.target.value})}
                  className="w-full p-2 border rounded"
                  rows={3}
                  required
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

export default QuestionPairManager;