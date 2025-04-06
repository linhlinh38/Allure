import admin from 'firebase-admin';
import { BadRequestError } from '../errors/error';
import { accountRepository } from '../repositories/account.repository';

class FirebaseAuthService {
  async generateCustomToken(loginUser: string) {
    try {
      const account = await accountRepository.findOne({
        where: {
          id: loginUser,
        },
      });

      if (!account) {
        throw new BadRequestError('Account not found');
      }

      try {
        // Try to get existing user by email
        const user = await admin.auth().getUserByEmail(account.email);
        // Update user if exists
        await admin.auth().updateUser(user.uid, {
          displayName: account.username,
          emailVerified: true,
        });
        return await admin.auth().createCustomToken(user.uid, {
          email: account.email,
          displayName: account.username,
        });
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          // Create new user if not exists
          const newUser = await admin.auth().createUser({
            email: account.email,
            displayName: account.username,
            emailVerified: true,
          });
          return await admin.auth().createCustomToken(newUser.uid, {
            email: account.email,
            displayName: account.username,
          });
        }
        throw error;
      }
    } catch (error) {
      console.error('Error generating custom token:', error);
      throw new BadRequestError('Failed to generate authentication token');
    }
  }

  async verifyIdToken(idToken: string) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      console.error('Error verifying ID token:', error);
      throw new BadRequestError('Invalid authentication token');
    }
  }
}

export const firebaseAuthService = new FirebaseAuthService();
