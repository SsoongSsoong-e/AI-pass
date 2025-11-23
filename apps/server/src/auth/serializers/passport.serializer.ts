import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Session Serializer
 * 
 * 세션에 저장할 정보와 복원할 정보를 관리
 * 
 * serializeUser: 로그인 시 세션에 저장할 정보 결정 (user.id만 저장)
 * deserializeUser: API 요청 시 세션에서 사용자 정보 복원
 */
@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super();
  }

  /**
   * 로그인 시 세션에 저장할 정보 결정
   *
   * @param user User 엔티티 객체
   * @param done 콜백 함수
   *
   * 세션에는 user.id만 저장 (최소 정보만 저장)
   * - 세션 데이터 최소화 (메모리 절약)
   * - 사용자 정보 변경 시 세션 업데이트 불필요
   * - 필요할 때 DB에서 최신 정보 조회
   */
  serializeUser(user: User, done: (err: Error, user: number) => void): void {
    console.log('💾 [SessionSerializer] serializeUser 호출, user.id:', user.id, 'user.email:', user.email);
    done(null, user.id);
  }

  /**
   * API 요청 시 세션에서 사용자 정보 복원
   *
   * @param id 세션에 저장된 user.id
   * @param done 콜백 함수
   *
   * 세션에서 user.id를 추출하여 DB에서 최신 User 정보 조회
   * 조회한 User 객체를 req.user에 저장
   */
  async deserializeUser(
    id: number,
    done: (err: Error, user: User | null) => void,
  ): Promise<void> {
    try {
      console.log('🔍 [SessionSerializer] deserializeUser 호출, id:', id);
      const user = await this.userRepository.findOne({
        where: { id },
      });

      if (!user) {
        console.error('❌ [SessionSerializer] User not found, id:', id);
        return done(new Error('User not found'), null);
      }

      console.log('✅ [SessionSerializer] User 복원 성공:', user.email);
      // req.user에 User 객체 저장
      done(null, user);
    } catch (error) {
      console.error('❌ [SessionSerializer] deserializeUser 에러:', error);
      done(error, null);
    }
  }
}

