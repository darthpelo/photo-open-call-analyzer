/**
 * Template definitions for open call project initialization
 * Provides pre-configured templates for common photography competition types
 * Implements FR-3.4: Guided Project Initialization
 */

/**
 * Template configurations for different photography competition types
 */
const TEMPLATES = {
  portrait: {
    id: 'portrait',
    name: 'Portrait Photography',
    description: 'Competitions focused on portraits, people, and human expression',
    config: {
      title: 'Portrait Photography Competition',
      theme: 'Capture the essence of humanity through powerful portraits that reveal character, emotion, and storytelling. Focus on authentic expressions, connection between subject and viewer, and technical mastery in portraiture.',
      jury: [
        'Professional portrait photographer',
        'Magazine photo editor',
        'Fine art photography curator'
      ],
      pastWinners: 'Previous winning portraits emphasized authentic emotional connection, masterful use of natural light, and thoughtful composition. Winners showed strong technical skills in exposure and focus, while maintaining a raw, unposed quality that revealed genuine character. Black and white portraits with dramatic lighting performed particularly well.',
      context: 'This competition values authenticity over perfection, storytelling over technique alone, and images that create an emotional connection with viewers.',
      customCriteria: [
        { name: 'Emotional Connection', weight: 30, description: 'Ability to convey emotion and create viewer engagement' },
        { name: 'Technical Excellence', weight: 25, description: 'Focus, exposure, lighting quality' },
        { name: 'Composition', weight: 25, description: 'Framing, balance, and visual flow' },
        { name: 'Authenticity', weight: 20, description: 'Natural, genuine expression without over-posing' }
      ]
    }
  },

  landscape: {
    id: 'landscape',
    name: 'Landscape Photography',
    description: 'Competitions focused on nature, scenery, and environmental photography',
    config: {
      title: 'Landscape Photography Competition',
      theme: 'Showcase the beauty and power of natural landscapes, from sweeping vistas to intimate nature scenes. Emphasize unique perspectives, dramatic light, and environmental storytelling that inspires conservation and appreciation of our planet.',
      jury: [
        'National Geographic photographer',
        'Environmental conservation advocate',
        'Landscape photography magazine editor',
        'Fine art nature photographer'
      ],
      pastWinners: 'Winning landscape images featured dramatic natural light (golden hour, storm light, or rare atmospheric conditions), strong foreground interest leading to distant subjects, and exceptional sharpness throughout the frame. Many winners incorporated dynamic weather, unique perspectives (aerial, underwater approaches to land), or rare natural phenomena. Environmental storytelling and conservation themes were highly valued.',
      context: 'This competition seeks images that not only showcase technical excellence but also tell environmental stories and inspire viewers to protect natural spaces. Originality in composition and light is essential.',
      customCriteria: [
        { name: 'Light Quality', weight: 30, description: 'Dramatic, unique, or exceptional use of natural light' },
        { name: 'Composition', weight: 25, description: 'Visual flow, depth, foreground-background relationship' },
        { name: 'Technical Excellence', weight: 25, description: 'Sharpness, exposure, dynamic range' },
        { name: 'Originality', weight: 20, description: 'Unique perspective or fresh take on familiar scenes' }
      ]
    }
  },

  conceptual: {
    id: 'conceptual',
    name: 'Conceptual Photography',
    description: 'Competitions focused on creative concepts, storytelling, and artistic expression',
    config: {
      title: 'Conceptual Photography Competition',
      theme: 'Create thought-provoking images that transcend literal documentation to express ideas, emotions, or narratives. Use symbolism, metaphor, and creative techniques to communicate complex concepts visually. Push boundaries of traditional photography while maintaining strong visual impact.',
      jury: [
        'Contemporary art curator',
        'Conceptual photographer',
        'Visual arts professor',
        'Gallery director'
      ],
      pastWinners: 'Winning conceptual works demonstrated strong intellectual depth paired with visual sophistication. Winners used symbolism effectively, created layered meanings that reward extended viewing, and balanced concept with aesthetic appeal. Many employed creative techniques (multiple exposure, intentional camera movement, mixed media) while maintaining technical control. Surreal, dreamlike, or metaphorical imagery performed well when grounded in clear artistic intent.',
      context: 'This competition values originality of concept above all, but requires that creative ideas be executed with technical skill and visual appeal. The image should communicate its concept clearly while inviting interpretation.',
      customCriteria: [
        { name: 'Concept Strength', weight: 35, description: 'Originality and depth of underlying idea' },
        { name: 'Visual Impact', weight: 25, description: 'Immediate aesthetic appeal and viewer engagement' },
        { name: 'Execution', weight: 25, description: 'Technical skill in realizing the concept' },
        { name: 'Narrative Clarity', weight: 15, description: 'How well the concept is communicated visually' }
      ]
    }
  },

  street: {
    id: 'street',
    name: 'Street Photography',
    description: 'Competitions focused on candid urban life, documentary, and decisive moments',
    config: {
      title: 'Street Photography Competition',
      theme: 'Capture authentic moments of human life in public spaces. Seek decisive moments that reveal character, culture, humor, or social dynamics. Emphasize spontaneity, composition under pressure, and storytelling through unposed, candid imagery that documents contemporary urban existence.',
      jury: [
        'Documentary photographer',
        'Street photography collective founder',
        'Photojournalism professor',
        'Museum of contemporary photography curator'
      ],
      pastWinners: 'Winning street photographs captured decisive moments with perfect timing, showing humor, irony, or poignant human interactions. Winners demonstrated strong compositional skills under uncontrolled conditions, excellent use of light and shadow, and images that tell stories about contemporary life. Black and white photography was prominent, though color was accepted when it enhanced narrative. Authenticity was paramount - no staged scenes.',
      context: 'This competition celebrates the art of observation and timing. Images must be unposed and capture genuine moments. The competition values compositional sophistication, narrative interest, and images that document the human condition in public spaces.',
      customCriteria: [
        { name: 'Decisive Moment', weight: 30, description: 'Perfect timing that captures peak action or expression' },
        { name: 'Composition', weight: 25, description: 'Strong visual structure despite uncontrolled conditions' },
        { name: 'Narrative Interest', weight: 25, description: 'Story, humor, or insight into human behavior' },
        { name: 'Authenticity', weight: 20, description: 'Genuine candid moment, not staged or posed' }
      ]
    }
  }
};

/**
 * Get a template by ID
 * @param {string} templateId - Template identifier (portrait, landscape, conceptual, street)
 * @returns {Object|null} Template configuration or null if not found
 */
export function getTemplate(templateId) {
  return TEMPLATES[templateId] || null;
}

/**
 * Get list of all available templates
 * @returns {Array<{id: string, name: string, description: string}>} Array of template metadata
 */
export function listTemplates() {
  return Object.values(TEMPLATES).map(template => ({
    id: template.id,
    name: template.name,
    description: template.description
  }));
}

/**
 * Get template choices formatted for inquirer select prompt
 * @returns {Array<{name: string, value: string, description: string}>} Formatted choices
 */
export function getTemplateChoices() {
  return [
    { name: 'Portrait Photography', value: 'portrait', description: 'Competitions focused on portraits, people, and human expression' },
    { name: 'Landscape Photography', value: 'landscape', description: 'Competitions focused on nature, scenery, and environmental photography' },
    { name: 'Conceptual Photography', value: 'conceptual', description: 'Competitions focused on creative concepts, storytelling, and artistic expression' },
    { name: 'Street Photography', value: 'street', description: 'Competitions focused on candid urban life, documentary, and decisive moments' },
    { name: 'Custom (blank template)', value: 'custom', description: 'Start with an empty template' }
  ];
}

/**
 * Check if a template ID is valid
 * @param {string} templateId - Template identifier to validate
 * @returns {boolean} True if template exists
 */
export function isValidTemplate(templateId) {
  return templateId === 'custom' || Object.prototype.hasOwnProperty.call(TEMPLATES, templateId);
}
