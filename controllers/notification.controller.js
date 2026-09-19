import Notification from "../models/notification.model.js";

/**
 * GET MY NOTIFICATIONS
 */
export const getMyNotifications = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      const error = new Error("Unauthorized: User not found.");
      error.statusCode = 401;
      return next(error);
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.findAll({
        where: { userId: user.id },
        order: [["createdAt", "DESC"]],
        limit: 50,
      }),
      Notification.count({
        where: { userId: user.id, isRead: false },
      }),
    ]);

    res.status(200).json({
      success: true,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * MARK NOTIFICATION READ
 */
export const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      const error = new Error("Unauthorized: User not found.");
      error.statusCode = 401;
      return next(error);
    }

    const notification = await Notification.findOne({
      where: { id, userId: user.id },
    });

    if (!notification) {
      const error = new Error("Notification not found");
      error.statusCode = 404;
      return next(error);
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};
