// Route bullet images live in /public, named by lowercase bullet label (a.png, s.png, sir.png…).
export const bulletSrc = (bullet) => `/${bullet.toLowerCase()}.png`;
