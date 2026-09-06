#!/usr/bin/env python3
# ─── מחולל היצורים בתלת-ממד ───
# היצורים מצוירים ב-SVG כצורות פשוטות: כדור, קונוס, אליפסה. אותן צורות
# בדיוק אפשר לבנות כרשת תלת-ממדית — ואז הן עומדות על המדרכה דרך המצלמה.
#
# .glb  → אנדרואיד (Scene Viewer) + תצוגה תלת-ממדית בכל דפדפן
# .usdz → אייפון (AR Quick Look), וזה מה שמאפשר AR בלי אפליקציה
#
# מה שהופך את זה לחמוד ולא לזול: נורמלים חלקים, פרופורציות נדיבות,
# ובעיקר נצנוץ בעיניים. בלי הנצנוץ זה כדור עם שתי נקודות.

import json, struct, math, os, sys

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'monsters3d')

# ── גיאומטריה ──

class Mesh:
    def __init__(self):
        self.v, self.n, self.f = [], [], []

    def add(self, other):
        base = len(self.v)
        self.v += other.v
        self.n += other.n
        self.f += [(a + base, b + base, c + base) for a, b, c in other.f]
        return self


def sphere(r=1.0, rings=40, sectors=56, squash=1.0):
    m = Mesh()
    for i in range(rings + 1):
        phi = math.pi * i / rings
        for j in range(sectors + 1):
            th = 2 * math.pi * j / sectors
            x, y, z = math.sin(phi) * math.cos(th), math.cos(phi), math.sin(phi) * math.sin(th)
            m.n.append((x, y, z))                  # נורמל של הכדור לפני המעיכה
            m.v.append((x * r, y * r * squash, z * r))
    for i in range(rings):
        for j in range(sectors):
            a = i * (sectors + 1) + j
            b = a + sectors + 1
            m.f += [(a, b, a + 1), (a + 1, b, b + 1)]
    return m


def cone(r=1.0, h=2.0, seg=32):
    m = Mesh()
    slant = math.hypot(r, h)
    nr, ny = h / slant, r / slant
    apex = len(m.v)
    for j in range(seg + 1):                        # קודקוד משוכפל לכל פאה
        th = 2 * math.pi * (j + 0.5) / seg
        m.v.append((0.0, h, 0.0))
        m.n.append((math.cos(th) * nr, ny, math.sin(th) * nr))
    ring = len(m.v)
    for j in range(seg + 1):
        th = 2 * math.pi * j / seg
        m.v.append((math.cos(th) * r, 0.0, math.sin(th) * r))
        m.n.append((math.cos(th) * nr, ny, math.sin(th) * nr))
    for j in range(seg):
        m.f.append((apex + j, ring + j, ring + j + 1))
    cap = len(m.v)
    m.v.append((0.0, 0.0, 0.0)); m.n.append((0.0, -1.0, 0.0))
    start = len(m.v)
    for j in range(seg + 1):
        th = 2 * math.pi * j / seg
        m.v.append((math.cos(th) * r, 0.0, math.sin(th) * r))
        m.n.append((0.0, -1.0, 0.0))
    for j in range(seg):
        m.f.append((cap, start + j + 1, start + j))
    return m


def xform(m, s=(1, 1, 1), rot=(0, 0, 0), t=(0, 0, 0)):
    rx, ry, rz = [math.radians(a) for a in rot]

    def rotate(p):
        x, y, z = p
        y, z = y * math.cos(rx) - z * math.sin(rx), y * math.sin(rx) + z * math.cos(rx)
        x, z = x * math.cos(ry) + z * math.sin(ry), -x * math.sin(ry) + z * math.cos(ry)
        x, y = x * math.cos(rz) - y * math.sin(rz), x * math.sin(rz) + y * math.cos(rz)
        return (x, y, z)

    out = Mesh()
    out.f = list(m.f)
    for p in m.v:
        x, y, z = rotate((p[0] * s[0], p[1] * s[1], p[2] * s[2]))
        out.v.append((x + t[0], y + t[1], z + t[2]))
    for nv in m.n:
        x, y, z = rotate((nv[0] / s[0], nv[1] / s[1], nv[2] / s[2]))
        ln = math.sqrt(x * x + y * y + z * z) or 1.0
        out.n.append((x / ln, y / ln, z / ln))
    return out


def hexrgb(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


# ── ייצוא GLB ──

# ── תנועת החיים ──
# כדור דומם נקרא ככדור. נשימה, מעיכה וקפיצה קלה הופכות אותו ליצור.
# הלולאה: קפיצה קטנה למעלה, ואז מעיכה בנחיתה — squash & stretch קלאסי.
IDLE_T = [0.0, 0.45, 0.90, 1.25, 1.70]
IDLE_POS = [(0, 0, 0), (0, 0.075, 0), (0, 0, 0), (0, -0.018, 0), (0, 0, 0)]
IDLE_SCALE = [(1, 1, 1), (0.965, 1.06, 0.965), (1, 1, 1), (1.05, 0.94, 1.05), (1, 1, 1)]


def write_glb(parts, path, animate=True):
    """parts: [(mesh, hexcolor, roughness, metallic, alpha)]"""
    bin_blob = b''
    accessors, views, meshes, materials, nodes = [], [], [], [], []

    for idx, (m, color, rough, metal, alpha) in enumerate(parts):
        vb = b''.join(struct.pack('<3f', *p) for p in m.v)
        nb = b''.join(struct.pack('<3f', *p) for p in m.n)
        ib = b''.join(struct.pack('<I', i) for tri in m.f for i in tri)

        def push(data, target):
            nonlocal bin_blob
            while len(bin_blob) % 4:
                bin_blob += b'\0'
            off = len(bin_blob)
            bin_blob += data
            views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(data), 'target': target})
            return len(views) - 1

        vv, nv, iv = push(vb, 34962), push(nb, 34962), push(ib, 34963)
        mn = [min(p[i] for p in m.v) for i in range(3)]
        mx = [max(p[i] for p in m.v) for i in range(3)]
        accessors.append({'bufferView': vv, 'componentType': 5126, 'count': len(m.v),
                          'type': 'VEC3', 'min': mn, 'max': mx})
        accessors.append({'bufferView': nv, 'componentType': 5126, 'count': len(m.n), 'type': 'VEC3'})
        accessors.append({'bufferView': iv, 'componentType': 5125, 'count': len(m.f) * 3, 'type': 'SCALAR'})

        materials.append({
            'pbrMetallicRoughness': {
                'baseColorFactor': hexrgb(color) + [alpha],
                'metallicFactor': metal, 'roughnessFactor': rough,
            },
            'doubleSided': False,
            **({'alphaMode': 'BLEND'} if alpha < 1 else {}),
        })
        meshes.append({'primitives': [{
            'attributes': {'POSITION': idx * 3, 'NORMAL': idx * 3 + 1},
            'indices': idx * 3 + 2, 'material': idx,
        }]})
        nodes.append({'mesh': idx})

    # כל החלקים נעשים ילדים של שורש אחד, כדי שאפשר יהיה להניע את היצור
    # כולו בערוץ אחד במקום להניע שלושים חלקים בנפרד
    root = {'children': list(range(len(nodes)))}
    nodes = nodes + [root]
    root_idx = len(nodes) - 1

    animations = []
    if animate:
        def push_raw(data, target=None):
            nonlocal bin_blob
            while len(bin_blob) % 4:
                bin_blob += b'\0'
            off = len(bin_blob)
            bin_blob += data
            v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
            if target:
                v['target'] = target
            views.append(v)
            return len(views) - 1

        tv = push_raw(b''.join(struct.pack('<f', t) for t in IDLE_T))
        accessors.append({'bufferView': tv, 'componentType': 5126, 'count': len(IDLE_T),
                          'type': 'SCALAR', 'min': [min(IDLE_T)], 'max': [max(IDLE_T)]})
        t_acc = len(accessors) - 1

        def vec_acc(vals):
            bv = push_raw(b''.join(struct.pack('<3f', *v) for v in vals))
            accessors.append({'bufferView': bv, 'componentType': 5126,
                              'count': len(vals), 'type': 'VEC3'})
            return len(accessors) - 1

        p_acc, s_acc = vec_acc(IDLE_POS), vec_acc(IDLE_SCALE)
        animations.append({
            'name': 'idle',
            'samplers': [
                {'input': t_acc, 'output': p_acc, 'interpolation': 'LINEAR'},
                {'input': t_acc, 'output': s_acc, 'interpolation': 'LINEAR'},
            ],
            'channels': [
                {'sampler': 0, 'target': {'node': root_idx, 'path': 'translation'}},
                {'sampler': 1, 'target': {'node': root_idx, 'path': 'scale'}},
            ],
        })

    gltf = {
        'asset': {'version': '2.0', 'generator': 'hunt-monsters'},
        'scene': 0, 'scenes': [{'nodes': [root_idx]}],
        'nodes': nodes, 'meshes': meshes, 'materials': materials,
        'accessors': accessors, 'bufferViews': views,
        'buffers': [{'byteLength': len(bin_blob)}],
        **({'animations': animations} if animations else {}),
    }
    js = json.dumps(gltf, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    bb = bin_blob + b'\0' * ((4 - len(bin_blob) % 4) % 4)
    glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bb))
    glb += struct.pack('<II', len(js), 0x4E4F534A) + js
    glb += struct.pack('<II', len(bb), 0x004E4942) + bb
    open(path, 'wb').write(glb)
    return len(glb)


# ── ייצוא USDZ (AR באייפון) ──

def write_usdz(parts, path):
    from pxr import Usd, UsdGeom, UsdShade, Sdf, Gf, Vt
    usda = path.replace('.usdz', '.usdc')
    stage = Usd.Stage.CreateNew(usda)
    UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
    UsdGeom.SetStageMetersPerUnit(stage, 1.0)
    root = UsdGeom.Xform.Define(stage, '/Root')
    stage.SetDefaultPrim(root.GetPrim())

    # אותה תנועה גם ב-AR של אייפון. בלי זה היצור עומד קפוא על המדרכה,
    # וזה בדיוק הרגע שבו הוא צריך להיראות חי.
    fps = 24.0
    stage.SetTimeCodesPerSecond(fps)
    stage.SetStartTimeCode(0)
    stage.SetEndTimeCode(IDLE_T[-1] * fps)
    tr = root.AddTranslateOp()
    sc = root.AddScaleOp()
    for t, pos, scl in zip(IDLE_T, IDLE_POS, IDLE_SCALE):
        tr.Set(Gf.Vec3d(*pos), time=t * fps)
        sc.Set(Gf.Vec3f(*scl), time=t * fps)

    for i, (m, color, rough, metal, alpha) in enumerate(parts):
        mesh = UsdGeom.Mesh.Define(stage, f'/Root/part_{i}')   # ילד של השורש המונפש
        mesh.CreatePointsAttr(Vt.Vec3fArray([Gf.Vec3f(*p) for p in m.v]))
        mesh.CreateNormalsAttr(Vt.Vec3fArray([Gf.Vec3f(*p) for p in m.n]))
        mesh.SetNormalsInterpolation(UsdGeom.Tokens.vertex)
        mesh.CreateFaceVertexCountsAttr(Vt.IntArray([3] * len(m.f)))
        mesh.CreateFaceVertexIndicesAttr(Vt.IntArray([i for tri in m.f for i in tri]))
        mesh.CreateSubdivisionSchemeAttr(UsdGeom.Tokens.none)

        mat = UsdShade.Material.Define(stage, f'/Root/mat_{i}')
        sh = UsdShade.Shader.Define(stage, f'/Root/mat_{i}/surf')
        sh.CreateIdAttr('UsdPreviewSurface')
        r, g, b = hexrgb(color)
        sh.CreateInput('diffuseColor', Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(r, g, b))
        sh.CreateInput('roughness', Sdf.ValueTypeNames.Float).Set(rough)
        sh.CreateInput('metallic', Sdf.ValueTypeNames.Float).Set(metal)
        if alpha < 1:
            sh.CreateInput('opacity', Sdf.ValueTypeNames.Float).Set(alpha)
        mat.CreateSurfaceOutput().ConnectToSource(sh.ConnectableAPI(), 'surface')
        UsdShade.MaterialBindingAPI(mesh).Bind(mat)

    stage.GetRootLayer().Save()
    from pxr import UsdUtils
    UsdUtils.CreateNewUsdzPackage(Sdf.AssetPath(usda), path)
    os.remove(usda)
    return os.path.getsize(path)


# ── היצורים ──
# הפרופורציות זהות ל-SVG: ראש גדול, עיניים גדולות, גוף קטן. זה מה שקורא
# כחמוד ולא כמפחיד.

def eyes(gap=0.30, y=0.10, z=0.80, r=0.115):
    """עיניים מט. roughness נמוך על צבע כהה נותן כדור כרום, לא עין."""
    p = []
    for sx in (-1, 1):
        p.append((xform(sphere(r, 24, 32), s=(1, 1, 0.75), t=(sx * gap, y, z)),
                  '#181C16', 0.9, 0.0, 1.0))
        p.append((xform(sphere(r * 0.30, 14, 18), t=(sx * gap + 0.042, y + 0.048, z + 0.055)),
                  '#FFFFFF', 0.35, 0.0, 1.0))
    return p


def smile(y=-0.14, z=0.80, w=0.20, depth=0.10, n=22, color='#1C2018', r=0.030):
    """קשת מכדורים קטנים. אין טורוס, וזה קורא נקי יותר מכל צורה אחרת."""
    out = []
    for i in range(n):
        t = i / (n - 1)
        x = (t - 0.5) * 2 * w
        yy = y - math.sin(math.pi * t) * depth * 0.55 + depth * 0.25
        # מרכז הקשת בולט קדימה, אחרת הקצוות שוקעים לתוך הכדור ונעלמים
        zz = z + math.sin(math.pi * t) * 0.035
        out.append((xform(sphere(r, 10, 12), t=(x, yy, zz)), color, 0.9, 0.0, 1.0))
    return out


def ear(color, sx, tilt, base=(0.52, 1.46, -0.02), size=(0.17, 0.42, 0.13)):
    """אוזן מכדור מוארך ולא מקונוס. לקונוס יש פנים חלול ובסיס פתוח,
    ושניהם נראים על המסך כמו נייר מקופל."""
    return (xform(sphere(1.0, 26, 34), s=size, rot=(0, 0, sx * tilt),
                  t=(sx * base[0], base[1], base[2])), color, 0.55, 0.0, 1.0)


def puch():
    body, dark = '#8FB9E8', '#5E8FC4'
    p = [(xform(sphere(0.90, 56, 72, squash=0.95), t=(0, 0.92, 0)), body, 0.78, 0.0, 1.0)]
    p += [ear(dark, -1, 22), ear(dark, 1, 22)]
    p += eyes(gap=0.29, y=1.00, z=0.79)
    p += smile(y=0.74, z=0.84)
    for sx in (-1, 1):                                   # לחיים — שקופות מעט, צמודות לפנים
        p.append((xform(sphere(0.115, 22, 28), s=(1, 0.6, 0.3), t=(sx * 0.50, 0.83, 0.70)),
                  '#E8907F', 0.75, 0.0, 0.42))
    for sx in (-1, 1):                                   # רגליים
        p.append((xform(sphere(0.21, 22, 28), s=(1, 0.58, 1.2), t=(sx * 0.33, 0.12, 0.08)),
                  dark, 0.65, 0.0, 1.0))
    return p


def cyl(r=0.1, h=0.4, seg=18):
    m = Mesh()
    for y in (0.0, h):
        for j in range(seg + 1):
            th = 2 * math.pi * j / seg
            m.v.append((math.cos(th) * r, y, math.sin(th) * r))
            m.n.append((math.cos(th), 0.0, math.sin(th)))
    for j in range(seg):
        a, b = j, j + seg + 1
        m.f += [(a, b, a + 1), (a + 1, b, b + 1)]
    return m


def star_prism(outer=1.0, inner=0.42, points=5, depth=0.34, rot=90.0):
    """כוכב אמיתי: מצולע עשרה-קודקודים שמוצא לעובי. ניסיון להרכיב כוכב
    מכדורים או מקונוסים נותן עלי כותרת, לא כוכב."""
    m = Mesh()
    ring = []
    for i in range(points * 2):
        a = math.radians(rot + i * 180.0 / points)
        r = outer if i % 2 == 0 else inner
        ring.append((math.cos(a) * r, math.sin(a) * r))
    hz = depth / 2

    for sign in (1, -1):                         # שתי הפאות
        c = len(m.v)
        m.v.append((0.0, 0.0, sign * hz)); m.n.append((0.0, 0.0, float(sign)))
        base = len(m.v)
        for x, y in ring:
            m.v.append((x, y, sign * hz)); m.n.append((0.0, 0.0, float(sign)))
        for i in range(len(ring)):
            a, b = base + i, base + (i + 1) % len(ring)
            m.f.append((c, a, b) if sign > 0 else (c, b, a))

    for i in range(len(ring)):                   # דפנות
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % len(ring)]
        nx, ny = y2 - y1, -(x2 - x1)
        ln = math.hypot(nx, ny) or 1.0
        nx, ny = nx / ln, ny / ln
        k = len(m.v)
        for (x, y, z) in ((x1, y1, hz), (x2, y2, hz), (x2, y2, -hz), (x1, y1, -hz)):
            m.v.append((x, y, z)); m.n.append((nx, ny, 0.0))
        m.f += [(k, k + 1, k + 2), (k, k + 2, k + 3)]
    return m


def rock(r=1.0, seed=3):
    """כדור מעוות. הרעש נגזר מהכיוון ולא מהאינדקס — אחרת שני הקודקודים
    שיושבים על אותו תפר מקבלים ערכים שונים, והכדור נפתח לרווחה."""
    m = sphere(1.0, 30, 40)
    out = Mesh()
    out.f = list(m.f)
    for p in m.v:
        # שלושה גלים בכיוונים שונים — לא אקראי, אבל נראה אקראי
        k = (1.0
             + 0.055 * math.sin(p[0] * 3.1 + seed)
             + 0.045 * math.sin(p[1] * 3.7 + seed * 2)
             + 0.040 * math.sin(p[2] * 2.9 + seed * 3))
        out.v.append((p[0] * k * r, p[1] * k * r, p[2] * k * r))
    # נורמלים מחדש מהפאות, אחרת ההצללה שייכת לכדור המקורי
    acc = [[0.0, 0.0, 0.0] for _ in out.v]
    for a, b, c in out.f:
        pa, pb, pc = out.v[a], out.v[b], out.v[c]
        u = (pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2])
        w = (pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2])
        nx = u[1] * w[2] - u[2] * w[1]
        ny = u[2] * w[0] - u[0] * w[2]
        nz = u[0] * w[1] - u[1] * w[0]
        for i in (a, b, c):
            acc[i][0] += nx; acc[i][1] += ny; acc[i][2] += nz
    for v in acc:
        ln = math.sqrt(v[0]**2 + v[1]**2 + v[2]**2) or 1.0
        out.n.append((v[0]/ln, v[1]/ln, v[2]/ln))
    return out


def gilgul():
    body, dark = '#F2B366', '#C9862F'
    p = [(xform(sphere(0.90, 56, 72), t=(0, 0.90, 0)), body, 0.78, 0.0, 1.0)]
    for i in range(7):                                   # בלורית מסולסלת
        t = i / 6
        p.append((xform(sphere(0.10 - t * 0.045, 18, 22),
                        t=(math.sin(t * 5.0) * 0.24, 1.62 + t * 0.26, 0.10 + math.cos(t * 5.0) * 0.14)),
                  dark, 0.7, 0.0, 1.0))
    p += eyes(gap=0.28, y=0.98, z=0.80)
    p += smile(y=0.70, z=0.85, w=0.19)
    for sx in (-1, 1):
        p.append((xform(sphere(0.11, 22, 28), s=(1, 0.6, 0.3), t=(sx * 0.50, 0.80, 0.70)),
                  '#E8907F', 0.75, 0.0, 0.42))
    return p


def anafon():
    body, dark = '#9DC98A', '#6C9B57'
    p = [(xform(sphere(0.88, 56, 72, squash=1.02), t=(0, 0.88, 0)), body, 0.8, 0.0, 1.0)]
    p.append((xform(cyl(0.045, 0.34, 14), t=(0, 1.70, 0)), dark, 0.7, 0.0, 1.0))
    for sx, tilt in ((-1, 34), (1, -34)):                # שני עלים
        p.append((xform(sphere(1.0, 24, 30), s=(0.30, 0.10, 0.17), rot=(0, 0, tilt),
                        t=(sx * 0.24, 2.02, 0)), dark, 0.65, 0.0, 1.0))
    p += eyes(gap=0.28, y=0.96, z=0.78)
    p += smile(y=0.68, z=0.83, w=0.18)
    for sx in (-1, 1):
        p.append((xform(sphere(0.115, 22, 28), s=(1, 0.6, 0.3), t=(sx * 0.50, 0.78, 0.68)),
                  '#E8907F', 0.75, 0.0, 0.42))
    return p


def nitznitz():
    body, dark = '#F2D06B', '#C9A32B'
    p = [(xform(star_prism(1.05, 0.44, 5, 0.40), t=(0, 0.95, 0)), body, 0.6, 0.0, 1.0)]
    p += eyes(gap=0.27, y=1.02, z=0.22, r=0.135)
    p += smile(y=0.76, z=0.24, w=0.19, depth=0.09)
    return p


def zanvan():
    body, dark = '#E39BC0', '#BF6A93'
    p = [(xform(sphere(0.84, 56, 72, squash=0.98), t=(0, 0.88, 0)), body, 0.8, 0.0, 1.0)]
    p += [ear(dark, -1, 26, base=(0.46, 1.40, -0.04), size=(0.15, 0.36, 0.12)),
          ear(dark, 1, 26, base=(0.46, 1.40, -0.04), size=(0.15, 0.36, 0.12))]
    for i in range(9):                                   # זנב מתעגל
        t = i / 8
        p.append((xform(sphere(0.15 - t * 0.085, 18, 24),
                        t=(0.62 + math.sin(t * 2.4) * 0.42, 0.62 + t * 0.72, -0.34 - t * 0.16)),
                  dark, 0.75, 0.0, 1.0))
    p += eyes(gap=0.27, y=0.94, z=0.75)
    p += smile(y=0.66, z=0.80, w=0.17)
    for sx in (-1, 1):
        p.append((xform(sphere(0.11, 22, 28), s=(1, 0.6, 0.3), t=(sx * 0.48, 0.76, 0.65)),
                  '#E8907F', 0.75, 0.0, 0.42))
    return p


def avnon():
    body, dark = '#9A9185', '#6E6659'
    p = [(xform(rock(0.92, seed=5), t=(0, 0.90, 0)), body, 0.95, 0.0, 1.0)]
    p.append((xform(rock(0.30, seed=11), t=(-0.46, 1.62, -0.10)), dark, 0.95, 0.0, 1.0))
    p += eyes(gap=0.29, y=1.02, z=0.80)
    p += smile(y=0.74, z=0.84, w=0.20)
    for sx in (-1, 1):
        p.append((xform(rock(0.19, seed=17 + sx), t=(sx * 0.42, 0.10, 0.16)), dark, 0.95, 0.0, 1.0))
    return p


MONSTERS = {'puch': puch, 'gilgul': gilgul, 'anafon': anafon,
            'nitznitz': nitznitz, 'zanvan': zanvan, 'avnon': avnon}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, fn in MONSTERS.items():
        parts = fn()
        g = write_glb(parts, os.path.join(OUT, f'{name}.glb'))
        print(f'{name}.glb   {g/1024:6.0f} KB   ({len(parts)} parts, '
              f'{sum(len(m.f) for m,*_ in parts)} triangles)')
        try:
            u = write_usdz(parts, os.path.join(OUT, f'{name}.usdz'))
            print(f'{name}.usdz  {u/1024:6.0f} KB')
        except Exception as e:
            print(f'{name}.usdz  FAILED: {e}')
