export interface AvatarItem {
  id: string;
  url: string;
  label: string;
  category: 'professional' | 'cyberpunk' | 'illustrated' | 'mascot';
}

export const PRESET_AVATARS: AvatarItem[] = [
  // 1. Professional & Tech Developer Portraits
  {
    id: 'tech-1',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=140&auto=format&fit=crop&q=80',
    label: 'Aria',
    category: 'professional',
  },
  {
    id: 'tech-2',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=140&auto=format&fit=crop&q=80',
    label: 'David',
    category: 'professional',
  },
  {
    id: 'tech-3',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=140&auto=format&fit=crop&q=80',
    label: 'Sarah',
    category: 'professional',
  },
  {
    id: 'tech-4',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=140&auto=format&fit=crop&q=80',
    label: 'Marcus',
    category: 'professional',
  },
  {
    id: 'tech-5',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=140&auto=format&fit=crop&q=80',
    label: 'Leo',
    category: 'professional',
  },
  {
    id: 'tech-6',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=140&auto=format&fit=crop&q=80',
    label: 'Elena',
    category: 'professional',
  },
  {
    id: 'tech-7',
    url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=140&auto=format&fit=crop&q=80',
    label: 'Alex',
    category: 'professional',
  },
  {
    id: 'tech-8',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=140&auto=format&fit=crop&q=80',
    label: 'Maya',
    category: 'professional',
  },
  {
    id: 'tech-9',
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=140&auto=format&fit=crop&q=80',
    label: 'Ethan',
    category: 'professional',
  },
  {
    id: 'tech-10',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=140&auto=format&fit=crop&q=80',
    label: 'Zainab',
    category: 'professional',
  },

  // 2. Cyberpunk / Neon / Hacker
  {
    id: 'cyber-1',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=140&auto=format&fit=crop&q=80',
    label: 'Neon Wave',
    category: 'cyberpunk',
  },
  {
    id: 'cyber-2',
    url: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=140&auto=format&fit=crop&q=80',
    label: 'Cyber Dev',
    category: 'cyberpunk',
  },
  {
    id: 'cyber-3',
    url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=140&auto=format&fit=crop&q=80',
    label: 'Matrix Hacker',
    category: 'cyberpunk',
  },
  {
    id: 'cyber-4',
    url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=140&auto=format&fit=crop&q=80',
    label: 'Synth Dev',
    category: 'cyberpunk',
  },
  {
    id: 'cyber-5',
    url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=140&auto=format&fit=crop&q=80',
    label: 'Net Runner',
    category: 'cyberpunk',
  },
  {
    id: 'cyber-6',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=140&auto=format&fit=crop&q=80',
    label: 'Glitch Specialist',
    category: 'cyberpunk',
  },

  // 3. 3D Illustrated & Stylized Personalities
  {
    id: 'illus-1',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver&backgroundColor=b6e3f4,c0aede,d1d4f9',
    label: 'Oliver',
    category: 'illustrated',
  },
  {
    id: 'illus-2',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=ffd5dc,ffdfbf',
    label: 'Luna',
    category: 'illustrated',
  },
  {
    id: 'illus-3',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=c0aede,d1d4f9',
    label: 'Leo 3D',
    category: 'illustrated',
  },
  {
    id: 'illus-4',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Milo&backgroundColor=b6e3f4',
    label: 'Milo',
    category: 'illustrated',
  },
  {
    id: 'illus-5',
    url: 'https://api.dicebear.com/7.x/micah/svg?seed=Jack&backgroundColor=ffdfbf,ffd5dc',
    label: 'Jack',
    category: 'illustrated',
  },
  {
    id: 'illus-6',
    url: 'https://api.dicebear.com/7.x/micah/svg?seed=Sophie&backgroundColor=b6e3f4,d1d4f9',
    label: 'Sophie',
    category: 'illustrated',
  },
  {
    id: 'illus-7',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Alexander&backgroundColor=c0aede',
    label: 'Alexander',
    category: 'illustrated',
  },
  {
    id: 'illus-8',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Zoe&backgroundColor=ffd5dc',
    label: 'Zoe',
    category: 'illustrated',
  },

  // 4. Tech Mascots, Bots & Animals
  {
    id: 'bot-1',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Felix&backgroundColor=b6e3f4',
    label: 'Felix Bot',
    category: 'mascot',
  },
  {
    id: 'bot-2',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gizmo&backgroundColor=ffd5dc',
    label: 'Gizmo AI',
    category: 'mascot',
  },
  {
    id: 'bot-3',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Spooky&backgroundColor=c0aede',
    label: 'Spooky Mech',
    category: 'mascot',
  },
  {
    id: 'bot-4',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bandit&backgroundColor=d1d4f9',
    label: 'Bandit Bot',
    category: 'mascot',
  },
  {
    id: 'bot-5',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberSpark&backgroundColor=ffdfbf',
    label: 'Spark Core',
    category: 'mascot',
  },
  {
    id: 'bot-6',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Quantum&backgroundColor=b6e3f4',
    label: 'Quantum Unit',
    category: 'mascot',
  },
];

export const DEFAULT_AVATAR = PRESET_AVATARS[0].url;
