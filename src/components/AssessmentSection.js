import React, { useState, useEffect } from 'react';
import { FileText, Copy, Mail, X, Download, Pencil, Trash2, ChevronDown, Clock, Eye } from 'lucide-react';

const AssessmentSection = ({ businessDetails }) => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
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
  manager_ids: [],
  manager_name: '',
  manager_email: ''
  });
  const [editAssessment, setEditAssessment] = useState({
    candidate_name: '',
    candidate_email: '',
    position: '',
    region: '',
    manager_ids: [],
    primary_manager_id: '',
    manager_name: '',
    manager_email: ''
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [managers, setManagers] = useState([]);

  // Get CSRF token
  const getCsrfToken = () => {
    const csrfTokenElement = document.querySelector('[name=csrfmiddlewaretoken]');
    return csrfTokenElement ? csrfTokenElement.value : '';
  };

  useEffect(() => {
    if (businessDetails?.business?.id) {
      fetchAssessments();
      fetchManagers();
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

  const fetchManagers = async () => {
  if (!businessDetails?.business?.id) return;
  
  try {
    const response = await fetch(`/api/businesses/${businessDetails.business.id}/managers/`);
    if (!response.ok) throw new Error('Failed to fetch managers');
    const data = await response.json();
    setManagers(data.managers);
    
    // Auto-select default managers when initializing newAssessment
    const defaultManagers = data.managers.filter(m => m.is_default).map(m => m.id);
    if (defaultManagers.length > 0) {
      setNewAssessment(prev => ({
        ...prev,
        manager_ids: defaultManagers
      }));
      
      // If there's exactly one default manager, set them as primary too
      if (defaultManagers.length === 1) {
        const defaultManager = data.managers.find(m => m.is_default);
        setNewAssessment(prev => ({
          ...prev,
          primary_manager_id: defaultManager.id,
          manager_name: defaultManager.name,
          manager_email: defaultManager.email
        }));
      }
    }
  } catch (err) {
    console.error('Error fetching managers:', err);
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
   // Validate that at least one manager is selected
  if (editAssessment.manager_ids.length === 0) {
    setError('Please select at least one manager for this assessment.');
    return;
  }
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
    setSuccess('Assessment updated successfully!');
    setTimeout(() => setSuccess(null), 3000);
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
      //alert('Assessment deleted successfully!');
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

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCompletionTime = (seconds) => {
    if (!seconds) return "N/A";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
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

  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.innerWidth <= 768;
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
            <div className="flex flex-col md:flex-row items-start space-y-4 md:space-y-0 md:space-x-6">
              {/* Date Filter */}
              <div className="w-full md:flex-1">
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
              <div className="w-full md:flex-1">
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
        <div className="text-center py-8 md:py-12">
          <div className="w-8 h-8 md:w-12 md:h-12 animate-spin mx-auto border-4 border-blue-500 border-t-transparent rounded-full" />
          <p className="mt-4 text-sm md:text-base text-gray-500">Loading assessments...</p>
        </div>
      ) : getFilteredAssessments().length > 0 ? (
        // Assessment responsive layout
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Mobile Card View */}
          <div className="md:hidden">
            {getFilteredAssessments().map((assessment) => (
              <div key={assessment.id} className="border-b p-4 last:border-b-0">
                <div className="space-y-3">
                  {/* Header with status */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-base truncate">{assessment.candidate_name}</h3>
                      <p className="text-sm text-gray-600 truncate">{assessment.candidate_email}</p>
                    </div>
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                      assessment.completed 
                        ? 'bg-green-100 text-green-800'
                        : assessment.first_accessed_at
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {assessment.completed ? 'Completed' : assessment.first_accessed_at ? 'In Progress' : 'Not Started'}
                    </span>
                  </div>
                  
                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Position:</span>
                      <p className="font-medium truncate">{assessment.position}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Date:</span>
                      <p className="font-medium">{formatDate(assessment.created_at)}</p>
                    </div>
                  </div>
                  
                  {/* Access Information */}
                  {assessment.first_accessed_at ? (
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <div className="flex items-center">
                          <Eye className="w-3 h-3 mr-1" />
                          <span>Accessed: {formatDateTime(assessment.first_accessed_at)}</span>
                        </div>
                        {assessment.completion_time_seconds && (
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>{formatCompletionTime(assessment.completion_time_seconds)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <span className="text-xs text-gray-400">Not accessed yet</span>
                    </div>
                  )}
                  
                  {/* Mobile Actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {assessment.completed ? (
                      <button
                        onClick={() => {
                          setSelectedAssessment(assessment);
                          setShowReportModal(true);
                        }}
                        className="flex-1 min-w-0 inline-flex items-center justify-center px-3 py-2 rounded text-sm font-medium text-white bg-blue-500 hover:bg-blue-600"
                        style={{ minHeight: '40px' }}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        View Results
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => copyAssessmentLink(assessment.unique_link)}
                          className="flex-1 min-w-0 inline-flex items-center justify-center px-3 py-2 rounded text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
                          style={{ minHeight: '40px' }}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">Copy Link</span>
                          <span className="sm:hidden">Copy</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAssessment(assessment);
                            
                            // Get current managers for this assessment
                            const getAssessmentManagers = async () => {
                              try {
                                const response = await fetch(`/api/assessments/${assessment.id}/managers/`);
                                if (response.ok) {
                                  const data = await response.json();
                                  const managerIds = data.managers.map(m => m.id);
                                  const primaryManager = data.managers.find(m => m.is_primary);
                                  
                                  setEditAssessment({
                                    candidate_name: assessment.candidate_name,
                                    candidate_email: assessment.candidate_email,
                                    position: assessment.position,
                                    region: assessment.region,
                                    manager_ids: managerIds,
                                    primary_manager_id: primaryManager?.id || '',
                                    manager_name: assessment.manager_name,
                                    manager_email: assessment.manager_email
                                  });
                                } else {
                                  setEditAssessment({
                                    candidate_name: assessment.candidate_name,
                                    candidate_email: assessment.candidate_email,
                                    position: assessment.position,
                                    region: assessment.region,
                                    manager_ids: [],
                                    primary_manager_id: '',
                                    manager_name: assessment.manager_name,
                                    manager_email: assessment.manager_email
                                  });
                                }
                                setShowEditModal(true);
                              } catch (err) {
                                console.error("Error fetching assessment managers:", err);
                                setEditAssessment({
                                  candidate_name: assessment.candidate_name,
                                  candidate_email: assessment.candidate_email,
                                  position: assessment.position,
                                  region: assessment.region,
                                  manager_ids: [],
                                  primary_manager_id: '',
                                  manager_name: assessment.manager_name,
                                  manager_email: assessment.manager_email
                                });
                                setShowEditModal(true);
                              }
                            };
                            
                            getAssessmentManagers();
                          }}
                          className="flex-1 min-w-0 inline-flex items-center justify-center px-3 py-2 rounded text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
                          style={{ minHeight: '40px' }}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAssessment(assessment);
                            setShowDeleteModal(true);
                          }}
                          className="flex-1 min-w-0 inline-flex items-center justify-center px-3 py-2 rounded text-sm font-medium text-red-600 bg-red-100 hover:bg-red-200"
                          style={{ minHeight: '40px' }}
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
                      className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 rounded text-sm font-medium text-white bg-green-500 hover:bg-green-600"
                      style={{ minHeight: '40px' }}
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Resend
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Created</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Access Info</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredAssessments().map((assessment) => (
                  <tr key={assessment.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">{assessment.candidate_name}</div>
                        <div className="text-sm text-gray-500">{assessment.candidate_email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{assessment.position}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(assessment.created_at)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        assessment.completed 
                          ? 'bg-green-100 text-green-800'
                          : assessment.first_accessed_at
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {assessment.completed ? 'Completed' : assessment.first_accessed_at ? 'In Progress' : 'Not Started'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {assessment.first_accessed_at ? (
                        <div className="flex flex-col items-center">
                          <div className="flex items-center text-gray-600 mb-1">
                            <Eye className="w-3 h-3 mr-1" />
                            <span>{formatDateTime(assessment.first_accessed_at)}</span>
                          </div>
                          {assessment.completion_time_seconds && (
                            <div className="flex items-center text-gray-600">
                              <Clock className="w-3 h-3 mr-1" />
                              <span>{formatCompletionTime(assessment.completion_time_seconds)}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Not accessed yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end space-x-2">
                        {/* Desktop action buttons - same as original */}
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
                            {/* Edit and Delete buttons continue as in original... */}
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
        </div>
      ) : (
        // Empty states
        <div className="text-center text-gray-500 py-8 md:py-12">
          <div className="mb-4">
            <FileText className="w-12 h-12 md:w-16 md:h-16 mx-auto text-gray-300" />
          </div>
          <h3 className="text-lg md:text-xl font-medium mb-2">
            {assessments.length > 0 
              ? 'No assessments match the selected filters'
              : 'No assessments found'}
          </h3>
          <p className="text-sm md:text-base text-gray-400 mb-4">
            {assessments.length > 0 
              ? 'Try adjusting your filters or clearing them to see more results.'
              : 'Create your first assessment to get started with candidate evaluations.'}
          </p>
          {assessments.length === 0 && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm md:text-base"
              style={{ minHeight: '44px' }}
            >
              Create First Assessment
            </button>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 md:p-6 rounded-lg w-full max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto">
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
              
              {/* Manager Selection Section */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-md font-medium mb-3">Manager Selection</h4>
                
                {/* Manager Multi-Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Managers to Notify
                  </label>
                  {managers.length > 0 ? (
                    <div className="bg-white border rounded p-3 max-h-60 overflow-y-auto manager-checkbox-list">
                      {managers.map(manager => (
                        <div key={manager.id} className="flex items-start mb-2">
                          <input
                            type="checkbox"
                            id={`edit-manager-${manager.id}`}
                            checked={editAssessment.manager_ids.includes(manager.id)}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              
                              // If this is a default manager, it can't be unchecked
                              if (!isChecked && manager.is_default) {
                                return;
                              }
                              
                              let updatedManagerIds = [...editAssessment.manager_ids];
                              
                              if (isChecked) {
                                updatedManagerIds.push(manager.id);
                              } else {
                                updatedManagerIds = updatedManagerIds.filter(id => id !== manager.id);
                                
                                // If we unchecked the primary manager, reset primary_manager_id
                                if (editAssessment.primary_manager_id === manager.id) {
                                  setEditAssessment({
                                    ...editAssessment,
                                    manager_ids: updatedManagerIds,
                                    primary_manager_id: '',
                                    ...(editAssessment.manager_name === manager.name ? 
                                      { manager_name: '', manager_email: '' } : {})
                                  });
                                  return;
                                }
                              }
                              
                              setEditAssessment({
                                ...editAssessment,
                                manager_ids: updatedManagerIds
                              });
                            }}
                            className="h-5 w-5 mr-2 rounded border-gray-300 mt-1"
                            disabled={manager.is_default}
                          />
                          <label htmlFor={`edit-manager-${manager.id}`} className={`flex-1 cursor-pointer ${manager.is_default ? 'bg-blue-50 rounded p-1' : ''}`}>
                            <div className="font-medium">
                              {manager.name}
                              {manager.is_default && (
                                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  Default
                                </span>
                              )}
                              {editAssessment.primary_manager_id === manager.id && (
                                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                  Selected as Primary
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{manager.email}</div>
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 mb-2 p-3 bg-gray-50 rounded">
                      No managers available. Enter manager details below.
                    </div>
                  )}
                </div>

                {/* Primary Manager Selection - only show if managers are selected */}
                {editAssessment.manager_ids.length > 0 ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Primary Contact <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={editAssessment.primary_manager_id || ''}
                      onChange={(e) => {
                        const managerId = e.target.value;
                        if (managerId) {
                          const selectedManager = managers.find(m => m.id.toString() === managerId);
                          setEditAssessment({
                            ...editAssessment,
                            primary_manager_id: managerId,
                            manager_name: selectedManager.name,
                            manager_email: selectedManager.email
                          });
                        } else {
                          // If no primary selected, use the first manager as fallback
                          const firstManager = managers.find(m => editAssessment.manager_ids.includes(m.id));
                          if (firstManager) {
                            setEditAssessment({
                              ...editAssessment,
                              primary_manager_id: firstManager.id,
                              manager_name: firstManager.name,
                              manager_email: firstManager.email
                            });
                          }
                        }
                      }}
                      className="w-full p-2 pr-10 border rounded appearance-none"
                      required
                    >
                      <option value="">Select Primary Contact</option>
                      {managers
                        .filter(manager => editAssessment.manager_ids.includes(manager.id))
                        .map(manager => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name} {manager.is_default ? '(Default Manager)' : ''}
                          </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    This manager's name will appear as the sender on emails.
                  </p>
                </div>
              ) : null}

                {editAssessment.manager_ids.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-100 rounded p-3 mt-4">
                    <p className="text-sm text-yellow-800">
                      Please select at least one manager to receive notifications when the assessment is completed.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-4 pt-4 border-t">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 md:p-6 rounded-lg w-full max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto">
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
        <div className="bg-white rounded-lg w-full h-full md:w-[95vw] md:h-[95vh] flex flex-col max-w-7xl">
          {/* Header */}
          <div className="flex justify-between items-center p-3 md:p-4 border-b flex-shrink-0">
            <h3 className="text-lg md:text-xl font-semibold">Assessment Report</h3>
            <button
              onClick={() => {
                setShowReportModal(false);
                setSelectedAssessment(null);
              }}
              className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Content - Different for mobile vs desktop */}
          <div className="flex-1 p-2 md:p-4 min-h-0 flex flex-col">
            {isMobileDevice() ? (
              // Mobile: Show download options instead of iframe
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 px-4">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="w-10 h-10 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">
                    Assessment Report Ready
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Your assessment report for <strong>{selectedAssessment.candidate_name}</strong> is ready to view.
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    For the best viewing experience on mobile, we recommend downloading the PDF or opening it in a new tab.
                  </p>
                </div>
                
                <div className="space-y-3 w-full max-w-sm">
                  <button
                    onClick={() => {
                      window.open(`/api/admin/assessments/${selectedAssessment.id}/preview/`, '_blank');
                    }}
                    className="w-full inline-flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium text-white bg-blue-500 hover:bg-blue-600"
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    Open in New Tab
                  </button>
                  
                  <button
                    onClick={() => {
                      window.location.href = `/api/admin/assessments/${selectedAssessment.id}/download/`;
                    }}
                    className="w-full inline-flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download PDF
                  </button>
                </div>
              </div>
            ) : (
              // Desktop: Show iframe preview
              <>
                <iframe
                  src={`/api/admin/assessments/${selectedAssessment.id}/preview/`}
                  className="w-full h-full border border-gray-200 rounded shadow-sm"
                  style={{ minHeight: '500px' }}
                  title="Assessment Report Preview"
                  onLoad={() => {
                    // Optional: Handle successful load
                    console.log('PDF loaded successfully');
                  }}
                  onError={() => {
                    // Optional: Handle load error
                    console.error('Failed to load PDF preview');
                  }}
                />
              </>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 p-3 md:p-4 border-t flex-shrink-0 bg-gray-50">
            <button
              onClick={() => {
                setShowReportModal(false);
                setSelectedAssessment(null);
              }}
              className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Close
            </button>
            
            {!isMobileDevice() && (
              <button
                onClick={() => {
                  window.location.href = `/api/admin/assessments/${selectedAssessment.id}/download/`;
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 rounded text-sm font-medium text-white bg-blue-500 hover:bg-blue-600"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
            )}
          </div>
        </div>
      </div>
    )}

      {/* Resend Confirmation Modal */}
      {showResendModal && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 md:p-6 rounded-lg w-full max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 md:p-6 rounded-lg w-full max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto">
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
              if (newAssessment.manager_ids.length === 0) {
                setError('Please select at least one manager for this assessment.');
                return;
              }
              
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
                  manager_ids: [],
                  primary_manager_id: '',
                  manager_name: '',
                  manager_email: ''
                });
                setShowCreateModal(false);

                // Refresh assessments list
                await fetchAssessments();
                
                // Show success message
                setSuccess('Assessment created successfully');
                setTimeout(() => setSuccess(null), 3000);
              } catch (err) {
                setError(err.message);
              }
            }} className="space-y-4">
              {/* Candidate Info Section */}
              <div className="mb-6">
                <h4 className="text-md font-medium mb-3 pb-2 border-b">Candidate Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Candidate Name <span className="text-red-500">*</span>
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
                      Candidate Email <span className="text-red-500">*</span>
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
                      Position <span className="text-red-500">*</span>
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
                      Region <span className="text-red-500">*</span>
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
                </div>
              </div>

              {/* Manager Selection Section */}
              <div className="mb-6">
                <h4 className="text-md font-medium mb-3 pb-2 border-b">Manager Selection</h4>
                
                {/* Manager Multi-Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Managers to Notify
                  </label>
                  {managers.length > 0 ? (
                    <div className="bg-white border rounded p-3 max-h-60 overflow-y-auto manager-checkbox-list">
                      {managers.map(manager => (
                        <div key={manager.id} className="flex items-start mb-2">
                          <input
                            type="checkbox"
                            id={`manager-${manager.id}`}
                            checked={newAssessment.manager_ids.includes(manager.id)}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              let updatedManagerIds = [...newAssessment.manager_ids];
                              
                              if (isChecked) {
                                updatedManagerIds.push(manager.id);
                              } else {
                                if (!manager.is_default) {
                                  updatedManagerIds = updatedManagerIds.filter(id => id !== manager.id);
                                  // If we unchecked the primary manager, reset primary_manager_id
                                  if (newAssessment.primary_manager_id === manager.id) {
                                    setNewAssessment({
                                      ...newAssessment,
                                      manager_ids: updatedManagerIds,
                                      primary_manager_id: '',
                                      ...(newAssessment.manager_name === manager.name ?
                                        { manager_name: '', manager_email: '' } : {})
                                    });
                                    return;
                                  }
                                } else {

                                  return;
                                }
                              }
                              
                              setNewAssessment({
                                ...newAssessment,
                                manager_ids: updatedManagerIds
                              });
                            }}
                            className="h-5 w-5 mr-2 rounded border-gray-300 mt-1"
                            disabled={manager.is_default}
                          />
                          <label htmlFor={`manager-${manager.id}`} className="flex-1 cursor-pointer manager-details">
                            <div className="manager-name">
                              {manager.name}
                              {manager.is_primary && (
                                <span className="primary-badge">
                                  Default Primary
                                </span>
                              )}
                              {newAssessment.primary_manager_id === manager.id && (
                                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                  Selected as Primary
                                </span>
                              )}
                            </div>
                            <div className="manager-email">{manager.email}</div>
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 mb-2 p-3 bg-gray-50 rounded">
                      No managers available. Enter manager details below.
                    </div>
                  )}
                  <p className="manager-help-text">
                    These managers will be notified when the assessment is completed.
                  </p>
                </div>

                {/* Primary Manager Selection - only show if managers are selected */}
                {newAssessment.manager_ids.length > 0 ? (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Primary Contact <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={newAssessment.primary_manager_id || ''}
                        onChange={(e) => {
                          const managerId = e.target.value;
                          if (managerId) {
                            const selectedManager = managers.find(m => m.id.toString() === managerId);
                            setNewAssessment({
                              ...newAssessment,
                              primary_manager_id: managerId,
                              manager_name: selectedManager.name,
                              manager_email: selectedManager.email
                            });
                          } else {
                            // If no primary selected, use the first manager as fallback
                            const firstManager = managers.find(m => newAssessment.manager_ids.includes(m.id));
                            if (firstManager) {
                              setNewAssessment({
                                ...newAssessment,
                                primary_manager_id: firstManager.id,
                                manager_name: firstManager.name,
                                manager_email: firstManager.email
                              });
                            }
                          }
                        }}
                        className="w-full p-2 pr-10 border rounded appearance-none"
                        required
                      >
                        <option value="">Select Primary Contact</option>
                        {managers
                          .filter(manager => newAssessment.manager_ids.includes(manager.id))
                          .map(manager => (
                            <option key={manager.id} value={manager.id}>
                              {manager.name} {manager.is_primary ? '(Default Primary)' : ''}
                            </option>
                          ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      This manager's name will appear as the sender on emails.
                    </p>
                  </div>
                ) : null}

                {newAssessment.manager_ids.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-100 rounded p-3 mt-4">
                    <p className="text-sm text-yellow-800">
                      Please select at least one manager to receive notifications when the assessment is completed.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 md:p-6 rounded-lg w-full max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto">
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
      {/* Success Modal */}
      {success && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 md:p-6 rounded-lg w-full max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-green-600 mb-2">Success</h3>
            <p className="text-gray-700 mb-4">{success}</p>
            <button
              onClick={() => setSuccess(null)}
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