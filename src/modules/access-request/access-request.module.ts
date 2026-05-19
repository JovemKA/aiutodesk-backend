import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@modules/user/entities/user.entity';
import { AccessRequest } from './entities/access-request.entity';
import { AccessRequestController } from './access-request.controller';
import { AccessRequestService } from './access-request.service';

@Module({
    imports: [TypeOrmModule.forFeature([AccessRequest, User])],
    controllers: [AccessRequestController],
    providers: [AccessRequestService],
    exports: [AccessRequestService],
})
export class AccessRequestModule {}
