import express from 'express';
import { handleMulterErrors, uploadFile } from '../configs/muterConfig';
import FileController from '../controllers/file.controller';

const fileRouter = express.Router();
fileRouter.post('/upload', uploadFile, handleMulterErrors, FileController.upload);
fileRouter.delete('/delete', FileController.delete);
export default fileRouter;
