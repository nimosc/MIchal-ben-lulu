# Lighting App

Next.js 14 app for lighting project management.

## פיתוח מקומי

```bash
cd lighting-app
npm install
npm run dev
```

פתח [http://localhost:3000](http://localhost:3000).

## `.next` — למה נשברים 404/500 ואיך למנוע

Next שומר **תיקייה אחת** (`.next`) ל-dev ול-production. אם מערבבים את שני המצבים (למשל `build` בזמן ש-`dev` רץ על פורט 3000), השרת מחפש קבצים שלא קיימים → שגיאות על `layout.css`, `main-app.js`, `page.js` וכו'.

### פקודות נכונות

| מטרה | פקודה |
|------|--------|
| פיתוח יומיומי | `npm run dev` |
| אחרי build / שגיאות static | `npm run dev:reset` |
| build לפרודקשן | עצור dev → `npm run build` → `npm run start` |
| Next עם הגנות (במקום `npx next`) | `npm run next -- build` / `npm run next -- dev` |

### אל תעשה

- `npm run build` כש-`npm run dev` רץ על 3000 (הסקריפט **יחסום** — זה מכוון)
- `npx next build` / `npx next dev` — **עוקף** את ההגנות; השתמש ב-`npm run …`
- שני טרמינלים עם `dev` במקביל

### סקריפטי הגנה (אוטומטיים)

- `scripts/next-guard.mjs` — בודק פורט 3000 לפני `build`, מנקה `.next` ישן לפני `dev`
- `scripts/ensure-dev-next.mjs` — מוחק שאריות production לפני dev
- `npm run dev:reset` — הורג 3000, מוחק `.next`, מפעיל dev נקי

## Deploy

```bash
npm run build
npm run start
```

או deploy ל-Netlify/Vercel לפי הגדרות הפרויקט.
