import { NextResponse } from 'next/server';

const GRAPHQL_URL = 'https://proyecto-moduloseguridad.onrender.com/graphql/';
const FETCH_TIMEOUT_MS = 45000; // Render free tier: cold start puede tardar 30-50s
const MIN_PASSWORD_LENGTH = 8;

function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ success: false, message: 'Body inválido o vacío' }, { status: 400 });
    }

    const { email, codigo, new_password } = body;

    if (!email || !codigo || !new_password) {
      return NextResponse.json({ success: false, message: 'Faltan datos requeridos: email, codigo, new_password' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, message: 'El formato del correo no es válido' }, { status: 400 });
    }

    if (typeof new_password !== 'string' || new_password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { success: false, message: `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const query = `
      mutation ResetPassword($email: String!, $codigo: String!, $password: String!, $confirmPassword: String!) {
        resetPassword(email: $email, codigo: $codigo, password: $password, confirmPassword: $confirmPassword) {
          success
          message
        }
      }
    `;

    let res: Response;
    try {
      res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          query, 
          variables: { 
            email, 
            codigo, 
            password: new_password, 
            confirmPassword: new_password 
          } 
        }),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { success: false, message: 'El servicio de seguridad está iniciando, por favor intenta nuevamente en unos segundos' },
          { status: 504 }
        );
      }
      console.error('Error de red en reset-password:', fetchError);
      return NextResponse.json(
        { success: false, message: 'No se pudo contactar el servicio de seguridad' },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    const rawText = await res.text();
    let data: any;
    try {
      data = rawText ? JSON.parse(rawText) : { success: res.ok };
    } catch {
      console.error('Respuesta no-JSON del microservicio (reset-password):', rawText);
      data = { success: res.ok };
    }

    if (data.errors) {
      console.error('Errores en GraphQL:', data.errors);
      return NextResponse.json({ success: false, message: data.errors[0]?.message || 'Error al cambiar la contraseña' }, { status: 400 });
    }

    const mutationResult = data?.data?.resetPassword;

    if (!res.ok || mutationResult?.success === false) {
      return NextResponse.json(
        { success: false, message: mutationResult?.message || 'Error al cambiar la contraseña' },
        { status: res.status || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: mutationResult?.message || 'Contraseña actualizada con éxito',
    });
  } catch (error: any) {
    console.error('Error interno en API reset-password:', error);
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}