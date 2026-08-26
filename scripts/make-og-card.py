#!/usr/bin/env python3
"""
מייצר כרטיסיית שיתוף (Open Graph) למדריך, בעיצוב אחיד לכל המדריכים.

שימוש:
    python3 scripts/make-og-card.py \
        --out og-celiac.jpg \
        --title "במקום כריך" \
        --sub "ארוחת עשר לא צריכה להיות כבדה — היא" \
        --sub "צריכה להחזיק, ולא לחזור הביתה שלמה."

ברירות מחדל: תמונת החד-קרן (מזוהה ובטוחה), הסמל הנקי, ורקע הזית של האתר.
אחרי היצירה צריך להוסיף לעמוד את תגי og:image עם סימון גרסה חדש
(למשל ?v=3), אחרת פייסבוק יגיש את התמונה ששמורה אצלו במטמון.
"""
import argparse, pathlib, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
FONTS = ROOT / 'scripts' / 'og-fonts'

W, H = 1200, 630
OLIVE = (0x3E, 0x4B, 0x31)
CREAM = (0xF6, 0xF2, 0xE7)
GOLD = (0xDC, 0xC0, 0x77)
MUTE = (0xC3, 0xCD, 0xB8)


def build(out, title, sub_lines, eyebrow, photo_name, logo_name):
    im = Image.new('RGB', (W, H), OLIVE)

    if photo_name:
        photo = Image.open(PUBLIC / photo_name).convert('RGB')
        iw, ih = photo.size
        photo = photo.crop((0, 0, iw, int(ih * 0.97)))   # trim the strip some sources carry
        pw = int(W * 0.44)
        sc = max(pw / photo.width, H / photo.height)
        photo = photo.resize((int(photo.width * sc), int(photo.height * sc)), Image.LANCZOS)
        l, t = (photo.width - pw) // 2, (photo.height - H) // 2
        photo = photo.crop((l, t, l + pw, t + H))
        mask = Image.new('L', (pw, H), 255)
        md = ImageDraw.Draw(mask)
        fade = int(pw * 0.34)
        for i in range(fade):
            x = pw - 1 - i
            md.line([(x, 0), (x, H)], fill=int(255 * (i / fade) ** 1.5))
        im.paste(photo, (0, 0), mask)

    d = ImageDraw.Draw(im)
    R, y = W - 80, 116
    d.text((R, y), eyebrow, font=ImageFont.truetype(str(FONTS / 'Heebo-700.ttf'), 30),
           fill=GOLD, anchor='ra')
    y += 64
    d.text((R, y), title, font=ImageFont.truetype(str(FONTS / 'FrankRuhlLibre-900.ttf'), 92),
           fill=CREAM, anchor='ra')
    y += 116
    d.line([(R, y), (R - 200, y)], fill=GOLD, width=5)
    y += 40
    fs = ImageFont.truetype(str(FONTS / 'Heebo-400.ttf'), 31)
    for ln in sub_lines:
        d.text((R, y), ln, font=fs, fill=MUTE, anchor='ra')
        y += 45

    lg = Image.open(PUBLIC / logo_name).convert('RGBA')
    lh = 112
    lg = lg.resize((int(lg.width * lh / lg.height), lh), Image.LANCZOS)
    ly = H - lh - 38
    if ly <= y + 8:
        sys.exit(f'הטקסט ארוך מדי — הוא מתנגש בלוגו (טקסט מסתיים ב-{y}, לוגו מתחיל ב-{ly}). '
                 f'קצרו שורה או הורידו אחת.')
    im.paste(lg, (R - lg.width, ly), lg)

    dest = PUBLIC / out
    im.save(dest, 'JPEG', quality=90, optimize=True)
    print(f'נוצר {dest}  ({dest.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True, help='שם הקובץ בתוך public/, למשל og-celiac.jpg')
    ap.add_argument('--title', required=True, help='כותרת המדריך, שורה אחת')
    ap.add_argument('--sub', action='append', default=[], help='שורת תיאור; אפשר לחזור עליה')
    ap.add_argument('--eyebrow', default='מדריך להורים')
    ap.add_argument('--photo', default='food-art-unicorn.jpg',
                    help='תמונה מ-public/; --photo "" לכרטיסייה בלי תמונה')
    ap.add_argument('--logo', default='logo-mark-light.png')
    a = ap.parse_args()
    build(a.out, a.title, a.sub, a.eyebrow, a.photo or None, a.logo)
