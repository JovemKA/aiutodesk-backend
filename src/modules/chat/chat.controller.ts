import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '@core/auth/jwt-auth.guard';
import { ChatService } from './chat.service';
import { AskChatDto } from './dto/ask-chat.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Post('ask')
    ask(
        @Req() req: Request & { user: { userId: string } },
        @Body() dto: AskChatDto,
    ) {
        return this.chatService.ask({
            message: dto.message,
            conversationId: dto.conversationId,
            requesterId: req.user.userId,
        });
    }
}
