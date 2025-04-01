import { BadRequestError } from '../errors/error';
import { bankAccountRepository } from '../repositories/bankAccount.repository';
import { accountRepository } from '../repositories/account.repository';
import {
  CreateBankAccountRequest,
  UpdateBankAccountRequest,
} from '../dtos/request/bankAccount.request';
import Logging from '../utils/Logging';

export class BankAccountService {
  static async create(accountId: string, request: CreateBankAccountRequest) {
    const account = await accountRepository.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new BadRequestError('Account not found');
    }

    // Check if there are any existing bank accounts
    const existingBankAccounts = await bankAccountRepository.find({
      where: { account: { id: accountId } },
    });

    // If this is the first bank account, set it as default
    const isDefault = existingBankAccounts.length === 0;

    const bankAccount = bankAccountRepository.create({
      ...request,
      account,
      isDefault,
    });

    await bankAccountRepository.save(bankAccount);
    Logging.info(`Bank account created for account ${accountId}`);
    return bankAccount;
  }

  static async update(
    id: string,
    accountId: string,
    request: UpdateBankAccountRequest
  ) {
    const bankAccount = await bankAccountRepository.findOne({
      where: { id, account: { id: accountId } },
    });

    if (!bankAccount) {
      throw new BadRequestError('Bank account not found');
    }

    if (request.isDefault) {
      // Remove default status from other bank accounts
      await bankAccountRepository.update(
        { account: { id: accountId } },
        { isDefault: false }
      );
    }

    Object.assign(bankAccount, request);
    await bankAccountRepository.save(bankAccount);
    Logging.info(`Bank account ${id} updated for account ${accountId}`);
    return bankAccount;
  }

  static async delete(id: string, accountId: string) {
    const bankAccount = await bankAccountRepository.findOne({
      where: { id, account: { id: accountId } },
    });

    if (!bankAccount) {
      throw new BadRequestError('Bank account not found');
    }

    if (bankAccount.isDefault) {
      throw new BadRequestError('Cannot delete default bank account');
    }

    await bankAccountRepository.remove(bankAccount);
    Logging.info(`Bank account ${id} deleted for account ${accountId}`);
  }

  static async getBankAccounts(accountId: string) {
    const bankAccounts = await bankAccountRepository.find({
      where: { account: { id: accountId } },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });

    return bankAccounts;
  }

  static async getBankAccount(id: string, accountId: string) {
    const bankAccount = await bankAccountRepository.findOne({
      where: { id, account: { id: accountId } },
    });

    if (!bankAccount) {
      throw new BadRequestError('Bank account not found');
    }

    return bankAccount;
  }
}
