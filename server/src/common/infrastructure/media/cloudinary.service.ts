import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  UploadApiErrorResponse,
  UploadApiResponse,
  v2 as cloudinary,
} from 'cloudinary';
import { createReadStream } from 'node:fs';
import { Readable } from 'stream';
@Injectable()
export class CloudinaryService {
  private configured = false;

  constructor(private readonly configService: ConfigService) {}

  private ensureConfigured(): void {
    if (this.configured) {
      return;
    }

    const cloud_name = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const api_key = this.configService.get<string>('CLOUDINARY_API_KEY');
    const api_secret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    // In production, docker-compose may default unset env vars to empty string.
    // We want a clear, actionable error instead of failing later in Cloudinary.
    if (!cloud_name?.trim() || !api_key?.trim() || !api_secret?.trim()) {
      throw new Error(
        'CLOUDINARY_CONFIG_MISSING: CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET must be set',
      );
    }

    cloudinary.config({
      cloud_name,
      api_key,
      api_secret,
    });

    this.configured = true;
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
    this.ensureConfigured();
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

      if (file.buffer && file.buffer.length > 0) {
        Readable.from(file.buffer).pipe(uploadStream);
        return;
      }

      if (file.path) {
        createReadStream(file.path).pipe(uploadStream);
        return;
      }

      reject(new Error('Missing uploaded file data'));
    });
  }

  async destroy(publicId: string): Promise<void> {
    this.ensureConfigured();
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