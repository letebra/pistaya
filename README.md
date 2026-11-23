# PistaYa · Reserva de pistes esportives

Projecte 2 de *Programació d’Aplicacions en Tecnologia Web* (104740, UAB) · **Grup 8**
Leo Teruel Bravo · Eric Aljama Doncel · Gerard Canet Armans

PistaYa permet consultar instal·lacions esportives i les seves pistes, veure quines franges horàries estan lliures i reservar-les. L’administració gestiona instal·lacions, pistes i totes les reserves.

## Arquitectura (3 capes, dèbilment acoblades)

```
Navegador (SPA, CSR)          Vercel (serverless Node.js)            Supabase
┌────────────────────┐  REST  ┌──────────────────────────┐   REST   ┌───────────────────────┐
│ Presentació        │ ─────▶ │ Negoci  /api/*            │ ───────▶ │ Persistència          │
│ HTML + Bootstrap   │  JSON  │ validació, sanejament,    │ PostgREST│ PostgreSQL + RLS      │
│ + JavaScript       │ ◀───── │ regles, autorització, DAO │ ◀─────── │ Supabase Auth (JWT)   │
└────────────────────┘        └──────────────────────────┘          └───────────────────────┘
```

| Capa | Carpeta | Responsabilitat |
|---|---|---|
| Presentació | `public/` | SPA amb router per *hash*; les vistes es pinten al client (CSR) amb nodes DOM segurs. Validació HTML5 + JS. |
| Negoci | `api/`, `lib/negoci/`, `lib/validacio.js` | API REST pròpia. Autenticació (verifica el JWT), autorització per rol, validació i sanejament, regles de reserva. |
| Persistència | `lib/persistencia/`, `supabase/schema.sql` | Patró DAO sobre l’API REST de Supabase. Claus, restriccions, RLS i restricció d’exclusió anti-solapament. |

## Funcionalitats

* Registre i inici de sessió amb correu i contrasenya o amb **GitHub (OAuth)**.
* Llistat d’instal·lacions amb cerca i filtre per esport; detall amb les seves pistes.
* Reserva amb franges lliures en temps real, preu calculat al servidor, modificació, cancel·lació i historial.
* Administració: CRUD d’instal·lacions i pistes; consulta, cancel·lació i eliminació de totes les reserves.
* Missatges de confirmació i d’error, diàlegs de confirmació, interfície responsiva i accessible (WCAG AA).

## Regles de negoci

1. Dues reserves confirmades d’una pista no es poden solapar (API + restricció `EXCLUDE` a PostgreSQL).
2. Només es reserva dins l’horari de la instal·lació, en punt o i mitja, durades de 60/90/120 min.
3. No es reserva en el passat ni a més de 30 dies vista; màxim 3 reserves pendents per persona.
4. Modificar o cancel·lar només fins a 2 hores abans de l’inici.
5. No es pot eliminar una pista amb reserves (es desactiva) ni una instal·lació amb pistes.

## Seguretat

* Contrasenyes xifrades per Supabase Auth (bcrypt); sessions amb JWT verificat a cada petició.
* Autorització doble: per codi a l’API (`requerirAdmin`) i per **RLS** a la base de dades.
* Consultes parametritzades (PostgREST) → sense injecció SQL. Sanejament a la capa de negoci i renderització amb `textContent` → sense XSS. Capçaleres CSP, `X-Frame-Options`, `nosniff`.
* No s’exposen dades sensibles: errors genèrics al client, cap secret al codi (només la clau pública *anon*).

## Execució local

```bash
npm test          # proves unitàries (node:test)
npm run check     # comprovació de sintaxi
npm run dev       # http://localhost:3000
```

Base de dades: executar `supabase/schema.sql` a l’SQL Editor de Supabase i posar l’URL i la clau *anon* a `lib/config.js`.

## Desplegament

* **Vercel**: cada *push* a `main` desplega la SPA (`public/`, CDN) i les funcions de `api/` a la regió `dub1` (Dublín), al costat de la BBDD de Supabase (`eu-west-1`, Irlanda).
* **GitHub Actions** (`.github/workflows/ci.yml`): sintaxi i proves a cada *push*.
