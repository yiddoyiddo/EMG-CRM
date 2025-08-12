import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './db';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // Find user by email with territory info
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.username
            },
            include: {
              territory: true,
              managedTerritories: true
            }
          });

          if (!user) {
            return null;
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(credentials.password, user.hashedPassword);

          if (!isPasswordValid) {
            return null;
          }

          // Update last login timestamp
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
          });

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            territoryId: user.territoryId,
            territoryName: user.territory?.name,
            managedTerritoryIds: user.managedTerritories.map(t => t.id),
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const userData = user as any;
        token.id = userData.id;
        token.role = userData.role;
        token.name = userData.name;
        token.territoryId = userData.territoryId;
        token.territoryName = userData.territoryName;
        token.managedTerritoryIds = userData.managedTerritoryIds;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as Role;
        (session.user as any).territoryId = token.territoryId as string | null;
        (session.user as any).territoryName = token.territoryName as string | null;
        (session.user as any).managedTerritoryIds = token.managedTerritoryIds as string[];
      }
      return session;
    },
  },
}; 