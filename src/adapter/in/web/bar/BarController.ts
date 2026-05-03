import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BarFacade } from '../../../../application/facade/BarFacade';
import { ZodValidationPipe } from '../../../../infrastructure/zod-validation.pipe';
import { JwtAuthGuard } from '../guard/JwtAuthGuard';
import { RolesGuard } from '../guard/RolesGuard';
import { Public } from '../decorator/public.decorator';
import { Roles } from '../decorator/roles.decorator';
import { RoleName } from '../../../../domain/value-object/Role';

import { ListBarsRequest, listBarsSchema } from './dto/ListBarsRequest';
import { CreateBarRequest, createBarSchema } from './dto/CreateBarRequest';
import { UpdateBarRequest, updateBarSchema } from './dto/UpdateBarRequest';
import { BarResponse } from './dto/BarResponse';
import { BarListResponse } from './dto/BarListResponse';
import { AiDescribeResponse } from './dto/AiDescribeResponse';

@Controller('bars')
@UseGuards(JwtAuthGuard)
export class BarController {
  constructor(private readonly barFacade: BarFacade) {}

  @Get()
  @Public()
  listBars(
    @Query(new ZodValidationPipe(listBarsSchema)) query: ListBarsRequest,
  ): Promise<BarListResponse> {
    return this.barFacade.listBars({
      page: query.page,
      limit: query.limit,
      keyword: query.keyword,
      tags: query.tags,
    });
  }

  @Get(':id')
  @Public()
  getBar(@Param('id') id: string): Promise<BarResponse> {
    return this.barFacade.getBar({ barId: id });
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  createBar(
    @Body(new ZodValidationPipe(createBarSchema)) dto: CreateBarRequest,
  ): Promise<BarResponse> {
    return this.barFacade.createBar(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  updateBar(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateBarSchema)) dto: UpdateBarRequest,
  ): Promise<BarResponse> {
    return this.barFacade.updateBar({ barId: id, ...dto });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  deleteBar(@Param('id') id: string): Promise<void> {
    return this.barFacade.deleteBar({ barId: id });
  }

  @Post(':id/describe')
  @HttpCode(HttpStatus.OK)
  aiDescribeBar(@Param('id') id: string): Promise<AiDescribeResponse> {
    return this.barFacade.aiDescribeBar({ barId: id });
  }
}
