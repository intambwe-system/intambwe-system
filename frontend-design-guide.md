# Frontend Design Guidelines for Claude Code

Use these guidelines to create distinctive, production-grade frontend interfaces that avoid generic AI aesthetics.

## Design Thinking Process

Before coding, commit to a BOLD aesthetic direction:

### 1. Understand Context
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick a clear direction (examples below - don't limit yourself to these)
  - Brutally minimal
  - Maximalist chaos
  - Retro-futuristic
  - Organic/natural
  - Luxury/refined
  - Playful/toy-like
  - Editorial/magazine
  - Brutalist/raw
  - Art deco/geometric
  - Soft/pastel
  - Industrial/utilitarian

### 2. Define Differentiation
- What makes this UNFORGETTABLE?
- What's the ONE thing someone will remember?

### 3. Execute with Precision
Bold maximalism and refined minimalism both work - the key is **intentionality**, not intensity.

---

## Design Principles

### Typography
✅ DO:
- Choose beautiful, unique, distinctive fonts
- Pair a display font with a refined body font
- Use characterful typefaces that elevate aesthetics

❌ NEVER USE:
- Inter, Roboto, Arial, system fonts
- Generic safe choices
- Same fonts across different projects

**Font Resources**: Google Fonts, Adobe Fonts, or custom web fonts

### Color & Theme
✅ DO:
- Commit to a cohesive aesthetic
- Use CSS variables for consistency
- Dominant colors with sharp accents
- Context-appropriate palettes

❌ AVOID:
- Purple gradients on white (cliché AI aesthetic)
- Timid, evenly-distributed palettes
- Same color scheme for every project

### Motion & Animation
✅ DO:
- Use animations for effects and micro-interactions
- CSS-only solutions for HTML
- Framer Motion for React when available
- High-impact moments: orchestrated page loads with staggered reveals
- Scroll-triggered effects
- Surprising hover states

**Key Principle**: One well-orchestrated entrance > scattered micro-interactions

### Layout & Composition
✅ DO:
- Unexpected layouts
- Asymmetry and overlap
- Diagonal flow
- Grid-breaking elements
- Generous negative space OR controlled density

❌ AVOID:
- Predictable, cookie-cutter layouts
- Same grid patterns every time

### Backgrounds & Visual Details
✅ DO:
- Create atmosphere and depth
- Add contextual effects and textures
- Use creative forms:
  - Gradient meshes
  - Noise textures
  - Geometric patterns
  - Layered transparencies
  - Dramatic shadows
  - Decorative borders
  - Custom cursors
  - Grain overlays

❌ AVOID:
- Plain solid color backgrounds by default
- Generic white/gray backgrounds without thought

---

## Anti-Patterns (NEVER DO THESE)

🚫 **Generic AI Aesthetics**:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Purple gradients on white backgrounds
- Predictable layouts and component patterns
- Cookie-cutter design lacking context-specific character

🚫 **Convergent Design**:
- Same choices across projects
- Safe, template-like outputs
- Space Grotesk for everything

---

## Implementation Guidelines

### Match Complexity to Vision
- **Maximalist designs** → Elaborate code with extensive animations and effects
- **Minimalist designs** → Restraint, precision, careful spacing, typography, subtle details

### Code Quality
- Production-grade and functional
- Visually striking and memorable
- Cohesive with clear aesthetic point-of-view
- Meticulously refined in every detail

### Accessibility
- Proper ARIA labels
- Keyboard navigation
- Color contrast ratios
- Screen reader support

---

## Usage Instructions

### For Claude Code CLI:

```bash
# Reference this file in your prompts
claude-code "Build a landing page following the design principles in frontend-design-guide.md"

# Or set as default instructions
claude-code --instructions frontend-design-guide.md "Create a portfolio site"
```

### In `.clauderc` file:

```markdown
Include: frontend-design-guide.md

Additional project-specific instructions:
- Target audience: [your audience]
- Brand personality: [your brand]
- Technical stack: [React/Vue/HTML/etc]
```

---

## Remember

**Claude is capable of extraordinary creative work.** Don't hold back - commit fully to a distinctive vision and execute it with precision. No two designs should look the same.

**The goal**: Create interfaces that make people say "Wow, this was clearly designed by a human" not "This looks like every other AI-generated site."