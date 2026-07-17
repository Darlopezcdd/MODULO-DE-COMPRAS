import { TextEncoder, TextDecoder } from 'util';

(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

jest.mock('jose', () => ({
  SignJWT: class {
    setProtectedHeader() { return this; }
    setIssuedAt() { return this; }
    setExpirationTime() { return this; }
    async sign() { return 'token'; }
  }
}));

const { getUserFromRequest, verifyToken } = require('../src/lib/authUtils');

describe('authUtils permisos de sesión', () => {
  it('devuelve el permiso de auditoría para el usuario Admin', async () => {
    const usuario = await getUserFromRequest();
    const tokenPayload = await verifyToken('dummy');

    expect(usuario?.permisos?.ver_auditoria).toBe(true);
    expect(tokenPayload?.permisos?.ver_auditoria).toBe(true);
  });
});
