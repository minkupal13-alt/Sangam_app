import { useState, useEffect } from 'react';
import { Search, Loader2, Download, BadgeCheck, Ban, ShieldOff, Trash2, Eye, X } from 'lucide-react';
import { fetchAdminUsers, updateUserRole, toggleUserVerification, exportToCsv, type AdminUser } from '@/lib/adminApi';
import { usePageTitle } from '@/lib/usePageTitle';
import { formatCount, timeAgo } from '@/lib/format';

export default function AdminUsersPage() {
  usePageTitle('Users | Admin');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editUser, setEditUser] = useState<AdminUser | null>(null);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const { users: u } = await fetchAdminUsers({ search, role: roleFilter });
      setUsers(u);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(loadUsers, 300);
    return () => clearTimeout(t);
  }, [search, roleFilter]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === users.length) setSelected(new Set());
    else setSelected(new Set(users.map((u) => u.id)));
  }

  async function handleRoleChange(userId: string, role: string) {
    try {
      await updateUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      if (editUser?.id === userId) setEditUser({ ...editUser, role });
    } catch (err) { console.error(err); }
  }

  async function handleVerify(userId: string, verify: boolean) {
    try {
      await toggleUserVerification(userId, verify);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_verified: verify } : u)));
    } catch (err) { console.error(err); }
  }

  function handleExport() {
    exportToCsv('sangam-users.csv', users.map((u) => ({
      username: u.username, name: u.full_name, role: u.role, verified: u.is_verified, joined: u.created_at,
    })));
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">User Management</h1>
        <button onClick={handleExport} className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-full bg-white dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-sm font-semibold text-gray-600 dark:text-gray-300 active:scale-95 transition-transform">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or username..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-brand-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 rounded-2xl bg-white dark:bg-navy-200 border border-gray-200 dark:border-navy-300 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-500"
        >
          <option value="all">All Roles</option>
          <option value="user">User</option>
          <option value="creator">Creator</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-3 px-4 py-2 rounded-xl bg-brand-50 dark:bg-brand-900/20">
          <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">{selected.size} selected</span>
          <div className="ml-auto flex gap-2">
            <button onClick={() => { selected.forEach((id) => handleVerify(id, true)); setSelected(new Set()); }} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30">
              <BadgeCheck className="h-3.5 w-3.5" /> Verify
            </button>
            <button className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30">
              <Ban className="h-3.5 w-3.5" /> Ban
            </button>
            <button className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-300">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-gray-400 text-sm">No users found.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 dark:border-navy-300">
                <th className="px-3 py-3"><input type="checkbox" checked={selected.size === users.length && users.length > 0} onChange={selectAll} className="rounded" /></th>
                <th className="text-left font-semibold px-2 py-3">User</th>
                <th className="text-left font-semibold px-2 py-3 hidden sm:table-cell">Role</th>
                <th className="text-left font-semibold px-2 py-3 hidden md:table-cell">Joined</th>
                <th className="text-right font-semibold px-2 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-navy-300/50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-navy-300/50">
                  <td className="px-3 py-3"><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} className="rounded" /></td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.full_name}`} alt="" className="h-8 w-8 rounded-full object-cover" />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1">
                          {u.full_name}
                          {u.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-brand-500" />}
                        </p>
                        <p className="text-xs text-gray-400 truncate">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 hidden sm:table-cell">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="px-2 py-1 rounded-lg bg-gray-50 dark:bg-navy-300 border border-gray-200 dark:border-navy-300 text-xs font-semibold text-gray-700 dark:text-gray-300 outline-none"
                    >
                      <option value="user">User</option>
                      <option value="creator">Creator</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Superadmin</option>
                    </select>
                  </td>
                  <td className="px-2 py-3 hidden md:table-cell text-xs text-gray-400">{timeAgo(u.created_at)}</td>
                  <td className="px-2 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditUser(u)} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-300" title="View">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleVerify(u.id, !u.is_verified)} className={`h-7 w-7 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-navy-300 ${u.is_verified ? 'text-brand-500' : 'text-gray-400'}`} title="Verify">
                        <BadgeCheck className="h-3.5 w-3.5" />
                      </button>
                      <button className="h-7 w-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" title="Ban">
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* User detail modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditUser(null)}>
          <div className="w-full max-w-md bg-white dark:bg-navy-200 rounded-3xl border border-gray-200 dark:border-navy-300 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <img src={editUser.avatar_url || `https://ui-avatars.com/api/?name=${editUser.full_name}`} alt="" className="h-14 w-14 rounded-full object-cover" />
                <div>
                  <h2 className="font-heading font-bold text-lg text-gray-900 dark:text-white flex items-center gap-1">
                    {editUser.full_name}
                    {editUser.is_verified && <BadgeCheck className="h-4 w-4 text-brand-500" />}
                  </h2>
                  <p className="text-sm text-gray-400">@{editUser.username}</p>
                </div>
              </div>
              <button onClick={() => setEditUser(null)} className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-300 flex items-center justify-center">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Role</span><span className="font-semibold text-gray-900 dark:text-white capitalize">{editUser.role}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Joined</span><span className="font-semibold text-gray-900 dark:text-white">{new Date(editUser.created_at).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Verified</span><span className="font-semibold text-gray-900 dark:text-white">{editUser.is_verified ? 'Yes' : 'No'}</span></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => handleVerify(editUser.id, !editUser.is_verified)} className="flex-1 py-2 rounded-xl bg-sangam-gradient text-white text-sm font-bold active:scale-95 transition-transform">
                {editUser.is_verified ? 'Unverify' : 'Verify'}
              </button>
              <button className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold active:scale-95 transition-transform flex items-center justify-center gap-1">
                <ShieldOff className="h-4 w-4" /> Suspend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
