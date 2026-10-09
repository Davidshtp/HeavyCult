/**
 * Documentos GraphQL de productos. Están en un archivo aparte para que el
 * servicio (y los servicios de catálogo/imágenes) solo lleven la lógica y para
 * poder auditar las mutaciones sin leer mil líneas de código.
 *
 * Nada acá se puede cambiar sin verificarlo contra la versión de la API que usa
 * el backend (`SHOPIFY_API_VERSION`); varias de estas formas existen
 * "deprecadas" en el esquema pero son las únicas que funcionan hoy.
 */

/** Galería del detalle: hasta 12 fotos; ninguna tienda usa más. */
export const MEDIA_POR_PRODUCTO = 12;

/** Tope de media al leer el de un producto, para reordenar y esperar altas. */
export const MEDIA_POR_LECTURA = 50;

/** Variantes por página en las lecturas de catálogo y detalle. */
export const VARIANTES_POR_PAGINA = 250;

export const CONSULTA_CATALOGO = `query Catalogo($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    pageInfo { hasNextPage endCursor }
    edges {
      node {
        id
        title
        handle
        status
        vendor
        productType
        tags
        descriptionHtml
        createdAt
        totalInventory
        featuredMedia { preview { image { url } } }
        media(first: ${MEDIA_POR_PRODUCTO}) {
          nodes {
            id
            mediaContentType
            status
            ... on MediaImage {
              alt
              image { url width height }
            }
          }
        }
        metafields(first: 20, namespace: "custom") {
          edges { node { key value } }
        }
        variants(first: ${VARIANTES_POR_PAGINA}) {
          pageInfo { hasNextPage }
          nodes {
            id
            title
            sku
            price
            inventoryQuantity
            selectedOptions { name value }
            inventoryItem { unitCost { amount } }
          }
        }
      }
    }
  }
}`;

export const CONSULTA_PRODUCTO = `query Producto($id: ID!) {
  product(id: $id) {
    id
    title
    handle
    status
    vendor
    productType
    tags
    descriptionHtml
    createdAt
    totalInventory
    featuredMedia { preview { image { url } } }
    media(first: ${MEDIA_POR_PRODUCTO}) {
      nodes {
        id
        mediaContentType
        status
        ... on MediaImage {
          alt
          image { url width height }
        }
      }
    }
    metafields(first: 20, namespace: "custom") {
      edges { node { key value } }
    }
    variants(first: ${VARIANTES_POR_PAGINA}) {
      pageInfo { hasNextPage }
      nodes {
        id
        title
        sku
        price
        inventoryQuantity
        selectedOptions { name value }
        inventoryItem { unitCost { amount } }
      }
    }
  }
}`;

/** Media del producto con su GID canónico y su estado: reordenar y esperar altas. */
export const CONSULTA_MEDIA_PRODUCTO = `query MediaProducto($id: ID!) {
  product(id: $id) {
    media(first: ${MEDIA_POR_LECTURA}) {
      nodes { id mediaContentType status }
    }
  }
}`;

export const MUTACION_ACTUALIZAR_PRODUCTO = `mutation ActualizarProducto($product: ProductUpdateInput!) {
  productUpdate(product: $product) {
    product { id }
    userErrors { field message }
  }
}`;

export const MUTACION_ACTUALIZAR_VARIANTES = `mutation ActualizarVariantes($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(
    productId: $productId
    variants: $variants
    allowPartialUpdates: true
  ) {
    productVariants { id }
    userErrors { field message }
  }
}`;

export const MUTACION_GUARDAR_GARANTIA = `mutation GuardarGarantia($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields { id }
    userErrors { field message }
  }
}`;

export const MUTACION_ELIMINAR_PRODUCTO = `mutation EliminarProducto($input: ProductDeleteInput!) {
  productDelete(input: $input, synchronous: true) {
    deletedProductId
    userErrors { message }
  }
}`;

/**
 * `media` va en el argumento hermano de `product`, no dentro de
 * `ProductUpdateInput`: Shopify no acepta archivos ahí, hay que subir la imagen
 * a Cloudinary y pasarle la URL, que Shopify descarga desde ahí.
 *
 * Ojo con la respuesta: en `2026-07` `ProductUpdatePayload` solo expone
 * `product` y `userErrors`. Pedir `media` ahí hace que Shopify rechace el
 * documento entero y la imagen no se suba nunca.
 */
export const MUTACION_AGREGAR_IMAGEN = `mutation AgregarImagen($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
  productUpdate(product: $product, media: $media) {
    product { id }
    userErrors { field message }
  }
}`;

/**
 * `productReorderMedia` devuelve un job asíncrono y `mediaUserErrors`
 * (`userErrors` quedó deprecado). Solo se pide el id del job: que terminó bien
 * se verifica releyendo el media, no confiando en el job.
 */
export const MUTACION_REORDENAR_IMAGENES = `mutation ReordenarImagenes($id: ID!, $moves: [MoveInput!]!) {
  productReorderMedia(id: $id, moves: $moves) {
    job { id }
    mediaUserErrors { field message }
  }
}`;

/**
 * Borrar el media del producto.
 *
 * La vía "moderna" sería `fileDelete`, pero exige el scope `write_files` y el
 * token de esta app no lo tiene: Shopify responde "Access denied for fileDelete".
 * `productDeleteMedia` está deprecada (Shopify apunta a `fileUpdate`, que en
 * `2026-07` no tiene forma de borrar) pero funciona con `write_products`, que ya
 * está concedido. Hay que volver a `fileDelete` cuando se agregue el scope.
 *
 * A favor de esta mutación: `mediaIds` es explícito, así que Shopify solo borra
 * media que pertenezca al producto indicado.
 */
export const MUTACION_ELIMINAR_IMAGEN = `mutation EliminarImagen($productId: ID!, $mediaIds: [ID!]!) {
  productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
    deletedMediaIds
    mediaUserErrors { field message }
  }
}`;
