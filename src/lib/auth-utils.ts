import bcrypt from 'bcryptjs';

export const hashPassword = async (password: string): Promise<string> => {
  // Use a salt round of 12 for good security
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};