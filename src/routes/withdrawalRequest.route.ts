import { Router } from 'express';
import { WithdrawalRequestController } from '../controllers/withdrawalRequest.controller';
import authentication from '../middleware/authentication';
import {
  CreateWithdrawalRequestSchema,
  UpdateWithdrawalRequestSchema,
  FilterWithdrawalRequestSchema,
  GetMyWithdrawalRequestsSchema,
} from '../dtos/request/withdrawalRequest.request';
import validate from '../utils/validate';

const withdrawalRequestrouter = Router();

withdrawalRequestrouter.use(authentication);

withdrawalRequestrouter.post(
  '/',
  validate(CreateWithdrawalRequestSchema),
  WithdrawalRequestController.create
);
withdrawalRequestrouter.post(
  '/get-my-withdrawal-requests',
  validate(GetMyWithdrawalRequestsSchema),
  WithdrawalRequestController.getWithdrawalRequests
);
withdrawalRequestrouter.get('/:id', WithdrawalRequestController.getById);
withdrawalRequestrouter.post(
  '/filter',
  validate(FilterWithdrawalRequestSchema),
  WithdrawalRequestController.filter
);
withdrawalRequestrouter.post(
  '/update/:id',
  validate(UpdateWithdrawalRequestSchema),
  WithdrawalRequestController.update
);

export default withdrawalRequestrouter;
