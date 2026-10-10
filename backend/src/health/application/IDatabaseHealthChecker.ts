// Lo que la aplicación necesita saber de la base. La implementación vive en infrastructure.
export interface IDatabaseHealthChecker {
  isUp(): Promise<boolean>;
}
