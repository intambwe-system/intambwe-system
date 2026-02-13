import React, { useState, useEffect } from 'react';
import {
  User, Phone, Mail, MapPin, Users, Heart, GraduationCap, FileText,
  ArrowRight, ArrowLeft, Check, X, Loader2, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import studentService from '../../../services/studentService';
import classService from '../../../services/classService';

const UpdateStudentModal = ({ student, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  const [formData, setFormData] = useState({
    std_fname: '',
    std_mname: '',
    std_lname: '',
    std_email: '',
    std_dob: '',
    std_gender: '',
    std_nationality: '',
    std_religion: '',
    std_place_of_birth: '',
    std_national_id: '',
    std_phone: '',
    std_address: '',
    std_district: '',
    std_country: 'Rwanda',
    father_name: '',
    father_phone: '',
    father_national_id: '',
    mother_name: '',
    mother_phone: '',
    mother_national_id: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    class_id: '',
    academic_year: '',
    enrollment_date: '',
    previous_school: '',
    previous_school_address: '',
    last_grade_completed: '',
    transfer_reason: '',
    medical_conditions: '',
    allergies: '',
    health_insurance: '',
    admission_number: '',
    notes: ''
  });

  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load classes and populate form with student data
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoadingClasses(true);
        const response = await classService.getAllClasses();
        setClasses(Array.isArray(response) ? response : response.data || []);
      } catch (error) {
        console.error('Failed to load classes:', error);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, []);

  // Populate form with student data
  useEffect(() => {
    if (student) {
      setFormData({
        std_fname: student.std_fname || '',
        std_mname: student.std_mname || '',
        std_lname: student.std_lname || '',
        std_email: student.std_email || '',
        std_dob: student.std_dob?.split('T')[0] || '',
        std_gender: student.std_gender || '',
        std_nationality: student.std_nationality || '',
        std_religion: student.std_religion || '',
        std_place_of_birth: student.std_place_of_birth || '',
        std_national_id: student.std_national_id || '',
        std_phone: student.std_phone || student.std_phoneNumber || '',
        std_address: student.std_address || '',
        std_district: student.std_district || '',
        std_country: student.std_country || 'Rwanda',
        father_name: student.father_name || '',
        father_phone: student.father_phone || '',
        father_national_id: student.father_national_id || '',
        mother_name: student.mother_name || '',
        mother_phone: student.mother_phone || '',
        mother_national_id: student.mother_national_id || '',
        guardian_name: student.guardian_name || '',
        guardian_phone: student.guardian_phone || '',
        guardian_address: student.guardian_address || '',
        emergency_contact_name: student.emergency_contact_name || '',
        emergency_contact_phone: student.emergency_contact_phone || '',
        class_id: student.class_id || '',
        academic_year: student.academic_year || '',
        enrollment_date: student.enrollment_date?.split('T')[0] || '',
        previous_school: student.previous_school || '',
        previous_school_address: student.previous_school_address || '',
        last_grade_completed: student.last_grade_completed || '',
        transfer_reason: student.transfer_reason || '',
        medical_conditions: student.medical_conditions || '',
        allergies: student.allergies || '',
        health_insurance: student.health_insurance || '',
        admission_number: student.admission_number || '',
        notes: student.notes || ''
      });
      if (student.photo_url) {
        setImage(student.photo_url);
      }
    }
  }, [student]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formDataToSend = new FormData();

      // Append all text fields
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value || '');
      });

      // Append photo if new one selected
      if (imageFile) {
        formDataToSend.append('photo', imageFile);
      }

      await studentService.updateStudent(student.std_id, formDataToSend);

      await Swal.fire({
        title: 'Success!',
        text: 'Student updated successfully',
        icon: 'success',
        confirmButtonColor: '#10b981',
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: error.message || 'Failed to update student',
        icon: 'error',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const steps = [
    { number: 1, title: 'Personal', icon: User },
    { number: 2, title: 'Contact', icon: MapPin },
    { number: 3, title: 'Guardian', icon: Users },
    { number: 4, title: 'Academic', icon: GraduationCap },
    { number: 5, title: 'Health', icon: Heart },
    { number: 6, title: 'Other', icon: FileText }
  ];

  const inputClass = "w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-sky-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Update Student</h2>
            <p className="text-blue-100 text-sm">Step {currentStep} of {totalSteps}: {steps[currentStep - 1].title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="bg-gray-50 px-6 py-3 border-b">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = currentStep > step.number;
              const isCurrent = currentStep === step.number;

              return (
                <React.Fragment key={step.number}>
                  <button
                    onClick={() => setCurrentStep(step.number)}
                    className="flex flex-col items-center group"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                          : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'
                      }`}
                    >
                      {isCompleted ? <Check size={16} /> : <Icon size={16} />}
                    </div>
                    <span className={`text-xs mt-1 font-medium ${isCurrent ? 'text-blue-600' : 'text-gray-500'}`}>
                      {step.title}
                    </span>
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                {/* Photo Upload */}
                <div className="flex items-center gap-5 bg-gradient-to-r from-blue-50 to-sky-50 p-4 rounded-xl">
                  <div className="w-24 h-24 rounded-full bg-white shadow flex items-center justify-center overflow-hidden border-4 border-white">
                    {image ? (
                      <img src={image} alt="Student" className="w-full h-full object-cover" />
                    ) : (
                      <User size={36} className="text-gray-400" />
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Student Photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>First Name *</label>
                    <input type="text" name="std_fname" value={formData.std_fname} onChange={handleChange} className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>Middle Name</label>
                    <input type="text" name="std_mname" value={formData.std_mname} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Last Name *</label>
                    <input type="text" name="std_lname" value={formData.std_lname} onChange={handleChange} className={inputClass} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <input type="email" name="std_email" value={formData.std_email} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Date of Birth *</label>
                    <input type="date" name="std_dob" value={formData.std_dob} onChange={handleChange} className={inputClass} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Gender *</label>
                    <select name="std_gender" value={formData.std_gender} onChange={handleChange} className={inputClass} required>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Nationality</label>
                    <input type="text" name="std_nationality" value={formData.std_nationality} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Religion</label>
                    <input type="text" name="std_religion" value={formData.std_religion} onChange={handleChange} className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>National ID</label>
                    <input type="text" name="std_national_id" value={formData.std_national_id} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Place of Birth</label>
                    <input type="text" name="std_place_of_birth" value={formData.std_place_of_birth} onChange={handleChange} className={inputClass} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Contact Information */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Phone Number</label>
                    <input type="tel" name="std_phone" value={formData.std_phone} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>District</label>
                    <input type="text" name="std_district" value={formData.std_district} onChange={handleChange} className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Full Address</label>
                  <input type="text" name="std_address" value={formData.std_address} onChange={handleChange} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Country</label>
                  <input type="text" name="std_country" value={formData.std_country} onChange={handleChange} className={inputClass} />
                </div>
              </motion.div>
            )}

            {/* Step 3: Guardian Information */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                {/* Father */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Users className="text-blue-600" size={16} />
                    Father's Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>Full Name</label>
                      <input type="text" name="father_name" value={formData.father_name} onChange={handleChange} className={inputClass + " bg-white"} />
                    </div>
                    <div>
                      <label className={labelClass}>Phone Number</label>
                      <input type="tel" name="father_phone" value={formData.father_phone} onChange={handleChange} className={inputClass + " bg-white"} />
                    </div>
                    <div>
                      <label className={labelClass}>National ID</label>
                      <input type="text" name="father_national_id" value={formData.father_national_id} onChange={handleChange} className={inputClass + " bg-white"} />
                    </div>
                  </div>
                </div>

                {/* Mother */}
                <div className="bg-pink-50 p-4 rounded-xl border border-pink-100">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Users className="text-pink-600" size={16} />
                    Mother's Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>Full Name</label>
                      <input type="text" name="mother_name" value={formData.mother_name} onChange={handleChange} className={inputClass + " bg-white"} />
                    </div>
                    <div>
                      <label className={labelClass}>Phone Number</label>
                      <input type="tel" name="mother_phone" value={formData.mother_phone} onChange={handleChange} className={inputClass + " bg-white"} />
                    </div>
                    <div>
                      <label className={labelClass}>National ID</label>
                      <input type="text" name="mother_national_id" value={formData.mother_national_id} onChange={handleChange} className={inputClass + " bg-white"} />
                    </div>
                  </div>
                </div>

                {/* Guardian */}
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Users className="text-emerald-600" size={16} />
                    Guardian (Optional)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>Full Name</label>
                      <input type="text" name="guardian_name" value={formData.guardian_name} onChange={handleChange} className={inputClass + " bg-white"} />
                    </div>
                    <div>
                      <label className={labelClass}>Phone Number</label>
                      <input type="tel" name="guardian_phone" value={formData.guardian_phone} onChange={handleChange} className={inputClass + " bg-white"} />
                    </div>
                    <div>
                      <label className={labelClass}>Address</label>
                      <input type="text" name="guardian_address" value={formData.guardian_address} onChange={handleChange} className={inputClass + " bg-white"} />
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Phone className="text-red-600" size={16} />
                    Emergency Contact
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Contact Name</label>
                      <input type="text" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} className={inputClass + " bg-white"} />
                    </div>
                    <div>
                      <label className={labelClass}>Contact Phone</label>
                      <input type="tel" name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleChange} className={inputClass + " bg-white"} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Academic Information */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Class *</label>
                    {loadingClasses ? (
                      <p className="text-gray-500 text-sm">Loading classes...</p>
                    ) : (
                      <select name="class_id" value={formData.class_id} onChange={handleChange} className={inputClass} required>
                        <option value="">Select a class</option>
                        {classes.map((cls) => (
                          <option key={cls.class_id} value={cls.class_id}>
                            {cls.class_name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Academic Year</label>
                    <input type="text" name="academic_year" value={formData.academic_year} onChange={handleChange} placeholder="e.g., 2024-2025" className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Enrollment Date</label>
                    <input type="date" name="enrollment_date" value={formData.enrollment_date} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Admission Number</label>
                    <input type="text" name="admission_number" value={formData.admission_number} onChange={handleChange} className={inputClass} />
                  </div>
                </div>

                <div className="bg-sky-50 p-4 rounded-xl border border-sky-100">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <GraduationCap className="text-sky-600" size={16} />
                    Previous School
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>School Name</label>
                      <input type="text" name="previous_school" value={formData.previous_school} onChange={handleChange} className={inputClass + " bg-white"} />
                    </div>
                    <div>
                      <label className={labelClass}>School Address</label>
                      <input type="text" name="previous_school_address" value={formData.previous_school_address} onChange={handleChange} className={inputClass + " bg-white"} />
                    </div>
                    <div>
                      <label className={labelClass}>Last Grade Completed</label>
                      <input type="text" name="last_grade_completed" value={formData.last_grade_completed} onChange={handleChange} className={inputClass + " bg-white"} />
                    </div>
                    <div>
                      <label className={labelClass}>Transfer Reason</label>
                      <input type="text" name="transfer_reason" value={formData.transfer_reason} onChange={handleChange} className={inputClass + " bg-white"} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Health Information */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                  <p className="text-sm text-red-800">
                    <strong>Important:</strong> Please provide accurate health information.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Medical Conditions</label>
                  <textarea name="medical_conditions" value={formData.medical_conditions} onChange={handleChange} rows="3" placeholder="e.g., Asthma, Diabetes, or 'None'" className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Allergies</label>
                  <textarea name="allergies" value={formData.allergies} onChange={handleChange} rows="3" placeholder="e.g., Peanut allergy, Penicillin, or 'None'" className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Health Insurance</label>
                  <input type="text" name="health_insurance" value={formData.health_insurance} onChange={handleChange} placeholder="e.g., MMI Rwanda - Policy #12345678" className={inputClass} />
                </div>
              </motion.div>
            )}

            {/* Step 6: Additional Information */}
            {currentStep === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <label className={labelClass}>Additional Notes</label>
                  <textarea name="notes" value={formData.notes} onChange={handleChange} rows="5" placeholder="Any additional information..." className={inputClass} />
                </div>

                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-lg">
                  <h3 className="font-semibold text-emerald-800 mb-2">Ready to Update</h3>
                  <p className="text-sm text-emerald-700">
                    Review the information and click "Save Changes" to update the student record.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-3">Summary</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>
                      <p className="font-medium">{formData.std_fname} {formData.std_mname} {formData.std_lname}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Date of Birth:</span>
                      <p className="font-medium">{formData.std_dob || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Gender:</span>
                      <p className="font-medium">{formData.std_gender || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone:</span>
                      <p className="font-medium">{formData.std_phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              currentStep === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <ArrowLeft size={18} />
            Previous
          </button>

          <span className="text-sm text-gray-500">Step {currentStep} of {totalSteps}</span>

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium"
            >
              Next
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UpdateStudentModal;
