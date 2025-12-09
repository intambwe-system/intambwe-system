import React, { useState, useEffect } from 'react';
import {
  Briefcase, Plus, Search, Edit2, Trash2, X, Save,
  CheckCircle, AlertCircle, RefreshCw, Loader, Grid, List,
  ChevronDown
} from 'lucide-react';
import tradeService from '../../../../services/tradeService';

export default function TradeManagementSystem() {
  const [trades, setTrades] = useState([]);
  const [filteredTrades, setFilteredTrades] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('name');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    trade_id: '',
    trade_name: '',
    trade_description: ''
  });

  useEffect(() => {
    fetchTrades();
  }, []);

  useEffect(() => {
    let filtered = [...trades];

    if (searchTerm) {
      filtered = filtered.filter(trade =>
        trade.trade_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (trade.trade_description && trade.trade_description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'name':
          return a.trade_name.localeCompare(b.trade_name);
        case 'newest':
          return b.trade_id - a.trade_id;
        case 'oldest':
          return a.trade_id - b.trade_id;
        default:
          return 0;
      }
    });

    setFilteredTrades(filtered);
  }, [searchTerm, trades, sortBy]);

  const fetchTrades = async () => {
    setIsFetching(true);
    try {
      const res = await tradeService.getAllTrades();
      if (res.success !== false) {
        setTrades(res.data || res);
        setFilteredTrades(res.data || res);
      }
    } catch (err) {
      console.error('Error fetching trades:', err);
      setErrorMessage(err.message || 'Failed to fetch trades');
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
      setFormData({ trade_id: '', trade_name: '', trade_description: '' });
      setIsEditing(false);
    }
    setShowModal(true);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setFormData({ trade_id: '', trade_name: '', trade_description: '' });
    setErrorMessage('');
  };

  const handleSubmit = async () => {
    if (!formData.trade_name.trim()) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const payload = {
        trade_name: formData.trade_name.trim(),
        trade_description: formData.trade_description.trim() || null
      };

      if (isEditing) {
        await tradeService.updateTrade(formData.trade_id, payload);
        setSuccessMessage('Trade updated successfully!');
      } else {
        await tradeService.createTrade(payload);
        setSuccessMessage('Trade created successfully!');
      }

      await fetchTrades();
      handleCloseModal();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error saving trade:', err);
      setErrorMessage(err.message || 'Failed to save trade');
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
      await tradeService.deleteTrade(tradeId);
      setSuccessMessage('Trade deleted successfully!');
      await fetchTrades();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error deleting trade:', err);
      setErrorMessage(err.message || 'Failed to delete trade');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Trade Management</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage all trades in your organization</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchTrades}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => handleOpenModal()}
              disabled={isLoading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add Trade
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Success / Error Messages */}
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <p className="text-xs">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <p className="text-xs">{errorMessage}</p>
          </div>
        )}

        {/* Stats Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Trades</p>
              <p className="text-4xl font-semibold text-gray-900">{trades.length}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl">
              <Briefcase className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search trades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white cursor-pointer"
              >
                <option value="name">Name (A-Z)</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 border-l border-gray-200 ${viewMode === 'grid' ? 'bg-gray-100 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <Grid className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {isFetching ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center">
            <Loader className="w-8 h-8 text-blue-600 animate-spin mb-3" />
            <p className="text-gray-600">Loading trades...</p>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center">
            <Briefcase className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-900 font-medium mb-1">
              {searchTerm ? 'No trades found' : 'No trades available'}
            </p>
            <p className="text-xs text-gray-500">
              {searchTerm ? 'Try different keywords' : 'Click "Add Trade" to create your first trade'}
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">
                    <div className="flex items-center gap-1">
                      Trade Name
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTrades.map((trade, index) => (
                  <tr key={trade.trade_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-xs text-gray-500">#{index + 1}</td>
                    <td className="px-6 py-3 text-xs font-medium text-gray-900">{trade.trade_name}</td>
                    <td className="px-6 py-3 text-xs text-gray-600">
                      {trade.trade_description || <span className="text-gray-400 italic">No description</span>}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(trade)}
                          disabled={isLoading}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(trade.trade_id)}
                          disabled={isLoading}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrades.map((trade, index) => (
              <div key={trade.trade_id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">#{index + 1}</p>
                    <h3 className="font-semibold text-gray-900">{trade.trade_name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenModal(trade)}
                      disabled={isLoading}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(trade.trade_id)}
                      disabled={isLoading}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {trade.trade_description || <span className="text-gray-400 italic">No description</span>}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {isEditing ? 'Edit Trade' : 'Add New Trade'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  disabled={isLoading}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {isEditing && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Trade ID</label>
                  <input
                    type="text"
                    value={formData.trade_id}
                    disabled
                    className="w-full px-3 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Trade Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="trade_name"
                  value={formData.trade_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Software Development"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="trade_description"
                  value={formData.trade_description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Brief description of the trade..."
                  disabled={isLoading}
                />
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-3 rounded-lg">
                  <p className="text-xs">{errorMessage}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center gap-3 rounded-b-2xl">
              <button
                onClick={handleCloseModal}
                disabled={isLoading}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || !formData.trade_name.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isEditing ? 'Update Trade' : 'Create Trade'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}