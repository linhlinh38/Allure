import { messaging } from "../configs/firebaseConfig";
import { BadRequestError } from "../errors/error";
import { fcmTokenRepository } from "../repositories/fcmToken.repository";

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
        tokens,
      };

      const response = await messaging.sendEachForMulticast(message);
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
    if (!token) throw new BadRequestError("FCM Token not found");
    return token.token;
  }

  static async createToken(userId: string, token: string) {
    // Kiểm tra xem user đã có token chưa
    const existingToken = await fcmTokenRepository.findOne({
      where: {
        account: {
          id: userId,
        },
      },
    });

    if (existingToken) {
      // Nếu đã có token, cập nhật token mới
      existingToken.token = token;
      await fcmTokenRepository.save(existingToken);
      return existingToken;
    }

    // Nếu chưa có token, tạo mới
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
