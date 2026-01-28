/**
 * Group Profile type definitions
 */
import { RosterGroup, RosterContact, Friend, TeeTime } from "../../../services/api";

export interface GroupProfileData extends RosterGroup {
    isOwner?: boolean;
}

export interface GroupMember extends RosterContact {}

export interface GroupTeeTime extends TeeTime {}

export interface AddMemberModalProps {
    visible: boolean;
    friends: Friend[];
    selectedFriends: string[];
    loading: boolean;
    onClose: () => void;
    onToggleFriend: (id: string) => void;
    onAdd: () => void;
}
