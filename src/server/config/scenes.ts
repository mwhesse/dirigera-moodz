import { Color } from '../types';

export interface Scene {
  id: string;
  name: string;
  description: string;
  palette: Color[];
  /**
   * "drift" = lights independently move between palette colors smoothly
   * "static" = lights are assigned a color and stay there
   */
  type: 'drift' | 'static';
  /** Average transition time in ms (e.g. 5000 for 5s) */
  transitionSpeed: number;
  /** Average brightness for the scene (0-100) */
  brightness: number;
}

export const SCENE_PRESETS: Scene[] = [
  {
    id: 'savanna-sunset',
    name: 'Savanna Sunset',
    description: 'Warm oranges, reds, and golds fading into the night.',
    type: 'drift',
    transitionSpeed: 8000,
    brightness: 60,
    palette: [
      { hue: 30, saturation: 0.9 },  // Deep Orange
      { hue: 10, saturation: 0.85 }, // Red-Orange
      { hue: 45, saturation: 0.7 },  // Gold
      { hue: 340, saturation: 0.4 }, // Soft Warm Purple (dusk)
      { hue: 20, saturation: 0.6 }   // Soft Amber
    ]
  },
  {
    id: 'arctic-aurora',
    name: 'Arctic Aurora',
    description: 'Serene teals, cool blues, and mystical purples.',
    type: 'drift',
    transitionSpeed: 10000,
    brightness: 50,
    palette: [
      { hue: 180, saturation: 0.8 }, // Cyan
      { hue: 200, saturation: 0.9 }, // Light Blue
      { hue: 260, saturation: 0.7 }, // Purple
      { hue: 160, saturation: 0.8 }, // Teal/Green
      { hue: 240, saturation: 0.9 }  // Deep Blue
    ]
  },
  {
    id: 'tropical-twilight',
    name: 'Tropical Twilight',
    description: 'Vibrant magentas, deep violets, and ocean blues.',
    type: 'drift',
    transitionSpeed: 7000,
    brightness: 70,
    palette: [
      { hue: 280, saturation: 0.9 }, // Violet
      { hue: 320, saturation: 0.85 }, // Magenta
      { hue: 220, saturation: 0.9 }, // Ocean Blue
      { hue: 260, saturation: 0.6 }, // Lavender
      { hue: 340, saturation: 0.8 }  // Pink
    ]
  },
  {
    id: 'spring-blossom',
    name: 'Spring Blossom',
    description: 'Fresh pinks, light greens, and warm whites.',
    type: 'drift',
    transitionSpeed: 9000,
    brightness: 65,
    palette: [
      { hue: 330, saturation: 0.4 }, // Pastel Pink
      { hue: 350, saturation: 0.6 }, // Rose
      { hue: 100, saturation: 0.3 }, // Pale Green
      { hue: 60, saturation: 0.2 },  // Warm Whiteish
      { hue: 300, saturation: 0.3 }  // Light Lilac
    ]
  },
  {
    id: 'cozy-fireplace',
    name: 'Cozy Fireplace',
    description: 'Deep ambers and reds simulating a warm fire.',
    type: 'drift',
    transitionSpeed: 4000,
    brightness: 40,
    palette: [
      { hue: 25, saturation: 0.9 },  // Orange
      { hue: 15, saturation: 0.95 }, // Red-Orange
      { hue: 35, saturation: 0.85 }, // Amber
      { hue: 10, saturation: 0.9 },  // Deep Red
      { hue: 30, saturation: 0.7 }   // Soft Orange
    ]
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    description: 'Profound blues and teals from the depths.',
    type: 'drift',
    transitionSpeed: 12000,
    brightness: 40,
    palette: [
      { hue: 230, saturation: 0.9 }, // Navy
      { hue: 210, saturation: 0.8 }, // Royal Blue
      { hue: 190, saturation: 0.9 }, // Aqua
      { hue: 240, saturation: 1.0 }, // Pure Blue
      { hue: 200, saturation: 0.6 }  // Gray-Blue
    ]
  },
  {
    id: 'forest-morning',
    name: 'Forest Morning',
    description: 'Fresh greens and sunlit yellows.',
    type: 'drift',
    transitionSpeed: 9000,
    brightness: 60,
    palette: [
      { hue: 120, saturation: 0.7 }, // Green
      { hue: 90, saturation: 0.6 },  // Yellow-Green
      { hue: 140, saturation: 0.8 }, // Forest Green
      { hue: 60, saturation: 0.4 },  // Pale Yellow
      { hue: 100, saturation: 0.5 }  // Leaf Green
    ]
  },
  {
    id: 'bangkok-morning',
    name: 'Bangkok Morning',
    description: 'Golden temples and hazy sunrise warmth.',
    type: 'drift',
    transitionSpeed: 8500,
    brightness: 75,
    palette: [
      { hue: 40, saturation: 0.9 },  // Golden
      { hue: 25, saturation: 0.85 }, // Saffron
      { hue: 50, saturation: 0.6 },  // Hazy Yellow
      { hue: 10, saturation: 0.7 },  // Warm Clay
      { hue: 35, saturation: 0.9 }   // Bright Orange
    ]
  },
  {
    id: 'sukhumvit-nights',
    name: 'Sukhumvit Nights',
    description: 'Neon pinks, electric blues, and busy street lights.',
    type: 'drift',
    transitionSpeed: 3000, // Faster for city vibe
    brightness: 80,
    palette: [
      { hue: 300, saturation: 1.0 }, // Neon Magenta
      { hue: 240, saturation: 1.0 }, // Electric Blue
      { hue: 340, saturation: 0.9 }, // Hot Pink
      { hue: 200, saturation: 1.0 }, // Cyan
      { hue: 280, saturation: 0.9 }  // Purple
    ]
  },
  {
    id: 'miami-vice',
    name: 'Miami Vice',
    description: 'Art deco pastels, turquoise water, and pink flamingos.',
    type: 'drift',
    transitionSpeed: 6000,
    brightness: 70,
    palette: [
      { hue: 180, saturation: 0.6 }, // Pastel Cyan
      { hue: 320, saturation: 0.6 }, // Pastel Pink
      { hue: 190, saturation: 0.7 }, // Turquoise
      { hue: 300, saturation: 0.5 }, // Light Magenta
      { hue: 50, saturation: 0.3 }   // Pale Sand
    ]
  },
  {
    id: 'brooklyn-loft',
    name: 'Brooklyn Loft',
    description: 'Industrial brick, warm tungsten, and cool concrete.',
    type: 'drift',
    transitionSpeed: 10000, // Slow, chill
    brightness: 50,
    palette: [
      { hue: 20, saturation: 0.8 },  // Brick Red/Orange
      { hue: 30, saturation: 0.4 },  // Warm White/Tungsten
      { hue: 0, saturation: 0.0 },   // Grey/White (desaturated)
      { hue: 200, saturation: 0.2 }, // Cool Grey
      { hue: 25, saturation: 0.6 }   // Amber
    ]
  },
  {
    id: 'la-sunset',
    name: 'L.A. Sunset',
    description: 'Palm silhouettes against a purple and orange gradient.',
    type: 'drift',
    transitionSpeed: 9000,
    brightness: 65,
    palette: [
      { hue: 280, saturation: 0.8 }, // Purple
      { hue: 320, saturation: 0.7 }, // Pinkish Purple
      { hue: 30, saturation: 0.9 },  // Orange
      { hue: 260, saturation: 0.6 }, // Deep Violet
      { hue: 45, saturation: 0.8 }   // Golden Hour
    ]
  },
  {
    id: 'sunset-beach',
    name: 'Sunset at the Beach',
    description: 'Warm oranges, pinks, and deep blues reflecting on the water.',
    type: 'drift',
    transitionSpeed: 8000,
    brightness: 70,
    palette: [
      { hue: 30, saturation: 0.9 },  // Orange
      { hue: 340, saturation: 0.8 }, // Pink/Red
      { hue: 280, saturation: 0.7 }, // Purple
      { hue: 240, saturation: 0.9 }, // Deep Blue
      { hue: 20, saturation: 0.6 }   // Soft Amber
    ]
  },
  {
    id: 'geneva-afternoon',
    name: 'Geneva Afternoon',
    description: 'Clean whites, lake blues, and slate greys.',
    type: 'drift',
    transitionSpeed: 10000,
    brightness: 80,
    palette: [
      { hue: 200, saturation: 0.7 }, // Lake Blue
      { hue: 200, saturation: 0.1 }, // Cool White
      { hue: 210, saturation: 0.3 }, // Slate Grey
      { hue: 120, saturation: 0.4 }, // Fresh Green
      { hue: 190, saturation: 0.5 }  // Cyan
    ]
  },
  {
    id: 'christmas-tree',
    name: 'Christmas Tree',
    description: 'Traditional red, green, and gold holiday vibes.',
    type: 'drift',
    transitionSpeed: 5000,
    brightness: 90,
    palette: [
      { hue: 350, saturation: 1.0 }, // Red
      { hue: 120, saturation: 0.9 }, // Green
      { hue: 45, saturation: 0.9 },  // Gold
      { hue: 40, saturation: 0.5 },  // Warm White
      { hue: 10, saturation: 0.9 }   // Deep Red
    ]
  },
  {
    id: 'deep-space-nebula',
    name: 'Deep Space Nebula',
    description: 'Swirling cosmic dust and distant starlight.',
    type: 'drift',
    transitionSpeed: 18000,
    brightness: 30,
    palette: [
      { hue: 270, saturation: 0.8 }, // Deep Purple
      { hue: 240, saturation: 0.7 }, // Dark Blue
      { hue: 320, saturation: 0.6 }, // Magenta
      { hue: 180, saturation: 0.5 }, // Cyan
      { hue: 60, saturation: 0.1 }   // Faint Yellow/White
    ]
  },
  {
    id: 'cyber-city',
    name: 'Cyber City',
    description: 'Futuristic neon green and purple vibes.',
    type: 'drift',
    transitionSpeed: 5000,
    brightness: 80,
    palette: [
      { hue: 120, saturation: 1.0 }, // Neon Green
      { hue: 280, saturation: 1.0 }, // Electric Purple
      { hue: 300, saturation: 0.9 }, // Magenta
      { hue: 150, saturation: 0.9 }, // Bright Teal
      { hue: 260, saturation: 0.8 }  // Deep Violet
    ]
  },
  {
    id: 'late-night-vibes',
    name: 'Late Night Vibes',
    description: 'Deep purples and blues for a chill night.',
    type: 'drift',
    transitionSpeed: 15000,
    brightness: 25,
    palette: [
      { hue: 260, saturation: 0.9 }, // Deep Purple
      { hue: 240, saturation: 0.8 }, // Dark Blue
      { hue: 280, saturation: 0.7 }, // Violet
      { hue: 220, saturation: 0.6 }, // Navy
      { hue: 270, saturation: 0.8 }  // Indigo
    ]
  },
  {
    id: 'japanese-whisky',
    name: 'Japanese Whisky Bar',
    description: 'Sophisticated ambers, golds, and warm woods.',
    type: 'drift',
    transitionSpeed: 12000,
    brightness: 40,
    palette: [
      { hue: 35, saturation: 0.9 },  // Amber
      { hue: 45, saturation: 0.7 },  // Gold
      { hue: 25, saturation: 0.8 },  // Deep Orange/Wood
      { hue: 50, saturation: 0.5 },  // Warm White
      { hue: 30, saturation: 0.6 }   // Soft Brown
    ]
  },
  {
    id: 'yoga-morning',
    name: 'Yoga Morning',
    description: 'Soft, pale colors for focus and calm.',
    type: 'drift',
    transitionSpeed: 20000,
    brightness: 60,
    palette: [
      { hue: 180, saturation: 0.2 }, // Very Pale Cyan
      { hue: 60, saturation: 0.1 },  // Warm White
      { hue: 300, saturation: 0.1 }, // Pale Lavender
      { hue: 120, saturation: 0.2 }, // Soft Mint
      { hue: 40, saturation: 0.2 }   // Pale Peach
    ]
  }
];
