import { chatJson, chatText, modelFor, type ChatPart } from './openrouter';

/** Shared JSON Schema for one analysed food item. */
function foodProperties(withTime: boolean) {
  const props: Record<string, any> = {
    simpleName: { type: 'string', description: "A short, clean name for the food (e.g., 'Chicken Breast', 'Banana')" },
    emoji: { type: 'string', description: 'A single emoji that best represents this food (e.g., 🍎, 🍗, 🥗, 🍚)' },
    quantity: { type: 'string', description: "The amount (e.g., '150g', '1 medium', '2 slices')" },
    baseQuantity: { type: 'number', description: 'The numeric value of the quantity (e.g., 150 for 150g). Never zero.' },
    unit: { type: 'string', description: "The unit of measurement (e.g., 'g', 'medium', 'slices')" },
    calories: { type: 'number', description: 'Total calories' },
    protein: { type: 'number', description: 'Total protein in grams' },
    carbs: { type: 'number', description: 'Total carbohydrates in grams' },
    fats: { type: 'number', description: 'Total fats in grams' },
    fiber: { type: 'number', description: 'Total fiber in grams' },
    giIndex: { type: 'string', description: 'Glycemic Index category (Low, Medium, High, None)' },
    satiety: { type: 'string', description: 'Satiety level (Low, Medium, High)' },
    sodium: { type: 'number', description: 'Sodium in mg' },
    potassium: { type: 'number', description: 'Potassium in mg' },
    iron: { type: 'number', description: 'Iron in mg' },
    calcium: { type: 'number', description: 'Calcium in mg' },
    vitaminC: { type: 'number', description: 'Vitamin C in mg' },
    vitaminD: { type: 'number', description: 'Vitamin D in mcg' },
    processingScore: { type: 'number', description: 'NOVA classification from 1 (unprocessed) to 4 (ultra-processed)' },
    processingCategory: { type: 'string', description: "Degree of processing: e.g. 'Minimally Processed', 'Processed', 'Ultra-Processed'" },
    ingredients: { type: 'array', items: { type: 'string' }, description: "List of ingredients utilized (e.g., ['Salmon', 'Salt', 'Dill'])" },
    positives: { type: 'array', items: { type: 'string' }, description: 'Upsides or benefits of the ingredients utilized' },
    negatives: { type: 'array', items: { type: 'string' }, description: 'Downsides, risks or additives of the ingredients utilized' },
  };
  if (withTime) {
    props.time = { type: 'string', description: "Suggested timestamp suited for the remaining schedule (e.g. '8:30 AM', '1:00 PM', '4:30 PM', '7:00 PM')" };
  }
  return props;
}

function foodItemSchema(withTime = false) {
  const properties = foodProperties(withTime);
  return {
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

const NUMERIC_FIELDS = [
  'baseQuantity', 'calories', 'protein', 'carbs', 'fats', 'fiber',
  'sodium', 'potassium', 'iron', 'calcium', 'vitaminC', 'vitaminD', 'processingScore',
] as const;

/** Models occasionally return numbers as strings, or drop a field. Square it up. */
function coerceFood(raw: any) {
  const food = { ...(raw || {}) };
  NUMERIC_FIELDS.forEach(field => {
    const value = Number(food[field]);
    food[field] = Number.isFinite(value) ? value : 0;
  });
  if (!food.baseQuantity) food.baseQuantity = 1;
  food.simpleName = String(food.simpleName || food.name || 'Logged Food');
  food.emoji = String(food.emoji || '🍽️');
  food.quantity = String(food.quantity || '1 serving');
  food.unit = String(food.unit || 'serving');
  food.giIndex = String(food.giIndex || 'Unknown');
  food.satiety = String(food.satiety || 'Medium');
  food.processingCategory = String(food.processingCategory || '');
  ['ingredients', 'positives', 'negatives'].forEach(field => {
    food[field] = Array.isArray(food[field]) ? food[field].map((x: any) => String(x)) : [];
  });
  return food;
}

export async function analyzeFood(description: string, images: string[]) {
  const parts: ChatPart[] = [
    { type: 'text', text: `Analyze this food and provide nutritional data: ${description}` },
  ];
  images.forEach(img => parts.push({ type: 'image_url', image_url: { url: img } }));

  const result = await chatJson<any>({
    model: modelFor(images.length > 0 ? 'vision' : 'text'),
    maxTokens: 2048,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content:
          'You are a precise nutrition analysis engine. Estimate the nutrition of the portion actually shown or described. ' +
          'Give a single best estimate for every field, never a range and never null.',
      },
      { role: 'user', content: parts },
    ],
    schema: { name: 'food_analysis', schema: foodItemSchema(false) },
  });

  return coerceFood(result);
}

export async function generateCommentary(entries: any[], totals: any, targets: any, isEndOfDay: boolean = false) {
  const prompt = `
    Analyze this nutrition data for the day.
    Targets: ${targets.calories} kcal, ${targets.protein}g protein, ${targets.carbs}g carbs, ${targets.fats}g fats.
    Current: ${Math.round(totals.calories)} kcal, ${Math.round(totals.protein)}g protein, ${Math.round(totals.carbs)}g carbs, ${Math.round(totals.fats)}g fats.
    Foods eaten: ${entries.map(e => e.simpleName).join(', ') || 'Nothing yet'}.

    Describe what the day has held. Do not grade it, do not congratulate, do not warn.
    Two or three sentences, plain and unhurried, the way you would mention the weather.
    ${isEndOfDay ? 'The day is closing.' : ''}
  `;

  return chatText({
    model: modelFor('text'),
    maxTokens: 500,
    temperature: 0.7,
    messages: [{ role: 'user', content: prompt }],
  });
}

export async function generateSatietyAnalysis(entries: any[]) {
  const prompt = `
    Analyze the satiety and glycemic impact of these foods:
    ${entries.map(e => `${e.simpleName} (GI: ${e.giIndex}, Satiety: ${e.satiety})`).join('\n')}

    In two sentences, describe how full this is likely to leave someone and how steady the energy is likely to be.
    Describe, do not advise.
  `;

  return chatText({
    model: modelFor('text'),
    maxTokens: 300,
    temperature: 0.5,
    messages: [{ role: 'user', content: prompt }],
  });
}

export async function autoCompleteDayMeals(
  historyFoods: any[],
  currentFoods: any[],
  remaining: { calories: number; protein: number; carbs: number; fats: number; fiber: number },
  isHealthyRemix: boolean,
) {
  const historyDescription = historyFoods.length > 0
    ? historyFoods.map(f => `${f.simpleName} (${f.calories} kcal, ${f.protein}g P, ${f.carbs}g C, ${f.fats}g F)`).join(', ')
    : 'None';

  const currentDescription = currentFoods.length > 0
    ? currentFoods.map(f => `${f.simpleName} (${f.calories} kcal, ${f.protein}g P)`).join(', ')
    : 'No food registered yet today.';

  const modePrompt = isHealthyRemix
    ? `MODE: HEALTHY REMIX. You MUST recommend ONLY minimally processed ingredients (NOVA 1 or 2), dense protein sources, dense fiber, and high vitamins. Aim for high satiety, and low Glycemic Index. Optimize the remaining calories in the healthiest way possible.`
    : `MODE: NORMAL PREFILL. Look at the user's favorite foods or previous logs and construct meals from those, simple scaled down or up, combined with common household staples (eggs, bread, oatmeal, potato, brown rice, milk, etc.) to hit remaining targets cleanly.`;

  const prompt = `
    You are a professional nutrition engine tasked with adding meals to complete the user's day.

    CRITICAL GOAL: We need to fill remaining nutrient targets:
    - Calories Remaining: ${remaining.calories} kcal
    - Protein Remaining: ${remaining.protein}g
    - Carbs Remaining: ${remaining.carbs}g
    - Fats Remaining: ${remaining.fats}g
    - Fiber Remaining: ${remaining.fiber}g

    Current state of foods eaten today:
    ${currentDescription}

    User typical/favorite foods catalog (prioritize/scale these if they fit):
    ${historyDescription}

    ${modePrompt}

    RULES:
    1. The sum total of calories and macros (Protein, Carbs, Fats) across your proposed items must MATCH THE REMAINING TARGETS as closely as possible (within +/- 30 kcal and +/- 4g macronutrients). If remaining calories are less than 100 kcal, you can return a very basic light snack or tea. If remaining calories are 0 or negative, return an empty meals array without failing.
    2. Suggest BASICS ONLY. Meals should be simple, single-staple foods that anyone has in their pantry/kitchen (e.g., egg, spinach, oats, milk, chicken breast, canned tuna, apple, avocado, white/brown rice, potato, peanut butter, whole wheat bread). No extravagant, complex, restaurant-level, or expensive foods. It must represent standard pantry basics.
    3. Make sure the 'time' field reflects when this food should be added (e.g., if breakfast and lunch are logged already, suggest 'Dinner' at '7:00 PM' or a 'Snack' at '4:30 PM').
    4. Fill all micronutrients (sodium, potassium, iron, calcium, vitaminC, vitaminD) and the NOVA processing details accurately based on the meal composition.

    Return an object shaped { "meals": [ ...food items... ] }.
  `;

  const result = await chatJson<any>({
    model: modelFor('text'),
    maxTokens: 4096,
    temperature: 0.4,
    messages: [{ role: 'user', content: prompt }],
    schema: {
      name: 'meal_plan',
      schema: {
        type: 'object',
        properties: {
          meals: { type: 'array', items: foodItemSchema(true), description: 'Meals that fill the remaining targets' },
        },
        required: ['meals'],
        additionalProperties: false,
      },
    },
  });

  const meals = Array.isArray(result) ? result : result?.meals;
  return (Array.isArray(meals) ? meals : []).map(coerceFood);
}

export async function generateDailyBriefing(entries: any[], targets: any, totals: any) {
  const entrySummary = entries.map(e => (
    `- ${e.simpleName}: ${e.calories} kcal, Protein: ${e.protein}g, Carbs: ${e.carbs}g, Fats: ${e.fats}g, Fiber: ${e.fiber || 0}g, Satiety: ${e.satiety || 'Medium'}, Glycemic Index: ${e.giIndex || 'Low'}, Degree of Processing: ${e.processingCategory || 'Minimally Processed'} (NOVA ${e.processingScore || 1}), Sodium: ${e.sodium || 0}mg, Potassium: ${e.potassium || 0}mg.`
  )).join('\n');

  const prompt = `
    You are reflecting back someone's day of eating. You are a mirror, not a judge.
    Today's Profile Targets:
    - Calories: ${targets.calories} kcal
    - Protein: ${targets.protein}g
    - Carbs: ${targets.carbs}g
    - Fats: ${targets.fats}g
    - Fiber: ${targets.fiber}g

    Today's Current Intake:
    - Calories: ${Math.round(totals.calories)} kcal
    - Protein: ${Math.round(totals.protein)}g
    - Carbs: ${Math.round(totals.carbs)}g
    - Fats: ${Math.round(totals.fats)}g
    - Fiber: ${Math.round(totals.fiber || 0)}g

    Logged Food Items:
    ${entrySummary || 'No food items logged yet for today.'}

    Write three short sections. Intelligent and direct, but with no praise, no blame and no
    corrective urging. The reference numbers are a description of an intention, not a standard
    to be met, and a day that sits far from them is not a failure.

    1. **What the day held**: Two sentences describing what was eaten and where it sits relative
       to the reference numbers. State it the way you would read a thermometer.
    2. **What's worth noticing**: Two or three observations about the food itself — texture of the
       day, how it is likely to have felt in the body, patterns present. Observations, not verdicts.
       Never use the words good, bad, should, failed or deserve.
    3. **An open question**: One question that hands attention back to them rather than instructing
       them. Something they could answer from their own experience, not from the data.

    Return clean Markdown. No preamble.
  `;

  return chatText({
    model: modelFor('text'),
    maxTokens: 1200,
    temperature: 0.6,
    messages: [{ role: 'user', content: prompt }],
  });
}

export async function generateWeeklyBriefing(days: Record<string, any>, profiles: any[], dayProfiles: Record<number, string>) {
  const daySummary = Object.entries(days).map(([date, dayData]: [string, any]) => {
    const dayOfWeek = new Date(date + 'T00:00:00').getDay();
    const profileId = dayProfiles[dayOfWeek];
    const target = profiles.find((p: any) => p.id === profileId)?.macros || { calories: 2000, protein: 150 };

    const entries = dayData.entries || [];
    const totals = entries.reduce((acc: any, e: any) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fats: acc.fats + (e.fats || 0),
      processedSum: acc.processedSum + ((e.processingScore === 4) ? (e.calories || 0) : 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, processedSum: 0 });

    return `Date: ${date}, Consumed: ${Math.round(totals.calories)} kcal (Target: ${target.calories}), Protein: ${Math.round(totals.protein)}g / ${target.protein}g, Ultra-processed calories: ${Math.round(totals.processedSum)} kcal, Item count: ${entries.length}`;
  }).join('\n');

  const prompt = `
    You are describing the shape of someone's eating over recent days. A mirror, not a coach.

    Here is the recorded history of logs:
    ${daySummary || 'No weekly logs registered yet.'}

    If there is little history, say so plainly and stop; do not fill the gap with generic advice.

    Structure it in clean Markdown as three short sections:
    1. **The shape of it**: What the days look like taken together — steadiness, variation, rhythm.
       Numbers where they help. No scoring, no percentage compliance.
    2. **Patterns**: Two things that recur. Name them without recommending anything about them.
       A pattern is information, not a problem.
    3. **Worth sitting with**: One question about their own experience of these days that the data
       cannot answer.

    Never use the words compliance, blindspot, deficit, cheat, discipline, should or failure.
  `;

  return chatText({
    model: modelFor('text'),
    maxTokens: 1400,
    temperature: 0.6,
    messages: [{ role: 'user', content: prompt }],
  });
}

export async function askCoach(question: string, context: { targets: any; totals: any; entries: any[] }) {
  const { targets, totals, entries } = context;
  const prompt = `
        A user has a nutrition question. Here is their data for today:
        - Targets: ${targets.calories} kcal, ${targets.protein}g protein, ${targets.carbs}g carbs, ${targets.fats}g fats
        - Current totals: ${Math.round(totals.calories)} kcal, ${Math.round(totals.protein)}g protein, ${Math.round(totals.carbs)}g carbs, ${Math.round(totals.fats)}g fats
        - Foods eaten: ${entries.map(e => e.simpleName).join(', ') || 'None'}

        Question: "${question}"

        Answer plainly and specifically. Where the honest answer is "it depends on what you notice",
        say that rather than inventing a rule. Do not moralise about any food. Use Markdown sections
        only if they genuinely help.
      `;

  return chatText({
    model: modelFor('text'),
    maxTokens: 1200,
    temperature: 0.6,
    messages: [{ role: 'user', content: prompt }],
  });
}
