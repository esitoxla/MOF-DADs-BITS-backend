import User from "../models/users.js";
import Notification from "../models/notification.model.js";

export async function notifyRole({
  organization,
  role,
  actorId,
  entityType,
  entityId,
  event,
  message,
}) {
  const recipients = await User.findAll({
    where: { organization, role },
    attributes: ["id"],
  });

  if (!recipients.length) return;

  await Notification.bulkCreate(
    recipients.map((recipient) => ({
      userId: recipient.id,
      organization,
      actorId,
      entityType,
      entityId,
      event,
      message,
    })),
  );
}

export async function resolveReviewedNotifications({
  entityType,
  entityId,
  message,
}) {
  await Notification.update(
    { isRead: true, message },
    {
      where: {
        entityType,
        entityId,
        event: "reviewed",
      },
    },
  );
}
