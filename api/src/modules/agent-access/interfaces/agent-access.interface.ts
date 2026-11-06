import { AgentVisibility } from 'generated/prisma';

export interface AgentAccessView {
  id: string;
  visibility: AgentVisibility;
  // Only returned to people who may manage access.
  access_user_ids?: string[];
}

export interface StudentAccessItem {
  id: string;
  name: string;
  visibility: AgentVisibility;
  // The student can use it (ORGANISATION, on the list, or authored by them).
  has_access: boolean;
  // A SELECTED item the student authored and nobody else is on.
  is_private_to_student: boolean;
  author_id: string | null;
  archived: boolean;
}

export interface StudentAccess {
  user_id: string;
  copilots: StudentAccessItem[];
  prospects: StudentAccessItem[];
}
