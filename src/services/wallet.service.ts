import { AppDataSource } from '../dataSource';
import { WalletCreateRequest } from '../dtos/request/wallet.request';
import { Wallet } from '../entities/wallet.entity';
import { BadRequestError } from '../errors/error';
import { accountRepository } from '../repositories/account.repository';
import { walletRepository } from '../repositories/wallet.reposirory';
import { BaseService } from './base.service';

const repository = AppDataSource.getRepository(Wallet);
class WalletService extends BaseService<Wallet> {
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
        id: walletCreateRequest.accountId,
      },
    });
    if (!account) throw new BadRequestError('Account not found');
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
