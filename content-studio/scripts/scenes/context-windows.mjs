// #8 Context windows — CLEAR
const scenes = [
  ['01', "Hey, welcome back. Today you're going to learn what a context window is, and how to use it the right way — so your AI actually finds the answer instead of getting lost. This one small idea fixes a huge number of AI bugs."],
  ['02', "Let me start with the problem. You wanted to be safe, so you pasted a hundred pages of documents into the prompt. And the AI still missed the one line that mattered. More text did not help — it actually hurt."],
  ['03', "So here's the core idea. The context window is simply how much the AI can see at one time. It's a fixed budget of tokens — think of tokens as pieces of words. Everything the AI knows in this moment has to fit inside that window."],
  ['04', "And here's the surprising part. AIs don't read the middle very well. They pay the most attention to the beginning and the end of the window. Anything buried in the middle tends to get ignored. This is a real, measured effect — it's called lost in the middle."],
  ['05', "So the fix is to pack the window on purpose. Put your most important information at the very start and the very end, where the AI is paying attention. Where something sits in the window actually changes whether the AI uses it."],
  ['06', "Next, don't stuff — retrieve. Instead of dumping every document in, pull just the few passages that are actually relevant to the question. That's exactly what RAG does, and it keeps the window small and sharp."],
  ['07', "And for long conversations, compress. Instead of pasting the entire chat history every turn, summarize it into a few tight lines. You keep the meaning without filling the window with noise."],
  ['08', "One last mistake to avoid: burying your own instructions. If your important rules are stuck in the middle of a giant prompt, the AI will skip right over them. Keep the rules that matter at the edges."],
  ['09', "So let's recap. Retrieve only what's relevant. Order it by importance. Compress long history. And put what matters most at the edges, not the middle. A small, well-packed window beats a giant, noisy one every time."],
  ['10', "If you want to learn to use the context window like a pro, for free, head to sageideas dot dev slash academy. That's it for today. Proof, not paper. I'll see you in the next one."],
];

export default scenes;
