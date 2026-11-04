
const express = require("express");
const mongoose = require("mongoose");

const Notification = require("../models/Notification");

const router = express.Router();

const ALLOWED_NOTIFICATION_TYPES = [
  "achievement",
  "message",
  "community",
  "system",
  "reminder",
  "general",
];

const MAX_TITLE_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 500;

function validateNotificationInput({ title, message, type }) {
  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof message !== "string" ||
    !message.trim()
  ) {
    return "Title and message are required.";
  }

  if (title.trim().length > MAX_TITLE_LENGTH) {
    return `Title cannot exceed ${MAX_TITLE_LENGTH} characters.`;
  }

  if (message.trim().length > MAX_MESSAGE_LENGTH) {
    return `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`;
  }

  if (
    type !== undefined &&
    !ALLOWED_NOTIFICATION_TYPES.includes(type)
  ) {
    return "Invalid notification type.";
  }

  return null;
}

// GET /api/notifications
// Retrieve the authenticated user's notifications.

router.get("/", async (req, res, next) => {
  try {
    const userId = String(req.user.id);

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId })
        .select("-__v")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),

      Notification.countDocuments({
        userId,
        isRead: false,
      }),
    ]);

    return res.status(200).json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error) {
    return next(error);
  }
});

// POST /api/notifications
// Create a notification for the authenticated user.

router.post("/", async (req, res, next) => {
  try {
    const userId = String(req.user.id);
    const { title, message, type, metadata } = req.body;

    const validationError = validateNotificationInput({
      title,
      message,
      type,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const notification = await Notification.create({
      userId,
      title: title.trim(),
      message: message.trim(),
      type: type || "general",
      metadata: metadata ?? null,
    });

    const notificationData = notification.toObject();
    delete notificationData.__v;

    return res.status(201).json({
      success: true,
      message: "Notification created successfully.",
      notification: notificationData,
    });
  } catch (error) {
    return next(error);
  }
});

// PATCH /api/notifications/read-all
// Mark all of the user's unread notifications as read.

router.patch("/read-all", async (req, res, next) => {
  try {
    const userId = String(req.user.id);

    const result = await Notification.updateMany(
      {
        userId,
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    return next(error);
  }
});

// PATCH /api/notifications/:id/read
// Mark one notification as read.

router.patch("/:id/read", async (req, res, next) => {
  try {
    const userId = String(req.user.id);
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        userId,
      },
      {
        $set: { isRead: true },
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("-__v");

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      notification,
    });
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/notifications
// Delete all notifications belonging to the user.

router.delete("/", async (req, res, next) => {
  try {
    const userId = String(req.user.id);

    const result = await Notification.deleteMany({ userId });

    return res.status(200).json({
      success: true,
      message: "All notifications deleted permanently.",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/notifications/:id
// Permanently delete one notification.

router.delete("/:id", async (req, res, next) => {
  try {
    const userId = String(req.user.id);
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted permanently.",
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
