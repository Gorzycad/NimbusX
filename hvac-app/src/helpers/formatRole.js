// src/helpers/formatRole.js
export const formatRole = (role) => {
  if (!role) return "";

  return role
    .replace(/_/g, " ") // replace underscores with spaces
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};