export const magooanisms = [
    "Oh Magoo, you've done it again!",
    "Where did that building go?",
    "I could have sworn the hotel was right here...",
    "Just a little detour, nothing to worry about!",
    "Is this the way to the buffet?",
    "Checking the map... upside down.",
    "Who moved the Eiffel Tower?",
    "Walking into a wall... figuratively speaking.",
    "Pardon me, I thought you were a coat rack.",
    "Navigation is 90% confidence, 10% luck.",
    "Following the breadcrumbs... wait, those are pigeons.",
    "Turn left at the blur, then right at the fuzzy shape."
];

export const getRandomMagoo = () => {
    return magooanisms[Math.floor(Math.random() * magooanisms.length)];
};
