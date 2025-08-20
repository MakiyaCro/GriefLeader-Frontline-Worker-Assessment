import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Papa from 'papaparse';
import { Send, RefreshCw, Edit, Trash2, Mail } from 'lucide-react';

const BenchmarkSection = ({ businessDetails }) => {
  const [activeTab, setActiveTab] = useState('template');
  const [benchmarkEmails, setBenchmarkEmails] = useState([]);
  const [newEmail, setNewEmail] = useState({ email: '', region: '' });
  const [benchmarkData, setBenchmarkData] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [regions, setRegions] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentEmail, setCurrentEmail] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState({
    subject: 'Benchmark Assessment for {{business_name}}',
    body: `Hello {{candidate_name}},

You have been selected to participate in a benchmark assessment for {{business_name}}.

Please click the following link to complete your assessment:
{{assessment_url}}

Thank you for your participation.

Best regards,
{{business_name}} Team`
  });
  const [templateSaved, setTemplateSaved] = useState(false);

  // Get CSRF token
  const getCsrfToken = () => {
    const csrfTokenElement = document.querySelector('[name=csrfmiddlewaretoken]');
    return csrfTokenElement ? csrfTokenElement.value : '';
  };

  // Fetch benchmark data on component mount
  useEffect(() => {
    if (businessDetails?.business?.id) {
      fetchBenchmarkData();
      fetchBenchmarkEmails();
      fetchEmailTemplate();
    }
  }, [businessDetails?.business?.id]);

  useEffect(() => {
    if (businessDetails?.business?.id && activeTab === 'results') {
      fetchBenchmarkData(selectedRegion);
    }
  }, [selectedRegion, businessDetails?.business?.id, activeTab]);

  // Fetch email template
  const fetchEmailTemplate = async () => {
    try {
      const response = await fetch(`/api/businesses/${businessDetails.business.id}/benchmark-email-template/`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.template) {
          setEmailTemplate(data.template);
        }
      }
    } catch (error) {
      console.error("Failed to fetch email template:", error);
    }
  };

  // Save email template
  const saveEmailTemplate = async () => {
    try {
      const response = await fetch(`/api/businesses/${businessDetails.business.id}/benchmark-email-template/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({ template: emailTemplate })
      });

      if (response.ok) {
        setTemplateSaved(true);
        setTimeout(() => setTemplateSaved(false), 3000);
      } else {
        throw new Error('Failed to save email template');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  // Fetch benchmark data
  const fetchBenchmarkData = async (selectedRegion = 'all') => {
    setIsLoading(true);
    try {
      const url = selectedRegion === 'all' 
        ? `/api/businesses/${businessDetails.business.id}/benchmark-results/`
        : `/api/businesses/${businessDetails.business.id}/benchmark-results/?region=${encodeURIComponent(selectedRegion)}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch benchmark data');
      }
      
      setBenchmarkData(data.results || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch current benchmark emails and their status
  const fetchBenchmarkEmails = async () => {
    try {
      const response = await fetch(`/api/businesses/${businessDetails.business.id}/benchmark-emails/`);
      if (!response.ok) throw new Error('Failed to fetch benchmark emails');
      const data = await response.json();
      setBenchmarkEmails(data.emails);
      
      // Extract unique regions
      const uniqueRegions = ['all', ...new Set(data.emails.map(item => item.region))];
      setRegions(uniqueRegions);
    } catch (error) {
      setError(error.message);
    }
  };

  // Handle CSV upload - Modified to default to not sent
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true, // Skip empty lines
        complete: async (results) => {
          // Filter out rows without emails
          const validRows = results.data.filter(row => row.email && row.email.trim() !== '');
          
          if (validRows.length === 0) {
            setError('No valid email data found in CSV');
            return;
          }
          
          // Format data for backend - explicitly set sent to false
          const emailData = validRows.map(row => ({
            email: row.email.trim(),
            region: (row.region && row.region.trim()) || 'Default',
            sent: false, // Explicitly set to false
            completed: false
          }));
          
          setIsLoading(true);
          try {
            const response = await fetch(`/api/businesses/${businessDetails.business.id}/add-benchmark-emails/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
              },
              body: JSON.stringify({ emails: emailData })
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to upload benchmark emails');
            }
            
            // Successfully added emails
            await fetchBenchmarkEmails();
          } catch (error) {
            setError(error.message);
          } finally {
            setIsLoading(false);
          }
        },
        error: (error) => {
          setError(`CSV parsing error: ${error}`);
        }
      });
    } catch (error) {
      setError(error.message);
    }
  };

  // Add single email manually
  const handleAddEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.email || !newEmail.region) return;

    try {
      const response = await fetch(`/api/businesses/${businessDetails.business.id}/add-benchmark-emails/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({
          emails: [{
            ...newEmail,
            sent: false,
            completed: false
          }]
        })
      });

      if (!response.ok) throw new Error('Failed to add email');
      
      setNewEmail({ email: '', region: '' });
      await fetchBenchmarkEmails();
    } catch (error) {
      setError(error.message);
    }
  };

  // Send/Resend assessment email
  const handleSendEmail = async (email) => {
    try {
      const response = await fetch(`/api/businesses/${businessDetails.business.id}/send-benchmark-email/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({ 
          email: email.email,
          useTemplate: true // Added to use custom template
        })
      });

      if (!response.ok) throw new Error('Failed to send email');
      
      await fetchBenchmarkEmails();
    } catch (error) {
      setError(error.message);
    }
  };

  // Delete benchmark email
  const handleDeleteEmail = async () => {
    if (!currentEmail) return;
    
    try {
      const response = await fetch(`/api/businesses/${businessDetails.business.id}/delete-benchmark-email/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({ email: currentEmail.email })
      });

      if (!response.ok) throw new Error('Failed to delete benchmark email');
      
      setShowDeleteConfirmation(false);
      setCurrentEmail(null);
      await fetchBenchmarkEmails();
    } catch (error) {
      setError(error.message);
    }
  };

  // Edit benchmark email
  const handleEditEmail = async (e) => {
    e.preventDefault();
    if (!currentEmail) return;
    
    try {
      const response = await fetch(`/api/businesses/${businessDetails.business.id}/update-benchmark-email/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({
          oldEmail: currentEmail.originalEmail,
          newEmail: currentEmail.email,
          region: currentEmail.region
        })
      });

      if (!response.ok) throw new Error('Failed to update benchmark email');
      
      setShowEditModal(false);
      setCurrentEmail(null);
      await fetchBenchmarkEmails();
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="bg-gray-50 p-4 md:p-6 rounded-lg mt-6 md:mt-8">
      {/* Tab Navigation - Mobile Responsive - Updated tab order */}
      <div className="flex flex-wrap border-b mb-4 md:mb-6 overflow-x-auto">
        <button
          className={`px-3 md:px-4 py-2 mr-2 mb-2 text-sm md:text-base whitespace-nowrap ${activeTab === 'template' 
            ? 'border-b-2 border-blue-500 text-blue-500' 
            : 'text-gray-500'}`}
          onClick={() => setActiveTab('template')}
        >
          Email Template
        </button>
        <button
          className={`px-3 md:px-4 py-2 mr-2 mb-2 text-sm md:text-base whitespace-nowrap ${activeTab === 'setup' 
            ? 'border-b-2 border-blue-500 text-blue-500' 
            : 'text-gray-500'}`}
          onClick={() => setActiveTab('setup')}
        >
          Setup
        </button>
        <button
          className={`px-3 md:px-4 py-2 mb-2 text-sm md:text-base whitespace-nowrap ${activeTab === 'results' 
            ? 'border-b-2 border-blue-500 text-blue-500' 
            : 'text-gray-500'}`}
          onClick={() => setActiveTab('results')}
        >
          Results
        </button>
      </div>
  
      {/* Tab Content - Updated order to match new tab order */}
      {activeTab === 'template' ? (
        <div>
          {/* Email Template Editor */}
          <div className="bg-white p-4 md:p-6 rounded-lg shadow">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 space-y-2 md:space-y-0">
              <h3 className="text-lg font-semibold">Benchmark Email Template</h3>
              <button
                onClick={saveEmailTemplate}
                className="w-full md:w-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center"
                style={{ minHeight: '44px' }}
              >
                <Mail className="w-4 h-4 mr-2" />
                Save Template
              </button>
            </div>
            
            {templateSaved && (
              <div className="mb-4 p-3 bg-green-100 text-green-800 rounded text-sm md:text-base">
                Template saved successfully
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={emailTemplate.subject}
                  onChange={(e) => setEmailTemplate({...emailTemplate, subject: e.target.value})}
                  className="w-full p-2 md:p-3 border rounded text-sm md:text-base"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Body
                </label>
                <textarea
                  value={emailTemplate.body}
                  onChange={(e) => setEmailTemplate({...emailTemplate, body: e.target.value})}
                  className="w-full p-2 md:p-3 border rounded h-48 md:h-64 font-mono text-sm"
                />
              </div>
              
              <div className="bg-gray-50 p-3 md:p-4 rounded">
                <h4 className="text-sm font-semibold mb-2">Available Template Variables:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs md:text-sm text-gray-600">
                  <div><code>{'{{business_name}}'}</code> - Name of the business</div>
                  <div><code>{'{{assessment_url}}'}</code> - The unique assessment URL</div>
                  <div><code>{'{{candidate_name}}'}</code> - The recipient's name</div>
                  <div><code>{'{{region}}'}</code> - The recipient's region</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'setup' ? (
        <div>
          {/* Upload Section */}
          <div className="mb-4 md:mb-6">
            <h3 className="text-lg font-semibold mb-3">Upload Benchmark Emails</h3>
            <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="p-2 border rounded w-full md:w-auto"
              />
              <p className="text-sm text-gray-500">
                CSV should include email and region columns
              </p>
            </div>
          </div>
  
          {/* Manual Add Section */}
          <div className="mb-4 md:mb-6">
            <h3 className="text-lg font-semibold mb-3">Add Email Manually</h3>
            <form onSubmit={handleAddEmail} className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
              <input
                type="email"
                value={newEmail.email}
                onChange={(e) => setNewEmail({ ...newEmail, email: e.target.value })}
                placeholder="Email"
                className="flex-1 p-2 border rounded"
                required
              />
              <input
                type="text"
                value={newEmail.region}
                onChange={(e) => setNewEmail({ ...newEmail, region: e.target.value })}
                placeholder="Region"
                className="w-full md:w-48 p-2 border rounded"
                required
              />
              <button
                type="submit"
                className="w-full md:w-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                style={{ minHeight: '44px' }}
              >
                Add
              </button>
            </form>
          </div>
  
          {/* Email List - Mobile Responsive */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Benchmark Emails</h3>
            
            {benchmarkEmails.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Mail className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-base md:text-lg">No benchmark emails found</p>
                <p className="text-sm">Upload a CSV or add emails manually to get started.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {/* Mobile Card View */}
                <div className="md:hidden">
                  {benchmarkEmails.map((email, index) => (
                    <div key={index} className="border-b p-4 last:border-b-0">
                      <div className="space-y-3">
                        {/* Header with status */}
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-base truncate">{email.email}</h3>
                            <p className="text-sm text-gray-600">{email.region}</p>
                          </div>
                          <span className={`ml-2 px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                            email.completed 
                              ? 'bg-green-100 text-green-800' 
                              : email.sent 
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            {email.completed 
                              ? 'Completed' 
                              : email.sent 
                                ? 'Sent' 
                                : 'Not Sent'}
                          </span>
                        </div>
                        
                        {/* Mobile Actions */}
                        <div className="flex flex-wrap gap-2">
                          {!email.completed && (
                            <button
                              onClick={() => handleSendEmail(email)}
                              className="flex-1 min-w-0 inline-flex items-center justify-center px-3 py-2 rounded text-sm font-medium text-white bg-blue-500 hover:bg-blue-600"
                              style={{ minHeight: '40px' }}
                            >
                              {email.sent ? (
                                <>
                                  <RefreshCw className="w-4 h-4 mr-1" />
                                  Resend
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4 mr-1" />
                                  Send
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setCurrentEmail({
                                originalEmail: email.email,
                                email: email.email,
                                region: email.region
                              });
                              setShowEditModal(true);
                            }}
                            className="flex-1 min-w-0 inline-flex items-center justify-center px-3 py-2 rounded text-sm font-medium text-blue-600 bg-blue-100 hover:bg-blue-200"
                            style={{ minHeight: '40px' }}
                            disabled={email.completed}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setCurrentEmail(email);
                              setShowDeleteConfirmation(true);
                            }}
                            className="flex-1 min-w-0 inline-flex items-center justify-center px-3 py-2 rounded text-sm font-medium text-red-600 bg-red-100 hover:bg-red-200"
                            style={{ minHeight: '40px' }}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left">Email</th>
                        <th className="px-4 py-2 text-left">Region</th>
                        <th className="px-4 py-2 text-center">Status</th>
                        <th className="px-4 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {benchmarkEmails.map((email, index) => (
                        <tr key={index} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2">{email.email}</td>
                          <td className="px-4 py-2">{email.region}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${
                              email.completed 
                                ? 'bg-green-100 text-green-800' 
                                : email.sent 
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}>
                              {email.completed 
                                ? 'Completed' 
                                : email.sent 
                                  ? 'Sent' 
                                  : 'Not Sent'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex justify-end space-x-2">
                              {!email.completed && (
                                <button
                                  onClick={() => handleSendEmail(email)}
                                  className="inline-flex items-center px-3 py-1 rounded text-sm font-medium text-white bg-blue-500 hover:bg-blue-600"
                                >
                                  {email.sent ? (
                                    <>
                                      <RefreshCw className="w-4 h-4 mr-1" />
                                      Resend
                                    </>
                                  ) : (
                                    <>
                                      <Send className="w-4 h-4 mr-1" />
                                      Send
                                    </>
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setCurrentEmail({
                                    originalEmail: email.email,
                                    email: email.email,
                                    region: email.region
                                  });
                                  setShowEditModal(true);
                                }}
                                className="inline-flex items-center px-2 py-1 rounded text-sm font-medium text-blue-600 hover:bg-blue-100"
                                disabled={email.completed}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setCurrentEmail(email);
                                  setShowDeleteConfirmation(true);
                                }}
                                className="inline-flex items-center px-2 py-1 rounded text-sm font-medium text-red-600 hover:bg-red-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          {/* Results View */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 md:mb-6 space-y-2 md:space-y-0">
            <h3 className="text-lg font-semibold">Benchmark Results</h3>
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
              <button
                onClick={() => fetchBenchmarkData(selectedRegion)}
                className="w-full md:w-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center"
                style={{ minHeight: '44px' }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Update Results
              </button>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full md:w-auto p-2 border rounded"
                style={{ minHeight: '44px' }}
              >
                {regions.map(region => (
                  <option key={region} value={region}>
                    {region === 'all' ? 'All Regions' : region}
                  </option>
                ))}
              </select>
            </div>
          </div>
  
          {benchmarkData.length > 0 ? (
            <div className="bg-white p-4 md:p-6 rounded-lg shadow">
              {/* Mobile-Responsive Chart */}
              <div className="h-64 md:h-96 w-full mb-6 overflow-x-auto">
                <div className="min-w-full md:min-w-0">
                  <BarChart
                    width={Math.max(400, window.innerWidth > 768 ? 800 : window.innerWidth - 100)}
                    height={window.innerWidth > 768 ? 300 : 250}
                    data={benchmarkData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="attribute" 
                      tick={{ fontSize: window.innerWidth > 768 ? 12 : 10 }}
                      interval={window.innerWidth > 768 ? 0 : 'preserveStartEnd'}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fontSize: window.innerWidth > 768 ? 12 : 10 }}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="score" fill="#3B82F6" name="Average Score (%)" />
                  </BarChart>
                </div>
              </div>
  
              {/* Results Table - Mobile Responsive */}
              <div>
                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {benchmarkData.map((result, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-base">{result.attribute}</h4>
                        <span className="text-lg font-bold text-blue-600">
                          {result.score.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {result.responses} responses
                      </p>
                    </div>
                  ))}
                </div>
                
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left">Attribute</th>
                        <th className="px-4 py-2 text-right">Average Score (%)</th>
                        <th className="px-4 py-2 text-right">Responses</th>
                      </tr>
                    </thead>
                    <tbody>
                      {benchmarkData.map((result, index) => (
                        <tr key={index} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2">{result.attribute}</td>
                          <td className="px-4 py-2 text-right font-semibold">{result.score.toFixed(1)}%</td>
                          <td className="px-4 py-2 text-right">{result.responses}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8 md:py-12">
              <div className="mb-4">
                <BarChart className="w-12 h-12 md:w-16 md:h-16 mx-auto text-gray-300" />
              </div>
              <h3 className="text-lg md:text-xl font-medium mb-2">
                {isLoading ? 'Loading benchmark data...' : 'No benchmark data available'}
              </h3>
              <p className="text-sm md:text-base text-gray-400">
                {isLoading ? 'Please wait while we fetch your results.' : 'Complete some benchmark assessments to see results here.'}
              </p>
            </div>
          )}
        </div>
      )}
  
      {/* Edit Benchmark Email Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 md:p-6 rounded-lg w-full max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl md:text-2xl font-bold">Edit Benchmark Email</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleEditEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={currentEmail.email}
                  onChange={(e) => setCurrentEmail({...currentEmail, email: e.target.value})}
                  className="w-full p-2 md:p-3 border rounded"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region
                </label>
                <input
                  type="text"
                  value={currentEmail.region}
                  onChange={(e) => setCurrentEmail({...currentEmail, region: e.target.value})}
                  className="w-full p-2 md:p-3 border rounded"
                  required
                />
              </div>
  
              <div className="flex flex-col md:flex-row justify-end space-y-2 md:space-y-0 md:space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="w-full md:w-auto px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  style={{ minHeight: '44px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full md:w-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  style={{ minHeight: '44px' }}
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
  
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 md:p-6 rounded-lg w-full max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-red-600">Confirm Deletion</h2>
              <button
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setCurrentEmail(null);
                }}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-gray-700 mb-6 text-sm md:text-base">
              Are you sure you want to delete the benchmark for {currentEmail.email}? 
              This action cannot be undone.
            </p>
            <div className="flex flex-col md:flex-row justify-end space-y-2 md:space-y-0 md:space-x-4">
              <button
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setCurrentEmail(null);
                }}
                className="w-full md:w-auto px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                style={{ minHeight: '44px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEmail}
                className="w-full md:w-auto px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                style={{ minHeight: '44px' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
  
      {/* Error Message */}
      {error && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 md:p-6 rounded-lg w-full max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-red-600">Error</h3>
              <button
                onClick={() => setError(null)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-gray-700 mb-4 text-sm md:text-base">{error}</p>
            <button
              onClick={() => setError(null)}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              style={{ minHeight: '44px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BenchmarkSection;