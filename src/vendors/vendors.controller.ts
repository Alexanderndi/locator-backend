import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { VendorsService } from './vendors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { UserRole } from '../common/enums';
import {
  VendorSearchQueryDto,
  NearbyQueryDto,
  CreateReviewDto,
  UpdateReviewDto,
  EventVendorsQueryDto,
  ProductsQueryDto,
  ReviewsQueryDto,
} from './dto/vendor.dto';

@Controller()
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get('events/:eventId/vendors')
  listByEvent(
    @Param('eventId') eventId: string,
    @Query() query: EventVendorsQueryDto,
  ) {
    return this.vendorsService.listByEvent(eventId, query.page, query.pageSize);
  }

  @Get('events/:eventId/vendors/search')
  search(
    @Param('eventId') eventId: string,
    @Query() query: VendorSearchQueryDto,
  ) {
    return this.vendorsService.search(
      eventId,
      query.q,
      query.category,
      query.offers,
      query.page,
      query.pageSize,
    );
  }

  @Get('events/:eventId/vendors/nearby')
  nearby(@Param('eventId') eventId: string, @Query() query: NearbyQueryDto) {
    return this.vendorsService.nearby(
      eventId,
      query.lat,
      query.lng,
      query.radius,
    );
  }

  @Get('events/:eventId/vendors/recommended')
  @UseGuards(OptionalJwtAuthGuard)
  recommended(@Param('eventId') eventId: string, @CurrentUser() user?: User) {
    return this.vendorsService.recommended(eventId, user ?? undefined);
  }

  @Get('vendors/me/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  listMyProducts(@CurrentUser() user: User, @Query() query: ProductsQueryDto) {
    return this.vendorsService.listMyCatalogue(
      user,
      query.page,
      query.pageSize,
    );
  }

  @Post('vendors/me/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  createMyProduct(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name?: string,
  ) {
    return this.vendorsService.createCatalogueItem(user, file, name);
  }

  @Delete('vendors/me/products/:productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  deleteMyProduct(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
  ) {
    return this.vendorsService.deleteCatalogueItem(user, productId);
  }

  @Get('vendors/:vendorId')
  findOne(@Param('vendorId') vendorId: string) {
    return this.vendorsService.findOne(vendorId);
  }

  @Get('vendors/:vendorId/products')
  getProducts(
    @Param('vendorId') vendorId: string,
    @Query() query: ProductsQueryDto,
  ) {
    return this.vendorsService.getProducts(
      vendorId,
      query.page,
      query.pageSize,
    );
  }

  @Get('vendors/:vendorId/promotions')
  getPromotions(@Param('vendorId') vendorId: string) {
    return this.vendorsService.getPromotions(vendorId);
  }

  @Get('vendors/:vendorId/reviews')
  @UseGuards(OptionalJwtAuthGuard)
  getReviews(
    @Param('vendorId') vendorId: string,
    @Query() query: ReviewsQueryDto,
    @CurrentUser() user?: User,
  ) {
    return this.vendorsService.getReviews(
      vendorId,
      query.page,
      query.pageSize,
      user ?? undefined,
    );
  }

  @Post('vendors/:vendorId/reviews')
  @UseGuards(JwtAuthGuard)
  createReview(
    @Param('vendorId') vendorId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateReviewDto,
  ) {
    return this.vendorsService.createReview(vendorId, user, dto);
  }

  @Patch('vendors/:vendorId/reviews')
  @UseGuards(JwtAuthGuard)
  updateReview(
    @Param('vendorId') vendorId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.vendorsService.updateReview(vendorId, user, dto);
  }
}
