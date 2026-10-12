// Iniciar sesión es una query: verifica credenciales y firma un token, pero no escribe nada
export class LoginQuery {
  constructor(
    readonly email: string,
    readonly password: string,
  ) {}
}
