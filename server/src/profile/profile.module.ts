import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { CloudinaryService } from '../common/infrastructure/media/cloudinary.service';

@Module({
  imports: [AuthModule],
  controllers: [ProfileController],
  providers: [ProfileService,CloudinaryService],
})
export class ProfileModule {}
