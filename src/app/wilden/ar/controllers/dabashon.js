// ─── דבשון: הזמזום ───
// דבורה. הוא לא משאיר עקבות על הרצפה — הוא באוויר. המפגש שלו הוא זמזום
// שמתחזק כשמכוונים נכון, ואז הוא מרחף מעל הראש. שלוש לחיצות, כמו נימי:
// מרחף → לחיצה → עף למקום אחר → לחיצה → נעצר קרוב → לחיצה → נתפס.

import { makeFlyer, PHASE } from './flyer.js'

export { PHASE }

const dabashon = makeFlyer({
  id: 'buzz',
  target: 'dabashon',
  copy: {
    [PHASE.HUM]: { line: 'משהו מזמזם.', sub: 'הרימו את הטלפון וחפשו באוויר. לחצו עליו!' },
    [PHASE.FLY]: { line: 'הוא עף!', sub: 'מצאו אותו שוב ולחצו עליו.' },
    [PHASE.HOVER]: { line: 'הוא מרחף מולכם.', sub: 'לחצו עליו כדי לתפוס!' },
  },
})

export default dabashon
