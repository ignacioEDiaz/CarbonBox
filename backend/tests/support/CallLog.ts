// Registro compartido por los dobles, para verificar en qué orden se llamaron
export class CallLog {
  readonly calls: string[] = [];

  record(call: string): void {
    this.calls.push(call);
  }
}
