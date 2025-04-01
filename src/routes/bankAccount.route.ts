import { Router } from 'express';
import { BankAccountController } from '../controllers/bankAccount.controller';
import {
  CreateBankAccountSchema,
  UpdateBankAccountSchema,
} from '../dtos/request/bankAccount.request';
import authentication from '../middleware/authentication';
import validate from '../utils/validate';

const bankAccountRouter = Router();

bankAccountRouter.use(authentication);

bankAccountRouter.post(
  '/',
  validate(CreateBankAccountSchema),
  BankAccountController.create
);
bankAccountRouter.put(
  '/:id',
  validate(UpdateBankAccountSchema),
  BankAccountController.update
);
bankAccountRouter.delete('/:id', BankAccountController.delete);
bankAccountRouter.get('/', BankAccountController.getBankAccounts);
bankAccountRouter.get('/:id', BankAccountController.getBankAccount);

export default bankAccountRouter;
