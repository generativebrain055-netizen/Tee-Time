/**
 * Invite controller constants
 */

const INVITE_TYPES = {
    ROSTER: 'roster',
    FCFS: 'fcfs',
    OPEN: 'open',
    /** Manual selection: same sequential / backup behavior as roster */
    MANUAL: 'manual',
};

const INVITE_RESPONSES = {
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
    MAYBE: 'maybe',
    EXPIRED: 'expired'
};

module.exports = {
    INVITE_TYPES,
    INVITE_RESPONSES
};
