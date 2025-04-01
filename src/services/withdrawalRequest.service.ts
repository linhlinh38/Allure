import { BadRequestError } from '../errors/error';
import { withdrawalRequestRepository } from '../repositories/withdrawalRequest.repository';
import { accountRepository } from '../repositories/account.repository';
import {
  CreateWithdrawalRequest,
  UpdateWithdrawalRequest,
} from '../dtos/request/withdrawalRequest.request';
import { RoleEnum, WithdrawalStatusEnum } from '../utils/enum';
import Logging from '../utils/Logging';
import { bankAccountRepository } from '../repositories/bankAccount.repository';
import { Account } from '../entities/account.entity';
import { nextWithDrawStatusMap } from '../utils/queue/withDrawStatusMap';

export class WithdrawalRequestService {
  static async create(accountId: string, request: CreateWithdrawalRequest) {
    const account = await accountRepository.findOne({
      where: { id: accountId },
      relations: ['wallet'],
    });

    if (!account) {
      throw new BadRequestError('Account not found');
    }

    // Check if user has enough available balance
    if (account.wallet.availableBalance < request.amount) {
      throw new BadRequestError('Insufficient available balance');
    }

    const bankAccount = await bankAccountRepository.findOne({
      where: { id: request.bankAccountId },
    });

    if (!bankAccount) {
      throw new BadRequestError('Bank account not found');
    }

    // Create withdrawal request
    const withdrawalRequest = withdrawalRequestRepository.create({
      amount: request.amount,
      bankName: bankAccount.bankName,
      accountNumber: bankAccount.accountNumber,
      accountName: bankAccount.accountName,
      account,
      status: WithdrawalStatusEnum.PENDING,
    });

    // Update available balance
    account.wallet.availableBalance -= request.amount;
    await account.wallet.save();

    await withdrawalRequestRepository.save(withdrawalRequest);
    Logging.info(`Withdrawal request created for account ${accountId}`);
    return withdrawalRequest;
  }

  static async update(
    id: string,
    request: UpdateWithdrawalRequest,
    loginUser: string
  ) {
    const withdrawalRequest = await withdrawalRequestRepository.findOne({
      where: { id },
      relations: ['account', 'account.wallet'],
    });

    if (!withdrawalRequest) {
      throw new BadRequestError('Withdrawal request not found');
    }

    const wallet = withdrawalRequest.account.wallet;

    const updatedBy = await accountRepository.findOne({
      where: { id: loginUser },
      relations: ['role'],
    });

    if (
      updatedBy &&
      updatedBy.role.role == RoleEnum.CUSTOMER &&
      updatedBy.id != withdrawalRequest.account.id
    ) {
      throw new BadRequestError(
        'You are not allowed to update this withdrawal request'
      );
    }

    if (withdrawalRequest.status == WithdrawalStatusEnum.PENDING) {
      if (
        !nextWithDrawStatusMap[withdrawalRequest.status].includes(
          request.status
        )
      ) {
        throw new BadRequestError(
          'Only allowed status: ' +
            nextWithDrawStatusMap[withdrawalRequest.status].join(', ')
        );
      }
      if (request.status == WithdrawalStatusEnum.APPROVED) {
        wallet.availableBalance -= withdrawalRequest.amount;
        await wallet.save();
      }
    }

    // Update status and processor
    withdrawalRequest.status = request.status as WithdrawalStatusEnum;
    withdrawalRequest.processedBy = { id: loginUser } as Account;

    if (request.status === WithdrawalStatusEnum.CANCELLED) {
      wallet.availableBalance += withdrawalRequest.amount;
      await wallet.save();

      if (request.status === WithdrawalStatusEnum.CANCELLED) {
        withdrawalRequest.rejectedReason = request.rejectedReason;
      }
    }

    if (request.status === WithdrawalStatusEnum.COMPLETED) {
      wallet.balance -= withdrawalRequest.amount;
      await wallet.save();
    }

    await withdrawalRequestRepository.save(withdrawalRequest);
    Logging.info(`Withdrawal request ${id} updated to ${request.status}`);
    return withdrawalRequest;
  }

  static async getWithdrawalRequests(accountId: string) {
    const withdrawalRequests = await withdrawalRequestRepository.find({
      where: { account: { id: accountId } },
      relations: ['processedBy'],
      order: { createdAt: 'DESC' },
    });

    return withdrawalRequests;
  }

  static async getWithdrawalRequest(id: string, accountId: string) {
    const withdrawalRequest = await withdrawalRequestRepository.findOne({
      where: { id, account: { id: accountId } },
      relations: ['processedBy'],
    });

    if (!withdrawalRequest) {
      throw new BadRequestError('Withdrawal request not found');
    }

    return withdrawalRequest;
  }

  static async getAllWithdrawalRequests() {
    const withdrawalRequests = await withdrawalRequestRepository.find({
      relations: ['account', 'processedBy'],
      order: { createdAt: 'DESC' },
    });

    return withdrawalRequests;
  }
}
