import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

/**
 * S3Service
 * 
 * AWS S3 관련 작업을 처리하는 서비스
 * - 파일 업로드/삭제
 * - Presigned URL 생성
 * - UUID 기반 고유 키 생성
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('app.AWS_REGION') || 'ap-northeast-2';
    const bucketConfig = this.configService.get<string>('app.AWS_S3_BUCKET') || '';

    // ARN 형식에서 버킷 이름 추출 (arn:aws:s3:::bucket-name -> bucket-name)
    if (bucketConfig.startsWith('arn:aws:s3:::')) {
      this.bucketName = bucketConfig.replace('arn:aws:s3:::', '');
    } else {
      this.bucketName = bucketConfig;
    }

    if (!this.bucketName) {
      this.logger.warn('AWS_S3_BUCKET이 설정되지 않았습니다.');
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('app.AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('app.AWS_SECRET_ACCESS_KEY') || '',
      },
    });

    this.logger.log(`S3Service 초기화 완료 - Region: ${this.region}, Bucket: ${this.bucketName}`);
  }

  /**
   * S3에 파일 업로드
   * 
   * @param buffer 업로드할 파일의 바이너리 데이터
   * @param key S3에 저장될 경로 (예: passport-photos/2024/01/uuid.png)
   * @param contentType 파일 MIME 타입 (예: image/png)
   * @returns 업로드 성공 여부
   */
  async uploadObject(buffer: Buffer, key: string, contentType: string): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);
      this.logger.log(`S3 업로드 성공: ${key}`);
    } catch (error) {
      this.logger.error(`S3 업로드 실패: ${key}`, error);
      throw error;
    }
  }

  /**
   * S3에서 파일 삭제
   * 
   * @param key 삭제할 S3 객체의 경로
   * @returns 삭제 성공 여부
   */
  async deleteObject(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`S3 삭제 성공: ${key}`);
    } catch (error) {
      this.logger.error(`S3 삭제 실패: ${key}`, error);
      throw error;
    }
  }

  /**
   * 단일 Presigned URL 생성
   * 
   * @param key Presigned URL을 생성할 S3 객체의 경로
   * @param expiresIn URL 만료 시간(초, 기본 3600)
   * @returns Presigned URL 문자열
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      this.logger.error(`Presigned URL 생성 실패: ${key}`, error);
      throw error;
    }
  }

  /**
   * 다중 Presigned URL 일괄 생성
   *
   * @param keys Presigned URL을 생성할 S3 객체 경로 배열
   * @param expiresIn URL 만료 시간(초, 기본 3600)
   * @returns Presigned URL 배열 (키와 URL의 매핑)
   */
  async generatePresignedUrls(
    keys: string[],
    expiresIn: number = 3600,
  ): Promise<Array<{ key: string; url: string }>> {
    try {
      const urlPromises = keys.map(async (key) => {
        const url = await this.getPresignedUrl(key, expiresIn);
        return { key, url };
      });

      const urls = await Promise.all(urlPromises);
      this.logger.log(`Presigned URL 일괄 생성 완료: ${keys.length}개`);
      return urls;
    } catch (error) {
      this.logger.error(`Presigned URL 일괄 생성 실패`, error);
      throw error;
    }
  }

  /**
   * S3 키 존재 확인
   *
   * @param key 확인할 S3 객체의 경로
   * @returns 존재 여부
   */
  async objectExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      this.logger.error(`S3 키 존재 확인 실패: ${key}`, error);
      throw error;
    }
  }

  /**
   * UUID 기반 고유 S3 키 생성
   *
   * 패턴: passport-photos/{year}/{month}/{uuid}.png
   * - year, month: 날짜별 수명 주기 정책 적용을 위해 필요
   * - uuid: 사용자 ID 노출 방지 및 예측 불가능한 키 생성
   *
   * @param maxRetries 최대 재시도 횟수 (기본 3회)
   * @returns 고유한 S3 키
   */
  async generateUniqueS3Key(maxRetries: number = 3): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const uuid = randomUUID();
      const key = `passport-photos/${year}/${month}/${uuid}.png`;

      // 중복 확인
      const exists = await this.objectExists(key);
      if (!exists) {
        return key;
      }

      this.logger.warn(`S3 키 중복 발견 (재시도 ${attempt + 1}/${maxRetries}): ${key}`);
    }

    // 최대 재시도 횟수 초과 시에도 UUID를 사용 (중복 확률이 거의 없음)
    const uuid = randomUUID();
    const key = `passport-photos/${year}/${month}/${uuid}.png`;
    this.logger.warn(`최대 재시도 횟수 초과, 키 생성: ${key}`);
    return key;
  }

  /**
   * 버킷 이름 조회
   */
  getBucketName(): string {
    return this.bucketName;
  }

  /**
   * 리전 정보 조회
   */
  getRegion(): string {
    return this.region;
  }

  /**
   * S3 연결 상태 확인
   * HeadBucketCommand를 사용하여 버킷 접근 권한 및 연결 상태 확인
   * 
   * @returns 연결 상태 정보
   */
  async checkHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    bucket: string;
    region: string;
    message?: string;
    error?: string;
  }> {
    try {
      if (!this.bucketName) {
        return {
          status: 'unhealthy',
          bucket: '',
          region: this.region,
          error: '버킷 이름이 설정되지 않았습니다.',
        };
      }

      // HeadBucketCommand로 버킷 접근 권한 확인
      const command = new HeadBucketCommand({
        Bucket: this.bucketName,
      });

      await this.s3Client.send(command);

      return {
        status: 'healthy',
        bucket: this.bucketName,
        region: this.region,
        message: 'S3 연결 및 버킷 접근 권한 확인 완료',
      };
    } catch (error: any) {
      this.logger.error('S3 연결 상태 확인 실패', error);
      
      let errorMessage = 'S3 연결 실패';
      if (error.name === 'NotFound') {
        errorMessage = '버킷을 찾을 수 없습니다';
      } else if (error.name === 'Forbidden' || error.$metadata?.httpStatusCode === 403) {
        errorMessage = '버킷 접근 권한이 없습니다';
      } else if (error.name === 'InvalidAccessKeyId') {
        errorMessage = 'AWS 액세스 키가 유효하지 않습니다';
      } else if (error.name === 'SignatureDoesNotMatch') {
        errorMessage = 'AWS 시크릿 키가 유효하지 않습니다';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        status: 'unhealthy',
        bucket: this.bucketName || '',
        region: this.region,
        error: errorMessage,
      };
    }
  }
}

