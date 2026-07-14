import { NextResponse } from 'next/server';

const API_URL = 'https://proyecto-moduloseguridad.onrender.com/api/auth/verify-code/';
const FETCH_TIMEOUT_MS = 45000; // Render free tier: cold start puede tardar 30-50s

function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ success: false, message: 'Body inválido o vacío' }, { status: 400 });
    }

    const { email, codigo } = body;

    if (!email || !codigo) {
      return NextResponse.json({ success: false, message: 'El correo y el código son requeridos' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, message: 'El formato del correo no es válido' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, codigo }),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { success: false, message: 'El servicio de seguridad está iniciando, por favor intenta nuevamente en unos segundos' },
          { status: 504 }
        );
      }
      console.error('Error de red en verify-code:', fetchError);
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
      console.error('Respuesta no-JSON del microservicio (verify-code):', rawText);
      data = { success: res.ok };
    }

    if (!res.ok || data?.success === false) {
      return NextResponse.json(
        { success: false, message: data?.message || data?.error || 'Código inválido o expirado' },
        { status: res.status || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: data?.message || 'Código válido',
    });
  } catch (error: any) {
    console.error('Error interno en API verify-code:', error);
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}