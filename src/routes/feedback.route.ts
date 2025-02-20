import express from 'express';
import FeedbackController from '../controllers/feedback.controller';
import validate from '../utils/validate';
import { FeedbackCreateSchema, FeedbackFilterSchema, ReplySchema } from '../dtos/request/feedback.request';
import authentication from '../middleware/authentication';

const feedbackRouter = express.Router();
feedbackRouter.get(
  '/get-by-id/:id',
  FeedbackController.getById
);
feedbackRouter.get(
  '/review-general-of-product/:productId',
  FeedbackController.reviewGeneralOfProduct
);
feedbackRouter.post(
  '/filter/:productId',
  validate(FeedbackFilterSchema),
  FeedbackController.filter
);
feedbackRouter.use(authentication);
feedbackRouter.get('/get-my-feedbacks', FeedbackController.getMyFeedbacks);
feedbackRouter.post(
  '/create',
  validate(FeedbackCreateSchema),
  FeedbackController.create
);
feedbackRouter.post(
  '/reply/:feedbackId',
  validate(ReplySchema),
  FeedbackController.reply
);
export default feedbackRouter;
