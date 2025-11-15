import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PassportPhotosService } from './passport-photos.service';
import { PassportPhoto, PassportPhotoDocument } from './schemas/passport-photo.schema';

describe('PassportPhotosService', () => {
  let service: PassportPhotosService;
  let model: Model<PassportPhotoDocument>;

  const mockPassportPhotoModel = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PassportPhotosService,
        {
          provide: getModelToken(PassportPhoto.name),
          useValue: mockPassportPhotoModel,
        },
      ],
    }).compile();

    service = module.get<PassportPhotosService>(PassportPhotosService);
    model = module.get<Model<PassportPhotoDocument>>(getModelToken(PassportPhoto.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addPhotoFIFO', () => {
    it('should add photo when count is less than 10', async () => {
      const userId = 1;
      const s3Key = 'users/1/photo1.jpg';
      const mockPhoto = {
        user_id: userId,
        s3_key: s3Key,
        is_locked: false,
        created_at: new Date(),
      };

      mockPassportPhotoModel.countDocuments.mockResolvedValue(5);
      mockPassportPhotoModel.create.mockResolvedValue(mockPhoto);

      const result = await service.addPhotoFIFO(userId, s3Key);

      expect(mockPassportPhotoModel.countDocuments).toHaveBeenCalledWith({ user_id: userId });
      expect(mockPassportPhotoModel.create).toHaveBeenCalledWith({
        user_id: userId,
        s3_key: s3Key,
        is_locked: false,
      });
      expect(result).toEqual(mockPhoto);
    });

    it('should delete oldest unlocked photo when count is 10 or more', async () => {
      const userId = 1;
      const s3Key = 'users/1/photo11.jpg';
      const mockOldestPhoto = {
        _id: 'oldest_id',
        user_id: userId,
        s3_key: 'users/1/photo1.jpg',
        is_locked: false,
        created_at: new Date('2024-01-01'),
      };
      const mockNewPhoto = {
        user_id: userId,
        s3_key: s3Key,
        is_locked: false,
        created_at: new Date(),
      };

      mockPassportPhotoModel.countDocuments.mockResolvedValue(10);
      mockPassportPhotoModel.findOne.mockResolvedValue(mockOldestPhoto);
      mockPassportPhotoModel.create.mockResolvedValue(mockNewPhoto);
      mockPassportPhotoModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await service.addPhotoFIFO(userId, s3Key);

      expect(mockPassportPhotoModel.findOne).toHaveBeenCalledWith({
        user_id: userId,
        is_locked: false,
      });
      expect(mockPassportPhotoModel.deleteOne).toHaveBeenCalledWith({ _id: 'oldest_id' });
      expect(result).toEqual(mockNewPhoto);
    });

    it('should throw error when all photos are locked', async () => {
      const userId = 1;
      const s3Key = 'users/1/photo11.jpg';

      mockPassportPhotoModel.countDocuments.mockResolvedValue(10);
      mockPassportPhotoModel.findOne.mockResolvedValue(null);

      await expect(service.addPhotoFIFO(userId, s3Key)).rejects.toThrow(
        '모든 사진이 잠겨있어 새 사진을 추가할 수 없습니다'
      );
    });
  });

  describe('lockPhoto', () => {
    it('should lock photo successfully', async () => {
      const userId = 1;
      const s3Key = 'users/1/photo1.jpg';
      const mockPhoto = {
        user_id: userId,
        s3_key: s3Key,
        is_locked: false,
        save: jest.fn().mockResolvedValue(true),
      };

      mockPassportPhotoModel.findOne.mockResolvedValue(mockPhoto);

      await service.lockPhoto(userId, s3Key);

      expect(mockPhoto.is_locked).toBe(true);
      expect(mockPhoto.save).toHaveBeenCalled();
    });

    it('should throw error when photo not found', async () => {
      const userId = 1;
      const s3Key = 'users/1/photo1.jpg';

      mockPassportPhotoModel.findOne.mockResolvedValue(null);

      await expect(service.lockPhoto(userId, s3Key)).rejects.toThrow('사진을 찾을 수 없습니다');
    });

    it('should throw error when photo is already locked', async () => {
      const userId = 1;
      const s3Key = 'users/1/photo1.jpg';
      const mockPhoto = {
        user_id: userId,
        s3_key: s3Key,
        is_locked: true,
      };

      mockPassportPhotoModel.findOne.mockResolvedValue(mockPhoto);

      await expect(service.lockPhoto(userId, s3Key)).rejects.toThrow('이미 잠겨있는 사진입니다');
    });
  });

  describe('deletePhoto', () => {
    it('should delete unlocked photo successfully', async () => {
      const userId = 1;
      const s3Key = 'users/1/photo1.jpg';
      const mockPhoto = {
        _id: 'photo_id',
        user_id: userId,
        s3_key: s3Key,
        is_locked: false,
      };

      mockPassportPhotoModel.findOne.mockResolvedValue(mockPhoto);
      mockPassportPhotoModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await service.deletePhoto(userId, s3Key);

      expect(mockPassportPhotoModel.deleteOne).toHaveBeenCalledWith({ _id: 'photo_id' });
    });

    it('should throw error when trying to delete locked photo', async () => {
      const userId = 1;
      const s3Key = 'users/1/photo1.jpg';
      const mockPhoto = {
        user_id: userId,
        s3_key: s3Key,
        is_locked: true,
      };

      mockPassportPhotoModel.findOne.mockResolvedValue(mockPhoto);

      await expect(service.deletePhoto(userId, s3Key)).rejects.toThrow(
        '잠겨있는 사진은 삭제할 수 없습니다'
      );
    });
  });
});

