import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarksService } from './marks.service';
import { MarksController } from './marks.controller';
import { Marks, MarksSchema } from './schemas/marks.schema';
import { SubjectsModule } from '../subjects/subjects.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Marks.name, schema: MarksSchema }]),
    SubjectsModule,
    AuditLogsModule,
  ],
  controllers: [MarksController],
  providers: [MarksService],
  exports: [MarksService],
})
export class MarksModule {}
