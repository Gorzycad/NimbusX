// src/helpers/getAllowedPages.js
import { ROLE_ACCESS } from "../config/roleAccess";

export function getAllowedPages(role, permissions = {}) {
  const normalizedRole = role?.toLowerCase();

  const defaultPages =
    ROLE_ACCESS[normalizedRole]?.map((p) => p.toLowerCase()) || [];

  const extraPermissions =
    permissions?.extra?.map((p) => p.toLowerCase()) || [];

  const blockedPermissions =
    permissions?.blocked?.map((p) => p.toLowerCase()) || [];

  const mergedPages = [
    ...new Set([...defaultPages, ...extraPermissions]),
  ];

  return mergedPages.filter(
    (page) => !blockedPermissions.includes(page)
  );
}