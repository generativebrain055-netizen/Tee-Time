export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  handicap: string;
  memberSince: string;
  avatar: string;
  equipment: Equipment;
  preferences: Preferences;
  username?: string;
  homeCourse?: string;
  bio?: string;
}

export interface Equipment {
  driver: string;
  irons: string;
  putters: string;
  balls: string;
}

export interface Preferences {
  preferredTeeTime: string;
  walkOrRide: string;
  playingPartner: string;
}

export const DEFAULT_USER: UserProfile = {
  id: "1",
  firstName: "John",
  lastName: "Smith",
  email: "john.smith@example.com",
  phone: "(555) 123-4567",
  location: "San Francisco, CA",
  handicap: "12",
  memberSince: "January 2024",
  avatar: "",
  username: "",
  homeCourse: "",
  bio: "",
  equipment: {
    driver: "TaylorMade Stealth 2",
    irons: "Titleist T200",
    putters: "Scotty Cameron",
    balls: "Pro V1",
  },
  preferences: {
    preferredTeeTime: "Morning (6-9 AM)",
    walkOrRide: "Ride",
    playingPartner: "Any skill level",
  },
};
