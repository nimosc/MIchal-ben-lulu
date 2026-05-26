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
  "קובץ PPTX תקין (ZIP) עם שקופית שער (slide1) ושקופית קטלוג לדוגמה (slide2).",
  "כל שדה דינמי בתבנית בפורמט {{שם_משתנה}} — באנגלית, ללא רווחים (למשל {{mark}}, {{productTitle}}).",
  "החלפה מתבצעת רק בתוך תיבות טקסט; אל תשימו {{משתנה}} בשמות צורות או מאפייני XML.",
  "בשקופית הקטלוג: {{productUrl}} לקישור מוצר, {{mountingInstructionsLabel}} + {{mountingInstructionsUrl}} להוראות התקנה.",
  "בטבלאות: עמודת ערכים עם {{reflector}}, {{lensCover}} וכו׳ — תווית בעברית נשארת בעמודת הכותרת.",
] as const;

export const ALL_TEMPLATE_VARIABLES = CATALOG_TEMPLATE_VAR_NAMES.map((name) => `{{${name}}}`);

export const CATALOG_TEMPLATE_FIELD_GUIDE: CatalogTemplateFieldSection[] = [
  {
    title: "שקופית שער",
    fields: [
      { label: "שם פרויקט", source: "שם הפרויקט", templateAnchor: "{{projectName}}" },
      { label: "שם קומה", source: "שם הקומה", templateAnchor: "{{floorName}}" },
      { label: "מהדורה וחודש", source: "תאריך נוכחי", templateAnchor: "{{editionLine}}" },
      { label: "שנה", source: "שנה נוכחית", templateAnchor: "{{year}}" },
    ],
  },
  {
    title: "כותרת וזיהוי מוצר",
    fields: [
      { label: "סימון (Mark)", source: "שדה סימון בפריט", templateAnchor: "{{mark}}" },
      { label: "שם מוצר", source: "שם מהסקרייפ", templateAnchor: "{{productTitle}}" },
      { label: "יצרן", source: "יצרן מהסקרייפ", templateAnchor: "{{manufacturer}}" },
      { label: "דגם / שורת דגם ויצרן", source: "דגם מהסקרייפ", templateAnchor: "{{modelManufacturer}}" },
      { label: "מק\"ט / דגם", source: "model מהסקרייפ", templateAnchor: "{{sku}}" },
      {
        label: "שם פרויקט בכותרת",
        source: "שם הפרויקט",
        templateAnchor: "כתב כמויות תאורה | {{projectName}}",
      },
      { label: "חדרים", source: "חדרי הפריט בקומה", templateAnchor: "{{roomNames}}" },
    ],
  },
  {
    title: "שורת מפרט (תחתית שמאל)",
    fields: [
      { label: "תיאור גוף", source: "תיאור מוצר / תיאור גוף", templateAnchor: "{{description}}" },
      { label: "CRI", source: "סקרייפ", templateAnchor: "{{cri}}" },
      { label: "לומן", source: "סקרייפ", templateAnchor: "{{lumens}}" },
      { label: "טמפרטורת צבע", source: "סקרייפ", templateAnchor: "{{colorTemp}}" },
      { label: "וואט", source: "סקרייפ", templateAnchor: "{{watt}}" },
      { label: "מתח / זרם", source: "סקרייפ", templateAnchor: "{{voltageCurrent}}" },
      { label: "כמות כוללת", source: "סכום כמויות בחדרים", templateAnchor: "{{totalUnits}}" },
      { label: "יחידת מידה", source: "יח׳ / מטר בפריט", templateAnchor: "{{unitLabel}}" },
      { label: "IP", source: "סקרייפ", templateAnchor: "{{ip}}" },
      {
        label: "מקור אור/נורה",
        source: "סקרייפ",
        templateAnchor: "מקור אור/נורה: {{lightSource}}",
      },
    ],
  },
  {
    title: "טבלאות מפרט (3 עמודות)",
    description: "בעמודת הערכים בלבד — {{שם_שדה}}",
    fields: [
      { label: "רפלקטור", source: "סקרייפ", templateAnchor: "{{reflector}}" },
      { label: "עדשה/כיסוי", source: "סקרייפ", templateAnchor: "{{lensCover}}" },
      { label: "זווית הארה", source: "סקרייפ", templateAnchor: "{{beamAngle}}" },
      { label: "כיוונון", source: "סקרייפ", templateAnchor: "{{adjustment}}" },
      { label: "פיזור אור", source: "סקרייפ", templateAnchor: "{{lightDistribution}}" },
      { label: "אורך חיים של מקור האור", source: "סקרייפ", templateAnchor: "{{lampLife}}" },
      { label: "יעילות גוף תאורה", source: "סקרייפ", templateAnchor: "{{efficiency}}" },
      { label: "רמת סינוור", source: "סקרייפ", templateAnchor: "{{glare}}" },
      { label: "מיקום ציוד עזר", source: "שדה בפריט", templateAnchor: "{{driverLocation}}" },
      { label: "שיטת שליטה", source: "שדה בפריט", templateAnchor: "{{dimmingMethod}}" },
      { label: "צבע גמר", source: "סקרייפ", templateAnchor: "{{finishColor}}" },
      { label: "מידת גוף קוטר", source: "סקרייפ", templateAnchor: "{{bodyDiameter}}" },
      { label: "מידת גוף רוחב", source: "סקרייפ", templateAnchor: "{{bodyWidth}}" },
      { label: "מידת גוף גובה", source: "סקרייפ", templateAnchor: "{{bodyHeight}}" },
      { label: "סוג רוזטה", source: "סקרייפ", templateAnchor: "{{rosetteType}}" },
      { label: "יבואן", source: "שדה בפריט", templateAnchor: "{{importer}}" },
    ],
  },
  {
    title: "קישורים, תמונה והערות",
    fields: [
      {
        label: "קישור מוצר",
        source: "קישור מוצר בפריט",
        templateAnchor: "{{productUrl}}",
        notes: "TextBox 13 + hyperlink rId5",
      },
      {
        label: "הוראות התקנה — טקסט קישור",
        source: "טקסט קבוע (ניתן לשנות בתבנית)",
        templateAnchor: "{{mountingInstructionsLabel}}",
        notes: "ברירת מחדל: «קישור לדף הוראות התקנת גוף תאורה»",
      },
      {
        label: "הוראות התקנה — כתובת",
        source: "mounting_instructions_url מהסקרייפ",
        templateAnchor: "{{mountingInstructionsUrl}}",
        notes: "ממולא ל-hyperlink rId6; אפשר גם להציג כ-URL בתבנית",
      },
      { label: "תמונת מוצר", source: "תמונה מהסקרייפ", templateAnchor: "מחליף image1.png (לא {{}})" },
      { label: "הערה תחתון 1", source: "טקסט קבוע", templateAnchor: "{{footerNote1}}" },
      { label: "הערה תחתון 2", source: "טקסט קבוע", templateAnchor: "{{footerNote2}}" },
    ],
  },
];
