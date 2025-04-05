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
import { FilterWithdrawalRequest } from '../dtos/request/withdrawalRequest.request';
import { transactionService } from './transaction.service';
import { File } from '../entities/file.entity';

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
    const queryRunner =
      withdrawalRequestRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const withdrawalRequest = await queryRunner.manager.findOne(
        withdrawalRequestRepository.target,
        {
          where: { id },
          relations: ['account', 'account.wallet'],
        }
      );

      if (!withdrawalRequest) {
        throw new BadRequestError('Withdrawal request not found');
      }

      const wallet = withdrawalRequest.account.wallet;

      const updatedBy = await queryRunner.manager.findOne(
        accountRepository.target,
        {
          where: { id: loginUser },
          relations: ['role'],
        }
      );

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
            'When current status is Pending, only allowed status: ' +
              nextWithDrawStatusMap[withdrawalRequest.status].join(', ')
          );
        }
        if (request.status === WithdrawalStatusEnum.REJECTED) {
          if (!request.rejectedReason) {
            throw new BadRequestError('Rejected reason is required');
          }
          withdrawalRequest.rejectedReason = request.rejectedReason;
          withdrawalRequest.processedBy = { id: loginUser } as Account;

          wallet.availableBalance += withdrawalRequest.amount;
        } else if (request.status === WithdrawalStatusEnum.APPROVED) {
          withdrawalRequest.processedBy = { id: loginUser } as Account;
        }
      } else if (withdrawalRequest.status === WithdrawalStatusEnum.APPROVED) {
        if (
          !nextWithDrawStatusMap[withdrawalRequest.status].includes(
            request.status
          )
        ) {
          throw new BadRequestError(
            'When current status is Approved, only allowed status: ' +
              nextWithDrawStatusMap[withdrawalRequest.status].join(', ')
          );
        }
        if (request.status === WithdrawalStatusEnum.COMPLETED) {
          if (!request.evidences || request.evidences.length == 0) {
            throw new BadRequestError('Evidences are required');
          }
          withdrawalRequest.processedBy = { id: loginUser } as Account;
          withdrawalRequest.evidences = request.evidences.map((evidence) => {
            const file = new File();
            file.fileUrl = evidence;
            return file;
          });
          wallet.balance -= withdrawalRequest.amount;

          await queryRunner.manager.save(wallet);
          const transaction =
            await transactionService.createTransactionFromWithDraw(
              withdrawalRequest.amount,
              loginUser,
              queryRunner
            );
          await queryRunner.manager.save(transaction);
        } else if (request.status === WithdrawalStatusEnum.REJECTED) {
          if (!request.rejectedReason) {
            throw new BadRequestError('Rejected reason is required');
          }
          withdrawalRequest.rejectedReason = request.rejectedReason;
          withdrawalRequest.processedBy = { id: loginUser } as Account;

          wallet.availableBalance += withdrawalRequest.amount;
        }
      } else if (
        [
          WithdrawalStatusEnum.COMPLETED,
          WithdrawalStatusEnum.REJECTED,
          WithdrawalStatusEnum.CANCELLED,
        ].includes(request.status)
      ) {
        throw new BadRequestError(
          `Can not update anymore due to current status ${withdrawalRequest.status}`
        );
      }
      withdrawalRequest.status = request.status;
      await queryRunner.manager.save(withdrawalRequest);
      await queryRunner.manager.save(wallet);
      await queryRunner.commitTransaction();
      Logging.info(`Withdrawal request ${id} updated to ${request.status}`);
      return withdrawalRequest;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  static async getWithdrawalRequests(accountId: string) {
    const withdrawalRequests = await withdrawalRequestRepository.find({
      where: { account: { id: accountId } },
      relations: {
        processedBy: { role: true },
        evidences: true,
      },
      order: { createdAt: 'DESC' },
    });

    return withdrawalRequests;
  }

  static async getById(id: string, accountId: string) {
    const withdrawalRequest = await withdrawalRequestRepository.findOne({
      where: { id, account: { id: accountId } },
      relations: {
        processedBy: { role: true },
        evidences: true,
      },
    });

    if (!withdrawalRequest) {
      throw new BadRequestError('Withdrawal request not found');
    }

    return withdrawalRequest;
  }

  static async filter(
    filter: FilterWithdrawalRequest,
    page: number = 1,
    limit: number = 10
  ) {
    const queryBuilder = withdrawalRequestRepository
      .createQueryBuilder('withdrawalRequest')
      .leftJoinAndSelect('withdrawalRequest.account', 'account')
      .leftJoinAndSelect('withdrawalRequest.processedBy', 'processedBy')
      .leftJoinAndSelect('withdrawalRequest.evidences', 'evidence');

    if (filter.accountId) {
      queryBuilder.andWhere('account.id = :accountId', {
        accountId: filter.accountId,
      });
    }

    if (filter.processedById) {
      queryBuilder.andWhere('processedBy.id = :processedById', {
        processedById: filter.processedById,
      });
    }

    if (filter.statuses && filter.statuses.length > 0) {
      queryBuilder.andWhere('withdrawalRequest.status IN (:...statuses)', {
        statuses: filter.statuses,
      });
    }

    const [items, total] = await queryBuilder
      .orderBy('withdrawalRequest.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      total,
      totalPages,
      items,
    };
  }
}
