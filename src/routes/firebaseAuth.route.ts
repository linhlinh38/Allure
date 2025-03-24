import { Router } from 'express';
import { FirebaseAuthController } from '../controllers/firebaseAuth.controller';
import authentication from '../middleware/authentication';

const firebaseAuthRouter = Router();

firebaseAuthRouter.use(authentication);

firebaseAuthRouter.post(
  '/generate-token',
  FirebaseAuthController.generateToken
);

firebaseAuthRouter.post('/verify-token', FirebaseAuthController.verifyToken);

export default firebaseAuthRouter;
