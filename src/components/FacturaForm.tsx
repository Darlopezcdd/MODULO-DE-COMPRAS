'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FacturaPdfPreview } from './FacturaPdfPreview';

const facturaSchema = z.object({
  fechaEmision: z.string().min(1, 'La fecha de emisión es obligatoria'),
  fechaVencimiento: z.string().optional(),
  tipoPago: z.enum(['CONTADO', 'CREDITO'], { required_error: 'Selecciona un tipo de pago' }),
}).superRefine((data, ctx) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const emision = new Date(data.fechaEmision + 'T00:00:00');
  emision.setHours(0, 0, 0, 0);

  if (emision > hoy) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La fecha de emisión no puede ser futura',
      path: ['fechaEmision'],
    });
  }

  if (data.tipoPago === 'CREDITO') {
    if (!data.fechaVencimiento) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fecha de vencimiento es obligatoria para crédito',
        path: ['fechaVencimiento'],
      });
      return;
    }

    const vencimiento = new Date(data.fechaVencimiento + 'T00:00:00');
    vencimiento.setHours(0, 0, 0, 0);

    if (vencimiento < emision) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fecha de vencimiento no puede ser menor a la emisión',
        path: ['fechaVencimiento'],
      });
    }
  }
});

type FacturaFormValues = z.infer<typeof facturaSchema>;

export default function FacturaForm() {
  const { register, handleSubmit, formState: { errors }, watch } = useForm<FacturaFormValues>({
    resolver: zodResolver(facturaSchema),
    defaultValues: {
      tipoPago: 'CONTADO'
    }
  });

  const onSubmit = async (data: FacturaFormValues) => {
    // API Call goes here
    console.log(data);
  };

  const formValues = watch();
  const tipoPago = formValues.tipoPago;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg mx-auto mt-10">
      <div>
        <label htmlFor="tipoPago" className="block text-sm font-medium">Tipo de Pago</label>
        <select id="tipoPago" {...register('tipoPago')} className="border p-2 w-full rounded">
          <option value="CONTADO">CONTADO</option>
          <option value="CREDITO">CREDITO</option>
        </select>
        {errors.tipoPago && <p className="text-red-500 text-xs">{errors.tipoPago.message}</p>}
      </div>

      <div>
        <label htmlFor="fechaEmision" className="block text-sm font-medium">Fecha de Emisión</label>
        <input type="date" id="fechaEmision" {...register('fechaEmision')} className="border p-2 w-full rounded" />
        {errors.fechaEmision && <p className="text-red-500 text-xs">{errors.fechaEmision.message}</p>}
      </div>

      {tipoPago === 'CREDITO' && (
        <div>
          <label htmlFor="fechaVencimiento" className="block text-sm font-medium">Fecha de Vencimiento</label>
          <input type="date" id="fechaVencimiento" {...register('fechaVencimiento')} className="border p-2 w-full rounded" />
          {errors.fechaVencimiento && <p className="text-red-500 text-xs">{errors.fechaVencimiento.message}</p>}
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 transition-colors text-white p-2 rounded w-full font-medium">Guardar Factura</button>
        <FacturaPdfPreview data={formValues} />
      </div>
    </form>
  );
}
