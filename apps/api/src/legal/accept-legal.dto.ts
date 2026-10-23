import { ApiProperty } from '@nestjs/swagger';
import { Equals } from 'class-validator';

export const DOCUMENT_VERSION = '2026-10-23';

export class AcceptLegalDto {
  @ApiProperty({ example: DOCUMENT_VERSION })
  @Equals(DOCUMENT_VERSION, { message: 'Los términos cambiaron. Actualiza la aplicación y revisa la versión vigente.' })
  documentVersion!: string;
}
