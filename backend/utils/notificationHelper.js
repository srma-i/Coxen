
const Notification = require("../models/Notification");

/**
 * Create a notification for a specific user.
 *
 * @param {Object} data
 * @param {string} data.userId
 * @param {string} data.title
 * @param {string} data.message
 * @param {string} [data.type]
 * @param {Object|null} [data.metadata]
 */
async function createNotification({
  userId,
  title,
  message,
  type = "general",
  metadata = null,
}) {
  if (!userId || !title?.trim() || !message?.trim()) {
    throw new Error("userId, title and message are required.");
  }

  const allowedTypes = [
    "achievement",
    "message",
    "community",
    "system",
    "reminder",
    "general",
  ];

  if (!allowedTypes.includes(type)) {
    throw new Error("Invalid notification type.");
  }

  return Notification.create({
    userId,
    title: title.trim(),
    message: message.trim(),
    type,
    metadata,
  });
}

/**
 * Create notifications for multiple users.
 */
async function createBulkNotifications(userIds, notificationData) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return [];
  }

  const { title, message, type = "general", metadata = null } =
    notificationData;

  if (!title?.trim() || !message?.trim()) {
    throw new Error("Title and message are required.");
  }

  const allowedTypes = [
    "achievement",
    "message",
    "community",
    "system",
    "reminder",
    "general",
  ];

  if (!allowedTypes.includes(type)) {
    throw new Error("Invalid notification type.");
  }

  const notifications = userIds.map((userId) => ({
    userId,
    title: title.trim(),
    message: message.trim(),
    type,
    metadata,
  }));

  return Notification.insertMany(notifications);
}

module.exports = {
  createNotification,
  createBulkNotifications,
};
