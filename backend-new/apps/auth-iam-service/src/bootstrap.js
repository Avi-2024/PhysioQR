import bcrypt from "bcryptjs";

async function ensureDevelopmentBootstrapUser({
  prisma,
  authRepository,
  logger,
  email = "royalit@gmail.com",
  password = "12345678",
  userName = "Royal IT Admin",
} = {}) {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      email: String(email).toLowerCase(),
      deletedAt: null,
    },
  });

  if (existingUser) {
    logger?.info?.({ email }, "bootstrap user already exists");
    return existingUser;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const created = await authRepository.ensureBootstrapUser({
    user: { name: userName, email },
    passwordHash,
  });

  logger?.info?.({ email, userId: created?.user?.id }, "bootstrap user ensured");
  return created;
}

export { ensureDevelopmentBootstrapUser };
