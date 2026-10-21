// #3 Embeddings & vector search — CLEAR REWRITE
const scenes = [
  ['01', "Hey, welcome back. Today you're going to learn how AI search understands meaning instead of just matching words — and how to make it actually return the right thing. This is the engine behind almost every AI search feature, so let's break it down simply."],
  ['02', "Let me start with the problem. You search your help docs for the word refund, and you miss the page that says money back. Same meaning, different words. Regular keyword search matches letters, but what you actually want is to match meaning."],
  ['03', "So here's the core idea: embeddings. An embedding takes a piece of text and turns it into a list of numbers, called a vector. The trick is that text with similar meaning gets similar numbers — so it lands nearby."],
  ['04', "That's why refund and money back end up right next to each other, even with no words in common. And we measure how close two pieces of text are by the angle between their vectors. That measurement has a name — cosine similarity — but all you need to remember is: closer means more similar."],
  ['05', "Now here's how search works. You turn the user's question into a vector too. Then you simply grab the handful of chunks whose vectors sit closest to it. That's called nearest-neighbor search, and those closest few are your results."],
  ['06', "But here's the catch that trips everyone up. Closest is not the same as most relevant. The nearest vector can still be the wrong passage. So if you just trust the top result, your search quietly returns junk."],
  ['07', "The fix is a second pass called a re-ranker. It looks at the question and each result together, and re-orders them by how relevant they truly are. It's slower, but much sharper — and it's worth it."],
  ['08', "One more tip. When you need an exact match — like a product code or a name — meaning-search can miss it. So you combine both: keyword search for exact terms, and vector search for meaning. That combination is called hybrid search."],
  ['09', "So let's recap. Embeddings turn text into vectors that capture meaning. You search by finding the nearest vectors, then you re-rank them for real relevance, and add keywords for exact matches. Just remember: nearest is a guess, and relevance is the goal."],
  ['10', "If you want to build vector search that actually works, for free, head to sageideas dot dev slash academy. That's it for today. Proof, not paper. I'll see you in the next one."],
];

export default scenes;
