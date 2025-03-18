import { Request, Response, NextFunction } from "express";
import FileService from "../services/file.service";

export default class FileController {
  static async upload(req: Request, res: Response, next: NextFunction) {
    const files = req.files as Express.Multer.File[];
    try {
      res.status(200).json({
        message: "Upload success",
        data: await FileService.upload(files),
      });
    } catch (err) {
      next(err);
    }
  }
  static async delete(req: Request, res: Response, next: NextFunction) {
    const { urls } = req.body;
    try {
      await FileService.delete(urls);
      res.status(200).json({
        message: "Delete success",
      });
    } catch (err) {
      next(err);
    }
  }
  static async uploadFileConsultationCriteria(req: Request, res: Response) {
    try {
      if (!req.files) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const expectedHeaders = ["section", "mandatory", "description"];

      const files = req.files as Express.Multer.File[];
      const results = [];

      for (const file of files) {
        const jsonData = await FileService.processExcelFile(
          file.buffer,
          expectedHeaders
        );
        results.push({ fileName: file.originalname, data: jsonData });
      }

      res.json({ message: "File processed successfully", data: results });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async uploadFileQuestion(req: Request, res: Response) {
    try {
      if (!req.files) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const expectedHeaders = ["question", "mandatory", "answers", "type"];

      const files = req.files as Express.Multer.File[];
      const results = [];

      for (const file of files) {
        const jsonData = await FileService.processExcelFile(
          file.buffer,
          expectedHeaders
        );
        results.push({ fileName: file.originalname, data: jsonData });
      }

      res.json({ message: "File processed successfully", data: results });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
