import express from 'express';
import authentication from '../middleware/authentication';
import validate from '../utils/validate';
import livestreamController from '../controllers/livestream.controller';
import { livestreamTokenSchema } from '../dtos/request/livestreamToken.request';
import { Author } from '../middleware/authorization';
import { LivestreamFilterSchema } from '../dtos/request/livestreamFilter.request';

const livestreamRouter = express.Router();

livestreamRouter.get('/', livestreamController.getAll);
livestreamRouter.post(
  '/filter',
  validate(LivestreamFilterSchema),
  livestreamController.filter
);
livestreamRouter.use(authentication);
livestreamRouter.post(
  '/',
  Author(['KOL', 'MANAGER']),
  livestreamController.create
);

livestreamRouter.get('/get-by-id/:id', livestreamController.getById);

livestreamRouter.get('/active-live', livestreamController.getActiveLiveStreams);

livestreamRouter.put(
  '/:id',
  Author(['KOL', 'MANAGER', 'ADMIN', 'OPERATOR']),
  livestreamController.update
);

livestreamRouter.post(
  '/token',
  validate(livestreamTokenSchema),
  livestreamController.createTokenLiveStream
);

export default livestreamRouter;
