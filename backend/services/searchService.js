/**
 * Global Search Service (Figma 795-6009, 791-1184, 791-1219, 791-1314, 791-1412, 795-5958)
 * Aggregates search across users, tee times, groups, and courses.
 */
const rosterRepository = require("../repositories/rosterRepository");
const rosterFormatter = require("../formatters/rosterFormatter");
const teeTimeRepository = require("../repositories/teeTimeRepository");
const courseRepository = require("../repositories/courseRepository");

const PER_SECTION_LIMIT = 10;

async function searchAll(query, userId) {
  const q = (query || "").trim();
  if (q.length < 2) {
    return { users: [], teeTimes: [], groups: [], courses: [] };
  }

  const [users, teeTimeRows, groups, courses] = await Promise.all([
    rosterRepository.searchUsers(q, userId).then((list) => list.map(rosterFormatter.formatUserSearchResult)),
    teeTimeRepository.searchTeeTimes(userId, q, PER_SECTION_LIMIT),
    rosterRepository.searchGroups(userId, q, PER_SECTION_LIMIT),
    courseRepository.searchClubs(q, PER_SECTION_LIMIT),
  ]);

  const teeTimes = teeTimeRows.map((t) => ({
    id: t.id,
    courseName: t.course_name,
    courseLocation: t.course_location,
    teeDate: t.tee_date,
    teeTime: t.tee_time,
    status: t.status,
    maxPlayers: t.max_players,
  }));

  const groupsFormatted = groups.map((g) => ({
    id: g.id,
    name: g.name,
    color: g.color,
    description: g.description || null,
    memberCount: g.member_count || 0,
  }));

  return {
    users,
    teeTimes,
    groups: groupsFormatted,
    courses: courses.map((c) => ({
      id: c.id,
      name: c.name,
      location: c.location,
      city: c.city,
      state: c.state,
    })),
  };
}

module.exports = {
  searchAll,
};
