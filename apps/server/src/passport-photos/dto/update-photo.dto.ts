import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * UpdatePhotoDto
 *
 * 사진 수정을 위한 DTO (PATCH 메서드용)
 * - is_locked: 사진 잠금 상태 (선택 필드)
 */
export class UpdatePhotoDto {
    @ApiProperty({
    description: '사진 잠금 상태',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_locked?: boolean;
}

