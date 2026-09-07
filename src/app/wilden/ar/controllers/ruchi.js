// ─── רוחי: משב ───
// ציפור רוח. גבוה יותר מדבשון — הוא נישא, לא מזמזם — וכשלוחצים עליו הוא
// נסחף עם הרוח למקום אחר. שלוש לחיצות, כמו כולם.

import { makeFlyer, PHASE } from './flyer.js'

const ruchi = makeFlyer({
  id: 'gust',
  target: 'ruchi',
  elev: { HUM: 22, FLY: 26, HOVER: 14 },
  copy: {
    [PHASE.HUM]: { line: 'משהו מרשרש באוויר.', sub: 'הרימו את הטלפון גבוה וחפשו. לחצו עליו!' },
    [PHASE.FLY]: { line: 'הוא נסחף עם הרוח!', sub: 'מצאו אותו שוב ולחצו עליו.' },
    [PHASE.HOVER]: { line: 'הוא מרחף מעליכם.', sub: 'לחצו עליו כדי לתפוס!' },
  },
})

export default ruchi
