import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db"; // Ensure this path to your Prisma client is correct
import { comparePassword } from "@/lib/auth-utils"; // Ensure this path is correct

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt", // Use JSON Web Tokens
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        // Look up the user
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        // Check if user exists and has a password
        if (!user || !user.hashedPassword) {
          return null;
        }

        // Compare the password securely
        const isValidPassword = await comparePassword(
          credentials.password,
          user.hashedPassword
        );

        if (!isValidPassword) {
          return null;
        }

        // Success: Return the user object
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role, // Important!
        };
      },
    }),
  ],
  // CRUCIAL for RBAC: Injecting Role/ID into the Session
  callbacks: {
    // Add role/id to the JWT token when it's created
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    // Add role/id to the Session object (accessible in the frontend/backend)
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login", // Specifies our custom login page route
  },
};