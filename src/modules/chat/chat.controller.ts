import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@core/auth/jwt-auth.guard';
import { ChatService } from './chat.service';
import { AskChatDto } from './dto/ask-chat.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Post('ask')
    ask(@Body() dto: AskChatDto) {
        return this.chatService.ask(dto.message);
    }
}
