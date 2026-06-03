import {
    Body,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@core/auth/jwt-auth.guard';
import { ChatService, ChatStreamEvent } from './chat.service';
import { AskChatDto } from './dto/ask-chat.dto';
import { ListConversationsQueryDto } from './dto/list-conversations-query.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

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

    @Get('conversations')
    listConversations(
        @Req() req: Request & { user: { userId: string } },
        @Query() query: ListConversationsQueryDto,
    ) {
        return this.chatService.listConversations(req.user.userId, {
            archived: query.archived,
            limit: query.limit,
            offset: query.offset,
        });
    }

    @Patch('conversations/:id')
    async updateConversation(
        @Req() req: Request & { user: { userId: string } },
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: UpdateConversationDto,
    ) {
        const result = await this.chatService.updateConversation(id, req.user.userId, dto);
        if (!result.found) {
            throw new NotFoundException(`Conversa ${id} não encontrada.`);
        }
        return { success: true };
    }

    @Delete('conversations/:id')
    async deleteConversation(
        @Req() req: Request & { user: { userId: string } },
        @Param('id', new ParseUUIDPipe()) id: string,
    ) {
        const result = await this.chatService.deleteConversation(id, req.user.userId);
        if (!result.found) {
            throw new NotFoundException(`Conversa ${id} não encontrada.`);
        }
        return { success: true };
    }

    @Get('conversations/:id/messages')
    listMessages(
        @Req() req: Request & { user: { userId: string } },
        @Param('id', new ParseUUIDPipe()) id: string,
    ) {
        return this.chatService.listMessages(id, req.user.userId);
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
