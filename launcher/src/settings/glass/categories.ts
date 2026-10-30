export const categories = [
  { id: 'appearance', title: 'Home appearance', hint: 'Layout and indicators', icon: '▦' },
  { id: 'apps', title: 'Applications', hint: 'Home favourites and Samsung Home', icon: '▣' },
  { id: 'wallpaper', title: 'Backgrounds', hint: 'Colours and animation', icon: '▧' },
  { id: 'status', title: 'Weather and clock', hint: 'Weather, time and date', icon: '☀' },
  { id: 'sources', title: 'Inputs', hint: 'Live TV and HDMI', icon: '□' },
  { id: 'artwork', title: 'App artwork', hint: 'Samsung, Studio and personal images', icon: '▧' }
] as const;
export type Category = typeof categories[number]['id'];
export interface GlassState { category: Category; expanded: boolean }
