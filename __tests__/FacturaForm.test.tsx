import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FacturaForm from '../src/components/FacturaForm';
import { MockedProvider } from '@apollo/client/testing';

describe('FacturaForm DOM Mutations', () => {
  it('agrega y elimina líneas de productos correctamente', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <FacturaForm />
      </MockedProvider>
    );

    // Initial state: 1 product
    expect(screen.getByTestId('product-row-0')).toBeInTheDocument();

    // Add a new product
    const addBtn = screen.getByTestId('add-product-btn');
    fireEvent.click(addBtn);

    // Now there should be 2 products
    expect(screen.getByTestId('product-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('product-row-1')).toBeInTheDocument();

    // Remove the first product
    const removeBtn = screen.getByTestId('remove-0');
    fireEvent.click(removeBtn);

    // Now there should be only 1 product left
    // The previous row 1 becomes row 0 because it's re-rendered by index
    expect(screen.getByTestId('product-row-0')).toBeInTheDocument();
    expect(screen.queryByTestId('product-row-1')).not.toBeInTheDocument();
  });

  it('actualiza los totales al cambiar cantidades y precios', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <FacturaForm />
      </MockedProvider>
    );

    const qtyInput = screen.getByTestId('qty-0');
    const pvpInput = screen.getByTestId('pvp-0');
    const ivaCheckbox = screen.getByTestId('iva-0');

    // Change qty to 2, pvp to 50, keep IVA true
    fireEvent.change(qtyInput, { target: { value: '2' } });
    fireEvent.change(pvpInput, { target: { value: '50' } });

    // Subtotal: 100
    // IVA: 15
    // Total: 115
    expect(screen.getByTestId('subtotal-con-iva')).toHaveTextContent('100.00');
    expect(screen.getByTestId('total-iva')).toHaveTextContent('15.00');
    expect(screen.getByTestId('total-general')).toHaveTextContent('115.00');

    // Uncheck IVA
    fireEvent.click(ivaCheckbox);

    // Subtotal sin IVA: 100
    // IVA: 0
    // Total: 100
    expect(screen.getByTestId('subtotal-sin-iva')).toHaveTextContent('100.00');
    expect(screen.getByTestId('total-iva')).toHaveTextContent('0.00');
    expect(screen.getByTestId('total-general')).toHaveTextContent('100.00');
  });
});
