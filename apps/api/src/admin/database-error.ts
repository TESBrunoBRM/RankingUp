import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

export function databaseError(error: {
  code?: string;
  message?: string;
}): never {
  if (error.code === "23505")
    throw new ConflictException(
      "Ya existe un envío abierto o un alimento aprobado con ese código de barras. Actualiza la bandeja.",
    );
  if (error.code === "PT409" || error.code === "40001")
    throw new ConflictException(
      error.message ?? "El registro cambió. Actualiza el detalle.",
    );
  if (error.code === "P0002")
    throw new NotFoundException(error.message ?? "Registro no encontrado.");
  if (error.code === "42501")
    throw new ForbiddenException(
      "No tienes permiso para realizar esta acción.",
    );
  if (["22023", "23514", "23502", "22P02"].includes(error.code ?? ""))
    throw new BadRequestException(
      "Revisa los datos y escribe una respuesta para el usuario antes de resolver.",
    );
  throw new InternalServerErrorException(
    "No se pudo completar la operación. Inténtalo nuevamente.",
  );
}
