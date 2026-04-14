import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignTicketDto {
  @IsUUID()
  @IsNotEmpty()
  assigned_user_id!: string;
}
