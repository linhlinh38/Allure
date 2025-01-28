import express from 'express';
import authentication from '../middleware/authentication';
import WalletController from '../controllers/wallet.controller';
import validate from '../utils/validate';
import { WalletCreateSchema, WalletUpdateSchema } from '../dtos/request/wallet.request';
const walletRouter = express.Router();

walletRouter.get('/', WalletController.getAll);

walletRouter.use(authentication);

walletRouter.post('/', validate(WalletCreateSchema), WalletController.create);
walletRouter.get('/get-my-wallet', WalletController.getMyWallet);
walletRouter.get(
  '/get-wallet-by-account-id/:accountId',
  WalletController.getWalletByAccountId
);
walletRouter.put('/update-by-account-id/:accountId', validate(WalletUpdateSchema), WalletController.update);
export default walletRouter;
