import { Contact, Message } from '../types';

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'papa-jose',
    name: 'Papá José Manuel',
    avatarEmoji: '👨🏽‍💼',
    avatarColor: 'bg-teal-600',
    relationship: 'Papá (Admin)',
    role: 'admin',
    isOnline: false,
    lastActive: 'Sin conexión registrada',
    lastActiveTimestamp: undefined,
    phone: '+56 9 1234 5678'
  },
  {
    id: 'mama-tila',
    name: 'Mamá Tila del Carmen',
    avatarEmoji: '👩🏽‍🦱',
    avatarColor: 'bg-rose-500',
    relationship: 'Mamá',
    role: 'member',
    isOnline: false,
    lastActive: 'Sin conexión registrada',
    lastActiveTimestamp: undefined,
    phone: '+56 9 8765 4321'
  },
  {
    id: 'hijo-christian',
    name: 'Christian Fernando',
    avatarEmoji: '🧑🏽‍💻',
    avatarColor: 'bg-sky-500',
    relationship: 'Hijo',
    role: 'member',
    isOnline: false,
    lastActive: 'Sin conexión registrada',
    lastActiveTimestamp: undefined,
    phone: '+56 9 5555 1212'
  },
  {
    id: 'hijo-cristopher',
    name: 'Cristopher',
    avatarEmoji: '🎮',
    avatarColor: 'bg-amber-500',
    relationship: 'Hijo',
    role: 'member',
    isOnline: false,
    lastActive: 'Sin conexión registrada',
    lastActiveTimestamp: undefined,
    phone: '+56 9 7777 3434'
  }
];

export const getInitialMessages = (): Message[] => {
  return [];
};
