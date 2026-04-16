import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  UploadApiErrorResponse,
  UploadApiResponse,
  v2 as cloudinary,
} from 'cloudinary';
import { Readable } from 'stream';
@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.getOrThrow<string>('CLOUDINARY_API_SECRET'),
    });
  }

  uploadImage(
    file: Express.Multer.File,
    options: {
      folder?: string;
      publicId?: string;
    },
  ): Promise<UploadApiResponse> {
    return this.uploadMedia(file, {
      ...options,
      resourceType: 'image',
    });
  }

  uploadMedia(
    file: Express.Multer.File,
    options: {
      folder?: string;
      publicId?: string;
      resourceType?: 'image' | 'video' | 'auto';
    },
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type:
            options?.resourceType ??
            (file.mimetype.startsWith('video/') ? 'video' : 'image'),
          folder: options?.folder ?? 'avatars',
          public_id: options?.publicId,
          overwrite: true,
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload failed'));
            return;
          }

          resolve(result);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  async destroy(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  }

  extractPublicIdFromUrl(url?: string | null): string | null {
    if (!url) return null;
    const marker = '/upload/';
    const idx = url.indexOf(marker);
    if (idx < 0) return null;

    const after = url.slice(idx + marker.length);
    const noVersion = after.replace(/^v\d+\//, '');
    return noVersion.replace(/\.[^.]+$/, '');
  }
}