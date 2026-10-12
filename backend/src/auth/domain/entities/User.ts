import { randomUUID } from "node:crypto";
import { AggregateRoot } from "../../../shared/domain/AggregateRoot";
import { Email } from "../value-objects/Email";

export type UserProps = {
  id: string;
  email: Email;
  passwordHash: string; // nunca la contraseña: el hash con su sal (lo arma IPasswordHasher)
  createdAt: Date;
};

export class User extends AggregateRoot {
  private constructor(private readonly props: UserProps) {
    super(props.id);
  }

  static create({ email, passwordHash }: { email: Email; passwordHash: string }): User {
    return new User({ id: randomUUID(), email, passwordHash, createdAt: new Date() });
  }

  static restore(props: UserProps): User {
    return new User(props);
  }

  get email(): Email {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
