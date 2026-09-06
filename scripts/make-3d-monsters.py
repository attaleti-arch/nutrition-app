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

def write_glb(parts, path):
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

    gltf = {
        'asset': {'version': '2.0', 'generator': 'hunt-monsters'},
        'scene': 0, 'scenes': [{'nodes': list(range(len(nodes)))}],
        'nodes': nodes, 'meshes': meshes, 'materials': materials,
        'accessors': accessors, 'bufferViews': views,
        'buffers': [{'byteLength': len(bin_blob)}],
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

    for i, (m, color, rough, metal, alpha) in enumerate(parts):
        mesh = UsdGeom.Mesh.Define(stage, f'/Root/part_{i}')
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
    p = [(xform(sphere(0.90, 56, 72, squash=0.95), t=(0, 0.92, 0)), body, 0.62, 0.0, 1.0)]
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


MONSTERS = {'puch': puch}

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
