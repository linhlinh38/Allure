import {
  ref,
  uploadBytes,
  deleteObject,
  getDownloadURL,
} from 'firebase/storage';
import { BadRequestError } from '../errors/error';
import path from 'path';
import storage from '../configs/firebaseConfig'; // Import initialized Firebase storage
import xlsx from 'xlsx';

export default class FileService {
  static async upload(files: Express.Multer.File[]) {
    if (!files || !Array.isArray(files)) {
      throw new BadRequestError('No files uploaded');
    }

    const uploadPromises = files.map(async (file) => {
      try {
        const fileName = `${Date.now()}${path.extname(file.originalname)}`;
        const storageRef = ref(storage, fileName);

        // Upload the file buffer to Firebase Storage
        await uploadBytes(storageRef, file.buffer, {
          contentType: file.mimetype,
        });

        // Get public URL
        const publicUrl = await getDownloadURL(storageRef);
        return publicUrl;
      } catch (error) {
        throw new BadRequestError(`Upload failed: ${error.message}`);
      }
    });

    return await Promise.all(uploadPromises);
  }

  static async delete(urls: string[]) {
    if (!urls || !Array.isArray(urls)) {
      throw new BadRequestError('No URLs provided');
    }

    const deletePromises = urls.map(async (url) => {
      try {
        const urlPath = new URL(url).pathname;
        const fileName = urlPath.split('/').pop(); // Extract file name from URL

        if (!fileName) {
          throw new BadRequestError(`Invalid URL: ${url}`);
        }

        const fileRef = ref(storage, fileName);

        await deleteObject(fileRef);
        return `Deleted: ${url}`;
      } catch (error) {
        if (error.code === 'storage/object-not-found') {
          throw new BadRequestError(`File not found: ${url}`);
        }
        throw new BadRequestError(`Delete failed: ${error.message}`);
      }
    });

    return await Promise.all(deletePromises);
  }

  static async processExcelFile(fileBuffer: Buffer, expectedHeaders: string[]) {
    try {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });

      const sheetsData = [];

      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        const headers = Object.keys(data[0]);
        if (!this.validateHeaders(headers, expectedHeaders)) {
          throw new Error(`Invalid headers in sheet ${sheetName}`);
        }

        data.forEach((res) => {
          sheetsData.push(res);
        });
      });

      return sheetsData;
    } catch (error) {
      throw error;
    }
  }

  private static validateHeaders(
    headers: any[],
    expectedHeaders: string[]
  ): boolean {
    return (
      expectedHeaders.every((header) => headers.includes(header)) &&
      headers.every((header) => expectedHeaders.includes(header))
    );
  }
}
