/**
 * @swagger
 * /api/graphql:
 *   get:
 *     summary: GraphQL Playground (interfaz interactiva)
 *     description: Abre la interfaz gráfica de GraphQL Yoga para explorar queries y mutations de proveedores y facturas.
 *     tags:
 *       - GraphQL
 *     responses:
 *       200:
 *         description: Interfaz HTML de GraphQL Playground
 *   post:
 *     summary: Ejecutar operación GraphQL
 *     description: |
 *       Endpoint principal de GraphQL. Soporta las siguientes operaciones:
 *
 *       **Queries:**
 *       - `listarProveedores(estado, tipo, buscar)` → `[Proveedor]`
 *       - `obtenerProveedor(id)` → `Proveedor`
 *       - `listarFacturas(estado, fechaInicio, fechaFin)` → `[FacturaCompra]`
 *       - `obtenerFactura(id)` → `FacturaCompra`
 *
 *       **Mutations:**
 *       - `crearProveedor(input)` → `Proveedor`
 *       - `actualizarProveedor(id, input)` → `Proveedor`
 *       - `eliminarProveedor(id)` → `Proveedor`
 *       - `crearFacturaCabecera(input)` → `FacturaCompra`
 *     tags:
 *       - GraphQL
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Query o mutation de GraphQL
 *                 example: '{ listarProveedores(estado: ACTIVO) { id nombre cedulaRuc email } }'
 *               variables:
 *                 type: object
 *                 description: Variables para la operación GraphQL
 *     responses:
 *       200:
 *         description: Resultado de la operación GraphQL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       message:
 *                         type: string
 */
import { createSchema, createYoga } from 'graphql-yoga';
import { typeDefs } from '@/graphql/schema';
import { resolvers } from '@/graphql/resolvers';

const schema = createSchema({
  typeDefs,
  resolvers,
});

const { handleRequest } = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response },
});

export { handleRequest as GET, handleRequest as POST };
