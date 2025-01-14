import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Papa from 'papaparse';
import { Send, RefreshCw } from 'lucide-react';

const BenchmarkSection = ({ businessDetails }) => {
  const [activeTab, setActiveTab] = useState('setup');
  const [benchmarkEmails, setBenchmarkEmails] = useState([]);
  const [newEmail, setNewEmail] = useState({ email: '', region: '' });
  const [benchmarkData, setBenchmarkData] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [regions, setRegions] = useState([]);
  const [uploadError, setUploadError] = useState(null);

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
    }
  }, [businessDetails?.business?.id]);

  // Fetch benchmark data
  const fetchBenchmarkData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/businesses/${businessDetails.business.id}/benchmark-results/`);
      const data = await response.json();
      
      if (!response.ok) {
        const completedAssessments = await fetch(`/api/businesses/${businessDetails.business.id}/benchmark-emails/`);
        const emailData = await completedAssessments.json();
        const hasCompletedAssessments = emailData.emails?.some(email => email.completed);
        
        if (hasCompletedAssessments) {
          throw new Error('Failed to fetch benchmark data for completed assessments');
        }
      }
      
      setBenchmarkData(data.results || []);
    } catch (error) {
      if (error.message !== 'Failed to fetch benchmark data') {
        setUploadError(error.message);
      }
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

  // Handle CSV upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      Papa.parse(text, {
        header: true,
        complete: async (results) => {
          const emailData = results.data.map(row => ({
            email: row.email,
            region: row.region,
            sent: false,
            completed: false
          }));
          
          const response = await fetch(`/api/businesses/${businessDetails.business.id}/add-benchmark-emails/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCsrfToken(),
            },
            body: JSON.stringify({ emails: emailData })
          });

          if (!response.ok) throw new Error('Failed to upload benchmark emails');
          
          await fetchBenchmarkEmails();
        },
        error: (error) => {
          throw new Error(`CSV parsing error: ${error}`);
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
        body: JSON.stringify({ email: email.email })
      });

      if (!response.ok) throw new Error('Failed to send email');
      
      await fetchBenchmarkEmails();
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg mt-8">
      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 mr-2 ${activeTab === 'setup' 
            ? 'border-b-2 border-blue-500 text-blue-500' 
            : 'text-gray-500'}`}
          onClick={() => setActiveTab('setup')}
        >
          Benchmark Setup
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'results' 
            ? 'border-b-2 border-blue-500 text-blue-500' 
            : 'text-gray-500'}`}
          onClick={() => setActiveTab('results')}
        >
          Results
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'setup' ? (
        <div>
          {/* Upload Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Upload Benchmark Emails</h3>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="p-2 border rounded"
              />
              <p className="text-sm text-gray-500">
                CSV should include email and region columns
              </p>
            </div>
          </div>

          {/* Manual Add Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Add Email Manually</h3>
            <form onSubmit={handleAddEmail} className="flex space-x-4">
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
                className="w-48 p-2 border rounded"
                required
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add
              </button>
            </form>
          </div>

          {/* Email List */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Benchmark Emails</h3>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Region</th>
                    <th className="px-4 py-2 text-center">Status</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarkEmails.map((email, index) => (
                    <tr key={index} className="border-t">
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
                        <button
                          onClick={() => handleSendEmail(email)}
                          className="inline-flex items-center px-3 py-1 rounded text-sm font-medium text-white bg-blue-500 hover:bg-blue-600"
                          disabled={email.completed}
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Results View */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Benchmark Results</h3>
            <div className="flex space-x-4">
              <button
                onClick={fetchBenchmarkData}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Update Results
              </button>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="p-2 border rounded"
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
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="h-96">
                <BarChart
                  width={800}
                  height={300}
                  data={benchmarkData.filter(result => 
                    selectedRegion === 'all' || result.region === selectedRegion
                  )}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="attribute" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="score" fill="#3B82F6" name="Average Score (%)" />
                </BarChart>
              </div>

              <div className="mt-6">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left">Attribute</th>
                      <th className="px-4 py-2 text-right">Average Score (%)</th>
                      <th className="px-4 py-2 text-right">Responses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmarkData
                      .filter(result => selectedRegion === 'all' || result.region === selectedRegion)
                      .map((result, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2">{result.attribute}</td>
                          <td className="px-4 py-2 text-right">{result.score.toFixed(1)}%</td>
                          <td className="px-4 py-2 text-right">{result.responses}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No benchmark data available
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
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

export default BenchmarkSection;