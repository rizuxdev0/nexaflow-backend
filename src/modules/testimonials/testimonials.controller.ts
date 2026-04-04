import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { TestimonialsService } from './testimonials.service';
import { CreateTestimonialDto, UpdateTestimonialDto } from './dto/testimonial.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('testimonials')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  @Public() // Accessible without login for the e-commerce home page
  @Get('active')
  findAllActive() {
    return this.testimonialsService.findAllActive();
  }

  @Permissions('settings.read') // Adjust permission as needed
  @Get()
  findAll() {
    return this.testimonialsService.findAll();
  }

  @Permissions('settings.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.testimonialsService.findOne(id);
  }

  @Public() // Allow customers to leave reviews from e-commerce storefront
  @Post()
  create(@Body() createTestimonialDto: CreateTestimonialDto) {
    // For public submissions, we force isActive to false for moderation
    const testimonialData = { ...createTestimonialDto, isActive: false };
    return this.testimonialsService.create(testimonialData);
  }

  @Permissions('settings.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTestimonialDto: UpdateTestimonialDto,
  ) {
    return this.testimonialsService.update(id, updateTestimonialDto);
  }

  @Permissions('settings.update')
  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.testimonialsService.toggleActive(id);
  }

  @Permissions('settings.update')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.testimonialsService.remove(id);
  }
}
