import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { AcademicStructureService } from './academic-structure.service';
import { CreateAcademicStructureDto, UpdateAcademicStructureDto } from './dto/academic-structure.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { CurrentUser } from '../common/decorators/public.decorator';

@Controller('academic-structure')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademicStructureController {
  constructor(private readonly service: AcademicStructureService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateAcademicStructureDto, @CurrentUser('userId') userId: string) {
    return this.service.create(dto, userId);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAcademicStructureDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.service.update(id, dto, userId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
