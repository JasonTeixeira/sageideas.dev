// #7 Structured output — CLEAR
const scenes = [
  ['01', "Hey, welcome back. Today you're going to learn how to make an AI return clean, structured data — like JSON — that your code can actually use, reliably, every single time. This is the trick that turns a chatbot into a real building block in your app."],
  ['02', "Let me show you the problem. Your program needs the AI's answer as data. So you ask it for JSON. And it replies: Sure! Here's the JSON you asked for — and that one friendly sentence just crashed your parser. Free text and code don't mix."],
  ['03', "So here's the core idea. You need a guaranteed shape. You start by writing a schema — that's just a definition of the exact fields and types you expect back. For example: a name that's text, an amount that's a number, a date. That schema is your contract."],
  ['04', "Then you use a feature called structured output — sometimes called function calling. It forces the AI to fill in your schema. The AI can't ramble or add a greeting. It can only return JSON that matches the shape you defined."],
  ['05', "Let me show an example. You give it a messy invoice and your schema. Out comes a clean object: name, date, amount — exactly the fields you asked for, in exactly the right types. Your code can trust the structure."],
  ['06', "But here's the trap that catches people. Valid JSON is not the same as correct JSON. The AI can return a perfectly-shaped object that has the wrong number in it. The structure is right, but the value is wrong. Shape is not truth."],
  ['07', "So you don't stop at the shape. You validate. You check the types against your schema, and you check the values against reality. And if it fails, you don't crash — you feed the error back to the AI, like 'amount must be a number,' and let it try again. A little retry loop that fixes itself."],
  ['08', "So let's recap. Define a schema — the exact shape you want. Force the AI to fill it with structured output. Validate the result. And retry on failure. That's how you get reliable data out of an unreliable narrator."],
  ['09', "If you want to build this into your own app, for free, head to sageideas dot dev slash academy. That's it for today. Proof, not paper. I'll see you in the next one."],
];

export default scenes;
