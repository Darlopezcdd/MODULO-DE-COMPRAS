import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProveedorForm from '@/components/ProveedorForm';
import { useRouter } from 'next/navigation';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

describe('ProveedorForm (Frontend Visual Validations - CA1)', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
    jest.clearAllMocks();
  });

  it('Muestra errores si se envía el formulario vacío', async () => {
    render(<ProveedorForm />);
    fireEvent.click(screen.getByText('Guardar Proveedor'));

    expect(await screen.findByText('Debe tener 10 o 13 dígitos numéricos')).toBeInTheDocument();
    expect(await screen.findByText('Debe tener entre 3 y 100 caracteres, sin números ni caracteres especiales')).toBeInTheDocument();
    expect(await screen.findByText('Debe tener entre 3 y 50 caracteres (letras y signos básicos)')).toBeInTheDocument();
  });

  it('Valida formato estricto de teléfono', async () => {
    render(<ProveedorForm />);
    const telefonoInput = screen.getByPlaceholderText('0999999999');
    fireEvent.change(telefonoInput, { target: { value: 'abc' } });
    fireEvent.click(screen.getByText('Guardar Proveedor'));

    expect(await screen.findByText('Formato de teléfono inválido')).toBeInTheDocument();
  });

  it('Llama a la API si los datos son correctos', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({ data: { crearProveedor: { id: 1 } } })
    });

    render(<ProveedorForm />);
    
    fireEvent.change(screen.getByPlaceholderText('1234567890'), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByPlaceholderText('Juan Pérez'), { target: { value: 'Juan Perez' } });
    fireEvent.change(screen.getByPlaceholderText('Quito'), { target: { value: 'Quito' } });
    fireEvent.change(screen.getByPlaceholderText('Av. Principal 123'), { target: { value: 'Calle' } });
    fireEvent.change(screen.getByPlaceholderText('0999999999'), { target: { value: '0999999999' } });
    fireEvent.change(screen.getByPlaceholderText('correo@ejemplo.com'), { target: { value: 'test@test.com' } });

    fireEvent.click(screen.getByText('Guardar Proveedor'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });
});
