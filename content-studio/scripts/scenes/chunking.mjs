// #4 Chunking — CLEAR REWRITE
const scenes = [
  ['01', "Hey, welcome back. Today you're going to learn about chunking — how you split up your documents before an AI can search them. It sounds boring, but it's the single biggest reason RAG systems return garbage, and almost everyone gets it wrong."],
  ['02', "Let me show you the problem. You've got great documents, a great AI model, and a great prompt — and you still get useless answers. Nine times out of ten, the culprit isn't the model. It's how you cut up the docs."],
  ['03', "Here's why it matters. You can't feed the AI a whole manual at once, so you split it into small pieces called chunks. Each chunk is what actually gets searched and pulled up. So if the chunks are bad, everything downstream is bad too."],
  ['04', "There are two ways to get it wrong. The first is chunks that are too big. If one chunk covers five different topics, the match gets watered down, and the AI drowns in text it didn't need."],
  ['05', "The second is chunks that are too small. If you cut in the middle of an idea, the AI gets the setup without the conclusion. It's holding half a thought, and half a thought is useless."],
  ['06', "So here's the fix. Don't split by a fixed number of characters. Split on natural boundaries instead — paragraphs and headings — so that each chunk is one complete idea, the way the author actually wrote it."],
  ['07', "Then add a little overlap. Let each chunk share a sentence or two with its neighbor. That way, if an idea happens to cross the line between two chunks, it doesn't get lost."],
  ['08', "One more thing: tag every chunk with where it came from — the document, the section. That little label is what lets your AI cite its source later, instead of just asking you to trust it."],
  ['09', "And the mistake to avoid: guessing. Chunking is a setting you test, not a number you hope is right. Try one strategy, run your eval, and let the score tell you which one actually retrieves better."],
  ['10', "So let's recap. Split on meaning, not size. Overlap the edges. Tag the source. And test it. It's the most boring step in the whole pipeline — and it decides whether your AI works at all."],
  ['11', "If you want to learn to make these unglamorous choices well, for free, head to sageideas dot dev slash academy. That's it for today. Proof, not paper. I'll see you in the next one."],
];

export default scenes;
