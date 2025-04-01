import { Router } from 'express';
import { WithdrawalRequestController } from '../controllers/withdrawalRequest.controller';
import authentication from '../middleware/authentication';
import {
  CreateWithdrawalRequestSchema,
  UpdateWithdrawalRequestSchema,
} from '../dtos/request/withdrawalRequest.request';
import validate from '../utils/validate';

const router = Router();

// User routes
router.post(
  '/',
  authentication,
  validate(CreateWithdrawalRequestSchema),
  WithdrawalRequestController.create
);
router.get(
  '/',
  authentication,
  WithdrawalRequestController.getWithdrawalRequests
);
router.get(
  '/:id',
  authentication,
  WithdrawalRequestController.getWithdrawalRequest
);

// Admin routes
router.get(
  '/admin/all',
  authentication,
  WithdrawalRequestController.getAllWithdrawalRequests
);
router.patch(
  '/admin/:id',
  authentication,
  validate(UpdateWithdrawalRequestSchema),
  WithdrawalRequestController.update
);

export default router;
