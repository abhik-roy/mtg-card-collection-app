import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MarketplaceService } from './marketplace.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListingsQueryDto } from './dto/listings-query.dto';
import { CollectionIdParamDto } from '../collection/rest/dto/update-entry.dto';

@UseGuards(JwtAuthGuard)
@Controller('marketplace/listings')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateListingDto,
  ) {
    return this.marketplaceService.createListing(user.id, payload);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListingsQueryDto,
  ) {
    return this.marketplaceService.listListings({
      userId: user.id,
      type: query.type,
      search: query.search,
      setCode: query.setCode,
      mine: query.mine,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CollectionIdParamDto,
  ) {
    return this.marketplaceService.removeListing(user.id, params.id);
  }
}
