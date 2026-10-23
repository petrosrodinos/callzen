import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, promises as fs } from 'fs';
import { Readable } from 'stream';
import * as path from 'path';
import { GcsConfig } from '../gcs/config/gcs.config';

const RECORDINGS_FOLDER = 'recordings';

export interface StoredRecording {
  path: string;
  size: number;
  mime: string;
}

@Injectable()
export class RecordingStorageService {
  private readonly logger = new Logger(RecordingStorageService.name);
  private readonly localRoot: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly gcsConfig: GcsConfig,
  ) {
    this.localRoot = path.resolve(
      this.configService.get<string>('RECORDINGS_DIR') || './storage',
    );
  }

  private useGcs(): boolean {
    return (
      !!this.gcsConfig.getStorageClient() &&
      !!this.configService.get('GCS_BUCKET_NAME')
    );
  }

  async save(
    userId: string,
    callId: string,
    buffer: Buffer,
    mime: string,
  ): Promise<StoredRecording> {
    const extension = mime.includes('mp4')
      ? 'm4a'
      : mime.includes('ogg')
        ? 'ogg'
        : 'webm';
    const relativePath = `${RECORDINGS_FOLDER}/${userId}/${callId}.${extension}`;

    if (this.useGcs()) {
      const file = this.gcsConfig
        .getStorageClient()
        .bucket(this.gcsConfig.getBucketName())
        .file(relativePath);
      await file.save(buffer, { contentType: mime, resumable: false });
    } else {
      const absolute = path.join(this.localRoot, relativePath);
      await fs.mkdir(path.dirname(absolute), { recursive: true });
      await fs.writeFile(absolute, buffer);
    }

    return { path: relativePath, size: buffer.length, mime };
  }

  async open(relativePath: string): Promise<Readable> {
    if (this.useGcs()) {
      return this.gcsConfig
        .getStorageClient()
        .bucket(this.gcsConfig.getBucketName())
        .file(relativePath)
        .createReadStream();
    }
    return createReadStream(this.resolveLocal(relativePath));
  }

  async remove(relativePath: string): Promise<void> {
    try {
      if (this.useGcs()) {
        await this.gcsConfig
          .getStorageClient()
          .bucket(this.gcsConfig.getBucketName())
          .file(relativePath)
          .delete({ ignoreNotFound: true });
        return;
      }
      await fs.rm(this.resolveLocal(relativePath), { force: true });
    } catch (error) {
      this.logger.error(
        `Failed to delete recording ${relativePath}: ${error?.message}`,
      );
      throw error;
    }
  }

  private resolveLocal(relativePath: string): string {
    const absolute = path.resolve(this.localRoot, relativePath);
    if (!absolute.startsWith(this.localRoot)) {
      throw new Error('Invalid recording path');
    }
    return absolute;
  }
}
