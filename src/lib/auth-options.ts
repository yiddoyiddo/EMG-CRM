import { NextAuthOptions } from 'next-auth';

// Placeholder – extend with real providers & callbacks as needed.
export const authOptions: NextAuthOptions = {
  providers: [],
  secret: process.env.NEXTAUTH_SECRET,
}; 