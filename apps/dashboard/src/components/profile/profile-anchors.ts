export const PROFILE_ANCHORS = [
  "profile-identity",
  "profile-prefs",
  "profile-notify",
  "profile-security",
  "profile-password",
] as const;

export type ProfileAnchor = (typeof PROFILE_ANCHORS)[number];
