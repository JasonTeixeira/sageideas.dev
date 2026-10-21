// #5 Agents — CLEAR (TEACHING_CLARITY.md)
const scenes = [
  ['01', "Hey, welcome back. Today you're going to learn what an AI agent actually is — and how to build one that gets things done without going off the rails. By the end, you'll understand the simple loop that powers every agent, and the safety rails every good one needs."],
  ['02', "Let me start with what's new here. A normal chatbot just answers questions. An agent is different — an agent takes actions. It books the flight, files the ticket, runs the query. And the moment an AI can act in the real world, it can also mess up in ways a chatbot never could."],
  ['03', "So here's the core idea: an agent is a loop. Not one answer — a loop. It thinks, it takes an action, it looks at the result, and then it thinks again using what it just learned. It repeats that until the job is done."],
  ['04', "But a model can't actually do anything on its own — all it can produce is text. So we give it tools. A tool is just a function the AI is allowed to call, like search flights, or send email, or run a database query."],
  ['05', "Let's watch the loop in action. The customer says: book me a flight. The agent calls the search tool. We run it and hand back the results. The agent reads them, picks a flight, and calls the book tool. Four steps, one goal — and it decided each step from what came back before."],
  ['06', "Now, here's where it gets dangerous. A loop with no limit can run forever. It can call the same tool a hundred times, burn through your budget, or wander completely off task."],
  ['07', "So you put the agent on a leash. You give it three limits: a maximum number of steps, a short list of tools it's allowed to use, and a spending budget. It's free to think — but only inside a fence you drew."],
  ['08', "And you log every single step: what it thought, which tool it called, and what came back. This is not optional. You cannot debug an agent you can't see, and agents fail in weird ways. The log is how you find out why."],
  ['09', "Two common mistakes to avoid. First, too many tools. Give an agent thirty tools and it gets confused and picks the wrong one. A few sharp, well-named tools work far better. Second, letting it do risky things alone. For anything that spends money or deletes data, put a human in the loop to approve it first."],
  ['10', "So let's recap. An agent is a loop: think, act, observe, repeat. It acts using tools you give it. You keep it safe with a leash — step limits, allowed tools, and a budget. And you log every step so you can see what it did."],
  ['11', "If you want to build a real, safe agent yourself, for free, head to sageideas dot dev slash academy. That's it for today. Proof, not paper. I'll see you in the next one."],
];

export default scenes;
