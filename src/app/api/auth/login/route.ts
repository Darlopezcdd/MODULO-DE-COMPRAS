import { NextResponse } from 'next/server';
import { signToken } from '../../../../lib/authUtils';

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     description: Autentica al usuario con email y contraseña. Devuelve un token JWT como cookie httpOnly.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UsuarioLogin'
 *     responses:
 *       200:
 *         description: Login exitoso. Se establece la cookie `auth-token`.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *         headers:
 *           Set-Cookie:
 *             description: Cookie httpOnly con el token JWT
 *             schema:
 *               type: string
 *               example: auth-token=eyJhbGciOiJIUzI1NiJ9...; Path=/; HttpOnly
 *       400:
 *         description: Credenciales incompletas (falta email o password)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Usuario no encontrado, inactivo o contraseña incorrecta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // El frontend ahora debe enviar 'username' y 'password'
    const username = body.username || body.identificador || body.email;
    const password = body.password;

<<<<<<< HEAD
    // Para mantener retrocompatibilidad temporal si alguien manda "rol" desde swagger o UI vieja
    if (body.rol && !username && !password) {
      const rol = body.rol;
      if (!['ADMIN', 'COMPRADOR', 'GESTOR_PROVEEDORES', 'TESORERO'].includes(rol)) {
        return NextResponse.json({ error: 'Rol inválido o no proporcionado' }, { status: 400 });
      }

      let permisos = {
        ver_proveedores: rol === 'ADMIN' || rol === 'COMPRADOR' || rol === 'GESTOR_PROVEEDORES' || rol === 'TESORERO',
        crear_proveedores: rol === 'ADMIN' || rol === 'GESTOR_PROVEEDORES',
        editar_proveedores: rol === 'ADMIN' || rol === 'GESTOR_PROVEEDORES',
        gestionar_catalogo: rol === 'ADMIN' || rol === 'GESTOR_PROVEEDORES',
        ver_facturas: rol === 'ADMIN' || rol === 'COMPRADOR' || rol === 'TESORERO',
        crear_facturas: rol === 'ADMIN' || rol === 'COMPRADOR',
        puede_anular: rol === 'ADMIN',
        ver_reportes: rol === 'ADMIN' || rol === 'TESORERO',
        gestionar_pagos: rol === 'ADMIN' || rol === 'TESORERO',
      };

      const userNames: Record<string, string> = {
        'ADMIN': 'Administrador Sistema',
        'COMPRADOR': 'Comprador Usuario',
        'GESTOR_PROVEEDORES': 'Gestor de Proveedores',
        'TESORERO': 'Tesorero Finanzas'
      };

      const tokenPayload = {
        id: ['ADMIN', 'COMPRADOR', 'GESTOR_PROVEEDORES', 'TESORERO'].indexOf(rol) + 1,
        nombre: userNames[rol as keyof typeof userNames],
        email: `${rol.toLowerCase().replace('_', '.')}@compras.com`,
        rol: rol,
        permisos: permisos
      };

      const token = await signToken(tokenPayload);

      const response = NextResponse.json({ success: true, usuario: tokenPayload });
      response.cookies.set({
        name: 'auth-token',
        value: token,
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24
      });
      return response;
    }

    // ----- NUEVA LÓGICA CON GRAPHQL REAL -----
    if (!username || !password) {
      return NextResponse.json({ error: 'Faltan credenciales (usuario y password)' }, { status: 400 });
    }

    const graphqlEndpoint = 'https://proyecto-moduloseguridad.onrender.com/graphql/';
    
    // Se ajusta a la mutación exacta de login
    const query = `
      mutation Login($username: String!, $password: String!) {
        login(username: $username, password: $password, moduloId: 3) {
          message
          success
          token
        }
      }
    `;

    const graphqlResponse = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { username, password }
      })
    });

    const data = await graphqlResponse.json();

    if (data.errors) {
      console.error('Errores en GraphQL:', data.errors);
      return NextResponse.json({ error: data.errors[0]?.message || 'Error de autenticación' }, { status: 401 });
    }

    const loginData = data.data?.login;

    if (!loginData || !loginData.success || !loginData.token) {
      // Esta línea permite que se muestre el error devuelto por la API ("Usuario incorrecto", etc.)
      return NextResponse.json({ error: loginData?.message || 'Credenciales inválidas' }, { status: 401 });
    }

    // Intentamos decodificar el token externo para obtener el rol asignado a este usuario
    let userRole = '';
    let userId = 1;
    let userNombre = username;

    try {
      const payloadBase64 = loginData.token.split('.')[1];
      if (payloadBase64) {
        const decodedPayload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
        
        // El token externo devuelve 'roles' como array o 'rol' como string
        const rolesPermitidos = ['ADMIN', 'COMPRADOR', 'GESTOR_PROVEEDORES', 'TESORERO'];
        
        if (decodedPayload.roles && Array.isArray(decodedPayload.roles)) {
          // Buscamos si el usuario tiene algún rol válido para nuestro módulo
          const rolValido = decodedPayload.roles.find((r: string) => rolesPermitidos.includes(r));
          if (rolValido) {
            userRole = rolValido;
          } else if (decodedPayload.roles.length > 0) {
            userRole = decodedPayload.roles[0]; // Tomar el que tenga para que falle la validación
          }
        } else if (decodedPayload.rol) {
          userRole = decodedPayload.rol;
        }

        if (decodedPayload.user_id) userId = decodedPayload.user_id;
        else if (decodedPayload.id) userId = decodedPayload.id;

        if (decodedPayload.user_name) userNombre = decodedPayload.user_name;
        else if (decodedPayload.username) userNombre = decodedPayload.username;
        else if (decodedPayload.nombre) userNombre = decodedPayload.nombre;
      }
    } catch (e) {
      console.error("No se pudo decodificar el token externo", e);
      return NextResponse.json({ error: 'Error al verificar integridad de credenciales' }, { status: 401 });
    }
    
    // Lista blanca estricta de roles autorizados para el Módulo de Compras
    const rolesPermitidos = ['ADMIN', 'COMPRADOR', 'GESTOR_PROVEEDORES', 'TESORERO'];

    // Si el rol devuelto no está en nuestra lista de compras, se bloquea el acceso
    if (!userRole || !rolesPermitidos.includes(userRole)) {
      return NextResponse.json(
        { error: 'Acceso denegado: El usuario no tiene un rol válido para acceder al Módulo de Compras.' }, 
        { status: 403 }
      );
    }
    
    const permisos = {
      ver_proveedores: true,
      crear_proveedores: userRole === 'ADMIN' || userRole === 'GESTOR_PROVEEDORES',
      editar_proveedores: userRole === 'ADMIN' || userRole === 'GESTOR_PROVEEDORES',
      gestionar_catalogo: userRole === 'ADMIN' || userRole === 'GESTOR_PROVEEDORES',
      ver_facturas: true,
      crear_facturas: userRole === 'ADMIN' || userRole === 'COMPRADOR',
      puede_anular: userRole === 'ADMIN',
      ver_reportes: userRole === 'ADMIN' || userRole === 'TESORERO',
      gestionar_pagos: userRole === 'ADMIN' || userRole === 'TESORERO',
    };

    const tokenPayload = {
      id: userId,
      nombre: userNombre,
      email: username, 
      rol: userRole,
=======
    if (!rol || !['ADMIN', 'COMPRADOR', 'GESTOR_PROVEEDORES', 'TESORERO', 'AUDITOR'].includes(rol)) {
      return NextResponse.json({ error: 'Rol inválido o no proporcionado' }, { status: 400 });
    }

    // Definir permisos dinámicos basados en el rol (Simulando lo que haría el Módulo de Seguridad)
    let permisos = {
      ver_proveedores: false,
      crear_proveedores: false,
      editar_proveedores: false,
      gestionar_catalogo: false,
      ver_facturas: false,
      crear_facturas: false,
      puede_anular: false,
      ver_reportes: false,
      gestionar_pagos: false,
      ver_auditoria: false,
    };

    if (rol === 'ADMIN') {
      permisos = {
        ver_proveedores: true,
        crear_proveedores: true,
        editar_proveedores: true,
        gestionar_catalogo: true,
        ver_facturas: true,
        crear_facturas: true,
        puede_anular: true,
        ver_reportes: true,
        gestionar_pagos: true,
        ver_auditoria: true,
      };
    } else if (rol === 'AUDITOR') {
      permisos = {
        ...permisos,
        ver_proveedores: true,
        ver_facturas: true,
        ver_reportes: true,
        ver_auditoria: true,
      };
    } else if (rol === 'COMPRADOR') {
      permisos = {
        ...permisos,
        ver_proveedores: true,
        ver_facturas: true,
        crear_facturas: true,
      };
    } else if (rol === 'GESTOR_PROVEEDORES') {
      permisos = {
        ...permisos,
        ver_proveedores: true,
        crear_proveedores: true,
        editar_proveedores: true,
        gestionar_catalogo: true,
      };
    } else if (rol === 'TESORERO') {
      permisos = {
        ...permisos,
        ver_proveedores: true,
        ver_facturas: true,
        ver_reportes: true,
        gestionar_pagos: true,
      };
    }

    // Crear un payload mock con ID fijo y datos de prueba
    const userNames: Record<string, string> = {
      'ADMIN': 'Administrador Sistema',
      'AUDITOR': 'Auditor Sistema',
      'COMPRADOR': 'Comprador Usuario',
      'GESTOR_PROVEEDORES': 'Gestor de Proveedores',
      'TESORERO': 'Tesorero Finanzas'
    };

    const tokenPayload = {
      id: ['ADMIN', 'AUDITOR', 'COMPRADOR', 'GESTOR_PROVEEDORES', 'TESORERO'].indexOf(rol) + 1,
      nombre: userNames[rol as keyof typeof userNames],
      email: `${rol.toLowerCase().replace('_', '.')}@compras.com`,
      rol: rol,
>>>>>>> origin/farirama
      permisos: permisos
    };

    const token = await signToken(tokenPayload);

    const response = NextResponse.json({ success: true, usuario: tokenPayload });
    
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;

  } catch (error: any) {
    console.error('Error en API login:', error);
    return NextResponse.json({ error: 'Error interno del servidor al procesar login' }, { status: 500 });
  }
}
