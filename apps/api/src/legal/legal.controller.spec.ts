import { ValidationPipe } from '@nestjs/common';
import { AcceptLegalDto, DOCUMENT_VERSION, LEGACY_DOCUMENT_VERSION, LegalVersionQuery } from './accept-legal.dto';
import { LegalController } from './legal.controller';
import { SupabaseService } from '../supabase/supabase.service';

describe('legal acceptance', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  it.each([{}, { documentVersion: '2026-10-02' }, { documentVersion: DOCUMENT_VERSION, user_id: 'other' }])('rejects unsupported or forged acceptance: %j', async body => {
    await expect(pipe.transform(body, { type: 'body', metatype: AcceptLegalDto })).rejects.toThrow();
  });

  it.each([LEGACY_DOCUMENT_VERSION, DOCUMENT_VERSION])('checks the exact text version without carrying consent across versions: %s', async version => {
    const query = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) };
    const controller = new LegalController({ serviceClient: { from: () => query } } as unknown as SupabaseService);
    const response = await controller.current({ id: 'signed-in', email: null, role: null }, await pipe.transform({ documentVersion: version }, { type: 'query', metatype: LegalVersionQuery }));
    expect(query.eq).toHaveBeenCalledWith('document_version', version);
    expect(response).toEqual({ version, accepted: false, acceptedAt: null });
  });
  it('keeps old APK queries on their original document and rejects unknown query versions', async () => {
    const query = await pipe.transform({}, { type: 'query', metatype: LegalVersionQuery });
    expect(query.documentVersion).toBe(LEGACY_DOCUMENT_VERSION);
    await expect(pipe.transform({ documentVersion: 'future' }, { type: 'query', metatype: LegalVersionQuery })).rejects.toThrow();
  });
  it('records old-client acceptance as old text, never as current acceptance', async () => {
    const query = { upsert: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { accepted_at: 'now' }, error: null }) };
    const controller = new LegalController({ serviceClient: { from: () => query } } as unknown as SupabaseService);
    const dto = await pipe.transform({ documentVersion: LEGACY_DOCUMENT_VERSION }, { type: 'body', metatype: AcceptLegalDto });
    expect((await controller.accept({ id: 'signed-in', email: null, role: null }, dto)).version).toBe(LEGACY_DOCUMENT_VERSION);
    expect(query.upsert).toHaveBeenCalledWith({ user_id: 'signed-in', document_version: LEGACY_DOCUMENT_VERSION }, { onConflict: 'user_id,document_version' });
  });

  it('records the version actually shown and the authenticated account', async () => {
    const dto = await pipe.transform({ documentVersion: DOCUMENT_VERSION }, { type: 'body', metatype: AcceptLegalDto });
    const query = { upsert: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { accepted_at: 'now' }, error: null }) };
    const controller = new LegalController({ serviceClient: { from: () => query } } as unknown as SupabaseService);
    await controller.accept({ id: 'signed-in', email: null, role: null }, dto);
    expect(query.upsert).toHaveBeenCalledWith({ user_id: 'signed-in', document_version: DOCUMENT_VERSION }, { onConflict: 'user_id,document_version' });
  });
});
