import { RosterContact, Friend, TeeTime } from "../../../services/api";

export interface GroupDetailProps {
  groupId: string;
  onBack: () => void;
  onNavigateToCreateTeeTime?: (groupId: string) => void;
  onNavigateToChat?: (groupId: string) => void;
}

export interface GroupData {
  id: string;
  name: string;
  color: string;
  memberCount: number;
  isOwner?: boolean;
}

export interface GroupDetailState {
  loading: boolean;
  refreshing: boolean;
  group: GroupData | null;
  members: RosterContact[];
  upcomingTeeTimes: TeeTime[];
  showAddModal: boolean;
  friends: Friend[];
  selectedFriends: string[];
  addingMembers: boolean;
}
