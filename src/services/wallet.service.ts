import { QueryRunner } from 'typeorm';
import { AppDataSource } from '../dataSource';
import {
  DepositRequest,
  WalletCreateRequest,
} from '../dtos/request/wallet.request';
import { Order } from '../entities/order.entity';
import { Wallet } from '../entities/wallet.entity';
import { BadRequestError } from '../errors/error';
import { accountRepository } from '../repositories/account.repository';
import { walletRepository } from '../repositories/wallet.reposirory';
import { payos } from '../utils/payos';
import { BaseService } from './base.service';
import { PaymentMethodEnum } from '../utils/enum';

const repository = AppDataSource.getRepository(Wallet);
class WalletService extends BaseService<Wallet> {
  async deposit(depositBody: DepositRequest, loginUser: string) {
    const paymentLink = await payos.getPaymentLinkInformation(depositBody.id);
    if (paymentLink.status != 'PAID') {
      throw new BadRequestError('Payment not paid yet');
    }
    const wallet = await walletRepository.findOne({
      where: {
        owner: { id: loginUser },
      },
    });
    if (wallet) {
      wallet.balance += paymentLink.amountPaid;
    }
    await walletRepository.save(wallet);
  }
  async getWalletByAccountId(accountId: string) {
    const account = await accountRepository.findOne({
      where: {
        id: accountId,
      },
      relations: {
        wallet: { owner: true },
      },
    });
    if (!account) throw new BadRequestError('Account not found');
    if (!account.wallet) throw new BadRequestError('Wallet not found');
    return account.wallet;
  }
  async createWallet(walletCreateRequest: WalletCreateRequest) {
    const account = await accountRepository.findOne({
      where: {
        id: walletCreateRequest.ownerId,
      },
      relations: {
        wallet: true,
      },
    });
    if (!account) throw new BadRequestError('Account not found');
    if (account.wallet) throw new BadRequestError('Wallet already exist');
    const wallet = new Wallet();
    wallet.owner = account;
    wallet.balance = walletCreateRequest.balance;
    await wallet.save();
  }

  async updateByAccountId(balance: number, accountId: string) {
    const wallet = await walletRepository.findOne({
      where: {
        owner: { id: accountId },
      },
    });
    if (!wallet) throw new BadRequestError(`Wallet not found`);
    wallet.balance = balance;
    await walletRepository.save(wallet);
  }

  async getMyWallet(userId: string) {
    const wallet = await walletRepository.findOne({
      where: {
        owner: { id: userId },
      },
      relations: {
        owner: true,
      },
    });
    if (!wallet) throw new BadRequestError(`Wallet not found`);
    return wallet;
  }

  async refundFromCancelOrder(
    order: Order,
    queryRunner: QueryRunner
  ) {
    if (order.paymentMethod == PaymentMethodEnum.CASH) return;
    const wallet = await walletRepository.findOne({
      where: {
        owner: { id: order.account.id },
      },
    });
    if (!wallet) throw new BadRequestError('Dont have wallet');
    wallet.balance += order.totalPrice;
    await queryRunner.manager.save(wallet);
  }

  async getById(id: string) {
    const wallet = await repository.findOne({
      where: {
        id: id,
      },
      relations: {
        owner: true,
      },
    });
    if (!wallet) throw new BadRequestError('Wallet not found');
    return wallet;
  }
  constructor() {
    super(repository);
  }
}
export const walletService = new WalletService();
