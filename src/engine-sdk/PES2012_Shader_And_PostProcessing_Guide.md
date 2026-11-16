# Pro Evolution Soccer 2012 (PS3 / Xbox 360 Era) Shader & Post-Processing Setup Guide

This guide documents how to replicate the exact **Pro Evolution Soccer 2012 (Winning Eleven 2012)** early-2010s PS3/Xbox 360 visual aesthetic in **Unity URP** and **Unreal Engine 5**.

---

## 1. Character Skin & Fitted 2011–2012 Kit Shader (Blinn-Phong Sweat & Polyester Sheen)

Early-2010s Konami football graphics relied on **Blinn-Phong specular lobes** (`pow(saturate(dot(N, H)), Shininess)`) rather than modern energy-conserving GGX PBR. This produces the signature slightly glossy sweat sheen on faces/forearms and crisp specular highlights along rigid cloth folds on polyester jerseys.

### Key Material Parameters
| Surface Layer | Diffuse Map | Normal Map | Specular Map | Blinn-Phong `Shininess` | Specular Tint |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Sweaty Human Skin** | Skin Albedo (`sRGB`) | Micro-pore normal (`Scale = 0.25`) | Forehead, nose bridge, cheekbone & forearm sweat mask | `38.0` | `#856858` (Warm Skin Spec) |
| **2011–2012 Fitted Jersey** | Team Kit Albedo (`sRGB`) | Baked rigid tension creases under chest, ribs & sleeves (`Scale = 0.85`) | Hexagonal polyester micro-mesh + fold ridge mask | `48.0` | `#607285` (Cool Satin Sheen) |
| **Sculpted Solid 3D Hair** | Solid hair base color | Sculpted clumped hair grooves (`Scale = 0.60`) | Crown band specular mask (no alpha cards) | `24.0` | `#2D3748` |
| **2012 Neon Boots** | Volt `#CCFF00` / Crimson `#FF1E56` | Molded synthetic upper ribs (`Scale = 0.50`) | High-gloss TPU shell mask | `92.0` | `#FFFFFF` |

### Unreal Engine 5 Material Graph Setup
1. Set **Shading Model** to **Default Lit** (or **Subsurface Profile** for skin).
2. To emulate PS3 Blinn-Phong in UE5:
   - Set **Specular** = `0.68` on skin and `0.62` on polyester kits.
   - Drive **Roughness** from `1.0 - (SweatOrPolyesterSpecMask * 0.58)` so forehead/cheekbone sweat zones drop to `Roughness = 0.28` and rigid jersey fold ridges drop to `Roughness = 0.32`.
   - Multiply a **Fresnel (`Exponent = 3.2`)** grazing highlight into **Emissive (`× 0.12`)** on white kits so stadium floodlights trigger bloom on jersey shoulders.

---

## 2. Warm Golden-Hour Directional Sunlight with High-Contrast Hard Shadows

PES 2012 daytime/dusk stadiums feature warm golden-hour sunlight paired with deep, high-contrast pitch shadows.

### Unity URP & Unreal Engine 5 Directional Light Settings
- **Light Rotation**: `Pitch = -36°`, `Yaw = -42°`, `Roll = 0°` (casts long diagonal player shadows across the turf).
- **Color Temperature / Tint**: `4600K` (`#FFCF75` warm golden amber).
- **Intensity**: `3.1` (Unity URP) / `11.5 lux` (UE5).
- **High-Contrast Hard Shadows**:
  - **Shadow Resolution**: `4096 × 4096`, `4 Cascades` (`Split 0 = 8m`, `Split 1 = 22m`, `Split 2 = 55m`).
  - **Shadow Softness / Filter**: Low (`PCF 2x2` or UE5 `Shadow Filter Sharpen = 0.78`) to preserve crisp PS3-era silhouette edges on the grass.
  - **Sky / Ambient Fill**: Deep stadium navy-blue (`#1A2C4E`, Intensity `0.55`) so shadowed jersey sides stay cool and high-contrast against the warm golden-hour key light.

---

## 3. Heavy Floodlight Bloom & Subtle Background Depth-of-Field (Post-Processing)

### Bloom Configuration (Stadium Floodlights & White Jerseys)
- **Threshold**: `0.82` (allows bright white jerseys, silver trophies, and stadium floodlight bulbs to spill into bloom).
- **Intensity**: `1.65` (Unity URP) / `1.45` (UE5 Convolution/Standard Bloom).
- **Scatter / Knee**: `0.78` with a subtle cyan-white tint (`#E0F7FA`) to replicate the multi-bulb floodlight glare and diagonal bokeh flares.

### Depth-of-Field (Broadcast Telephoto Lens Blur)
- **Mode**: Bokeh / Gaussian Depth of Field.
- **Focus Distance**: Dynamically bound to `(CameraPosition - ControlledPlayerPosition).magnitude` (typically `22m – 28m` in Wide Broadcast view, `4.5m` during replays/cutscenes).
- **Focal Length / Aperture**: `85mm` broadcast lens at `f/4.0` — keeps the pitch and players razor-sharp while softly blurring distant crowd tiers and stadium roof trusses.
