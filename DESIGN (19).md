---
version: alpha
name: Expert Services
description: A premium digital and physical consulting agency website utilizing a dark, high-contrast theme with futuristic typography and professional spacing.
colors:
  black: "#000000"
  white: "#ffffff"
  accent-gold: "#fabe1a"
  theme-primary: "#3c3c3c"
  theme-light: "#f2f2f2"
typography:
  families:
    headings: "Michroma, sans-serif"
    body: "Montserrat, sans-serif"
  sizes:
    h1: "3rem"
    h2: "2.25rem"
    h4: "1.25rem"
    body-lg: "18px"
    small: "0.875em"
  weights:
    regular: 400
    medium: 500
    bold: 700
spacing:
  root-padding: "12vw"
  block-gap: "40px"
  section-margin: "140px"
rounded:
  default: "10px"
  card: "18px"
  pill: "9999px"
components:
  button:
    backgroundColor: "{colors.accent-gold}"
    color: "{colors.white}"
    borderRadius: "{rounded.pill}"
    padding: "calc(0.667em + 2px) calc(1.333em + 2px)"
    fontFamily: "{typography.families.headings}"
  card:
    backgroundColor: "{colors.theme-primary}"
    borderRadius: "{rounded.default}"
    border: "1px solid #00000026"
---

## Overview
Expert Services features a sophisticated, modern aesthetic tailored for a high-end digital agency and consultancy. The visual personality is dominated by a deep black background contrasted with crisp white typography and tactical hits of golden-yellow accenting. The tone is authoritative and professional, utilizing the futuristic wide-set Michroma typeface to establish an "expert" identity. Layout density is airy, with significant vertical padding (140px) between major sections to emphasize focus on specific service areas. Motion is a key characteristic, with elements frequently using fade-in and slide-in-up animations to create a dynamic, responsive feel as the user scrolls.

## Colors
The palette is strictly semantic and high-contrast. The primary background role is fulfilled by `#000000` (Black), providing a dark canvas that makes white text highly legible. Semantic accents utilize `#fabe1a` (Accent Gold) for primary calls to action and submit buttons, signaling high importance. Decorative elements and separators use `#3c3c3c` to create subtle structural boundaries without breaking the dark immersion. Hover states and secondary backgrounds utilize translucent whites or greys (`rgba(255,255,255,0.1)`) to maintain depth on the black background.

## Typography
The typographic hierarchy is defined by two primary families. Michroma, a geometric sans-serif with a futuristic, wide stance, is reserved for all headings (H1-H6) and primary buttons, lending an industrial and professional tone. Montserrat handles all body prose and descriptions, chosen for its clarity and geometric alignment with the brand's sharp edges. Sizing is generous, with body text starting at 18px to ensure readability across large viewports. Headings utilize a scale that ranges from 2.25rem for section titles to 1.25rem for component headers.

## Layout
The site follows a structured grid with a heavy reliance on a constrained container centered with a maximum width of approximately 1200px (standard wide-size). A signature layout pattern is the wide horizontal padding of 12vw on large screens, which narrows the content focus significantly. Spacing is governed by a consistent rhythm of 40px to 60px between blocks, and larger 140px gaps between major thematic sections. Flexbox is used for service lists, frequently alternating between column-based headers and list-based service descriptions.

## Elevation & Depth
Depth is achieved through layering rather than complex shadows. The background uses a subtle radial gradient (`bg-gradient.webp`) in featured sections to create a sense of light source behind content. Cards use thin 1px borders (`#3c3c3c`) to separate themselves from the background. One notable elevation technique is the use of `sticky` positioning for service headers, allowing them to remain visible as the user scrolls through list items, creating a layered vertical hierarchy.

## Shapes
Shape language alternates between extreme roundness and sharp structural lines. Buttons and the navigation pill use a 9999px radius for a friendly, approachable touch. In contrast, cards and secondary containers use a subtle 10px to 18px corner radius. The service list items are strictly rectangular, separated by 1px horizontal strokes, reinforcing the "trade and industrial" aspect of the agency's branding.

## Components
- **Service List**: Items separated by horizontal rules, featuring a sequential numbering system (e.g., 01, 02) and a 45px wide webp arrow icon for navigation.
- **Hero Header**: A transparent navigation bar that overlays a high-impact background, using a list-style menu with 31px horizontal spacing.
- **Action Button**: Bold golden-yellow buttons (`#fabe1a`) with centered Michroma text, designed for maximum visibility against the dark theme.
- **Floating Chat**: An animated floating button for immediate interaction, fixed to the viewport corner.

## Do's and Don'ts
- **Do** use Michroma for all primary headings and internal navigation labels to maintain brand voice.
- **Do** preserve the 12vw side margins to keep the aesthetic centered and "premium."
- **Do** use the `#fabe1a` gold exclusively for interactive elements like buttons and links.
- **Don't** use light-colored backgrounds for main content blocks; the brand is fundamentally dark-mode.
- **Don't** use standard sans-serif fonts for headings; always use the wide-set geometric Michroma.
- **Don't** decrease the vertical spacing between sections, as it will make the site feel cluttered and lower-value.

## Accessibility
The site maintains high contrast (White on Black) for text readability. Focus states are visible, particularly on buttons and navigation links. Target sizes for primary links and the floating chat button are generous, exceeding the minimum 44px recommended size. The layout uses semantic HTML5 tags (header, nav, main, figure) to assist screen readers. Motion is utilized but respects the system's `prefers-reduced-motion` setting by disabling animations when necessary. Type sizes are large (minimum 18px for body) to accommodate users with visual impairments.

## Assets
- **Icon (Arrow)**: https://experts.com.pk/wp-content/themes/oigny-lite/assets/img/arrow-icon.webp — Used in service lists to indicate clickability.
- **Gradient Background**: https://experts.com.pk/wp-content/themes/oigny-lite/assets/img/bg-gradient.webp — Used in the feature section for depth.
- **Square Icon**: https://experts.com.pk/wp-content/themes/oigny-lite/assets/img/square-icon.svg — Used as a decorative bullet point before section headings.
- **Hero/Project Image**: https://experts.com.pk/wp-content/uploads/2025/05/website-front-page-upload-1-edited.jpeg — Representative project imagery for RFID Protection.
- **Inline Context**: https://experts.com.pk/a — Specific context used in html inline style url() for backgrounds.