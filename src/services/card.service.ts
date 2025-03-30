import { Card } from '../entities/card.entity';
import {
  CardCreateRequest,
  CardUpdateRequest,
} from '../dtos/request/card.request';
import { BadRequestError } from '../errors/error';
import { AppDataSource } from '../dataSource';

const repository = AppDataSource.getRepository(Card);

export class CardService {
  async create(cardData: CardCreateRequest, loginUser: string) {
    // Check if card number already exists
    const existingCard = await repository.findOne({
      where: { cardNumber: cardData.cardNumber },
    });
    if (existingCard) {
      throw new BadRequestError('Card number already exists');
    }

    // Convert expiration date string to Date
    const [month, year] = cardData.expirationDate.split('/');
    const expirationDate = new Date(2000 + parseInt(year), parseInt(month) - 1);

    const card = repository.create({
      ...cardData,
      expirationDate,
      account: { id: loginUser },
    });

    // If this is the first card or isDefault is true, set it as default
    if (cardData.isDefault) {
      await this.setDefaultCard(card, loginUser);
    }

    return await repository.save(card);
  }

  async update(id: string, cardData: CardUpdateRequest, loginUser: string) {
    const card = await repository.findOne({
      where: { id, account: { id: loginUser } },
    });

    if (!card) {
      throw new BadRequestError('Card not found');
    }

    // If setting as default, update other cards
    if (cardData.isDefault) {
      await this.setDefaultCard(card, loginUser);
    } else if (card.isDefault) {
      // If trying to remove default status from the only default card, prevent it
      const defaultCards = await repository.find({
        where: { account: { id: loginUser }, isDefault: true },
      });

      if (defaultCards.length === 1 && defaultCards[0].id === card.id) {
        throw new BadRequestError(
          'Cannot remove default status from the only default card'
        );
      }
    }

    Object.assign(card, cardData);
    return await repository.save(card);
  }

  async delete(id: string, loginUser: string) {
    const card = await repository.findOne({
      where: { id, account: { id: loginUser } },
    });

    if (!card) {
      throw new BadRequestError('Card not found');
    }

    // If trying to delete the only default card, prevent it
    if (card.isDefault) {
      const defaultCards = await repository.find({
        where: { account: { id: loginUser }, isDefault: true },
      });

      if (defaultCards.length === 1) {
        throw new BadRequestError('Cannot delete the only default card');
      }
    }

    await repository.remove(card);
  }

  async getById(id: string, loginUser: string) {
    const card = await repository.findOne({
      where: { id, account: { id: loginUser } },
    });

    if (!card) {
      throw new BadRequestError('Card not found');
    }

    return card;
  }

  async getAll(loginUser: string) {
    return await repository.find({
      where: { account: { id: loginUser } },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  private async setDefaultCard(card: Card, loginUser: string) {
    // Remove default status from other cards
    await repository.update(
      { account: { id: loginUser } },
      { isDefault: false }
    );

    // Set this card as default
    card.isDefault = true;
  }
}

export const cardService = new CardService();
