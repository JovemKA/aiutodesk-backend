import { TicketStatus } from '@common/enums/ticket-status.enum';
import { IsEnum } from 'class-validator';

export class UpdateStatusDto {
  @IsEnum(TicketStatus)
  status!: TicketStatus;
}
