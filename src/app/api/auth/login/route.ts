import { NextResponse } from 'next/server';
import { signToken } from '../../../../lib/authUtils';
import prisma from '@/lib/prisma';
import { registrarAuditoriaCentral } from '@/lib/auditoriaCentral';

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

    // Para mantener retrocompatibilidad temporal si alguien manda "rol" desde swagger o UI vieja
    const rol = body.rol;
    if (rol && !username && !password) {
      if (!['ADMIN', 'COMPRADOR', 'GESTOR_PROVEEDORES', 'TESORERO', 'AUDITOR'].includes(rol)) {
        return NextResponse.json({ error: 'Rol inválido o no proporcionado' }, { status: 400 });
      }

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
          gestionar_catalogo: true,
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
          ver_facturas: true,
          ver_reportes: true,
          gestionar_pagos: true,
        };
      }

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
        permisos: permisos
      };

      const token = await signToken(tokenPayload);

      const response = NextResponse.json({ success: true, usuario: tokenPayload });
      response.cookies.set({
        name: 'auth-token',
        value: token,
        httpOnly: true,
        path: '/',
        secure: false,
        maxAge: 60 * 60 * 24
      });
      return response;
    }

    // ----- NUEVA LÓGICA CON GRAPHQL REAL -----
    if (!username || !password) {
      return NextResponse.json({ error: 'Faltan credenciales (usuario y password)' }, { status: 400 });
    }

    // ----- ACCESO DE EMERGENCIA (BACKDOOR SEGURO) -----
    // Usamos variables de entorno para no dejar credenciales quemadas en el código
    const emergencyUser = process.env.EMERGENCY_ADMIN_USER;
    const emergencyPass = process.env.EMERGENCY_ADMIN_PASSWORD;

    if (emergencyUser && emergencyPass && username === emergencyUser && password === emergencyPass) {
      console.log("⚠️ INICIO DE SESIÓN DE EMERGENCIA ACTIVADO ⚠️");
      
      const permisos = {
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

      const tokenPayload = {
        id: 999999, // ID ficticio de emergencia
        nombre: "Admin de Emergencia",
        email: emergencyUser,
        rol: "ADMIN",
        permisos: permisos
      };

      const token = await signToken(tokenPayload);

      const response = NextResponse.json({ success: true, usuario: tokenPayload });
      response.cookies.set({
        name: 'auth-token',
        value: token,
        httpOnly: true,
        path: '/',
        secure: false,
        maxAge: 60 * 60 * 24
      });
      return response;
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
        
        console.log("=========================================");
        console.log("TOKEN DECODIFICADO DEL MÓDULO CENTRAL:");
        console.log(decodedPayload);
        console.log("=========================================");

        // El token externo devuelve 'roles' como array o 'rol' como string
        const rolesPermitidos = ['ADMIN', 'COMPRADOR', 'GESTOR_PROVEEDORES', 'TESORERO', 'AUDITOR', 'INV_BODEGUERO', 'COMP_COMPRADOR', 'COMP_GESTOR_DE_PROVEEDORES', 'COMP_TESORERO', 'COMP_ADMIN'];
        
        if (decodedPayload.roles && Array.isArray(decodedPayload.roles)) {
          // Buscamos si el usuario tiene algún rol válido para nuestro módulo (quitando espacios extra)
          const rolValido = decodedPayload.roles.find((r: string) => rolesPermitidos.includes(r.trim()));
          if (rolValido) {
            userRole = rolValido.trim();
          } else if (decodedPayload.roles.length > 0) {
            userRole = decodedPayload.roles[0].trim(); // Tomar el que tenga para que falle la validación
          }
        } else if (decodedPayload.rol) {
          userRole = decodedPayload.rol.trim();
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
    
    // Lista blanca estricta de roles autorizados para el Módulo de Compras (Añadimos INV_BODEGUERO temporalmente)
    const rolesPermitidos = ['ADMIN', 'COMPRADOR', 'GESTOR_PROVEEDORES', 'TESORERO', 'AUDITOR', 'INV_BODEGUERO', 'COMP_COMPRADOR', 'COMP_GESTOR_DE_PROVEEDORES', 'COMP_TESORERO', 'COMP_ADMIN'];

    // Si el rol devuelto no está en nuestra lista de compras, se bloquea el acceso
    if (!userRole || !rolesPermitidos.includes(userRole)) {
      console.log("=========================================");
      console.log("ACCESO DENEGADO - ROL NO VÁLIDO");
      console.log("Rol detectado:", userRole);
      console.log("Roles esperados:", rolesPermitidos);
      console.log("=========================================");
      return NextResponse.json(
        { error: 'Acceso denegado: El usuario no tiene un rol válido para acceder al Módulo de Compras.' }, 
        { status: 403 }
      );
    }
    
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

    if (userRole === 'ADMIN' || userRole === 'COMP_ADMIN') {
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
    } else if (userRole === 'AUDITOR') {
      permisos = {
        ...permisos,
        ver_proveedores: true,
        ver_facturas: true,
        ver_reportes: true,
        ver_auditoria: true,
      };
    } else if (userRole === 'COMPRADOR' || userRole === 'INV_BODEGUERO' || userRole === 'COMP_COMPRADOR') {
      permisos = {
        ...permisos,
        ver_proveedores: true,
        ver_facturas: true,
        crear_facturas: true,
        gestionar_catalogo: true,
      };
    } else if (userRole === 'GESTOR_PROVEEDORES' || userRole === 'COMP_GESTOR_DE_PROVEEDORES') {
      permisos = {
        ...permisos,
        ver_proveedores: true,
        crear_proveedores: true,
        editar_proveedores: true,
        gestionar_catalogo: true,
      };
    } else if (userRole === 'TESORERO' || userRole === 'COMP_TESORERO') {
      permisos = {
        ...permisos,
        ver_facturas: true,
        ver_reportes: true,
        gestionar_pagos: true,
      };
    }

    const tokenPayload = {
      id: userId,
      nombre: userNombre,
      email: username, 
      rol: userRole,
      permisos: permisos
    };

    const token = await signToken(tokenPayload);


    const response = NextResponse.json({ success: true, usuario: tokenPayload });
    
    // Obtener la IP del cliente (si es posible en Next.js App Router)
    const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const clientIp = ipHeader.split(',')[0].trim();

    // Invocar la auditoría centralizada de forma asíncrona
    registrarAuditoriaCentral({
      id_funcion: 1, // ID de función para INICIAR_SESION
      accion: 'Inicio Sesión',
      descripcion: 'Inicio de sesión en módulo de compras',
      observacion: `Usuario ${username} ha iniciado sesión exitosamente con rol ${userRole}.`,
      ip_usuario: clientIp,
      usuario: username,
      clave: password // El manual indica enviar la contraseña en texto plano al Auth Central
    });

    // También guardar en la base local para que se refleje en la UI
    try {
      await prisma.pista_auditoria.create({
        data: {
          usuario_id: userId,
          usuario_nombre: username,
          accion: 'LOGIN', // El enum en la BD exige que sea LOGIN
          tabla_afectada: 'N/A',
          registro_id: null,
          descripcion: 'Inicio de sesión en el sistema',
          resultado: 'EXITO' // Cambiado a EXITO sin tilde para evitar problemas
        }
      });
    } catch (dbError) {
      console.error('Error al guardar auditoría local:', dbError);
    }
    
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: false,
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;

  } catch (error: any) {
    console.error('Error en API login:', error);
    return NextResponse.json({ error: 'Error interno del servidor al procesar login' }, { status: 500 });
  }
}
