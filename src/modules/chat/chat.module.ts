import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '@modules/article/entities/article.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
    imports: [TypeOrmModule.forFeature([Article])],
    controllers: [ChatController],
    providers: [ChatService],
})
export class ChatModule {}
