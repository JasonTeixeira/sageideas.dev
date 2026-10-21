// #2 Evals — CLEAR REWRITE
const scenes = [
  ['01', "Hey, welcome back. Today you're going to learn how to actually test an AI feature — so you know it works, instead of just hoping it does. By the end, you'll be able to build something called an eval, and catch bad changes before your users ever see them."],
  ['02', "Let me show you the problem first. Say your AI feature works on the three examples you tried. So you ship it. But three examples isn't a test — it's a guess. You have no real idea how it does on the other thousand cases."],
  ['03', "It gets worse. You tweak the prompt to fix one bad answer. Did that make everything better, or did it quietly break five other things? Without a test, you genuinely cannot tell. That's called testing by vibes, and vibes don't survive production."],
  ['04', "So here's the fix: you build an eval. An eval is just an automated test for your AI. It has three parts — a set of real examples, a way to score them, and a passing grade you refuse to ship below. Let's go through each one."],
  ['05', "Part one, the examples. This is your answer key: a list of real questions, each paired with the answer you'd actually accept as correct. And here's the good news — twenty examples you've actually checked beat twenty thousand you never looked at."],
  ['06', "Part two, the score. Sometimes you can check the answer exactly. But often the answer is fuzzier, so you use a clever trick: you ask a second AI to grade the first one against a checklist. That's called LLM-as-judge, and it's cheap and surprisingly consistent."],
  ['07', "Now run every example through that, and you get one number — your score. That's the magic. Instead of a feeling, you have a number you can watch go up or down as you make changes."],
  ['08', "Part three, the gate. You put that score into your automated tests. If a change drops the score below your passing grade, the change does not ship. The bad prompt gets blocked before it ever reaches a customer."],
  ['09', "Let me show you why that matters. You 'improve' your prompt and feel great about it. You run the eval — and it catches that you actually broke twelve percent of your cases. That's a disaster you just caught on your laptop, instead of in production on a Friday night."],
  ['10', "Now, the one big mistake to avoid: trusting a single number. A healthy average can completely hide one category that's totally broken — and it's usually your most important one. So you slice the score by topic, and the weak spot lights up. Now you fix what's actually wrong."],
  ['11', "So let's recap. An eval has three parts: a set of real examples, a way to score them, and a gate that blocks bad changes. And you slice the score so no failure can hide. The whole point is simple: you can't ship what you can't measure."],
  ['12', "If you want to build this exact eval harness yourself, for free, head to sageideas dot dev slash academy. That's it for today. Proof, not paper. I'll see you in the next one."],
];

export default scenes;
