import { Body, Controller, Post, Res, UseGuards, Req } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@core/auth/jwt-auth.guard';
import { ChatService, ChatStreamEvent } from './chat.service';
import { AskChatDto } from './dto/ask-chat.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
@Throttle({ chat: { limit: 30, ttl: 60_000 } })
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Post('ask')
    ask(
        @Req() req: Request & { user: { userId: string; name?: string } },
        @Body() dto: AskChatDto,
    ) {
        return this.chatService.ask({
            message: dto.message,
            conversationId: dto.conversationId,
            requesterId: req.user.userId,
            userName: req.user.name,
        });
    }

    @Post('stream')
    async stream(
        @Req() req: Request & { user: { userId: string; name?: string } },
        @Body() dto: AskChatDto,
        @Res() res: Response,
    ): Promise<void> {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders?.();
        res.socket?.setNoDelay(true);
        res.socket?.setKeepAlive(true);

        const abortController = new AbortController();
        const onClose = () => abortController.abort();
        req.on('close', onClose);

        const writeEvent = (event: ChatStreamEvent) => {
            if (res.writableEnded) {
                return;
            }
            res.write(`event: ${event.type}\n`);
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        };

        try {
            await this.chatService.streamAsk(
                {
                    message: dto.message,
                    conversationId: dto.conversationId,
                    requesterId: req.user.userId,
                    userName: req.user.name,
                },
                writeEvent,
                abortController.signal,
            );
        } catch (error) {
            writeEvent({
                type: 'error',
                message: (error as Error).message ?? 'Erro inesperado no chat',
            });
        } finally {
            req.off('close', onClose);
            if (!res.writableEnded) {
                res.end();
            }
        }
    }
}
