import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AcademicStructure, AcademicStructureSchema } from './schemas/academic-structure.schema';
import { AcademicStructureService } from './academic-structure.service';
import { AcademicStructureController } from './academic-structure.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AcademicStructure.name, schema: AcademicStructureSchema }]),
    AuditLogsModule,
  ],
  providers: [AcademicStructureService],
  controllers: [AcademicStructureController],
  exports: [AcademicStructureService],
})
export class AcademicStructureModule {}
