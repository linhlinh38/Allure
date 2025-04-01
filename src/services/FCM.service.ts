import { messaging } from '../configs/firebaseConfig';
import { BadRequestError } from '../errors/error';
import { fcmTokenRepository } from '../repositories/fcmToken.repository';
import { accountRepository } from '../repositories/account.repository';
import Logging from '../utils/Logging';
import admin from 'firebase-admin';
import { NotificationData } from '../dtos/request/fcm.request';

export class FCMService {
  static async sendNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ) {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        token,
      };

      const response = await messaging.send(message);
      return response;
    } catch (error) {
      throw new Error(`Failed to send notification: ${error.message}`);
    }
  }

  static async sendMulticastNotification(
    tokens: string[],
    notificationData: NotificationData
  ) {
    try {
      const message = {
        notification: {
          title: notificationData.title,
          body: notificationData.body,
        },
        data: notificationData.data || {},
        tokens,
      };

      const response = await messaging.sendEachForMulticast(message);

      //store to firestore
      await this.saveNotificationToFirestore(notificationData);
      return response;
    } catch (error) {
      throw new Error(
        `Failed to send multicast notification: ${error.message}`
      );
    }
  }

  static async sendTopicNotification(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ) {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        topic,
      };

      const response = await messaging.send(message);
      return response;
    } catch (error) {
      throw new Error(`Failed to send topic notification: ${error.message}`);
    }
  }

  static async getToken(userId: string) {
    const token = await fcmTokenRepository.findOne({
      where: {
        account: {
          id: userId,
        },
      },
    });
    if (!token) throw new BadRequestError('FCM Token not found');
    return token.token;
  }

  static async createToken(userId: string, token: string) {
    const existingToken = await fcmTokenRepository.findOne({
      where: {
        account: {
          id: userId,
        },
        token: token,
      },
    });

    if (!existingToken) {
      const newToken = fcmTokenRepository.create({
        token,
        account: {
          id: userId,
        },
      });
      await fcmTokenRepository.save(newToken);
      return newToken;
    }
  }

  static async sendTestNotification(accountId: string) {
    // Get account information
    const account = await accountRepository.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new BadRequestError('Account not found');
    }

    // Get FCM token
    const fcmTokens = await fcmTokenRepository.find({
      where: { account: { id: accountId } },
    });

    if (!fcmTokens || fcmTokens.length === 0) {
      throw new BadRequestError('FCM token not found for this account');
    }

    // Create notification data
    const notificationData = {
      title: 'Test Notification',
      body: `Hello ${account.firstName}, this is a test notification!`,
      data: {
        type: 'TEST',
        message: 'This is a test notification from the API',
      },
      createdAt: new Date(),
      accountIds: [account.id],
      isRead: false,
    };

    // Send test notification
    await this.sendMulticastNotification(
      fcmTokens.map((token) => token.token),
      notificationData
    );

    Logging.info(
      `Test notification sent successfully to account ${account.id}`
    );

    return {
      accountId: account.id,
      accountName: account.firstName,
      notificationSent: true,
    };
  }

  private static async saveNotificationToFirestore(
    notificationData: NotificationData
  ) {
    try {
      const db = admin.firestore();
      await db.collection('notifications').add(notificationData);
      Logging.info('Notification saved to Firestore successfully');
    } catch (error) {
      Logging.error('Error saving notification to Firestore:' + error);
      throw new BadRequestError('Failed to save notification to Firestore');
    }
  }
}
