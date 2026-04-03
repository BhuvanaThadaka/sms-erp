import { Controller, Get, Post, Body, Param, Query, UseGuards, ForbiddenException, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { GenerateReportDto, BulkGenerateReportDto } from './dto/report.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public, CurrentUser } from '../common/decorators/public.decorator';
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

  @Public()
  @Get(':id/pdf')
  async generatePdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.reportsService.generatePdf(id);
    this.sendPdfResponse(res, buffer, id);
  }

  @Public()
  @Get(':studentId/:quarter/:academicYear/pdf')
  async generatePdfLegacy(
    @Param('studentId') studentId: string,
    @Param('quarter') quarter: string,
    @Param('academicYear') academicYear: string,
    @Res() res: Response,
  ) {
    const report = await this.reportsService.findByComposite(studentId, quarter, academicYear);
    const buffer = await this.reportsService.generatePdf(report._id.toString());
    this.sendPdfResponse(res, buffer, report._id.toString());
  }

  private sendPdfResponse(res: Response, buffer: Buffer, id: string) {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=report-${id}.pdf`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
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
