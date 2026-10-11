// Raíz de un agregado: la única entidad por la que se modifica el agregado desde afuera.
// Tiene identidad propia (id), a diferencia de un value object.
export abstract class AggregateRoot {
  protected constructor(readonly id: string) {}
}
