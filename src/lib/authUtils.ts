import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super_secret_key_compras_module_123');

export async function signToken(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifyToken(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    console.error("Token no válido o expirado:", error);
    return null;
  }
}

export async function getUserFromRequest(request?: any) {
  try {
    let token = '';
    
    // Si viene desde NextRequest o request (API route standard con headers)
    if (request?.cookies) {
      if (typeof request.cookies.get === 'function') {
        token = request.cookies.get('auth-token')?.value || '';
      } else {
        token = request.cookies['auth-token'] || '';
      }
    }
    
    // Fallback: buscar en los headers si es un Bearer token
    if (!token && request?.headers) {
      const authHeader = typeof request.headers.get === 'function' 
        ? request.headers.get('authorization')
        : request.headers['authorization'];
        
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) return null;

    return await verifyToken(token);
  } catch (e) {
    return null;
  }
}
