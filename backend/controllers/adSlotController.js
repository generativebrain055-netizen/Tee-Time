/**
 * Public ad slots API – used by the mobile app (no auth).
 * Returns active slots with image_url set: slot_key, image_url, link_url, description (alt_text).
 * App renders same content as admin "Ads preview": image as background + description overlay.
 */
const adSlotRepository = require("../repositories/adSlotRepository");

async function getActiveSlots(req, res, next) {
  try {
    const slots = await adSlotRepository.listActiveForApp();
    return res.json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getActiveSlots,
};
