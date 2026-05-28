/** מדריך שדות לתבנית המצגת — מוצג בעמוד ההגדרות */

import { CATALOG_TEMPLATE_VAR_NAMES } from "@/lib/catalogTemplateVariables";

export type CatalogTemplateField = {
  label: string;
  source: string;
  templateAnchor: string;
  notes?: string;
};

export type CatalogTemplateFieldSection = {
  title: string;
  description?: string;
  fields: CatalogTemplateField[];
};

export const CATALOG_TEMPLATE_REQUIREMENTS = [
  "4 קבצי PPTX: שער (1 שקף), תמונה אחת (1 שקף), 2 תמונות (1 שקף), 3 תמונות (2 שקפים בקובץ אחד).",
  "מוצר עם 3 תמונות → תבנית «3 תמונות» בלבד: slide1 תמונה 1, slide2 תמונות 2+3.",
  "תבנית 3 תמונות: slide1 יכול לכלול מסגרת גדולה+קטנה (תישאר הגדולה); slide2 — שתי מסגרות (גם אם שתיהן מצביעות על אותו קובץ ב-rels).",
  "כל שדה דינמי בתבנית בפורמט {{שם_משתנה}} — בעברית, ללא רווחים (למשל {{סימון}}, {{שם_מוצר}}).",
  "החלפה מתבצעת רק בתוך תיבות טקסט; אל תשימו {{משתנה}} בשמות צורות או מאפייני XML.",
  "כפתורי קישור: סמנו ב-alt text של הצורה {{קישור_מוצר}} או {{קישור_הוראות_התקנה}} — עם URL יופיע כפתור, בלי URL יוסתר.",
  "בטבלאות: עמודת ערכים עם {{רפלקטור}}, {{עדשה_כיסוי}} וכו׳ — תווית בעברית נשארת בעמודת הכותרת.",
] as const;

export const ALL_TEMPLATE_VARIABLES = CATALOG_TEMPLATE_VAR_NAMES.map((name) => `{{${name}}}`);

export const CATALOG_TEMPLATE_FIELD_GUIDE: CatalogTemplateFieldSection[] = [
  {
    title: "שקופית שער",
    fields: [
      { label: "שם פרויקט", source: "שם הפרויקט", templateAnchor: "{{שם_פרויקט}}" },
      { label: "שם קומה", source: "שם הקומה", templateAnchor: "{{שם_קומה}}" },
      { label: "מהדורה וחודש", source: "תאריך נוכחי", templateAnchor: "{{מהדורה}}" },
      { label: "שנה", source: "שנה נוכחית", templateAnchor: "{{שנה}}" },
    ],
  },
  {
    title: "כותרת וזיהוי מוצר",
    fields: [
      { label: "סימון (Mark)", source: "שדה סימון בפריט", templateAnchor: "{{סימון}}" },
      { label: "שם מוצר", source: "שם מהסקרייפ", templateAnchor: "{{שם_מוצר}}" },
      { label: "יצרן", source: "יצרן מהסקרייפ", templateAnchor: "{{יצרן}}" },
      { label: "דגם / שורת דגם ויצרן", source: "דגם מהסקרייפ", templateAnchor: "{{דגם_יצרן}}" },
      { label: "מק\"ט / דגם", source: "model מהסקרייפ", templateAnchor: "{{מקט}}" },
      {
        label: "שם פרויקט בכותרת",
        source: "שם הפרויקט",
        templateAnchor: "כתב כמויות תאורה | {{שם_פרויקט}}",
      },
      { label: "חדרים", source: "חדרי הפריט בקומה", templateAnchor: "{{חדרים}}" },
    ],
  },
  {
    title: "שורת מפרט (תחתית שמאל)",
    fields: [
      { label: "תיאור גוף", source: "תיאור מוצר / תיאור גוף", templateAnchor: "{{תיאור}}" },
      { label: "CRI", source: "סקרייפ", templateAnchor: "{{cri}}" },
      { label: "לומן", source: "סקרייפ", templateAnchor: "{{לומן}}" },
      { label: "טמפרטורת צבע", source: "סקרייפ", templateAnchor: "{{טמפרטורת_צבע}}" },
      { label: "וואט", source: "סקרייפ", templateAnchor: "{{וואט}}" },
      { label: "מתח / זרם", source: "סקרייפ", templateAnchor: "{{מתח_זרם}}" },
      { label: "כמות כוללת", source: "סכום כמויות בחדרים", templateAnchor: "{{כמות_כוללת}}" },
      { label: "יחידת מידה", source: "יח׳ / מטר בפריט", templateAnchor: "{{יחידת_מידה}}" },
      { label: "IP", source: "סקרייפ", templateAnchor: "{{ip}}" },
      {
        label: "מקור אור/נורה",
        source: "סקרייפ",
        templateAnchor: "מקור אור/נורה: {{מקור_אור}}",
      },
    ],
  },
  {
    title: "טבלאות מפרט (3 עמודות)",
    description: "בעמודת הערכים בלבד — {{שם_שדה}}",
    fields: [
      { label: "רפלקטור", source: "סקרייפ", templateAnchor: "{{רפלקטור}}" },
      { label: "עדשה/כיסוי", source: "סקרייפ", templateAnchor: "{{עדשה_כיסוי}}" },
      { label: "זווית הארה", source: "סקרייפ", templateAnchor: "{{זווית_הארה}}" },
      { label: "כיוונון", source: "סקרייפ", templateAnchor: "{{כיוונון}}" },
      { label: "פיזור אור", source: "סקרייפ", templateAnchor: "{{פיזור_אור}}" },
      { label: "אורך חיים של מקור האור", source: "סקרייפ", templateAnchor: "{{אורך_חיים}}" },
      { label: "יעילות גוף תאורה", source: "סקרייפ", templateAnchor: "{{יעילות}}" },
      { label: "רמת סינוור", source: "סקרייפ", templateAnchor: "{{סינוור}}" },
      { label: "מיקום ציוד עזר", source: "שדה בפריט", templateAnchor: "{{מיקום_ציוד_עזר}}" },
      { label: "שיטת שליטה", source: "שדה בפריט", templateAnchor: "{{שיטת_שליטה}}" },
      { label: "צבע גמר", source: "סקרייפ", templateAnchor: "{{צבע_גמר}}" },
      { label: "מידת גוף קוטר", source: "סקרייפ", templateAnchor: "{{קוטר_גוף}}" },
      { label: "מידת גוף רוחב", source: "סקרייפ", templateAnchor: "{{רוחב_גוף}}" },
      { label: "מידת גוף גובה", source: "סקרייפ", templateAnchor: "{{גובה_גוף}}" },
      { label: "סוג רוזטה", source: "סקרייפ", templateAnchor: "{{סוג_רוזטה}}" },
      { label: "יבואן", source: "שדה בפריט", templateAnchor: "{{יבואן}}" },
    ],
  },
  {
    title: "קישורים, תמונה והערות",
    fields: [
      {
        label: "קישור מוצר (כפתור)",
        source: "קישור מוצר בפריט",
        templateAnchor: "{{קישור_מוצר}}",
        notes: "alt text של הצורה; rId5. אופציונלי: TextBox 13",
      },
      {
        label: "הוראות התקנה (כפתור)",
        source: "mounting_instructions_url מהסקרייפ",
        templateAnchor: "{{קישור_הוראות_התקנה}}",
        notes: "alt text של הצורה; rId6. בלי URL הכפתור לא יוצג",
      },
      {
        label: "הוראות התקנה — טקסט על הכפתור (אופציונלי)",
        source: "טקסט קבוע בתבנית",
        templateAnchor: "{{תווית_הוראות_התקנה}}",
        notes: "לא חובה — רק אם רוצים placeholder בטקסט בתוך הכפתור",
      },
      { label: "תמונת מוצר", source: "תמונה מהסקרייפ", templateAnchor: "מחליף image1.png (לא {{}})" },
      { label: "הערה תחתון 1", source: "טקסט קבוע", templateAnchor: "{{הערה1}}" },
      { label: "הערה תחתון 2", source: "טקסט קבוע", templateAnchor: "{{הערה2}}" },
    ],
  },
];
