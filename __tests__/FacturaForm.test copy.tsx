import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FacturaForm from '../src/components/FacturaForm';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn() }),
}));

jest.mock('@apollo/client/react', () => {
  const actual = jest.requireActual('@apollo/client/react');
  return {
    ...actual,
    ApolloProvider: ({ children }: any) => children,
    useQuery: () => ({ data: null, loading: false, error: null }),
    useMutation: () => [jest.fn()],
    useApolloClient: () => ({ query: jest.fn().mockResolvedValue({ data: null }) }),
  };
});

global.fetch = jest.fn(() => 
  Promise.resolve({ 
    json: () => Promise.resolve({ success: true, data: [] }) 
  })
) as jest.Mock;

describe('FacturaForm DOM Mutations', () => {
  it('agrega y elimina líneas de productos correctamente', () => {
    render(<FacturaForm />);

    expect(screen.getByTestId('product-row-0')).toBeInTheDocument();

    const addBtn = screen.getByTestId('add-product-btn');
    fireEvent.click(addBtn);

    expect(screen.getByTestId('product-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('product-row-1')).toBeInTheDocument();

    const removeBtn = screen.getByTestId('remove-0');
    fireEvent.click(removeBtn);

    expect(screen.getByTestId('product-row-0')).toBeInTheDocument();
    expect(screen.queryByTestId('product-row-1')).not.toBeInTheDocument();
  });

  it('actualiza los totales al cambiar cantidades y precios', () => {
    render(<FacturaForm />);

    const qtyInput = screen.getByTestId('qty-0');
    const pvpInput = screen.getByTestId('pvp-0');
    const ivaCheckbox = screen.getByTestId('iva-0');

    fireEvent.change(qtyInput, { target: { value: '2' } });
    fireEvent.change(pvpInput, { target: { value: '50' } });

    expect(screen.getByTestId('subtotal-con-iva')).toHaveTextContent('100.00');
    expect(screen.getByTestId('total-iva')).toHaveTextContent('15.00');
    expect(screen.getByTestId('total-general')).toHaveTextContent('115.00');

    fireEvent.click(ivaCheckbox);

    expect(screen.getByTestId('subtotal-sin-iva')).toHaveTextContent('100.00');
    expect(screen.getByTestId('total-iva')).toHaveTextContent('0.00');
    expect(screen.getByTestId('total-general')).toHaveTextContent('100.00');
  });
});
