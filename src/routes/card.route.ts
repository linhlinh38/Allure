import { Router } from 'express';
import {
  CardCreateSchema,
  CardUpdateSchema,
} from '../dtos/request/card.request';
import CardController from '../controllers/card.controller';
import authentication from '../middleware/authentication';
import validate from '../utils/validate';

const cardRouter = Router();

cardRouter.post(
  '/',
  authentication,
  validate(CardCreateSchema),
  CardController.create
);

cardRouter.put(
  '/:id',
  authentication,
  validate(CardUpdateSchema),
  CardController.update
);

cardRouter.delete('/:id', authentication, CardController.delete);

cardRouter.get('/:id', authentication, CardController.getById);

cardRouter.get('/', authentication, CardController.getAll);

export default cardRouter;
