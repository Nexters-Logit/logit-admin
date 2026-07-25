export function getAllowedAdminEmails(): string[] {
  return (
    process.env.ADMIN_ALLOWED_EMAILS?.split(",")
      .map((e) => e.trim())
      .filter(Boolean) ?? []
  );
}
