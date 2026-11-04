import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const DOCUMENT_VERSION = '2026-11-04';
// Transitional compatibility for APK 1.4.0, which displays the preceding text.
// Never record acceptance of newer text for an older client.
export const LEGACY_DOCUMENT_VERSION = '2026-10-23';
export const SUPPORTED_DOCUMENT_VERSIONS = [DOCUMENT_VERSION, LEGACY_DOCUMENT_VERSION];

export class LegalVersionQuery {
  @IsIn(SUPPORTED_DOCUMENT_VERSIONS)
  documentVersion: string = LEGACY_DOCUMENT_VERSION;
}

export class AcceptLegalDto {
  @ApiProperty({ example: DOCUMENT_VERSION })
  @IsIn(SUPPORTED_DOCUMENT_VERSIONS, { message: 'Los términos cambiaron. Actualiza la aplicación y revisa la versión vigente.' })
  documentVersion!: string;
}
