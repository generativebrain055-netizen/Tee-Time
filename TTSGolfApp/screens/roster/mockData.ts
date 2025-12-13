import { RosterPerson, Group, Request, GroupMember } from "./types";

export const ROSTER_DATA: RosterPerson[] = [
  {
    id: 1,
    name: "Mike Smith",
    sub: "Last played: 2 days ago",
    img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
    phone: "+1 (555) 123-4567",
    email: "mike.smith@email.com",
    handicap: 12,
    gamesPlayed: 45,
  },
  {
    id: 2,
    name: "Jessica Rodriguez",
    sub: "Last played: 1 week ago",
    img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica",
    phone: "+1 (555) 234-5678",
    email: "jessica.r@email.com",
    handicap: 8,
    gamesPlayed: 32,
  },
  {
    id: 3,
    name: "David Wilson",
    sub: "Last played: 10/15/25",
    img: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
    phone: "+1 (555) 345-6789",
    email: "d.wilson@email.com",
    handicap: 15,
    gamesPlayed: 28,
  },
  {
    id: 4,
    name: "Robert Lee",
    sub: "Last played: 1 week ago",
    img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Robert",
    phone: "+1 (555) 456-7890",
    email: "robert.lee@email.com",
    handicap: 10,
    gamesPlayed: 51,
  },
  {
    id: 5,
    name: "Jay Cantor",
    sub: "Last played: 1 week ago",
    img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jay",
    phone: "+1 (555) 567-8901",
    email: "jay.cantor@email.com",
    handicap: 14,
    gamesPlayed: 19,
  },
  {
    id: 6,
    name: "Sarah Johnson",
    sub: "Last played: last month",
    img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    phone: "+1 (555) 678-9012",
    email: "sarah.j@email.com",
    handicap: 9,
    gamesPlayed: 38,
  },
];

export const GROUPS_DATA: Group[] = [
  {
    id: 1,
    name: "Saturday AM Crew",
    members: 5,
    next: "1 upcoming tee time",
    initials: "SA",
    color: "#D1FAE5",
    img: "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&q=80&w=150&h=150",
  },
  {
    id: 2,
    name: "Santaluz Regulars",
    members: 7,
    next: "No upcoming tee times",
    initials: "SR",
    color: "#DBEAFE",
    isIcon: true,
  },
  {
    id: 3,
    name: "North County Crew",
    members: 8,
    next: "2 upcoming tee times",
    initials: "NC",
    color: "#E0E7FF",
    isIcon: true,
  },
  {
    id: 4,
    name: "The Boys",
    members: 6,
    next: "2 upcoming events",
    initials: "TB",
    color: "#FED7AA",
    img: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&q=80&w=150&h=150",
  },
];

export const REQUESTS_DATA: Request[] = [
  {
    id: 1,
    name: "Chris Anderson",
    mutual: "5 mutual friends",
    img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chris",
  },
  {
    id: 2,
    name: "Lisa Martinez",
    mutual: "10 mutual friends",
    img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa",
  },
  {
    id: 3,
    name: "Kevin Anderson",
    mutual: "6 mutual friends",
    img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kevin",
  },
  {
    id: 4,
    name: "Amanda Clark",
    mutual: "2 mutual friends",
    img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amanda",
  },
];

export const GROUP_MEMBERS: GroupMember[] = [
  { id: 1, name: "Matt Roberts", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Matt" },
  { id: 2, name: "Colin Williamson", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Colin" },
  { id: 3, name: "Jake Rosenblum", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jake" },
  { id: 4, name: "Sam Tripoli", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam" },
  { id: 5, name: "Nathan Hirst", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nathan" },
];
