import React, { useState, useEffect } from 'react';
import { FileText, Copy, Mail, X, Download, Pencil, Trash2 } from 'lucide-react';

const AssessmentSection = ({ businessDetails }) => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: {
      start: '',
      end: ''
    },
    status: 'all'
  });
  const [activeFilters, setActiveFilters] = useState({
    date: false,
    status: false
  });
  const [newAssessment, setNewAssessment] = useState({
    candidate_name: '',
    candidate_email: '',
    position: '',
    region: '',
    manager_name: '',
    manager_email: ''
  });
  const [editAssessment, setEditAssessment] = useState({
    candidate_name: '',
    candidate_email: '',
    position: '',
    region: '',
    manager_name: '',
    manager_email: ''
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);

  // Get CSRF token
  const getCsrfToken = () => {
    const csrfTokenElement = document.querySelector('[name=csrfmiddlewaretoken]');
    return csrfTokenElement ? csrfTokenElement.value : '';
  };

  useEffect(() => {
    if (businessDetails?.business?.id) {
      fetchAssessments();
    }
  }, [businessDetails?.business?.id]);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/businesses/${businessDetails.business.id}/assessments/`);
      if (!response.ok) throw new Error('Failed to fetch assessments');
      const data = await response.json();
      // Filter out benchmark assessments
      const standardAssessments = data.assessments.filter(a => a.assessment_type === 'standard');
      setAssessments(standardAssessments);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyAssessmentLink = (uniqueLink) => {
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}/assessment/${uniqueLink}/`;
    
    navigator.clipboard.writeText(fullUrl)
      .then(() => {
        alert('Assessment link copied to clipboard!');
      })
      .catch(() => {
        alert('Failed to copy assessment link. Please try again.');
      });
  };

  const handleResendAssessment = async (assessment) => {
    try {
      const response = await fetch(`/api/admin/assessments/${assessment.id}/resend/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        }
      });
      
      if (!response.ok) throw new Error('Failed to resend assessment');
      
      await fetchAssessments();
      setShowResendModal(false);
      alert('Assessment has been resent successfully!');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditAssessment = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/assessments/${selectedAssessment.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify(editAssessment)
      });

      if (!response.ok) throw new Error('Failed to update assessment');

      await fetchAssessments();
      setShowEditModal(false);
      setSelectedAssessment(null);
      alert('Assessment updated successfully!');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteAssessment = async () => {
    try {
      const response = await fetch(`/api/assessments/${selectedAssessment.id}/`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': getCsrfToken(),
        }
      });

      if (!response.ok) throw new Error('Failed to delete assessment');

      await fetchAssessments();
      setShowDeleteModal(false);
      setSelectedAssessment(null);
      alert('Assessment deleted successfully!');
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFilteredAssessments = () => {
    return assessments.filter(assessment => {
      // Date filter
      if (activeFilters.date && filters.dateRange.start && filters.dateRange.end) {
        const assessmentDate = new Date(assessment.created_at);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        endDate.setHours(23, 59, 59);
        
        if (assessmentDate < startDate || assessmentDate > endDate) {
          return false;
        }
      }

      // Status filter
      if (activeFilters.status && filters.status !== 'all') {
        if (filters.status === 'completed' && !assessment.completed) {
          return false;
        }
        if (filters.status === 'pending' && assessment.completed) {
          return false;
        }
      }

      return true;
    });
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg mt-8">
      {/* Header section */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Assessments</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 inline-flex items-center"
        >
          Create New Assessment
        </button>
      </div>

      {/* Filters Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          {showFilters && (
            <button
              onClick={() => {
                setFilters({
                  dateRange: { start: '', end: '' },
                  status: 'all'
                });
                setActiveFilters({ date: false, status: false });
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear All Filters
            </button>
          )}
        </div>

        {showFilters && (
          <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
            <div className="flex items-start space-x-6">
              {/* Date Filter */}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    checked={activeFilters.date}
                    onChange={(e) => setActiveFilters({
                      ...activeFilters,
                      date: e.target.checked
                    })}
                    className="rounded border-gray-300"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Filter by Date
                  </label>
                </div>
                <div className="flex space-x-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={filters.dateRange.start}
                      onChange={(e) => setFilters({
                        ...filters,
                        dateRange: {
                          ...filters.dateRange,
                          start: e.target.value
                        }
                      })}
                      disabled={!activeFilters.date}
                      className="p-2 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={filters.dateRange.end}
                      onChange={(e) => setFilters({
                        ...filters,
                        dateRange: {
                          ...filters.dateRange,
                          end: e.target.value
                        }
                      })}
                      disabled={!activeFilters.date}
                      className="p-2 border rounded text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    checked={activeFilters.status}
                    onChange={(e) => setActiveFilters({
                      ...activeFilters,
                      status: e.target.checked
                    })}
                    className="rounded border-gray-300"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Filter by Status
                  </label>
                </div>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({
                    ...filters,
                    status: e.target.value
                  })}
                  disabled={!activeFilters.status}
                  className="w-full p-2 border rounded text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 animate-spin mx-auto border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : getFilteredAssessments().length > 0 ? (
        // Assessment table
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Candidate</th>
                <th className="px-4 py-2 text-left">Position</th>
                <th className="px-4 py-2 text-left">Date Created</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredAssessments().map((assessment) => (
                <tr key={assessment.id} className="border-t">
                  <td className="px-4 py-2">{assessment.candidate_name}</td>
                  <td className="px-4 py-2">{assessment.position}</td>
                  <td className="px-4 py-2">{formatDate(assessment.created_at)}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      assessment.completed 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {assessment.completed ? 'Completed' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end space-x-2">
                      {assessment.completed ? (
                        <button
                          onClick={() => {
                            setSelectedAssessment(assessment);
                            setShowReportModal(true);
                          }}
                          className="inline-flex items-center px-3 py-1 rounded text-sm font-medium text-white bg-blue-500 hover:bg-blue-600"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          View Results
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => copyAssessmentLink(assessment.unique_link)}
                            className="inline-flex items-center px-3 py-1 rounded text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Copy Link
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAssessment(assessment);
                              setEditAssessment({
                                candidate_name: assessment.candidate_name,
                                candidate_email: assessment.candidate_email,
                                position: assessment.position,
                                region: assessment.region,
                                manager_name: assessment.manager_name,
                                manager_email: assessment.manager_email
                              });
                              setShowEditModal(true);
                            }}
                            className="inline-flex items-center px-3 py-1 rounded text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
                          >
                            <Pencil className="w-4 h-4 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAssessment(assessment);
                              setShowDeleteModal(true);
                            }}
                            className="inline-flex items-center px-3 py-1 rounded text-sm font-medium text-red-600 bg-red-100 hover:bg-red-200"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          setSelectedAssessment(assessment);
                          setShowResendModal(true);
                        }}
                        className="inline-flex items-center px-3 py-1 rounded text-sm font-medium text-white bg-green-500 hover:bg-green-600"
                      >
                        <Mail className="w-4 h-4 mr-1" />
                        Resend
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          {assessments.length > 0 
            ? 'No assessments match the selected filters'
            : 'No assessments found'}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Edit Assessment</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAssessment(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleEditAssessment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Candidate Name
                </label>
                <input
                  type="text"
                  value={editAssessment.candidate_name}
                  onChange={(e) => setEditAssessment({
                    ...editAssessment,
                    candidate_name: e.target.value
                  })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Candidate Email
                </label>
                <input
                  type="email"
                  value={editAssessment.candidate_email}
                  onChange={(e) => setEditAssessment({
                    ...editAssessment,
                    candidate_email: e.target.value
                  })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  value={editAssessment.position}
                  onChange={(e) => setEditAssessment({
                    ...editAssessment,
                    position: e.target.value
                  })}
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
                  value={editAssessment.region}
                  onChange={(e) => setEditAssessment({
                    ...editAssessment,
                    region: e.target.value
                  })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manager Name
                </label>
                <input
                  type="text"
                  value={editAssessment.manager_name}
                  onChange={(e) => setEditAssessment({
                    ...editAssessment,
                    manager_name: e.target.value
                  })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manager Email
                </label>
                <input
                  type="email"
                  value={editAssessment.manager_email}
                  onChange={(e) => setEditAssessment({
                    ...editAssessment,
                    manager_email: e.target.value
                  })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedAssessment(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete the assessment for {selectedAssessment.candidate_name}? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAssessment(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAssessment}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete Assessment
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Report Preview Modal */}
      {showReportModal && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-11/12 h-5/6">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Assessment Report Preview</h3>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setSelectedAssessment(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 h-5/6">
              <iframe
                src={`/api/admin/assessments/${selectedAssessment.id}/preview/`}
                className="w-full h-full border-0"
              />
            </div>
            <div className="flex justify-end space-x-4 p-4 border-t">
              <button
                onClick={() => {
                  window.location.href = `/api/admin/assessments/${selectedAssessment.id}/download/`;
                }}
                className="inline-flex items-center px-4 py-2 rounded text-sm font-medium text-white bg-blue-500 hover:bg-blue-600"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resend Confirmation Modal */}
      {showResendModal && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Confirm Resend Assessment</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to resend the assessment link to {selectedAssessment.candidate_name}? 
              This will generate a new link and deactivate the old one.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowResendModal(false);
                  setSelectedAssessment(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResendAssessment(selectedAssessment)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Resend Assessment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Assessment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Create New Assessment</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const response = await fetch(`/api/businesses/${businessDetails.business.id}/create-assessment/`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken(),
                  },
                  body: JSON.stringify(newAssessment)
                });

                if (!response.ok) {
                  const data = await response.json();
                  throw new Error(data.error || 'Failed to create assessment');
                }

                // Reset form and close modal
                setNewAssessment({
                  candidate_name: '',
                  candidate_email: '',
                  position: '',
                  region: '',
                  manager_name: '',
                  manager_email: ''
                });
                setShowCreateModal(false);

                // Refresh assessments list
                await fetchAssessments();
              } catch (err) {
                setError(err.message);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Candidate Name
                </label>
                <input
                  type="text"
                  value={newAssessment.candidate_name}
                  onChange={(e) => setNewAssessment({
                    ...newAssessment,
                    candidate_name: e.target.value
                  })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Candidate Email
                </label>
                <input
                  type="email"
                  value={newAssessment.candidate_email}
                  onChange={(e) => setNewAssessment({
                    ...newAssessment,
                    candidate_email: e.target.value
                  })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  value={newAssessment.position}
                  onChange={(e) => setNewAssessment({
                    ...newAssessment,
                    position: e.target.value
                  })}
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
                  value={newAssessment.region}
                  onChange={(e) => setNewAssessment({
                    ...newAssessment,
                    region: e.target.value
                  })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manager Name
                </label>
                <input
                  type="text"
                  value={newAssessment.manager_name}
                  onChange={(e) => setNewAssessment({
                    ...newAssessment,
                    manager_name: e.target.value
                  })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manager Email
                </label>
                <input
                  type="email"
                  value={newAssessment.manager_email}
                  onChange={(e) => setNewAssessment({
                    ...newAssessment,
                    manager_email: e.target.value
                  })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Create Assessment
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
            <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
            <p className="text-gray-700 mb-4">{error}</p>
            <button
              onClick={() => setError(null)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentSection;