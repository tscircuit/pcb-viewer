# Solución Técnica: Eliminar `disableAutoFocus` y usar `focusOnHover={false}`  

> **Contexto** – En el proyecto actual (repositorio de @mau16ro) el componente **`Hoverable`** (o cualquier componente que gestione el foco automático) expone una prop llamada `disableAutoFocus`.  
> **Objetivo** – Depreciar y eliminar `disableAutoFocus` y, en su lugar, introducir la prop **`focusOnHover`** que, cuando se establece a `false`, desactiva el mismo comportamiento.  
> **Rango** – Cambios en la API pública, tipado TypeScript, pruebas unitarias, documentación y guía de migración.

---  

## 1. Análisis preliminar  

| Archivo / Área | Qué contiene | Qué cambiar |
|----------------|--------------|------------|
| `src/components/Hoverable.tsx` (o similar) | Implementación del manejo de foco automático con prop `disableAutoFocus`. | Reemplazar lógica por `focusOnHover?: boolean`. |
| `src/types/index.d.ts` | Declaraciones de props del componente. | Actualizar tipado. |
| `src/__tests__/Hoverable.test.tsx` | Tests que usan `disableAutoFocus`. | Adaptar a `focusOnHover={false}`. |
| `README.md` / Docs | Descripción de la prop `disableAutoFocus`. | Actualizar documentación y añadir sección de migración. |
| `CHANGELOG.md` | Historial de versiones. | Añadir entrada de breaking change. |
| `src/utils/warn.ts` (opcional) | Función de aviso de uso de props obsoletas. | Añadir advertencia para `disableAutoFocus`. |

---  

## 2. Estrategia de migración  

1. **Mantener compatibilidad temporal** – Mantener la prop `disableAutoFocus` durante una versión mayor (`vX.Y`) pero marcarla como *deprecated*.  
2. **Emitir warning** – Cuando `disableAutoFocus` sea usado, lanzar `console.warn` indicando el nuevo uso.  
3. **Eliminar** – En la siguiente versión mayor (`vX+1.0.0`) eliminar por completo la prop y el warning.  

---  

## 3. Cambios de código  

### 3.1. Actualizar la definición del componente  

```tsx
// src/components/Hoverable.tsx
import React, { useEffect, useRef } from 'react';
import { warnDeprecatedProp } from '../utils/warn';

export interface HoverableProps {
  /** 
   * Si `true`, el elemento recibe foco automáticamente al pasar el cursor.
   * @default true
   */
  focusOnHover?: boolean;

  /** @deprecated Use `focusOnHover` en su lugar. */
  disableAutoFocus?: boolean;

  // ...otras props
}

/**
 * Componente que gestiona el foco automático al hacer hover.
 */
export const Hoverable: React.FC<HoverableProps> = ({
  focusOnHover = true,
  disableAutoFocus,
  children,
  ...rest
}) => {
  // Compatibilidad temporal: map deprecated prop → nuevo comportamiento
  if (disableAutoFocus !== undefined) {
    warnDeprecatedProp(
      '`disableAutoFocus` está deprecada. Usa `focusOnHover={false}` en su lugar.'
    );
    // Si el usuario pasa `disableAutoFocus={true}`, equivale a `focusOnHover={false}`
    focusOnHover = !disableAutoFocus;
  }

  const ref = useRef<HTMLElement>(null);

  // Lógica original basada en `disableAutoFocus`
  useEffect(() => {
    if (!focusOnHover) return; // comportamiento desactivado
    const el = ref.current;
    if (!el) return;
    const handleMouseEnter = () => el.focus();
    el.addEventListener('mouseenter', handleMouseEnter);
    return () => {
      el.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [focusOnHover]);

  return (
    <div ref={ref} tabIndex={0} {...rest}>
      {children}
    </div>
  );
};
```

#### Explicación de los cambios  

* **`focusOnHover?: boolean`** – Nueva prop con valor por defecto `true`.  
* **`disableAutoFocus?: boolean`** – Marcada como `@deprecated`.  
* **Mapeo** – Si `disableAutoFocus` está presente, se muestra un warning y se traduce a `focusOnHover = !disableAutoFocus`.  
* **Lógica** – Se basa únicamente en `focusOnHover`.  

### 3.2. Utilidad de advertencia (opcional)  

```ts
// src/utils/warn.ts
export const warnDeprecatedProp = (msg: string) => {
  if (process.env.NODE_ENV !== 'production') {
    // Evita spam en producción
    console.warn(`[DEPRECATED] ${msg}`);
  }
};
```

### 3.3. Actualizar tipado TypeScript  

```ts
// src/types/index.d.ts (o en el mismo archivo .tsx)
export interface HoverableProps {
  focusOnHover?: boolean;
  /** @deprecated */
  disableAutoFocus?: boolean;
  // ...resto
}
```

### 3.4. Refactorizar usos existentes  

Buscar y reemplazar en el código base:

```bash
# Búsqueda global (Unix)
grep -R "disableAutoFocus" -n src/ | cut -d: -f1 | uniq
```

Ejemplo de sustitución manual:

```tsx
// Antes
<Hoverable disableAutoFocus>{...}</Hoverable>

// Después
<Hoverable focusOnHover={false}>{...}</Hoverable>
```

> **Tip**: Si el proyecto es grande, crear un script de codemod (con `jscodeshift` o `ts-morph`) para automatizar el reemplazo.

#### Codemod (ejemplo con `jscodeshift`)

```js
// codemods/disableAutoFocus-to-focusOnHover.js
export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  root
    .find(j.JSXOpeningElement, {
      name: { type: 'JSXIdentifier', name: /Hoverable|.*Component/ },
    })
    .forEach(path => {
      const attrs = path.node.attributes;
      const disableAttr = attrs.find(
        a => a.type === 'JSXAttribute' && a.name.name === 'disableAutoFocus'
      );
      if (disableAttr) {
        // eliminar disableAutoFocus
        attrs.splice(attrs.indexOf(disableAttr), 1);
        // añadir focusOnHover={false}
        attrs.push(
          j.jsxAttribute(
            j.jsxIdentifier('focusOnHover'),
            j.jsxExpressionContainer(j.literal(false))
          )
        );
      }
    });

  return root.toSource();
}
```

Ejecutar:

```bash
npx jscodeshift -t codemods/disableAutoFocus-to-focusOnHover.js src/
```

### 3.5. Actualizar pruebas  

#### Antes  

```tsx
// src/__tests__/Hoverable.test.tsx
it('does not autofocus when disableAutoFocus is true', () => {
  render(<Hoverable disableAutoFocus>{/* ... */}</Hoverable>);
  // assertions...
});
```

#### Después  

```tsx
it('does not autofocus when focusOnHover is false', () => {
  render(<Hoverable focusOnHover={false}>{/* ... */}</Hoverable>);
  // assertions...
});
```

#### Añadir prueba de warning (opcional)  

```tsx
it('warns when using deprecated disableAutoFocus', () => {
  const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  render(<Hoverable disableAutoFocus>{/* ... */}</Hoverable>);
  expect(consoleWarn).toHaveBeenCalledWith(
    expect.stringContaining('disableAutoFocus está deprecada')
  );
  consoleWarn.mockRestore();
});
```

### 3.6. Actualizar documentación  

#### README / Docs  

```markdown
## Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `focusOnHover` | `boolean` | `true` | Cuando es `true`, el componente recibe foco automáticamente al pasar el cursor sobre él. |
| `disableAutoFocus` | `boolean` *(deprecated)* | — | **DEPRECATED**. Usa `focusOnHover={false}` en su lugar. |

### Migración

1. Reemplaza todas las ocurrencias de `disableAutoFocus` por `focusOnHover={false}`.  
2. Si necesitas desactivar temporalmente el foco, basta con pasar `focusOnHover={false}`.  
3. La prop `disableAutoFocus` será eliminada en la versión **vX+1.0.0**.
```

### 3.7. Actualizar `CHANGELOG.md`  

```markdown
## [X.Y.0] – 2026-11-05

### Changed
- **Breaking Change**: `disableAutoFocus` prop ha sido deprecada y reemplazada por `focusOnHover`.  
  - Uso anterior: `<Hoverable disableAutoFocus />`  
  - Nuevo uso: `<Hoverable focusOnHover={false} />`  
- Se añadió advertencia en tiempo de desarrollo cuando se usa la prop obsoleta.

### Added
- Prop `focusOnHover?: boolean` (default `true`) para controlar el foco automático al hover.
```

---  

## 4. Proceso de CI / PR  

1. **Branch**: `feat/focusOnHover`  
2. **Commits sugeridos**  
   - `feat: add focusOnHover prop and deprecate disableAutoFocus`  
   - `refactor: replace disableAutoFocus usages`  
   - `test: update unit tests for new prop`  
   - `docs: update README and migration guide`  
   - `chore: add deprecation warning utility`  
3. **Pipeline**  
   - Linter (`eslint`) – Asegurar que no queden `disableAutoFocus` sin mapear.  
   - TypeScript (`tsc --noEmit`) – Verificar que los tipos estén correctos.  
   - Tests (`npm test`) – Deben pasar 100% de los tests anteriores y los nuevos.  
   - Build (`npm run build`) – Sin errores.  

4. **Revisión**  
   - Verificar que el warning solo se muestre en `development`.  
   - Confirmar que la API pública (Storybook / Docs) muestra la prop `focusOnHover` y marca la otra como deprecated.  

---  

## 5. Plan de lanzamiento  

| Versión | Acción |
|---------|--------|
| `vX.Y.0` (actual) | Introducir `focusOnHover` y deprecación de `disableAutoFocus`. Publicar advertencia. |
| `vX+1.0.0` | Eliminar completamente `disableAutoFocus` y el código de advertencia. Actualizar `README` y tipado. |

### Comunicación a usuarios  

- **Release notes**: Incluir sección de *breaking change* y ejemplo de migración.  
- **Issue/PR template**: Añadir etiqueta `breaking-change` para que los consumidores estén alertas.  
- **Changelog**: Detallar el plazo de deprecación (una versión mayor).  

---  

## 6. Resumen de pasos a ejecutar  

```bash
# 1️⃣ Crear rama
git checkout -b feat/focusOnHover

# 2️⃣ Implementar cambios en el componente
# (ver sección 3.1)

# 3️⃣ Añadir utilidad de warning (opcional)
# (ver sección 3.2)

# 4️⃣ Actualizar tipos
# (ver sección 3.3)

# 5️⃣ Refactorizar usos (manual o con codemod)
npx jscodeshift -t codemods/disableAutoFocus-to-focusOnHover.js src/

# 6️⃣ Actualizar pruebas
# (ver sección 3.5)

# 7️⃣ Ejecutar pruebas y lint
npm run lint && npm test && tsc --noEmit

# 8️⃣ Actualizar documentación y changelog
# (ver sección 3.6 & 3.7)

# 9️⃣ Commit y push
git add .
git commit -m "feat: replace disableAutoFocus with focusOnHover"
git push origin feat/focusOnHover

# 10️⃣ Abrir PR y solicitar revisión
```

---  

## 7. Consideraciones adicionales  

| Tema | Detalle |
|------|---------|
| **Accesibilidad** | `focusOnHover` debe respetar los requisitos ARIA; si se desactiva, asegurarse de que el elemento sigue siendo navegable vía teclado. |
| **Performance** | No hay impacto significativo; solo se añaden/elimian listeners según la prop. |
| **Compatibilidad con versiones antiguas** | La advertencia permite a proyectos legacy migrar sin romper la compilación inmediata. |
| **Bundle size** | La utilidad de warning es mínima; se tree‑shakable en producción. |

---  

## 8. Conclusión  

Con los cambios descritos se logra:

- Un API más intuitiva (`focusOnHover`) que alinea el nombre de la prop con su intención.  
- Un proceso de migración seguro mediante deprecación y warnings.  
- Cobertura total de pruebas y