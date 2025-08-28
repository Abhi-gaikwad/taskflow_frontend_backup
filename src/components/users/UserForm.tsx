import React, { useState, useEffect } from "react";
import {
  User as UserIcon,
  Shield,
  KeyRound,
  Building,
  ClipboardList,
  Eye,
  EyeOff,
  Phone,
} from "lucide-react";
import { Button } from "../common/Button";
import { usersAPI, companyAPI } from "../../services/api";
import { User as UserType, Company } from "../../types";
import { useAuth } from "../../contexts/AuthContext";

interface UserFormProps {
  user?: UserType;
  onSuccess?: () => void;
  onClose: () => void;
  mode?: "create" | "edit";
}

const getRoleOptions = (currentUser: UserType | undefined) =>
  currentUser?.role === "super_admin" || currentUser?.role === "company"
    ? [
        { value: "admin", label: "Admin" },
        { value: "user", label: "User" },
      ]
    : currentUser?.role === "admin"
    ? [{ value: "user", label: "User" }]
    : [{ value: "user", label: "User" }];

export const UserForm: React.FC<UserFormProps> = ({
  user,
  onSuccess,
  onClose,
  mode = "create",
}) => {
  const { user: currentUser } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Correctly access company_id from currentUser
  const defaultCompanyId =
    currentUser?.role === "admin" || currentUser?.role === "company"
      ? String(currentUser.company_id ?? "")
      : user?.company_id?.toString() || "";

  const [formData, setFormData] = useState({
    fullName: user?.full_name || "",
    username: user?.username || "",
    phoneNumber: user?.phone_number || "",
    password: "",
    confirmPassword: "",
    role:
      currentUser?.role === "admin" && mode === "create"
        ? "user"
        : user?.role || "user",
    companyId: defaultCompanyId,
    // Change: Use is_active consistently
    is_active: user?.is_active ?? true,
    canAssignTasks: user?.can_assign_tasks ?? false,
  });

  useEffect(() => {
    if (currentUser?.role === "super_admin") {
      companyAPI
        .listCompanies()
        .then(setCompanies)
        .catch(() => setCompanies([]));
    }
  }, [currentUser]);

  const handleChange = (
    key: keyof typeof formData,
    value: string | boolean
  ) => {
    setFormData((prev) => {
      const newState = { ...prev, [key]: value };

      // Auto-manage can_assign_tasks based on role
      if (key === "role") {
        if (value === "admin") {
          // Admins inherently have task assignment permissions
          newState.canAssignTasks = false; // Hide the field by setting to false
        } else if (value === "user" && currentUser?.role === "admin") {
          // When admin creates a user, keep current canAssignTasks value
          // (this allows admin to choose)
        }
      }

      return newState;
    });
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!/^\d{10,15}$/.test(formData.phoneNumber.trim())) {
      newErrors.phoneNumber = "Enter a valid phone number";
    }

    if (mode === "create" && !formData.password)
      newErrors.password = "Password is required";
    else if (formData.password && formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";

    // Password confirmation validation
    if (formData.password || formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
      if (mode === "create" && !formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      }
    }

    if (currentUser?.role === "super_admin" && !formData.companyId)
      newErrors.companyId = "Company is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      const userData: any = {
        full_name: formData.fullName,
        username: formData.username,
        phone_number: formData.phoneNumber,
        ...(formData.password && { password: formData.password }),
        // Change: Use is_active consistently (no change needed here as it's already correct)
        is_active: formData.is_active,
        company_id: Number(formData.companyId),
        role: formData.role,
        can_assign_tasks: formData.canAssignTasks,
      };

      const storedAuth = localStorage.getItem("auth");
      const authUser = storedAuth ? JSON.parse(storedAuth) : null;
      const companyId = authUser?.id;
      console.log("hiiii");
      userData.company_id = Number(companyId);
      userData.role = formData.role;
      userData.can_assign_tasks = formData.canAssignTasks;

      console.log(userData, authUser);

      if (currentUser?.role === "company") {
        console.log("hiiii");
        console.log(companyId);
        if (!companyId) throw new Error("Company user must have a company_id");
      } else if (currentUser?.role === "admin") {
        if (!companyId) throw new Error("Admin user must have a company_id");
        if (formData.role === "user") {
          userData.can_assign_tasks = formData.canAssignTasks;
        } else {
          userData.can_assign_tasks = false;
        }
      } else {
        delete userData.can_assign_tasks;
      }

      console.log(userData);

      if (mode === "create") {
        await usersAPI.createUser(userData);
      } else if (user) {
        await usersAPI.updateUser(user.id, userData);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      setErrors({
        general:
          error?.response?.data?.detail ||
          error?.message ||
          "Failed to save user",
      });
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = getRoleOptions(currentUser);
  const showCompanySelect =
    currentUser?.role === "super_admin" && companies.length > 0;

  const showCanAssignTasks =
    (currentUser?.role === "super_admin" ||
      currentUser?.role === "company" ||
      (currentUser?.role === "admin" && formData.role === "user")) &&
    formData.role === "user"; // Only show for USER role

  const isCanAssignTasksEditable =
    (currentUser?.role === "super_admin" ||
      currentUser?.role === "company" ||
      (currentUser?.role === "admin" && formData.role === "user")) &&
    formData.role === "user"; // Only editable for USER role

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {mode === "create" ? "Create New User" : "Edit User"}
        </h2>
        <p className="text-gray-600">
          {mode === "create"
            ? "Add a new user to the system"
            : "Update user information"}
        </p>
        {(currentUser?.role === "admin" || currentUser?.role === "company") && (
          <p className="text-sm text-blue-600 mt-2 font-medium">
            User will be added to your company: {currentUser.company?.name}
          </p>
        )}
      </div>

      {errors.general && (
        <div className="mb-6 p-4 border border-red-300 rounded-lg bg-red-50">
          <p className="text-red-800 text-sm font-medium">{errors.general}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
            <UserIcon className="w-5 h-5 mr-2 text-blue-600" />
            Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <UserIcon className="w-4 h-4 mr-2 text-gray-500" />
                Full Name *
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg ${
                  errors.fullName ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
                placeholder="Enter full name"
                disabled={loading}
              />
              {errors.fullName && (
                <p className="text-red-600 text-sm mt-2 font-medium">
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Username */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <UserIcon className="w-4 h-4 mr-2 text-gray-500" />
                Username *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleChange("username", e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg ${
                  errors.username ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
                placeholder="Enter username"
                disabled={loading}
              />
              {errors.username && (
                <p className="text-red-600 text-sm mt-2 font-medium">
                  {errors.username}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div className="md:col-span-2">
              <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <Phone className="w-4 h-4 mr-2 text-gray-500" />
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => handleChange("phoneNumber", e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg ${
                  errors.phoneNumber ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
                placeholder="Enter phone number (e.g., 9322308018)"
                disabled={loading}
              />
              {errors.phoneNumber && (
                <p className="text-red-600 text-sm mt-2 font-medium">
                  {errors.phoneNumber}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
            <KeyRound className="w-5 h-5 mr-2 text-blue-600" />
            Security Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Password */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <KeyRound className="w-4 h-4 mr-2 text-gray-500" />
                Password{" "}
                {mode === "create" ? "*" : "(leave blank to keep current)"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    errors.password
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  placeholder={
                    mode === "create" ? "Enter password" : "Enter new password"
                  }
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-600 text-sm mt-2 font-medium">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <KeyRound className="w-4 h-4 mr-2 text-gray-500" />
                Confirm Password{" "}
                {mode === "create" ? "*" : "(required if changing password)"}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleChange("confirmPassword", e.target.value)
                  }
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    errors.confirmPassword
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  placeholder="Confirm password"
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-600 text-sm mt-2 font-medium">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-blue-600" />
            Role & Permissions
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Role Select */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <Shield className="w-4 h-4 mr-2 text-gray-500" />
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleChange("role", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-colors"
                disabled={loading}
              >
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Company - Only show for super admins */}
            {showCompanySelect && (
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                  <Building className="w-4 h-4 mr-2 text-gray-500" />
                  Company *
                </label>
                <select
                  value={formData.companyId}
                  onChange={(e) => handleChange("companyId", e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-colors ${
                    errors.companyId
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300"
                  }`}
                  disabled={loading}
                >
                  <option value="">Select a company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                {errors.companyId && (
                  <p className="text-red-600 text-sm mt-2 font-medium">
                    {errors.companyId}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 space-y-4">
            {/* Active Status - Change id and field name */}
            <div className="flex items-center p-4 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => handleChange("is_active", e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={loading}
              />
              <label
                htmlFor="is_active"
                className="ml-3 flex items-center text-sm font-medium text-gray-700"
              >
                User is active
              </label>
            </div>

            {/* Can Assign Tasks Checkbox */}
            {showCanAssignTasks && (
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="canAssignTasks"
                  checked={formData.canAssignTasks}
                  onChange={(e) =>
                    handleChange("canAssignTasks", e.target.checked)
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading || !isCanAssignTasksEditable}
                />
                <label
                  htmlFor="canAssignTasks"
                  className="ml-3 flex items-center text-sm font-medium text-gray-700"
                >
                  <ClipboardList className="w-4 h-4 mr-2 text-gray-500" />
                  Can assign tasks
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4 pt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="min-w-[140px] px-6 py-3"
          >
            {loading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </span>
            ) : mode === "create" ? (
              "Create User"
            ) : (
              "Update User"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};