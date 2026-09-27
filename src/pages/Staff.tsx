import React, { useEffect, useState } from 'react';
import { Plus, UserCheck, UserX, X, AlertCircle, Shield, Eye, EyeOff, Sparkles, Lock, ArrowUpRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Staff as StaffType, StaffRole } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { checkSeatLimit } from '../lib/tenancy';
import { isDemoMode, DEMO_STAFF_MEMBERS } from '../lib/demoData';

const roleColors: Record<StaffRole, string> = {
  admin: 'bg-red-50 text-red-700',
  receptionist: 'bg-blue-50 text-blue-700',
  doctor: 'bg-purple-50 text-purple-700',
};

export default function Staff() {
  const { staff: currentStaff, activeClinic } = useAuth();
  const isAdmin = currentStaff?.role === 'admin';
  const [staffList, setStaffList] = useState<StaffType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffType | null>(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', role: 'receptionist' as StaffRole, specialization: '', password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeStaff = staffList.filter(s => s.active);
  const inactiveStaff = staffList.filter(s => !s.active);
  const seatInfo = checkSeatLimit(activeStaff.length, activeClinic?.id);

  useEffect(() => { fetchStaff(); }, []);

  async function fetchStaff() {
    if (isDemoMode()) {
      setStaffList(DEMO_STAFF_MEMBERS);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from('staff').select('*').order('created_at');
    setStaffList(data ?? []);
    setLoading(false);
  }

  function openEdit(s: StaffType) {
    if (!isAdmin) return;
    setEditStaff(s);
    setForm({
      name: s.name,
      email: s.email,
      phone: s.phone ?? '',
      role: s.role,
      specialization: s.specialization ?? '',
      password: '',
    });
    setShowPassword(false);
    setError('');
    setShowForm(true);
  }

  function openAdd() {
    if (!isAdmin) return;
    if (!seatInfo.allowed) {
      alert(
        `Staff Account Limit Reached!\n\nYour clinic "${seatInfo.clinicName}" is subscribed to the ${seatInfo.plan.toUpperCase()} tier, which allows a maximum of ${seatInfo.maxSeats} active staff accounts (${seatInfo.currentCount} currently active).\n\nPlease upgrade your subscription to add more team members.`
      );
      return;
    }
    setEditStaff(null);
    setForm({ name: '', email: '', phone: '', role: 'receptionist', specialization: '', password: '' });
    setShowPassword(false);
    setError('');
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required');
      return;
    }
    if (!editStaff && form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (editStaff && form.password && form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      role: form.role,
      specialization: form.specialization.trim() || null,
    };

    if (editStaff) {
      const { error } = await supabase.from('staff').update(payload).eq('id', editStaff.id);
      if (error) { setError(error.message); setSaving(false); return; }

      const emailChanged = payload.email !== editStaff.email;
      const passwordChanged = !!form.password;

      if (emailChanged || passwordChanged) {
        if (!editStaff.user_id) {
          setError('Cannot update login details: this staff member has no login account');
          setSaving(false);
          return;
        }

        const isSelf = editStaff.user_id === currentStaff?.user_id;

        if (isSelf) {
          const authUpdates: { email?: string; password?: string } = {};
          if (emailChanged) authUpdates.email = payload.email;
          if (passwordChanged) authUpdates.password = form.password;
          const { error: authError } = await supabase.auth.updateUser(authUpdates);
          if (authError) { setError(authError.message); setSaving(false); return; }
        } else {
          const body: { user_id: string; email?: string; password?: string } = {
            user_id: editStaff.user_id,
          };
          if (emailChanged) body.email = payload.email;
          if (passwordChanged) body.password = form.password;

          const { data: fnData, error: fnError } = await supabase.functions.invoke('update-staff-password', {
            body,
          });
          if (fnError) {
            setError(fnError.message || 'Failed to update login details. Redeploy the update-staff-password function if needed.');
            setSaving(false);
            return;
          }
          if (fnData?.error) {
            setError(fnData.error);
            setSaving(false);
            return;
          }
        }
      }
    } else {
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      if (!adminSession) {
        setError('You must be signed in to add staff');
        setSaving(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
      });

      if (authError) {
        setError(authError.message);
        setSaving(false);
        return;
      }
      if (!authData.user) {
        setError('Failed to create login account for staff member');
        setSaving(false);
        return;
      }

      // Restore admin session (signUp may switch to the new user)
      const { error: restoreError } = await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });
      if (restoreError) {
        setError(restoreError.message);
        setSaving(false);
        return;
      }

      const { error } = await supabase.from('staff').insert({
        ...payload,
        user_id: authData.user.id,
        active: true,
      });
      if (error) { setError(error.message); setSaving(false); return; }
    }

    await fetchStaff();
    setShowForm(false);
    setSaving(false);
  }

  async function toggleActive(s: StaffType) {
    if (!isAdmin || s.id === currentStaff?.id) return;
    await supabase.from('staff').update({ active: !s.active }).eq('id', s.id);
    setStaffList(prev => prev.map(st => st.id === s.id ? { ...st, active: !st.active } : st));
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-2xl text-gray-900">Staff Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">{activeStaff.length} active staff members</p>
        </div>
        {isAdmin && (
          <button
            onClick={openAdd}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all ${
              seatInfo.allowed ? 'hover:opacity-90' : 'opacity-80'
            }`}
            style={{ background: seatInfo.allowed ? '#3c5e27' : '#5c7a48' }}
          >
            <Plus size={16} /> Add Staff
          </button>
        )}
      </div>

      {/* Clinic Plan & Seat Allocation Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 card-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold flex-shrink-0">
            <Sparkles size={18} className="text-emerald-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-900 text-sm">{seatInfo.clinicName}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                {seatInfo.plan} Plan
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Seat License: {seatInfo.currentCount} of {seatInfo.maxSeats} staff accounts active ({seatInfo.remainingSeats} available)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-32 bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                seatInfo.currentCount >= seatInfo.maxSeats ? 'bg-amber-500' : 'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(100, (seatInfo.currentCount / seatInfo.maxSeats) * 100)}%` }}
            />
          </div>
          {seatInfo.currentCount >= seatInfo.maxSeats ? (
            <span className="text-xs font-bold text-amber-700 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              <Lock size={12} /> Limit Reached
            </span>
          ) : (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
              {seatInfo.remainingSeats} Seats Free
            </span>
          )}
        </div>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-3 gap-4">
        {(['admin', 'receptionist', 'doctor'] as StaffRole[]).map(role => {
          const count = activeStaff.filter(s => s.role === role).length;
          return (
            <div key={role} className="bg-white rounded-2xl card-shadow p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="text-gray-400" />
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${roleColors[role]}`}>{role}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-400 mt-0.5">Active {role}s</p>
            </div>
          );
        })}
      </div>

      {/* Active staff */}
      <div className="bg-white rounded-2xl card-shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Active Staff</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">Loading...</div>
          ) : activeStaff.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">No active staff members</div>
          ) : (
            activeStaff.map(s => (
              <div key={s.id} className="flex items-center gap-4 px-6 py-4 table-row-hover">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: '#4a7530' }}
                >
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                    {s.id === currentStaff?.id && (
                      <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">You</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${roleColors[s.role]}`}>
                      {s.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{s.email}</p>
                  {s.specialization && <p className="text-xs text-gray-400">{s.specialization}</p>}
                  {s.phone && <p className="text-xs text-gray-400">{s.phone}</p>}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(s)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </button>
                    {s.id !== currentStaff?.id && (
                      <button
                        onClick={() => toggleActive(s)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Deactivate"
                      >
                        <UserX size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Inactive staff */}
      {inactiveStaff.length > 0 && (
        <div className="bg-white rounded-2xl card-shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-gray-400">Inactive Staff</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {inactiveStaff.map(s => (
              <div key={s.id} className="flex items-center gap-4 px-6 py-4 opacity-60">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold flex-shrink-0">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-500 line-through">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.email}</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => toggleActive(s)}
                    className="flex items-center gap-1.5 text-xs font-medium text-green-700 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
                  >
                    <UserCheck size={14} /> Activate
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff Form Modal (admin only) */}
      {isAdmin && showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="font-semibold text-lg text-gray-900">
                {editStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Dr. John Smith"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="staff@dentivista.com"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                />
                {editStaff && (
                  <p className="text-xs text-gray-400 mt-1.5">Changing email also updates their login email</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {editStaff ? 'Password' : 'Password *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editStaff ? 'Leave blank to keep current password' : 'Minimum 6 characters'}
                    required={!editStaff}
                    minLength={editStaff ? undefined : 6}
                    className="w-full px-4 py-2.5 pr-11 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {editStaff && (
                  <p className="text-xs text-gray-400 mt-1.5">Leave blank to keep the current password</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Role *</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                  >
                    <option value="admin">Admin</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="doctor">Doctor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+92 300..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                  />
                </div>
              </div>
              {form.role === 'doctor' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Specialization</label>
                  <input
                    type="text"
                    value={form.specialization}
                    onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                    placeholder="e.g. Orthodontics, Endodontics..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                  />
                </div>
              )}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 disabled:opacity-60 transition-all"
                  style={{ background: '#3c5e27' }}
                >
                  {saving ? 'Saving...' : editStaff ? 'Save Changes' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
