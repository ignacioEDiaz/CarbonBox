// page y limit llegan como texto (o no llegan) desde la query string: los valida el handler
export class ListUploadsQuery {
  constructor(
    readonly userId: string,
    readonly page: string | undefined,
    readonly limit: string | undefined,
  ) {}
}
