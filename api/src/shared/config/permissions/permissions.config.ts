import { OrgRole } from 'generated/prisma';

export const Permissions = {
  AGENTS_VIEW: 'agents.view',
  AGENTS_MANAGE: 'agents.manage',
  PROSPECTS_MANAGE: 'prospects.manage',
  CALLS_CREATE: 'calls.create',
  CALLS_VIEW_ALL: 'calls.view_all',
  CALLS_MANAGE_ALL: 'calls.manage_all',
  USAGE_VIEW: 'usage.view',
  MEMBERS_VIEW: 'members.view',
  MEMBERS_INVITE: 'members.invite',
  MEMBERS_MANAGE: 'members.manage',
  ROLES_MANAGE: 'roles.manage',
  ORG_UPDATE: 'org.update',
  ORG_DELETE: 'org.delete',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

export interface PermissionDefinition {
  key: Permission;
  label: string;
  description: string;
  group: 'Co-pilots & practice' | 'Calls' | 'Team' | 'Organisation';
  // Only owners hold these. They cannot be granted to other roles.
  owner_only: boolean;
}

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  {
    key: Permissions.AGENTS_VIEW,
    label: 'View co-pilots',
    description:
      'See and use the organisation’s co-pilots on calls and in practice.',
    group: 'Co-pilots & practice',
    owner_only: false,
  },
  {
    key: Permissions.AGENTS_MANAGE,
    label: 'Manage co-pilots',
    description: 'Create, edit, duplicate, archive and delete co-pilots.',
    group: 'Co-pilots & practice',
    owner_only: false,
  },
  {
    key: Permissions.PROSPECTS_MANAGE,
    label: 'Manage practice prospects',
    description: 'Create, generate, edit and delete AI practice prospects.',
    group: 'Co-pilots & practice',
    owner_only: false,
  },
  {
    key: Permissions.CALLS_CREATE,
    label: 'Start calls & practice',
    description: 'Start live calls and practice sessions.',
    group: 'Calls',
    owner_only: false,
  },
  {
    key: Permissions.CALLS_VIEW_ALL,
    label: 'View everyone’s calls',
    description:
      'See calls, recordings, analyses and team performance of all members. Without it, members only see their own.',
    group: 'Calls',
    owner_only: false,
  },
  {
    key: Permissions.CALLS_MANAGE_ALL,
    label: 'Manage everyone’s calls',
    description:
      'Delete recordings and calls, and re-run analyses, for any member.',
    group: 'Calls',
    owner_only: false,
  },
  {
    key: Permissions.USAGE_VIEW,
    label: 'View organisation usage & costs',
    description: 'See AI usage and estimated costs for the whole organisation.',
    group: 'Organisation',
    owner_only: false,
  },
  {
    key: Permissions.MEMBERS_VIEW,
    label: 'View members',
    description: 'See the member list and their roles.',
    group: 'Team',
    owner_only: false,
  },
  {
    key: Permissions.MEMBERS_INVITE,
    label: 'Invite members',
    description: 'Invite people, resend and revoke invitations.',
    group: 'Team',
    owner_only: false,
  },
  {
    key: Permissions.MEMBERS_MANAGE,
    label: 'Manage members',
    description: 'Change roles of, and remove, members with a lower role.',
    group: 'Team',
    owner_only: false,
  },
  {
    key: Permissions.ORG_UPDATE,
    label: 'Edit organisation',
    description: 'Rename the organisation.',
    group: 'Organisation',
    owner_only: false,
  },
  {
    key: Permissions.ROLES_MANAGE,
    label: 'Edit role permissions',
    description: 'Change what each role is allowed to do.',
    group: 'Organisation',
    owner_only: true,
  },
  {
    key: Permissions.ORG_DELETE,
    label: 'Delete organisation',
    description: 'Permanently delete the organisation and all its data.',
    group: 'Organisation',
    owner_only: true,
  },
];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_CATALOG.map(
  (p) => p.key,
);
export const OWNER_ONLY_PERMISSIONS: Permission[] = PERMISSION_CATALOG.filter(
  (p) => p.owner_only,
).map((p) => p.key);
export const GRANTABLE_PERMISSIONS: Permission[] = PERMISSION_CATALOG.filter(
  (p) => !p.owner_only,
).map((p) => p.key);

// Preset permissions applied to every new organisation. Owners can change the ADMIN and MEMBER presets.
export const ROLE_PRESETS: Record<OrgRole, Permission[]> = {
  [OrgRole.OWNER]: ALL_PERMISSIONS,
  [OrgRole.ADMIN]: GRANTABLE_PERMISSIONS,
  [OrgRole.MEMBER]: [
    Permissions.AGENTS_VIEW,
    Permissions.PROSPECTS_MANAGE,
    Permissions.CALLS_CREATE,
  ],
};

export const ROLE_RANK: Record<OrgRole, number> = {
  [OrgRole.MEMBER]: 1,
  [OrgRole.ADMIN]: 2,
  [OrgRole.OWNER]: 3,
};

// Only keep known, grantable permissions, and make sure dependent permissions stay coherent.
export const sanitizePermissions = (
  role: OrgRole,
  requested: string[],
): Permission[] => {
  if (role === OrgRole.OWNER) return ALL_PERMISSIONS;
  const allowed = new Set<string>(GRANTABLE_PERMISSIONS);
  const set = new Set<Permission>(
    requested.filter((p) => allowed.has(p)) as Permission[],
  );

  // Anything that needs the "view" half of a pair implies it.
  if (set.has(Permissions.AGENTS_MANAGE)) set.add(Permissions.AGENTS_VIEW);
  if (set.has(Permissions.CALLS_MANAGE_ALL))
    set.add(Permissions.CALLS_VIEW_ALL);
  if (
    set.has(Permissions.MEMBERS_INVITE) ||
    set.has(Permissions.MEMBERS_MANAGE)
  )
    set.add(Permissions.MEMBERS_VIEW);
  if (set.has(Permissions.CALLS_CREATE)) set.add(Permissions.AGENTS_VIEW);

  return ALL_PERMISSIONS.filter((p) => set.has(p));
};
