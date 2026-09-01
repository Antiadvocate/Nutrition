import { GoogleGenAI, Type } from '@google/genai';

export async function analyzeFood(description: string, images: string[]) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const schema = {
    type: Type.OBJECT,
    properties: {
      simpleName: { type: Type.STRING, description: "A short, clean name for the food (e.g., 'Chicken Breast', 'Banana')" },
      emoji: { type: Type.STRING, description: "A single emoji that best represents this food (e.g., 🍎, 🍗, 🥗, 🍚)" },
      quantity: { type: Type.STRING, description: "The amount (e.g., '150g', '1 medium', '2 slices')" },
      baseQuantity: { type: Type.NUMBER, description: "The numeric value of the quantity (e.g., 150 for 150g)" },
      unit: { type: Type.STRING, description: "The unit of measurement (e.g., 'g', 'medium', 'slices')" },
      calories: { type: Type.NUMBER, description: "Total calories" },
      protein: { type: Type.NUMBER, description: "Total protein in grams" },
      carbs: { type: Type.NUMBER, description: "Total carbohydrates in grams" },
      fats: { type: Type.NUMBER, description: "Total fats in grams" },
      fiber: { type: Type.NUMBER, description: "Total fiber in grams" },
      giIndex: { type: Type.STRING, description: "Glycemic Index category (Low, Medium, High)" },
      satiety: { type: Type.STRING, description: "Satiety level (Low, Medium, High)" },
      sodium: { type: Type.NUMBER, description: "Sodium in mg" },
      potassium: { type: Type.NUMBER, description: "Potassium in mg" },
      iron: { type: Type.NUMBER, description: "Iron in mg" },
      calcium: { type: Type.NUMBER, description: "Calcium in mg" },
      vitaminC: { type: Type.NUMBER, description: "Vitamin C in mg" },
      vitaminD: { type: Type.NUMBER, description: "Vitamin D in mcg" },
      processingScore: { type: Type.NUMBER, description: "NOVA classification from 1 (unprocessed) to 4 (ultra-processed)" },
      processingCategory: { type: Type.STRING, description: "Degree of processing: e.g. 'Minimally Processed', 'Processed', 'Ultra-Processed'" },
      ingredients: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: "List of ingredients utilized (e.g., ['Salmon', 'Salt', 'Dill'])" 
      },
      positives: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: "Downsides or upsides of ingredients utilized - upsides/benefits" 
      },
      negatives: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: "Downsides or upsides of ingredients utilized - downsides/risks/negatives" 
      }
    },
    required: ["simpleName", "emoji", "quantity", "baseQuantity", "unit", "calories", "protein", "carbs", "fats", "fiber", "giIndex", "satiety", "sodium", "potassium", "iron", "calcium", "vitaminC", "vitaminD", "processingScore", "processingCategory", "ingredients", "positives", "negatives"]
  };

  const parts: any[] = [{ text: `Analyze this food and provide nutritional data: ${description}` }];
  
  images.forEach(img => {
    const base64Data = img.split(',')[1];
    const mimeType = img.split(';')[0].split(':')[1];
    parts.push({ inlineData: { data: base64Data, mimeType } });
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    }
  });

  return JSON.parse(response.text!);
}

export async function generateCommentary(entries: any[], totals: any, targets: any, isEndOfDay: boolean = false) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `
    Analyze this nutrition data for the day.
    Targets: ${targets.calories} kcal, ${targets.protein}g protein, ${targets.carbs}g carbs, ${targets.fats}g fats.
    Current: ${Math.round(totals.calories)} kcal, ${Math.round(totals.protein)}g protein, ${Math.round(totals.carbs)}g carbs, ${Math.round(totals.fats)}g fats.
    Foods eaten: ${entries.map(e => e.simpleName).join(', ') || 'Nothing yet'}.
    
    Provide a short, witty, slightly existential but motivating commentary on their progress.
    ${isEndOfDay ? 'This is the end of the day summary.' : ''}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt
  });

  return response.text!;
}

export async function generateSatietyAnalysis(entries: any[]) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `
    Analyze the satiety and glycemic impact of these foods:
    ${entries.map(e => `${e.simpleName} (GI: ${e.giIndex}, Satiety: ${e.satiety})`).join('\n')}
    
    Provide a brief 2-sentence analysis of how full the user should feel and their energy stability.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt
  });

  return response.text!;
}

export async function autoCompleteDayMeals(
  historyFoods: any[],
  currentFoods: any[],
  remaining: { calories: number; protein: number; carbs: number; fats: number; fiber: number },
  isHealthyRemix: boolean
) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const historyDescription = historyFoods.length > 0 
    ? historyFoods.map(f => `${f.simpleName} (${f.calories} kcal, ${f.protein}g P, ${f.carbs}g C, ${f.fats}g F)`).join(', ')
    : "None";

  const currentDescription = currentFoods.length > 0
    ? currentFoods.map(f => `${f.simpleName} (${f.calories} kcal, ${f.protein}g P)`).join(', ')
    : "No food registered yet today.";

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        simpleName: { type: Type.STRING, description: "A simple, clean food name (e.g., 'Scrambled Eggs with Spinach', 'Canned Tuna and Boiled Potato')" },
        emoji: { type: Type.STRING, description: "A single representative emoji (e.g., 🍳, 🥩, 🍵)" },
        quantity: { type: Type.STRING, description: "Portion description (e.g. '2 large eggs', '150g chicken breast')" },
        baseQuantity: { type: Type.NUMBER, description: "Multiplier (e.g., 2 or 1)" },
        unit: { type: Type.STRING, description: "Portion unit (e.g. 'eggs', 'serving', 'cup')" },
        calories: { type: Type.NUMBER, description: "Total calories for this item (integer)" },
        protein: { type: Type.NUMBER, description: "Total protein in grams" },
        carbs: { type: Type.NUMBER, description: "Total carbohydrates in grams" },
        fats: { type: Type.NUMBER, description: "Total fats in grams" },
        fiber: { type: Type.NUMBER, description: "Total fiber in grams" },
        giIndex: { type: Type.STRING, description: "Glycemic Index category (Low, Medium, High, None)" },
        satiety: { type: Type.STRING, description: "Satiety rating (Low, Medium, High)" },
        sodium: { type: Type.NUMBER, description: "Sodium content in mg" },
        potassium: { type: Type.NUMBER, description: "Potassium content in mg" },
        iron: { type: Type.NUMBER, description: "Iron content in mg" },
        calcium: { type: Type.NUMBER, description: "Calcium content in mg" },
        vitaminC: { type: Type.NUMBER, description: "Vitamin C in mg" },
        vitaminD: { type: Type.NUMBER, description: "Vitamin D in mcg" },
        processingScore: { type: Type.NUMBER, description: "NOVA scale from 1 (raw) to 4 (ultra-processed)" },
        processingCategory: { type: Type.STRING, description: "Degree of processing: e.g. 'Minimally Processed', 'Processed', 'Ultra-Processed'" },
        ingredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Ingredients needed" },
        positives: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Nutritional benefits" },
        negatives: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Nutritional downsides/risks/additives if any" },
        time: { type: Type.STRING, description: "Suggested timestamp suited for remaining schedule (e.g. '8:30 AM', '1:00 PM', '4:30 PM', '7:00 PM')" }
      },
      required: [
        "simpleName", "emoji", "quantity", "baseQuantity", "unit", 
        "calories", "protein", "carbs", "fats", "fiber", "giIndex", "satiety",
        "sodium", "potassium", "iron", "calcium", "vitaminC", "vitaminD",
        "processingScore", "processingCategory", "ingredients", "positives", "negatives", "time"
      ]
    }
  };

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
    1. The sum total of calories and macros (Protein, Carbs, Fats) across your proposed items must MATCH THE REMAINING TARGETS as closely as possible (within +/- 30 kcal and +/- 4g macronutrients). If remaining calories are less than 100 kcal, you can return a very basic light snack or tea. If remaining calories are 0 or negative, return an empty array [] without failing.
    2. Suggest BASICS ONLY. Meals should be simple, single-staple foods that anyone has in their pantry/kitchen (e.g., egg, spinach, oats, milk, chicken breast, canned tuna, apple, avocado, white/brown rice, potato, peanut butter, whole wheat bread). No extravagant, complex, restaurant-level, or expensive foods. It must represent standard pantry basics.
    3. Make sure the 'time' field reflects when this food should be added (e.g., if breakfast and lunch are logged already, suggest 'Dinner' at '7:00 PM' or a 'Snack' at '4:30 PM').
    4. Fill all micronutrients (sodium, potassium, iron, calcium, vitaminC, vitaminD) and the NOVA processing details accurately based on the meal composition.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    }
  });

  return JSON.parse(response.text!);
}

export async function generateDailyBriefing(entries: any[], targets: any, totals: any) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const entrySummary = entries.map(e => (
    `- ${e.simpleName}: ${e.calories} kcal, Protein: ${e.protein}g, Carbs: ${e.carbs}g, Fats: ${e.fats}g, Fiber: ${e.fiber || 0}g, Satiety: ${e.satiety || 'Medium'}, Glycemic Index: ${e.giIndex || 'Low'}, Degree of Processing: ${e.processingCategory || 'Minimally Processed'} (NOVA ${e.processingScore || 1}), Sodium: ${e.sodium || 0}mg, Potassium: ${e.potassium || 0}mg.`
  )).join('\n');

  const prompt = `
    You are an expert nutrition advisor and behavioral health coach. Look over today's nutrition logs and write a "Daily Briefing".
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

    Your goal is to write a highly customized daily briefing of 3 concise sections. Keep the tone existential, intelligent, direct, slightly witty but motivating:
    1. **The Verdict**: Write 2 sentences on how today is going relative to their goals. Call out if they are overeating carbs, lacking protein, or hit their targets perfectly.
    2. **Successes & Red Flags**: List 2 bullet points of things they did right (e.g., opted for low-glycemic, minimized ultra-processed foods, perfect potassium-to-sodium ratio) and 2 bullet points of things to watch out for/danger zones (e.g., excessive sodium, high ultra-processed food ratio, low fiber causing low satiety).
    3. **Pantry Checklist**: Give 2 quick, concrete food ideas or behavior tweaks for their next meal to balance today's remaining macro/micro targets.

    Return the final response rendered in clean, beautiful Markdown.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt
  });

  return response.text!;
}

export async function generateWeeklyBriefing(days: Record<string, any>, profiles: any[], dayProfiles: Record<number, string>) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  // Aggregate history
  const daySummary = Object.entries(days).map(([date, dayData]: [string, any]) => {
    // Determine profile
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
    You are an expert nutrition analyst and behavioral coach. Analyze the user's weekly log history and generate a "Weekly Coach Briefing".
    
    Here is the recorded history of logs:
    ${daySummary || 'No weekly logs registered yet.'}

    If there are no logs or very few, explain that a larger baseline is needed, but give some general actionable targets to strive for.
    If logs exist, analyze:
    - Calorie consistency (are they under or over-shooting targets on average?)
    - Ultra-processed food dependency (what percentage of calories are ultra-processed NOVA 4?)
    - Protein retention trend.
    
    Structure your Briefing with these 3 sections in clean Markdown:
    1. **Weekly Scorecard**: Evaluate their calorie and macro compliance over the week.
    2. **Strategic Blindspots**: Identify 2 specific things they need to watch out for (e.g. over-compensating on rest days, processed food heavy weekends, low protein density).
    3. **Action Blueprint**: 2-3 specific behavioral shifts for the upcoming week based on their baseline data.
    
    Ensure the style is professional, insightful, analytical, and highly structured.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt
  });

  return response.text!;
}

