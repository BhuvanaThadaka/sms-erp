import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AcademicReportsService } from './academic-reports.service';
import { GenerateAcademicReportDto, BulkGenerateReportDto } from './dto/academic-report.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/public.decorator';
import { Role } from '../common/enums';

@Controller('academic-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademicReportsController {
  constructor(private readonly academicReportsService: AcademicReportsService) {}

  @Post('generate')
  @Roles(Role.ADMIN, Role.TEACHER)
  generate(@Body() dto: GenerateAcademicReportDto, @CurrentUser('userId') userId: string) {
    return this.academicReportsService.generate(dto, userId);
  }

  @Post('bulk-generate')
  @Roles(Role.ADMIN, Role.TEACHER)
  bulkGenerate(@Body() dto: BulkGenerateReportDto, @CurrentUser('userId') userId: string) {
    return this.academicReportsService.bulkGenerate(dto, userId);
  }

  @Get()
  findAll(
    @Query('classId') classId: string,
    @Query('studentId') studentId: string,
    @Query('quarter') quarter: string,
    @Query('academicYear') academicYear: string,
    @CurrentUser() user: any,
  ) {
    return this.academicReportsService.findAll({
      classId, studentId, quarter, academicYear,
      requestingUser: { userId: user.userId, role: user.role },
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.academicReportsService.findById(id);
  }
}
