export const resolveOrganizationScope = ({ user, organization }) => {
  // Non-admins are ALWAYS restricted
  if (user.role !== "admin") {
    return {
      organization: user.organization,
      isAll: false,
    };
  }

  // Admin requesting ALL
  if (!organization || organization === "ALL") {
    return {
      organization: null, // null = no filter
      isAll: true,
    };
  }

  // Admin requesting specific org
  return {
    organization,
    isAll: false,
  };
};
