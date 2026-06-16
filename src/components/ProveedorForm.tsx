'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation, ApolloProvider } from '@apollo/client/react';
import { apolloClient } from '@/lib/apolloClient';

const proveedorSchema = z.object({
  cedulaRuc: z.string().regex(/^\d{10}(\d{3})?$/, 'Debe tener 10 o 13 dígitos numéricos'),
  nombre: z.string().regex(/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]{3,100}$/, 'Debe tener entre 3 y 100 caracteres, sin números ni caracteres especiales'),
  ciudad: z.string().regex(/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s\-\.,]{3,50}$/, 'Debe tener entre 3 y 50 caracteres (letras y signos básicos)'),
  tipo: z.enum(['CONTADO', 'CREDITO'], { required_error: 'Selecciona un tipo de proveedor' }),
  direccion: z.string().regex(/^[A-Za-z0-9ÁÉÍÓÚáéíóúÑñÜü\s\-\.,#]{5,200}$/, 'Debe tener entre 5 y 200 caracteres alfanuméricos'),
  telefono: z.string().regex(/^(0[1-9]\d{7,8}|\+?[1-9]\d{9,14})$/, 'Formato de teléfono inválido'),
  email: z.string().regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Formato de correo inválido'),
});

type ProveedorFormValues = z.infer<typeof proveedorSchema>;

const CREAR_PROVEEDOR = gql`
  mutation CrearProveedor($input: ProveedorInput!) {
    crearProveedor(input: $input) { id }
  }
`;

const ACTUALIZAR_PROVEEDOR = gql`
  mutation ActualizarProveedor($id: Int!, $input: ProveedorUpdateInput!) {
    actualizarProveedor(id: $id, input: $input) { id }
  }
`;

function ProveedorFormContent({ defaultValues, isEdit = false, id }: { defaultValues?: Partial<ProveedorFormValues>, isEdit?: boolean, id?: number }) {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProveedorFormValues>({
    resolver: zodResolver(proveedorSchema),
    defaultValues: defaultValues || {
      tipo: 'CONTADO'
    }
  });

  const [crearProveedor] = useMutation(CREAR_PROVEEDOR);
  const [actualizarProveedor] = useMutation(ACTUALIZAR_PROVEEDOR);

  const onSubmit = async (data: ProveedorFormValues) => {
    setServerError('');
    setSuccessMsg('');
    try {
      if (isEdit) {
        await actualizarProveedor({ variables: { id, input: data } });
      } else {
        await crearProveedor({ variables: { input: data } });
      }
      setSuccessMsg('Proveedor guardado con éxito');
      setTimeout(() => router.push('/proveedores'), 1200);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Ocurrió un error inesperado al guardar';
      setServerError(message);
    }
  };

  return (
    <div className="glass-panel p-8 rounded-xl max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-white">{isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
      
      {successMsg && (
        <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-200 p-4 rounded-lg mb-6 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
          {successMsg}
        </div>
      )}

      {serverError && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Cédula / RUC</label>
            <input 
              {...register('cedulaRuc')} 
              disabled={isEdit}
              className="w-full bg-secondary text-white px-4 py-2 rounded-lg border border-white/10 focus:border-primary outline-none transition-colors" 
              placeholder="1234567890" 
            />
            {errors.cedulaRuc && <p className="text-red-400 text-xs mt-1">{errors.cedulaRuc.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre / Razón Social</label>
            <input 
              {...register('nombre')} 
              className="w-full bg-secondary text-white px-4 py-2 rounded-lg border border-white/10 focus:border-primary outline-none transition-colors" 
              placeholder="Juan Pérez" 
            />
            {errors.nombre && <p className="text-red-400 text-xs mt-1">{errors.nombre.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Ciudad</label>
            <input 
              {...register('ciudad')} 
              className="w-full bg-secondary text-white px-4 py-2 rounded-lg border border-white/10 focus:border-primary outline-none transition-colors" 
              placeholder="Quito" 
            />
            {errors.ciudad && <p className="text-red-400 text-xs mt-1">{errors.ciudad.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Proveedor</label>
            <select 
              {...register('tipo')} 
              className="w-full bg-secondary text-white px-4 py-2 rounded-lg border border-white/10 focus:border-primary outline-none transition-colors"
            >
              <option value="CONTADO">Contado</option>
              <option value="CREDITO">Crédito</option>
            </select>
            {errors.tipo && <p className="text-red-400 text-xs mt-1">{errors.tipo.message}</p>}
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">Dirección</label>
            <input 
              {...register('direccion')} 
              className="w-full bg-secondary text-white px-4 py-2 rounded-lg border border-white/10 focus:border-primary outline-none transition-colors" 
              placeholder="Av. Principal 123" 
            />
            {errors.direccion && <p className="text-red-400 text-xs mt-1">{errors.direccion.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Teléfono</label>
            <input 
              {...register('telefono')} 
              className="w-full bg-secondary text-white px-4 py-2 rounded-lg border border-white/10 focus:border-primary outline-none transition-colors" 
              placeholder="0999999999" 
            />
            {errors.telefono && <p className="text-red-400 text-xs mt-1">{errors.telefono.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Correo Electrónico</label>
            <input 
              {...register('email')} 
              type="email"
              className="w-full bg-secondary text-white px-4 py-2 rounded-lg border border-white/10 focus:border-primary outline-none transition-colors" 
              placeholder="correo@ejemplo.com" 
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t border-white/10">
          <button 
            type="button" 
            onClick={() => router.push('/proveedores')}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Proveedor'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProveedorForm(props: { defaultValues?: Partial<ProveedorFormValues>, isEdit?: boolean, id?: number }) {
  return (
    <ApolloProvider client={apolloClient}>
      <ProveedorFormContent {...props} />
    </ApolloProvider>
  );
}
