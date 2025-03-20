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
        // Try to get existing user
        await admin.auth().getUser(loginUser);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          // Create new user if not exists
          await admin.auth().createUser({
            uid: loginUser,
            email: account.email,
            displayName: account.username,
            emailVerified: true,
          });
        } else {
          throw error;
        }
      }

      await admin.auth().updateUser(loginUser, {
        email: account.email,
        displayName: account.username,
        emailVerified: true,
      });

      const customToken = await admin.auth().createCustomToken(loginUser, {
        email: account.email,
        displayName: account.username,
      });

      return customToken;
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
