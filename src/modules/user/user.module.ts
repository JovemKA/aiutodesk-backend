import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserDepartment } from './entities/user-department.entity';
import { AccessRequest } from '@modules/access-request/entities/access-request.entity';
import { Ticket } from '@modules/ticket/entities/ticket.entity';
import { Article } from '@modules/article/entities/article.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
    imports: [TypeOrmModule.forFeature([User, UserDepartment, AccessRequest, Ticket, Article])],
    controllers: [UserController],
    providers: [UserService],
    exports: [UserService],
})
export class UserModule {}
