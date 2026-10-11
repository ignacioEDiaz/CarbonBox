// Un value object no tiene identidad: dos con el mismo valor son el mismo.
// Es inmutable: para "cambiarlo" se crea otro.
export abstract class ValueObject<T> {
  protected constructor(readonly value: T) {}

  equals(other: ValueObject<T>): boolean {
    return this.value === other.value;
  }
}
