import { RosterGroup, Friend } from "../../../services/api";

export interface GroupsListProps {
  onGroupClick: (groupId: string) => void;
}

export type CreateStep = "select" | "details";

export interface GroupsListState {
  groups: RosterGroup[];
  loading: boolean;
  refreshing: boolean;
  showCreateModal: boolean;
  createStep: CreateStep;
  friends: Friend[];
  selectedMembers: string[];
  newGroupName: string;
  newGroupColor: string;
  creating: boolean;
  editingGroup: RosterGroup | null;
}

export const GROUP_COLORS = [
  "#5DB075",
  "#3B82F6",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
];
