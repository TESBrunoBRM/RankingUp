import { ValidationPipe } from '@nestjs/common';
import { AcceptLegalDto, DOCUMENT_VERSION } from './accept-legal.dto';
import { LegalController } from './legal.controller';
import { SupabaseService } from '../supabase/supabase.service';

describe('legal acceptance', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  it.each([{}, { documentVersion: '2026-10-02' }, { documentVersion: DOCUMENT_VERSION, user_id: 'other' }])('rejects stale or forged acceptance: %j', async body => {
    await expect(pipe.transform(body, { type: 'body', metatype: AcceptLegalDto })).rejects.toThrow();
  });

  it('records the version actually shown and the authenticated account', async () => {
    const dto = await pipe.transform({ documentVersion: DOCUMENT_VERSION }, { type: 'body', metatype: AcceptLegalDto });
    const query = { upsert: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { accepted_at: 'now' }, error: null }) };
    const controller = new LegalController({ serviceClient: { from: () => query } } as unknown as SupabaseService);
    await controller.accept({ id: 'signed-in', email: null, role: null }, dto);
    expect(query.upsert).toHaveBeenCalledWith({ user_id: 'signed-in', document_version: DOCUMENT_VERSION }, { onConflict: 'user_id,document_version' });
  });
});
