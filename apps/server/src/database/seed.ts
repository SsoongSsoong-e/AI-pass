import { AppDataSource } from './data-source';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/user-role.enum';

async function seed() {
    const dataSource = await AppDataSource.initialize();
    const userRepository = dataSource.getRepository(User);

    // 환경 변수에서 Admin 이메일 목록 가져오기 (쉼표로 구분)
    const adminEmailsEnv = process.env.ADMIN_EMAILS || '';
    const adminEmails = adminEmailsEnv
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);

    if (adminEmails.length === 0) {
        // eslint-disable-next-line no-console
        console.log('No admin emails configured. Skipping admin user seeding.');
        await dataSource.destroy();
        return;
    }

    // 각 Admin 이메일에 대해 유저 생성 또는 업데이트
    for (const adminEmail of adminEmails) {
        const existingUser = await userRepository.findOne({ 
            where: { email: adminEmail } 
        });

        if (existingUser) {
            // 이미 존재하는 경우, Admin 역할로 업데이트
            if (existingUser.role !== UserRole.ADMIN) {
                existingUser.role = UserRole.ADMIN;
                await userRepository.save(existingUser);
                // eslint-disable-next-line no-console
                console.log(`Updated user to admin: ${adminEmail}`);
            } else {
                // eslint-disable-next-line no-console
                console.log(`Admin user already exists: ${adminEmail}`);
            }
        } else {
            // 존재하지 않는 경우, 새 Admin 유저 생성
            // 이메일에서 username 추출 (예: h.offthatmuz@gmail.com -> h.offthatmuz)
            const username = adminEmail.split('@')[0];
            
            const admin = userRepository.create({
                email: adminEmail,
                username: username,
                role: UserRole.ADMIN,
                profile_picture: null,
            });
            await userRepository.save(admin);
            // eslint-disable-next-line no-console
            console.log(`Seeded admin user: ${adminEmail}`);
        }
    }

    await dataSource.destroy();
}

seed().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Seeding failed', error);
    process.exit(1);
});

