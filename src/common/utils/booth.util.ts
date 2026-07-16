import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Vendor } from '../../entities/vendor.entity';

export async function assertUniqueBooth(
  vendorRepository: Repository<Vendor>,
  eventId: string,
  boothNumber?: string | null,
  excludeVendorId?: string,
) {
  const normalized = boothNumber?.trim();
  if (!normalized) return;

  const qb = vendorRepository
    .createQueryBuilder('vendor')
    .where('vendor.event_id = :eventId', { eventId })
    .andWhere('vendor.is_active = :isActive', { isActive: true })
    .andWhere('LOWER(TRIM(vendor.booth_number)) = LOWER(:booth)', {
      booth: normalized,
    });

  if (excludeVendorId) {
    qb.andWhere('vendor.id != :excludeVendorId', { excludeVendorId });
  }

  const conflict = await qb.getOne();
  if (conflict) {
    throw new ConflictException(
      `Booth ${normalized} is already assigned to ${conflict.name}`,
    );
  }
}
