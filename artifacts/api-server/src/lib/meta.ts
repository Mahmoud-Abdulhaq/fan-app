export const matchup: Record<string, { ids: string[]; tip: string }> = {
  Fighter: { ids: ["trapper", "marina"], tip: "Lure fighters into trapped approaches. Avoid feeding rage or reset chains; fight with defensive coverage." },
  Movement: { ids: ["archer", "trapper"], tip: "Control bridge approaches with ranged pressure and trap likely landing routes." },
  Support: { ids: ["zeno", "hannah"], tip: "Apply anti-heal pressure, isolate the support, and finish weakened targets before they recover." },
  Economy: { ids: ["jade", "void-regent"], tip: "Invade resource routes early. Use mobility to deny safe farming and force the economy kit to defend." },
  Defender: { ids: ["void-regent", "jade"], tip: "Use mobility to bypass defensive setups and attack from a second angle. Clear fragile turrets with ranged utility." },
  Ranged: { ids: ["yuzi", "jade"], tip: "Break sightlines and close distance with mobility. Do not take straight bridge duels against ranged pressure." },
};
export const questions = [
  { question: "What happens when your team's bed is destroyed?", options: ["You stop respawning", "You lose all diamonds", "The match ends immediately", "Your armor resets"], answer: 0, explanation: "After your bed is destroyed, each player has one remaining life and can no longer respawn." },
  { question: "Which resource funds team upgrades?", options: ["Iron", "Diamonds", "Emeralds", "Wool"], answer: 1, explanation: "Diamonds fund team upgrades; emeralds fund top-tier equipment." },
  { question: "Which kit is the anti-heal counter to Baker in this snapshot?", options: ["Builder", "Milo", "Zeno", "Marcel"], answer: 2, explanation: "Zeno's anti-heal pressure is the supplied draft's answer to Baker sustain." },
  { question: "Who should Whisper tether to?", options: ["Nobody", "An enemy", "An isolated scout", "A tanky carry"], answer: 3, explanation: "Whisper should coordinate with a tanky frontliner rather than roam alone." },
  { question: "Which draft role should you never forfeit?", options: ["Economy engine", "Five duelists", "Five defenders", "Solo support"], answer: 0, explanation: "The supplied ranked template always reserves an economy engine such as Bounty Hunter or Milo." },
  { question: "What is Trapper's trap limit in the supplied October snapshot?", options: ["6", "8", "10", "20"], answer: 2, explanation: "The supplied October 2 patch snapshot raises the trap limit to 10." },
  { question: "What do mobility kits help counter?", options: ["Only resources", "Defensive setups", "Your own team", "Nothing"], answer: 1, explanation: "Mobility helps bypass defensive setups and create new angles on the bed." },
];
export function dailyTrivia() {
  const date = new Date().toISOString().slice(0, 10);
  const index = Math.floor(Date.parse(date) / 86400000) % questions.length;
  return { date, id: `${date}-${index}`, ...questions[index]! };
}
