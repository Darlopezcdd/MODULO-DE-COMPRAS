import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FacturaForm from '@/components/FacturaForm';
import { useRouter } from 'next/navigation';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

global.fetch = jest.fn() as jest.Mock;

describe('FacturaForm Validations', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
    jest.clearAllMocks();
  });

  it('Bloquea fecha de emisión en el futuro', async () => {
    render(<FacturaForm />);
    
    // Configurar una fecha futura
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const futureDate = tomorrow.toISOString().split('T')[0];

    fireEvent.change(screen.getByLabelText(/Fecha de Emisión/i), { target: { value: futureDate } });
    fireEvent.click(screen.getByText('Guardar Factura'));

    expect(await screen.findByText('La fecha de emisión no puede ser futura')).toBeInTheDocument();
  });

  it('Bloquea fecha de vencimiento en el pasado', async () => {
    render(<FacturaForm />);
    
    // Configurar una fecha pasada
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const pastDate = yesterday.toISOString().split('T')[0];
    
    // Hoy
    const today = new Date().toISOString().split('T')[0];

    // Para crédito es obligatorio fecha vencimiento
    fireEvent.change(screen.getByLabelText(/Tipo de Pago/i), { target: { value: 'CREDITO' } });
    fireEvent.change(screen.getByLabelText(/Fecha de Emisión/i), { target: { value: today } });
    fireEvent.change(screen.getByLabelText(/Fecha de Vencimiento/i), { target: { value: pastDate } });
    
    fireEvent.click(screen.getByText('Guardar Factura'));

    expect(await screen.findByText('La fecha de vencimiento no puede ser menor a la emisión')).toBeInTheDocument();
  });

  it('Requiere fecha de vencimiento si el pago es a CRÉDITO', async () => {
    render(<FacturaForm />);
    
    fireEvent.change(screen.getByLabelText(/Tipo de Pago/i), { target: { value: 'CREDITO' } });
    // Dejar vacío vencimiento
    fireEvent.click(screen.getByText('Guardar Factura'));

    expect(await screen.findByText('La fecha de vencimiento es obligatoria para crédito')).toBeInTheDocument();
  });
});
