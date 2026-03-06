# Monday.com Webhook — Lovable Form → Monday Lead Board

Webhook serverless (Vercel) que recibe el payload del formulario de Lovable y crea automáticamente un ítem en el tablero de Monday.com.

---

## Mapeo de campos

| Campo formulario   | Columna Monday              | Tipo       |
|--------------------|-----------------------------|------------|
| `nombre`           | Nombre (item name)          | name       |
| `telefono`         | Teléfono (`lead_phone`)     | phone      |
| `email`            | E-mail (`lead_email`)       | email      |
| `codigoPostal`     | Código Postal               | text       |
| `edad`             | Rango Edad                  | status     |
| `idioma`           | Idioma preferido            | dropdown   |
| `dormitorios`      | Detalle tipología           | dropdown   |
| `presupuesto`      | Presupuesto                 | status     |
| `destinoVivienda`  | Destino vivienda            | status     |
| `zonasComunes`     | Anejos                      | dropdown   |
| `privacidad`       | Política de Privacidad      | checkbox   |
| *(automático)*     | Fecha de entrada            | date       |

---

## 1 · Variables de entorno

Copia `.env.example` a `.env.local` y rellena:

```
MONDAY_API_KEY=   # Settings → Administration → API en Monday
MONDAY_BOARD_ID=  # El número al final de la URL del tablero
```

---

## 2 · Subir a GitHub

```bash
git init
git add .
git commit -m "feat: monday webhook"
gh repo create monday-webhook --public --push --source=.
# o con git remote normal:
# git remote add origin https://github.com/TU_USUARIO/monday-webhook.git
# git push -u origin main
```

---

## 3 · Desplegar en Vercel

### Opción A — CLI
```bash
npm i -g vercel
vercel         # sigue el wizard, conecta el repo
vercel env add MONDAY_API_KEY
vercel env add MONDAY_BOARD_ID
vercel --prod
```

### Opción B — Dashboard
1. Entra en [vercel.com](https://vercel.com) → **Add New Project**
2. Importa tu repo de GitHub
3. En **Environment Variables** añade `MONDAY_API_KEY` y `MONDAY_BOARD_ID`
4. Haz clic en **Deploy**

Tu endpoint quedará en:
```
https://TU-PROYECTO.vercel.app/api/webhook
```

---

## 4 · Probar con Postman

**Method:** `POST`  
**URL:** `https://TU-PROYECTO.vercel.app/api/webhook`  
**Headers:**
```
Content-Type: application/json
```
**Body (raw JSON):**
```json
{
  "nombre": "Juan Pérez García",
  "telefono": "+34 600 123 456",
  "email": "juan@email.com",
  "destinoVivienda": "primera",
  "codigoPostal": "03530",
  "edad": "31-45",
  "idioma": "Castellano",
  "dormitorios": ["2 Dormitorios", "3 Dormitorios"],
  "presupuesto": "300K - 350K",
  "zonasComunes": ["Piscina Infinity", "Gimnasio", "Zonas ajardinadas"],
  "privacidad": true
}
```

**Respuesta esperada (200):**
```json
{
  "success": true,
  "message": "Lead registrado en Monday.com",
  "monday_item_id": "1234567890",
  "monday_item_name": "Juan Pérez García"
}
```

---

## 5 · Conectar desde Lovable

En tu formulario de Lovable, haz el `fetch` al endpoint:

```js
await fetch("https://TU-PROYECTO.vercel.app/api/webhook", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(formData),
});
```

---

## Valores de `destinoVivienda` soportados

| Valor en formulario | Label en Monday     |
|---------------------|---------------------|
| `primera`           | Primera vivienda    |
| `segunda`           | Segunda vivienda    |
| `inversion`         | Inversión           |

> Si los labels exactos de tus columnas Status/Dropdown en Monday son diferentes, actualiza los mapeos en `api/webhook.js`.
