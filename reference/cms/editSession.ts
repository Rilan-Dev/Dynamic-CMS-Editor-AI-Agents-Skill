export async function enterEditMode(
  slug: string,
  dependencies: {
    sessionStatus: () => Promise<{ authenticated: boolean }>;
    startEditing: (slug: string) => Promise<void>;
  },
): Promise<"started" | "login-required"> {
  const session = await dependencies.sessionStatus();
  if (!session.authenticated) return "login-required";

  await dependencies.startEditing(slug);
  return "started";
}

export async function loginAndEnterEditMode(
  key: string,
  slug: string,
  dependencies: {
    login: (key: string) => Promise<void>;
    startEditing: (slug: string) => Promise<void>;
  },
): Promise<void> {
  await dependencies.login(key);
  await dependencies.startEditing(slug);
}
