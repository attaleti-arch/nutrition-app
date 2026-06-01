import { Anthropic } from '@anthropic-ai/sdk';

const COACH_SYSTEM_PROMPT = `אתה מאמן NLP מומחה בשיטת אתי אטל. נתח תשובות של לקוחה והפק JSON למעטפת NLP מובנית:
{
  "well_formed_outcome": { "vision": "תיאור חושי ומפורט של המטרה", "sensory_evidence": "איך היא תדע שהיא שם" },
  "limiting_beliefs_map": [{ "original_quote": "ציטוט הלקוחה", "belief_type": "חוסר אונים/ערך/שייכות", "challenge_question": "שאלת ערעור כירורגית" }],
  "ecology_and_buffers": { "secondary_gain": "הרווח המשני שלה", "replacement_anchor": "הצעה לפעולה או משפט עוגן" }
}`;

export async function analyzeClientResponses(responses: any) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20240620',
    system: COACH_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: JSON.stringify(responses) }]
  });
  return JSON.parse(response.content[0].text);
}
