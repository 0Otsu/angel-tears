# Categorías dinámicas

En el formulario de alta o edición de un producto, usá **+ Nueva categoría**. Al confirmar el nombre, el formulario incorpora y selecciona la categoría y conserva el borrador. El producto se guarda con su botón habitual.

PostgreSQL conserva las siete categorías originales. La nueva categoría se crea con sesión administrativa y un código estable derivado de su nombre normalizado. La clave primaria resuelve altas concurrentes del mismo nombre. Productos comprueba que el código exista y conserva la clave foránea.

El catálogo ofrece únicamente categorías de productos publicados con stock. En escritorio se ven hasta cinco categorías y el resto queda en **Más categorías**. En móvil se usa **Filtrar por categoría**. La selección de Inicio utiliza las categorías de sus destacados. Los scripts de demo conservan su conjunto inicial.

Esta entrega amplía la lista fija de la decisión C4 con el alta autorizada desde Productos. La tabla existente admite los códigos nuevos sin migración.
