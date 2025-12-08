import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Search, Edit2, Trash2, X, Save, Building2, Users, Award, RefreshCw, AlertCircle, CheckCircle, BookOpen, Loader } from 'lucide-react';
import axios from 'axios';

export default function TradeManagementSystem() {
  const [trades, setTrades] = useState([]);
  const [filteredTrades, setFilteredTrades] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    trade_id: '',
    trade_name: '',
    trade_description: ''
  });

  // API Base URL - Update this to match your backend
  const API_BASE_URL = 'http://localhost:3000/api/trade'; // Change port if needed

  // Fetch all trades on component mount
  useEffect(() => {
    fetchTrades();
  }, []);

  // Filter trades based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = trades.filter(trade =>
        trade.trade_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (trade.trade_description && trade.trade_description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredTrades(filtered);
    } else {
      setFilteredTrades(trades);
    }
  }, [searchTerm, trades]);

  // Fetch trades from backend
  const fetchTrades = async () => {
    setIsFetching(true);
    try {
      const response = await axios.get(API_BASE_URL);
      
      if (response.data.success) {
        setTrades(response.data.data);
        setFilteredTrades(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching trades:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to fetch trades');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsFetching(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenModal = (trade = null) => {
    if (trade) {
      setFormData({
        trade_id: trade.trade_id,
        trade_name: trade.trade_name,
        trade_description: trade.trade_description || ''
      });
      setIsEditing(true);
    } else {
      setFormData({
        trade_id: '',
        trade_name: '',
        trade_description: ''
      });
      setIsEditing(false);
    }
    setShowModal(true);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setFormData({
      trade_id: '',
      trade_name: '',
      trade_description: ''
    });
    setErrorMessage('');
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      // Prepare data for backend
      const dataToSend = {
        trade_name: formData.trade_name,
        trade_description: formData.trade_description
      };

      let response;

      if (isEditing) {
        // Update existing trade
        response = await axios.put(`${API_BASE_URL}/${formData.trade_id}`, dataToSend);
        setSuccessMessage('Trade updated successfully!');
      } else {
        // Create new trade
        response = await axios.post(API_BASE_URL, dataToSend);
        setSuccessMessage('Trade created successfully!');
      }

      // Refresh the trades list
      await fetchTrades();
      
      handleCloseModal();
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
      console.error('Error saving trade:', error);
      
      // Handle validation errors
      if (error.response?.data?.errors) {
        setErrorMessage(error.response.data.errors.join(', '));
      } else {
        setErrorMessage(error.response?.data?.error || 'Failed to save trade');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (tradeId) => {
    if (!window.confirm('Are you sure you want to delete this trade? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/${tradeId}`);
      setSuccessMessage('Trade deleted successfully!');
      
      // Refresh the trades list
      await fetchTrades();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting trade:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to delete trade');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = [
    {
      label: 'Total Trades',
      value: trades.length,
      icon: Briefcase,
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Active Programs',
      value: trades.length,
      icon: CheckCircle,
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      label: 'With Description',
      value: trades.filter(t => t.trade_description && t.trade_description.trim()).length,
      icon: BookOpen,
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      label: 'Total Classes',
      value: trades.reduce((sum, t) => sum + (t.classes?.length || 0), 0),
      icon: Users,
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {successMessage && (
          <div className="mb-6 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 px-6 py-4 rounded-r-lg shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5" />
              <p className="font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-lg shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <p className="font-medium">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Briefcase className="w-8 h-8 text-blue-600" />
                Trade Management
              </h1>
              <p className="text-slate-600 mt-1">Manage all vocational trades and programs</p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              disabled={isLoading}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              Add New Trade
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-xl`}>
                    <Icon className={`w-6 h-6 ${stat.textColor}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search trades by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSearchTerm('')}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
              <button
                onClick={fetchTrades}
                disabled={isFetching}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {isFetching ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-slate-600">Loading trades...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Trade Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Classes</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredTrades.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-500">
                          <Briefcase className="w-12 h-12 text-slate-300" />
                          <p className="text-lg font-medium">
                            {searchTerm ? 'No trades found matching your search' : 'No trades available'}
                          </p>
                          <p className="text-sm">
                            {searchTerm ? 'Try adjusting your search term' : 'Click "Add New Trade" to create your first trade'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTrades.map((trade) => (
                      <tr key={trade.trade_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-semibold text-slate-900">
                            {trade.trade_id}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{trade.trade_name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-600 max-w-md">
                            {trade.trade_description || (
                              <span className="text-slate-400 italic">No description</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-900">
                              {trade.classes?.length || 0} classes
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenModal(trade)}
                              disabled={isLoading}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(trade.trade_id)}
                              disabled={isLoading}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                  {isEditing ? 'Edit Trade' : 'Add New Trade'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  disabled={isLoading}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {isEditing && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Trade ID
                    </label>
                    <input
                      type="text"
                      value={formData.trade_id}
                      disabled
                      className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Trade Name *
                  </label>
                  <input
                    type="text"
                    name="trade_name"
                    value={formData.trade_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., Software Development, Carpentry, Plumbing"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-slate-500 mt-1.5">Enter the name of the trade or vocational program</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="trade_description"
                    value={formData.trade_description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Brief description of what students will learn in this trade..."
                    disabled={isLoading}
                  />
                  <p className="text-xs text-slate-500 mt-1.5">Optional: Describe the skills and knowledge students will gain</p>
                </div>

                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">{errorMessage}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading || !formData.trade_name.trim()}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        {isEditing ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        {isEditing ? 'Update Trade' : 'Create Trade'}
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCloseModal}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}