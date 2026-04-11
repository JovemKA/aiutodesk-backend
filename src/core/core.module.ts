import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HashService } from './services/hash.service';

@Global()
@Module({
    imports: [DatabaseModule],
    providers: [HashService],
    exports: [HashService],
})
export class CoreModule {}
