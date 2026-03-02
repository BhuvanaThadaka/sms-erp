import { Controller, Get, Post, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { GenerateReportDto, BulkGenerateReportDto } from './dto/report.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/public.decorator';
import { Role } from '../common/enums';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate')
  @Roles(Role.ADMIN, Role.TEACHER)
  generate(@Body() dto: GenerateReportDto, @CurrentUser('userId') userId: string) {
    return this.reportsService.generateReport(dto, userId);
  }

  @Post('bulk-generate')
  @Roles(Role.ADMIN, Role.TEACHER)
  bulkGenerate(@Body() dto: BulkGenerateReportDto, @CurrentUser('userId') userId: string) {
    return this.reportsService.bulkGenerate(dto, userId);
  }

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('studentId') studentId?: string,
    @Query('classId') classId?: string,
    @Query('quarter') quarter?: string,
    @Query('academicYear') academicYear?: string,
  ) {
    if (user.role === Role.STUDENT) {
      studentId = user.userId;
    }
    return this.reportsService.findReports(studentId, classId, quarter, academicYear);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const report = await this.reportsService.findById(id);
    if (user.role === Role.STUDENT && report.studentId.toString() !== user.userId) {
      throw new ForbiddenException('Access denied');
    }
    return report;
  }
}
