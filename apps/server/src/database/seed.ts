import { AppDataSource } from './data-source';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/user-role.enum';

async function seed() {
    const dataSource = await AppDataSource.initialize();
    const userRepository = dataSource.getRepository(User);

    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';

    const exists = await userRepository.findOne({ where: { email: adminEmail } });

    if (!exists) {
        const admin = userRepository.create({
            email: adminEmail,
            username: process.env.SEED_ADMIN_USERNAME || 'admin',
            role: UserRole.ADMIN,
            profile_picture: null,
        });
        await userRepository.save(admin);
        // eslint-disable-next-line no-console
        console.log(`Seeded admin user: ${adminEmail}`);
    } else {
        // eslint-disable-next-line no-console
        console.log(`Admin user already exists: ${adminEmail}`);
    }

    await dataSource.destroy();
}

seed().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Seeding failed', error);
    process.exit(1);
});

