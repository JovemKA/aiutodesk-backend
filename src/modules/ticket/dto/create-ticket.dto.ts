import { TicketPriority } from '@common/enums/ticket-priority.enum';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty({ message: 'O título é obrigatório.' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'A descrição é obrigatória.' })
  description!: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @IsUUID()
  department_id?: string;
}
