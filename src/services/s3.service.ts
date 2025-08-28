import AWS from 'aws-sdk';
import { env } from '../config/env';

// Cấu hình AWS S3
const s3 = new AWS.S3({
  accessKeyId: env.awsAccessKeyId,
  secretAccessKey: env.awsSecretAccessKey,
  region: env.awsRegion,
});

export interface S3UploadResult {
  url: string;
  key: string;
  bucket: string;
}

export class S3Service {
  /**
   * Upload file lên S3
   */
  static async uploadFile(
    file: Express.Multer.File,
    folder: string = 'equipment'
  ): Promise<S3UploadResult> {
    try {
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
      
      const uploadParams = {
        Bucket: env.awsS3Bucket,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read', // Để ảnh có thể truy cập public
      };

      const result = await s3.upload(uploadParams).promise();
      
      return {
        url: result.Location,
        key: result.Key,
        bucket: result.Bucket,
      };
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  /**
   * Xóa file từ S3
   */
  static async deleteFile(key: string): Promise<void> {
    try {
      const deleteParams = {
        Bucket: env.awsS3Bucket,
        Key: key,
      };

      await s3.deleteObject(deleteParams).promise();
    } catch (error) {
      console.error('Error deleting from S3:', error);
      throw new Error('Failed to delete file from S3');
    }
  }

  /**
   * Lấy URL của file từ S3
   */
  static getFileUrl(key: string): string {
    return `https://${env.awsS3Bucket}.s3.${env.awsRegion}.amazonaws.com/${key}`;
  }
}
