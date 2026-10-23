/**
 * Documentos GraphQL de pedidos. Verificados contra `SHOPIFY_API_VERSION`
 * (2026-07): `orderCreate` usa `OrderCreateOrderInput` (los lineItems se crean
 * por `variantId`, no por título/precio, y el cliente se da con `toUpsert`).
 */

export const MUTACION_CREAR_PEDIDO = `mutation CrearPedido($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
  orderCreate(order: $order, options: $options) {
    order {
      id
      name
      displayFinancialStatus
      currentTotalPriceSet { shopMoney { amount } }
    }
    userErrors { field message }
  }
}`;

export const CONSULTA_LISTAR_PEDIDOS = `query ListarPedidos($first: Int!, $after: String) {
  orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
    pageInfo { hasNextPage endCursor }
    edges {
      node {
        id
        name
        displayFinancialStatus
        currentTotalPriceSet { shopMoney { amount } }
        createdAt
        email
        note
        shippingAddress { firstName lastName address1 city province countryCodeV2 zip }
      }
    }
  }
}`;

export const CONSULTA_PEDIDO = `query Pedido($id: ID!) {
  order(id: $id) {
    id
    name
    displayFinancialStatus
    currentTotalPriceSet { shopMoney { amount } }
    currencyCode
    createdAt
    note
    email
    phone
    shippingAddress {
      firstName
      lastName
      address1
      address2
      city
      province
      countryCodeV2
      zip
      phone
    }
    billingAddress {
      firstName
      lastName
      address1
      city
      province
      countryCodeV2
      zip
    }
    lineItems(first: 100) {
      nodes {
        id
        title
        quantity
        sku
        originalUnitPriceSet { shopMoney { amount } }
        variant { id title }
        product { id title }
      }
    }
    currentShippingPriceSet { shopMoney { amount } }
    currentTotalTaxSet { shopMoney { amount } }
  }
}`;

/** Pedidos por página en el listado; Shopify permite hasta 250. */
export const PEDIDOS_POR_PAGINA = 50;
