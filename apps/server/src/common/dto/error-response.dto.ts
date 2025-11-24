import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 표준 에러 응답 DTO
 * 
 * 모든 API 에러 응답이 이 형식을 따릅니다.
 * NestJS의 HttpException이 반환하는 표준 에러 형식입니다.
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: '에러 메시지',
    example: '이미지 파일이 필요합니다.',
  })
  message: string;

  @ApiPropertyOptional({
    description: '에러 코드 (선택적)',
    example: 'Bad Request',
  })
  error?: string;

  @ApiProperty({
    description: 'HTTP 상태 코드',
    example: 400,
  })
  statusCode: number;
}

