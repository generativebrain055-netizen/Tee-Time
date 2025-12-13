export interface RosterPerson {
  id: number;
  name: string;
  sub: string;
  img: string;
  phone?: string;
  email?: string;
  handicap?: number;
  gamesPlayed?: number;
}

export interface Group {
  id: number;
  name: string;
  members: number;
  next: string;
  initials: string;
  color: string;
  img?: string;
  isIcon?: boolean;
}

export interface Request {
  id: number;
  name: string;
  mutual: string;
  img: string;
}

export interface GroupMember {
  id: number;
  name: string;
  img: string;
}
