import express from 'express';
import authentication from '../middleware/authentication';
import ReportController from '../controllers/report.controller';
import validate from '../utils/validate';
import {
  CreateReportSchema,
  FilterReportsSchema,
  NoteResultReportSchema,
  UpdateStatusReportSchema,
} from '../dtos/request/report.request';
const reportRouter = express.Router();
reportRouter.use(authentication);
reportRouter.post(
  '/filter',
  validate(FilterReportsSchema),
  ReportController.filterReports
);
reportRouter.get('/get-by-id/:id', ReportController.getById);
reportRouter.post(
  '/create',
  validate(CreateReportSchema),
  ReportController.create
);
reportRouter.post('/assign/:id', ReportController.assign);
reportRouter.post(
  '/update-status/:id',
  validate(UpdateStatusReportSchema),
  ReportController.updateStatus
);
reportRouter.post(
  '/note-result/:id',
  validate(NoteResultReportSchema),
  ReportController.noteResult
);
export default reportRouter;
