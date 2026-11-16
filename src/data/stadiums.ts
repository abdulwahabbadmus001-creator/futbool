import { StadiumConfig } from '../types/football';

export const STADIUMS: StadiumConfig[] = [
  {
    id: 'crown-national',
    name: 'Crown National Arena',
    city: 'Royalston',
    capacity: 78500,
    timeOfDay: 'night',
    pitchPattern: 'stripes',
    standColor: '#1e293b',
    accentColor: '#f59e0b',
  },
  {
    id: 'solis-olympic',
    name: 'Estadio Solis',
    city: 'Valoria',
    capacity: 64200,
    timeOfDay: 'dusk',
    pitchPattern: 'checkered',
    standColor: '#292524',
    accentColor: '#ef4444',
  },
  {
    id: 'harbor-park',
    name: 'Harbor Park Ground',
    city: 'Northbridge',
    capacity: 52000,
    timeOfDay: 'day',
    pitchPattern: 'classic',
    standColor: '#1e3a5f',
    accentColor: '#38bdf8',
  },
  {
    id: 'nordhaven-bowl',
    name: 'Nordhaven Arena',
    city: 'Nordhaven',
    capacity: 58900,
    timeOfDay: 'overcast',
    pitchPattern: 'stripes',
    standColor: '#27272a',
    accentColor: '#10b981',
  },
];

export function getStadiumById(id: string): StadiumConfig {
  return STADIUMS.find((s) => s.id === id) ?? STADIUMS[0];
}
