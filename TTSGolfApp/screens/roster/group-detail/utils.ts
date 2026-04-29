import { formatDateMMDDYYYY, parseCalendarDateLocal } from "../../../utils/formatting";

export const getInitials = (name: string): string => {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
};

export const formatDate = (dateStr: string): string => {
  return formatDateMMDDYYYY(parseCalendarDateLocal(dateStr));
};
