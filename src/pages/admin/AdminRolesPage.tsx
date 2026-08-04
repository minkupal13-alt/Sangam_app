import { Shield, Loader2 } from 'lucide-react';
import { usePageTitle } from '@/lib/usePageTitle';

const ROLES = [
  { name: 'User', color: 'bg-gray-500', permissions: ['View content', 'Create posts', 'Like & comment', 'Follow users', 'Message'] },
  { name: 'Creator', color: 'bg-brand-500', permissions: ['All User permissions', 'Monetization', 'Subscriptions', 'Tips', 'Marketplace selling'] },
  { name: 'Moderator', color: 'bg-blue-500', permissions: ['All Creator permissions', 'Review reports', 'Remove content', 'Warn users', 'Suspend users'] },
  { name: 'Admin', color: 'bg-orange-500', permissions: ['All Moderator permissions', 'Ban users', 'Verify creators', 'Announcements', 'Finance access'] },
  { name: 'Superadmin', color: 'bg-red-500', permissions: ['All Admin permissions', 'Manage roles', 'Platform settings', 'Audit log access', 'Full control'] },
];

const ALL_PERMISSIONS = [
  'View content', 'Create posts', 'Like & comment', 'Follow users', 'Message',
  'Monetization', 'Subscriptions', 'Tips', 'Marketplace selling',
  'Review reports', 'Remove content', 'Warn users', 'Suspend users',
  'Ban users', 'Verify creators', 'Announcements', 'Finance access',
  'Manage roles', 'Platform settings', 'Audit log access', 'Full control',
];

export default function AdminRolesPage() {
  usePageTitle('Roles | Admin');

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-sangam-gradient flex items-center justify-center">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white">Roles & Permissions</h1>
      </div>

      {/* Role hierarchy */}
      <div className="space-y-3 mb-6">
        {ROLES.map((role) => (
          <div key={role.name} className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`h-3 w-3 rounded-full ${role.color}`} />
              <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white">{role.name}</h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {role.permissions.map((p) => (
                <span key={p} className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-navy-300 text-xs font-medium text-gray-600 dark:text-gray-400">{p}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Permissions matrix */}
      <div className="rounded-2xl bg-white dark:bg-navy-200 border border-gray-100 dark:border-navy-300 overflow-hidden overflow-x-auto">
        <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white p-4 border-b border-gray-100 dark:border-navy-300">Permissions Matrix</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100 dark:border-navy-300">
              <th className="text-left font-semibold px-4 py-3">Permission</th>
              {ROLES.map((r) => (
                <th key={r.name} className="text-center font-semibold px-2 py-3">{r.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-navy-300/50">
            {ALL_PERMISSIONS.map((perm) => (
              <tr key={perm}>
                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 font-medium">{perm}</td>
                {ROLES.map((r) => {
                  const has = r.permissions.includes(perm) || r.permissions.includes('All ' + r.name + ' permissions') || (r.name === 'Superadmin');
                  return (
                    <td key={r.name} className="text-center px-2 py-2.5">
                      <input type="checkbox" checked={has} readOnly className="rounded" />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
