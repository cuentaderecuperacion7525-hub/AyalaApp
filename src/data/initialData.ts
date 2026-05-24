import { Contact, Message } from '../types';

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'papa-jose',
    name: 'Papá José Manuel',
    avatarEmoji: '👨🏽‍💼',
    avatarColor: 'bg-teal-600',
    relationship: 'Papá (Admin)',
    role: 'admin',
    isOnline: true,
    lastActive: 'En línea',
    lastActiveTimestamp: Date.now(),
    phone: '+56 9 1234 5678'
  },
  {
    id: 'mama-tila',
    name: 'Mamá Tila del Carmen',
    avatarEmoji: '👩🏽‍🦱',
    avatarColor: 'bg-rose-500',
    relationship: 'Mamá',
    role: 'member',
    isOnline: true,
    lastActive: 'En línea',
    lastActiveTimestamp: Date.now(),
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
    lastActive: 'Últ. vez hoy a las 18:15',
    lastActiveTimestamp: Date.now() - 40 * 60 * 1000, // 40 minutes ago
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
    lastActive: 'Últ. vez hoy a las 17:40',
    lastActiveTimestamp: Date.now() - 150 * 60 * 1000, // 2.5 hours ago
    phone: '+56 9 7777 3434'
  }
];

// Prepopulated chat database to demonstrate high-quality content
export const getInitialMessages = (): Message[] => {
  const dateOffset = (minsAgo: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - minsAgo);
    return d.toISOString();
  };

  return [
    // ------------------ GROUP CHAT ------------------
    {
      id: 'g1',
      senderId: 'mama-tila',
      senderName: 'Mamá Tila del Carmen',
      receiverId: 'family-group',
      text: '¡Hola familia hermosa! ¿Cómo va su día? ❤️',
      timestamp: dateOffset(60),
      status: 'read'
    },
    {
      id: 'g2',
      senderId: 'hijo-christian',
      senderName: 'Christian Fernando',
      receiverId: 'family-group',
      text: 'Todo bien mamá, saliendo de una clase. ¡Qué tal ustedes!',
      timestamp: dateOffset(55),
      status: 'read'
    },
    {
      id: 'g3',
      senderId: 'hijo-cristopher',
      senderName: 'Cristopher',
      receiverId: 'family-group',
      text: 'Holaaa, yo acabo de terminar mis tareas, ¿ya van a almorzar? 😋',
      timestamp: dateOffset(50),
      status: 'read'
    },
    {
      id: 'g4',
      senderId: 'papa-jose',
      senderName: 'Papá José Manuel',
      receiverId: 'family-group',
      text: 'Hola a todos. Acabo de salir de una reunión. Tila, al rato te marco para ver lo de la comida. Abrazo a mis muchachos.',
      timestamp: dateOffset(45),
      status: 'read'
    },
    {
      id: 'g5',
      senderId: 'mama-tila',
      senderName: 'Mamá Tila del Carmen',
      receiverId: 'family-group',
      text: 'Sii José, preparé cazuelita rica. Los espero a los tres en casa. 🍲',
      timestamp: dateOffset(40),
      status: 'read'
    },

    // ------------------ PAPA-JOSE <-> MAMA-TILA ------------------
    {
      id: 'pt1',
      senderId: 'papa-jose',
      senderName: 'Papá José Manuel',
      receiverId: 'mama-tila',
      text: 'Mi amor, ¿necesitas que compre algo en el supermercado antes de ir?',
      timestamp: dateOffset(120),
      status: 'read'
    },
    {
      id: 'pt2',
      senderId: 'mama-tila',
      senderName: 'Mamá Tila del Carmen',
      receiverId: 'papa-jose',
      text: 'Hola José, sí por favor, si puedes traer pan batido y una palta madura. Muchas gracias, con cuidado.',
      timestamp: dateOffset(115),
      status: 'read'
    },
    {
      id: 'pt3',
      senderId: 'papa-jose',
      senderName: 'Papá José Manuel',
      receiverId: 'mama-tila',
      text: 'Listo, comprado. Ya voy manejando a casa.',
      timestamp: dateOffset(90),
      status: 'read'
    },

    // ------------------ PAPA-JOSE <-> HIJO-CHRISTIAN ------------------
    {
      id: 'pc1',
      senderId: 'papa-jose',
      senderName: 'Papá José Manuel',
      receiverId: 'hijo-christian',
      text: 'Hola Christian, ¿cómo vas con tus proyectos de la universidad? ¿Necesitas apoyo con algo?',
      timestamp: dateOffset(180),
      status: 'read'
    },
    {
      id: 'pc2',
      senderId: 'hijo-christian',
      senderName: 'Christian Fernando',
      receiverId: 'papa-jose',
      text: 'Hola papá! Muchas gracias por preguntar, todo marcha super bien. Hoy presento un proyecto importante de programación, ya está todo listo.',
      timestamp: dateOffset(175),
      status: 'read'
    },
    {
      id: 'pc3',
      senderId: 'papa-jose',
      senderName: 'Papá José Manuel',
      receiverId: 'hijo-christian',
      text: 'Excelente hijo, confío mucho en tu talento y dedicación. ¡Mucho éxito hoy!',
      timestamp: dateOffset(170),
      status: 'read'
    },
    {
      id: 'pc4',
      senderId: 'hijo-christian',
      senderName: 'Christian Fernando',
      receiverId: 'papa-jose',
      text: '¡Muchas gracias, papá! Te aviso cuando salga. Un abrazo',
      timestamp: dateOffset(168),
      status: 'read'
    },

    // ------------------ PAPA-JOSE <-> HIJO-CRISTOPHER ------------------
    {
      id: 'pcr1',
      senderId: 'papa-jose',
      senderName: 'Papá José Manuel',
      receiverId: 'hijo-cristopher',
      text: 'Cristopher, acuérdate de ordenar tu cuarto antes de poder jugar tus videojuegos, por favor.',
      timestamp: dateOffset(240),
      status: 'read'
    },
    {
      id: 'pcr2',
      senderId: 'hijo-cristopher',
      senderName: 'Cristopher',
      receiverId: 'papa-jose',
      text: 'Hola pa! Sí, ya lo ordené todo y también barrí la sala. ¿Ya puedo prender la consola?',
      timestamp: dateOffset(230),
      status: 'read'
    },
    {
      id: 'pcr3',
      senderId: 'papa-jose',
      senderName: 'Papá José Manuel',
      receiverId: 'hijo-cristopher',
      text: 'Muy bien hecho, orden antes que diversión. Sí, puedes jugar un rato antes de la cena.',
      timestamp: dateOffset(225),
      status: 'read'
    },

    // ------------------ MAMA-TILA <-> HIJO-CHRISTIAN ------------------
    {
      id: 'mc1',
      senderId: 'mama-tila',
      senderName: 'Mamá Tila del Carmen',
      receiverId: 'hijo-christian',
      text: 'Hijo querido, te guardé cazuelita para en la noche por si tienes hambre cuando regreses. Besos.',
      timestamp: dateOffset(30),
      status: 'read'
    },
    {
      id: 'mc2',
      senderId: 'hijo-christian',
      senderName: 'Christian Fernando',
      receiverId: 'mama-tila',
      text: '¡Mamá eres la mejor! Me va a venir de maravillas llegando de clases largas de hoy. 😋❤️',
      timestamp: dateOffset(25),
      status: 'read'
    }
  ];
};

// Character response generators depending on who is receiving the message
export const getSimulatedReply = (
  receiverId: string,
  userMessage: string,
  userName: string
): { text: string; delayMs: number } => {
  const norm = userMessage.toLowerCase().trim();
  
  // Custom response logic based on recipient personalities
  if (receiverId === 'mama-tila') {
    const responses = [
      `¡Hola mi niño hermoso (${userName})! ❤️ Dios te cuide mucho siempre. ¿Ya comiste algo calientito?`,
      `Qué alegría leerte, cariño. De verdad me haces muy feliz con tus mensajitos. Cuídate harto hoy.`,
      `Entendido mi amor. Acá te esperamos con la casa limpia y mucho cariño. 🌸`,
      `¡Qué hermoso detalle! Muchas bendiciones en tu día, no te olvides de abrigarte bien al salir. 🧥`,
      `Tranquilo mi vida, todo va a salir excelente con el favor de Dios. Te mando un abrazote gigante.`
    ];
    
    if (norm.includes('comida') || norm.includes('comer') || norm.includes('hambre') || norm.includes('almuerzo') || norm.includes('cena')) {
      return {
        text: '¡Ay qué bueno me dices! Tengo lista la comida. Hay cazuelita calientita y fresca esperando por ti. ¿Vienes ya? 🍲',
        delayMs: 3500
      };
    }
    if (norm.includes('hola') || norm.includes('buenas') || norm.includes('que tal')) {
      return {
        text: `¡Hola mi amor! Qué alegría saludarte. Que tengas un hermoso día guiado por Dios. ¿Cómo amaneciste? ✨`,
        delayMs: 2500
      };
    }
    return {
      text: responses[Math.floor(Math.random() * responses.length)],
      delayMs: 3000
    };
  }

  if (receiverId === 'hijo-christian') {
    const responses = [
      `¡Hola! Todo súper por acá. Estoy repasando unas cosas de la carrera, pero leo con calma. 👍`,
      `Buenísimo. Qué buena noticia, me alegra saberlo de verdad.`,
      `¡Jajaja totally! Qué buen chiste, me alegraste el estudio un rato. 😂`,
      `Oye, avísame si necesitan que pase a buscar algo por el súper cuando vaya para allá.`,
      `¡Qué genial de veras! Nos vemos al rato en la casa para platicar con un café.`
    ];
    
    if (norm.includes('estudio') || norm.includes('clase') || norm.includes('tarea') || norm.includes('uni') || norm.includes('u')) {
      return {
        text: 'Sii, justamente ando entregando unos códigos y terminando de pulir las interfaces. ¡Espero sacar la nota máxima hoy! 💻📈',
        delayMs: 3000
      };
    }
    if (norm.includes('jugar') || norm.includes('play') || norm.includes('game') || norm.includes('playstation')) {
      return {
        text: 'Al rato si quieren armamos unas partidas en la consola con Cristopher, terminando los pendientes! 🎮🔥',
        delayMs: 2800
      };
    }
    return {
      text: responses[Math.floor(Math.random() * responses.length)],
      delayMs: 2500
    };
  }

  if (receiverId === 'hijo-cristopher') {
    const responses = [
      `Holaa! Todo bien? Yo ando acá en discord conversando o jugando play 👾`,
      `Jajajaja oye qué buena! Pasen el dato de qué vamos a hacer mañana.`,
      `Sii ma/pa, ya hice todo el aseo que me pidieron, quédense tranquilos.`,
      `Oye, después de comer ¿podemos ver una peli todos juntos en la sala?`,
      `¡Súper! Me avisan cualquier cosita.`
    ];

    if (norm.includes('juegos') || norm.includes('consola') || norm.includes('play') || norm.includes('fifa') || norm.includes('fortnite')) {
      return {
        text: '¡Seeeee! Justo andaba sacándome unas partidazas brutales. Avísenme para prender los controles si jugamos todos en coop! 🎮👾💥',
        delayMs: 2200
      };
    }
    if (norm.includes('tarea') || norm.includes('colegio') || norm.includes('estudiar')) {
      return {
        text: 'Ya terminé todo lo de matemáticas y ciencias pa, ¡te lo juro! Puedes revisar mi cuaderno cuando llegues. 📚🤓',
        delayMs: 3200
      };
    }
    return {
      text: responses[Math.floor(Math.random() * responses.length)],
      delayMs: 2000
    };
  }

  if (receiverId === 'papa-jose') {
    const responses = [
      `Hola mi gente. ¿Cómo se encuentran todos? Recuerden salir con precaución el día de hoy.`,
      `Leído y anotado. Me parece una excelente decisión de su parte. Sigamos así.`,
      `Estoy de camino o resolviendo asuntos laborales. Al rato me conecto con calma. Un gran abrazo. 👍`,
      `Me enorgullece ver a la familia unida, siempre apoyándose. ¡Dios los bendiga!`,
      `Entendido. Tila ya voy en camino, avísame si hay novedades en casa.`
    ];

    if (norm.includes('dinero') || norm.includes('comprar') || norm.includes('permiso')) {
      return {
        text: 'De acuerdo, avísenme del presupuesto o los detalles del permiso y lo conversamos formalmente al llegar a casa hoy en la noche. 👨🏽‍💼👍',
        delayMs: 4000
      };
    }
    return {
      text: responses[Math.floor(Math.random() * responses.length)],
      delayMs: 3500
    };
  }

  // Group chat response simulation! (Picks another member randomly to reply in the group)
  return {
    text: `¡Qué gran mensaje! Me alegra mucho que tengamos este chat familiar para estar siempre comunicados. ❤️🏡`,
    delayMs: 4000
  };
};
