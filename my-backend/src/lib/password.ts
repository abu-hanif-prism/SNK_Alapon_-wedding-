import argon2 from "argon2";

export const hashPassword = (password: string) => argon2.hash(password);

export const verifyPassword = (hash: string, password: string) => argon2.verify(hash, password);

// Verified when the email is unknown, so login takes the same time either way.
export const DUMMY_PASSWORD_HASH = await argon2.hash("dummy-password-for-timing");
