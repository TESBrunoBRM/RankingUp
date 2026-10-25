import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProfilePrivacyDto } from './update-profile-privacy.dto';
import { UpdateSocialProfileDto } from './update-social-profile.dto';

describe('Profile visibility validation with production implicit conversion', () => {
  it.each([true, false])('accepts the JSON boolean %s unchanged', async (isPublic) => {
    const dto = plainToInstance(UpdateProfilePrivacyDto, { isPublic }, { enableImplicitConversion: true });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.isPublic).toBe(isPublic);
  });

  it.each(['false', 'true', 0, 1, null, undefined])('rejects non-boolean %s instead of accidentally publishing a profile', async (isPublic) => {
    const dto = plainToInstance(UpdateProfilePrivacyDto, { isPublic }, { enableImplicitConversion: true });
    expect((await validate(dto)).some(error => error.property === 'isPublic')).toBe(true);
  });

  it('also rejects string booleans on the compatible social endpoint', async () => {
    const dto = plainToInstance(UpdateSocialProfileDto, { name: 'Bruno', username: 'bruno', isPublic: 'false' }, { enableImplicitConversion: true });
    expect((await validate(dto)).some(error => error.property === 'isPublic')).toBe(true);
  });
});
