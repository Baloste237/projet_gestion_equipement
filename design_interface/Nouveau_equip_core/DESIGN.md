---
name: Technical Precision
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#20201f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#c3c6d3'
  on-secondary: '#2c303a'
  secondary-container: '#454953'
  on-secondary-container: '#b5b8c5'
  tertiary: '#2fd9f4'
  on-tertiary: '#00363e'
  tertiary-container: '#009fb4'
  on-tertiary-container: '#002f36'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#dfe2ef'
  secondary-fixed-dim: '#c3c6d3'
  on-secondary-fixed: '#181c25'
  on-secondary-fixed-variant: '#434751'
  tertiary-fixed: '#a2eeff'
  tertiary-fixed-dim: '#2fd9f4'
  on-tertiary-fixed: '#001f25'
  on-tertiary-fixed-variant: '#004e5a'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353535'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.03em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin: 32px
---

## Brand & Style
The design system is engineered for high-stakes enterprise resource management. It prioritizes **sober technicality** and **operational trust** over decorative flair. The aesthetic is a refined interpretation of **Corporate Modernism**, utilizing a deep, multi-layered dark palette to reduce cognitive load during long periods of use. 

The personality is authoritative and precise, mirroring the hardware it manages. Visual hierarchy is achieved through meticulous spacing and tonal shifts rather than vibrant accents. The emotional response is one of stability, security, and absolute performance, ensuring that data traceability remains the focal point of the user experience.

## Colors
This design system utilizes a "layered carbon" approach. The primary canvas is **Carbon Black (#0D0D0D)**, providing a void-like foundation that eliminates screen glare.

- **Primary (Electric Blue):** Used strictly for primary actions, active states, and critical progress indicators.
- **Secondary (Midnight Blue):** Applied to sidebar navigations and subtle section headers to provide a "cool" depth contrast against the neutral greys.
- **Tertiary (Discrete Cyan):** Reserved for data visualization highlights, status "online" indicators, and micro-interactions.
- **Neutral (Anthracite):** The workhorse color for card surfaces, input fields, and borders.
- **Functional Colors:** Success (Emerald), Warning (Amber), and Error (Rose) must be desaturated to maintain the professional, technical tone.

## Typography
The system relies on **Inter** for its systematic, utilitarian legibility. It provides a neutral voice that scales perfectly from dense data tables to high-level dashboards.

**Technical Data:** For serial numbers, ID tags, and timestamps, use **JetBrains Mono**. This monospaced font reinforces the technical and "traceable" nature of the platform, ensuring characters are easily distinguishable in equipment logs.

**Hierarchy Rules:**
- Use `600` weight for headlines to provide enough contrast against dark backgrounds.
- Keep body text at `400` for maximum readability.
- Labels in monospaced font should always be uppercase or capitalized to distinguish them from standard prose.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a 12-column structure for desktop. To maintain a "premium" feel, the system uses generous whitespace (margins) around the primary container to prevent the UI from feeling cluttered despite high information density.

- **Desktop:** 12 columns, 24px gutters, 32px-48px side margins.
- **Tablet:** 8 columns, 16px gutters, 24px side margins.
- **Mobile:** 4 columns, 16px gutters, 16px side margins.

Use an 8px base grid for all internal component padding. Equipment cards and data modules should utilize `spacing.md` for internal padding to maintain an airy, sophisticated technical look.

## Elevation & Depth
In this dark-mode environment, depth is communicated through **Tonal Layering** and **Subtle Outlines** rather than heavy drop shadows.

- **Surface Level 0 (Base):** #0D0D0D.
- **Surface Level 1 (Cards/Panels):** #1A1A1A.
- **Surface Level 2 (Modals/Popovers):** #262626.

**Borders:** Use 1px solid borders for all containers. Border colors should be #333333 for standard elements and #3B82F6 at 20% opacity for focused or active elements.
**Shadows:** Use extremely soft, large-radius shadows (24px-48px blur) with 40% opacity of the background color to provide a "lift" effect for modals without creating a "glow."

## Shapes
The shape language is **Rounded**, striking a balance between modern friendliness and industrial precision.

- **Standard Elements:** 8px (`0.5rem`) for buttons, inputs, and small cards.
- **Large Containers:** 16px (`1rem`) for primary dashboard panels and main content areas.
- **Data Points:** 4px (`0.25rem`) for status tags and micro-indicators.

Avoid fully circular "pill" shapes for buttons to maintain a more "engineered" and professional appearance; stick to the defined 8px radius.

## Components
- **Buttons:** Primary buttons use a solid Electric Blue fill with white text. Secondary buttons use an Anthracite fill with a subtle 1px border.
- **Cards:** Cards are the core of the equipment management interface. They feature a #1A1A1A background, an 8px corner radius, and a 1px #262626 border.
- **Input Fields:** Backgrounds should be slightly darker than the card surface (#0D0D0D) to create an "inset" feel. Use a Cyan accent for the cursor and a 1px Electric Blue border on focus.
- **Chips/Status Tags:** Use a "Ghost" style—transparent background with a 1px border colored by status (e.g., Green for "Active", Amber for "Maintenance"). Text within tags should use the monospaced label font.
- **Lists:** Data tables and lists should use alternating row highlights (Zebra striping) using #151515 and #1A1A1A to improve horizontal traceability across wide equipment specs.
- **Icons:** Use Lucide or Heroicons with a "Regular" 2px stroke weight. Icons should be 20px within a 24px bounding box for optimal alignment with typography.