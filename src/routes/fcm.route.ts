import express from 'express';
import authentication from '../middleware/authentication';
import { FCMController } from '../controllers/FCM.controller';
const FCMRouter = express.Router();

FCMRouter.use(authentication);
FCMRouter.get(
  '/get-token',
  FCMController.getToken
);


FCMRouter.post('/create-token', FCMController.createToken);

export default FCMRouter;
