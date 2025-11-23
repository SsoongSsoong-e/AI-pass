import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    Length,
} from 'class-validator';
import { UserRole } from '../user-role.enum';

export class CreateUserDto {
    @ApiProperty({
        example: 'user@example.com',
        description: '로그인에 사용되는 고유 이메일 주소',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        example: 'passport_maker',
        description: '2~50자 범위의 사용자 표시 이름',
        minLength: 2,
        maxLength: 50,
    })
    @IsString()
    @Length(2, 50)
    username: string;

    @ApiPropertyOptional({
        example: 'https://ecdn.xample.com/image.png',
        description: '선택적 프로필 이미지 URL',
    })
    @IsOptional()
    @IsUrl()
    profilePicture?: string;

    @ApiPropertyOptional({
        enum: UserRole,
        enumName: 'UserRole',
        default: UserRole.USER,
        description: '사용자 권한. 별도 지정이 없으면 사용자로 생성',
        example: UserRole.USER,
    })
    @IsOptional()
    @IsEnum(UserRole, {
        message: 'role must be one of: user, admin',
    })
    role?: UserRole;
}