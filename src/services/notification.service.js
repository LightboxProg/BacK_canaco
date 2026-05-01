const { getIO } = require('../config/socket');
const logger = require('../utils/logger');

exports.sendNotification = (userId, notificationData) => {
  try {
    const io = getIO();
    io.to(userId.toString()).emit('notification', notificationData);
  } catch (error) {
    logger.error(`Failed to send notification: ${error.message}`);
  }
};
