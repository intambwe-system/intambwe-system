import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  X,
  RefreshCw,
  List,
  School,
} from "lucide-react";
import { useNavigate } from "react-router-dom"; 
import { motion, AnimatePresence } from "framer-motion";
import { Combobox } from "@headlessui/react";
import classService from "../../../services/classService";
import tradeService from "../../../services/tradeService";
import departmentService from "../../../services/departmentService";
import employeeService from "../../../services/employeeService";
import { useEmployeeAuth } from "../../../contexts/EmployeeAuthContext";

const ClassManagementDashboard = () => {
  const [classes, setClasses] = useState([]);
  const navigate  = useNavigate()
  const [allClasses, setAllClasses] = useState([]);
  const [trades, setTrades] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("class_name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [operationStatus, setOperationStatus] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [formError, setFormError] = useState("");
  const {employee} = useEmployeeAuth()
  const [formData, setFormData] = useState({
    class_name: "",
    RQF :"",
    trade_id: "",
    dpt_id: "",
    emp_id: "",
  });

  const [selectedTrade, setSelectedTrade] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  const [tradeQuery, setTradeQuery] = useState("");
  const [deptQuery, setDeptQuery] = useState("");
  const [teacherQuery, setTeacherQuery] = useState("");

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    
    setLoading(true);
    try {
      const [classRes, tradeRes, deptRes, empRes] = await Promise.all([
        classService.getAllClasses(),


      employee.emp_role == 'admin' ?     tradeService.getAllTrades() : null,
      employee.emp_role == 'admin' ?   departmentService.getAllDepartments() : null,
      employee.emp_role == 'admin' ?  employeeService.getAllEmployees() : null,
    ]);
    
    
      const classData = Array.isArray(classRes)
        ? classRes
        : classRes?.data || [];
        let filteredClass = classData
        if(employee.emp_role == 'teacher'){

           filteredClass = classData.filter(arr=>  arr.emp_id == employee.emp_id)
        }
      setAllClasses(filteredClass);
      setClasses(classData);

      setTrades(Array.isArray(tradeRes) ? tradeRes : tradeRes?.data || []);
      setDepartments(Array.isArray(deptRes) ? deptRes : deptRes?.data || []);

      const allEmps = Array.isArray(empRes) ? empRes : empRes?.data || [];
      setTeachers(allEmps.filter((e) => e.emp_role === "teacher"));
    } catch (err) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Filter & Sort
  useEffect(() => {
    let filtered = [...allClasses];

    if (searchTerm) {
      filtered = filtered.filter(
        (cls) =>
          cls.class_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cls.Trade?.trade_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          cls.Department?.dpt_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          cls.Employee?.emp_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      let aVal = "";
      let bVal = "";

      switch (sortBy) {
        case "class_name":
          aVal = a.class_name || "";
          bVal = b.class_name || "";
          break;
        case "trade":
          aVal = a.Trade?.trade_name || "";
          bVal = b.Trade?.trade_name || "";
          break;
        case "department":
          aVal = a.Department?.dpt_name || "";
          bVal = b.Department?.dpt_name || "";
          break;
        case "teacher":
          aVal = a.Employee?.emp_name || "";
          bVal = b.Employee?.emp_name || "";
          break;
        default:
          aVal = a.class_name || "";
          bVal = b.class_name || "";
      }

      return sortOrder === "asc"
        ? aVal.toString().localeCompare(bVal.toString())
        : bVal.toString().localeCompare(aVal.toString());
    });

    setClasses(filtered);
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder, allClasses]);

  const showStatus = (type, message, duration = 3000) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  const handleAddClass = () => {
    setFormData({ class_name: "", trade_id: "", dpt_id: "", emp_id: "" });
    setSelectedTrade(null);
    setSelectedDepartment(null);
    setSelectedTeacher(null);
    setFormError("");
    setShowAddModal(true);
  };

  const handleEdit = (cls) => {
    setSelectedClass(cls);
    setFormData({
      class_name: cls.class_name,
      trade_id: cls.trade_id,
      dpt_id: cls.dpt_id || "",
      emp_id: cls.emp_id || "",
    });
    setSelectedTrade(cls.Trade || null);
    setSelectedDepartment(cls.Department || null);
    setSelectedTeacher(cls.Employee || null);
    setFormError("");
    setShowUpdateModal(true);
  };

  const handelMarks = (cls) => {
    if(!cls) return 
    navigate('/employee/dashboard/marks-entry?class='+cls.class_id)
  };
  const handleDispline = (cls) => {
    if(!cls) return 
    navigate('/employee/dashboard/discipline-entry?class='+cls.class_id)
  };
  const handleView = (cls) => {
    setSelectedClass(cls);
    setShowViewModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.class_name.trim() || !selectedTrade) {
      setFormError("Class name and trade are required");
      return;
    }

    try {
      setOperationLoading(true);
      const payload = {
        class_name: formData.class_name.trim(),
        trade_id: selectedTrade.trade_id,
        dpt_id: selectedDepartment?.dpt_id || null,
        RQF:formData.RQF || null ,
        emp_id: selectedTeacher?.emp_id || null,
      };

      await classService.createClass(payload);
      await loadAllData();
      setShowAddModal(false);
      showStatus("success", `${payload.class_name} created successfully!`);
    } catch (err) {
      setFormError(err.message || "Failed to create class");
    } finally {
      setOperationLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!formData.class_name.trim() || !selectedTrade) {
      setFormError("Class name and trade are required");
      return;
    }

    try {
      setOperationLoading(true);
      const payload = {
        class_name: formData.class_name.trim(),
        trade_id: selectedTrade.trade_id,
        RQF:formData.RQF || null ,
        dpt_id: selectedDepartment?.dpt_id || null,
        emp_id: selectedTeacher?.emp_id || null,
      };

      await classService.updateClass(selectedClass.class_id, payload);
      await loadAllData();
      setShowUpdateModal(false);
      showStatus("success", `${payload.class_name} updated successfully!`);
    } catch (err) {
      setFormError(err.message || "Failed to update class");
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDelete = async (cls) => {
    try {
      setOperationLoading(true);
      await classService.deleteClass(cls.class_id);
      await loadAllData();
      setDeleteConfirm(null);
      showStatus("success", `${cls.class_name} deleted successfully!`);
    } catch (err) {
      showStatus("error", err.message || "Failed to delete class");
    } finally {
      setOperationLoading(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(classes.length / itemsPerPage);
  const currentItems = classes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  console.log(currentItems);

  // Filtered Combobox Options
  const filteredTrades = useMemo(
    () =>
      trades.filter((t) =>
        t.trade_name?.toLowerCase().includes(tradeQuery.toLowerCase())
      ),
    [trades, tradeQuery]
  );
  const filteredDepartments = useMemo(
    () =>
      departments.filter((d) =>
        d.dpt_name?.toLowerCase().includes(deptQuery.toLowerCase())
      ),
    [departments, deptQuery]
  );
  const filteredTeachers = useMemo(
    () =>
      teachers.filter((t) =>
        (t.emp_name?.toLowerCase() + " " + t.emp_email?.toLowerCase()).includes(
          teacherQuery.toLowerCase()
        )
      ),
    [teachers, teacherQuery]
  );

  const SelectCombobox = ({
    value,
    onChange,
    options,
    query,
    setQuery,
    label,
    placeholder,
    displayKey = "name",
  }) => (
    <Combobox value={value} onChange={onChange} nullable>
      <div className="relative">
        <Combobox.Label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </Combobox.Label>
        <Combobox.Input
          className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
          displayValue={(item) =>
            item ? item.trade_name || item.dpt_name || item.emp_name || "" : ""
          }
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
        />
        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2 mt-6">
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </Combobox.Button>
        <AnimatePresence>
          {options.length > 0 && (
            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              {options.map((item) => (
                <Combobox.Option
                  key={item.trade_id || item.dpt_id || item.emp_id}
                  value={item}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      active ? "bg-primary-600 text-white" : "text-gray-900"
                    }`
                  }
                >
                  {({ selected, active }) => (
                    <>
                      <span
                        className={`block truncate ${
                          selected ? "font-medium" : "font-normal"
                        }`}
                      >
                        {item.trade_name || item.dpt_name || item.emp_name}
                      </span>
                      {selected && (
                        <span
                          className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                            active ? "text-white" : "text-primary-600"
                          }`}
                        >
                          <CheckCircle className="w-5 h-5" />
                        </span>
                      )}
                    </>
                  )}
                </Combobox.Option>
              ))}
            </Combobox.Options>
          )}
        </AnimatePresence>
      </div>
    </Combobox>
  );

  const renderTable = () => (
    <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold">
                ID
              </th>
              <th
                className="text-left py-3 px-4 text-gray-600 font-semibold cursor-pointer hover:bg-gray-100"
                onClick={() =>
                  setSortOrder(
                    sortBy === "class_name"
                      ? sortOrder === "asc"
                        ? "desc"
                        : "asc"
                      : "asc"
                  ) || setSortBy("class_name")
                }
              >
                <div className="flex items-center space-x-1">
                  <span>Class Name</span>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold hidden md:table-cell">
                RQF
              </th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold hidden md:table-cell">
                Department
              </th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold">
                Trade
              </th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold hidden lg:table-cell">
                Class Teacher
              </th>
              <th className="text-right py-3 px-4 text-gray-600 font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentItems.map((cls) => (
              <motion.tr
                key={cls.class_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-gray-50"
              >
                <td className="py-3 px-4 text-gray-900">#{cls.class_id}</td>
                <td className="py-3 px-4 font-medium text-gray-900">
                  {cls.class_name}
                </td>
                <td className="py-3 px-4 font-medium text-gray-900">
                  {cls.RQF}
                </td>
                <td className="py-3 px-4 text-gray-600 hidden md:table-cell">
                  {cls.Department?.dpt_name || "—"}
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {cls.Trade?.trade_name || "—"}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-600 hidden lg:table-cell">
                  {cls.classTeacher?.emp_name || "Not assigned"}
                </td>
                <td className="py-3 px-4 text-right space-x-2">
           
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    onClick={() => handelMarks(cls)}
                    title="Marks"
                    className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50"
                  >
                    <School className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    onClick={() => handleDispline(cls)}
                    title="Discipline"
                    className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50"
                  >
                    <School className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    onClick={() => handleView(cls)}
                    title="View"
                    className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50"
                  >
                    <Eye className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    onClick={() => handleEdit(cls)}
                    title="Edit"
                    className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50"
                  >
                    <Edit className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    onClick={() => setDeleteConfirm(cls)}
                    title="Delete"
                    className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Header */}
      <div className="sticky top-0 bg-white shadow-md z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between rounded-md">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Class Management
              </h1>
              <p className="text-sm text,text-gray-500">
                Organize classes, assign teachers and departments
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={loadAllData}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-primary-600 border border-gray-200 rounded hover:bg-primary-50 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                <span className="text-sm">Refresh</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={handleAddClass}
                className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded font-medium shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add Class</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow border border-gray-100 p-4"
          >
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary-50 rounded-full">
                <BookOpen className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Classes</p>
                <p className="text-xl font-semibold text-gray-900">
                  {allClasses.length}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Search & Controls */}
        <div className="bg-white rounded-lg shadow border border-gray-100 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search classes, trades, teachers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-10 pr-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split("-");
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="class_name-asc">Name (A-Z)</option>
                <option value="class_name-desc">Name (Z-A)</option>
                <option value="trade-asc">Trade (A-Z)</option>
                <option value="trade-desc">Trade (Z-A)</option>
              </select>
              <div className="flex border border-gray-200 rounded">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setViewMode("table")}
                  className={`p-2 ${
                    viewMode === "table"
                      ? "bg-primary-50 text-primary-600"
                      : "text-gray-600"
                  }`}
                >
                  <List className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Error / Loading / Empty */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}
        {loading ? (
          <div className="bg-white rounded-lg shadow border border-gray-100 p-12 text-center">
            <div className="inline-flex items-center space-x-2">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading classes...</span>
            </div>
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-white rounded-lg shadow border border-gray-100 p-12 text-center">
            <p className="text-lg font-semibold text-gray-900">
              No Classes Found
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Create your first class to get started.
            </p>
          </div>
        ) : (
          <>
            {renderTable()}
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-100 rounded-b-lg shadow">
                <div className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1}-
                  {Math.min(currentPage * itemsPerPage, classes.length)} of{" "}
                  {classes.length}
                </div>
                <div className="flex space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="px-3 py-1.5 text-sm border rounded disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </motion.button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <motion.button
                        key={page}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 text-sm rounded ${
                          currentPage === page
                            ? "bg-primary-600 text-white"
                            : "border"
                        }`}
                      >
                        {page}
                      </motion.button>
                    )
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="px-3 py-1.5 text-sm border rounded disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Toast */}
        <AnimatePresence>
          {operationStatus && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 z-50"
            >
              <div
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg text-sm ${
                  operationStatus.type === "success"
                    ? "bg-green-50 border border-green-200 text-green-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}
              >
                {operationStatus.type === "success" ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="font-medium">{operationStatus.message}</span>
                <button onClick={() => setOperationStatus(null)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Overlay */}
        <AnimatePresence>
          {operationLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
            >
              <div className="bg-white rounded-lg p-4 shadow-xl">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-700 text-sm font-medium">
                    Processing...
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Delete Class
                    </h3>
                    <p className="text-sm text-gray-500">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-6">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold">
                    {deleteConfirm.class_name}
                  </span>
                  ?
                </p>
                <div className="flex justify-end space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => handleDelete(deleteConfirm)}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Add New Class
                </h3>
                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
                    {formError}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Class Name *
                    </label>
                    <input
                      type="text"
                      name="class_name"
                      value={formData.class_name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                          <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      RQF LEVEL *
                    </label>
                    <input
                      type="number"
                      name="RQF"
                      value={formData.RQF}
                      min={2}
                      max={5}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <SelectCombobox
                    label="Trade *"
                    value={selectedTrade}
                    onChange={setSelectedTrade}
                    options={filteredTrades}
                    query={tradeQuery}
                    setQuery={setTradeQuery}
                    placeholder="Search trade..."
                  />
                  <SelectCombobox
                    label="Department (Optional)"
                    value={selectedDepartment}
                    onChange={setSelectedDepartment}
                    options={filteredDepartments}
                    query={deptQuery}
                    setQuery={setDeptQuery}
                    placeholder="Search department..."
                  />
                  <SelectCombobox
                    label="Class Teacher (Optional)"
                    value={selectedTeacher}
                    onChange={setSelectedTeacher}
                    options={filteredTeachers}
                    query={teacherQuery}
                    setQuery={setTeacherQuery}
                    placeholder="Search teacher..."
                  />
                  <div className="flex justify-end space-x-3 pt-4">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.05 }}
                      disabled={operationLoading}
                      className="px-4 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                    >
                      {operationLoading ? "Creating..." : "Create Class"}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Update Modal */}
        <AnimatePresence>
          {showUpdateModal && selectedClass && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Update Class
                </h3>
                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
                    {formError}
                  </div>
                )}
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Class Name *
                    </label>
                    <input
                      type="text"
                      name="class_name"
                      value={formData.class_name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      RQF LEVEL *
                    </label>
                    <input
                      type="number"
                      name="RQF"
                      value={formData.RQF}
                      min={2}
                      max={5}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <SelectCombobox
                    label="Trade *"
                    value={selectedTrade}
                    onChange={setSelectedTrade}
                    options={filteredTrades}
                    query={tradeQuery}
                    setQuery={setTradeQuery}
                    placeholder="Search trade..."
                  />
                  <SelectCombobox
                    label="Department (Optional)"
                    value={selectedDepartment}
                    onChange={setSelectedDepartment}
                    options={filteredDepartments}
                    query={deptQuery}
                    setQuery={setDeptQuery}
                    placeholder="Search department..."
                  />
                  <SelectCombobox
                    label="Class Teacher (Optional)"
                    value={selectedTeacher}
                    onChange={setSelectedTeacher}
                    options={filteredTeachers}
                    query={teacherQuery}
                    setQuery={setTeacherQuery}
                    placeholder="Search teacher..."
                  />
                  <div className="flex justify-end space-x-3 pt-4">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setShowUpdateModal(false)}
                      className="px-4 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.05 }}
                      disabled={operationLoading}
                      className="px-4 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                    >
                      {operationLoading ? "Updating..." : "Update Class"}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Modal */}
        <AnimatePresence>
          {showViewModal && selectedClass && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Class Details
                </h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <strong>ID:</strong> #{selectedClass.class_id}
                  </div>
                  <div>
                    <strong>Name:</strong> {selectedClass.class_name}
                  </div>
                  <div>
                    <strong>Trade:</strong>{" "}
                    {selectedClass.Trade?.trade_name || "—"}
                  </div>
                  <div>
                    <strong>Department:</strong>{" "}
                    {selectedClass.Department?.dpt_name || "Not assigned"}
                  </div>
                  <div>
                    <strong>Class Teacher:</strong>{" "}
                    {selectedClass.Employee?.emp_name || "Not assigned"}
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => {
                      setShowViewModal(false);
                      setSelectedClass(null);
                    }}
                    className="px-4 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
                  >
                    Close
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ClassManagementDashboard;
