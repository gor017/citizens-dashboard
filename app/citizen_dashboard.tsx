'use client';

import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, User, Shield, LogOut, ChevronLeft, ChevronRight, Plus, Trash2, Copy } from 'lucide-react';

interface Membership {
  id: number;
  name: string;
  login: string;
  password: string;
  number: string;
}

interface CustomField {
  id: number;
  name: string;
  value: string;
}

export interface BankAccount {
  id?: number;
  bank: string;
  creditCard: string;
  expirationDate: string;
  cvv: string;
  routingNumber: string;
  accountNumber: string;
  dueDate: string;
  username: string;
  password: string;
}

interface Citizen {
  id: number;
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  ssn: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  notes: string;
  bank: string[];
  creditCard: string;
  expirationDate: string;
  cvv: string;
  routingNumber: string;
  accountNumber: string;
  dueDate: string;
  active: boolean;
  username: string;
  password: string;
  bankAccounts?: BankAccount[];
  memberships: Membership[];
  customFields: CustomField[];
  _showBankDropdown?: boolean;
}

type NewCitizenForm = Omit<Citizen, 'id'>;

type EditData = Citizen;

type DeleteTarget =
  | { type: 'citizen'; id: number }
  | { type: 'membership'; citizenId: number; index: number }
  | { type: 'customField'; citizenId: number; index: number }
  | { type: 'membershipNew'; index: number }
  | { type: 'customFieldNew'; index: number }
  | { type: 'bankAccount'; citizenId: number; index: number }
  | { type: 'bankAccountNew'; index: number };

const emptyBankAccount = (): BankAccount => ({
  bank: '',
  creditCard: '',
  expirationDate: '',
  cvv: '',
  routingNumber: '',
  accountNumber: '',
  dueDate: '',
  username: '',
  password: '',
});

const initialNewCitizen: NewCitizenForm = {
  firstName: '',
  middleName: '',
  lastName: '',
  dob: '',
  ssn: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
  notes: '',
  bank: [],
  creditCard: '',
  expirationDate: '',
  cvv: '',
  routingNumber: '',
  accountNumber: '',
  dueDate: '',
  active: true,
  username: '',
  password: '',
  bankAccounts: [],
  memberships: [],
  customFields: []
};

const showToast = (message: string) => {
  // Lightweight DOM-based toast (no dependency on a toast library).
  const existing = document.getElementById('copy-toast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'copy-toast';
  el.textContent = message;
  el.className =
    'fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm';
  document.body.appendChild(el);

  window.setTimeout(() => {
    el.remove();
  }, 1500);
};

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied');
  } catch {
    // Fallback for environments where clipboard API is restricted.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Copied');
  }
};

type CopyableInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  copyValue?: string;
  wrapperClassName?: string;
};

type CopyableTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  copyValue?: string;
  wrapperClassName?: string;
};

const CopyableInput = ({
  copyValue,
  wrapperClassName = '',
  className = '',
  ...props
}: CopyableInputProps) => {
  const effectiveCopy =
    copyValue ??
    (typeof props.value === 'string'
      ? props.value
      : props.value != null
        ? String(props.value)
        : '');

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input {...props} className={`${className} pr-10 w-full`} />
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void copyText(effectiveCopy);
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        aria-label="Copy value"
        title="Copy"
      >
        <Copy size={14} />
      </button>
    </div>
  );
};

const CopyableText = ({ value, className = '' }: { value: string; className?: string }) => {
  const safeValue = value ?? '';
  const shouldShowCopy = safeValue.trim().length > 0;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="flex-1 text-gray-700 break-words whitespace-pre-wrap">{safeValue}</span>
      {shouldShowCopy && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void copyText(safeValue);
          }}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Copy value"
          title="Copy"
        >
          <Copy size={14} />
        </button>
      )}
    </div>
  );
};

const CopyableTextarea = ({
  copyValue,
  wrapperClassName = '',
  className = '',
  ...props
}: CopyableTextareaProps) => {
  const effectiveCopy =
    copyValue ??
    (typeof props.value === 'string'
      ? props.value
      : props.value != null
        ? String(props.value)
        : '');
  const shouldShowCopy = effectiveCopy.trim().length > 0;

  return (
    <div className={`relative ${wrapperClassName}`}>
      <textarea
        {...props}
        className={`${className} pr-10 w-full resize-y`}
      />
      {shouldShowCopy && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void copyText(effectiveCopy);
          }}
          className="absolute right-2 top-3 text-gray-400 hover:text-gray-600"
          aria-label="Copy value"
          title="Copy"
        >
          <Copy size={14} />
        </button>
      )}
    </div>
  );
};

const CitizenDashboard = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'citizen' | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<EditData>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [bankFilter, setBankFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [bankExcludeFilter, setBankExcludeFilter] = useState('');
  const [showDueSoon, setShowDueSoon] = useState(false);
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [showBankExcludeDropdown, setShowBankExcludeDropdown] = useState(false);
  const [bankInput, setBankInput] = useState('');
  const [bankAccountDropdownIndex, setBankAccountDropdownIndex] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [addFieldForNewCitizen, setAddFieldForNewCitizen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [newCitizen, setNewCitizen] = useState<NewCitizenForm & { _showBankDropdown?: boolean }>(initialNewCitizen);
  const [showBankDeleteModal, setShowBankDeleteModal] = useState(false);
  const [bankDeleteTarget, setBankDeleteTarget] = useState<string | null>(null);
  const [bankDeleteError, setBankDeleteError] = useState<string | null>(null);
  const [bankDeleteIsLinked, setBankDeleteIsLinked] = useState(false);
  const [bankDeleteChecking, setBankDeleteChecking] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newBankName, setNewBankName] = useState('');
  const [availableBanks, setAvailableBanks] = useState<string[]>([]);

  // ── Restore session on mount ─────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.role) {
          setIsLoggedIn(true);
          setUserRole(data.role);
          setCurrentUserId(data.userId ?? null);
        }
      })
      .catch(() => {});
  }, []);

  // ── Load available banks once logged in ──────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    fetch('/api/banks')
      .then(r => r.ok ? r.json() : { banks: [] })
      .then(data => setAvailableBanks(data.banks ?? []))
      .catch(() => {});
  }, [isLoggedIn]);

  const fetchCitizens = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(pageSize),
      });
      if (searchTerm) params.set('search', searchTerm);
      if (bankFilter) params.set('bank', bankFilter);
      if (bankExcludeFilter) params.set('bankExclude', bankExcludeFilter);
      if (activeFilter !== 'all') params.set('active', activeFilter);
      if (showDueSoon) params.set('dueSoon', 'true');

      const res = await fetch(`/api/citizens?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Failed to load citizens');
      }
      const data = await res.json();
      setCitizens(data.citizens ?? []);
      setTotalCount(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchCitizens();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, bankFilter, activeFilter, bankExcludeFilter, showDueSoon, isLoggedIn]);

  const handleLogin = async () => {
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error ?? 'Invalid username or password');
        return;
      }
      setIsLoggedIn(true);
      setUserRole(data.role);
      setCurrentUserId(data.userId ?? null);
      setUsername('');
      setPassword('');
      setCurrentPage(1);
    } catch {
      setLoginError('Network error. Please try again.');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsLoggedIn(false);
    setUserRole(null);
    setCurrentUserId(null);
    setEditingId(null);
    setEditData({});
    setUsername('');
    setPassword('');
    setCitizens([]);
    setCurrentPage(1);
  };

  const startEdit = (citizen: Citizen) => {
    setEditingId(citizen.id);
    setEditData({
      ...citizen,
      bankAccounts: citizen.bankAccounts ?? [],
      _showBankDropdown: false,
      memberships: citizen.memberships ?? [],
      customFields: citizen.customFields ?? []
    });
    setBankInput('');
    setValidationErrors({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
    setBankInput('');
    setBankAccountDropdownIndex(null);
    setValidationErrors({});
  };

  const validateField = (field: string, value: unknown): Record<string, string> => {
    const errors: Record<string, string> = {};
    const s = typeof value === 'string' ? value : value != null ? String(value) : '';
    switch (field) {
      case 'firstName':
      case 'lastName':
      case 'middleName':
        if (field !== 'middleName' && (!value || s.trim() === '')) {
          errors[field] = 'This field is required';
        } else if (value && !/^[a-zA-Z\s-']+$/.test(s)) {
          errors[field] = 'Only letters, spaces, hyphens and apostrophes allowed';
        } else if (value && s.length < 2) {
          errors[field] = 'Must be at least 2 characters';
        }
        break;
      case 'dob':
        if (!value) {
          errors[field] = 'Date of birth is required';
        } else {
          const dateStr = typeof value === 'string' ? value : String(value);
          const yearPart = dateStr.split('-')[0];
          if (yearPart && yearPart.length !== 4) {
            errors[field] = 'Year must be 4 digits';
          } else {
            const dob = new Date(dateStr);
            const today = new Date();
            const age = today.getFullYear() - dob.getFullYear();
            if (dob > today) {
              errors[field] = 'Date cannot be in the future';
            } else if (age < 18) {
              errors[field] = 'Must be at least 18 years old';
            } else if (age > 120) {
              errors[field] = 'Invalid date of birth';
            } else if (Number.isNaN(dob.getTime())) {
              errors[field] = 'Invalid date of birth';
            }
          }
        }
        break;
      case 'ssn':
        if (!value) {
          errors[field] = 'SSN is required';
        } else if (!/^\d{3}-\d{2}-\d{4}$/.test(s)) {
          errors[field] = 'Format must be XXX-XX-XXXX';
        }
        break;
      case 'address':
        if (!value || s.trim() === '') {
          errors[field] = 'Address is required';
        } else if (s.length < 5) {
          errors[field] = 'Address must be at least 5 characters';
        }
        break;
      case 'city':
        if (!value || s.trim() === '') {
          errors[field] = 'City is required';
        } else if (!/^[a-zA-Z\s-']+$/.test(s)) {
          errors[field] = 'Only letters, spaces, hyphens and apostrophes allowed';
        }
        break;
      case 'state':
        if (!value || s.trim() === '') {
          errors[field] = 'State is required';
        } else if (!/^[A-Z]{2}$/.test(s)) {
          errors[field] = 'Must be 2 uppercase letters (e.g., CA, NY)';
        }
        break;
      case 'zip':
        if (!value) {
          errors[field] = 'ZIP code is required';
        } else if (!/^\d{5}$/.test(s)) {
          errors[field] = 'Must be 5 digits';
        }
        break;
      case 'phone':
        if (!value) {
          errors[field] = 'Phone is required';
        } else if (!/^\d{3}-\d{3}-\d{4}$/.test(s)) {
          errors[field] = 'Format must be xxx-xxx-xxxx';
        }
        break;
      case 'creditCard':
        if (!value) {
          errors[field] = 'Credit card is required';
        } else if (!/^\d{4}-\d{4}-\d{4}-\d{3,4}$/.test(s)) {
          errors[field] = 'Format must be XXXX-XXXX-XXXX-XXXX';
        }
        break;
      case 'expirationDate':
        if (!value) {
          errors[field] = 'Expiration date is required';
        } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(s)) {
          errors[field] = 'Format must be MM/YY';
        } else {
          const [month, year] = s.split('/');
          const expDate = new Date(2000 + parseInt(year, 10), parseInt(month, 10) - 1);
          const today = new Date();
          if (expDate < today) {
            errors[field] = 'Card has expired';
          }
        }
        break;
      case 'cvv':
        if (!value) {
          errors[field] = 'CVV is required';
        } else if (!/^\d{3,4}$/.test(s)) {
          errors[field] = 'CVV must be 3 or 4 digits';
        }
        break;
      case 'routingNumber':
        if (!value) {
          errors[field] = 'Routing number is required';
        } else if (!/^\d{9}$/.test(s)) {
          errors[field] = 'Routing number must be 9 digits';
        }
        break;
      case 'accountNumber':
        if (!value) {
          errors[field] = 'Account number is required';
        } else if (!/^\d{8,17}$/.test(s)) {
          errors[field] = 'Account number must be 8-17 digits';
        }
        break;
      case 'dueDate':
        if (!value) {
          errors[field] = 'Due date is required';
        } else {
          const dateStr = typeof value === 'string' ? value : String(value);
          const yearPart = dateStr.split('-')[0];
          if (yearPart && yearPart.length !== 4) {
            errors[field] = 'Year must be 4 digits';
          } else {
            const dueDate = new Date(dateStr);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (Number.isNaN(dueDate.getTime())) {
              errors[field] = 'Invalid due date';
            } else if (dueDate < today) {
              errors[field] = 'Due date cannot be in the past';
            }
          }
        }
        break;
      case 'bank':
        if (!Array.isArray(value) || value.length === 0) {
          errors[field] = 'At least one bank is required';
        }
        break;
      case 'username':
        if (!value || s.trim() === '') {
          errors[field] = 'Username is required';
        } else if (s.length < 4) {
          errors[field] = 'Username must be at least 4 characters';
        } else if (!/^[a-zA-Z0-9._-]+$/.test(s)) {
          errors[field] = 'Username can only contain letters, numbers, dots, underscores, and hyphens';
        }
        break;
      case 'password':
        if (!value || s.trim() === '') {
          errors[field] = 'Password is required';
        } else if (s.length < 6) {
          errors[field] = 'Password must be at least 6 characters';
        }
        break;
    }
    return errors;
  };

  const validateAllFields = (data: Record<string, unknown>): Record<string, string> => {
    const allErrors: Record<string, string> = {};
    const fields = ['firstName', 'middleName', 'lastName', 'dob', 'ssn', 'address', 'city', 'state', 'zip', 'phone', 'username', 'password'];
    fields.forEach(field => {
      const fieldErrors = validateField(field, data[field]);
      if (Object.keys(fieldErrors).length > 0) {
        Object.assign(allErrors, fieldErrors);
      }
    });
    return allErrors;
  };

  const saveEdit = async () => {
    const errors = validateAllFields(editData);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const invalidMemberships = (editData.memberships || []).some(m => 
      !m.name.trim() || !m.login.trim() || !m.password.trim() || !m.number.trim()
    );
    if (invalidMemberships) {
      setError('All membership fields (Name, Login, Password, Number) must be filled');
      return;
    }

    const invalidCustomFields = (editData.customFields || []).some(f => !f.value.trim());
    if (invalidCustomFields) {
      setError('All custom field values must be filled');
      return;
    }

    try {
      const res = await fetch(`/api/citizens/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (!res.ok) {
        const body = await res.json();
        const message = body.error ?? 'Failed to save';
        if (body.field) {
          setValidationErrors(prev => ({ ...prev, [body.field]: message }));
        }
        setError(message);
        return;
      }
      setEditingId(null);
      setEditData({});
      setBankInput('');
      setBankAccountDropdownIndex(null);
      setValidationErrors({});
      setError(null);
      await fetchCitizens();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      if (/date|invalid input syntax/i.test(message)) {
        setValidationErrors(prev => ({ ...prev, dob: message }));
      }
      setError(message);
    }
  };

  const addCitizen = async () => {
    const errors = validateAllFields(newCitizen);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const invalidMemberships = (newCitizen.memberships || []).some(m => 
      !m.name.trim() || !m.login.trim() || !m.password.trim() || !m.number.trim()
    );
    if (invalidMemberships) {
      setError('All membership fields (Name, Login, Password, Number) must be filled');
      return;
    }

    const invalidCustomFields = (newCitizen.customFields || []).some(f => !f.value.trim());
    if (invalidCustomFields) {
      setError('All custom field values must be filled');
      return;
    }

    try {
      const res = await fetch('/api/citizens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCitizen),
      });
      if (!res.ok) {
        const body = await res.json();
        const message = body.error ?? 'Failed to create citizen';
        if (res.status === 409) {
          setValidationErrors(prev => ({ ...prev, username: message }));
          setError(message);
          return;
        }
        if (body.field) {
          setValidationErrors(prev => ({ ...prev, [body.field]: message }));
        }
        setError(message);
        return;
      }
      setShowAddModal(false);
      setNewCitizen({ ...initialNewCitizen });
      setBankInput('');
      setBankAccountDropdownIndex(null);
      setValidationErrors({});
      setError(null);
      await fetchCitizens();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      if (/date|invalid input syntax/i.test(message)) {
        setValidationErrors(prev => ({ ...prev, dob: message }));
      }
      setError(message);
    }
  };

  const handleInputChange = (field: string, value: string | string[] | Membership[] | CustomField[]) => {
    setEditData({ ...editData, [field]: value });
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleNewCitizenChange = (field: string, value: string | string[] | Membership[] | CustomField[]) => {
    setNewCitizen({ ...newCitizen, [field]: value });
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const toggleActive = async (id: number) => {
    if (userRole !== 'admin') return;
    try {
      const res = await fetch(`/api/citizens/${id}/active`, { method: 'PATCH' });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Failed to toggle status');
      }
      const { active } = await res.json();
      setCitizens(citizens.map(c => (c.id === id ? { ...c, active } : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const deleteCitizen = async (id: number) => {
    setDeleteTarget({ type: 'citizen', id });
    setShowDeleteModal(true);
  };

  const uniqueBanks = availableBanks;
  const filteredBanks = uniqueBanks.filter((bank: string) => bank.toLowerCase().includes(bankFilter.toLowerCase()));
  const filteredExcludeBanks = uniqueBanks.filter((bank: string) => bank.toLowerCase().includes(bankExcludeFilter.toLowerCase()));

  const addNewBank = async () => {
    if (!newBankName.trim()) return;
    try {
      const res = await fetch('/api/banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBankName.trim() }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Failed to add bank');
      }
      setAvailableBanks(prev => [...prev, newBankName.trim()].sort());
      setNewBankName('');
      setShowAddBankModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const reloadBanks = async () => {
    try {
      const res = await fetch('/api/banks');
      const data = await res.json();
      setAvailableBanks(data.banks ?? []);
    } catch {
      // Silent refresh failure; list will remain as-is.
    }
  };

  const deleteBank = async (bankName: string): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const res = await fetch('/api/banks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: bankName }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: body.error ?? 'Cannot delete bank (it may be linked to users).' };
      }

      await reloadBanks();
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to delete bank',
      };
    }
  };

  const openBankDeleteConfirm = (bankName: string) => {
    setBankDeleteTarget(bankName);
    setBankDeleteError(null);
    setBankDeleteIsLinked(false);
    setBankDeleteChecking(true);
    setShowBankDeleteModal(true);

    // Pre-check linked status so we can immediately show "cannot delete".
    void (async () => {
      try {
        const res = await fetch(
          `/api/banks?checkLinked=true&name=${encodeURIComponent(bankName)}`
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setBankDeleteError(body.error ?? 'Failed to check bank status');
          setBankDeleteIsLinked(false);
          return;
        }
        const linked = Boolean(body.linked);
        setBankDeleteIsLinked(linked);
        if (linked) {
          setBankDeleteError(body.error ?? 'Cannot delete bank: it is linked to users.');
        }
      } finally {
        setBankDeleteChecking(false);
      }
    })();
  };

  const confirmDeleteBank = async () => {
    if (!bankDeleteTarget) return;
    if (bankDeleteIsLinked) return;
    const res = await deleteBank(bankDeleteTarget);
    if (!res.ok) {
      setBankDeleteError(res.error);
      if (/linked to users/i.test(res.error)) {
        setBankDeleteIsLinked(true);
      }
      return;
    }
    setShowBankDeleteModal(false);
    setBankDeleteTarget(null);
    setBankDeleteError(null);
    setBankDeleteIsLinked(false);
    setBankDeleteChecking(false);
  };

  const addNewField = () => {
    if (newFieldName.trim()) {
      const newField: CustomField = { id: Date.now(), name: newFieldName.trim(), value: '' };
      if (addFieldForNewCitizen) {
        setNewCitizen({ ...newCitizen, customFields: [...newCitizen.customFields, newField] });
      } else {
        setEditData({ ...editData, customFields: [...(editData.customFields ?? []), newField] });
      }
      setNewFieldName('');
      setShowAddFieldModal(false);
      setAddFieldForNewCitizen(false);
    }
  };

  const handleBankSelect = (bank: string) => {
    setBankFilter(bank);
    setShowBankDropdown(false);
    setCurrentPage(1);
  };

  const clearBankFilter = () => {
    setBankFilter('');
    setShowBankDropdown(false);
  };

  const clearBankExcludeFilter = () => {
    setBankExcludeFilter('');
    setShowBankExcludeDropdown(false);
  };

  const handleBankExcludeSelect = (bank: string) => {
    setBankExcludeFilter(bank);
    setShowBankExcludeDropdown(false);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const getCurrentUserName = () => {
    if (userRole === 'admin') return 'Administrator';
    const citizen = citizens.find(c => c.id === currentUserId);
    return citizen ? `${citizen.firstName} ${citizen.lastName}` : 'User';
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const updateBankAccount = (index: number, updates: Partial<BankAccount>) => {
    const list = [...(editData.bankAccounts ?? [])];
    list[index] = { ...list[index], ...updates };
    setEditData({ ...editData, bankAccounts: list });
  };

  const renderBankAccountFields = (
    account: BankAccount,
    index: number,
    isNewCitizen: boolean,
    onUpdate: (index: number, updates: Partial<BankAccount>) => void
  ) => {
    const formatCreditCard = (raw: string) => {
      const d = raw.replace(/\D/g, '').slice(0, 16);
      const parts = [d.slice(0, 4), d.slice(4, 8), d.slice(8, 12), d.slice(12)];
      return parts.filter(Boolean).join('-');
    };
    const formatExpiration = (raw: string) => {
      const v = raw.replace(/\D/g, '').slice(0, 4);
      if (v.length <= 2) return v;
      return `${v.slice(0, 2)}/${v.slice(2)}`;
    };
    const today = new Date();
    const dueDateMin = today.toISOString().split('T')[0];
    const dueDateMax = '2099-12-31';
    const isBankDropdownOpen = bankAccountDropdownIndex === index;
    const availableBanksForAccount = uniqueBanks.filter(
      (b) => bankInput.length === 0 || b.toLowerCase().includes(bankInput.toLowerCase())
    );
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="relative">
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Bank</label>
          <CopyableInput
            type="text"
            value={isBankDropdownOpen ? bankInput : account.bank}
            onChange={(e) => {
              setBankInput(e.target.value);
              setBankAccountDropdownIndex(index);
            }}
            onFocus={() => {
              setBankAccountDropdownIndex(index);
              setBankInput(account.bank);
            }}
            onBlur={() => {
              setTimeout(() => {
                setBankAccountDropdownIndex(null);
                setBankInput('');
              }, 200);
            }}
            className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900 text-sm"
            placeholder="Type to add bank..."
            copyValue={isBankDropdownOpen ? bankInput : account.bank}
          />
          {isBankDropdownOpen && availableBanksForAccount.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {availableBanksForAccount.map((bank: string) => (
                <div
                  key={bank}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 transition text-sm text-gray-900"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onUpdate(index, { bank });
                    setBankAccountDropdownIndex(null);
                    setBankInput('');
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate">{bank}</span>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setBankAccountDropdownIndex(null);
                        setBankInput('');
                        openBankDeleteConfirm(bank);
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                      aria-label={`Delete ${bank}`}
                      title="Delete bank"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowAddBankModal(true)}
            className="mt-1 text-xs text-blue-600 hover:text-blue-700"
          >
            + Add New Bank to Options
          </button>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Credit Card</label>
          <CopyableInput
            type="text"
            value={account.creditCard}
            onChange={(e) => onUpdate(index, { creditCard: formatCreditCard(e.target.value) })}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            maxLength={19}
            className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Expiration (MM/YY)</label>
          <CopyableInput
            type="text"
            value={account.expirationDate}
            onChange={(e) => onUpdate(index, { expirationDate: formatExpiration(e.target.value) })}
            placeholder="MM/YY"
            maxLength={5}
            className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">CVV</label>
          <CopyableInput
            type="text"
            value={account.cvv}
            onChange={(e) => onUpdate(index, { cvv: e.target.value })}
            placeholder="CVV"
            className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Routing Number</label>
          <CopyableInput
            type="text"
            value={account.routingNumber}
            onChange={(e) => onUpdate(index, { routingNumber: e.target.value })}
            placeholder="Routing"
            className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Account Number</label>
          <CopyableInput
            type="text"
            value={account.accountNumber}
            onChange={(e) => onUpdate(index, { accountNumber: e.target.value })}
            placeholder="Account"
            className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Due Date</label>
          <CopyableInput
            type="date"
            value={account.dueDate || ''}
            min={dueDateMin}
            max={dueDateMax}
            onChange={(e) => onUpdate(index, { dueDate: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Username</label>
          <CopyableInput
            type="text"
            value={account.username}
            onChange={(e) => onUpdate(index, { username: e.target.value })}
            placeholder="Bank username"
            className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Password</label>
          <CopyableInput
            type="text"
            value={account.password}
            onChange={(e) => onUpdate(index, { password: e.target.value })}
            placeholder="Bank password"
            className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900 text-sm"
          />
        </div>
      </div>
    );
  };

  const renderField = (citizen: Citizen | Partial<Citizen> | Record<string, unknown>, field: string, isNewCitizen = false) => {
    const isEditing = isNewCitizen ? true : editingId === (citizen as Citizen).id;
    const value = isNewCitizen ? (newCitizen as Record<string, unknown>)[field] : (isEditing ? (editData as Record<string, unknown>)[field] : (citizen as Record<string, unknown>)[field]);
    const handleChange = isNewCitizen ? handleNewCitizenChange : handleInputChange;

    if (isEditing && userRole === 'admin') {
      if (field === 'notes') {
        return (
          <div>
            <CopyableTextarea
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => handleChange(field, e.target.value)}
              placeholder="Notes..."
              rows={4}
              className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 text-gray-900 ${validationErrors[field] ? 'border-red-300 focus:ring-red-500' : 'border-blue-300 focus:ring-blue-500'}`}
            />
            {validationErrors[field] && <p className="text-red-600 text-xs mt-1">{validationErrors[field]}</p>}
          </div>
        );
      }
      if (field === 'username' || field === 'password') {
        return (
          <div>
            <CopyableInput
              type="text"
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => handleChange(field, e.target.value)}
              className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 text-gray-900 ${validationErrors[field] ? 'border-red-300 focus:ring-red-500' : 'border-blue-300 focus:ring-blue-500'}`}
              placeholder={field === 'password' ? 'Enter new password (leave blank to keep current)' : ''}
            />
            {validationErrors[field] && <p className="text-red-600 text-xs mt-1">{validationErrors[field]}</p>}
          </div>
        );
      }

      if (field === 'expirationDate') {
        return (
          <div>
            <CopyableInput
              type="text"
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => handleChange(field, e.target.value)}
              placeholder="MM/YY"
              maxLength={5}
              className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 text-gray-900 ${validationErrors[field] ? 'border-red-300 focus:ring-red-500' : 'border-blue-300 focus:ring-blue-500'}`}
            />
            {validationErrors[field] && <p className="text-red-600 text-xs mt-1">{validationErrors[field]}</p>}
          </div>
        );
      }

      if (field === 'ssn') {
        const formatSsn = (raw: string) => {
          const d = raw.replace(/\D/g, '').slice(0, 9);
          if (d.length <= 3) return d;
          if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
          return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
        };
        return (
          <div>
            <CopyableInput
              type="text"
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => handleChange(field, formatSsn(e.target.value))}
              placeholder="xxx-xx-xxxx"
              maxLength={11}
              className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 text-gray-900 ${validationErrors[field] ? 'border-red-300 focus:ring-red-500' : 'border-blue-300 focus:ring-blue-500'}`}
            />
            {validationErrors[field] && <p className="text-red-600 text-xs mt-1">{validationErrors[field]}</p>}
          </div>
        );
      }

      if (field === 'phone') {
        const formatPhone = (raw: string) => {
          const d = raw.replace(/\D/g, '').slice(0, 10);
          if (d.length <= 3) return d;
          if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
          return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
        };
        return (
          <div>
            <CopyableInput
              type="text"
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => handleChange(field, formatPhone(e.target.value))}
              placeholder="xxx-xxx-xxxx"
              maxLength={12}
              className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 text-gray-900 ${validationErrors[field] ? 'border-red-300 focus:ring-red-500' : 'border-blue-300 focus:ring-blue-500'}`}
            />
            {validationErrors[field] && <p className="text-red-600 text-xs mt-1">{validationErrors[field]}</p>}
          </div>
        );
      }

      if (field === 'bank') {
        const selectedBanks = isNewCitizen ? (Array.isArray(newCitizen.bank) ? newCitizen.bank : []) : (Array.isArray(editData.bank) ? editData.bank : []);
        const availableBanksList = uniqueBanks.filter(bank => {
          const matchesSearch = bankInput.length === 0 || bank.toLowerCase().includes(bankInput.toLowerCase());
          const notSelected = !selectedBanks.includes(bank);
          return matchesSearch && notSelected;
        });
        
        const addBank = (bank: string) => {
          if (isNewCitizen) {
            setNewCitizen(prev => {
              const currentBanks = Array.isArray(prev.bank) ? prev.bank : [];
              if (!currentBanks.includes(bank)) {
                if (validationErrors.bank) {
                  setValidationErrors(errors => {
                    const newErrors = { ...errors };
                    delete newErrors.bank;
                    return newErrors;
                  });
                }
                return { ...prev, bank: [...currentBanks, bank], _showBankDropdown: false };
              }
              return prev;
            });
          } else {
            setEditData(prev => {
              const currentBanks = Array.isArray(prev.bank) ? prev.bank : [];
              if (!currentBanks.includes(bank)) {
                if (validationErrors.bank) {
                  setValidationErrors(errors => {
                    const newErrors = { ...errors };
                    delete newErrors.bank;
                    return newErrors;
                  });
                }
                return { ...prev, bank: [...currentBanks, bank], _showBankDropdown: false };
              }
              return prev;
            });
          }
          setBankInput('');
        };
        
        const removeBank = (e: React.MouseEvent, bankToRemove: string) => {
          e.preventDefault();
          e.stopPropagation();
          if (isNewCitizen) {
            setNewCitizen(prev => {
              const currentBanks = Array.isArray(prev.bank) ? prev.bank : [];
              return { ...prev, bank: currentBanks.filter(b => b !== bankToRemove) };
            });
          } else {
            setEditData(prev => {
              const currentBanks = Array.isArray(prev.bank) ? prev.bank : [];
              return { ...prev, bank: currentBanks.filter(b => b !== bankToRemove) };
            });
          }
        };
        
        return (
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedBanks.map((bank: string, index: number) => (
                <span key={`${bank}-${index}`} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {bank}
                  <button type="button" onClick={(e) => removeBank(e, bank)} className="hover:bg-blue-200 rounded-full p-0.5">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="relative">
              <CopyableInput
                type="text"
                value={bankInput}
                onChange={(e) => {
                  setBankInput(e.target.value);
                  if (isNewCitizen) {
                    setNewCitizen(prev => ({ ...prev, _showBankDropdown: true }));
                  } else {
                    setEditData(prev => ({ ...prev, _showBankDropdown: true }));
                  }
                }}
                onFocus={() => {
                  if (isNewCitizen) {
                    setNewCitizen(prev => ({ ...prev, _showBankDropdown: true }));
                  } else {
                    setEditData(prev => ({ ...prev, _showBankDropdown: true }));
                  }
                }}
                onBlur={() => {
                  setTimeout(() => {
                    if (isNewCitizen) {
                      setNewCitizen(prev => ({ ...prev, _showBankDropdown: false }));
                    } else {
                      setEditData(prev => ({ ...prev, _showBankDropdown: false }));
                    }
                    setBankInput('');
                  }, 200);
                }}
                className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 text-gray-900 ${validationErrors.bank ? 'border-red-300 focus:ring-red-500' : 'border-blue-300 focus:ring-blue-500'}`}
                placeholder="Type to add bank..."
              />
              {((isNewCitizen && newCitizen._showBankDropdown) || (!isNewCitizen && editData._showBankDropdown)) && availableBanksList.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {availableBanksList.map((bank: string) => (
                    <div
                      key={bank}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 transition text-sm text-gray-900"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addBank(bank);
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate">{bank}</span>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setBankInput('');
                            if (isNewCitizen) {
                              setNewCitizen(prev => ({ ...prev, _showBankDropdown: false }));
                            } else {
                              setEditData(prev => ({ ...prev, _showBankDropdown: false }));
                            }
                            openBankDeleteConfirm(bank);
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                          aria-label={`Delete ${bank}`}
                          title="Delete bank"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {validationErrors.bank && <p className="text-red-600 text-xs mt-1">{validationErrors.bank}</p>}
            <button
              type="button"
              onClick={() => setShowAddBankModal(true)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700"
            >
              + Add New Bank to Options
            </button>
          </div>
        );
      }
      
      const today = new Date();
      const dobMaxDate = new Date(today);
      dobMaxDate.setFullYear(today.getFullYear() - 18);
      const dobMinDate = new Date(today);
      dobMinDate.setFullYear(today.getFullYear() - 120);
      const dobMin = dobMinDate.toISOString().split('T')[0];
      const dobMax = dobMaxDate.toISOString().split('T')[0];
      const dueDateMin = today.toISOString().split('T')[0];
      const dueDateMax = '2099-12-31';
      const dateMinMax = field === 'dob' ? { min: dobMin, max: dobMax } : field === 'dueDate' ? { min: dueDateMin, max: dueDateMax } : {};
      return (
        <div>
          <CopyableInput
            type={field === 'dob' || field === 'dueDate' ? 'date' : 'text'}
            value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
            onChange={(e) => handleChange(field, e.target.value)}
            {...dateMinMax}
            className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 text-gray-900 ${validationErrors[field] ? 'border-red-300 focus:ring-red-500' : 'border-blue-300 focus:ring-blue-500'}`}
          />
          {validationErrors[field] && <p className="text-red-600 text-xs mt-1">{validationErrors[field]}</p>}
        </div>
      );
    }

    if (field === 'bank' && !isNewCitizen) {
      const banks = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-2">
          {banks.map((bank: string, index: number) => (
            <span
              key={`${bank}-${index}`}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
            >
              <span className="max-w-[160px] truncate">{bank}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void copyText(bank);
                }}
                className="text-blue-800/60 hover:text-blue-800"
                aria-label={`Copy ${bank}`}
                title="Copy"
              >
                <Copy size={12} />
              </button>
            </span>
          ))}
        </div>
      );
    }

    if ((field === 'username' || field === 'password') && !isNewCitizen) {
      return <CopyableText value={String(value ?? '')} />;
    }

    if (field === 'notes') {
      return (
        <CopyableText
          value={value != null ? String(value) : ''}
          className="w-full"
        />
      );
    }

    return <CopyableText value={value != null ? String(value) : ''} />;
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Citizen Portal</h1>
            <p className="text-gray-600 mt-2">Sign in to access your account</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
              <CopyableInput
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Enter your username"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <CopyableInput
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Enter your password"
              />
            </div>
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{loginError}</div>
            )}
            <button type="button" onClick={handleLogin} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold">
              Sign In
            </button>
          </div>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 font-semibold mb-2">Demo Credentials:</p>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Admin:</strong> admin / admin123</p>
              <p><strong>Citizen:</strong> john.smith / citizen123</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Citizen Management Dashboard</h1>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {userRole === 'admin' ? <Shield className="text-blue-600" size={18} /> : <User className="text-green-600" size={18} />}
                  <span className="text-sm text-gray-600">
                    Logged in as: <span className="font-semibold">{getCurrentUserName()}</span>
                  </span>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full font-semibold ${userRole === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                  {userRole === 'admin' ? 'ADMIN' : 'CITIZEN'}
                </span>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>

      {userRole === 'admin' && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Search & Filters</h2>
              <button
                onClick={() => {
                  setShowAddModal(true);
                  setValidationErrors({});
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
              >
                <Plus size={20} />
                Add New Citizen
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Search Citizens</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search by name, SSN, credit card, phone, or notes..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status Filter</label>
                  <select
                    value={activeFilter}
                    onChange={(e) => { setActiveFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Due Date Filter</label>
                  <button
                    onClick={() => { setShowDueSoon(!showDueSoon); setCurrentPage(1); }}
                    className={`w-full px-4 py-2.5 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                      showDueSoon 
                        ? 'bg-orange-600 text-white hover:bg-orange-700' 
                        : 'bg-orange-100 text-orange-800 hover:bg-orange-200 border border-orange-300'
                    }`}
                  >
                    {showDueSoon && <span>✓</span>}
                    Due in Next 10 Days
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Bank</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={bankFilter}
                      onChange={(e) => { setBankFilter(e.target.value); setShowBankDropdown(true); }}
                      onFocus={() => setShowBankDropdown(true)}
                      onBlur={() => setTimeout(() => setShowBankDropdown(false), 200)}
                      placeholder="Type to filter by bank..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                    {bankFilter && (
                      <button onClick={clearBankFilter} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X size={18} />
                      </button>
                    )}
                    {showBankDropdown && filteredBanks.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredBanks.map(bank => (
                          <div
                            key={bank}
                            onMouseDown={() => handleBankSelect(bank)}
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 transition text-gray-900"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="truncate">{bank}</span>
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setShowBankDropdown(false);
                                  openBankDeleteConfirm(bank);
                                }}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                                aria-label={`Delete ${bank}`}
                                title="Delete bank"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Exclude Citizens With Bank</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={bankExcludeFilter}
                      onChange={(e) => { setBankExcludeFilter(e.target.value); setShowBankExcludeDropdown(true); }}
                      onFocus={() => setShowBankExcludeDropdown(true)}
                      onBlur={() => setTimeout(() => setShowBankExcludeDropdown(false), 200)}
                      placeholder="Hide citizens with this bank..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                    {bankExcludeFilter && (
                      <button onClick={clearBankExcludeFilter} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X size={18} />
                      </button>
                    )}
                    {showBankExcludeDropdown && filteredExcludeBanks.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredExcludeBanks.map(bank => (
                          <div
                            key={bank}
                            onMouseDown={() => handleBankExcludeSelect(bank)}
                            className="w-full text-left px-4 py-2 hover:bg-red-50 transition text-red-700"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="truncate">
                                <span className="font-semibold">Exclude:</span> {bank}
                              </span>
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setShowBankExcludeDropdown(false);
                                  openBankDeleteConfirm(bank);
                                }}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                                aria-label={`Delete ${bank}`}
                                title="Delete bank"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This will hide citizens who have the selected bank
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              Showing <span className="font-semibold">{citizens.length}</span> of <span className="font-semibold">{totalCount}</span> citizens
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
        </div>
      )}

      {loading ? (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading citizens...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="max-w-7xl mx-auto space-y-4">
            {citizens.map((citizen) => (
              <div key={citizen.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">{citizen.firstName} {citizen.lastName}</h2>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${citizen.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {citizen.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  {userRole === 'admin' && (
                    <div className="flex items-center gap-2">
                      {editingId === citizen.id ? (
                        <>
                          <button onClick={saveEdit} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                            <Save size={18} />Save
                          </button>
                          <button onClick={cancelEdit} className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition">
                            <X size={18} />Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(citizen)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                            <Edit2 size={18} />Edit
                          </button>
                          <button 
                            onClick={() => deleteCitizen(citizen.id)} 
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                          >
                            <Trash2 size={18} />Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Status</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(citizen.id)}
                      disabled={userRole !== 'admin'}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${citizen.active ? 'bg-green-600' : 'bg-gray-300'} ${userRole === 'admin' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${citizen.active ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-sm text-gray-600">{citizen.active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">First Name</label>{renderField(citizen, 'firstName')}</div>
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">Middle Name</label>{renderField(citizen, 'middleName')}</div>
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">Last Name</label>{renderField(citizen, 'lastName')}</div>
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">Date of Birth</label>{renderField(citizen, 'dob')}</div>
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">SSN</label>{renderField(citizen, 'ssn')}</div>
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">Address</label>{renderField(citizen, 'address')}</div>
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">City</label>{renderField(citizen, 'city')}</div>
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">State</label>{renderField(citizen, 'state')}</div>
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">ZIP Code</label>{renderField(citizen, 'zip')}</div>
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">Phone</label>{renderField(citizen, 'phone')}</div>
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">Username</label>{renderField(citizen, 'username')}</div>
                  <div><label className="block text-sm font-semibold text-gray-600 mb-1">Password</label>{renderField(citizen, 'password')}</div>
                </div>

                <hr className="my-6 border-gray-200" />

                <div className="mt-4 max-w-[377px]">
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Notes</label>
                  {renderField(citizen, 'notes')}
                </div>

                {/* Bank Accounts Section (optional) */}
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-800">Bank Accounts</h3>
                      <span className="text-sm text-gray-500">(Optional)</span>
                    </div>
                    {userRole === 'admin' && editingId === citizen.id && (
                      <button
                        onClick={() => {
                          const list = editData.bankAccounts ?? [];
                          setEditData({ ...editData, bankAccounts: [...list, emptyBankAccount()] });
                        }}
                        className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                      >
                        <Plus size={16} />
                        Add Bank Account
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {(editingId === citizen.id ? (editData.bankAccounts ?? []) : (citizen.bankAccounts ?? [])).map((account: BankAccount, idx: number) => (
                      <div key={account.id ?? `new-${idx}`} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-gray-700">Account {idx + 1}</span>
                          {userRole === 'admin' && editingId === citizen.id && (
                            <button
                              onClick={() => { setDeleteTarget({ type: 'bankAccount', citizenId: citizen.id, index: idx }); setShowDeleteModal(true); }}
                              className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        {editingId === citizen.id && userRole === 'admin' ? (
                          renderBankAccountFields(account, idx, false, updateBankAccount)
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                            {account.bank && <div><span className="text-gray-500">Bank:</span> <span className="text-gray-900">{account.bank}</span></div>}
                            {account.creditCard && <div><span className="text-gray-500">Credit Card:</span> <span className="text-gray-900">{account.creditCard}</span></div>}
                            {account.expirationDate && <div><span className="text-gray-500">Expiration:</span> <span className="text-gray-900">{account.expirationDate}</span></div>}
                            {account.cvv && <div><span className="text-gray-500">CVV:</span> <span className="text-gray-900">{account.cvv}</span></div>}
                            {account.routingNumber && <div><span className="text-gray-500">Routing:</span> <span className="text-gray-900">{account.routingNumber}</span></div>}
                            {account.accountNumber && <div><span className="text-gray-500">Account:</span> <span className="text-gray-900">{account.accountNumber}</span></div>}
                            <div><span className="text-gray-500">Due Date:</span> <span className="text-gray-900">{account.dueDate || 'Not set'}</span></div>
                            {account.username && <div><span className="text-gray-500">Username:</span> <span className="text-gray-900">{account.username}</span></div>}
                            {account.password && <div><span className="text-gray-500">Password:</span> <span className="text-gray-900">{account.password}</span></div>}
                          </div>
                        )}
                      </div>
                    ))}
                    {(editingId !== citizen.id || (editData.bankAccounts ?? []).length === 0) && (citizen.bankAccounts ?? []).length === 0 && (
                      <p className="text-sm text-gray-500">No bank accounts added.</p>
                    )}
                  </div>
                </div>

                {/* Memberships Section */}
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Memberships</h3>
                    {userRole === 'admin' && editingId === citizen.id && (
                      <button
                        onClick={() => {
                          const newMembership = { 
                            id: Date.now(), 
                            name: '', 
                            login: '', 
                            password: '', 
                            number: '' 
                          };
                          setEditData({ ...editData, memberships: [...(editData.memberships || []), newMembership] });
                        }}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        <Plus size={16} />
                        Add Membership
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {(editingId === citizen.id ? (editData.memberships ?? []) : (citizen.memberships ?? [])).map((membership: Membership, idx: number) => (
                      <div key={membership.id} className="p-4 bg-gray-50 rounded-lg">
                        {editingId === citizen.id && userRole === 'admin' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <CopyableInput
                              type="text"
                              value={membership.name}
                              onChange={(e) => {
                                const updated = [...(editData.memberships ?? [])];
                                updated[idx].name = e.target.value;
                                setEditData({ ...editData, memberships: updated });
                              }}
                              placeholder="Membership Name"
                              className="px-3 py-2 border border-gray-300 rounded text-gray-900"
                            />
                            <CopyableInput
                              type="text"
                              value={membership.login}
                              onChange={(e) => {
                                const updated = [...(editData.memberships ?? [])];
                                updated[idx].login = e.target.value;
                                setEditData({ ...editData, memberships: updated });
                              }}
                              placeholder="Login"
                              className="px-3 py-2 border border-gray-300 rounded text-gray-900"
                            />
                            <CopyableInput
                              type="text"
                              value={membership.password}
                              onChange={(e) => {
                                const updated = [...(editData.memberships ?? [])];
                                updated[idx].password = e.target.value;
                                setEditData({ ...editData, memberships: updated });
                              }}
                              placeholder="Password"
                              className="px-3 py-2 border border-gray-300 rounded text-gray-900"
                            />
                            <div className="flex gap-2">
                              <CopyableInput
                                type="text"
                                value={membership.number}
                                wrapperClassName="flex-1"
                                onChange={(e) => {
                                  const updated = [...(editData.memberships ?? [])];
                                  updated[idx].number = e.target.value;
                                  setEditData({ ...editData, memberships: updated });
                                }}
                                placeholder="Number"
                                className="px-3 py-2 border border-gray-300 rounded text-gray-900"
                              />
                              <button
                                onClick={() => {
                                  setDeleteTarget({ type: 'membership', citizenId: citizen.id, index: idx });
                                  setShowDeleteModal(true);
                                }}
                                className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-800">
                            <div><strong>Name:</strong> {membership.name}</div>
                            <div><strong>Login:</strong> {membership.login}</div>
                            <div><strong>Password:</strong> {membership.password}</div>
                            <div><strong>Number:</strong> {membership.number}</div>
                          </div>
                        )}
                      </div>
                    ))}
                    {(editingId === citizen.id ? (editData.memberships || []) : (citizen.memberships || [])).length === 0 && (
                      <p className="text-sm text-gray-500">No memberships added</p>
                    )}
                  </div>
                </div>

                {/* Custom Fields Section */}
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Previous Information</h3>
                    {userRole === 'admin' && editingId === citizen.id && (
                      <button
                        onClick={() => {
                          setAddFieldForNewCitizen(false);
                          setShowAddFieldModal(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        <Plus size={16} />
                        Add Field
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {(editingId === citizen.id ? (editData.customFields ?? []) : (citizen.customFields ?? [])).map((field: CustomField, idx: number) => (
                      <div key={field.id} className="p-4 bg-gray-50 rounded-lg">
                        {editingId === citizen.id && userRole === 'admin' ? (
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="block text-sm font-semibold text-gray-700 mb-1">{field.name}</label>
                              <CopyableInput
                                type="text"
                                value={field.value}
                                onChange={(e) => {
                                  const updated = [...(editData.customFields ?? [])];
                                  updated[idx].value = e.target.value;
                                  setEditData({ ...editData, customFields: updated });
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
                              />
                            </div>
                            <button
                              onClick={() => {
                                setDeleteTarget({ type: 'customField', citizenId: citizen.id, index: idx });
                                setShowDeleteModal(true);
                              }}
                              className="self-end px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="text-gray-800">
                            <strong className="text-sm">{field.name}:</strong>
                            <span className="text-sm ml-2">{field.value}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {(editingId === citizen.id ? (editData.customFields || []) : (citizen.customFields || [])).length === 0 && (
                      <p className="text-sm text-gray-500">No custom fields added</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="max-w-7xl mx-auto mt-6">
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Page {currentPage} of {totalPages}</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft size={18} />Previous
                    </button>
                    <div className="flex gap-1">
                      {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1;
                        if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-2 rounded-lg transition ${currentPage === page ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
                            >
                              {page}
                            </button>
                          );
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return <span key={page} className="px-2 py-2">...</span>;
                        }
                        return null;
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Next<ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {citizens.length === 0 && !loading && (
            <div className="max-w-7xl mx-auto">
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <p className="text-gray-600">No citizens found.</p>
                {(searchTerm || bankFilter) && userRole === 'admin' && (
                  <button
                    onClick={() => { setSearchTerm(''); setBankFilter(''); setCurrentPage(1); }}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-8">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-lg z-10">
              <h2 className="text-2xl font-bold text-gray-800">Add New Citizen</h2>
              <button onClick={() => { setShowAddModal(false); setNewCitizen({ ...initialNewCitizen }); setBankInput(''); setBankAccountDropdownIndex(null); setValidationErrors({}); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 max-h-[calc(90vh-180px)] overflow-y-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800"><strong>Note:</strong> You are creating a login account for this citizen.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>{renderField({ firstName: newCitizen.firstName }, 'firstName', true)}</div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Middle Name</label>{renderField({ middleName: newCitizen.middleName }, 'middleName', true)}</div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>{renderField({ lastName: newCitizen.lastName }, 'lastName', true)}</div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>{renderField({ dob: newCitizen.dob }, 'dob', true)}</div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">SSN</label>{renderField({ ssn: newCitizen.ssn }, 'ssn', true)}</div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>{renderField({ address: newCitizen.address }, 'address', true)}</div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">City</label>{renderField({ city: newCitizen.city }, 'city', true)}</div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">State</label>{renderField({ state: newCitizen.state }, 'state', true)}</div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">ZIP Code</label>{renderField({ zip: newCitizen.zip }, 'zip', true)}</div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>{renderField({ phone: newCitizen.phone }, 'phone', true)}</div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>{renderField({ username: newCitizen.username }, 'username', true)}</div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>{renderField({ password: newCitizen.password }, 'password', true)}</div>
              </div>

              <hr className="my-6 border-gray-200" />

              <div className="mt-4 max-w-[377px]">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                {renderField({ notes: newCitizen.notes }, 'notes', true)}
              </div>

              <div className="mt-6 border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Bank Accounts</h3>
                  <span className="text-sm text-gray-500">(Optional)</span>
                  <button onClick={() => setNewCitizen({ ...newCitizen, bankAccounts: [...(newCitizen.bankAccounts || []), emptyBankAccount()] })} className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"><Plus size={16} />Add Bank Account</button>
                </div>
                <div className="space-y-4">
                  {(newCitizen.bankAccounts || []).map((account: BankAccount, idx: number) => (
                    <div key={`new-ba-${idx}`} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700">Account {idx + 1}</span>
                        <button onClick={() => { setDeleteTarget({ type: 'bankAccountNew', index: idx }); setShowDeleteModal(true); }} className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"><Trash2 size={16} /></button>
                      </div>
                      {renderBankAccountFields(account, idx, true, (i: number, updates: Partial<BankAccount>) => {
                        const list = [...(newCitizen.bankAccounts || [])];
                        list[i] = { ...list[i], ...updates };
                        setNewCitizen({ ...newCitizen, bankAccounts: list });
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Memberships</h3>
                  <button onClick={() => { const newMembership = { id: Date.now(), name: '', login: '', password: '', number: '' }; setNewCitizen({ ...newCitizen, memberships: [...(newCitizen.memberships || []), newMembership] }); }} className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"><Plus size={16} />Add Membership</button>
                </div>
                <div className="space-y-3">
                  {(newCitizen.memberships || []).map((membership, idx) => (
                    <div key={membership.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <CopyableInput
                            type="text"
                            value={membership.name}
                            onChange={(e) => { const updated = [...newCitizen.memberships]; updated[idx].name = e.target.value; setNewCitizen({ ...newCitizen, memberships: updated }); }}
                            placeholder="Name"
                            className="px-3 py-2 border border-gray-300 rounded text-gray-900"
                          />
                          <CopyableInput
                            type="text"
                            value={membership.login}
                            onChange={(e) => { const updated = [...newCitizen.memberships]; updated[idx].login = e.target.value; setNewCitizen({ ...newCitizen, memberships: updated }); }}
                            placeholder="Login"
                            className="px-3 py-2 border border-gray-300 rounded text-gray-900"
                          />
                          <CopyableInput
                            type="text"
                            value={membership.password}
                            onChange={(e) => { const updated = [...newCitizen.memberships]; updated[idx].password = e.target.value; setNewCitizen({ ...newCitizen, memberships: updated }); }}
                            placeholder="Password"
                            className="px-3 py-2 border border-gray-300 rounded text-gray-900"
                          />
                        <div className="flex gap-2">
                            <CopyableInput
                              type="text"
                              value={membership.number}
                              onChange={(e) => { const updated = [...newCitizen.memberships]; updated[idx].number = e.target.value; setNewCitizen({ ...newCitizen, memberships: updated }); }}
                              placeholder="Number"
                              wrapperClassName="flex-1"
                              className="px-3 py-2 border border-gray-300 rounded text-gray-900"
                            />
                          <button onClick={() => { setDeleteTarget({ type: 'membershipNew', index: idx }); setShowDeleteModal(true); }} className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Previous Information</h3>
                  <button onClick={() => { setAddFieldForNewCitizen(true); setShowAddFieldModal(true); }} className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"><Plus size={16} />Add Field</button>
                </div>
                <div className="space-y-3">
                  {(newCitizen.customFields || []).map((field, idx) => (
                    <div key={field.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-gray-700 mb-1">{field.name}</label>
                            <CopyableInput
                              type="text"
                              value={field.value}
                              onChange={(e) => { const updated = [...newCitizen.customFields]; updated[idx].value = e.target.value; setNewCitizen({ ...newCitizen, customFields: updated }); }}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
                            />
                        </div>
                        <button onClick={() => { setDeleteTarget({ type: 'customFieldNew', index: idx }); setShowDeleteModal(true); }} className="self-end px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex items-center justify-end gap-3 rounded-b-lg">
              <button onClick={() => { setShowAddModal(false); setNewCitizen({ ...initialNewCitizen }); setBankInput(''); setBankAccountDropdownIndex(null); setValidationErrors({}); }} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">Cancel</button>
              <button onClick={addCitizen} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">Add Citizen</button>
            </div>
          </div>
        </div>
      )}

      {showAddBankModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Add New Bank</h2>
                <button onClick={() => { setShowAddBankModal(false); setNewBankName(''); }} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Bank Name</label>
                <CopyableInput
                  type="text"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addNewBank()}
                  placeholder="Enter bank name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Existing Banks</label>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                  {availableBanks.map((bank) => (
                    <div key={bank} className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg">
                      <span className="text-sm text-gray-800 truncate">{bank}</span>
                      <button
                        type="button"
                        onClick={() => openBankDeleteConfirm(bank)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        aria-label={`Delete ${bank}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {availableBanks.length === 0 && (
                    <p className="text-sm text-gray-500">No banks added yet.</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => { setShowAddBankModal(false); setNewBankName(''); }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                <button onClick={addNewBank} disabled={!newBankName.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">Add Bank</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddFieldModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Add Custom Field</h2>
                <button onClick={() => { setShowAddFieldModal(false); setNewFieldName(''); setAddFieldForNewCitizen(false); }} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Field Name</label>
                <CopyableInput
                  type="text"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addNewField()}
                  placeholder="e.g., Emergency Contact"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => { setShowAddFieldModal(false); setNewFieldName(''); setAddFieldForNewCitizen(false); }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                <button onClick={addNewField} disabled={!newFieldName.trim()} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed">Add Field</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="text-red-600" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Confirm Delete</h2>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-gray-700 mb-6">
                {deleteTarget?.type === 'citizen' && 'Are you sure you want to delete this citizen?'}
                {deleteTarget?.type === 'membership' && 'Are you sure you want to delete this membership?'}
                {deleteTarget?.type === 'customField' && 'Are you sure you want to delete this custom field?'}
                {deleteTarget?.type === 'membershipNew' && 'Are you sure you want to remove this membership?'}
                {deleteTarget?.type === 'customFieldNew' && 'Are you sure you want to remove this custom field?'}
                {deleteTarget?.type === 'bankAccount' && 'Are you sure you want to remove this bank account?'}
                {deleteTarget?.type === 'bankAccountNew' && 'Are you sure you want to remove this bank account?'}
              </p>
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                <button onClick={async () => { try { if (deleteTarget?.type === 'citizen') { const res = await fetch(`/api/citizens/${deleteTarget.id}`, { method: 'DELETE' }); if (!res.ok) { const body = await res.json(); throw new Error(body.error ?? 'Failed to delete'); } setShowDeleteModal(false); setDeleteTarget(null); await fetchCitizens(); } else if (deleteTarget?.type === 'membership') { const updated = (editData.memberships ?? []).filter((_: Membership, i: number) => i !== deleteTarget.index); setEditData({ ...editData, memberships: updated }); setShowDeleteModal(false); setDeleteTarget(null); } else if (deleteTarget?.type === 'customField') { const updated = (editData.customFields ?? []).filter((_: CustomField, i: number) => i !== deleteTarget.index); setEditData({ ...editData, customFields: updated }); setShowDeleteModal(false); setDeleteTarget(null); } else if (deleteTarget?.type === 'membershipNew') { const updated = newCitizen.memberships.filter((_: Membership, i: number) => i !== deleteTarget.index); setNewCitizen({ ...newCitizen, memberships: updated }); setShowDeleteModal(false); setDeleteTarget(null); } else if (deleteTarget?.type === 'customFieldNew') { const updated = newCitizen.customFields.filter((_: CustomField, i: number) => i !== deleteTarget.index); setNewCitizen({ ...newCitizen, customFields: updated }); setShowDeleteModal(false); setDeleteTarget(null); } else if (deleteTarget?.type === 'bankAccount') { const updated = (editData.bankAccounts ?? []).filter((_: BankAccount, i: number) => i !== deleteTarget.index); setEditData({ ...editData, bankAccounts: updated }); setShowDeleteModal(false); setDeleteTarget(null); } else if (deleteTarget?.type === 'bankAccountNew') { const updated = (newCitizen.bankAccounts ?? []).filter((_: BankAccount, i: number) => i !== deleteTarget.index); setNewCitizen({ ...newCitizen, bankAccounts: updated }); setShowDeleteModal(false); setDeleteTarget(null); } } catch (err) { setError(err instanceof Error ? err.message : 'An error occurred'); setShowDeleteModal(false); setDeleteTarget(null); } }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBankDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="text-red-600" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Delete Bank</h2>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-gray-700 mb-4">
                Are you sure you want to delete bank <span className="font-semibold">{bankDeleteTarget ?? ''}</span>?
              </p>
              <p className="text-xs text-gray-500 mb-4">
                If any users are linked to this bank, deletion will be blocked.
              </p>

              {bankDeleteError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                  {bankDeleteError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowBankDeleteModal(false);
                    setBankDeleteTarget(null);
                    setBankDeleteError(null);
                    setBankDeleteIsLinked(false);
                    setBankDeleteChecking(false);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    void confirmDeleteBank();
                  }}
                  disabled={bankDeleteChecking || bankDeleteIsLinked}
                  className={`px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitizenDashboard;